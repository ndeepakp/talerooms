"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENCY } from "@/lib/pricing";
import { AvatarUpload } from "@/components/profile/AvatarUpload";

type Genre = { id: number; name: string };

type Profile = {
  id: string;
  name: string;
  username: string;
  bio: string;
  about: string;
  subscriptionPrice: number | null;
  image: string | null;
  genreIds: number[];
};

const MAX_ABOUT = 2000;

const MIN_GENRES = 3;

export function ProfileForm({
  genres,
  profile,
}: {
  genres: Genre[];
  profile: Profile;
}) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [about, setAbout] = useState(profile.about);
  const [subscriptionPrice, setSubscriptionPrice] = useState(
    profile.subscriptionPrice ? String(profile.subscriptionPrice) : "",
  );
  const [selected, setSelected] = useState<number[]>(profile.genreIds);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    const res = await fetch("/api/me/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        username,
        bio,
        about,
        subscriptionPrice: subscriptionPrice ? Number(subscriptionPrice) : 0,
        genreIds: selected,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save your profile.");
      return;
    }

    router.push(`/${username || profile.id}`);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--page)] px-6 py-12">
      <div className="mx-auto w-full max-w-lg">
        <h1 className="text-2xl font-bold text-ink">
          Edit profile
        </h1>

        <div className="mt-8">
          <span className="text-sm font-medium text-ink-soft">
            Profile picture
          </span>
          <div className="mt-2">
            <AvatarUpload name={profile.name} initialImage={profile.image} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-sm font-medium text-ink-soft">
              Display name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11 rounded-lg border border-ui-strong bg-surface-raised px-3 text-ink outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-sm font-medium text-ink-soft">
              Handle
            </span>
            <div className="flex items-center rounded-lg border border-ui-strong bg-surface-raised pl-3 focus-within:border-accent">
              <span className="text-muted">$</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^A-Za-z0-9_]/g, ""))}
                required
                placeholder="Deepak"
                className="h-11 flex-1 bg-transparent px-1 text-ink outline-none"
              />
            </div>
            <span className="text-xs text-muted">
              3–20 letters, numbers, or underscores. People find you with ${username || "handle"}.
            </span>
          </label>

          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-sm font-medium text-ink-soft">
              Status <span className="font-normal text-muted">(optional)</span>
            </span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="A short line that captures your current mood or status."
              className="rounded-lg border border-ui-strong bg-surface-raised p-3 text-ink outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-left">
            <span className="flex items-center justify-between text-sm font-medium text-ink-soft">
              <span>
                About <span className="font-normal text-muted">(optional)</span>
              </span>
              <span className="font-normal text-muted">
                {about.length}/{MAX_ABOUT}
              </span>
            </span>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={6}
              maxLength={MAX_ABOUT}
              placeholder="Tell readers more about you — your motto, what drives you, your day-to-day, hobbies and interests."
              className="rounded-lg border border-ui-strong bg-surface-raised p-3 text-ink outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-left">
            <span className="text-sm font-medium text-ink-soft">
              Subscription price{" "}
              <span className="font-normal text-muted">(optional)</span>
            </span>
            <div className="flex items-center rounded-lg border border-ui-strong bg-surface-raised pl-3 focus-within:border-accent">
              <span className="text-muted">{CURRENCY}</span>
              <input
                type="number"
                min={0}
                value={subscriptionPrice}
                onChange={(e) => setSubscriptionPrice(e.target.value)}
                placeholder="0"
                className="h-11 flex-1 bg-transparent px-2 text-ink outline-none"
              />
              <span className="px-3 text-sm text-muted">/ 30 days</span>
            </div>
            <span className="text-xs text-muted">
              Set a price to offer a subscription. Subscribers can read all your
              private chapters while their subscription is active. Leave blank or
              0 to not offer one.
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
            disabled={loading}
            className="mt-2 h-12 rounded-full btn-primary font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
