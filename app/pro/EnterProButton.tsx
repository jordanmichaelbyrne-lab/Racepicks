"use client";

import { useFormStatus } from "react-dom";

export default function EnterProButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-orange-500 px-8 py-4 text-lg font-black uppercase text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {pending ? "Entering…" : label}
    </button>
  );
}