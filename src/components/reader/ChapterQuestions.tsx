"use client";

import { useCallback, useEffect, useState } from "react";

type Quiz = {
  id: string;
  prompt: string;
  options: string[];
  myChoice: number | null; // the reader's chosen option, or null
  correct: number | null; // revealed only once answered
};

function QuizItem({
  q,
  storyId,
  chapterIndex,
  reload,
}: {
  q: Quiz;
  storyId: string;
  chapterIndex: number;
  reload: () => void;
}) {
  const answered = q.myChoice !== null;

  async function pick(i: number) {
    if (answered) return; // locked once answered, so the score stays honest
    const res = await fetch(`/api/stories/${storyId}/qna`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterIndex, questionId: q.id, choice: i }),
    });
    if (res.ok) reload();
  }

  return (
    <div>
      <p className="font-medium text-[var(--reader-ink)]">{q.prompt}</p>
      <div className="mt-2 flex flex-col gap-1.5">
        {q.options.map((opt, i) => {
          const isCorrect = answered && q.correct === i;
          const isWrongPick = answered && q.myChoice === i && q.correct !== i;
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => pick(i)}
              className={
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors " +
                (isCorrect
                  ? "border-emerald-500 bg-[color-mix(in_srgb,#10b981_12%,var(--reader-paper))]"
                  : isWrongPick
                    ? "border-red-500 bg-[color-mix(in_srgb,#ef4444_12%,var(--reader-paper))]"
                    : answered
                      ? "border-[var(--reader-border)]"
                      : "border-[var(--reader-border)] hover:bg-[var(--reader-paper)]")
              }
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-[var(--reader-ink)]">{opt}</span>
                {isCorrect && <span className="text-emerald-600 dark:text-emerald-400">✓</span>}
                {isWrongPick && <span className="text-red-600 dark:text-red-400">✗</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ChapterQuestions({
  storyId,
  chapterIndex,
}: {
  storyId: string;
  chapterIndex: number;
}) {
  const [questions, setQuestions] = useState<Quiz[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/stories/${storyId}/qna?chapter=${chapterIndex}`);
    if (res.ok) setQuestions((await res.json()).questions as Quiz[]);
  }, [storyId, chapterIndex]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      load();
    });
    return () => cancelAnimationFrame(raf);
  }, [load]);

  if (!questions || questions.length === 0) return null;

  const answeredAll = questions.every((q) => q.myChoice !== null);
  const score = questions.filter(
    (q) => q.myChoice !== null && q.myChoice === q.correct,
  ).length;

  return (
    <section className="mt-6 rounded-2xl border border-[var(--reader-border)] bg-[var(--reader-paper)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-[var(--reader-ink)]">
          Chapter quiz
        </h4>
        {answeredAll && (
          <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
            You scored {score}/{questions.length} 🎉
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-5">
        {questions.map((q) => (
          <QuizItem
            key={q.id}
            q={q}
            storyId={storyId}
            chapterIndex={chapterIndex}
            reload={load}
          />
        ))}
      </div>
    </section>
  );
}
