"use client";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";

export function GoogleButton({ enabled }: { enabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <div className="mt-6">
    <button type="button" disabled={!enabled || busy} onClick={async () => {
      setBusy(true); setError(null);
      try {
        const result = await signIn.social({ provider: "google", callbackURL: "/auth/complete", errorCallbackURL: "/login?error=google" });
        if (result.error) { setError("Google sign-in could not complete. Try again, or use email and password."); setBusy(false); }
      } catch { setError("Could not connect. Please try again."); setBusy(false); }
    }} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-ui-strong bg-surface-raised px-4 py-3 font-medium text-ink disabled:opacity-50">
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5ZM12 22c2.7 0 4.9-.9 6.6-2.4l-3.3-2.6c-.9.6-2 .9-3.3.9-2.6 0-4.8-1.7-5.6-4H3v2.7A10 10 0 0 0 12 22ZM6.4 13.9a6 6 0 0 1 0-3.8V7.4H3a10 10 0 0 0 0 9.2l3.4-2.7ZM12 6.1c1.4 0 2.7.5 3.7 1.4l2.8-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.7c.8-2.3 3-4 5.6-4Z"/></svg>
      {busy ? "Connecting to Google…" : "Continue with Google"}
    </button>
    {!enabled && <p className="mt-2 text-center text-xs text-muted">Google sign-in is coming soon.</p>}
    {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-ui"/>or use your email<span className="h-px flex-1 bg-ui"/></div>
  </div>;
}
