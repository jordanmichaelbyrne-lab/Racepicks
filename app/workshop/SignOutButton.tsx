"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSignOut() {
    setIsSigningOut(true);
    setErrorMessage("");

    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(error.message);
      setIsSigningOut(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="mt-7">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="w-full rounded-full bg-orange-500 px-6 py-3 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSigningOut ? "Signing Out..." : "Sign Out"}
      </button>

      {errorMessage && (
        <p className="mt-3 text-center text-sm font-bold text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
}