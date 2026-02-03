import { useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { AuthShell, authStyles } from "../components/AuthShell";
import { sendMagicLink, signInWithPassword } from "../lib/authApi";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    setIsSubmitting(true);
    const result = await signInWithPassword(email.trim(), password);
    setIsSubmitting(false);

    if (result.error) {
      setError("Unable to sign in. Check your email and password, then try again.");
      return;
    }

    navigate("/", { replace: true });
  }

  async function handleMagicLink() {
    setError(null);
    setStatus(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required for magic link sign-in.");
      return;
    }

    setIsSubmitting(true);
    const result = await sendMagicLink(trimmedEmail, window.location.origin);
    setIsSubmitting(false);

    if (result.error) {
      setError("Unable to send magic link. Please try again.");
      return;
    }

    setStatus("Magic link sent. Check your email.");
  }

  return (
    <AuthShell
      title="Sign in"
      error={error}
      status={status}
      footer={
        <span style={authStyles.footerText}>
          New here?{" "}
          <Link to="/signup" style={authStyles.link}>
            Create an account
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSignIn} style={authStyles.form}>
        <div style={authStyles.field}>
          <label htmlFor="login-email" style={authStyles.label}>
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={authStyles.input}
          />
        </div>

        <div style={authStyles.field}>
          <label htmlFor="login-password" style={authStyles.label}>
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            style={authStyles.input}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            ...authStyles.button,
            ...authStyles.primaryButton,
            ...(isSubmitting ? authStyles.buttonDisabled : null),
          }}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        <button
          type="button"
          onClick={handleMagicLink}
          disabled={isSubmitting}
          style={{
            ...authStyles.button,
            ...authStyles.secondaryButton,
            ...(isSubmitting ? authStyles.buttonDisabled : null),
          }}
        >
          {isSubmitting ? "Sending link..." : "Sign in with magic link"}
        </button>
      </form>
    </AuthShell>
  );
}
