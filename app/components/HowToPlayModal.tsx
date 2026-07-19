"use client";

import { useState } from "react";
import HowToPlayContent from "./HowToPlayContent";
import { markHowToPlaySeen } from "../lib/preferences";

type HowToPlayModalProps = {
  initiallyOpen: boolean;
};

export default function HowToPlayModal({
  initiallyOpen,
}: HowToPlayModalProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [isDismissing, setIsDismissing] = useState(false);

  async function handleDismiss() {
    setIsDismissing(true);
    await markHowToPlaySeen();
    setIsOpen(false);
    setIsDismissing(false);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-orange-500">
          Welcome to Racepicks
        </p>

        <h1 className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-4xl">
          How to Play
        </h1>

        <div className="mt-6">
          <HowToPlayContent />
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          disabled={isDismissing}
          className="mt-8 w-full rounded-full bg-orange-500 px-6 py-4 text-lg font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDismissing ? "Saving..." : "Got it, don't show again"}
        </button>
      </div>
    </div>
  );
}