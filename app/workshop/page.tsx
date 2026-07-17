import Link from "next/link";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";
import { createClient } from "../lib/supabase/server";
import PasswordForm from "./PasswordForm";
import ProfileForm from "./ProfileForm";
import SignOutButton from "./SignOutButton";

type Profile = {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string | null;
};

function formatJoinedDate(date: string | null) {
  if (!date) {
    return "Racepicks Member";
  }

  return `Joined ${new Intl.DateTimeFormat("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "Australia/Brisbane",
  }).format(new Date(date))}`;
}

function getMetadataString(
  metadata: Record<string, unknown>,
  key: string
) {
  const value = metadata[key];

  return typeof value === "string" ? value.trim() : "";
}

export default async function WorkshopPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
        display_name,
        first_name,
        last_name,
        avatar_url,
        role,
        created_at
      `
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const typedProfile = profile as Profile | null;
  const metadata = user.user_metadata as Record<string, unknown>;

  const displayName: string =
    typedProfile?.display_name?.trim() ||
    getMetadataString(metadata, "display_name") ||
    user.email?.split("@")[0] ||
    "Racepicks Player";

  const firstName: string =
    typedProfile?.first_name?.trim() ||
    getMetadataString(metadata, "first_name");

  const lastName: string =
    typedProfile?.last_name?.trim() ||
    getMetadataString(metadata, "last_name");

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((name: string) => name.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const memberLabel =
    typedProfile?.role === "admin"
      ? "Racepicks Administrator"
      : "Racepicks Member";

  const joinedLabel = formatJoinedDate(
    typedProfile?.created_at ?? user.created_at ?? null
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Navbar />

        <section className="py-12 sm:py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-500">
              Account Setup
            </p>

            <h1 className="mt-4 text-5xl font-black tracking-tight sm:text-6xl md:text-7xl">
              Workshop
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
              Manage your Racepicks profile, account security and
              membership settings.
            </p>
          </div>

          <section className="mt-10 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
            <div className="relative overflow-hidden p-7 sm:p-10">
              <div className="absolute inset-x-0 top-0 h-1 bg-orange-500" />

              <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
                {typedProfile?.avatar_url ? (
                  <img
                    src={typedProfile.avatar_url}
                    alt={`${displayName} profile`}
                    className="h-28 w-28 rounded-full border-4 border-orange-500 object-cover shadow-2xl shadow-orange-500/10"
                  />
                ) : (
                  <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-4 border-orange-500 bg-orange-500 text-4xl font-black text-black shadow-2xl shadow-orange-500/10">
                    {initials || "RP"}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                    Rider Card
                  </p>

                  <h2 className="mt-3 break-words text-4xl font-black tracking-tight sm:text-5xl">
                    {displayName}
                  </h2>

                  <p className="mt-3 font-bold text-zinc-300">
                    {memberLabel}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {joinedLabel}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <ProfileForm
              userId={user.id}
              initialDisplayName={displayName}
              initialFirstName={firstName}
              initialLastName={lastName}
              email={user.email ?? "No email address"}
            />

            <PasswordForm />

            <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                    Racepicks
                  </p>

                  <h2 className="mt-3 text-3xl font-black">
                    Membership
                  </h2>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-2xl">
                  🏁
                </div>
              </div>

              <div className="mt-7 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-6">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
                  Current Plan
                </p>

                <p className="mt-3 text-3xl font-black">
                  Racepicks Member
                </p>

                <p className="mt-3 leading-7 text-zinc-400">
                  Membership options and competition entry features
                  will appear here in a future update.
                </p>
              </div>

              <button
                type="button"
                disabled
                className="mt-6 w-full cursor-not-allowed rounded-full border border-zinc-700 px-6 py-3 font-black text-zinc-500"
              >
                Membership Options — Coming Soon
              </button>
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7 sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                    Session
                  </p>

                  <h2 className="mt-3 text-3xl font-black">
                    Account Access
                  </h2>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-2xl">
                  🚪
                </div>
              </div>

              <p className="mt-5 leading-7 text-zinc-400">
                Sign out of Racepicks on this device. Your picks and
                account information will remain safely stored.
              </p>

              <SignOutButton />
            </section>
          </div>

          <section className="mt-8 rounded-3xl border border-red-500/30 bg-red-500/5 p-7 sm:p-8">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-red-400">
                  Danger Zone
                </p>

                <h2 className="mt-3 text-3xl font-black">
                  Delete Account
                </h2>

                <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
                  Account deletion will permanently remove your
                  Racepicks profile. A secure confirmation will be
                  required before deletion.
                </p>
              </div>

              <button
                type="button"
                disabled
                className="shrink-0 cursor-not-allowed rounded-full border border-red-500/30 px-6 py-3 font-black text-red-400/50"
              >
                Delete Account
              </button>
            </div>
          </section>

          <div className="mt-8 text-center">
            <Link
              href="/account"
              className="inline-flex items-center gap-2 font-black text-zinc-400 transition hover:text-orange-500"
            >
              <span>←</span>
              <span>Back to Player Dashboard</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}