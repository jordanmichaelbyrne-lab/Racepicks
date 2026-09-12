"use client";

import { useEffect, useState } from "react";
import { createClient } from "./supabase/client";

const REFRESH_INTERVAL_MS = 60_000; // 1 minute

export type UnreadBanterData = {
  totalUnread: number;
  unreadByGroup: Map<string, number>;
};

const EMPTY: UnreadBanterData = {
  totalUnread: 0,
  unreadByGroup: new Map(),
};

/**
 * Unread message counts across every private group the given user
 * belongs to — both a total (for the navbar/tab badge) and a
 * per-group breakdown (so the groups list can show exactly which
 * group has new messages, rather than just an unhelpful total).
 *
 * "Unread" = messages from OTHER people, posted after that group's
 * last_read_at (or all of them, if the group has never been opened —
 * last_read_at is null).
 *
 * Deliberately polling-based rather than a permanent Realtime
 * subscription — see markAsRead in GroupChatBoard for the same-tab
 * event that forces an immediate recheck right when a group is read,
 * so this doesn't rely solely on the interval to feel responsive.
 */
export function useUnreadBanterCount(userId: string | null): UnreadBanterData {
  const [data, setData] = useState<UnreadBanterData>(EMPTY);

  useEffect(() => {
    if (!userId) {
      setData(EMPTY);
      return;
    }

    const supabase = createClient();
    let isMounted = true;

    async function loadUnreadCount() {
      const { data: memberships, error: membershipsError } = await supabase
        .from("chat_group_members")
        .select("group_id, last_read_at")
        .eq("user_id", userId);

      if (membershipsError) {
        console.error("Unread count: memberships error:", membershipsError);
        return;
      }

      if (!memberships || memberships.length === 0) {
        if (isMounted) setData(EMPTY);
        return;
      }

      const groupIds = memberships.map((membership) => membership.group_id);
      const lastReadByGroup = new Map(
        memberships.map((membership) => [
          membership.group_id,
          membership.last_read_at,
        ])
      );

      const { data: messages, error: messagesError } = await supabase
        .from("chat_group_messages")
        .select("group_id, user_id, created_at")
        .in("group_id", groupIds);

      if (messagesError) {
        console.error("Unread count: messages error:", messagesError);
        return;
      }

      const unreadByGroup = new Map<string, number>();
      let total = 0;

      for (const message of messages ?? []) {
        if (message.user_id === userId) {
          continue;
        }

        const lastRead = lastReadByGroup.get(message.group_id);
        const isUnread =
          !lastRead || new Date(message.created_at) > new Date(lastRead);

        if (isUnread) {
          unreadByGroup.set(
            message.group_id,
            (unreadByGroup.get(message.group_id) ?? 0) + 1
          );
          total += 1;
        }
      }

      if (isMounted) {
        setData({ totalUnread: total, unreadByGroup });
      }
    }

    loadUnreadCount();

    const intervalId = window.setInterval(loadUnreadCount, REFRESH_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadUnreadCount();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", loadUnreadCount);
    window.addEventListener("racepicks:banter-read", loadUnreadCount);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", loadUnreadCount);
      window.removeEventListener("racepicks:banter-read", loadUnreadCount);
    };
  }, [userId]);

  return data;
}