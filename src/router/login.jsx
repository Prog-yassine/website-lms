import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LuArrowRight, LuEye, LuEyeOff, LuShieldCheck } from "react-icons/lu";
import AuthLayout from "../components/auth/AuthLayout";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const location = useLocation();
  const { login, status } = useAuth();
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(null);
  const navigate = useNavigate();
  const registered = Boolean(location.state?.registered);
  const busy = isLoading || status === "loading";
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (status === "authenticated") navigate("/dashboard", { replace: true });
  }, [status, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (request.current || status === "loading") return;
    setError("");
    setIsLoading(true);
    const controller = new AbortController();
    request.current = controller;
    try {
      await login({ email: email.trim(), password }, { signal: controller.signal });
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message || "We couldn't sign you in. Please try again.");
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-intro"><span className="eyebrow">YOUR NEXT BUILD STARTS HERE</span><h1>Welcome back<span>.</span></h1><p>Good to see you again. Let’s pick up where you left off.</p></div>
      {registered && <p className="auth-success" role="status">Your account is ready. Sign in to get started.</p>}
      <p className="auth-account-help">Sign in to manage your applications and data.</p>
      <form onSubmit={handleSubmit} className="auth-form" aria-busy={busy}>
        <div className="auth-field"><label htmlFor="login-email">Email</label><input id="login-email" name="email" type="email" inputMode="email" autoComplete="username" placeholder="you@yourorganization.com" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} disabled={busy} aria-describedby={error ? "login-error" : undefined} /></div>
        <div className="auth-field"><label htmlFor="login-password">Password</label><div className="auth-password"><input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={busy} aria-describedby={error ? "login-error" : undefined} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} disabled={busy}>{showPassword ? <LuEyeOff aria-hidden="true" /> : <LuEye aria-hidden="true" />}</button></div></div>
        {error && <p className="auth-error" id="login-error" role="alert">{error}</p>}
        <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>{busy ? <><span className="auth-spinner" aria-hidden="true" /> {isLoading ? "Signing in…" : "Checking session…"}</> : <>Sign in <LuArrowRight aria-hidden="true" /></>}</button>
      </form>
      <p className="auth-switch">New to Grupedia? <Link to="/register">Create an account <LuArrowRight aria-hidden="true" /></Link></p>
      <p className="auth-assurance"><LuShieldCheck aria-hidden="true" /> Your next application starts here.</p>
    </AuthLayout>
  );
}
