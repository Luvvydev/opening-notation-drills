const functions = require("firebase-functions");
const { defineString, defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
admin.initializeApp();

// Secrets
const STRIPE_SECRET = defineSecret("STRIPE_SECRET");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

// Discord secrets
const DISCORD_CLIENT_SECRET = defineSecret("DISCORD_CLIENT_SECRET");
const DISCORD_BOT_TOKEN = defineSecret("DISCORD_BOT_TOKEN");
const DISCORD_STATE_SECRET = defineSecret("DISCORD_STATE_SECRET");

const CANONICAL_DISCORD_REDIRECT_URI = "https://chessdrills.net/#/discord";

// Stripe config (hardcoded for fast, deterministic live setup)
// If you change prices later, update these constants and redeploy functions.
const APP_BASE_URL = "https://chessdrills.net";
const STRIPE_PRICE_MONTHLY = "price_1T4BR2BDxUShr6GYnIqz9qEp"; // $5.99/month
const STRIPE_PRICE_YEARLY = "price_1T4BRhBDxUShr6GY0gC1oqOI"; // $39/year

// Keep lifetime as a param so you can set it without touching code if needed.
const STRIPE_PRICE_LIFETIME = defineString("STRIPE_PRICE_LIFETIME");
const DISCORD_CLIENT_ID = defineString("DISCORD_CLIENT_ID");
const DISCORD_GUILD_ID = defineString("DISCORD_GUILD_ID");
const DISCORD_ROLE_MEMBER = defineString("DISCORD_ROLE_MEMBER");
const DISCORD_ROLE_ANNUAL = defineString("DISCORD_ROLE_ANNUAL");
const DISCORD_ROLE_YEARLY = defineString("DISCORD_ROLE_YEARLY");
const DISCORD_ROLE_LIFETIME = defineString("DISCORD_ROLE_LIFETIME");

function requireAuth(context) {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in first.");
  }
  return context.auth.uid;
}

function getBaseUrl() {
  return String(APP_BASE_URL).replace(/\/$/, "");
}

function isActiveSubscriptionStatus(status) {
  return status === "active" || status === "trialing" || status === "past_due";
}

exports.createCheckoutSession = functions
  .runWith({ secrets: ["STRIPE_SECRET"] })
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);

    const tier = data?.tier;
    if (tier !== "member" && tier !== "lifetime") {
      throw new functions.https.HttpsError("invalid-argument", "tier must be member or lifetime");
    }

    const stripe = require("stripe")(STRIPE_SECRET.value());
    const baseUrl = getBaseUrl();

    const priceMonthly = STRIPE_PRICE_MONTHLY;
    const priceYearly = STRIPE_PRICE_YEARLY;
    const priceLifetime = STRIPE_PRICE_LIFETIME.value();

    let priceId;
    let membershipPlan = null;

    if (tier === "lifetime") {
      priceId = priceLifetime;
    } else {
      // Default to yearly if omitted
      const requestedPlan = data?.plan === "monthly" ? "monthly" : "yearly";
      membershipPlan = requestedPlan;
      priceId = requestedPlan === "monthly" ? priceMonthly : priceYearly;
    }

    if (!priceId) {
      throw new functions.https.HttpsError("failed-precondition", "Missing Stripe price id");
    }

    const session = await stripe.checkout.sessions.create({
      mode: tier === "lifetime" ? "payment" : "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: tier === "member" ? { trial_period_days: 7 } : undefined,
      success_url: `${baseUrl}/#/profile?checkout=success`,
      cancel_url: `${baseUrl}/#/about?checkout=cancel`,
      client_reference_id: uid,
      metadata: {
        uid,
        tier,
        plan: membershipPlan || ""
      }
    });

    return { url: session.url };
  });

exports.stripeWebhook = functions
  .runWith({ secrets: ["STRIPE_SECRET", "STRIPE_WEBHOOK_SECRET"] })
  .https.onRequest(async (req, res) => {
    const stripe = require("stripe")(STRIPE_SECRET.value());
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        STRIPE_WEBHOOK_SECRET.value()
      );
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const uid = session.metadata?.uid;
        const tier = session.metadata?.tier;
        const plan = session.metadata?.plan;

        if (!uid) return res.json({ received: true });

        const patch = {
          membershipActive: true,
          membershipTier: tier,
          membershipUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          stripeCustomerId: session.customer || null
        };

        if (tier === "member") {
          patch.stripeSubscriptionId = session.subscription || null;
          patch.membershipPlan = plan === "monthly" ? "monthly" : "yearly";
        }

        if (tier === "lifetime") {
          patch.stripePaymentIntentId = session.payment_intent || null;
          patch.membershipPlan = null;
        }

        await admin.firestore().doc(`users/${uid}`).set(patch, { merge: true });
      }

      if (
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted"
      ) {
        const sub = event.data.object;
        const customerId = sub.customer;

        const snap = await admin
          .firestore()
          .collection("users")
          .where("stripeCustomerId", "==", customerId)
          .limit(1)
          .get();

        if (!snap.empty) {
          const userRef = snap.docs[0].ref;

          if (event.type === "customer.subscription.deleted") {
            await userRef.set(
              {
                membershipActive: false,
                membershipTier: "free",
                membershipPlan: null,
                membershipUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
              },
              { merge: true }
            );
          } else {
            const active = isActiveSubscriptionStatus(sub.status);

            let membershipPlan = "monthly";
            const priceId = sub.items.data[0]?.price?.id;

            if (priceId === STRIPE_PRICE_YEARLY) {
              membershipPlan = "yearly";
            }

            await userRef.set(
              {
                membershipActive: active,
                membershipTier: active ? "member" : "free",
                membershipPlan: active ? membershipPlan : null,
                membershipUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
              },
              { merge: true }
            );
          }
        }
      }

      res.json({ received: true });
    } catch (err) {
      res.status(500).send(`Server Error: ${err.message}`);
    }
  });