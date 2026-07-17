"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

type ProfileFormProps = {
  userId: string;
  initialDisplayName: string;
  initialFirstName: string;
  initialLastName: string;
  email: string;
};

export default function ProfileForm({
  userId,
  initialDisplayName,
  initialFirstName,
  initialLastName,
  email,
}: ProfileFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleCancel() {
    setDisplayName(initialDisplayName);
    setFirstName(initialFirstName);
    setLastName(initialLastName);

    setIsEditing(false);
    setSuccessMessage("");
    setErrorMessage("");
  }

  async function handleSave() {
    const cleanedDisplayName = displayName.trim();
    const cleanedFirstName = firstName.trim();
    const cleanedLastName = lastName.trim();

    if (!cleanedDisplayName) {
      setErrorMessage("Please enter a display name.");
      setSuccessMessage("");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name: cleanedDisplayName,
        first_name: cleanedFirstName || null,
        last_name: cleanedLastName || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      setErrorMessage(profileError.message);
      setIsSaving(false);
      return;
    }

    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        display_name: cleanedDisplayName,
        first_name: cleanedFirstName,
        last_name: cleanedLastName,
      },
    });

    if (metadataError) {
      setErrorMessage(metadataError.message);
      setIsSaving(false);
      return;
    }

    setDisplayName(cleanedDisplayName);
    setFirstName(cleanedFirstName);
    setLastName(cleanedLastName);

    setSuccessMessage("Profile updated.");
    setIsEditing(false);
    setIsSaving(false);

    router.refresh();
  }

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7 sm:p-8">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
            Profile
          </p>

          <h2 className="mt-3 text-3xl font-black">
            Account Details
          </h2>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-2xl">
          👤
        </div>
      </div>

      <div className="mt-7 space-y-5">
        <div>
          <label
            htmlFor="display-name"
            className="text-xs font-bold uppercase tracking-widest text-zinc-500"
          >
            Display Name
          </label>

          {isEditing ? (
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={40}
              autoComplete="nickname"
              className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-5 py-4 text-lg font-black text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-500"
              placeholder="Your public Racepicks name"
            />
          ) : (
            <div className="mt-2 rounded-2xl border border-zinc-800 bg-black p-5">
              <p className="break-words text-lg font-black">
                {displayName}
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="first-name"
              className="text-xs font-bold uppercase tracking-widest text-zinc-500"
            >
              First Name
            </label>

            {isEditing ? (
              <input
                id="first-name"
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                maxLength={50}
                autoComplete="given-name"
                className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-5 py-4 text-lg font-black text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-500"
                placeholder="First name"
              />
            ) : (
              <div className="mt-2 rounded-2xl border border-zinc-800 bg-black p-5">
                <p className="break-words text-lg font-black">
                  {firstName || "Not added yet"}
                </p>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="last-name"
              className="text-xs font-bold uppercase tracking-widest text-zinc-500"
            >
              Last Name
            </label>

            {isEditing ? (
              <input
                id="last-name"
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                maxLength={50}
                autoComplete="family-name"
                className="mt-2 w-full rounded-2xl border border-zinc-700 bg-black px-5 py-4 text-lg font-black text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-500"
                placeholder="Last name"
              />
            ) : (
              <div className="mt-2 rounded-2xl border border-zinc-800 bg-black p-5">
                <p className="break-words text-lg font-black">
                  {lastName || "Not added yet"}
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Email Address
          </p>

          <div className="mt-2 rounded-2xl border border-zinc-800 bg-black p-5">
            <p className="break-all text-lg font-black">
              {email}
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Email address changes will be added separately.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-300">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mt-5 rounded-2xl border border-green-500/30 bg-green-500/10 px-5 py-4 text-sm font-bold text-green-300">
          {successMessage}
        </div>
      )}

      {isEditing ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="rounded-full border border-zinc-700 px-6 py-3 font-black text-white transition hover:border-zinc-500 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-full bg-orange-500 px-6 py-3 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsEditing(true);
            setSuccessMessage("");
            setErrorMessage("");
          }}
          className="mt-6 w-full rounded-full border border-zinc-700 px-6 py-3 font-black transition hover:border-orange-500 hover:bg-orange-500 hover:text-black"
        >
          Edit Profile
        </button>
      )}
    </section>
  );
}