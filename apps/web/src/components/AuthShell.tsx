import type { ReactNode } from "react";

const baseInput: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid #d0d7de",
};

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  error?: string | null;
  status?: string | null;
  footer?: ReactNode;
};

export function AuthShell({
  title,
  subtitle,
  children,
  error,
  status,
  footer,
}: AuthShellProps) {
  return (
    <div style={authStyles.container}>
      <h1 style={authStyles.title}>{title}</h1>
      {subtitle ? <p style={authStyles.subtitle}>{subtitle}</p> : null}

      {children}

      {error ? (
        <p role="alert" style={authStyles.error}>
          {error}
        </p>
      ) : null}

      {status ? <p style={authStyles.status}>{status}</p> : null}

      {footer ? <div style={authStyles.footer}>{footer}</div> : null}
    </div>
  );
}

export const authStyles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 420,
  },
  title: {
    margin: "0 0 8px",
  },
  subtitle: {
    margin: "0 0 20px",
    color: "#57606a",
  },
  form: {
    display: "grid",
    gap: 12,
  },
  field: {
    display: "grid",
    gap: 6,
  },
  label: {
    fontWeight: 600,
  },
  input: baseInput,
  button: {
    padding: "10px 12px",
    borderRadius: 6,
    border: "1px solid transparent",
    cursor: "pointer",
  },
  primaryButton: {
    backgroundColor: "#1f6feb",
    color: "#ffffff",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    color: "#1f6feb",
    borderColor: "#1f6feb",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  error: {
    color: "crimson",
    marginTop: 12,
  },
  status: {
    marginTop: 12,
  },
  footer: {
    marginTop: 12,
  },
  footerText: {
    color: "#57606a",
  },
  link: {
    color: "#1f6feb",
  },
};
