"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

export default function PasswordForm() {
  const supabase = useMemo(() => createClient(), []);

  const [isEditing, setIsEditing] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function resetForm() {
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswords(false);
    setErrorMessage("");
  }

  function handleCancel() {
    resetForm();
    setSuccessMessage("");
    setIsEditing(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (newPassword.length < 8) {
      setErrorMessage("Your new password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("The passwords do not match.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSaving(false);
      return;
    }

    resetForm();
    setSuccessMessage("Your password has been updated.");
    setIsSaving(false);
    setIsEditing(false);
  }

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7 sm:p-8">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
            Protection
          </p>

          <h2 className="mt-3 text-3xl font-black">Security</h2>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-2xl">
          🔒
        </div>
      </div>

      <p className="mt-5 leading-7 text-zinc-400">
        Keep your Racepicks account secure by using a strong, unique
        password.
      </p>

      {!isEditing ? (
        <>
          <div className="mt-7 rounded-2xl border border-zinc-800 bg-black p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Password
            </p>

            <p className="mt-2 text-lg font-black tracking-[0.25em]">
              ••••••••••••
            </p>
          </div>

          {successMessage && (
            <div className="mt-5 rounded-2xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-sm font-bold text-green-300">
              {successMessage}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setIsEditing(true);
              setSuccessMessage("");
              setErrorMessage("");
            }}
            className="mt-6 w-full rounded-full border border-zinc-700 px-6 py-3 font-black transition hover:border-orange-500 hover:bg-orange-500 hover:text-black"
          >
            Change Password
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="mt-7">
          <div>
            <label
              htmlFor="new-password"
              className="text-xs font-bold uppercase tracking-widest text-zinc-500"
            >
              New Password
            </label>

            <input
              id="new-password"
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              placeholder="Enter a new password"
              className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-5 py-4 font-bold text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-500"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="confirm-password"
              className="text-xs font-bold uppercase tracking-widest text-zinc-500"
            >
              Confirm New Password
            </label>

            <input
              id="confirm-password"
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              placeholder="Enter the new password again"
              className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-5 py-4 font-bold text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-500"
            />
          </div>

          <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm font-bold text-zinc-400">
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(event) => setShowPasswords(event.target.checked)}
              className="h-4 w-4 accent-orange-500"
            />

            Show passwords
          </label>

          <p className="mt-4 text-sm leading-6 text-zinc-500">
            Your password must contain at least 8 characters.
          </p>

          {errorMessage && (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-300">
              {errorMessage}
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="rounded-full border border-zinc-700 px-6 py-3 font-black transition hover:border-zinc-500 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-orange-500 px-6 py-3 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}