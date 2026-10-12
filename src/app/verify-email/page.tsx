import { redirect } from "next/navigation";
import { getAccountSession } from "@/lib/account-session";
import { verificationEmailEnabled } from "@/lib/auth-config";
import { VerificationForm } from "./VerificationForm";
export default async function VerificationPage() {
  const session = await getAccountSession();
  if (!session) redirect("/login");
  if (session.user.emailVerified) redirect("/auth/complete");
  return <VerificationForm email={session.user.email} deliveryEnabled={verificationEmailEnabled()}
    graceUntil={session.user.verificationGraceUntil ? new Date(session.user.verificationGraceUntil).toISOString() : null}/>;
}
