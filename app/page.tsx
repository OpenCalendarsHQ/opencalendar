"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // User is logged in, redirect to dashboard
        router.replace("/dashboard");
      } else {
        // User is not logged in, redirect to welcome page
        router.replace("/welcome");
      }
    };

    checkAuth();
  }, [router]);

  // Show loading while checking auth
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <Loader2 className="h-8 w-8 animate-spin text-white" />
    </div>
  );
}
