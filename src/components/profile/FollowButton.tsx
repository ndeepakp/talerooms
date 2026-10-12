"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FollowButton({
  userId,
  initialFollowing,
  isLoggedIn,
}: {
  userId: string;
  initialFollowing: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/users/${userId}/follow`, {
      method: following ? "DELETE" : "POST",
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setFollowing(data.following);
      // The "N followers" number is rendered by the server component, so ask it
      // to re-fetch and repaint with the new count.
      router.refresh();
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-pressed={following}
      className={
        "min-h-11 rounded-full px-5 text-sm font-medium transition-colors disabled:opacity-50 " +
        (following
          ? "border border-ui-strong text-ink-soft hover:bg-surface-soft"
          : "btn-primary")
      }
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
