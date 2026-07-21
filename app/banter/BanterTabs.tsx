"use client";

import { useState } from "react";
import PostFeed from "./PostFeed";
import GroupsPanel from "./GroupsPanel";

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
            className={`flex-1 rounded-xl px-5 py-3 text-sm font-black uppercase tracking-wider transition ${
              activeTab === tab.key
                ? "bg-orange-500 text-black"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            {tab.label}
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