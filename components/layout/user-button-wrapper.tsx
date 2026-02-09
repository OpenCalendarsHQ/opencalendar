"use client";

import { UserButton } from "@neondatabase/auth/react";
import { useSyncExternalStore } from "react";

// Client-side only check using useSyncExternalStore
const useIsClient = () => {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
};

export function UserButtonWrapper({ size }: { size?: "icon" | "sm" | "lg" }) {
  const isClient = useIsClient();

  if (!isClient) {
    // Render a placeholder during SSR to avoid hydration mismatch
    return (
      <button className="h-10 w-10 rounded-full bg-muted" aria-label="User menu" />
    );
  }

  return <UserButton size={size} />;
}
