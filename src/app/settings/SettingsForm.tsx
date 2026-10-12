"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { PushToggle } from "@/components/settings/PushToggle";
import { ShelfPreview } from "@/components/settings/ShelfPreview";
import {
  ACCENTS,
  BACKGROUNDS,
  SHELF_STYLES,
  THEME_MODES,
  type AccentColor,
  type Appearance,
  type BackgroundPreset,
  type ShelfStyle,
  type ThemeMode,
} from "@/lib/appearance";

// Apply the chosen look to <html> right away so the change is visible while the
// user is still on this page. Mirrors the inline script in layout.tsx.
function applyLive(a: Pick<Appearance, "themeMode" | "accent" | "background" | "shelf">) {
  const el = document.documentElement;
  el.setAttribute("data-theme-mode", a.themeMode);
  el.setAttribute("data-accent", a.accent);
  el.setAttribute("data-bg", a.background);
  el.setAttribute("data-shelf", a.shelf);
  const dark =
    a.themeMode === "dark" ||
    (a.themeMode === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  el.classList.toggle("dark", dark);
}

export function SettingsForm({
  userId,
  initial,
}: {
  userId: string;
  initial: Appearance;
}) {
  const router = useRouter();
  const [themeMode, setThemeMode] = useState<ThemeMode>(initial.themeMode);
  const [accent, setAccent] = useState<AccentColor>(initial.accent);
  const [background, setBackground] = useState<BackgroundPreset>(initial.background);
  const [shelf, setShelf] = useState<ShelfStyle>(initial.shelf);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Feed wallpaper (uploaded image, shown only on the feed page).
  const [wallpaper, setWallpaper] = useState<string | null>(initial.feedWallpaper);
  const [wpBusy, setWpBusy] = useState(false);
  const [wpError, setWpError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Account deletion (danger zone).
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function uploadWallpaper(file: File) {
    setWpBusy(true);
    setWpError(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/me/wallpaper", { method: "POST", body });
    setWpBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setWpError(data.error ?? "Could not upload that image.");
      return;
    }
    const data = await res.json();
    setWallpaper(data.url);
    router.refresh();
  }

  async function removeWallpaper() {
    setWpBusy(true);
    setWpError(null);
    const res = await fetch("/api/me/wallpaper", { method: "DELETE" });
    setWpBusy(false);
    if (!res.ok) {
      setWpError("Could not remove the wallpaper.");
      return;
    }
    setWallpaper(null);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    const { error } = await authClient.deleteUser({ password: deletePassword });
    if (error) {
      setDeleting(false);
      setDeleteError(
        error.message ??
          "Could not delete your account. Check your password and try again.",
      );
      return;
    }
    // Account is gone and the session is cleared — send them to the login page.
    router.push("/login");
    router.refresh();
  }

  // Reflect every change immediately on the live page.
  useEffect(() => {
    applyLive({ themeMode, accent, background, shelf });
  }, [themeMode, accent, background, shelf]);

  // When in "system" mode, follow the device if it flips light/dark.
  useEffect(() => {
    if (themeMode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyLive({ themeMode, accent, background, shelf });
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [themeMode, accent, background, shelf]);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/me/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeMode, accent, background, shelf }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save your settings.");
      return;
    }
    setSaved(true);
    // Refresh so the server-rendered <html> attributes match what's saved.
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--page)] px-6 py-12">
      <div className="mx-auto w-full max-w-lg">
        <h1 className="text-2xl font-bold text-ink">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Changes preview instantly and save to your account, so they follow you
          to every device.
        </p>

        {/* Quick link to your public profile. */}
        <Link
          href={`/users/${userId}`}
          className="mt-5 inline-flex h-11 items-center rounded-full border border-ui-strong px-5 text-sm font-medium text-ink transition-colors hover:bg-surface-soft"
        >
          View profile
        </Link>

        <h2 className="mt-8 text-lg font-semibold text-ink">
          Notifications
        </h2>
        <div className="mt-4">
          <PushToggle />
        </div>

        <h2 className="mt-8 text-lg font-semibold text-ink">
          Appearance
        </h2>

        {/* Theme mode */}
        <div className="mt-8 flex flex-col gap-2">
          <span className="text-sm font-medium text-ink-soft">
            Theme
          </span>
          <div className="grid grid-cols-3 gap-2">
            {THEME_MODES.map((m) => {
              const active = themeMode === m.id;
              return (
                <button
                  type="button"
                  key={m.id}
                  aria-pressed={active}
                  onClick={() => setThemeMode(m.id)}
                  className={
                    "flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors " +
                    (active
                      ? "border-accent ring-1 ring-[var(--accent)]"
                      : "border-ui-strong hover:bg-surface-soft")
                  }
                >
                  <span className="text-sm font-medium text-ink">
                    {m.label}
                  </span>
                  <span className="text-xs text-muted">{m.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent colour */}
        <div className="mt-6 flex flex-col gap-2">
          <span className="text-sm font-medium text-ink-soft">
            Accent colour
          </span>
          <div className="flex flex-wrap gap-3">
            {ACCENTS.map((a) => {
              const active = accent === a.id;
              return (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => setAccent(a.id)}
                  aria-label={a.label}
                  aria-pressed={active}
                  title={a.label}
                  className={
                    "h-11 w-11 rounded-full transition-transform " +
                    (active
                      ? "ring-2 ring-offset-2 ring-ink ring-offset-[var(--page)]"
                      : "hover:scale-110")
                  }
                  style={{ backgroundColor: a.swatch }}
                />
              );
            })}
          </div>
        </div>

        {/* Background */}
        <div className="mt-6 flex flex-col gap-2">
          <span className="text-sm font-medium text-ink-soft">
            Background
          </span>
          <div className="grid grid-cols-3 gap-2">
            {BACKGROUNDS.map((b) => {
              const active = background === b.id;
              return (
                <button
                  type="button"
                  key={b.id}
                  aria-pressed={active}
                  onClick={() => setBackground(b.id)}
                  className={
                    "rounded-xl border px-3 py-2.5 text-center text-sm font-medium text-ink transition-colors " +
                    (active
                      ? "border-accent ring-1 ring-[var(--accent)]"
                      : "border-ui-strong hover:bg-surface-soft")
                  }
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Library shelf finish — applies to the bookshelf on your Library page. */}
        <div className="mt-6 flex flex-col gap-2">
          <span className="text-sm font-medium text-ink-soft">
            Library shelf{" "}
            <span className="font-normal text-muted">
              (the bookshelf on your{" "}
              <Link href="/library" className="underline">
                Library
              </Link>
              )
            </span>
          </span>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-stretch">
            {/* Live preview of the selected finish. */}
            <ShelfPreview shelf={shelf} />
            <div className="grid w-full min-w-0 flex-1 grid-cols-2 gap-2 sm:w-auto sm:self-center">
              {SHELF_STYLES.map((s) => {
                const active = shelf === s.id;
                return (
                  <button
                    type="button"
                    key={s.id}
                    aria-pressed={active}
                    onClick={() => setShelf(s.id)}
                    className={
                      "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium text-ink transition-colors " +
                      (active
                        ? "border-accent ring-1 ring-[var(--accent)]"
                        : "border-ui-strong hover:bg-surface-soft")
                    }
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-black/10 dark:border-white/15"
                      style={{ background: s.swatch }}
                      aria-hidden="true"
                    />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Feed wallpaper — applies only to the feed page. */}
        <div className="mt-6 flex flex-col gap-2">
          <span className="text-sm font-medium text-ink-soft">
            Feed wallpaper{" "}
            <span className="font-normal text-muted">
              (shown only on your feed)
            </span>
            <span className="ml-2 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
              Beta
            </span>
          </span>
          <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
            Heads up: this feature is in beta. Your wallpaper may be erased after
            you log out, so you might need to upload it again next time.
          </p>

          {wallpaper ? (
            <div className="overflow-hidden rounded-xl border border-ui-strong">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={wallpaper}
                alt="Current feed wallpaper"
                className="h-32 w-full object-cover"
              />
            </div>
          ) : (
            <p className="text-sm text-muted">
              No wallpaper yet — your feed uses the background colour above.
            </p>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadWallpaper(file);
            }}
          />

          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={wpBusy}
              className="h-10 rounded-full border border-ui-strong px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-soft disabled:opacity-50"
            >
              {wpBusy ? "Working…" : wallpaper ? "Replace image" : "Upload image"}
            </button>
            {wallpaper && !wpBusy && (
              <button
                type="button"
                onClick={removeWallpaper}
                className="text-sm text-danger hover:underline"
              >
                Remove
              </button>
            )}
          </div>
          <span className="text-xs text-muted">
            JPG, PNG, WEBP, or GIF, up to 8&nbsp;MB.
          </span>
          {wpError && <p className="text-sm text-danger">{wpError}</p>}
        </div>

        {error && <p className="mt-6 text-sm text-danger">{error}</p>}
        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-12 rounded-full btn-primary px-6 font-medium transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && !saving && (
            <span className="text-sm text-muted">Saved ✓</span>
          )}
        </div>

        {/* Danger zone — permanently delete this account. */}
        <div className="mt-12 border-t border-ui pt-6">
          <h2 className="text-lg font-semibold text-danger">
            Delete account
          </h2>
          <p className="mt-1 text-sm text-muted">
            Permanently deletes your account and everything tied to it — your
            stories, comments, reactions, and follows. This can&apos;t be undone.
          </p>

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="mt-4 h-11 rounded-full border border-danger px-5 text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
            >
              Delete account
            </button>
          ) : (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-danger p-4 ">
              <label className="text-sm font-medium text-ink-soft">
                Enter your password to confirm
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
                className="h-11 w-full rounded-lg border border-ui-strong bg-surface-raised px-3 text-sm text-ink outline-none focus:border-accent"
              />
              {deleteError && <p className="text-sm text-danger">{deleteError}</p>}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={deleteAccount}
                  disabled={deleting || deletePassword.length === 0}
                  className="h-11 rounded-full btn-danger px-5 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Permanently delete"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(false);
                    setDeletePassword("");
                    setDeleteError(null);
                  }}
                  className="text-sm text-muted hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
