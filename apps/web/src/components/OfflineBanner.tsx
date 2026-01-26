import { useOnlineStatus } from "../hooks/useOnlineStatus";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      style={{
        background: "#fef3c7",
        color: "#92400e",
        padding: "8px 12px",
        borderRadius: 8,
        marginBottom: 12
      }}
    >
      You&apos;re offline. Changes will sync when the connection returns.
    </div>
  );
}
