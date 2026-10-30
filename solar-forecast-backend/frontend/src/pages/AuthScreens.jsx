import React, { useState, useMemo } from "react";
import { Sun, Eye, EyeOff, ArrowRight, Mail, Lock, Hash } from "lucide-react";
import { apiService } from "../services/api";
import Button from "../components/ui/Button";
import FormField, { ThemedInput } from "../components/ui/FormField";

// ─────────────────────────────────────────────────────────
// Shared auth wrapper
// ─────────────────────────────────────────────────────────
function AuthWrapper({ children, title, subtitle }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: "var(--bg)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* Brand mark */}
        <div className="flex items-center gap-2.5 mb-7">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(249,115,22,0.12)" }}
          >
            <Sun style={{ width: 20, height: 20, color: "var(--accent-2)" }} />
          </div>
          <div>
            <p className="text-sm font-extrabold leading-tight" style={{ color: "var(--text)" }}>
              SolarCast Pro
            </p>
            <p className="text-xs leading-tight" style={{ color: "var(--muted)" }}>
              ML Forecasting Platform
            </p>
          </div>
        </div>

        <h2 className="text-xl font-extrabold mb-1" style={{ color: "var(--text)" }}>
          {title}
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          {subtitle}
        </p>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────
const isEmail = (v) => /\S+@\S+\.\S+/.test(v);
const isStrongPwd = (v) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&._-]).{8,}$/.test(v);

export function Login({ onLoginSuccess, onSwitchToSignup }) {
  const [mode, setMode] = useState("login"); // login | resetRequest | resetConfirm
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const reset = () => { setError(null); setInfo(null); };

  const submitLogin = async (e) => {
    e.preventDefault();
    reset();
    if (!isEmail(username)) { setError("Please enter a valid email address."); return; }
    if (!password) { setError("Password is required."); return; }
    setLoading(true);
    try {
      const ok = await apiService.login(username.trim(), password);
      if (ok) onLoginSuccess();
      else setError("Invalid email or password.");
    } catch { setError("Login failed. Please try again."); }
    finally { setLoading(false); }
  };

  const submitResetRequest = async (e) => {
    e.preventDefault(); reset();
    if (!isEmail(username)) { setError("Enter a valid email."); return; }
    setLoading(true);
    try {
      await apiService.requestPasswordReset(username.trim());
      setInfo("If this email exists, a 6-digit reset code has been sent.");
      setMode("resetConfirm");
    } catch { setError("Failed to send code. Try again."); }
    finally { setLoading(false); }
  };

  const submitConfirmReset = async (e) => {
    e.preventDefault(); reset();
    if (!isStrongPwd(newPassword)) { setError("Password must be 8+ chars with upper, lower, number & symbol."); return; }
    setLoading(true);
    try {
      const ok = await apiService.confirmPasswordReset(username.trim(), resetCode.trim(), newPassword);
      if (ok) { setInfo("Password updated! Please sign in."); setMode("login"); setPassword(""); setResetCode(""); setNewPassword(""); }
      else setError("Invalid or expired code.");
    } catch { setError("Reset failed. Try again."); }
    finally { setLoading(false); }
  };

  const titles = {
    login:        { title: "Welcome back",             subtitle: "Sign in to continue to SolarCast Pro" },
    resetRequest: { title: "Reset your password",       subtitle: "We'll email you a 6-digit code" },
    resetConfirm: { title: "Enter code & new password", subtitle: "Use the code we emailed to you" },
  };
  const { title, subtitle } = titles[mode];

  return (
    <AuthWrapper title={title} subtitle={subtitle}>
      {/* Alerts */}
      {error && <Alert type="error" msg={error} />}
      {info  && <Alert type="success" msg={info} />}

      {/* Login form */}
      {mode === "login" && (
        <form onSubmit={submitLogin} className="space-y-4">
          <FormField label="Email" required>
            <ThemedInput
              type="email"
              autoComplete="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="you@example.com"
              autoFocus
            />
          </FormField>
          <FormField label="Password" required>
            <div className="relative">
              <ThemedInput
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingRight: 40 }}
              />
              <button type="button" onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--muted)" }}>
                {showPw ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
              </button>
            </div>
          </FormField>
          <Button type="submit" variant="primary" fullWidth loading={loading} icon={ArrowRight}>
            Sign In
          </Button>
          <div className="flex justify-between text-xs pt-1">
            <button type="button" onClick={() => { reset(); setMode("resetRequest"); }}
              className="font-semibold" style={{ color: "var(--info)" }}>
              Forgot password?
            </button>
            {onSwitchToSignup && (
              <button type="button" onClick={onSwitchToSignup}
                className="font-semibold" style={{ color: "var(--info)" }}>
                Create account
              </button>
            )}
          </div>
        </form>
      )}

      {/* Reset request */}
      {mode === "resetRequest" && (
        <form onSubmit={submitResetRequest} className="space-y-4">
          <FormField label="Email" required>
            <ThemedInput
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="you@example.com"
              autoFocus
            />
          </FormField>
          <Button type="submit" variant="primary" fullWidth loading={loading}>
            Send Reset Code
          </Button>
          <button type="button" onClick={() => { reset(); setMode("login"); }}
            className="text-xs font-semibold block" style={{ color: "var(--info)" }}>
            ← Back to sign in
          </button>
        </form>
      )}

      {/* Confirm reset */}
      {mode === "resetConfirm" && (
        <form onSubmit={submitConfirmReset} className="space-y-4">
          <FormField label="Email" required>
            <ThemedInput
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </FormField>
          <FormField label="6-digit code" required>
            <ThemedInput
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              style={{ letterSpacing: "0.2em" }}
            />
          </FormField>
          <FormField
            label="New Password"
            required
            hint={newPassword && !isStrongPwd(newPassword) ? "Must be 8+ chars with upper, lower, number & symbol." : undefined}
          >
            <div className="relative">
              <ThemedInput
                type={showNewPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="NewPass@123"
                style={{ paddingRight: 40 }}
              />
              <button type="button" onClick={() => setShowNewPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--muted)" }}>
                {showNewPw ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
              </button>
            </div>
          </FormField>
          <Button type="submit" variant="primary" fullWidth loading={loading}>
            Update Password
          </Button>
          <button type="button" onClick={() => { reset(); setMode("resetRequest"); }}
            className="text-xs font-semibold" style={{ color: "var(--info)" }}>
            ← Back
          </button>
        </form>
      )}
    </AuthWrapper>
  );
}

// ─────────────────────────────────────────────────────────
// Signup
// ─────────────────────────────────────────────────────────
export function Signup({ onSignupSuccess, onSwitchToLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);

  const emailErr = useMemo(() => email && !isEmail(email.trim()) ? "Please enter a valid email." : null, [email]);
  const pwdErr = useMemo(() => password && !isStrongPwd(password) ? "8+ chars, uppercase, number & symbol required." : null, [password]);
  const canSubmit = !loading && !!email && !!password && !emailErr && !pwdErr;

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!canSubmit) { setFormError("Please fix the highlighted fields."); return; }
    setLoading(true);
    try {
      const ok = await apiService.signup(email.trim().toLowerCase(), password);
      if (ok) onSignupSuccess();
      else setFormError("Signup failed. Please try again.");
    } catch (err) {
      setFormError(err?.response?.data?.error || "Signup failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <AuthWrapper
      title="Create your account"
      subtitle="Start forecasting with SolarCast Pro"
    >
      {formError && <Alert type="error" msg={formError} />}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField label="Email" required error={emailErr}>
          <ThemedInput
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
            error={emailErr}
          />
        </FormField>
        <FormField label="Password" required error={pwdErr}>
          <div className="relative">
            <ThemedInput
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Strong password"
              autoComplete="new-password"
              style={{ paddingRight: 40 }}
              error={pwdErr}
            />
            <button type="button" onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--muted)" }}>
              {showPw ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
            </button>
          </div>
        </FormField>
        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={!canSubmit}
          loading={loading}
          icon={ArrowRight}
        >
          {loading ? "Creating account…" : "Sign Up"}
        </Button>
      </form>
      {onSwitchToLogin && (
        <p className="text-sm text-center mt-4" style={{ color: "var(--muted)" }}>
          Already have an account?{" "}
          <button onClick={onSwitchToLogin} className="font-semibold" style={{ color: "var(--info)" }}>
            Sign in
          </button>
        </p>
      )}
    </AuthWrapper>
  );
}

// ─────────────────────────────────────────────────────────
// Alert helper
// ─────────────────────────────────────────────────────────
function Alert({ type, msg }) {
  const isErr = type === "error";
  return (
    <div
      className="text-sm p-3 rounded-lg mb-4"
      style={{
        background: isErr ? "rgba(220,38,38,0.08)" : "rgba(22,163,74,0.08)",
        color: isErr ? "var(--danger)" : "var(--success)",
        border: `1px solid ${isErr ? "rgba(220,38,38,0.2)" : "rgba(22,163,74,0.2)"}`,
      }}
    >
      {msg}
    </div>
  );
}
