"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createClient } from "../lib/supabase/client";

type MessageProfile = {
  display_name: string | null;
  avatar_url: string | null;
};

type Reaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
};

type BanterMessage = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  is_pinned: boolean;
  profiles: MessageProfile | MessageProfile[] | null;
};

type BanterBoardProps = {
  currentUserId: string;
  isAdmin: boolean;
};

const REACTION_EMOJIS = ["👍", "🔥", "😂"] as const;

function getProfile(
  profile: MessageProfile | MessageProfile[] | null
) {
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

function linkifyMessage(message: string) {
  const parts = message.split(/(https?:\/\/[^\s]+)/g);

  return parts.map((part, index) => {
    if (/^https?:\/\/[^\s]+$/.test(part)) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-bold text-orange-400 underline decoration-orange-500/50 underline-offset-4 hover:text-orange-300"
        >
          {part}
        </a>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export default function BanterBoard({
  currentUserId,
  isAdmin,
}: BanterBoardProps) {
  const supabase = createClient();

  const [messages, setMessages] = useState<BanterMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    const { data, error } = await supabase
      .from("banter_messages")
      .select(
        `
          id,
          user_id,
          message,
          created_at,
          is_pinned,
          profiles (
            display_name,
            avatar_url
          )
        `
      )
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    setMessages((data ?? []) as BanterMessage[]);
    setIsLoading(false);
  }

  async function loadReactions() {
    const { data, error } = await supabase
      .from("banter_reactions")
      .select("id, message_id, user_id, emoji");

    if (error) {
      console.error("Reactions loading error:", error);
      return;
    }

    setReactions((data ?? []) as Reaction[]);
  }

  useEffect(() => {
    loadMessages();
    loadReactions();

    const messagesChannel = supabase
      .channel("racepicks-banter")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "banter_messages",
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    const reactionsChannel = supabase
      .channel("racepicks-banter-reactions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "banter_reactions",
        },
        () => {
          loadReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(reactionsChannel);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages.length]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
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

    const { error } = await supabase
      .from("banter_messages")
      .insert({
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

async function togglePin(messageId: string, shouldPin: boolean) {
    if (shouldPin) {
      // Only one message can be pinned at a time, so unpin any
      // currently pinned message first.
      const { error: unpinError } = await supabase
        .from("banter_messages")
        .update({ is_pinned: false })
        .eq("is_pinned", true);

      if (unpinError) {
        console.error("Unpin previous message error:", unpinError);
      }
    }

    const { error } = await supabase
      .from("banter_messages")
      .update({ is_pinned: shouldPin })
      .eq("id", messageId);

    if (error) {
      console.error("Toggle pin error:", error);
      setErrorMessage(error.message);
      return;
    }

    await loadMessages();
  }

  async function deleteMessage(messageId: string) {
    const confirmed = window.confirm(
      "Remove this message from Banter?"
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("banter_messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.filter(
        (message) => message.id !== messageId
      )
    );
  }

  async function toggleReaction(messageId: string, emoji: string) {
    const existingReaction = reactions.find(
      (reaction) =>
        reaction.message_id === messageId &&
        reaction.user_id === currentUserId &&
        reaction.emoji === emoji
    );

    if (existingReaction) {
      // Optimistically remove it, then confirm with the server.
      setReactions((current) =>
        current.filter(
          (reaction) => reaction.id !== existingReaction.id
        )
      );

      const { error } = await supabase
        .from("banter_reactions")
        .delete()
        .eq("id", existingReaction.id);

      if (error) {
        console.error("Remove reaction error:", error);
        await loadReactions();
      }

      return;
    }

    const { error } = await supabase.from("banter_reactions").insert({
      message_id: messageId,
      user_id: currentUserId,
      emoji,
    });

    if (error) {
      console.error("Add reaction error:", error);
      return;
    }

    await loadReactions();
  }

  return (
    <div className="mt-10 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-5 py-4 sm:px-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-black">Race Weekend Chat</p>

            <p className="mt-1 text-xs text-zinc-500">
              Latest 100 messages
            </p>
          </div>

          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green-400">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            Live
          </span>
        </div>
      </div>

{(() => {
        const pinnedMessage = messages.find(
          (message) => message.is_pinned
        );

        if (!pinnedMessage) {
          return null;
        }

        const pinnedProfile = getProfile(pinnedMessage.profiles);
        const pinnedDisplayName =
          pinnedProfile?.display_name?.trim() || "Racepicks Player";

        return (
          <div className="border-b border-orange-500/30 bg-orange-500/10 px-5 py-4 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-orange-400">
                  📌 Pinned
                </p>

                <p className="mt-2 text-sm leading-6 text-zinc-200">
                  {linkifyMessage(pinnedMessage.message)}
                </p>

                <p className="mt-2 text-xs text-zinc-500">
                  — {pinnedDisplayName}
                </p>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => togglePin(pinnedMessage.id, false)}
                  className="shrink-0 text-xs font-bold text-zinc-500 transition hover:text-red-400"
                >
                  Unpin
                </button>
              )}
            </div>
          </div>
        );
      })()}

      <div className="h-[52vh] min-h-96 overflow-y-auto px-4 py-5 sm:px-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-zinc-500">
            Loading Banter…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-2xl font-black">
              Quiet in here…
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Be the first person to start the race-weekend banter.
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

              const messageReactions = reactions.filter(
                (reaction) => reaction.message_id === chatMessage.id
              );

              return (
                <div
                  key={chatMessage.id}
                  className={`flex gap-3 ${
                    isCurrentUser
                      ? "flex-row-reverse"
                      : ""
                  }`}
                >
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-500/50 bg-orange-500/10 text-xs font-black text-orange-400">
                      {getInitials(displayName) || "RP"}
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] ${
                      isCurrentUser
                        ? "text-right"
                        : ""
                    }`}
                  >
                    <div
                      className={`flex flex-wrap items-center gap-2 ${
                        isCurrentUser
                          ? "justify-end"
                          : ""
                      }`}
                    >
                      <p className="text-sm font-black">
                        {isCurrentUser
                          ? "You"
                          : displayName}
                      </p>

                      <p className="text-[11px] text-zinc-600">
                        {new Intl.DateTimeFormat("en-AU", {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(
                          new Date(chatMessage.created_at)
                        )}
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
                        {linkifyMessage(chatMessage.message)}
                      </p>
                    </div>

                    <div
                      className={`mt-2 flex flex-wrap gap-1.5 ${
                        isCurrentUser ? "justify-end" : ""
                      }`}
                    >
                      {REACTION_EMOJIS.map((emoji) => {
                        const emojiReactions = messageReactions.filter(
                          (reaction) => reaction.emoji === emoji
                        );

                        const hasReacted = emojiReactions.some(
                          (reaction) =>
                            reaction.user_id === currentUserId
                        );

                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() =>
                              toggleReaction(chatMessage.id, emoji)
                            }
                            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition ${
                              hasReacted
                                ? "border-orange-500 bg-orange-500/15 text-orange-300"
                                : "border-zinc-800 bg-black text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                            }`}
                          >
                            <span>{emoji}</span>
                            {emojiReactions.length > 0 && (
                              <span>{emojiReactions.length}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                   <div
                      className={`mt-1 flex gap-3 ${
                        isCurrentUser ? "justify-end" : ""
                      }`}
                    >
                      {isAdmin && !chatMessage.is_pinned && (
                        <button
                          type="button"
                          onClick={() =>
                            togglePin(chatMessage.id, true)
                          }
                          className="text-xs font-bold text-zinc-600 transition hover:text-orange-400"
                        >
                          Pin
                        </button>
                      )}

                      {(isCurrentUser || isAdmin) && (
                        <button
                          type="button"
                          onClick={() =>
                            deleteMessage(chatMessage.id)
                          }
                          className={`text-xs font-bold transition hover:text-red-400 ${
                            isCurrentUser
                              ? "text-zinc-600"
                              : "text-red-500/70"
                          }`}
                        >
                          {isCurrentUser ? "Delete" : "Remove (Admin)"}
                        </button>
                      )}
                    </div>
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
          onChange={(event) =>
            setNewMessage(event.target.value)
          }
          maxLength={500}
          rows={3}
          placeholder="Talk some banter, share a link or back your riders…"
          className="w-full resize-none rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
        />

        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            {newMessage.length}/500
          </p>

          <button
            type="submit"
            disabled={
              isPosting || !newMessage.trim()
            }
            className="rounded-full bg-orange-500 px-7 py-3 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPosting ? "Posting…" : "Post Banter"}
          </button>
        </div>
      </form>
    </div>
  );
}