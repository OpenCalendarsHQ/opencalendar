import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "OpenCalendars - Al je kalenders op één plek",
  description: "OpenCalendars brengt al je Google Calendar en iCloud events samen in één overzichtelijke kalender. Gratis, open source en met desktop app.",
  alternates: {
    canonical: "/",
  },
};

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/welcome");
  }
}
