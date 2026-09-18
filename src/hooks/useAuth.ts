import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { getMyEditorAccess } from "@/lib/igdb.functions";

/** Current browser session, kept in sync with Supabase auth events. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

/** Editor/admin role, resolved server-side. UI state only — never the boundary. */
export function useEditorAccess(enabled: boolean) {
  return useQuery({
    queryKey: ["editorAccess", enabled],
    queryFn: () => getMyEditorAccess(),
    enabled,
    staleTime: 60 * 1000,
  });
}
