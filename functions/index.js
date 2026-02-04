const functions = require("firebase-functions");
const { defineString, defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
admin.initializeApp();

// Secrets (set with: firebase functions:secrets:set ...)
const STRIPE_SECRET = defineSecret("STRIPE_SECRET");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

// Params (set at deploy time)
const STRIPE_PRICE_MONTHLY = defineString("STRIPE_PRICE_MONTHLY");
const STRIPE_PRICE_LIFETIME = defineString("STRIPE_PRICE_LIFETIME");
const APP_BASE_URL = defineString("APP_BASE_URL");

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
