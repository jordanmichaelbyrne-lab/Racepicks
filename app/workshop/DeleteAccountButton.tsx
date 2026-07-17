"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function DeleteAccountButton() {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const confirmationIsValid =
    confirmationText.trim().toUpperCase() === "DELETE";

  function closeConfirmation() {
    if (isDeleting) {
      return;
    }

    setIsOpen(false);
    setConfirmationText("");
    setErrorMessage("");
  }

  async function handleDeleteAccount() {
    if (!confirmationIsValid || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        setErrorMessage(
          result.error ??
            "We could not delete your account. Please try again."
        );
        setIsDeleting(false);
        return;
      }

      const supabase = createClient();

      await supabase.auth.signOut();

      router.replace("/");
      router.refresh();
    } catch {
      setErrorMessage(
        "We could not delete your account. Please check your connection and try again."
      );
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setErrorMessage("");
        }}
        className="shrink-0 rounded-full border border-red-500/50 px-6 py-3 font-black text-red-400 transition hover:bg-red-500 hover:text-white"
      >
        Delete Account
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="w-full max-w-lg rounded-3xl border border-red-500/40 bg-zinc-950 p-7 shadow-2xl sm:p-9">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-red-400">
                  Permanent Action
                </p>

                <h2
                  id="delete-account-title"
                  className="mt-3 text-3xl font-black"
                >
                  Delete your account?
                </h2>
              </div>

              <button
                type="button"
                onClick={closeConfirmation}
                disabled={isDeleting}
                aria-label="Close delete account confirmation"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-xl text-zinc-400 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
              <p className="font-bold text-red-300">
                This cannot be undone.
              </p>

              <p className="mt-2 leading-7 text-zinc-400">
                Your Racepicks login and profile will be permanently
                deleted. You will no longer be able to access this
                account.
              </p>
            </div>

            <div className="mt-6">
              <label
                htmlFor="delete-confirmation"
                className="text-xs font-black uppercase tracking-widest text-zinc-500"
              >
                Type DELETE to confirm
              </label>

              <input
                id="delete-confirmation"
                type="text"
                value={confirmationText}
                onChange={(event) =>
                  setConfirmationText(event.target.value)
                }
                disabled={isDeleting}
                autoComplete="off"
                spellCheck={false}
                placeholder="DELETE"
                className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-5 py-4 font-black uppercase text-white outline-none transition placeholder:text-zinc-700 focus:border-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {errorMessage && (
              <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-300">
                {errorMessage}
              </div>
            )}

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={closeConfirmation}
                disabled={isDeleting}
                className="rounded-full border border-zinc-700 px-6 py-3 font-black transition hover:border-zinc-500 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={!confirmationIsValid || isDeleting}
                className="rounded-full bg-red-500 px-6 py-3 font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {isDeleting
                  ? "Deleting Account..."
                  : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}