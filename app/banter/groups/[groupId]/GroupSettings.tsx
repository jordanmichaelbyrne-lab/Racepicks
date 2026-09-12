"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  renameGroup,
  removeMember,
  leaveGroup,
  deleteGroup,
} from "./actions";

type Member = {
  user_id: string;
  role: string;
  display_name: string;
};

type GroupSettingsProps = {
  groupId: string;
  groupName: string;
  currentUserId: string;
  isOwner: boolean;
  members: Member[];
};

export default function GroupSettings({
  groupId,
  groupName,
  currentUserId,
  isOwner,
  members,
}: GroupSettingsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [nameInput, setNameInput] = useState(groupName);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  function runAction(action: () => Promise<void>) {
    setErrorMessage("");
    startTransition(async () => {
      try {
        await action();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong."
        );
      }
    });
  }

  function handleRename() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === groupName) return;

    const formData = new FormData();
    formData.set("group_id", groupId);
    formData.set("name", trimmed);

    runAction(async () => {
      await renameGroup(formData);
      router.refresh();
    });
  }

  function handleRemoveMember(targetUserId: string, targetName: string) {
    const confirmed = window.confirm(
      `Remove ${targetName} from this group? They'll lose access to this chat, but their past messages stay.`
    );
    if (!confirmed) return;

    const formData = new FormData();
    formData.set("group_id", groupId);
    formData.set("target_user_id", targetUserId);

    runAction(async () => {
      await removeMember(formData);
      router.refresh();
    });
  }

  function handleLeave() {
    const confirmed = window.confirm(
      "Leave this group? You'll need a new invite to rejoin."
    );
    if (!confirmed) return;

    const formData = new FormData();
    formData.set("group_id", groupId);

    runAction(() => leaveGroup(formData));
  }

  function handleDelete() {
    if (deleteConfirmText !== groupName) return;

    const formData = new FormData();
    formData.set("group_id", groupId);

    runAction(() => deleteGroup(formData));
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-black text-zinc-300 transition hover:border-orange-500 hover:text-orange-400"
      >
        {isOpen ? "Close Settings" : "Group Settings"}
      </button>

      {isOpen && (
        <div className="mt-4 space-y-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          {errorMessage && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
              {errorMessage}
            </div>
          )}

          {isOwner && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-orange-500">
                Group Name
              </p>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  maxLength={60}
                  className="flex-1 rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500"
                />

                <button
                  type="button"
                  onClick={handleRename}
                  disabled={
                    isPending ||
                    !nameInput.trim() ||
                    nameInput.trim() === groupName
                  }
                  className="rounded-full bg-orange-500 px-6 py-3 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-black uppercase tracking-widest text-orange-500">
              Members ({members.length})
            </p>

            <div className="mt-3 space-y-2">
              {members.map((member) => {
                const isSelf = member.user_id === currentUserId;

                return (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-bold">
                        {member.display_name}
                        {isSelf ? " (You)" : ""}
                      </p>

                      {member.role === "owner" && (
                        <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-orange-400">
                          Owner
                        </span>
                      )}
                    </div>

                    {isOwner && member.role !== "owner" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveMember(
                            member.user_id,
                            member.display_name
                          )
                        }
                        disabled={isPending}
                        className="text-xs font-bold text-zinc-500 transition hover:text-red-400 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-5">
            {isOwner ? (
              <>
                <p className="text-xs font-black uppercase tracking-widest text-red-400">
                  Danger Zone
                </p>

                {!confirmingDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="mt-3 rounded-full border border-red-500/40 px-5 py-2 text-sm font-black text-red-400 transition hover:bg-red-500/10"
                  >
                    Delete Group
                  </button>
                ) : (
                  <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                    <p className="text-sm leading-6 text-red-300">
                      This permanently deletes <strong>{groupName}</strong>,
                      every message in it, and removes all members. This
                      cannot be undone.
                    </p>

                    <p className="mt-3 text-xs font-bold uppercase text-red-400">
                      Type &ldquo;{groupName}&rdquo; to confirm
                    </p>

                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(event) =>
                        setDeleteConfirmText(event.target.value)
                      }
                      className="mt-2 w-full rounded-xl border border-red-500/40 bg-black px-4 py-2.5 text-sm text-white outline-none focus:border-red-400"
                    />

                    <div className="mt-3 flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingDelete(false);
                          setDeleteConfirmText("");
                        }}
                        disabled={isPending}
                        className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-bold text-zinc-300 transition hover:border-zinc-500"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={
                          isPending || deleteConfirmText !== groupName
                        }
                        className="rounded-full bg-red-500 px-5 py-2 text-sm font-black text-black transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isPending
                          ? "Deleting…"
                          : "Permanently Delete Group"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={handleLeave}
                disabled={isPending}
                className="rounded-full border border-red-500/40 px-5 py-2 text-sm font-black text-red-400 transition hover:bg-red-500/10 disabled:opacity-40"
              >
                {isPending ? "Leaving…" : "Leave Group"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}