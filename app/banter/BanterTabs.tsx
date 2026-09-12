"use client";

import { useState } from "react";
import PostFeed from "./PostFeed";
import GroupsPanel from "./GroupsPanel";
import { useUnreadBanterCount } from "@/app/lib/useUnreadBanterCount";

type BanterTabsProps = {
  currentUserId: string;
  isAdmin: boolean;
};

type TabKey = "feed" | "groups";

export default function BanterTabs({
  currentUserId,
  isAdmin,
}: BanterTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("feed");
  const unreadCount = useUnreadBanterCount(currentUserId);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "feed", label: "Feed" },
    { key: "groups", label: "Groups" },
  ];

  return (
    <div className="mt-10">
      <div className="flex gap-1 rounded-2xl border border-zinc-800 bg-zinc-950 p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex-1 rounded-xl px-5 py-3 text-sm font-black uppercase tracking-wider transition ${
              activeTab === tab.key
                ? "bg-orange-500 text-black"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            {tab.label}

            {tab.key === "groups" && unreadCount > 0 && (
              <span
                className={`ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                  activeTab === "groups"
                    ? "bg-black text-orange-500"
                    : "bg-orange-500 text-black"
                }`}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "feed" ? (
        <PostFeed currentUserId={currentUserId} isAdmin={isAdmin} />
      ) : (
        <GroupsPanel currentUserId={currentUserId} />
      )}
    </div>
  );
}