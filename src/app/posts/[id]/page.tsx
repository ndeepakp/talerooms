import { notFound } from "next/navigation";
import { requirePageSession } from "@/lib/account-session";
import { getPost } from "@/lib/posts";
import { PostCard } from "@/components/post/PostCard";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePageSession();

  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const post = await getPost(id, session.user.id);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-[var(--page)] px-6 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <PostCard post={post} />
      </div>
    </div>
  );
}
