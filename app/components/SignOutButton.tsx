"use client";

import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-bold text-white transition hover:bg-zinc-900"
    >
      Sign Out
    </button>
  );
}