import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import TopNav from "./TopNav";

const ONBOARDING_KEY = "chessdrills.onboarding.v1";

function safeReadOnboarding() {
  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_) {
    return null;
  }
}

function safeWriteOnboarding(data) {
  try {
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
  } catch (_) {
    // ignore
  }
}

function computePathFromRating(ratingBand) {
  // "Personalized" in the UX sense: use their selected band to populate the same template.
  const bands = {
    under400: { now: 350, in2w: 450 },
    r400_800: { now: 600, in2w: 800 },
    r800_1200: { now: 1000, in2w: 1200 },
    r1200_1600: { now: 1400, in2w: 1600 },
    r1600_2000: { now: 1800, in2w: 2000 },
    r2000plus: { now: 2100, in2w: 2300 }
  };
  const b = bands[ratingBand] || bands.r800_1200;

  // Keep it simple: a smooth curve to +200 over ~2 weeks.
  const points = [
    { x: 0, y: b.now },
    { x: 3, y: b.now + 40 },
    { x: 7, y: b.now + 90 },
    { x: 10, y: b.now + 140 },
    { x: 14, y: b.in2w }
  ];

  return {
    now: b.now,
    in2w: b.in2w,
    without: b.now + 20,
    points
  };
}

function ProgressBar({ step, total }) {
  const pct = Math.max(0, Math.min(1, total <= 0 ? 0 : step / total));
  return (
    <div
      style={{
        height: 6,
        borderRadius: 999,
        background: "rgba(255,255,255,0.10)",
        overflow: "hidden",
        marginBottom: 18
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.round(pct * 100)}%`,
          background: "rgba(93, 143, 255, 0.95)",
          borderRadius: 999,
          transition: "width 240ms ease"
        }}
      />
    </div>
  );
}

function OptionPill({ icon, label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 999,
        border: selected
          ? "1px solid rgba(93, 143, 255, 0.65)"
          : "1px solid rgba(255,255,255,0.10)",
        background: selected ? "rgba(93, 143, 255, 0.12)" : "rgba(255,255,255,0.03)",
        color: "#e9edf2",
        fontWeight: 800,
        cursor: "pointer",
        outline: "none"
      }}
    >
      <span style={{ width: 22, display: "inline-flex", justifyContent: "center" }}>
        {icon}
      </span>
      <span style={{ opacity: selected ? 1 : 0.92 }}>{label}</span>
      <span style={{ marginLeft: "auto", opacity: 0.75 }}>{selected ? "✓" : ""}</span>
    </button>
  );
}

function PathChart({ path }) {
  const w = 520;
  const h = 220;
  const pad = 26;

  const ys = path.points.map((p) => p.y);
  const minY = Math.min(...ys) - 20;
  const maxY = Math.max(...ys) + 20;

  const xScale = (x) => pad + (x / 14) * (w - pad * 2);
  const yScale = (y) => pad + ((maxY - y) / (maxY - minY)) * (h - pad * 2);

  const line = path.points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.x).toFixed(1)} ${yScale(p.y).toFixed(1)}`)
    .join(" ");

  const dashed = `M ${xScale(0).toFixed(1)} ${yScale(path.now).toFixed(1)} L ${xScale(14).toFixed(
    1
  )} ${yScale(path.without).toFixed(1)}`;

  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.02)",
        padding: 14
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 800, fontSize: 12 }}>Elo</div>
        <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 800, fontSize: 12 }}>2 weeks</div>
      </div>

      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
        <defs>
          <linearGradient id="cd_grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(93, 143, 255, 0.25)" />
            <stop offset="100%" stopColor="rgba(93, 143, 255, 0.00)" />
          </linearGradient>
        </defs>

        <path
          d={dashed}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="3"
          strokeDasharray="7 8"
        />

        <path
          d={line}
          fill="none"
          stroke="rgba(93, 143, 255, 0.95)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        <path
          d={`${line} L ${xScale(14).toFixed(1)} ${yScale(minY).toFixed(1)} L ${xScale(0).toFixed(
            1
          )} ${yScale(minY).toFixed(1)} Z`}
          fill="url(#cd_grad)"
        />

        <circle cx={xScale(0)} cy={yScale(path.now)} r="7" fill="#fff" opacity="0.9" />
        <circle cx={xScale(14)} cy={yScale(path.in2w)} r="7" fill="rgba(93, 143, 255, 0.95)" />

        <text
          x={xScale(0)}
          y={yScale(path.now) + 22}
          textAnchor="middle"
          fill="rgba(255,255,255,0.55)"
          fontSize="14"
          fontWeight="800"
        >
          Now
        </text>
        <text
          x={xScale(14)}
          y={yScale(path.in2w) + 22}
          textAnchor="middle"
          fill="rgba(93, 143, 255, 0.95)"
          fontSize="14"
          fontWeight="900"
        >
          With drills
        </text>
        <text
          x={xScale(14)}
          y={yScale(path.without) + 22}
          textAnchor="middle"
          fill="rgba(255,255,255,0.35)"
          fontSize="14"
          fontWeight="800"
        >
          Without
        </text>
      </svg>
    </div>
  );
}

export default function Signup(props) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const gateReason =
    props && props.location && props.location.state && props.location.state.reason
      ? props.location.state.reason
      : null;

  const from =
    props && props.location && props.location.state && props.location.state.from
      ? props.location.state.from
      : null;

  const initialOnboarding = safeReadOnboarding();

  // Steps:
  // 0: intro
  // 1: rating
  // 2: motivation
  // 3: goal
  // 4: path preview
  // 5: signup form
  const [step, setStep] = useState(initialOnboarding && initialOnboarding.completed ? 5 : 0);

  const [ratingBand, setRatingBand] = useState(initialOnboarding?.ratingBand || "");
  const [motivation, setMotivation] = useState(initialOnboarding?.motivation || "");
  const [goal, setGoal] = useState(initialOnboarding?.goal || "");

  const [busy, setBusy] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const path = useMemo(() => computePathFromRating(ratingBand), [ratingBand]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (isMountedRef.current) {
      setError("");
      setBusy(true);
    }

    try {
      await signUp(email, password);

      safeWriteOnboarding({
        completed: true,
        ratingBand,
        motivation,
        goal,
        completedAt: Date.now()
      });

      // After account creation, send them to About (pricing/upgrade).
      if (props && props.history) {
        props.history.push({
          pathname: "/about",
          state: { from: from || "/" }
        });
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err && err.message ? err.message : "Sign up failed");
      }
    } finally {
      if (isMountedRef.current) {
        setBusy(false);
      }
    }
  };

  const pageStyle = { minHeight: "100vh", background: "#0f1115" };

  const wrapStyle = {
    padding: 18,
    maxWidth: 620,
    margin: "0 auto"
  };

  const cardStyle = {
    marginTop: 10,
    padding: 18,
    borderRadius: 16,
    background: "rgba(20, 20, 25, 0.65)",
    border: "1px solid rgba(255,255,255,0.12)"
  };

  const h1Style = { marginTop: 0, marginBottom: 10, fontSize: 42, lineHeight: 1.1 };
  const subStyle = { marginTop: 0, color: "rgba(255,255,255,0.65)", fontWeight: 700 };

  const labelStyle = { marginBottom: 6, fontWeight: 800 };
  const inputStyle = {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "#e9edf2",
    outline: "none"
  };

  const primaryBtn = (disabled) => ({
    width: "100%",
    padding: 14,
    borderRadius: 999,
    border: "1px solid rgba(93, 143, 255, 0.35)",
    background: disabled ? "rgba(255,255,255,0.06)" : "rgba(93, 143, 255, 0.35)",
    color: disabled ? "rgba(255,255,255,0.55)" : "#e9edf2",
    fontWeight: 900,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.75 : 1,
    transition: "transform 120ms ease, background 160ms ease"
  });

  const ghostBtn = {
    width: "100%",
    padding: 14,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#e9edf2",
    fontWeight: 900,
    cursor: "pointer"
  };

  const smallLinkStyle = {
    marginTop: 12,
    textAlign: "center",
    color: "rgba(255,255,255,0.55)",
    fontWeight: 700,
    cursor: "pointer"
  };

  const errorStyle = {
    margin: "10px 0",
    padding: 10,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255, 90, 90, 0.10)",
    color: "#e9edf2"
  };

  const saveDraft = (nextStep) => {
    safeWriteOnboarding({
      completed: false,
      ratingBand,
      motivation,
      goal,
      updatedAt: Date.now()
    });
    setStep(nextStep);
  };

  const skipToSignup = () => {
    saveDraft(5);
  };

  const renderIntro = () => {
    return (
      <div style={cardStyle}>
        <ProgressBar step={1} total={6} />

        <h1 style={h1Style}>Start for free</h1>
        <p style={subStyle}>
          Answer 3 quick questions. Then create your account and unlock your upgrade options.
        </p>

        {gateReason ? (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(244, 197, 66, 0.35)",
              background: "rgba(244, 197, 66, 0.12)",
              color: "#e9edf2",
              fontWeight: 800
            }}
          >
            Create a free account to access new drills.
          </div>
        ) : null}

        <div style={{ marginTop: 18 }}>
          <button
            type="button"
            style={primaryBtn(false)}
            onClick={() => saveDraft(1)}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.99)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            Continue →
          </button>

          <div style={smallLinkStyle} onClick={skipToSignup}>
            Skip questions
          </div>

          <div style={{ marginTop: 14, textAlign: "center", color: "rgba(255,255,255,0.70)" }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    );
  };

  const renderRating = () => {
    return (
      <div style={cardStyle}>
        <ProgressBar step={2} total={6} />

        <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 34 }}>What's your current rating?</h2>
        <p style={subStyle}>We'll build the plan around your level.</p>

        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          <OptionPill
            icon="🌱"
            label="Under 400"
            selected={ratingBand === "under400"}
            onClick={() => setRatingBand("under400")}
          />
          <OptionPill
            icon="⚡"
            label="400 to 800"
            selected={ratingBand === "r400_800"}
            onClick={() => setRatingBand("r400_800")}
          />
          <OptionPill
            icon="⚔️"
            label="800 to 1,200"
            selected={ratingBand === "r800_1200"}
            onClick={() => setRatingBand("r800_1200")}
          />
          <OptionPill
            icon="🎯"
            label="1,200 to 1,600"
            selected={ratingBand === "r1200_1600"}
            onClick={() => setRatingBand("r1200_1600")}
          />
          <OptionPill
            icon="🔥"
            label="1,600 to 2,000"
            selected={ratingBand === "r1600_2000"}
            onClick={() => setRatingBand("r1600_2000")}
          />
          <OptionPill
            icon="👑"
            label="2,000+"
            selected={ratingBand === "r2000plus"}
            onClick={() => setRatingBand("r2000plus")}
          />
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
          <button
            type="button"
            style={primaryBtn(!ratingBand)}
            disabled={!ratingBand}
            onClick={() => saveDraft(2)}
          >
            Continue →
          </button>
          <button type="button" style={ghostBtn} onClick={() => saveDraft(0)}>
            Back
          </button>
        </div>
      </div>
    );
  };

  const renderMotivation = () => {
    return (
      <div style={cardStyle}>
        <ProgressBar step={3} total={6} />

        <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 34 }}>Why do you want to improve?</h2>
        <p style={subStyle}>This helps us build the right plan.</p>

        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          <OptionPill
            icon="🏆"
            label="Compete in tournaments"
            selected={motivation === "tournaments"}
            onClick={() => setMotivation("tournaments")}
          />
          <OptionPill
            icon="😈"
            label="Beat my friends"
            selected={motivation === "friends"}
            onClick={() => setMotivation("friends")}
          />
          <OptionPill
            icon="📈"
            label="Hit a rating milestone"
            selected={motivation === "milestone"}
            onClick={() => setMotivation("milestone")}
          />
          <OptionPill
            icon="🌱"
            label="Get back into chess"
            selected={motivation === "back"}
            onClick={() => setMotivation("back")}
          />
          <OptionPill
            icon="🎉"
            label="Just have more fun"
            selected={motivation === "fun"}
            onClick={() => setMotivation("fun")}
          />
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
          <button
            type="button"
            style={primaryBtn(!motivation)}
            disabled={!motivation}
            onClick={() => saveDraft(3)}
          >
            Continue →
          </button>
          <button type="button" style={ghostBtn} onClick={() => saveDraft(1)}>
            Back
          </button>
        </div>
      </div>
    );
  };

  const renderGoal = () => {
    return (
      <div style={cardStyle}>
        <ProgressBar step={4} total={6} />

        <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 34 }}>What's your chess goal?</h2>
        <p style={subStyle}>We'll build a plan around your goals.</p>

        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          <OptionPill
            icon="🧠"
            label="Gain 200+ rating points"
            selected={goal === "gain200"}
            onClick={() => setGoal("gain200")}
          />
          <OptionPill
            icon="🏁"
            label="Win more games out of the opening"
            selected={goal === "openingWins"}
            onClick={() => setGoal("openingWins")}
          />
          <OptionPill
            icon="📚"
            label="Build a complete repertoire"
            selected={goal === "repertoire"}
            onClick={() => setGoal("repertoire")}
          />
          <OptionPill
            icon="🛡️"
            label="Feel prepared against anything"
            selected={goal === "prepared"}
            onClick={() => setGoal("prepared")}
          />
          <OptionPill
            icon="🔥"
            label="Train for a tournament"
            selected={goal === "tournament"}
            onClick={() => setGoal("tournament")}
          />
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
          <button type="button" style={primaryBtn(!goal)} disabled={!goal} onClick={() => saveDraft(4)}>
            Continue →
          </button>
          <button type="button" style={ghostBtn} onClick={() => saveDraft(2)}>
            Back
          </button>
        </div>
      </div>
    );
  };

  const renderPath = () => {
    return (
      <div style={cardStyle}>
        <ProgressBar step={5} total={6} />

        <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 34 }}>Your personalized rating path</h2>
        <p style={subStyle}>Based on your level, here's what consistent training can look like.</p>

        <div style={{ marginTop: 14 }}>
          <PathChart path={path} />
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            color: "rgba(255,255,255,0.70)",
            fontWeight: 800
          }}
        >
          <div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Now</div>
            <div style={{ fontSize: 18 }}>{path.now}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>In 2 weeks</div>
            <div style={{ fontSize: 18 }}>{path.in2w}</div>
          </div>
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
          <button type="button" style={primaryBtn(false)} onClick={() => saveDraft(5)}>
            Save your progress →
          </button>
          <button type="button" style={ghostBtn} onClick={() => saveDraft(3)}>
            Back
          </button>
        </div>
      </div>
    );
  };

  const renderSignup = () => {
    return (
      <div style={cardStyle}>
        <ProgressBar step={6} total={6} />

        <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 34 }}>Save your progress</h2>
        <p style={subStyle}>Create an account, then pick your plan on the next page.</p>

        {gateReason ? (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(244, 197, 66, 0.35)",
              background: "rgba(244, 197, 66, 0.12)",
              color: "#e9edf2",
              fontWeight: 800
            }}
          >
            Create a free account to access new drills.
          </div>
        ) : null}

        {error ? <div style={errorStyle}>{error}</div> : null}

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 10 }}>
            <div style={labelStyle}>Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              style={inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Password</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              style={inputStyle}
              required
            />
          </div>

          <button disabled={busy} type="submit" style={primaryBtn(busy)}>
            {busy ? "Creating..." : "Sign Up"}
          </button>
        </form>

        <div style={{ marginTop: 12, color: "rgba(255,255,255,0.75)", textAlign: "center" }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>

        <div style={{ marginTop: 12 }}>
          <button type="button" style={ghostBtn} onClick={() => saveDraft(4)}>
            Back
          </button>
        </div>
      </div>
    );
  };

  let content = null;
  if (step === 0) content = renderIntro();
  else if (step === 1) content = renderRating();
  else if (step === 2) content = renderMotivation();
  else if (step === 3) content = renderGoal();
  else if (step === 4) content = renderPath();
  else content = renderSignup();

  return (
    <div style={pageStyle}>
      <TopNav active="signup" title="Chess Opening Drills" />

      <div style={wrapStyle}>{content}</div>
    </div>
  );
}
