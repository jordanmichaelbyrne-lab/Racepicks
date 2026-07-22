"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

type CommentProfile = {
  display_name: string | null;
  avatar_url: string | null;
};

type RawComment = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  user_id: string;
  content: string;
  created_at: string;
};

type CommentNode = RawComment & {
  profiles: CommentProfile | null;
  likeCount: number;
  hasLiked: boolean;
  children: CommentNode[];
};

type CommentThreadProps = {
  postId: string;
  currentUserId: string;
  isAdmin: boolean;
};

function getInitials(displayName: string) {
  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export default function CommentThread({
  postId,
  currentUserId,
  isAdmin,
}: CommentThreadProps) {
  const supabase = createClient();

  const [commentTree, setCommentTree] = useState<CommentNode[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [newCommentContent, setNewCommentContent] = useState("");
  const [isPostingRoot, setIsPostingRoot] = useState(false);

  const [activeReplyId, setActiveReplyId] = useState<string | null>(
    null
  );
  const [replyContent, setReplyContent] = useState("");
  const [isPostingReply, setIsPostingReply] = useState(false);

  async function loadComments() {
    const { data: rawComments, error } = await supabase
      .from("banter_comments")
      .select("id, post_id, parent_comment_id, user_id, content, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    const comments = (rawComments ?? []) as RawComment[];
    setTotalCount(comments.length);

    const commentIds = comments.map((comment) => comment.id);
    const authorIds = Array.from(
      new Set(comments.map((comment) => comment.user_id))
    );

    let profilesById = new Map<string, CommentProfile>();

    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", authorIds);

      profilesById = new Map(
        (profiles ?? []).map((profile) => [
          profile.id,
          {
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          },
        ])
      );
    }

    let likesByComment = new Map<string, string[]>();

    if (commentIds.length > 0) {
      const { data: likeRows } = await supabase
        .from("banter_comment_likes")
        .select("comment_id, user_id")
        .in("comment_id", commentIds);

      for (const like of likeRows ?? []) {
        const existing = likesByComment.get(like.comment_id) ?? [];
        existing.push(like.user_id);
        likesByComment.set(like.comment_id, existing);
      }
    }

    // Build every comment as a node first, keyed by id.
    const nodesById = new Map<string, CommentNode>();

    for (const comment of comments) {
      const likerIds = likesByComment.get(comment.id) ?? [];

      nodesById.set(comment.id, {
        ...comment,
        profiles: profilesById.get(comment.user_id) ?? null,
        likeCount: likerIds.length,
        hasLiked: likerIds.includes(currentUserId),
        children: [],
      });
    }

    // Now link each node to its parent, building the tree.
    const roots: CommentNode[] = [];

    for (const comment of comments) {
      const node = nodesById.get(comment.id);

      if (!node) {
        continue;
      }

      if (comment.parent_comment_id) {
        const parent = nodesById.get(comment.parent_comment_id);

        if (parent) {
          parent.children.push(node);
          continue;
        }
      }

      roots.push(node);
    }

    setCommentTree(roots);
    setIsLoading(false);
  }

  useEffect(() => {
    loadComments();

    const channel = supabase
      .channel(`post-comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "banter_comments",
          filter: `post_id=eq.${postId}`,
        },
        () => loadComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  async function submitRootComment(event: FormEvent) {
    event.preventDefault();

    const trimmed = newCommentContent.trim();

    if (!trimmed || isPostingRoot) {
      return;
    }

    setIsPostingRoot(true);
    setErrorMessage("");

    const { error } = await supabase.from("banter_comments").insert({
      post_id: postId,
      parent_comment_id: null,
      user_id: currentUserId,
      content: trimmed,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsPostingRoot(false);
      return;
    }

    setNewCommentContent("");
    setIsPostingRoot(false);
    await loadComments();
  }

  async function submitReply(parentId: string) {
    const trimmed = replyContent.trim();

    if (!trimmed || isPostingReply) {
      return;
    }

    setIsPostingReply(true);
    setErrorMessage("");

    const { error } = await supabase.from("banter_comments").insert({
      post_id: postId,
      parent_comment_id: parentId,
      user_id: currentUserId,
      content: trimmed,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsPostingReply(false);
      return;
    }

    setReplyContent("");
    setActiveReplyId(null);
    setIsPostingReply(false);
    await loadComments();
  }

  async function toggleLike(comment: CommentNode) {
    const shouldUnlike = comment.hasLiked;

    if (shouldUnlike) {
      const { error } = await supabase
        .from("banter_comment_likes")
        .delete()
        .eq("comment_id", comment.id)
        .eq("user_id", currentUserId);

      if (error) {
        console.error("Unlike comment error:", error);
      }
    } else {
      const { error } = await supabase
        .from("banter_comment_likes")
        .insert({
          comment_id: comment.id,
          user_id: currentUserId,
        });

      if (error) {
        console.error("Like comment error:", error);
      }
    }

    await loadComments();
  }

  async function deleteComment(commentId: string) {
    const confirmed = window.confirm(
      "Delete this comment? Replies to it will also be removed."
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("banter_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await loadComments();
  }

  function renderComment(comment: CommentNode, depth: number) {
    const displayName =
      comment.profiles?.display_name?.trim() || "Racepicks Player";
    const isCurrentUser = comment.user_id === currentUserId;
    const isReplying = activeReplyId === comment.id;

    // Cap visual indentation so deep threads don't push off-screen on mobile.
    const indentPx = Math.min(depth, 6) * 20;

    return (
      <div
        key={comment.id}
        style={{ marginLeft: indentPx }}
        className={depth > 0 ? "mt-3 border-l border-zinc-800 pl-4" : "mt-4"}
      >
        <div className="flex items-start gap-3">
          {comment.profiles?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={comment.profiles.avatar_url}
              alt={displayName}
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-500/50 bg-orange-500/10 text-[11px] font-black text-orange-400">
              {getInitials(displayName) || "RP"}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black">
                {isCurrentUser ? "You" : displayName}
              </p>

              <p className="text-xs text-zinc-600">
                · {formatRelativeTime(comment.created_at)}
              </p>
            </div>

            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-200">
              {comment.content}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => toggleLike(comment)}
                className={`flex items-center gap-1 text-xs font-bold transition ${
                  comment.hasLiked
                    ? "text-orange-400"
                    : "text-zinc-500 hover:text-orange-400"
                }`}
              >
                <span>{comment.hasLiked ? "🔥" : "🤍"}</span>
                <span>{comment.likeCount}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveReplyId(isReplying ? null : comment.id)
                }
                className="text-xs font-bold text-zinc-500 transition hover:text-white"
              >
                {isReplying ? "Cancel" : "Reply"}
              </button>

              {(isCurrentUser || isAdmin) && (
                <button
                  type="button"
                  onClick={() => deleteComment(comment.id)}
                  className="text-xs font-bold text-zinc-500 transition hover:text-red-400"
                >
                  Delete
                </button>
              )}
            </div>

            {isReplying && (
              <div className="mt-3">
                <textarea
                  value={replyContent}
                  onChange={(event) =>
                    setReplyContent(event.target.value)
                  }
                  maxLength={1000}
                  rows={2}
                  placeholder={`Reply to ${
                    isCurrentUser ? "yourself" : displayName
                  }…`}
                  className="w-full resize-none rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
                />

                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveReplyId(null);
                      setReplyContent("");
                    }}
                    className="rounded-full border border-zinc-700 px-4 py-1.5 text-xs font-bold text-zinc-400 transition hover:border-zinc-500"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => submitReply(comment.id)}
                    disabled={isPostingReply || !replyContent.trim()}
                    className="rounded-full bg-orange-500 px-4 py-1.5 text-xs font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isPostingReply ? "Posting…" : "Post Reply"}
                  </button>
                </div>
              </div>
            )}

            {comment.children.map((child) =>
              renderComment(child, depth + 1)
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
        {totalCount} {totalCount === 1 ? "Comment" : "Comments"}
      </p>

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
          {errorMessage}
        </div>
      )}

      <form onSubmit={submitRootComment} className="mt-4">
        <textarea
          value={newCommentContent}
          onChange={(event) => setNewCommentContent(event.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Add a comment…"
          className="w-full resize-none rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
        />

        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={isPostingRoot || !newCommentContent.trim()}
            className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPostingRoot ? "Posting…" : "Comment"}
          </button>
        </div>
      </form>

      <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
        {isLoading ? (
          <p className="text-center text-zinc-500">Loading comments…</p>
        ) : commentTree.length === 0 ? (
          <p className="text-center text-zinc-500">
            No comments yet — be the first to reply.
          </p>
        ) : (
          commentTree.map((comment) => renderComment(comment, 0))
        )}
      </div>
    </div>
  );
}