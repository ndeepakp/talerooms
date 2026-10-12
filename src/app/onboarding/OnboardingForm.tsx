"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Genre = { id: number; name: string };

const MIN_GENRES = 3;

export function OnboardingForm({ genres, initialName }: { genres: Genre[]; initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Realtime handle availability: { user, available } for the latest checked
  // handle. Derived display compares against the current input.
  const [avail, setAvail] = useState<{ user: string; available: boolean } | null>(null);

  const handle = username.trim();
  useEffect(() => {
    if (handle.length < 3) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      let res;
      try { res = await fetch(`/api/username-check?u=${encodeURIComponent(handle)}`); }
      catch { if (!cancelled) setAvail(null); return; }
      const data = await res.json().catch(() => ({}));
      if (!cancelled) setAvail({ user: handle, available: !!data.available });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [handle]);

  // What to show under the handle field.
  const handleHint =
    handle.length === 0
      ? null
      : handle.length < 3
        ? { text: "Handles are at least 3 characters.", tone: "muted" as const }
        : avail?.user === handle
          ? avail.available
            ? { text: `$${handle} is available`, tone: "ok" as const }
            : { text: `$${handle} is already taken`, tone: "bad" as const }
          : { text: "Checking availability…", tone: "muted" as const };

  function toggleGenre(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (selected.length < MIN_GENRES) {
      setError(`Please pick at least ${MIN_GENRES} genres you enjoy.`);
      return;
    }

    setLoading(true);

    try {
    // Check the handle is free before saving the profile.
    const check = await fetch(`/api/username-check?u=${encodeURIComponent(username)}`);
    const checkData = await check.json().catch(() => ({}));
    if (!checkData.available) {
      setLoading(false);
      setError(checkData.error ?? `$${username} is already taken.`);
      return;
    }

    const res = await fetch("/api/me/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, bio: "", genreIds: selected }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save your profile.");
      return;
    }

    router.push("/feed");
    router.refresh();
    } catch { setError("Could not connect. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--page)] px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold text-ink">
          Make yourself at home
        </h1>
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <Field label="Display name" value={name} onChange={setName} type="text" placeholder="Jane Writer" />

          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-sm font-medium text-ink-soft">Handle</span>
            <div className="flex items-center rounded-lg border border-ui-strong bg-surface-raised pl-3 focus-within:border-zinc-900 dark:bg-zinc-950 dark:focus-within:border-ui-strong">
              <span className="text-muted">$</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^A-Za-z0-9_]/g, ""))}
                placeholder="JaneWriter"
                required
                minLength={3}
                maxLength={20}
                className="h-11 flex-1 bg-transparent px-1 text-ink outline-none dark:text-zinc-100"
              />
            </div>
            {handleHint ? (
              <span
                className={
                  "text-xs " +
                  (handleHint.tone === "ok"
                    ? "text-success"
                    : handleHint.tone === "bad"
                      ? "text-danger"
                      : "text-muted")
                }
              >
                {handleHint.text}
              </span>
            ) : (
              <span className="text-xs text-muted">
                People find you with ${username || "handle"}.
              </span>
            )}
          </label>


          <div className="flex flex-col gap-2 text-left">
            <span className="text-sm font-medium text-ink-soft">
              Favourite genres{" "}
              <span className="font-normal text-muted">
                (pick at least {MIN_GENRES} — {selected.length} selected)
              </span>
            </span>
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => {
                const active = selected.includes(g.id);
                return (
                  <button
                    type="button"
                    key={g.id}
                    aria-pressed={active}
                    onClick={() => toggleGenre(g.id)}
                    className={
                      "rounded-full border px-3 py-1.5 text-sm transition-colors " +
                      (active
                        ? "chip-active"
                        : "border-ui-strong text-ink-soft hover:bg-surface-soft")
                    }
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading || handleHint?.tone === "bad"}
            className="mt-2 h-12 rounded-full btn-primary font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Saving…" : "Join the reading room"}
          </button>
        </form>

      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="text-sm font-medium text-ink-soft">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="h-11 rounded-lg border border-ui-strong bg-surface-raised px-3 text-ink outline-none focus:border-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-ui-strong"
      />
    </label>
  );
}
