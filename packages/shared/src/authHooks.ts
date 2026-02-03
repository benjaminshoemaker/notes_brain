import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import type { Database } from "./supabase.js";

type UseEffect = (effect: () => void | (() => void), deps: unknown[]) => void;
type UseState = <T>(initial: T) => [T, (value: T) => void];

type AuthState = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
};

export function createUseAuth(
  supabase: SupabaseClient<Database>,
  hooks: { useEffect: UseEffect; useState: UseState }
) {
  const { useEffect, useState } = hooks;

  return function useAuth(): AuthState {
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
  };
}
