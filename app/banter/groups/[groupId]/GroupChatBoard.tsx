"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

type MemberProfile = {
  display_name: string | null;
};

type MemberRow = {
  user_id: string;
  role: string;
  profiles: MemberProfile | MemberProfile[] | null;
};

type GroupMessage = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles: MemberProfile | MemberProfile[] | null;
};

type SearchResult = {
  id: string;
  display_name: string | null;
};

type GroupChatBoardProps = {
  groupId: string;
  currentUserId: string;
  initialMembers: MemberRow[];
};

function getProfile(profile: MemberProfile | MemberProfile[] | null) {
  if (Array.isArray(profile)) {
    return profile[0] ?? null;
  }

  return profile;
}

function getInitials(displayName: string) {
  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function GroupChatBoard({
  groupId,
  currentUserId,
  initialMembers,
}: GroupChatBoardProps) {
  const supabase = createClient();

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<MemberRow[]>(initialMembers);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>(
    []
  );
  const [isSearching, setIsSearching] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    const { data: rawMessages, error } = await supabase
      .from("chat_group_messages")
      .select("id, user_id, message, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    const senderIds = Array.from(
      new Set((rawMessages ?? []).map((message) => message.user_id))
    );

    let senderProfilesById = new Map<
      string,
      { display_name: string | null }
    >();

    if (senderIds.length > 0) {
      const { data: senderProfiles, error: senderProfilesError } =
        await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", senderIds);

      if (senderProfilesError) {
        console.error(
          "Sender profiles loading error:",
          senderProfilesError
        );
      } else {
        senderProfilesById = new Map(
          (senderProfiles ?? []).map((profile) => [
            profile.id,
            { display_name: profile.display_name },
          ])
        );
      }
    }

    const combinedMessages = (rawMessages ?? []).map((message) => ({
      id: message.id,
      user_id: message.user_id,
      message: message.message,
      created_at: message.created_at,
      profiles: senderProfilesById.get(message.user_id) ?? null,
    }));

    setMessages(combinedMessages as GroupMessage[]);
    setIsLoading(false);
  }

  async function loadMembers() {
    const { data, error } = await supabase
      .from("chat_group_members")
      .select(
        `
          user_id,
          role,
          profiles (
            display_name
          )
        `
      )
      .eq("group_id", groupId);

    if (error) {
      console.error("Members loading error:", error);
      return;
    }

    setMembers((data ?? []) as MemberRow[]);
  }

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          loadMessages();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_group_members",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          loadMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = newMessage.trim();

    if (!trimmedMessage || isPosting) {
      return;
    }

    if (trimmedMessage.length > 500) {
      setErrorMessage("Messages must be 500 characters or fewer.");
      return;
    }

    setIsPosting(true);
    setErrorMessage("");

    const { error } = await supabase.from("chat_group_messages").insert({
      group_id: groupId,
      user_id: currentUserId,
      message: trimmedMessage,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsPosting(false);
      return;
    }

    setNewMessage("");
    setIsPosting(false);
    await loadMessages();
  }

  async function deleteMessage(messageId: string) {
    const confirmed = window.confirm("Remove this message?");

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("chat_group_messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessages((current) =>
      current.filter((message) => message.id !== messageId)
    );
  }

  async function searchPlayers(term: string) {
    setSearchTerm(term);
    setInviteMessage("");

    const trimmedTerm = term.trim();

    if (trimmedTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    const memberIds = members.map((member) => member.user_id);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .ilike("display_name", `%${trimmedTerm}%`)
      .limit(10);

    if (error) {
      console.error("Player search error:", error);
      setIsSearching(false);
      return;
    }

    const filteredResults = (data ?? []).filter(
      (result) => !memberIds.includes(result.id)
    );

    setSearchResults(filteredResults);
    setIsSearching(false);
  }

  async function invitePlayer(playerId: string) {
    const { error } = await supabase.from("chat_group_invites").insert({
      group_id: groupId,
      invited_user_id: playerId,
      invited_by: currentUserId,
    });

    if (error) {
      if (error.code === "23505") {
        setInviteMessage("That player has already been invited.");
      } else {
        setInviteMessage(error.message);
      }
      return;
    }

    setInviteMessage("Invite sent!");
    setSearchTerm("");
    setSearchResults([]);
  }

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {members.length} {members.length === 1 ? "member" : "members"}
        </p>

        <button
          type="button"
          onClick={() => setShowInvitePanel((current) => !current)}
          className="rounded-full border border-orange-500 px-5 py-2 text-sm font-black text-orange-500 transition hover:bg-orange-500 hover:text-black"
        >
          {showInvitePanel ? "Close" : "Invite Player"}
        </button>
      </div>

      {showInvitePanel && (
        <div className="mb-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
            Invite a Player
          </p>

          <input
            type="text"
            value={searchTerm}
            onChange={(event) => searchPlayers(event.target.value)}
            placeholder="Search by display name…"
            className="mt-4 w-full rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition focus:border-orange-500"
          />

          {inviteMessage && (
            <p className="mt-3 text-sm font-bold text-orange-400">
              {inviteMessage}
            </p>
          )}

          {isSearching ? (
            <p className="mt-4 text-sm text-zinc-500">Searching…</p>
          ) : searchResults.length > 0 ? (
            <div className="mt-4 space-y-2">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black p-3"
                >
                  <p className="font-bold">
                    {result.display_name ?? "Unknown Player"}
                  </p>

                  <button
                    type="button"
                    onClick={() => invitePlayer(result.id)}
                    className="rounded-full bg-orange-500 px-4 py-1.5 text-xs font-black text-black transition hover:bg-orange-400"
                  >
                    Invite
                  </button>
                </div>
              ))}
            </div>
          ) : searchTerm.trim().length >= 2 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No players found.
            </p>
          ) : null}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
        <div className="h-[52vh] min-h-96 overflow-y-auto px-4 py-5 sm:px-6">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-zinc-500">
              Loading…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-2xl font-black">Quiet in here…</p>
              <p className="mt-2 text-sm text-zinc-500">
                Be the first to say something in this group.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((chatMessage) => {
                const profile = getProfile(chatMessage.profiles);
                const displayName =
                  profile?.display_name?.trim() || "Racepicks Player";
                const isCurrentUser =
                  chatMessage.user_id === currentUserId;

                return (
                  <div
                    key={chatMessage.id}
                    className={`flex gap-3 ${
                      isCurrentUser ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-500/50 bg-orange-500/10 text-xs font-black text-orange-400">
                      {getInitials(displayName) || "RP"}
                    </div>

                    <div
                      className={`max-w-[82%] ${
                        isCurrentUser ? "text-right" : ""
                      }`}
                    >
                      <div
                        className={`flex flex-wrap items-center gap-2 ${
                          isCurrentUser ? "justify-end" : ""
                        }`}
                      >
                        <p className="text-sm font-black">
                          {isCurrentUser ? "You" : displayName}
                        </p>

                        <p className="text-[11px] text-zinc-600">
                          {new Intl.DateTimeFormat("en-AU", {
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(chatMessage.created_at))}
                        </p>
                      </div>

                      <div
                        className={`mt-1 rounded-2xl px-4 py-3 text-left text-sm leading-6 ${
                          isCurrentUser
                            ? "rounded-tr-sm bg-orange-500 text-black"
                            : "rounded-tl-sm border border-zinc-800 bg-black text-zinc-200"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">
                          {chatMessage.message}
                        </p>
                      </div>

                      {isCurrentUser && (
                        <button
                          type="button"
                          onClick={() => deleteMessage(chatMessage.id)}
                          className="mt-1 text-xs font-bold text-zinc-600 transition hover:text-red-400"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-zinc-800 p-4 sm:p-6"
        >
          {errorMessage && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
              {errorMessage}
            </div>
          )}

          <textarea
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Message this group…"
            className="w-full resize-none rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
          />

          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="text-xs text-zinc-600">
              {newMessage.length}/500
            </p>

            <button
              type="submit"
              disabled={isPosting || !newMessage.trim()}
              className="rounded-full bg-orange-500 px-7 py-3 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPosting ? "Posting…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}