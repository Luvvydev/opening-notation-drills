import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import TopNav from "./TopNav";
import SEO from "./SEO";
import { functions } from "../firebase";
import { useAuth } from "../auth/AuthProvider";
import "./PaymentReturn.css";

function getQueryParam(search, name) {
  try {
    return new URLSearchParams(search || "").get(name) || "";
  } catch (_) {
    return "";
  }
}

export default function PaymentReturn(props) {
  const { user, authLoading, userDocLoading, hasPaidMembership } = useAuth();
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("Checking your payment with PayPal...");

  const search = props && props.location ? props.location.search : "";
  const path = props && props.location ? props.location.pathname : "";
  const isCancel = path.indexOf("/payment/cancel") === 0;

  const subscriptionId = useMemo(() => {
    return (
      getQueryParam(search, "subscription_id") ||
      getQueryParam(search, "subscriptionId") ||
      getQueryParam(search, "ba_token") ||
      getQueryParam(search, "token") ||
      ""
    );
  }, [search]);

  useEffect(() => {
    if (isCancel) {
      setStatus("cancelled");
      setMessage("Checkout was cancelled. Your membership was not changed.");
      return undefined;
    }

    if (authLoading || userDocLoading) return undefined;

    if (hasPaidMembership) {
      setStatus("active");
      setMessage("Premium is active on this account.");
      return undefined;
    }

    if (!user) {
      setStatus("signin");
      setMessage("Sign in with the same account you used before checkout, then refresh this page.");
      return undefined;
    }

    if (!subscriptionId) {
      setStatus("pending");
      setMessage("PayPal did not return a subscription id. The webhook may still activate this account after PayPal confirms it.");
      return undefined;
    }

    let cancelled = false;

    async function syncPayment() {
      try {
        const syncPaypalMembership = httpsCallable(functions, "syncPaypalMembership");
        const result = await syncPaypalMembership({ subscriptionId });
        const data = (result && result.data) || {};

        if (cancelled) return;

        if (data.membershipActive) {
          setStatus("active");
          setMessage("Premium is active. You can return to training now.");
          return;
        }

        setStatus("pending");
        setMessage("PayPal has not marked the subscription active yet. This page can be refreshed after a minute, or the webhook will update the account automatically.");
      } catch (_) {
        if (cancelled) return;
        setStatus("error");
        setMessage("Could not verify the PayPal subscription from this browser. The webhook can still activate the account when PayPal confirms payment.");
      }
    }

    syncPayment();

    return () => {
      cancelled = true;
    };
  }, [authLoading, userDocLoading, hasPaidMembership, isCancel, subscriptionId, user]);

  return (
    <div className="payment-return-page">
      <SEO
        title="Payment Status | ChessDrills"
        description="Check your ChessDrills payment and membership status."
        canonical="https://chessdrills.net/payment/success"
        image="https://chessdrills.net/logo512.png"
      />
      <TopNav active="about" title="Chess Opening Drills" />

      <div className="payment-return-wrap">
        <div className="payment-return-card">
          <div className="payment-return-kicker">Membership</div>
          <h2>{status === "active" ? "Premium is ready" : status === "cancelled" ? "Checkout cancelled" : "Payment status"}</h2>
          <p>{message}</p>

          <div className="payment-return-actions">
            {status === "active" ? (
              <Link className="payment-return-btn" to="/openings">Go to training</Link>
            ) : null}
            {status === "signin" ? (
              <Link className="payment-return-btn" to="/login">Sign in</Link>
            ) : null}
            {status !== "active" ? (
              <Link className="payment-return-btn secondary" to="/about">Back to Premium</Link>
            ) : null}
            {status === "pending" || status === "error" ? (
              <button className="payment-return-btn secondary" type="button" onClick={() => window.location.reload()}>
                Recheck
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
