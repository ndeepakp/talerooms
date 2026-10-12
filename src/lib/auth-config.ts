export function googleAuthEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function verificationEmailEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM) ||
    (process.env.NODE_ENV !== "production" && process.env.AUTH_EMAIL_MODE === "local-test");
}
