"use client";

import { useEffect, useState } from "react";
import { createClient } from "./supabase/client";

const REFRESH_INTERVAL_MS = 60_000; // 1 minute

/**
 * Total unread message count across every private group the given
 * user belongs to. "Unread" = messages from OTHER people, posted
 * after that group's last_read_at (or all of them, if the group has
 * never been opened — last_read_at is null).
 *
 * Deliberately polling-based rather than a permanent Realtime
 * subscription: this hook runs inside Navbar, which renders on every
 * page of the app, so a live socket here would mean every user has an
 * always-open WebSocket connection for the entire time they're using
 * Racepicks, on top of whatever page-specific channels (Banter feed,
 * a group's own chat) are already open. A badge is a low-priority,
 * "close enough" indicator — refetching on an interval and whenever
 * the tab regains focus keeps it reasonably fresh without holding
 * that connection open everywhere, all the time.
 */
export function useUnreadBanterCount(userId: string | null) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
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
        if (isMounted) setUnreadCount(0);
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

      let total = 0;

      for (const message of messages ?? []) {
        if (message.user_id === userId) {
          continue;
        }

        const lastRead = lastReadByGroup.get(message.group_id);

        if (!lastRead || new Date(message.created_at) > new Date(lastRead)) {
          total += 1;
        }
      }

      if (isMounted) {
        setUnreadCount(total);
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

    // Fired by GroupChatBoard the instant it marks a group as read, so
    // the badge updates immediately instead of waiting for the next
    // interval tick or tab-focus event.
    window.addEventListener("racepicks:banter-read", loadUnreadCount);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", loadUnreadCount);
      window.removeEventListener("racepicks:banter-read", loadUnreadCount);
    };
  }, [userId]);

  return unreadCount;
}