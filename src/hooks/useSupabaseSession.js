import { useState, useEffect } from "react";
import * as Sentry from "@sentry/react";
import { supabase, isSupabaseConfigured } from "../supabaseClient.js";

export function useSupabaseSession() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setReady(true);
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const s = data?.session || null;
      setSession(s);
      setReady(true);
      Sentry.setUser(s?.user?.id ? { id: s.user.id } : null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s || null);
      Sentry.setUser(s?.user?.id ? { id: s.user.id } : null);
    });
    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  return { session, ready };
}
