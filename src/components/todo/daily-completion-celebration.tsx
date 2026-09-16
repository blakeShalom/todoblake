"use client";

import { useEffect } from "react";
import { Check, PartyPopper, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONFETTI = [
  ["#f97316", "8%", "6%", "-18deg", "0ms"],
  ["#facc15", "17%", "18%", "14deg", "120ms"],
  ["#22c55e", "28%", "9%", "-32deg", "240ms"],
  ["#38bdf8", "39%", "21%", "27deg", "80ms"],
  ["#fb7185", "51%", "7%", "-8deg", "320ms"],
  ["#a78bfa", "63%", "17%", "35deg", "160ms"],
  ["#f97316", "74%", "8%", "-24deg", "400ms"],
  ["#facc15", "86%", "20%", "12deg", "200ms"],
  ["#22c55e", "93%", "10%", "-40deg", "280ms"],
  ["#38bdf8", "5%", "42%", "22deg", "360ms"],
  ["#fb7185", "15%", "56%", "-12deg", "40ms"],
  ["#a78bfa", "86%", "49%", "31deg", "100ms"],
  ["#f97316", "96%", "61%", "-20deg", "300ms"],
  ["#facc15", "7%", "78%", "15deg", "180ms"],
  ["#22c55e", "93%", "82%", "-28deg", "260ms"],
] as const;

interface DailyCompletionCelebrationProps {
  open: boolean;
  onClose: () => void;
}

export function DailyCompletionCelebration({
  open,
  onClose,
}: DailyCompletionCelebrationProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="completion-celebration fixed inset-0 z-50 flex items-center justify-center overflow-hidden px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-celebration-title"
    >
      <button
        type="button"
        aria-label="Close celebration"
        className="absolute inset-0 cursor-default bg-slate-950/50 backdrop-blur-[3px]"
        onClick={onClose}
      />

      <div className="completion-celebration__glow" aria-hidden="true" />
      <div className="completion-celebration__confetti" aria-hidden="true">
        {CONFETTI.map(([color, left, top, rotate, delay], index) => (
          <span
            key={`${color}-${index}`}
            className="completion-celebration__piece"
            style={{
              backgroundColor: color,
              left,
              top,
              transform: `rotate(${rotate})`,
              animationDelay: delay,
            }}
          />
        ))}
      </div>

      <div className="completion-celebration__card relative z-[2] w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/60 bg-white px-7 pb-7 pt-8 text-center shadow-2xl dark:border-white/10 dark:bg-slate-900">
        <div className="completion-celebration__medal mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 text-white shadow-lg shadow-orange-300/40">
          <Trophy className="h-10 w-10" strokeWidth={2.2} />
        </div>

        <div className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-orange-500">
          <Sparkles className="h-4 w-4" />
          Day complete
          <Sparkles className="h-4 w-4" />
        </div>
        <h2 id="completion-celebration-title" className="text-3xl font-bold tracking-tight">
          You did the 1-2-3!
        </h2>
        <p className="mx-auto mt-3 max-w-[16rem] text-sm leading-6 text-muted-foreground">
          The whole day is checked off. Take the win — you made space for what matters.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-medium text-orange-900 dark:bg-orange-950/40 dark:text-orange-100">
          <Check className="h-4 w-4" strokeWidth={3} />
          Essential, priorities, outcomes, and routines complete
        </div>

        <Button
          type="button"
          className="mt-6 w-full rounded-xl bg-slate-950 py-5 text-white shadow-lg shadow-slate-900/15 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          onClick={onClose}
        >
          <PartyPopper className="mr-2 h-4 w-4" />
          Keep the momentum
        </Button>
      </div>
    </div>
  );
}
