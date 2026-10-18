"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MentionInput } from "@/components/post/MentionInput";

export function PostComposer({
  placeholder = "Share something about stories… type @ to tag a person or story",
  attachStory,
  answer,
  onPosted,
}: {
  placeholder?: string;
  // When set, the post is automatically linked to this story (shown as a chip,
  // and the story link token is prepended to the body on submit).
  attachStory?: { id: string; slug?: string | null; title: string };
  // When set, the post is a reader's answer to a chapter's discussion prompt —
  // it's tagged with the story/chapter/prompt (no story link token needed).
  answer?: { storyId: string; chapterIndex: number; prompt: string };
  onPosted?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy || !body.trim()) return;
    setBusy(true);
    setError(null);
    const fullBody =
      attachStory && !answer
        ? `[${attachStory.title}](/stories/${attachStory.slug ?? attachStory.id}) ${body}`
        : body;
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: fullBody,
        ...(answer
          ? {
              answerStoryId: answer.storyId,
              answerChapter: answer.chapterIndex,
              answerPrompt: answer.prompt,
            }
          : {}),
      }),
    });
    setBusy(false);
    if (res.ok) {
      setBody("");
      onPosted?.();
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not post.");
    }
  }

  return (
    <div className="rounded-2xl border border-ui bg-surface-raised p-4 sm:p-5">
      {answer ? (
        <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
          <span aria-hidden="true">💬</span>
          Answering: “{answer.prompt}”
        </p>
      ) : (
        attachStory && (
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            <span aria-hidden="true">📖</span>
            About “{attachStory.title}”
          </p>
        )
      )}
      <MentionInput
        value={body}
        onChange={setBody}
        onSubmit={submit}
        rows={3}
        maxLength={2000}
        placeholder={answer ? "Write your answer… type @ to tag someone" : placeholder}
        className="block min-h-28 w-full resize-y rounded-xl border border-ui bg-surface px-4 py-3 text-sm leading-6 text-ink outline-none focus:border-accent"
      />
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="hidden text-xs text-subtle sm:inline">
          Tip: press Ctrl + Enter to post
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !body.trim()}
          className="btn-primary ml-auto inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2 text-sm font-medium disabled:opacity-50"
        >
          {answer ? "Post answer" : "Post"}
        </button>
      </div>
    </div>
  );
}
