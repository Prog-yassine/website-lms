import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LuArrowRight, LuEye, LuEyeOff, LuCheck } from "react-icons/lu";
import AuthLayout from "../components/auth/AuthLayout";
import { useAuth } from "../auth/AuthContext";

export default function Register() {
  const { register, status } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(null);
  const navigate = useNavigate();
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
      if (!name.trim()) throw new Error("Please enter your full name.");
      await register({ name: name.trim(), email: email.trim(), password }, { signal: controller.signal });
      if (!controller.signal.aborted) navigate("/login", { state: { registered: true, email: email.trim() } });
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message || "We couldn't create your account. Please try again.");
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setIsLoading(false);
    }
  };

  return (
    <AuthLayout mode="register">
      <div className="auth-intro"><span className="eyebrow">MAKE ROOM FOR WHAT’S NEXT</span><h1>Start something<br />great<span>.</span></h1><p>Create your account and start building an app that works your way.</p></div>
      <form onSubmit={handleSubmit} className="auth-form auth-register-form" aria-busy={busy}>
        <div className="auth-field"><label htmlFor="register-name">Full name</label><input id="register-name" name="name" type="text" autoComplete="name" placeholder="Alex Morgan" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} disabled={busy} /></div>
        <div className="auth-field"><label htmlFor="register-email">Email</label><input id="register-email" name="email" type="email" autoComplete="email" placeholder="you@yourorganization.com" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} disabled={busy} /></div>
        <div className="auth-field"><label htmlFor="register-password">Password</label><div className="auth-password"><input id="register-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} disabled={busy} aria-describedby="password-hint" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} disabled={busy}>{showPassword ? <LuEyeOff aria-hidden="true" /> : <LuEye aria-hidden="true" />}</button></div><span className={`auth-field-hint ${password.length >= 8 ? "auth-hint-valid" : ""}`} id="password-hint"><LuCheck aria-hidden="true" /> At least 8 characters</span></div>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>{busy ? <><span className="auth-spinner" aria-hidden="true" /> {isLoading ? "Creating account…" : "Checking session…"}</> : <>Create account <LuArrowRight aria-hidden="true" /></>}</button>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/login">Sign in <LuArrowRight aria-hidden="true" /></Link></p>
      <p className="auth-assurance">One account. A world of possibilities.</p>
    </AuthLayout>
  );
}
