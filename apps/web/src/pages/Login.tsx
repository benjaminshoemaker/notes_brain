import { useState } from "react";

import { Link, useNavigate } from "react-router-dom";

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
      setError(result.error.message);
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
      setError(result.error.message);
      return;
    }

    setStatus("Magic link sent. Check your email.");
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h1>Sign in</h1>

      <form onSubmit={handleSignIn} style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={isSubmitting}>
          Sign in
        </button>

        <button type="button" onClick={handleMagicLink} disabled={isSubmitting}>
          Sign in with magic link
        </button>
      </form>

      {error ? (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      ) : null}

      {status ? <p>{status}</p> : null}

      <p style={{ marginTop: 12 }}>
        New here? <Link to="/signup">Create an account</Link>
      </p>
    </div>
  );
}

