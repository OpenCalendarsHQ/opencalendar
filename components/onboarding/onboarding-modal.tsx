"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/lib/onboarding-context";
import { useCalendar } from "@/lib/calendar-context";
import { Calendar, Link2, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const OAUTH_RETURN_COOKIE = "opencalendar_oauth_return";
const OAUTH_RETURN_PATH = "/onboarding/google-done";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

type Step = 1 | 2 | 3;

export function OnboardingModal() {
  const t = useTranslations("Onboarding");
  const { isOpen, completeOnboarding, skipOnboarding } = useOnboarding();
  const { calendarGroups, refreshCalendars } = useCalendar();
  const [step, setStep] = useState<Step>(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasGoogle, setHasGoogle] = useState(false);

  const nonLocalGroups = calendarGroups.filter((g) => g.provider !== "local");
  const hasGoogleAccount = nonLocalGroups.some((g) => g.provider === "google");

  useEffect(() => {
    setHasGoogle(hasGoogleAccount);
  }, [hasGoogleAccount]);

  const handleConnectGoogle = useCallback(() => {
    setIsConnecting(true);
    document.cookie = `${OAUTH_RETURN_COOKIE}=${OAUTH_RETURN_PATH}; path=/; max-age=600; SameSite=Lax`;
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      "/api/sync/google?action=connect",
      "google-oauth",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        setIsConnecting(false);
        refreshCalendars();
      }
    }, 300);
  }, [refreshCalendars]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "google-calendar-connected") {
        setIsConnecting(false);
        setHasGoogle(true);
        refreshCalendars();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [refreshCalendars]);

  const handleNext = () => {
    if (step < 3) setStep((s) => (s + 1) as Step);
    else completeOnboarding();
  };

  const handleSkip = () => {
    skipOnboarding();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Step indicators */}
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  step >= s ? "w-8 bg-blue-500" : "w-1.5 bg-zinc-700"
                )}
              />
            ))}
          </div>

          {step === 1 && (
            <>
              <div className="rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-4 border border-blue-500/20">
                <Calendar className="h-14 w-14 text-blue-400" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white">
                  {t("welcomeTitle")}
                </DialogTitle>
              </DialogHeader>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {t("welcomeDesc")}
              </p>
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={handleSkip}
                >
                  {t("skip")}
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleNext}
                >
                  {t("getStarted")}
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 p-4 border border-emerald-500/20">
                <Link2 className="h-14 w-14 text-emerald-400" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white">
                  {t("connectTitle")}
                </DialogTitle>
              </DialogHeader>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {t("connectDesc")}
              </p>
              {hasGoogle ? (
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-3 rounded-lg w-full">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">
                    {t("connectedGoogle")}
                  </span>
                </div>
              ) : (
                <Button
                  onClick={handleConnectGoogle}
                  disabled={isConnecting}
                  className="w-full bg-white text-neutral-900 hover:bg-neutral-100 font-medium py-3 flex items-center justify-center gap-3"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {t("connecting")}
                    </>
                  ) : (
                    <>
                      <GoogleIcon className="h-5 w-5" />
                      {t("connectGoogle")}
                    </>
                  )}
                </Button>
              )}
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={handleSkip}
                >
                  {t("skip")}
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleNext}
                >
                  {t("continue")}
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 p-4 border border-violet-500/20">
                <CheckCircle2 className="h-14 w-14 text-violet-400" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white">
                  {t("doneTitle")}
                </DialogTitle>
              </DialogHeader>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {t("doneDesc")}
              </p>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={handleNext}
              >
                {t("goToCalendar")}
              </Button>
            </>
          )}

          {/* Restart hint - only show when not on last step */}
          {step < 3 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-zinc-500 hover:text-zinc-400 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              {t("restartHint")}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
