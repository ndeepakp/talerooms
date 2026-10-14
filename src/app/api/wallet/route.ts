import { requireSession } from '@/lib/http';
import { walletConfiguration } from '@/lib/wallet/service';
import { service, walletJson, walletRoute } from '@/lib/wallet/http';
import { limitWallet } from '@/lib/wallet/limits';
export const GET = walletRoute(async () => {
  const session = await requireSession();
  const configuration = walletConfiguration();
  if (configuration.configured) await limitWallet(session.user.id, 'read');
  return walletJson({ ...configuration, ...(configuration.configured ? await service().read(session.user.id) : { account: null, snapshot: null, withdrawals: [], canWithdraw: false }) });
});
