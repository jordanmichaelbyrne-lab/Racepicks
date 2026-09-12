"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";

async function requireGroupOwner(groupId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: group, error } = await supabase
    .from("chat_groups")
    .select("id, created_by")
    .eq("id", groupId)
    .single();

  if (error || !group) {
    throw new Error("Group not found.");
  }

  if (group.created_by !== user.id) {
    throw new Error("Only the group owner can do that.");
  }

  return { supabase, userId: user.id };
}

export async function renameGroup(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "").trim();
  const newName = String(formData.get("name") ?? "").trim();

  if (!groupId) {
    throw new Error("Group ID is missing.");
  }

  if (!newName) {
    throw new Error("Group name cannot be empty.");
  }

  if (newName.length > 60) {
    throw new Error("Group name must be 60 characters or fewer.");
  }

  const { supabase } = await requireGroupOwner(groupId);

  const { error } = await supabase
    .from("chat_groups")
    .update({ name: newName })
    .eq("id", groupId);

  if (error) {
    console.error("Rename group error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/banter/groups/${groupId}`);
  revalidatePath("/banter");
}

export async function removeMember(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "").trim();
  const targetUserId = String(formData.get("target_user_id") ?? "").trim();

  if (!groupId || !targetUserId) {
    throw new Error("Missing group or member information.");
  }

  const { supabase, userId } = await requireGroupOwner(groupId);

  if (targetUserId === userId) {
    throw new Error(
      "You can't remove yourself as the owner — delete the group instead."
    );
  }

  const { error } = await supabase
    .from("chat_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", targetUserId);

  if (error) {
    console.error("Remove member error:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/banter/groups/${groupId}`);
}

export async function leaveGroup(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "").trim();

  if (!groupId) {
    throw new Error("Group ID is missing.");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: group, error: groupError } = await supabase
    .from("chat_groups")
    .select("created_by")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    throw new Error("Group not found.");
  }

  if (group.created_by === user.id) {
    throw new Error(
      "As the owner, you can't leave this group — delete it instead if you want to close it down."
    );
  }

  const { error } = await supabase
    .from("chat_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Leave group error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/banter");
  redirect("/banter");
}

export async function deleteGroup(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "").trim();

  if (!groupId) {
    throw new Error("Group ID is missing.");
  }

  const { supabase } = await requireGroupOwner(groupId);

  // Explicit, ordered cleanup — messages and invites first, then
  // memberships, then the group itself. This works correctly whether
  // or not a cascading foreign key already exists underneath, so
  // there's no dependency on that being configured a particular way.
  const { error: messagesError } = await supabase
    .from("chat_group_messages")
    .delete()
    .eq("group_id", groupId);

  if (messagesError) {
    console.error("Delete group messages error:", messagesError);
    throw new Error(messagesError.message);
  }

  const { error: invitesError } = await supabase
    .from("chat_group_invites")
    .delete()
    .eq("group_id", groupId);

  if (invitesError) {
    console.error("Delete group invites error:", invitesError);
    throw new Error(invitesError.message);
  }

  const { error: membersError } = await supabase
    .from("chat_group_members")
    .delete()
    .eq("group_id", groupId);

  if (membersError) {
    console.error("Delete group members error:", membersError);
    throw new Error(membersError.message);
  }

  const { error: groupDeleteError } = await supabase
    .from("chat_groups")
    .delete()
    .eq("id", groupId);

  if (groupDeleteError) {
    console.error("Delete group error:", groupDeleteError);
    throw new Error(groupDeleteError.message);
  }

  revalidatePath("/banter");
  redirect("/banter");
}