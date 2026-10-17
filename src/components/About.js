import React, { useState } from 'react';
import TopNav from './TopNav';
import SEO from './SEO';
import './About.css';
import '../App.css';

import { doc, runTransaction } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions, serverTimestamp } from "../firebase";
import { useAuth } from "../auth/AuthProvider";
import { trackEvent, trackOncePerUser } from "../utils/trackEvent";


const PAYMENT_METHODS = [
  { key: "paypal", label: "Continue with PayPal", detail: "Open secure PayPal checkout" },
  { key: "card", label: "Continue with Card", detail: "Pay by card through PayPal" }
];

export default function About(props) {
  const { user, hasPaidMembership, trialActive, trialEligible, trialExpired } = useAuth();
  const [trialBusy, setTrialBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("yearly");

  const fromState = props && props.location && props.location.state ? props.location.state : null;
  const reason = fromState && fromState.reason ? String(fromState.reason) : "";

  const showLockedNote =
    reason === "membership_required" || reason === "member_opening" || reason === "membership_requires_account";

  const go = (url) => {
    if (!url) return;
    try {
      window.location.href = url;
    } catch (_) {}
  };

  const goToSignup = () => {
    try {
      const from = `${window.location.pathname || "/about"}${window.location.search || ""}` || "/about";
      window.location.href = `/signup?source=membership&from=${encodeURIComponent(from)}&reason=membership_requires_account`;
    } catch (_) {}
  };

  const goBack = () => {
    const rawFrom = fromState && typeof fromState.from === "string" ? fromState.from : "";
    const from = rawFrom.indexOf("#/") === 0 ? rawFrom.slice(1) : rawFrom;

    if (props && props.history && typeof props.history.replace === "function" && from && from.charAt(0) === "/") {
      props.history.replace(from);
      return;
    }

    try {
      window.location.href = from && from.charAt(0) === "/" ? from : "/openings";
    } catch (_) {}
  };

  const startFreeTrial = async () => {
    if (!user) {
      goToSignup();
      return;
    }

    if (hasPaidMembership || trialActive) {
      goBack();
      return;
    }

    if (!trialEligible) {
      alert("This account has already used its free trial.");
      return;
    }

    setTrialBusy(true);
    try {
      const ref = doc(db, "users", user.uid);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.exists() ? (snap.data() || {}) : {};
        const membershipTier = data.membershipTier || "free";
        const hasActiveMembership = !!data.membershipActive && (membershipTier === "member" || membershipTier === "lifetime");

        if (hasActiveMembership || data.trialUsed || data.trialStartedAt) {
          throw new Error("trial_unavailable");
        }

        tx.set(ref, {
          trialUsed: true,
          trialStartedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      });

      trackOncePerUser(user, "trial_start", { source: "about_free_trial", plan: "free_trial" });
      goBack();
    } catch (_) {
      alert("Could not start the free trial. Please try again.");
    } finally {
      setTrialBusy(false);
    }
  };

  const paymentOptions = PAYMENT_METHODS;

  const openPaymentLink = async (method) => {
    if (!user) {
      goToSignup();
      return;
    }

    if (hasPaidMembership) {
      goBack();
      return;
    }

    setCheckoutBusy(true);
    setCheckoutError("");

    try {
      trackEvent("checkout_start", { source: "about", plan: selectedPlan, method: method.key }, user);

      const createPaypalCheckout = httpsCallable(functions, "createPaypalCheckout");
      const result = await createPaypalCheckout({
        plan: selectedPlan,
        method: method.key
      });

      const data = (result && result.data) || {};
      const approvalUrl = data.approvalUrl || data.url || "";

      if (data.alreadyActive) {
        goBack();
        return;
      }

      if (!approvalUrl) {
        throw new Error("missing_approval_url");
      }

      go(approvalUrl);
    } catch (err) {
      setCheckoutBusy(false);
      const message = err && err.message ? String(err.message) : "Could not start checkout.";
      setCheckoutError(message.indexOf("PAYPAL_") >= 0
        ? "Payment setup is missing on the server. Check the PayPal function environment variables."
        : "Could not start checkout. Please try again.");
    }
  };

  const selectPlan = (plan) => {
    if (plan !== "monthly" && plan !== "yearly") return;
    setSelectedPlan(plan);
  };

  return (
    <div className="about-page">
      <SEO
        title="ChessDrills Premium | ChessDrills"
        description="Start a ChessDrills free trial or join premium to unlock more opening training features."
        canonical="https://chessdrills.net/about"
        image="https://chessdrills.net/logo512.png"
      />

      <TopNav active="about" title="Chess Opening Drills" />

      <div className="about-wrap">
        <div className="about-card">
          <div className="about-hero">
            
            <h2 className="about-title">ChessDrills Premium</h2>
            <p className="about-lead">Try every Premium feature for 3 days, or subscribe now.</p>

          </div>

          {showLockedNote ? (
            <div className="about-note">
              <div className="about-note-title">That feature is Premium only.</div>
              <div className="about-note-sub">Start the free trial to unlock it right away, or join now with a payment method.</div>
            </div>
          ) : null}

          <div className="about-section about-trial-section">
            <div className="about-section-title">Try Premium free</div>
            <p className="about-trial-description">3 days of full access. No card required. The trial ends automatically.</p>
            <div className="about-cta-row">
              <button
                className="about-tier-btn"
                type="button"
                onClick={startFreeTrial}
                disabled={trialBusy || checkoutBusy || hasPaidMembership || (!trialActive && !trialEligible)}
              >
                {trialBusy
                  ? "Starting trial..."
                  : hasPaidMembership
                  ? "Already subscribed"
                  : trialActive
                  ? "Trial active"
                  : trialEligible
                  ? (
                    "Start 3-day free trial"
                  )
                  : "Trial already used"}
              </button>

            </div>

          </div>

          <div className="about-section about-subscribe-section">
            <div className="about-section-title">Or subscribe now</div>

            <div className="about-tiers">
              <button
                type="button"
                className={"about-tier " + (selectedPlan === "yearly" ? "selected" : "")}
                onClick={() => selectPlan("yearly")}
              >
                <div className="about-tier-top">
                  <div className="about-tier-name">
                    Yearly
                    <span className="about-tier-tag">Lower monthly cost</span>
                  </div>
                  <div className="about-tier-price">$39 / year</div>
                </div>
                <div className="about-tier-desc">
                  Only $3.25/month.
                </div>
                <div className="about-tier-check" aria-hidden="true">
                  <span className="about-tier-check-dot" />
                </div>
              </button>

              <button
                type="button"
                className={"about-tier " + (selectedPlan === "monthly" ? "selected" : "")}
                onClick={() => selectPlan("monthly")}
              >
                <div className="about-tier-top">
                  <div className="about-tier-name">Monthly</div>
                  <div className="about-tier-price">$5.99 / month</div>
                </div>
                <div className="about-tier-desc">
                  More flexible. Cancel anytime.
                </div>
                <div className="about-tier-check" aria-hidden="true">
                  <span className="about-tier-check-dot" />
                </div>
              </button>
            </div>

            <p className="about-checkout-intro">Choose how to pay for your selected plan:</p>
            <div className="about-payment-methods" aria-label="Payment methods">
              {paymentOptions.map((method) => (
                <button
                  key={method.key}
                  className="about-payment-method"
                  type="button"
                  onClick={() => openPaymentLink(method)}
                  disabled={trialBusy || checkoutBusy || hasPaidMembership}
                >
                  <span className="about-payment-method-label">{method.label}</span>
                  <span className="about-payment-method-detail">{checkoutBusy ? "Opening checkout..." : method.detail}</span>
                </button>
              ))}
            </div>

            <p className="about-renewal-note">Paid subscriptions renew automatically at the selected rate until canceled. Checkout is processed by PayPal.</p>

            {checkoutError ? (
              <div className="about-inline-note warning">
                <div className="about-inline-note-title">Checkout could not start</div>
                <div className="about-inline-note-sub">{checkoutError}</div>
              </div>
            ) : null}

            {trialActive ? (
              <div className="about-inline-note">
                <div className="about-inline-note-title">Free trial is active</div>
                <div className="about-inline-note-sub">Your trial is running now. Join before it ends to keep access without interruption.</div>
              </div>
            ) : null}

            {trialExpired ? (
              <div className="about-inline-note warning">
                <div className="about-inline-note-title">Free trial ended</div>
                <div className="about-inline-note-sub">This account already used its 3 day trial. Join now to unlock premium features again.</div>
              </div>
            ) : null}
          </div>
        <div className="about-section about-benefits">
          <div className="about-section-title">Included with Premium</div>
          <div className="about-benefits-grid">
            <div className="about-benefit-group">
              <div className="about-benefit-heading">Review your games</div>
              <p className="about-benefit-description">Find your mistakes. Practice the moves you missed.</p>
              <ul className="about-benefit-list">
                <li>Import games from Chess.com or Lichess</li>
                <li>Analyze your moves with Stockfish</li>
                <li>Solve puzzles from your own mistakes</li>
              </ul>
            </div>
            <div className="about-benefit-group">
              <div className="about-benefit-heading">Master your openings</div>
              <p className="about-benefit-description">Build recall through repetition and practice.</p>
              <ul className="about-benefit-list">
                <li>All opening courses and training modes</li>
                <li>Practice and scored drills for both colors</li>
                <li>Spaced repetition and saved progress</li>
              </ul>
            </div>
          </div>
        </div>

        </div>
      </div>
    </div>
  );
}
