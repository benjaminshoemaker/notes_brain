import type { ReactNode } from "react";

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
    <main className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">{title}</h1>
        {subtitle ? <p className="muted" style={authStyles.subtitle}>{subtitle}</p> : null}

        {children}

        {error ? (
          <p role="alert" className="alert alert-error" style={authStyles.message}>
            {error}
          </p>
        ) : null}

        {status ? <p className="alert alert-success" style={authStyles.message}>{status}</p> : null}

        {footer ? <div style={authStyles.footer}>{footer}</div> : null}
      </div>
    </main>
  );
}

export const authStyles: Record<string, React.CSSProperties> = {
  subtitle: {
    margin: "6px 0 20px",
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
  input: {},
  message: {
    marginTop: 12,
  },
  footer: {
    marginTop: 12,
  },
  footerText: {
    color: "var(--color-text-secondary)",
  },
  link: {
    color: "var(--color-accent)",
  },
};
