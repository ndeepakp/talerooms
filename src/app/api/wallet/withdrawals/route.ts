import { mutation, service, walletJson, walletRoute } from '@/lib/wallet/http';
import { limitWallet } from '@/lib/wallet/limits';
export const POST = walletRoute(async request => {
  const { session, body } = await mutation(request);
  await limitWallet(session.user.id, 'withdraw');
  const row = await service().withdraw(session.user.id, body);
  return walletJson({ withdrawal: row }, 200);
});
