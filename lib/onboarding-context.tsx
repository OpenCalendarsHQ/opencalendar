"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

const ONBOARDING_STORAGE_KEY = "opencalendar_onboarding_completed";

interface OnboardingContextValue {
  isCompleted: boolean;
  isOpen: boolean;
  startOnboarding: () => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  closeOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isCompleted, setIsCompleted] = useState(true); // default true to avoid flash
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    setIsCompleted(stored === "true");
  }, []);

  const startOnboarding = useCallback(() => {
    setIsOpen(true);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "false");
  }, []);

  const completeOnboarding = useCallback(() => {
    setIsOpen(false);
    setIsCompleted(true);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  }, []);

  const skipOnboarding = useCallback(() => {
    setIsOpen(false);
    setIsCompleted(true);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  }, []);

  const closeOnboarding = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value: OnboardingContextValue = {
    isCompleted,
    isOpen,
    startOnboarding,
    completeOnboarding,
    skipOnboarding,
    closeOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return ctx;
}
