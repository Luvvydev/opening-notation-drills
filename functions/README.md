# ChessDrills payment automation

This folder adds automated PayPal subscription checkout and membership activation.

Required PayPal setup:

1. Create a PayPal REST app.
2. Create one monthly subscription plan and one yearly subscription plan.
3. Put the real values in `functions/.env` using the names from `.env.example`.
4. Deploy functions.
5. Add a PayPal webhook pointed at:

```txt
https://us-central1-YOUR_FIREBASE_PROJECT_ID.cloudfunctions.net/paypalWebhook
```

Subscribe the webhook to at least these events:

```txt
BILLING.SUBSCRIPTION.ACTIVATED
BILLING.SUBSCRIPTION.CANCELLED
BILLING.SUBSCRIPTION.SUSPENDED
BILLING.SUBSCRIPTION.EXPIRED
PAYMENT.SALE.COMPLETED
```

Deploy functions and rules, then deploy the React site with the existing project deploy script:

```bash
npm ci
cd functions && npm install && cd ..
firebase deploy --only functions,firestore:rules
npm run deploy
```

Notes:

- PayPal and credit card checkout are handled by PayPal.
- The frontend never receives the PayPal secret.
- Users cannot grant themselves membership because Firestore rules still block membership fields from client writes.
- Google Pay, Amazon Pay, and crypto are not enabled here because each one needs its own verified webhook flow before it can safely auto unlock Premium.
