import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { createClient } from "@/app/lib/supabase/server";
import GroupChatBoard from "./GroupChatBoard";

type PageProps = {
  params: Promise<{
    groupId: string;
  }>;
};

export default async function GroupChatPage({ params }: PageProps) {
  const { groupId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Confirm the current user is actually a member of this group.
  const { data: membership, error: membershipError } = await supabase
    .from("chat_group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership) {
    notFound();
  }

  const { data: group, error: groupError } = await supabase
    .from("chat_groups")
    .select("id, name")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    notFound();
  }

  const { data: rawMembers, error: membersError } = await supabase
    .from("chat_group_members")
    .select("user_id, role")
    .eq("group_id", groupId);

  if (membersError) {
    throw new Error(membersError.message);
  }

  const memberUserIds = (rawMembers ?? []).map((member) => member.user_id);

  let memberProfilesById = new Map<
    string,
    { display_name: string | null }
  >();

  if (memberUserIds.length > 0) {
    const { data: memberProfiles, error: memberProfilesError } =
      await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", memberUserIds);

    if (memberProfilesError) {
      throw new Error(memberProfilesError.message);
    }

    memberProfilesById = new Map(
      (memberProfiles ?? []).map((profile) => [
        profile.id,
        { display_name: profile.display_name },
      ])
    );
  }

  const memberRows = (rawMembers ?? []).map((member) => ({
    user_id: member.user_id,
    role: member.role,
    profiles: memberProfilesById.get(member.user_id) ?? null,
  }));

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Navbar />

        <section className="mx-auto max-w-4xl py-10 sm:py-14">
          <Link
            href="/banter"
            className="text-sm font-bold text-zinc-500 transition hover:text-orange-500"
          >
            ← Back to Banter
          </Link>

          <p className="mt-8 text-xs font-black uppercase tracking-[0.35em] text-orange-500">
            Private Group
          </p>

          <h1 className="mt-4 text-5xl font-black uppercase tracking-tight sm:text-6xl">
            {group.name}
          </h1>

          <GroupChatBoard
            groupId={group.id}
            currentUserId={user.id}
            initialMembers={memberRows ?? []}
          />
        </section>
      </div>
    </main>
  );
}