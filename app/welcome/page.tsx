import type { Metadata } from "next";
import WelcomeClientPage from "./client-page";

export const metadata: Metadata = {
  title: "Welkom bij OpenCalendars",
  description: "OpenCalendars brengt al je Google Calendar en iCloud events samen. Gratis, open source kalender app met desktop ondersteuning.",
  openGraph: {
    title: "Welkom bij OpenCalendars",
    description: "OpenCalendars brengt al je Google Calendar en iCloud events samen. Gratis, open source kalender app met desktop ondersteuning.",
    type: "website",
    url: "https://opencalendars.app/welcome",
  },
  alternates: {
    canonical: "/welcome",
  },
};

export default function WelcomePage() {
  return <WelcomeClientPage />;
}
