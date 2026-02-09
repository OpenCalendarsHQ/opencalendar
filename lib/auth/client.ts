import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

export function useSupabase() {
  return createClient();
}

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [isPending, setIsPending] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsPending(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsPending(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return {
    data: user,
    isPending,
  };
}
