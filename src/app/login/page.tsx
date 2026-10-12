import { LoginForm } from "./LoginForm";
import { googleAuthEnabled } from "@/lib/auth-config";
export const dynamic = "force-dynamic";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <LoginForm googleEnabled={googleAuthEnabled()} googleError={Boolean(error)}/>;
}
