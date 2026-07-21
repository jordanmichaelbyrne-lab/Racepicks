"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase/client";

type PostProfile = {
  display_name: string | null;
};

type RawPost = {
  id: string;
  user_id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
};

type Post = RawPost & {
  profiles: PostProfile | null;
  likeCount: number;
  commentCount: number;
  hasLiked: boolean;
};

type PostFeedProps = {
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
  const now = Date.now();
  const diffSeconds = Math.floor((now - date.getTime()) / 1000);

  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export default function PostFeed({
  currentUserId,
  isAdmin,
}: PostFeedProps) {
  const supabase = createClient();

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadPosts() {
    const { data: rawPosts, error: postsError } = await supabase
      .from("banter_posts")
      .select("id, user_id, content, is_pinned, created_at")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (postsError) {
      setErrorMessage(postsError.message);
      setIsLoading(false);
      return;
    }

    const posts = (rawPosts ?? []) as RawPost[];
    const postIds = posts.map((post) => post.id);
    const authorIds = Array.from(
      new Set(posts.map((post) => post.user_id))
    );

    let profilesById = new Map<string, PostProfile>();

    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", authorIds);

      profilesById = new Map(
        (profiles ?? []).map((profile) => [
          profile.id,
          { display_name: profile.display_name },
        ])
      );
    }

    let likesByPost = new Map<string, string[]>();
    let commentCountByPost = new Map<string, number>();

    if (postIds.length > 0) {
      const { data: likeRows } = await supabase
        .from("banter_post_likes")
        .select("post_id, user_id")
        .in("post_id", postIds);

      for (const like of likeRows ?? []) {
        const existing = likesByPost.get(like.post_id) ?? [];
        existing.push(like.user_id);
        likesByPost.set(like.post_id, existing);
      }

      const { data: commentRows } = await supabase
        .from("banter_comments")
        .select("post_id")
        .in("post_id", postIds);

      for (const comment of commentRows ?? []) {
        commentCountByPost.set(
          comment.post_id,
          (commentCountByPost.get(comment.post_id) ?? 0) + 1
        );
      }
    }

    const combinedPosts: Post[] = posts.map((post) => {
      const likerIds = likesByPost.get(post.id) ?? [];

      return {
        ...post,
        profiles: profilesById.get(post.user_id) ?? null,
        likeCount: likerIds.length,
        commentCount: commentCountByPost.get(post.id) ?? 0,
        hasLiked: likerIds.includes(currentUserId),
      };
    });

    setPosts(combinedPosts);
    setIsLoading(false);
  }

  useEffect(() => {
    loadPosts();

    const channel = supabase
      .channel("racepicks-banter-posts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "banter_posts" },
        () => loadPosts()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "banter_comments" },
        () => loadPosts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmedContent = newPostContent.trim();

    if (!trimmedContent || isPosting) {
      return;
    }

    if (trimmedContent.length > 1000) {
      setErrorMessage("Posts must be 1000 characters or fewer.");
      return;
    }

    setIsPosting(true);
    setErrorMessage("");

    const { error } = await supabase.from("banter_posts").insert({
      user_id: currentUserId,
      content: trimmedContent,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsPosting(false);
      return;
    }

    setNewPostContent("");
    setIsPosting(false);
    await loadPosts();
  }

  async function toggleLike(post: Post) {
    // Optimistic update
    setPosts((current) =>
      current.map((p) =>
        p.id === post.id
          ? {
              ...p,
              hasLiked: !p.hasLiked,
              likeCount: p.hasLiked ? p.likeCount - 1 : p.likeCount + 1,
            }
          : p
      )
    );

    if (post.hasLiked) {
      const { error } = await supabase
        .from("banter_post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", currentUserId);

      if (error) {
        console.error("Unlike error:", error);
        await loadPosts();
      }
    } else {
      const { error } = await supabase.from("banter_post_likes").insert({
        post_id: post.id,
        user_id: currentUserId,
      });

      if (error) {
        console.error("Like error:", error);
        await loadPosts();
      }
    }
  }

  async function togglePin(post: Post) {
    const { error } = await supabase
      .from("banter_posts")
      .update({ is_pinned: !post.is_pinned })
      .eq("id", post.id);

    if (error) {
      console.error("Pin error:", error);
      return;
    }

    await loadPosts();
  }

  async function deletePost(postId: string) {
    const confirmed = window.confirm("Delete this post?");

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("banter_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setPosts((current) => current.filter((p) => p.id !== postId));
  }

  return (
    <div className="mt-6 space-y-5">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <textarea
            value={newPostContent}
            onChange={(event) => setNewPostContent(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="What's on your mind this race weekend?"
            className="w-full resize-none rounded-2xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-500"
          />

          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="text-xs text-zinc-600">
              {newPostContent.length}/1000
            </p>

            <button
              type="submit"
              disabled={isPosting || !newPostContent.trim()}
              className="rounded-full bg-orange-500 px-7 py-3 font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPosting ? "Posting…" : "Post"}
            </button>
          </div>
        </form>
      </section>

      {isLoading ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center text-zinc-500">
          Loading posts…
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center">
          <p className="text-2xl font-black">Quiet in here…</p>
          <p className="mt-2 text-sm text-zinc-500">
            Be the first person to post this race weekend.
          </p>
        </div>
      ) : (
        posts.map((post) => {
          const displayName =
            post.profiles?.display_name?.trim() || "Racepicks Player";
          const isCurrentUser = post.user_id === currentUserId;

          return (
            <div
              key={post.id}
              className={`rounded-3xl border p-6 ${
                post.is_pinned
                  ? "border-orange-500/40 bg-orange-500/5"
                  : "border-zinc-800 bg-zinc-950"
              }`}
            >
              {post.is_pinned && (
                <p className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-orange-400">
                  📌 Pinned
                </p>
              )}

              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-orange-500/50 bg-orange-500/10 text-xs font-black text-orange-400">
                  {getInitials(displayName) || "RP"}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black">
                      {isCurrentUser ? "You" : displayName}
                    </p>

                    <p className="text-xs text-zinc-600">
                      · {formatRelativeTime(post.created_at)}
                    </p>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap break-words leading-6 text-zinc-200">
                    {post.content}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-5">
                    <button
                      type="button"
                      onClick={() => toggleLike(post)}
                      className={`flex items-center gap-1.5 text-sm font-bold transition ${
                        post.hasLiked
                          ? "text-orange-400"
                          : "text-zinc-500 hover:text-orange-400"
                      }`}
                    >
                      <span>{post.hasLiked ? "🔥" : "🤍"}</span>
                      <span>{post.likeCount}</span>
                    </button>

                    <Link
                      href={`/banter/posts/${post.id}`}
                      className="flex items-center gap-1.5 text-sm font-bold text-zinc-500 transition hover:text-white"
                    >
                      <span>💬</span>
                      <span>
                        {post.commentCount}{" "}
                        {post.commentCount === 1 ? "comment" : "comments"}
                      </span>
                    </Link>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => togglePin(post)}
                        className="text-sm font-bold text-zinc-500 transition hover:text-orange-400"
                      >
                        {post.is_pinned ? "Unpin" : "Pin"}
                      </button>
                    )}

                    {(isCurrentUser || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => deletePost(post.id)}
                        className="text-sm font-bold text-zinc-500 transition hover:text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}