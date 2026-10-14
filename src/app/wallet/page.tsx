import { requirePageSession } from '@/lib/account-session';
import { Wallet } from './Wallet';
export const dynamic = 'force-dynamic';
export default async function WalletPage() {
  await requirePageSession();
  return <Wallet />;
}
