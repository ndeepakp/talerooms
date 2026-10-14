import { mutation, service, walletJson, walletRoute } from '@/lib/wallet/http';
import { walletOrigin } from '@/lib/wallet/policy';
import { limitWallet } from '@/lib/wallet/limits';
export const POST = walletRoute(async request => {
  const { session, body } = await mutation(request);
  await limitWallet(session.user.id, 'onboarding');
  return walletJson({ url: await service().onboarding(session.user.id, session.user.email, body.country, walletOrigin()) });
});
