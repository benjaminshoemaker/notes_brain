import { useEffect, useState } from "react";

import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "../lib/supabaseClient";

type AuthState = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
};

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isActive) return;
        setSession(data.session ?? null);
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isActive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, isLoading };
}

