"use client";

import { UserButton } from "@neondatabase/auth/react";
import { useEffect, useState } from "react";

export function UserButtonWrapper({ size }: { size?: "icon" | "sm" | "lg" }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a placeholder during SSR to avoid hydration mismatch
    return (
      <button className="h-10 w-10 rounded-full bg-muted" aria-label="User menu" />
    );
  }

  return <UserButton size={size} />;
}
