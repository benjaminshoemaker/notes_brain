type ToastVariant = "error" | "info";

type ToastAction = {
  label: string;
  onClick: () => void;
};

type ToastProps = {
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
  onDismiss: () => void;
};

export function Toast({ message, variant, action, onDismiss }: ToastProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #ddd",
        background: variant === "error" ? "#fff0f0" : "white",
        color: variant === "error" ? "#8a0000" : "inherit",
        maxWidth: 320,
        display: "grid",
        gap: 8
      }}
    >
      <div>{message}</div>
      {action ? (
        <div>
          <button
            type="button"
            onClick={() => {
              action.onClick();
              onDismiss();
            }}
            style={{
              border: "1px solid #ccc",
              background: "transparent",
              padding: "4px 8px",
              borderRadius: 6
            }}
          >
            {action.label}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export type { ToastVariant, ToastAction };
