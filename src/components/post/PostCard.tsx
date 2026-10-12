"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/layout/Avatar";
import { PostBody } from "@/components/post/PostBody";
import type { PostRow } from "@/lib/posts";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  author: string | null;
  handle: string | null;
  image: string | null;
};

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function PostCard({ post }: { post: PostRow }) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  // Answer posts are veiled (possible spoilers) until revealed — except your own.
  const [revealed, setRevealed] = useState(post.mine);

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    if (!res.ok) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }

  async function loadComments() {
    const res = await fetch(`/api/posts/${post.id}/comments`);
    if (res.ok) setComments((await res.json()).comments);
  }

  function toggleComments() {
    setOpen((o) => !o);
    if (comments === null) loadComments();
  }

  async function addComment() {
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    const res = await fetch(`/api/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    setBusy(false);
    if (res.ok) {
      setDraft("");
      setCommentCount((c) => c + 1);
      await loadComments();
    }
  }

  async function remove() {
    if (!window.confirm("Delete this post?")) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="rounded-2xl border border-ui bg-surface-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/${post.handle ?? post.author_id}`} aria-label={`${post.author ?? "Author"}'s profile`}>
            <Avatar src={post.image} name={post.author} size={36} />
          </Link>
          <div>
            <Link
              href={`/${post.handle ?? post.author_id}`}
              className="text-sm font-medium text-ink hover:underline"
            >
              {post.author ?? "Someone"}
            </Link>
            <p className="text-xs text-subtle">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        {post.mine && (
          <button
            type="button"
            onClick={remove}
            className="text-xs text-subtle hover:text-danger"
          >
            Delete
          </button>
        )}
      </div>

      {post.answer_prompt ? (
        <div className="mt-3">
          <p className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            <span aria-hidden="true">💬</span>
            Answering: “{post.answer_prompt}”
          </p>
          {post.answer_story_id && (
            <Link
              href={`/stories/${post.answer_story_slug ?? post.answer_story_id}?chapter=${post.answer_chapter ?? 0}`}
              className="mb-2 block text-xs text-muted hover:underline"
            >
              📖 {post.answer_story_title ?? "the story"} · Chapter{" "}
              {(post.answer_chapter ?? 0) + 1} →
            </Link>
          )}
          {revealed ? (
            <PostBody text={post.body} />
          ) : (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="flex w-full flex-col items-center gap-0.5 rounded-lg border border-dashed border-ui-strong bg-surface-soft px-3 py-5 text-center hover:bg-surface-soft"
            >
              <span className="text-sm text-muted">
                🙈 Chapter {(post.answer_chapter ?? 0) + 1} answer — may contain spoilers
              </span>
              <span className="text-xs font-medium text-accent">Tap to reveal</span>
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <PostBody text={post.body} />
        </div>
      )}

      <div className="mt-3 flex items-center gap-5 text-sm text-muted">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
          className={
            "inline-flex items-center gap-1.5 transition-colors " +
            (liked ? "text-danger" : "hover:text-danger")
          }
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={liked ? "scale-110 transition-transform" : "transition-transform"}
          >
            <path d="M12 20.5l-1.45-1.32C5.4 14.5 2 11.4 2 7.6 2 4.5 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 19.58 2 22 4.5 22 7.6c0 3.8-3.4 6.9-8.55 11.59L12 20.5z" />
          </svg>
          {likeCount}
        </button>
        <button
          type="button"
          onClick={toggleComments}
          className="inline-flex items-center gap-1.5 hover:text-ink-soft"
        >
          <span aria-hidden="true">💬</span> {commentCount}
        </button>
      </div>

      {open && (
        <div className="mt-3 border-t border-ui pt-3">
          {comments === null ? (
            <p className="text-xs text-subtle">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-subtle">No comments yet — be the first.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {comments.map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  <Avatar src={c.image} name={c.author} size={26} />
                  <div className="min-w-0 rounded-lg bg-surface-soft px-3 py-1.5">
                    <Link
                      href={`/${c.handle ?? ""}`}
                      className="text-xs font-medium text-ink hover:underline"
                    >
                      {c.author ?? "Someone"}
                    </Link>
                    <p className="whitespace-pre-wrap break-words text-sm text-ink-soft">
                      {c.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addComment();
                }
              }}
              maxLength={1000}
              placeholder="Write a comment…"
              className="min-h-11 min-w-0 flex-1 rounded-full border border-ui-strong bg-surface-raised px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={addComment}
              disabled={busy || !draft.trim()}
              className="min-h-11 shrink-0 rounded-full btn-primary px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
