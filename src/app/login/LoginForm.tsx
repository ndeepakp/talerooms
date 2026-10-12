"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { GoogleButton } from "@/components/auth/GoogleButton";

export function LoginForm({ googleEnabled, googleError }: { googleEnabled: boolean; googleError: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    let result;
    try { result = await signIn.email({ email, password }); }
    catch { setLoading(false); setError("Could not connect. Please try again."); return; }
    const { error } = result;
    setLoading(false);
    if (error) {
      setError(error.message ?? "Invalid email or password.");
      return;
    }
    router.push("/auth/complete");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--page)] px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold text-ink">
          Log in to Talerooms
        </h1>
        <GoogleButton enabled={googleEnabled}/>{googleError && <p role="alert" className="text-sm text-danger">Google sign-in was cancelled or could not complete. If you have an email/password account, log in with it; accounts are not merged automatically.</p>}
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
          <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="Your password" />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-12 rounded-full btn-primary font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          New here?{" "}
          <Link href="/signup" className="font-medium text-ink underline">
            Create an account
          </Link>
        </p>
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
        autoComplete={type === "password" ? "current-password" : "email"}
        className="h-11 rounded-lg border border-ui-strong bg-surface-raised px-3 text-ink outline-none focus:border-accent"
      />
    </label>
  );
}
