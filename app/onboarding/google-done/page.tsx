"use client";

import { useEffect } from "react";

export default function OnboardingGoogleDonePage() {
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: "google-calendar-connected" }, "*");
      window.close();
    } else {
      window.location.href = "/dashboard";
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="text-center text-zinc-400">
        <p>Kalender gekoppeld! Dit venster sluit automatisch...</p>
      </div>
    </div>
  );
}
