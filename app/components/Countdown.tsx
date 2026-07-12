"use client";

import { useEffect, useState } from "react";

type CountdownProps = {
  targetDate: string;
};

export default function Countdown({ targetDate }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  });

  useEffect(() => {
    function updateCountdown() {
      const now = Date.now();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          expired: true,
        });

        return false;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        expired: false,
      });

      return true;
    }

    updateCountdown();

    const timer = window.setInterval(() => {
      const shouldContinue = updateCountdown();

      if (!shouldContinue) {
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.expired) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-center">
        <p className="text-xl font-black uppercase tracking-widest text-red-400 sm:text-2xl">
          Picks Closed
        </p>
      </div>
    );
  }

  const countdownItems = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {countdownItems.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-white/10 bg-black/35 px-3 py-4 text-center backdrop-blur sm:px-4 sm:py-5"
        >
          <p className="text-3xl font-black tabular-nums sm:text-4xl lg:text-5xl">
            {String(item.value).padStart(2, "0")}
          </p>

          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 sm:text-xs">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}