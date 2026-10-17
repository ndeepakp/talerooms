"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Genre = { id: number; name: string };

const MIN_GENRES = 3;

export function OnboardingForm({ genres, initialName }: { genres: Genre[]; initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const handleInput = useRef<HTMLInputElement>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; handle?: string }>({});
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
    const errors = {
      name: name.trim() ? undefined : "What should we call you? Enter your display name.",
      handle: !handle ? "Choose a handle so readers can find you."
        : !/^[A-Za-z0-9_]{3,20}$/.test(handle) ? "Use 3–20 letters, numbers or underscores." : undefined,
    };
    setFieldErrors(errors);
    if (errors.name || errors.handle) {
      (errors.name ? nameInput : handleInput).current?.focus();
      return;
    }

    if (selected.length < MIN_GENRES) {
      setError(`Please pick at least ${MIN_GENRES} genres you enjoy.`);
      return;
    }

    setLoading(true);

    try {
    // Check the handle is free before saving the profile.
    const check = await fetch(`/api/username-check?u=${encodeURIComponent(handle)}`);
    const checkData = await check.json().catch(() => ({}));
    if (!checkData.available) {
      setLoading(false);
      setFieldErrors({ handle: checkData.error ?? `$${handle} is already taken. Try another handle.` });
      handleInput.current?.focus();
      return;
    }

    const res = await fetch("/api/me/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), username: handle, bio: "", genreIds: selected }),
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
        <form noValidate onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <Field label="Display name" value={name} inputRef={nameInput} error={fieldErrors.name}
            onChange={(value) => { setName(value); setFieldErrors((prev) => ({ ...prev, name: undefined })); }}
            type="text" placeholder="Jane Writer" />

          <label className="flex flex-col gap-1.5 text-left">
            <span id="onboarding-handle-label" className="text-sm font-medium text-ink-soft">Handle</span>
            <div className="onboarding-input-shell flex items-center gap-1 rounded-xl border border-ui-strong bg-surface-raised px-3" data-invalid={!!fieldErrors.handle || handleHint?.tone === "bad"}>
              <span aria-hidden="true" className="select-none text-muted">$</span>
              <input
                ref={handleInput}
                type="text"
                name="username"
                aria-labelledby="onboarding-handle-label"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-describedby="onboarding-handle-hint"
                aria-invalid={!!fieldErrors.handle || handleHint?.tone === "bad"}
                value={username}
                onChange={(e) => { setUsername(e.target.value.replace(/[^A-Za-z0-9_]/g, "")); setFieldErrors((prev) => ({ ...prev, handle: undefined })); }}
                placeholder="JaneWriter"
                required
                minLength={3}
                maxLength={20}
                className="h-12 min-w-0 flex-1 bg-transparent text-ink placeholder:text-subtle"
              />
            </div>
            <span id="onboarding-handle-hint" aria-live="polite" className={
              "text-xs leading-relaxed " + (fieldErrors.handle || handleHint?.tone === "bad"
                ? "text-danger" : handleHint?.tone === "ok" ? "text-success" : "text-muted")
            }>
              {fieldErrors.handle ?? handleHint?.text ?? "Your unique name on Talerooms. Letters, numbers and underscores."}
            </span>
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

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
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
  inputRef,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  placeholder?: string;
  inputRef: React.Ref<HTMLInputElement>;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span id="onboarding-name-label" className="text-sm font-medium text-ink-soft">{label}</span>
      <div className="onboarding-input-shell rounded-xl border border-ui-strong bg-surface-raised px-3" data-invalid={!!error}>
        <input
          ref={inputRef}
          aria-labelledby="onboarding-name-label"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          autoComplete="name"
          aria-invalid={!!error}
          aria-describedby={error ? "onboarding-name-error" : undefined}
          className="h-12 w-full min-w-0 bg-transparent text-ink placeholder:text-subtle"
        />
      </div>
      {error && <span id="onboarding-name-error" role="alert" className="text-xs leading-relaxed text-danger">{error}</span>}
    </label>
  );
}
