# Chapter purchase discoverability — 2026-10-14

## Change

Reader feedback identified a missing purchase path when opening a locked chapter. Chapter lists and the reading room now show a contextual unlock link with the first available individual chapter price, access duration and an explicit demo/no-charge notice. If only a story bundle is available, the action says “Unlock with whole story” and explains that all chapters are included. Unavailable prices do not create a purchase link. Signed-out readers receive a sign-in action; free, purchased, author and subscriber access do not receive unlock prompts.

The link navigates to `?chapter=N&buy=N#chapter-access`. The server validates the target index and the panel selects that locked chapter and its first available price duration. This parameter never grants access. The existing purchase handler still recalculates quotes and grants access; private bodies remain null in the locked client reader. Renewal prices use the existing server discount. Changing duration clears the selection; effective selections exclude chapters that have become owned.

## Validation

- 145 standard tests passed; five opt-in integration tests passed separately.
- Contextual tests cover chapter-specific links, renewal/permanent/free pricing, whole-story-only and unavailable offers, no unlock action for free/purchased entries, no nested links, exact chapter preselection, correct duration and mock request payload, and owned target rejection.
- Existing mock-payment tests cover invalid requests, server-priced grants, concurrency, cancellation, expiry/renewal and no real wallet credit.
- Browser checks: 1280px desktop, 390px mobile, 320px narrow mobile. Unlock navigation selected chapter 2 and displayed the matching price. No horizontal page overflow; adjusted mobile anchor spacing to clear the fixed header.
- A real local HTTP mock purchase returned 200 with the server-calculated S$20 price. The browser showed chapter 1 as Purchased with readable text and no unlock action; chapter 2 remained locked with its contextual action.
- Signed-out public page showed the preview and a sign-in action beside the locked chapter.
- Lint, TypeScript and the production build passed.
- Synthetic fixtures were retired to drafts and the QA author's settings restored. No real charges or payouts were performed.

## Delivery

Local implementation only. Push/deployment and live Stripe checkout remain separate pending work.
