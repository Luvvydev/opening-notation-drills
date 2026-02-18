import React, { useState } from 'react';
import GithubCorner from 'react-github-corner';
import TopNav from './TopNav';
import './About.css';
import '../App.css';

import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { useAuth } from "../auth/AuthProvider";

const COFFEE_URL = "https://buymeacoffee.com/luvvydev";

export default function About(props) {
  const { user } = useAuth();
  const [busyTier, setBusyTier] = useState("");

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

  const startCheckout = async (tier) => {
    if (!user) {
      try {
        const from = window.location.hash || "#/about";
        window.location.href = `#/signup?from=${encodeURIComponent(from)}&reason=membership_requires_account`;
      } catch (_) {}
      return;
    }

    setBusyTier(tier);
    try {
      const fn = httpsCallable(functions, "createCheckoutSession");
      const res = await fn({ tier });
      const url = res && res.data && res.data.url ? String(res.data.url) : "";
      if (url) go(url);
    } catch (e) {
      // Fail closed: don't unlock anything client-side.
      // Surface a minimal message so users aren't stuck.
      // eslint-disable-next-line no-alert
      alert("Checkout failed. Please try again in a moment.");
    } finally {
      setBusyTier("");
    }
  };

  return (
    <div className="about-page">
      <GithubCorner href="https://github.com/Luvvydev" />

      <TopNav active="about" title="Chess Opening Drills" />

      <div className="about-wrap">
        <div className="about-card">
          <h2 className="about-title">Upgrade your drills</h2>

          <p className="about-lead">
       
          </p>

          {showLockedNote ? (
            <div className="about-note">
              <div className="about-note-title">That feature is members only.</div>
              <div className="about-note-sub">Upgrade to unlock it and keep your progress synced.</div>
            </div>
          ) : null}

          <div className="about-section">
            <div className="about-section-title">Membership perks</div>

            <ul className="about-bullets">
              <li><strong>Practice Mode:</strong> Built to strengthen long term memory so your moves hold up under real game pressure.</li>
              <li><strong>Drill Mode:</strong> Test how many lines you can complete consecutively without mistakes. Improve your accuracy and track your progress on the leaderboards!</li>
              <li><strong>Leaderboards:</strong> Daily, weekly, and all time leaderboards. Climb the ranks and earn your bragging rights!</li>
            </ul>

            <p className="about-muted">
           
            </p>
          </div>

          <div className="about-section">
            <div className="about-section-title">Choose a tier</div>

            <div className="about-tiers">
              <div className="about-tier">
                <div className="about-tier-top">
                  <div className="about-tier-name">Supporter</div>
                  <div className="about-tier-price">Any amount</div>
                </div>
                <div className="about-tier-desc">
                  Helps keep the site alive, Thank you!
                </div>

                <button
                  className="about-tier-btn secondary"
                  type="button"
                  onClick={() => go(COFFEE_URL)}
                >
                  <span role="img" aria-label="coffee">☕</span> Tip jar
                </button>
              </div>

              <div className="about-tier featured">
                <div className="about-tier-top">
                  <div className="about-tier-name">1$</div>
                  <div className="about-tier-price">Monthly</div>
                </div>
                <div className="about-tier-desc">
                  Unlock Practice, Drill, Leaderboards
                </div>

                <button
                  className="about-tier-btn"
                  type="button"
                  onClick={() => startCheckout("member")}
                  disabled={busyTier !== "" && busyTier !== "member"}
                >
                  {busyTier === "member" ? "Opening checkout..." : "Upgrade monthly"}
                </button>
              </div>

              <div className="about-tier">
                <div className="about-tier-top">
                  <div className="about-tier-name">5$</div>
                  <div className="about-tier-price">Lifetime</div>
                </div>
                <div className="about-tier-desc">
                  Unlock Practice, Drill, Leaderboards
                </div>

                <button
                  className="about-tier-btn"
                  type="button"
                  onClick={() => startCheckout("lifetime")}
                  disabled={busyTier !== "" && busyTier !== "lifetime"}
                >
                  {busyTier === "lifetime" ? "Opening checkout..." : "Upgrade lifetime"}
                </button>
              </div>
            </div>
          </div>

          <div className="about-section">
            <div className="about-section-title">How it works</div>
            <ol className="about-steps">
              <li>Create a free account</li>
              <li>Upgrade via Stripe</li>
              <li>Your account is marked as Member automatically and features unlock</li>
            </ol>

            <p className="about-muted">
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
