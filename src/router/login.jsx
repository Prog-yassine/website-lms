import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LuArrowRight, LuEye, LuEyeOff, LuShieldCheck } from "react-icons/lu";
import AuthLayout from "../components/auth/AuthLayout";
import { postAuth } from "../lib/api";

export default function Login() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [loginType, setLoginType] = useState("root");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(null);
  const navigate = useNavigate();
  const registered = Boolean(location.state?.registered);
  useEffect(() => () => request.current?.abort(), []);

  const selectType = (type) => {
    if (isLoading || type === loginType) return;
    setLoginType(type);
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setError("");
  };

  const handleTabKey = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || isLoading) return;
    event.preventDefault();
    const type = event.key === "Home" ? "root" : event.key === "End" ? "iam" :
      loginType === "root" ? "iam" : "root";
    selectType(type);
    event.currentTarget.querySelector(`#${type === "root" ? "owner" : "iam"}-tab`)?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (request.current) return;
    setError("");
    setIsLoading(true);
    const controller = new AbortController();
    request.current = controller;
    try {
      const body = loginType === "root" ? { email: email.trim(), password } : { id: email.trim(), secret: password };
      const data = await postAuth(loginType, body, { signal: controller.signal });
      if (typeof data.token !== "string" || !data.token.trim()) {
        throw new Error("The server did not return a valid session. Please try again.");
      }
      localStorage.setItem("token", data.token);
      navigate("/coming-soon", { replace: true });
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message || "We couldn't sign you in. Please try again.");
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-intro"><span className="eyebrow">YOUR LEARNING JOURNEY CONTINUES</span><h1>Welcome back<span>.</span></h1><p>Good to see you again. Let’s pick up where you left off.</p></div>
      {registered && <p className="auth-success" role="status">Your account is ready. Sign in to get started.</p>}
      <div className="auth-tabs" role="tablist" aria-label="Account type" onKeyDown={handleTabKey}>
        <button id="owner-tab" role="tab" type="button" tabIndex={loginType === "root" ? 0 : -1} aria-selected={loginType === "root"} aria-controls="auth-login-panel" onClick={() => selectType("root")} disabled={isLoading}>Account owner</button>
        <button id="iam-tab" role="tab" type="button" tabIndex={loginType === "iam" ? 0 : -1} aria-selected={loginType === "iam"} aria-controls="auth-login-panel" onClick={() => selectType("iam")} disabled={isLoading}>IAM user</button>
      </div>
      <div id="auth-login-panel" role="tabpanel" aria-labelledby={loginType === "root" ? "owner-tab" : "iam-tab"}>
        <p className="auth-account-help">{loginType === "root" ? "Manage your organization and learning spaces." : "Use the credentials provided by your organization."}</p>
        <form onSubmit={handleSubmit} className="auth-form" aria-busy={isLoading}>
          <div className="auth-field"><label htmlFor="login-identity">{loginType === "root" ? "Email" : "IAM ID"}</label><input id="login-identity" name={loginType === "root" ? "email" : "id"} type={loginType === "root" ? "email" : "text"} inputMode={loginType === "root" ? "email" : "numeric"} autoComplete="username" placeholder={loginType === "root" ? "you@yourorganization.com" : "Your IAM user ID"} value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} disabled={isLoading} aria-describedby={error ? "login-error" : undefined} /></div>
          <div className="auth-field"><label htmlFor="login-password">{loginType === "root" ? "Password" : "Secret"}</label><div className="auth-password"><input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder={loginType === "root" ? "Enter your password" : "Enter your IAM secret"} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} aria-describedby={error ? "login-error" : undefined} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} disabled={isLoading}>{showPassword ? <LuEyeOff aria-hidden="true" /> : <LuEye aria-hidden="true" />}</button></div></div>
          {error && <p className="auth-error" id="login-error" role="alert">{error}</p>}
          <button className="btn btn-primary auth-submit" type="submit" disabled={isLoading}>{isLoading ? <><span className="auth-spinner" aria-hidden="true" /> Signing in…</> : <>Sign in <LuArrowRight aria-hidden="true" /></>}</button>
        </form>
      </div>
      <p className="auth-switch">New to Grupedia? <Link to="/register">Create an account <LuArrowRight aria-hidden="true" /></Link></p>
      <p className="auth-assurance"><LuShieldCheck aria-hidden="true" /> Your next chapter starts here.</p>
    </AuthLayout>
  );
}
