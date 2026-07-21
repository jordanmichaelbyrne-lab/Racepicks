import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { createClient } from "@/app/lib/supabase/server";
import CommentThread from "./CommentThread";

type PageProps = {
  params: Promise<{
    postId: string;
  }>;
};

export default async function PostPage({ params }: PageProps) {
  const { postId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: post, error: postError } = await supabase
    .from("banter_posts")
    .select("id, user_id, content, is_pinned, created_at")
    .eq("id", postId)
    .maybeSingle();

  if (postError || !post) {
    notFound();
  }

  const { data: authorProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", post.user_id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  const displayName =
    authorProfile?.display_name?.trim() || "Racepicks Player";

  const formattedDate = new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(post.created_at));

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Navbar />

        <section className="mx-auto max-w-3xl py-10 sm:py-14">
          <Link
            href="/banter"
            className="text-sm font-bold text-zinc-500 transition hover:text-orange-500"
          >
            ← Back to Banter
          </Link>

          <div
            className={`mt-8 rounded-3xl border p-6 ${
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

            <div className="flex items-center gap-2">
              <p className="font-black">{displayName}</p>
              <p className="text-xs text-zinc-600">
                · {formattedDate}
              </p>
            </div>

            <p className="mt-3 whitespace-pre-wrap break-words text-lg leading-7 text-zinc-100">
              {post.content}
            </p>
          </div>

          <CommentThread
            postId={post.id}
            currentUserId={user.id}
            isAdmin={isAdmin}
          />
        </section>
      </div>
    </main>
  );
}