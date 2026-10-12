import { SignupForm } from "./SignupForm";
import { googleAuthEnabled, verificationEmailEnabled } from "@/lib/auth-config";
export const dynamic = "force-dynamic";
export default function SignupPage() {
  return <SignupForm googleEnabled={googleAuthEnabled()} emailEnabled={verificationEmailEnabled()}/>;
}
