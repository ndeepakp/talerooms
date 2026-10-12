"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient, signOut } from "@/lib/auth-client";

function verificationError(code?: string, message?: string) {
  if (code === "OTP_EXPIRED") return "That code has expired. Request a new one.";
  if (code === "INVALID_OTP") return "That code is incorrect or no longer valid. Check the newest email.";
  if (code === "TOO_MANY_ATTEMPTS") return "Too many incorrect attempts. Request a new code.";
  if (code === "TOO_MANY_REQUESTS") return "Please wait before trying again. Resend is limited to protect your account.";
  return message || "Could not complete verification. Please try again.";
}

export function VerificationForm({ email, deliveryEnabled, graceUntil }: { email: string; deliveryEnabled: boolean; graceUntil: string | null }) {
  const router = useRouter();
  const [target, setTarget] = useState(email);
  const [changing, setChanging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  async function sendCode(destination = target, correctEmail = changing) {
    setBusy(true); setError(null); setMessage(null);
    try {
      const result = correctEmail
        ? await authClient.emailOtp.requestEmailChange({ newEmail: destination })
        : await authClient.emailOtp.sendVerificationOtp({ email: destination, type: "email-verification" });
      if (result.error) { setError(verificationError(result.error.code, result.error.message)); if (result.error.status === 429) setCooldown(60); return; }
      setTarget(destination); setChanging(correctEmail); setEditing(false); setOtp(""); setCooldown(60);
      setMessage("Code sent. Check your inbox and spam folder. Only the newest code works.");
    } catch { setError("Could not connect. Please try again."); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (!started.current && deliveryEnabled) { started.current = true; void sendCode(email, false); }
    // One initial send per visit; retries are explicit and server-limited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  return <main className="flex min-h-screen items-center justify-center px-6 py-12">
    <div className="w-full max-w-sm">
      <p className="mb-3 text-sm font-medium text-accent">One more step to your reading room</p>
      <h1 className="text-3xl font-bold text-ink">Verify your email</h1>
      <p className="mt-4 break-words text-sm leading-6 text-muted">Enter the six-digit code sent to <strong className="text-ink">{target}</strong>. It expires in 5 minutes.</p>
      <p className="mt-2 text-sm leading-6 text-muted">{graceUntil ? "Verify now to keep your access after the transition period." : "Your account stays inactive until verification is complete."}</p>
      {graceUntil && <p className="mt-4 rounded-xl border border-warning bg-warning-soft p-3 text-sm text-warning">Your existing account keeps access until {new Date(graceUntil).toLocaleDateString("en-GB", { timeZone: "UTC" })}. Verify before then to keep using Talerooms.</p>}
      {!deliveryEnabled && <p role="alert" className="mt-4 text-sm text-warning">Email delivery is temporarily unavailable. Your account is saved; log in again to continue when delivery is available.</p>}
      <form className="mt-6 flex flex-col gap-4" onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError(null); setMessage(null);
        try {
          const result = changing ? await authClient.emailOtp.changeEmail({ newEmail: target, otp }) : await authClient.emailOtp.verifyEmail({ email, otp });
          if (result.error) { setError(verificationError(result.error.code, result.error.message)); return; }
          router.replace("/auth/complete"); router.refresh();
        } catch { setError("Could not connect. Please try again."); }
        finally { setBusy(false); }
      }}>
        <label className="flex flex-col gap-2 text-sm text-ink-soft">Verification code
          <input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,""))} className="h-14 w-full rounded-xl border border-ui-strong bg-surface-raised px-4 text-center text-2xl tracking-[.3em] text-ink"/>
        </label>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {message && <p role="status" className="text-sm text-success">{message}</p>}
        <button disabled={busy || otp.length!==6 || !deliveryEnabled} className="min-h-12 rounded-full btn-primary px-4 py-3 font-medium disabled:opacity-50">{busy ? "Working…" : "Verify and continue"}</button>
      </form>
      <button type="button" disabled={busy || cooldown>0 || !deliveryEnabled} onClick={()=>void sendCode()} className="mt-4 min-h-11 w-full rounded-full border border-ui-strong px-3 text-sm text-ink disabled:opacity-50">{cooldown>0 ? `Resend in ${cooldown}s` : "Resend code"}</button>
      <button type="button" onClick={()=>setEditing(v=>!v)} className="mt-3 min-h-11 text-sm text-ink underline">Wrong email address?</button>
      {editing && <form className="mt-3 flex flex-col gap-3" onSubmit={e=>{e.preventDefault();void sendCode(newEmail.trim().toLowerCase(),true);}}>
        <label className="flex flex-col gap-2 text-sm text-ink-soft">Correct email address<input type="email" autoComplete="email" required maxLength={254} value={newEmail} onChange={e=>setNewEmail(e.target.value)} className="h-12 rounded-lg border border-ui-strong bg-surface-raised px-3 text-ink"/></label>
        <p className="text-xs text-muted">Your email changes only after you verify a code sent to the new address. If your session is too old, log out and log in again first.</p>
        <button disabled={busy || cooldown>0 || !deliveryEnabled} className="min-h-11 rounded-full border border-ui-strong text-sm text-ink disabled:opacity-50">Send code to this address</button>
      </form>}
      <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-muted">
        <Link href="/" className="min-h-11 content-center underline">Browse public stories</Link>
        <button type="button" className="min-h-11 underline" onClick={async()=>{await signOut();router.replace("/login");router.refresh();}}>Sign out</button>
      </div>
    </div>
  </main>;
}
