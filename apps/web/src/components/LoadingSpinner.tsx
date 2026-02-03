type LoadingSpinnerProps = {
  label?: string;
  size?: number;
};

export function LoadingSpinner({ label = "Loading…", size = 20 }: LoadingSpinnerProps) {
  return (
    <div className="loading-spinner" aria-live="polite">
      <span
        className="loading-spinner__icon"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}
