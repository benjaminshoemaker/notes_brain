import type { ReactNode } from "react";

import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

export function AuthGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <p>Loading…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

