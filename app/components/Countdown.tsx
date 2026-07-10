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
    const timer = setInterval(() => {
      const now = new Date().getTime();
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

        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        expired: false,
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.expired) {
    return (
      <p className="text-2xl font-black text-red-500">
        PICKS CLOSED
      </p>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4">

      <div>
        <p className="text-5xl font-black">{timeLeft.days}</p>
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          Days
        </p>
      </div>

      <div>
        <p className="text-5xl font-black">{timeLeft.hours}</p>
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          Hours
        </p>
      </div>

      <div>
        <p className="text-5xl font-black">{timeLeft.minutes}</p>
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          Minutes
        </p>
      </div>

      <div>
        <p className="text-5xl font-black">{timeLeft.seconds}</p>
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          Seconds
        </p>
      </div>

    </div>
  );
}