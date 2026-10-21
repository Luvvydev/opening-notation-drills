import React, { useEffect, useRef, useState } from 'react';
import Chessboard from 'chessboardjsx';
import WorkspaceIcon from './WorkspaceIcon';
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
  const { user, hasPaidMembership, trialActive, trialEligible } = useAuth();
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
    <div className="about-page membership-page">
      <SEO title="ChessDrills Premium | ChessDrills" description="Review your games, practice your mistakes, and remember your openings with ChessDrills Premium." canonical="https://chessdrills.net/about" image="https://chessdrills.net/logo512.png" />
      <TopNav active="about" title="Chess Opening Drills" />
      <div className="membership-wrap">
        <section className="membership-hero" aria-labelledby="membership-heading">
          <div>
            <p className="membership-eyebrow">CHESSDRILLS PREMIUM</p>
            <h1 id="membership-heading">Turn your mistakes into your next practice session.</h1>
            <p className="membership-lead">Review your games. Practice the moves you missed. Remember your openings.</p>
            <ul className="membership-highlights"><li>Game Review</li><li>Puzzles from your games</li><li>Opening training</li></ul>
          </div>
          <MembershipPreview />
        </section>

        {showLockedNote && <div className="about-note"><div className="about-note-title">That feature is included with Premium.</div><div className="about-note-sub">Choose a membership below{!user || trialEligible ? ', or start your free trial.' : '.'}</div></div>}

        <section className="membership-trial" aria-label="Membership access">
          <WorkspaceIcon name="info" />
          <div><h2>{hasPaidMembership ? 'Your Premium membership is active' : trialActive ? 'Your free trial is active' : !user || trialEligible ? 'Try opening training free for 3 days' : 'Your free trial has ended'}</h2><p>{hasPaidMembership ? 'Keep reviewing games and practicing with full access.' : trialActive ? 'Your opening training trial ends automatically. Game Review includes one preview game and its puzzles.' : !user || trialEligible ? 'No card required. Includes one Game Review preview with puzzles. Additional reviews and Mistake Packs require paid membership.' : 'Choose a plan below to continue your Premium training.'}</p></div>
          {(hasPaidMembership || trialActive || !user || trialEligible) && <button type="button" className="membership-primary" onClick={startFreeTrial} disabled={trialBusy || checkoutBusy}>{trialBusy ? 'Starting trial...' : hasPaidMembership || trialActive ? 'Continue training' : 'Start free trial'}</button>}
        </section>

        {!hasPaidMembership && <section className="membership-pricing" aria-labelledby="membership-pricing-heading">
          <h2 id="membership-pricing-heading">One membership. All your training.</h2>
          <div className="membership-plans" aria-label="Membership plans">
            <button type="button" className={'membership-plan ' + (selectedPlan === 'yearly' ? 'is-selected' : '')} aria-pressed={selectedPlan === 'yearly'} onClick={() => selectPlan('yearly')} disabled={checkoutBusy || trialBusy}>
              <span className="membership-value">BEST VALUE</span><span className="membership-plan-name">Yearly</span><span className="membership-selector" aria-hidden="true" />
              <span className="membership-price">$39 <small>/ year</small></span><span className="membership-plan-detail">$3.25 per month, billed annually.</span><span className="membership-savings">Save 46% compared with monthly.</span>
            </button>
            <button type="button" className={'membership-plan ' + (selectedPlan === 'monthly' ? 'is-selected' : '')} aria-pressed={selectedPlan === 'monthly'} onClick={() => selectPlan('monthly')} disabled={checkoutBusy || trialBusy}>
              <span className="membership-plan-name">Monthly</span><span className="membership-selector" aria-hidden="true" />
              <span className="membership-price">$5.99 <small>/ month</small></span><span className="membership-plan-detail">Billed monthly. Cancel anytime.</span>
            </button>
          </div>
          <div className="membership-checkout">
            <p className="membership-checkout-heading">Continue with {selectedPlan} membership</p>
            <p className="membership-payment-prompt">Choose your payment method</p>
            <div className="membership-methods" aria-label="Payment methods">{paymentOptions.map((method) => <button key={method.key} className={'membership-method ' + (method.key === 'card' ? 'membership-primary' : '')} type="button" onClick={() => openPaymentLink(method)} disabled={trialBusy || checkoutBusy}><span>{checkoutBusy ? 'Opening checkout...' : method.label}</span><small>{method.detail}</small></button>)}</div>
            <p className="membership-renewal">Paid subscriptions renew automatically at the selected rate until canceled. Checkout is processed by PayPal.</p>
            {checkoutError && <div className="about-inline-note warning" role="alert"><div className="about-inline-note-title">Checkout could not start</div><div className="about-inline-note-sub">{checkoutError}</div></div>}
          </div>
        </section>}

        <section className="membership-benefits" aria-label="Included with Premium">
          <div><WorkspaceIcon name="review" /><div><h2>Review your games</h2><p>Import from Chess.com or Lichess. Analyze your moves with Stockfish and see where you went wrong.</p></div></div>
          <div><WorkspaceIcon name="puzzles" /><div><h2>Train your mistakes</h2><p>Select a game and practice puzzles from your own mistakes.</p></div></div>
          <div><WorkspaceIcon name="openings" /><div><h2>Build your repertoire</h2><p>All opening courses and training modes, with hints, spaced repetition, and saved progress.</p></div></div>
        </section>
        <section className="membership-faq" aria-label="Membership questions">
          <h2>Questions about membership?</h2>
          <details><summary>How does the free trial work?</summary><p>Create an account to try opening training for 3 days and review one game with puzzles from that game. Additional game reviews and Mistake Packs require paid membership, even during the trial. No card is required. The trial ends automatically and does not turn into a paid subscription.</p></details>
          <details><summary>What is included?</summary><p>Game Review, puzzles from your selected games, all opening courses and training modes, and saved training progress.</p></details>
          <details><summary>How am I billed?</summary><p>The yearly plan is $39 billed once per year. The monthly plan is $5.99 billed each month. Paid subscriptions renew automatically until canceled. Card and PayPal payments are processed through PayPal.</p></details>
          <details><summary>Do I need an account?</summary><p>Yes. An account is required for the Premium trial and membership, game review, and saving your progress.</p></details>
        </section>
      </div>
    </div>
  );
}

function MembershipPreview() {
  const frame = useRef(null);
  const [width, setWidth] = useState(240);
  useEffect(() => {
    const measure = () => { if (frame.current && frame.current.clientWidth) setWidth(Math.floor(Math.min(280, frame.current.clientWidth) / 8) * 8); };
    measure();
    const observer = window.ResizeObserver ? new window.ResizeObserver(measure) : null;
    if (observer) observer.observe(frame.current);
    window.addEventListener('resize', measure);
    return () => { if (observer) observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  return <div className="membership-preview" aria-label="Example training preview">
    <div className="membership-preview-board" ref={frame}><Chessboard width={width} position="rnbqkb1r/ppp1pppp/5n2/3p4/3P1B2/4P3/PPP2PPP/RN1QKBNR b KQkq - 0 3" draggable={false} showNotation squareStyles={{ e3: { backgroundColor: 'rgba(244,197,66,.45)' } }} /><span>Example training position</span></div>
    <div className="membership-preview-copy"><div className="membership-preview-step"><WorkspaceIcon name="review" /><span>Game Review</span></div><h2>Your game. Your practice.</h2><p>Find the moves you missed, then practice them on the board.</p><div className="membership-preview-flow"><span>1</span> Import your games<span>2</span> Select a game to review<span>3</span> Train your mistakes</div><div className="membership-preview-opening"><WorkspaceIcon name="openings" /><div><strong>Opening training</strong><p>Learn the plan. Play the moves. Use a hint when you need one.</p></div></div></div>
  </div>;
}
