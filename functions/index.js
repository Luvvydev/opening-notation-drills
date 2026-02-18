const functions = require("firebase-functions");
const { defineString, defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
admin.initializeApp();

// Secrets (set with: firebase functions:secrets:set ...)
const STRIPE_SECRET = defineSecret("STRIPE_SECRET");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

// Discord secrets
const DISCORD_CLIENT_SECRET = defineSecret("DISCORD_CLIENT_SECRET");
const DISCORD_BOT_TOKEN = defineSecret("DISCORD_BOT_TOKEN");
const DISCORD_STATE_SECRET = defineSecret("DISCORD_STATE_SECRET");

// Params (set at deploy time)
const STRIPE_PRICE_MONTHLY = defineString("STRIPE_PRICE_MONTHLY");
const STRIPE_PRICE_LIFETIME = defineString("STRIPE_PRICE_LIFETIME");
const APP_BASE_URL = defineString("APP_BASE_URL");
const DISCORD_CLIENT_ID = defineString("DISCORD_CLIENT_ID");
const DISCORD_GUILD_ID = defineString("DISCORD_GUILD_ID");
const DISCORD_ROLE_MEMBER = defineString("DISCORD_ROLE_MEMBER");
const DISCORD_ROLE_LIFETIME = defineString("DISCORD_ROLE_LIFETIME");

function requireAuth(context) {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in first.");
  }
  return context.auth.uid;
}

function getBaseUrl() {
  const baseUrl = APP_BASE_URL.value();
  if (!baseUrl) {
    throw new functions.https.HttpsError("failed-precondition", "Missing APP_BASE_URL param.");
  }
  return String(baseUrl).replace(/\/$/, "");
}

function isActiveSubscriptionStatus(status) {
  return status === "active" || status === "trialing" || status === "past_due";
}

function hmacSign(value, secret) {
  const crypto = require("crypto");
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}

function requireParam(name, value) {
  if (!value) {
    throw new functions.https.HttpsError("failed-precondition", `Missing ${name} param.`);
  }
  return String(value);
}

function getDiscordConfig() {
  const clientId = requireParam("DISCORD_CLIENT_ID", DISCORD_CLIENT_ID.value());
  const guildId = requireParam("DISCORD_GUILD_ID", DISCORD_GUILD_ID.value());
  const roleMember = requireParam("DISCORD_ROLE_MEMBER", DISCORD_ROLE_MEMBER.value());
  const roleLifetime = requireParam("DISCORD_ROLE_LIFETIME", DISCORD_ROLE_LIFETIME.value());
  return { clientId, guildId, roleMember, roleLifetime };
}

function validateRedirectUri(redirectUri) {
  const baseUrl = getBaseUrl();
  if (!redirectUri || typeof redirectUri !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Missing redirectUri.");
  }
  const clean = redirectUri.trim();
  if (!clean.startsWith(baseUrl)) {
    throw new functions.https.HttpsError("invalid-argument", "redirectUri must match APP_BASE_URL.");
  }
  return clean;
}

async function discordApiFetch(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let jsonBody = null;
  try {
    jsonBody = text ? JSON.parse(text) : null;
  } catch (e) {
    // ignore
  }
  if (!res.ok) {
    const msg = jsonBody && (jsonBody.message || jsonBody.error) ? (jsonBody.message || jsonBody.error) : text;
    throw new functions.https.HttpsError(
      "internal",
      `Discord API error ${res.status}: ${msg || "unknown"}`
    );
  }
  return jsonBody;
}

async function ensureGuildMember({ botToken, guildId, discordUserId, userAccessToken }) {
  // Requires OAuth scope guilds.join and a bot token with permission to add members.
  const url = `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}`;
  await discordApiFetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ access_token: userAccessToken }),
  });
}

async function addRole({ botToken, guildId, discordUserId, roleId }) {
  const url = `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`;
  await discordApiFetch(url, {
    method: "PUT",
    headers: { Authorization: `Bot ${botToken}` },
  });
}

async function removeRole({ botToken, guildId, discordUserId, roleId }) {
  const url = `https://discord.com/api/v10/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bot ${botToken}` },
  });
  // 204 ok, 404 means role not present, both fine.
  if (res.status === 204 || res.status === 404) return;
  const text = await res.text();
  throw new functions.https.HttpsError("internal", `Discord role remove error ${res.status}: ${text}`);
}

async function syncRolesForUser({ uid }) {
  const { guildId, roleMember, roleLifetime } = getDiscordConfig();
  const botToken = String(DISCORD_BOT_TOKEN.value());

  const userRef = admin.firestore().collection("users").doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError("not-found", "User doc not found.");
  }
  const data = snap.data() || {};
  const discordUserId = data.discordId;
  if (!discordUserId) {
    throw new functions.https.HttpsError("failed-precondition", "Discord not linked.");
  }

  const membershipActive = !!data.membershipActive;
  const membershipTier = String(data.membershipTier || "");
  const isMember = membershipActive && (membershipTier === "member" || membershipTier === "lifetime");
  const isLifetime = membershipActive && membershipTier === "lifetime";

  // Desired: lifetime implies lifetime role only. member implies member role only.
  if (!isMember) {
    await removeRole({ botToken, guildId, discordUserId, roleId: roleMember });
    await removeRole({ botToken, guildId, discordUserId, roleId: roleLifetime });
    return { applied: "none" };
  }

  if (isLifetime) {
    await addRole({ botToken, guildId, discordUserId, roleId: roleLifetime });
    await removeRole({ botToken, guildId, discordUserId, roleId: roleMember });
    return { applied: "lifetime" };
  }

  await addRole({ botToken, guildId, discordUserId, roleId: roleMember });
  await removeRole({ botToken, guildId, discordUserId, roleId: roleLifetime });
  return { applied: "member" };
}

exports.createCheckoutSession = functions
  .runWith({ secrets: ["STRIPE_SECRET"] })
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);

    const tier = data && data.tier ? String(data.tier) : "";
    const isLifetime = tier === "lifetime";
    const isMember = tier === "member";
    if (!isLifetime && !isMember) {
      throw new functions.https.HttpsError("invalid-argument", "tier must be 'member' or 'lifetime'");
    }

    const priceMonthly = STRIPE_PRICE_MONTHLY.value();
    const priceLifetime = STRIPE_PRICE_LIFETIME.value();
    const priceId = isLifetime ? priceLifetime : priceMonthly;

    if (!priceId) {
      throw new functions.https.HttpsError("failed-precondition", "Missing Stripe price id.");
    }

    const baseUrl = getBaseUrl();
    const successUrl = `${baseUrl}/#/profile?checkout=success`;
    const cancelUrl = `${baseUrl}/#/about?checkout=cancel`;

    const stripe = require("stripe")(STRIPE_SECRET.value());

    const session = await stripe.checkout.sessions.create({
      mode: isLifetime ? "payment" : "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: uid,
      metadata: { uid, tier }
    });

    return { url: session.url };
  });



exports.createBillingPortalLink = functions
  .runWith({ secrets: ["STRIPE_SECRET"] })
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);

    const userSnap = await admin.firestore().doc(`users/${uid}`).get();
    const userData = userSnap.exists ? userSnap.data() : null;

    const customerId = userData && userData.stripeCustomerId ? String(userData.stripeCustomerId) : "";
    if (!customerId) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "No Stripe customer found for this account."
      );
    }

    const baseUrl = getBaseUrl();
    const returnUrl = `${baseUrl}/#/profile?portal=return`;

    const stripe = require("stripe")(STRIPE_SECRET.value());

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });

    return { url: session.url };
  });


exports.stripeWebhook = functions
  .runWith({ secrets: ["STRIPE_SECRET", "STRIPE_WEBHOOK_SECRET"] })
  .https.onRequest(async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = STRIPE_WEBHOOK_SECRET.value();
    const stripe = require("stripe")(STRIPE_SECRET.value());

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const uid = session.metadata?.uid;
        const tier = session.metadata?.tier;

        if (uid && (tier === "member" || tier === "lifetime")) {
          const patch = {
            membershipActive: true,
            membershipTier: tier,
            membershipUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            stripeCustomerId: session.customer || null
          };

          if (tier === "member") {
            patch.stripeSubscriptionId = session.subscription || null;
          } else {
            patch.stripePaymentIntentId = session.payment_intent || null;
          }

          await admin.firestore().doc(`users/${uid}`).set(patch, { merge: true });
        }
      }

      if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
        const sub = event.data.object;
        const customerId = sub.customer;
        if (customerId) {
          const snap = await admin.firestore().collection("users")
            .where("stripeCustomerId", "==", customerId)
            .limit(1)
            .get();

          if (!snap.empty) {
            const active = event.type === "customer.subscription.deleted"
              ? false
              : isActiveSubscriptionStatus(sub.status);

            await snap.docs[0].ref.set({
              membershipActive: active,
              membershipTier: active ? "member" : "free",
              membershipUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
          }
        }
      }

      res.json({ received: true });
    } catch (err) {
      res.status(500).send(`Server Error: ${err.message}`);
    }
  });



exports.getDiscordOAuthUrl = functions
  .runWith({ secrets: [DISCORD_CLIENT_SECRET, DISCORD_STATE_SECRET] })
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { clientId } = getDiscordConfig();

    const redirectUri = validateRedirectUri(data && data.redirectUri ? data.redirectUri : `${getBaseUrl()}/#/discord`);
    const nonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const ts = Date.now();
    const payload = `${uid}.${ts}.${nonce}`;
    const sig = hmacSign(payload, String(DISCORD_STATE_SECRET.value()));
    const state = `${payload}.${sig}`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify guilds.join",
      state,
      prompt: "none",
    });

    return { url: `https://discord.com/api/oauth2/authorize?${params.toString()}` };
  });

exports.discordOAuthCallback = functions
  .runWith({ secrets: [DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN, DISCORD_STATE_SECRET] })
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { clientId, guildId } = getDiscordConfig();

    const code = data && data.code;
    const state = data && data.state;
    const redirectUri = validateRedirectUri(data && data.redirectUri ? data.redirectUri : `${getBaseUrl()}/#/discord`);

    if (!code || typeof code !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "Missing code.");
    }
    if (!state || typeof state !== "string") {
      throw new functions.https.HttpsError("invalid-argument", "Missing state.");
    }

    const parts = state.split(".");
    if (parts.length < 4) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid state.");
    }
    const stateUid = parts[0];
    const sig = parts[parts.length - 1];
    const payload = parts.slice(0, parts.length - 1).join(".");
    const expected = hmacSign(payload, String(DISCORD_STATE_SECRET.value()));

    if (sig !== expected) {
      throw new functions.https.HttpsError("permission-denied", "Bad state signature.");
    }
    if (stateUid !== uid) {
      throw new functions.https.HttpsError("permission-denied", "State user mismatch.");
    }

    // Exchange code for token
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: String(DISCORD_CLIENT_SECRET.value()),
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    const tokenJson = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok) {
      throw new functions.https.HttpsError("internal", `Discord token exchange failed: ${tokenJson.error || tokenRes.status}`);
    }

    const accessToken = tokenJson.access_token;
    if (!accessToken) {
      throw new functions.https.HttpsError("internal", "Missing Discord access_token.");
    }

    // Fetch Discord user
    const me = await discordApiFetch("https://discord.com/api/v10/users/@me", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const discordUserId = me && me.id;
    if (!discordUserId) {
      throw new functions.https.HttpsError("internal", "Failed to get Discord user id.");
    }

    // Ensure guild membership
    await ensureGuildMember({
      botToken: String(DISCORD_BOT_TOKEN.value()),
      guildId,
      discordUserId,
      userAccessToken: accessToken,
    });

    // Store in Firestore
    const userRef = admin.firestore().collection("users").doc(uid);
    await userRef.set(
      {
        discordId: String(discordUserId),
        discordLinkedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Apply roles immediately
    const roleResult = await syncRolesForUser({ uid });

    return { discordId: String(discordUserId), roleResult };
  });

exports.syncDiscordRoles = functions
  .runWith({ secrets: [DISCORD_BOT_TOKEN] })
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const result = await syncRolesForUser({ uid });
    return result;
  });
