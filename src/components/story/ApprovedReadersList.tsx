"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Reader = { user_id: string; name: string | null; handle: string | null; label: string };

// The author's list of readers who have bought access, each with a Revoke
// control that removes ALL of that reader's grants on this story immediately.
export function ApprovedReadersList({
  storyId,
  readers,
}: {
  storyId: string;
  readers: Reader[];
}) {
  const router = useRouter();
  const [list, setList] = useState(readers);
  const [busy, setBusy] = useState<string | null>(null);

  async function revoke(userId: string) {
    setBusy(userId);
    const res = await fetch(`/api/stories/${storyId}/purchase`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setBusy(null);
    if (res.ok) {
      setList((prev) => prev.filter((r) => r.user_id !== userId));
      router.refresh();
    }
  }

  if (list.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-ui bg-surface-soft p-4">
      <p className="text-sm font-medium text-ink-soft">
        Readers with access
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {list.map((r) => (
          <li key={r.user_id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink-soft">
              <Link
                href={`/${r.handle ?? r.user_id}`}
                className="font-medium text-ink hover:underline"
              >
                {r.name ?? "A reader"}
              </Link>{" "}
              <span className="text-muted">· {r.label}</span>
            </span>
            <button
              type="button"
              onClick={() => revoke(r.user_id)}
              disabled={busy === r.user_id}
              className="shrink-0 rounded-full border border-danger px-3 py-1 text-xs font-medium text-danger hover:bg-danger-soft disabled:opacity-50"
            >
              {busy === r.user_id ? "…" : "Revoke"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
