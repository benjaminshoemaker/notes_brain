import { useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { AuthShell, authStyles } from "../components/AuthShell";
import { signUpWithPassword } from "../lib/authApi";

export default function SignupPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    setIsSubmitting(true);
    const result = await signUpWithPassword(email.trim(), password);
    setIsSubmitting(false);

    if (result.error) {
      setError("Unable to create account. Please try again.");
      return;
    }

    navigate("/", { replace: true });
  }

  return (
    <AuthShell
      title="Create account"
      error={error}
      footer={
        <span style={authStyles.footerText}>
          Already have an account?{" "}
          <Link to="/login" style={authStyles.link}>
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSignUp} style={authStyles.form}>
        <div style={authStyles.field}>
          <label htmlFor="signup-email" style={authStyles.label}>
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={authStyles.input}
          />
        </div>

        <div style={authStyles.field}>
          <label htmlFor="signup-password" style={authStyles.label}>
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
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
          {isSubmitting ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </AuthShell>
  );
}
