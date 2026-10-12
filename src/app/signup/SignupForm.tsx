"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { GoogleButton } from "@/components/auth/GoogleButton";

export function SignupForm({ googleEnabled, emailEnabled }: { googleEnabled: boolean; emailEnabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return <main className="flex min-h-screen items-center justify-center px-6 py-12">
    <div className="w-full max-w-sm">
      <h1 className="text-center text-3xl font-bold text-ink">Find your people.</h1>
      <p className="mt-3 text-center text-sm text-muted">Create your Talerooms account. Your email is verified before you join the reading room.</p>
      <GoogleButton enabled={googleEnabled}/>
      <form className="flex flex-col gap-4" onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError(null);
        const form = new FormData(e.currentTarget);
        try {
          const result = await signUp.email({ name: String(form.get("name")).trim(), email: String(form.get("email")).trim(), password: String(form.get("password")) });
          if (result.error) { setError(result.error.message ?? "Could not create your account. If you already have one, log in to continue."); setBusy(false); return; }
          router.push("/verify-email"); router.refresh();
        } catch { setError("Could not connect. Please try again."); setBusy(false); }
      }}>
        <label className="flex flex-col gap-2 text-sm text-ink-soft">Display name<input name="name" autoComplete="name" required maxLength={100} className="h-12 rounded-lg border border-ui-strong bg-surface-raised px-3 text-ink"/></label>
        <label className="flex flex-col gap-2 text-sm text-ink-soft">Email<input name="email" type="email" autoComplete="email" required maxLength={254} className="h-12 rounded-lg border border-ui-strong bg-surface-raised px-3 text-ink"/></label>
        <label className="flex flex-col gap-2 text-sm text-ink-soft">Password<input name="password" type="password" autoComplete="new-password" minLength={8} required className="h-12 rounded-lg border border-ui-strong bg-surface-raised px-3 text-ink"/></label>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {!emailEnabled && <p className="text-sm text-warning">Email signup is temporarily unavailable. Please try again later.</p>}
        <button disabled={busy || !emailEnabled} className="min-h-12 rounded-full btn-primary px-4 py-3 font-medium disabled:opacity-50">{busy ? "Creating your account…" : "Create account"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">Already have an account? <Link href="/login" className="text-ink underline">Log in</Link></p>
    </div>
  </main>;
}
