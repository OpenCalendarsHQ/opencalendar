"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // Check for updates periodically
          setInterval(() => registration.update(), 60 * 60 * 1000); // hourly
        })
        .catch((err) => {
          console.error("SW registration failed:", err);
        });
    }
  }, []);

  return null;
}
