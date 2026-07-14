"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createClient } from "../lib/supabase/client";

type MessageProfile = {
  display_name: string | null;
  avatar_url: string | null;
};

type BanterMessage = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles: MessageProfile | MessageProfile[] | null;
};

type BanterBoardProps = {
  currentUserId: string;
};

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
}: BanterBoardProps) {
  const supabase = createClient();

  const [messages, setMessages] = useState<BanterMessage[]>([]);
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

  useEffect(() => {
    loadMessages();

    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
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

                    {isCurrentUser && (
                      <button
                        type="button"
                        onClick={() =>
                          deleteMessage(chatMessage.id)
                        }
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