"use client";

import { useEffect, useState } from "react";
import { createClient } from "./supabase/client";

/**
 * Total unread message count across every private group the given
 * user belongs to. "Unread" = messages from OTHER people, posted
 * after that group's last_read_at (or all of them, if the group has
 * never been opened — last_read_at is null).
 *
 * This is the single source of truth both the Navbar badge and the
 * Banter page's "Groups" tab badge read from, so they can never drift
 * out of sync with each other.
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

    const channel = supabase
      .channel("racepicks-unread-banter")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_group_messages" },
        () => loadUnreadCount()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_group_members" },
        () => loadUnreadCount()
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return unreadCount;
}