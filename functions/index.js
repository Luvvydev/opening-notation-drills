const crypto = require("crypto");
const admin = require("firebase-admin");
const functions = require("firebase-functions");

admin.initializeApp();

const db = admin.firestore();
const REGION = "us-central1";
const ACTIVE_PAYPAL_STATUSES = new Set(["ACTIVE"]);
const INACTIVE_PAYPAL_STATUSES = new Set(["CANCELLED", "SUSPENDED", "EXPIRED"]);

let paypalTokenCache = {
  accessToken: "",
  expiresAtMs: 0
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name}_MISSING`);
  }
  return value;
}

function getPaypalApiBase() {
  return process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function getAppBaseUrl() {
  return (process.env.APP_BASE_URL || "https://chessdrills.net").replace(/\/+$/, "");
}

function normalizePlan(plan) {
  const value = String(plan || "").toLowerCase();
  if (value === "monthly" || value === "yearly") return value;
  return "";
}

function normalizeMethod(method) {
  const value = String(method || "").toLowerCase();
  if (value === "paypal" || value === "card") return value;
  return "paypal";
}

function getPlanId(plan) {
  if (plan === "monthly") return requireEnv("PAYPAL_MONTHLY_PLAN_ID");
  if (plan === "yearly") return requireEnv("PAYPAL_YEARLY_PLAN_ID");
  throw new Error("PAYPAL_PLAN_INVALID");
}

function getPlanFromPlanId(planId) {
  if (planId && planId === process.env.PAYPAL_MONTHLY_PLAN_ID) return "monthly";
  if (planId && planId === process.env.PAYPAL_YEARLY_PLAN_ID) return "yearly";
  return "unknown";
}

function buildReturnUrl(pathname, params) {
  const url = new URL(pathname, getAppBaseUrl());
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function readJsonResponse(res) {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (_) {
    return { raw: text };
  }
}

async function getPaypalAccessToken() {
  if (paypalTokenCache.accessToken && paypalTokenCache.expiresAtMs > Date.now() + 60000) {
    return paypalTokenCache.accessToken;
  }

  const clientId = requireEnv("PAYPAL_CLIENT_ID");
  const clientSecret = requireEnv("PAYPAL_CLIENT_SECRET");
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${getPaypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const body = await readJsonResponse(res);
  if (!res.ok || !body.access_token) {
    throw new Error("PAYPAL_ACCESS_TOKEN_FAILED");
  }

  paypalTokenCache = {
    accessToken: body.access_token,
    expiresAtMs: Date.now() + Math.max(60, Number(body.expires_in) || 300) * 1000
  };

  return paypalTokenCache.accessToken;
}

async function paypalRequest(path, options) {
  const accessToken = await getPaypalAccessToken();
  const method = (options && options.method) || "GET";
  const body = options && Object.prototype.hasOwnProperty.call(options, "body") ? options.body : undefined;
  const headers = Object.assign(
    {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    },
    (options && options.headers) || {}
  );

  const init = { method, headers };

  if (body !== undefined) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const res = await fetch(`${getPaypalApiBase()}${path}`, init);
  const responseBody = await readJsonResponse(res);

  if (!res.ok) {
    const debugId = responseBody && responseBody.debug_id ? `:${responseBody.debug_id}` : "";
    throw new Error(`PAYPAL_REQUEST_FAILED_${res.status}${debugId}`);
  }

  return responseBody;
}

function getApprovalUrl(subscription) {
  const links = Array.isArray(subscription && subscription.links) ? subscription.links : [];
  const approve = links.find((link) => link && link.rel === "approve" && link.href);
  return approve ? approve.href : "";
}

async function getSubscription(subscriptionId) {
  const safeId = String(subscriptionId || "").trim();
  if (!safeId || safeId.length > 128) {
    throw new Error("PAYPAL_SUBSCRIPTION_ID_INVALID");
  }

  return paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(safeId)}`);
}


async function cancelSubscription(subscriptionId, reason) {
  const safeId = String(subscriptionId || "").trim();
  if (!safeId || safeId.length > 128) {
    throw new Error("PAYPAL_SUBSCRIPTION_ID_INVALID");
  }

  await paypalRequest(`/v1/billing/subscriptions/${encodeURIComponent(safeId)}/cancel`, {
    method: "POST",
    body: {
      reason: String(reason || "Cancelled from ChessDrills account settings").slice(0, 128)
    }
  });
}

async function findUidBySubscriptionId(subscriptionId) {
  const snap = await db.collection("users")
    .where("paypalSubscriptionId", "==", subscriptionId)
    .limit(1)
    .get();

  if (snap.empty) return "";
  return snap.docs[0].id;
}

async function resolveUidForSubscription(subscription) {
  const customId = subscription && subscription.custom_id ? String(subscription.custom_id) : "";
  if (customId) return customId;

  const subscriptionId = subscription && subscription.id ? String(subscription.id) : "";
  if (!subscriptionId) return "";

  return findUidBySubscriptionId(subscriptionId);
}

function getPayerEmail(subscription) {
  const subscriber = subscription && subscription.subscriber ? subscription.subscriber : null;
  return subscriber && subscriber.email_address ? String(subscriber.email_address) : null;
}

function getPayerId(subscription) {
  const subscriber = subscription && subscription.subscriber ? subscription.subscriber : null;
  return subscriber && subscriber.payer_id ? String(subscriber.payer_id) : null;
}

async function writeMembershipFromSubscription(subscription, sourceEventType) {
  const subscriptionId = subscription && subscription.id ? String(subscription.id) : "";
  const status = subscription && subscription.status ? String(subscription.status) : "UNKNOWN";
  const planId = subscription && subscription.plan_id ? String(subscription.plan_id) : "";
  const uid = await resolveUidForSubscription(subscription);

  if (!subscriptionId || !uid) {
    return { updated: false, reason: "missing_uid_or_subscription" };
  }

  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const current = userSnap.exists ? (userSnap.data() || {}) : {};
  const plan = getPlanFromPlanId(planId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const baseUpdate = {
    paypalSubscriptionId: subscriptionId,
    paypalPlanId: planId || null,
    paypalStatus: status,
    paypalPayerId: getPayerId(subscription),
    paypalSubscriberEmail: getPayerEmail(subscription),
    paypalUpdatedAt: now,
    membershipSource: "paypal",
    updatedAt: now
  };

  if (sourceEventType) {
    baseUpdate.paypalLastEventType = String(sourceEventType).slice(0, 120);
  }

  if (current.membershipTier === "lifetime") {
    await userRef.set(baseUpdate, { merge: true });
    return { updated: true, membershipActive: true, lifetime: true, status };
  }

  if (ACTIVE_PAYPAL_STATUSES.has(status)) {
    await userRef.set(Object.assign({}, baseUpdate, {
      membershipActive: true,
      membershipTier: "member",
      membershipPlan: plan,
      membershipUpdatedAt: now
    }), { merge: true });

    return { updated: true, membershipActive: true, status, plan };
  }

  if (INACTIVE_PAYPAL_STATUSES.has(status)) {
    await userRef.set(Object.assign({}, baseUpdate, {
      membershipActive: false,
      membershipTier: "free",
      membershipPlan: plan,
      membershipUpdatedAt: now
    }), { merge: true });

    return { updated: true, membershipActive: false, status, plan };
  }

  await userRef.set(baseUpdate, { merge: true });
  return { updated: true, membershipActive: !!current.membershipActive, status, plan };
}

function mapFunctionError(err) {
  if (err && err.message && err.message.indexOf("PAYPAL_") === 0) {
    return new functions.https.HttpsError("failed-precondition", err.message);
  }

  return new functions.https.HttpsError("internal", "payment_operation_failed");
}

exports.createPaypalCheckout = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError("unauthenticated", "sign_in_required");
  }

  const uid = context.auth.uid;
  const plan = normalizePlan(data && data.plan);
  const method = normalizeMethod(data && data.method);

  if (!plan) {
    throw new functions.https.HttpsError("invalid-argument", "invalid_plan");
  }

  try {
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? (userSnap.data() || {}) : {};
    const tier = userData.membershipTier || "free";

    if (userData.membershipActive === true && (tier === "member" || tier === "lifetime")) {
      return { alreadyActive: true };
    }

    const planId = getPlanId(plan);
    const requestId = crypto.randomUUID ? crypto.randomUUID() : `${uid}-${Date.now()}`;
    const subscription = await paypalRequest("/v1/billing/subscriptions", {
      method: "POST",
      headers: {
        "PayPal-Request-Id": requestId
      },
      body: {
        plan_id: planId,
        custom_id: uid,
        application_context: {
          brand_name: "ChessDrills",
          locale: "en-US",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          return_url: buildReturnUrl("/payment/success", { provider: "paypal", plan, method }),
          cancel_url: buildReturnUrl("/payment/cancel", { provider: "paypal", plan, method })
        }
      }
    });

    const approvalUrl = getApprovalUrl(subscription);
    if (!approvalUrl) {
      throw new Error("PAYPAL_APPROVAL_URL_MISSING");
    }

    await userRef.set({
      pendingPaypalSubscriptionId: subscription.id || null,
      pendingPaypalPlan: plan,
      pendingPaypalMethod: method,
      pendingPaypalCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return {
      approvalUrl,
      subscriptionId: subscription.id || "",
      plan,
      method
    };
  } catch (err) {
    throw mapFunctionError(err);
  }
});

exports.syncPaypalMembership = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError("unauthenticated", "sign_in_required");
  }

  const uid = context.auth.uid;
  const subscriptionId = data && data.subscriptionId ? String(data.subscriptionId) : "";

  try {
    const subscription = await getSubscription(subscriptionId);
    const ownerUid = await resolveUidForSubscription(subscription);

    if (ownerUid !== uid) {
      throw new functions.https.HttpsError("permission-denied", "subscription_owner_mismatch");
    }

    return writeMembershipFromSubscription(subscription, "CLIENT_SYNC");
  } catch (err) {
    if (err instanceof functions.https.HttpsError) throw err;
    throw mapFunctionError(err);
  }
});


exports.cancelPaypalSubscription = functions.region(REGION).https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError("unauthenticated", "sign_in_required");
  }

  const uid = context.auth.uid;

  try {
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? (userSnap.data() || {}) : {};
    const subscriptionId = userData.paypalSubscriptionId ? String(userData.paypalSubscriptionId).trim() : "";

    if (!subscriptionId) {
      throw new functions.https.HttpsError("failed-precondition", "paypal_subscription_missing");
    }

    const subscription = await getSubscription(subscriptionId);
    const subscriptionUid = subscription && subscription.custom_id ? String(subscription.custom_id) : "";

    if (subscriptionUid && subscriptionUid !== uid) {
      throw new functions.https.HttpsError("permission-denied", "subscription_owner_mismatch");
    }

    const status = subscription && subscription.status ? String(subscription.status) : "UNKNOWN";
    const plan = getPlanFromPlanId(subscription && subscription.plan_id ? String(subscription.plan_id) : userData.paypalPlanId);
    const now = admin.firestore.FieldValue.serverTimestamp();

    if (!INACTIVE_PAYPAL_STATUSES.has(status)) {
      await cancelSubscription(subscriptionId, data && data.reason);
    }

    await userRef.set({
      paypalSubscriptionId: subscriptionId,
      paypalPlanId: subscription && subscription.plan_id ? String(subscription.plan_id) : userData.paypalPlanId || null,
      paypalStatus: "CANCELLED",
      paypalCancelRequestedAt: now,
      paypalUpdatedAt: now,
      paypalLastEventType: "CLIENT_CANCEL",
      membershipActive: false,
      membershipTier: "free",
      membershipPlan: plan,
      membershipSource: "paypal",
      membershipUpdatedAt: now,
      updatedAt: now
    }, { merge: true });

    return {
      ok: true,
      cancelled: true,
      membershipActive: false,
      status: "CANCELLED",
      plan
    };
  } catch (err) {
    if (err instanceof functions.https.HttpsError) throw err;
    throw mapFunctionError(err);
  }
});

function readWebhookEvent(req) {
  if (req.body && typeof req.body === "object") return req.body;

  const raw = req.rawBody ? req.rawBody.toString("utf8") : "";
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

async function verifyPaypalWebhook(req, event) {
  const payload = {
    auth_algo: req.get("paypal-auth-algo") || "",
    cert_url: req.get("paypal-cert-url") || "",
    transmission_id: req.get("paypal-transmission-id") || "",
    transmission_sig: req.get("paypal-transmission-sig") || "",
    transmission_time: req.get("paypal-transmission-time") || "",
    webhook_id: requireEnv("PAYPAL_WEBHOOK_ID"),
    webhook_event: event
  };

  if (!payload.auth_algo || !payload.cert_url || !payload.transmission_id || !payload.transmission_sig || !payload.transmission_time) {
    return false;
  }

  const result = await paypalRequest("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: payload
  });

  return result && result.verification_status === "SUCCESS";
}

function getSubscriptionIdFromEvent(event) {
  const resource = event && event.resource ? event.resource : {};
  return String(
    resource.id ||
    resource.subscription_id ||
    resource.billing_agreement_id ||
    resource.billing_subscription_id ||
    ""
  );
}

async function processPaypalEvent(event) {
  const eventType = event && event.event_type ? String(event.event_type) : "";
  const subscriptionId = getSubscriptionIdFromEvent(event);

  if (!subscriptionId) {
    return { ignored: true, reason: "missing_subscription_id", eventType };
  }

  const subscription = await getSubscription(subscriptionId);
  return writeMembershipFromSubscription(subscription, eventType);
}

exports.paypalWebhook = functions.region(REGION).https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const event = readWebhookEvent(req);
  if (!event) {
    res.status(400).send("Invalid JSON");
    return;
  }

  try {
    const verified = await verifyPaypalWebhook(req, event);
    if (!verified) {
      res.status(401).send("Invalid PayPal webhook signature");
      return;
    }

    await processPaypalEvent(event);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("paypalWebhook failed", err);
    res.status(500).send("Webhook processing failed");
  }
});
