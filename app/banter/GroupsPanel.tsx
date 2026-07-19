"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";

type GroupsPanelProps = {
  currentUserId: string;
};

type MyGroup = {
  group_id: string;
  chat_groups: {
    id: string;
    name: string;
  } | null;
};

type PendingInvite = {
  id: string;
  group_id: string;
  chat_groups: {
    name: string;
  } | null;
  inviter_profile: {
    display_name: string | null;
  } | null;
};

export default function GroupsPanel({
  currentUserId,
}: GroupsPanelProps) {
  const supabase = createClient();

  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [pendingInvites, setPendingInvites] = useState<
    PendingInvite[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadGroups() {
    const { data: groupsData, error: groupsError } = await supabase
      .from("chat_group_members")
      .select(
        `
          group_id,
          chat_groups (
            id,
            name
          )
        `
      )
      .eq("user_id", currentUserId);

    if (groupsError) {
      console.error("Groups loading error:", groupsError);
    } else {
      setMyGroups((groupsData ?? []) as unknown as MyGroup[]);
    }

   const { data: rawInvites, error: invitesError } = await supabase
      .from("chat_group_invites")
      .select(
        `
          id,
          group_id,
          invited_by,
          chat_groups (
            name
          )
        `
      )
      .eq("invited_user_id", currentUserId)
      .eq("status", "pending");

    if (invitesError) {
      console.error("Invites loading error:", invitesError);
    } else {
      const inviterIds = Array.from(
        new Set((rawInvites ?? []).map((invite) => invite.invited_by))
      );

      let inviterProfilesById = new Map<
        string,
        { display_name: string | null }
      >();

      if (inviterIds.length > 0) {
        const { data: inviterProfiles, error: inviterProfilesError } =
          await supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", inviterIds);

        if (inviterProfilesError) {
          console.error(
            "Inviter profiles loading error:",
            inviterProfilesError
          );
        } else {
          inviterProfilesById = new Map(
            (inviterProfiles ?? []).map((profile) => [
              profile.id,
              { display_name: profile.display_name },
            ])
          );
        }
      }

      const combinedInvites = (rawInvites ?? []).map((invite) => ({
        id: invite.id,
        group_id: invite.group_id,
        chat_groups: invite.chat_groups,
        inviter_profile: inviterProfilesById.get(invite.invited_by) ?? null,
      }));

      setPendingInvites(combinedInvites as unknown as PendingInvite[]);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    loadGroups();
  }, []);

  async function handleCreateGroup(event: FormEvent) {
    event.preventDefault();

    const trimmedName = newGroupName.trim();

    if (!trimmedName || isCreating) {
      return;
    }

    setIsCreating(true);
    setErrorMessage("");

    const { data: newGroup, error: createError } = await supabase
      .from("chat_groups")
      .insert({
        name: trimmedName,
        created_by: currentUserId,
      })
      .select("id")
      .single();

    if (createError || !newGroup) {
      setErrorMessage(
        createError?.message ?? "Could not create the group."
      );
      setIsCreating(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("chat_group_members")
      .insert({
        group_id: newGroup.id,
        user_id: currentUserId,
        role: "owner",
      });

    if (memberError) {
      setErrorMessage(memberError.message);
      setIsCreating(false);
      return;
    }

    setNewGroupName("");
    setIsCreating(false);
    await loadGroups();
  }

  async function respondToInvite(
    invite: PendingInvite,
    accept: boolean
  ) {
    const { error: updateError } = await supabase
      .from("chat_group_invites")
      .update({ status: accept ? "accepted" : "declined" })
      .eq("id", invite.id);

    if (updateError) {
      setErrorMessage(updateError.message);
      return;
    }

    if (accept) {
      const { error: memberError } = await supabase
        .from("chat_group_members")
        .insert({
          group_id: invite.group_id,
          user_id: currentUserId,
          role: "member",
        });

      if (memberError) {
        setErrorMessage(memberError.message);
        return;
      }
    }

    await loadGroups();
  }

  if (isLoading) {
    return (
      <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center text-zinc-500">
        Loading Groups…
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {errorMessage && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
          {errorMessage}
        </div>
      )}

      {pendingInvites.length > 0 && (
        <section className="rounded-3xl border border-orange-500/30 bg-orange-500/10 p-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
            Pending Invites
          </p>

          <div className="mt-4 space-y-3">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-zinc-800 bg-black p-4 sm:flex-row sm:items-center"
              >
                <p className="text-sm">
                  <span className="font-black">
                    {invite.inviter_profile?.display_name ?? "Someone"}
                  </span>{" "}
                  invited you to{" "}
                  <span className="font-black text-orange-400">
                    {invite.chat_groups?.name ?? "a group"}
                  </span>
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => respondToInvite(invite, true)}
                    className="rounded-full bg-orange-500 px-4 py-2 text-xs font-black text-black transition hover:bg-orange-400"
                  >
                    Accept
                  </button>

                  <button
                    type="button"
                    onClick={() => respondToInvite(invite, false)}
                    className="rounded-full border border-zinc-700 px-4 py-2 text-xs font-black text-zinc-400 transition hover:border-zinc-500"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
          Create a Group
        </p>

        <form
          onSubmit={handleCreateGroup}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
            maxLength={60}
            placeholder="e.g. Mates Group Chat"
            className="flex-1 rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500"
          />

          <button
            type="submit"
            disabled={isCreating || !newGroupName.trim()}
            className="rounded-full bg-orange-500 px-6 py-3 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isCreating ? "Creating…" : "Create Group"}
          </button>
        </form>
      </section>

      <section>
        <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
          Your Groups
        </p>

        {myGroups.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center">
            <p className="text-zinc-400">
              You&apos;re not in any private groups yet. Create one
              above, or wait for an invite.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {myGroups.map((membership) => {
              const group = membership.chat_groups;

              if (!group) {
                return null;
              }

              return (
                <Link
                  key={membership.group_id}
                  href={`/banter/groups/${group.id}`}
                  className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-orange-500/50"
                >
                  <p className="font-black">{group.name}</p>
                  <span className="text-zinc-600">→</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}