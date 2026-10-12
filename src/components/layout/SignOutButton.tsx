"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await signOut();
        router.refresh();
      }}
      className="h-11 rounded-full border border-ui-strong px-5 font-medium text-ink transition-colors hover:bg-surface-soft"
    >
      Sign out
    </button>
  );
}
