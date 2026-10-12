import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function sendVerificationCode({ email, otp }: { email: string; otp: string }) {
  // Explicit local-only sink, restricted to reserved synthetic addresses. Never
  // return a code to the browser or write codes into application logs.
  if (process.env.NODE_ENV !== "production" && process.env.AUTH_EMAIL_MODE === "local-test") {
    if (!/^[^@\s]+@example\.test$/.test(email)) throw new Error("Local email testing accepts example.test addresses only.");
    const directory = process.env.AUTH_EMAIL_TEST_DIR || "/private/tmp/talerooms-auth-mail";
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(join(directory, createHash("sha256").update(email).digest("hex") + ".json"),
      JSON.stringify({ email, otp }), { mode: 0o600 });
    return;
  }
  if (!process.env.RESEND_API_KEY || !process.env.AUTH_EMAIL_FROM) {
    throw new Error("Verification email delivery is not configured.");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM,
      to: [email],
      subject: "Your Talerooms verification code",
      text: `Your Talerooms verification code is ${otp}. It expires in 5 minutes. Never share this code. If you did not request it, ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px"><h1>Verify your email</h1><p>One more step to your reading room.</p><p style="font-size:32px;letter-spacing:6px;font-weight:bold">${otp}</p><p>This code expires in 5 minutes. Never share it.</p><p>If you did not request this code, ignore this email.</p><p>Talerooms · Where stories find their people.</p></div>`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  // Do not log recipient addresses, codes, provider responses or credentials.
  if (!response.ok) throw new Error("Verification email delivery failed. Please try again.");
}
