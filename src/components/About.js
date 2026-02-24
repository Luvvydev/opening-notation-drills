import React, { useState } from 'react';
import GithubCorner from 'react-github-corner';
import TopNav from './TopNav';
import './About.css';
import '../App.css';

import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { useAuth } from "../auth/AuthProvider";


export default function About(props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
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

  const startTrialCheckout = async () => {
    if (!user) {
      try {
        const from = window.location.hash || "#/about";
        window.location.href = `#/signup?from=${encodeURIComponent(from)}&reason=membership_requires_account`;
      } catch (_) {}
      return;
    }

    setBusy(true);
    try {
      const fn = httpsCallable(functions, "createCheckoutSession");
      const res = await fn({ tier: "member", plan: selectedPlan });
      const url = res && res.data && res.data.url ? String(res.data.url) : "";
      if (url) go(url);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert("Checkout failed. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const selectPlan = (plan) => {
    if (plan !== "monthly" && plan !== "yearly") return;
    setSelectedPlan(plan);
  };

  return (
    <div className="about-page">
      <GithubCorner href="https://github.com/Luvvydev" />

      <TopNav active="about" title="Chess Opening Drills" />

      <div className="about-wrap">
        <div className="about-card">
          <div className="about-hero">
            <div className="about-hero-badge">7 day free trial</div>
            <h2 className="about-title">ChessDrills Premium</h2>
            <p className="about-lead">Then $39/year (Only $3.25/month) or $5.99/month.</p>
          </div>

          {showLockedNote ? (
            <div className="about-note">
              <div className="about-note-title">That feature is Premium only.</div>
              <div className="about-note-sub">Start the free trial to unlock it.</div>
            </div>
          ) : null}

          <div className="about-section">
            <div className="about-section-title">Choose a plan</div>

            <div className="about-tiers">
              <button
                type="button"
                className={"about-tier " + (selectedPlan === "yearly" ? "selected" : "")}
                onClick={() => selectPlan("yearly")}
              >
                <div className="about-tier-top">
                  <div className="about-tier-name">
                    Yearly
                    <span className="about-tier-tag">Best value</span>
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

            <button
              className="about-tier-btn"
              type="button"
              onClick={startTrialCheckout}
              disabled={busy}
              style={{ marginTop: 12, width: "100%" }}
            >
              {busy ? "Opening checkout..." : "Start Free Trial"}
            </button>

            <div className="about-muted" style={{ marginTop: 10 }}>
              Cancel anytime before day 7
            </div>
          </div>
        <div className="about-section">
          <div className="about-section-title">What you get</div>

            <ul className="about-bullets">
              <li><strong>Learn mode:</strong> Build clean move accuracy before adding speed or pressure</li>
              <li><strong>Practice mode:</strong> Built to strengthen long term memory so your moves hold up in real games</li>
              <li><strong>Drill mode:</strong> Push for consecutive perfect runs</li>
              <li><strong>Leaderboards:</strong> Daily, weekly, and all time leaderboards</li>
            </ul>
          </div>

          <div className="about-section">
            <div className="about-section-title">How it works</div>
            <ol className="about-steps">
              <li>Create a free account</li>
              <li>Upgrade via Stripe</li>
              <li>Your account is marked as Member automatically and features unlock</li>
            </ol>
          </div>


        </div>
      </div>
    </div>
  );
}
