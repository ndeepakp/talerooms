# Talerooms Task Tracker

Updated: **2026-10-17**. Complete and validate each task before advancing.

## Current state

- **Active task:** Payments (`TASK-PAY-01`). Stripe sandbox checkout is enabled on the deployed site for user-led manual validation. Live billing and app withdrawals remain disabled; actual-provider end-to-end validation is pending.
- **Latest app commit:** `b7b57c4` — shared form UI corrections and blocked mock subscriptions in Stripe mode.
- **Last recorded production release:** `b7b57c4`, Fly v44 — shared UI corrections; mock subscriptions blocked; Stripe sandbox story/chapter checkout and SG wallet onboarding enabled. Live billing and app withdrawals remain disabled.
- **Validation:** 193 standard tests, 14 local payment/wallet DB tests, lint, TypeScript and the production build passed for v44; 14 deployed release smoke checks passed. UI checks cover 22 representative routes at 320/390/1280px plus signed-out landing and interactive/light/dark states. Actual-provider purchase completion remains pending manual verification.
- **Provider dependency:** Singapore Stripe merchant account, approved author countries and confirmed payout controls are needed for real provider testing. No live charges or payouts are enabled.

Use **Done** to track completed work by date and **Pending** to track the remaining implementation, validation and release steps. A completed portion of an in-progress task does not mark the whole task complete. GitHub delivery and production deployment are tracked separately.

[Done](#done) · [Pending](#pending)

## Done

Checked items describe implemented/validated work or completed planning, with delivery noted separately. Real payments, rewards, language discovery, audio and the under-18 experience are not marked complete.

### 2026-10-17: Shared form UI and subscription correction

**Delivery:** Pushed app commit `b7b57c4` and deployed it as Fly v44.

- [x] Fix text-control focus globally and use a shared container focus treatment for profile/onboarding handles, subscription pricing and library search; preserve keyboard/high-contrast focus.
- [x] Add inline auth/profile validation, first-invalid-field focus, price suffix spacing and consistent numeric controls; fix report touch targets and missing control labels.
- [x] Remove the mock subscription action in Stripe mode and block mock subscription creation/renewal on the server. Existing access is preserved; recurring Stripe billing remains pending.
- [x] Pass 193 standard tests, 14 local payment/wallet database tests, lint and TypeScript. Check 22 representative routes at 320/390/1280px, signed-out landing at all three widths and additional interactive/light/dark states. See [UI validation report](docs/UI_QA_2026-10-17.md).
- [x] Deploy Fly v44, confirm healthy/runtime sandbox configuration, pass 14 release checks and verify the public author profile no longer displays the demo membership sales pitch. New mock subscriptions and mock renewals are rejected with 409.

### 2026-10-17: Deployed sandbox activation and UI polish

**Delivery:** App commit `ce34a28` deployed as Fly v43. User requested sandbox activation and will verify the purchase flow manually. Dedicated test credentials and a connected-account webhook are configured for the deployed site. Checkout and wallet onboarding are enabled for SG; app withdrawals and live billing remain disabled. Full purchase validation remains pending.

- [x] Replace onboarding's overlapping focus outline and native required tooltip with a rounded field focus treatment, associated inline validation and first-invalid-field focus.
- [x] Align story action buttons with matching 44px controls and SVG icons; replace “Your feed” with a clear “Back to feed” link. Apply the same navigation treatment to public stories.
- [x] Validate desktop/320px/390px layouts, collection-picker opening/Escape, TypeScript, targeted lint and 181 standard tests (13 opt-in DB tests skipped in this pass).
- [x] Register a dedicated test-mode connected-account webhook for 11 wallet/checkout events and stage Fly configuration securely. Do not reuse the local CLI webhook secret.
- [x] Confirm Fly v43 healthy, runtime sandbox flags/test-key/signing-secret presence and secure auth origin. Pass 13 release checks, including authenticated checkout, blocked demo purchases and rejected unsigned webhooks.
- [ ] User to complete author onboarding from the deployed wallet and manually verify actual sandbox purchase, signed fulfillment, chapter access and earnings.

### 2026-10-17: Stripe sandbox connection

**Delivery:** App changes pushed as `3887fa5` and deployed as Fly v42. Sandbox credentials remain local. Production Stripe checkout and app withdrawals remain disabled.

- [x] Verify the Singapore Stripe sandbox key without exposing credentials; enable local wallet onboarding for SG while keeping app withdrawals disabled.
- [x] Create an isolated QA author through the app and open actual Stripe-hosted onboarding on desktop/mobile; retries reuse the same connected account.
- [x] Add pinned official Stripe CLI tooling with `npm run stripe:listen`; store its webhook secret only in ignored local settings and reject live-mode forwarding.
- [x] Receive a real signed sandbox `account.updated` event, return 200 and persist the event once.
- [x] Validate authentication/origin/country/signature guards and blocked withdrawals for an incomplete author; pass 145 standard tests, TypeScript and helper lint/syntax checks.
- [x] Prepare feature-gated sandbox order persistence, Stripe Checkout creation, private order status and verified webhook fulfillment. Pass 178 standard tests, 13 DB integration tests, lint, TypeScript and production build. Actual-provider end-to-end purchase remains blocked by author onboarding; production checkout stays disabled.
- [x] Expand stress coverage to 155 standard tests and 10 local database integration tests; pass 22 actual HTTP stress scenarios, 15 route smoke checks, full lint, TypeScript and production build. Check wallet layouts at 320/390/768/1280px and enforce local-only wallet integration testing.

- [x] Apply additive migration `0051`, deploy `3887fa5` as Fly v42, verify application table permissions and pass 13 live smoke checks with production checkout disabled.

**Pending:** The author must complete Stripe onboarding. Provider-observed pending/ready states, bank/payout controls and sandbox checkout/fulfillment remain unverified. SG sandbox testing does not approve international live payouts.

**Evidence:** [Wallet connection and setup](docs/AUTHOR_WALLET.md#local-sandbox-connection--2026-10-17), [sandbox stress validation](docs/STRIPE_CONNECT_QA_2026-10-17.md).

### 2026-10-14: Wallet and mock-payment validation

**Delivery:** Pushed wallet/payment foundation as `62b28ef` and contextual unlocking as `5525982`; deployed together as Fly v41. Real Stripe testing remains pending.

- [x] Official Stripe SDK, mode-checked client, server-owned quotes, currency conversion to minor units and offline direct-charge Checkout parameters.
- [x] Accounts v2 hosted-onboarding API, approved-country gates and account-readiness checks.
- [x] Author wallet with separate pending/available balances, masked bank destinations, recent transactions and withdrawal history.
- [x] Authenticated withdrawal APIs with current email verification, recent sign-in, ownership/balance checks, rate limits, durable reservations and idempotency.
- [x] Signed payout-event reconciliation with durable event IDs and current provider-state retrieval; stale events cannot credit funds.
- [x] Additive migration `db/0050_author_wallet.sql` applied locally.
- [x] Mock checkout regression coverage and fixes for malformed requests, subscription concurrency, stale chapter selections and network-error recovery.
- [x] Verify mock chapter and whole-story purchases, expiry, renewal discounts, subscription cancel/resume and no wallet credit from mock sales.
- [x] Add client confirmation/cancellation, chapter-total, double-click and error-recovery tests plus actual-handler database regression tests.
- [x] Pass 138 standard tests, five local database tests, lint, TypeScript, production build and 17 production-mode HTTP/state checks.
- [x] Check 11 pages at 320/390/1280px; verify purchased chapter access and membership resume/unlocking in the mobile reader.
- [x] Record reader feedback and plan author-controlled rewards, language/audio pilots and age-suitability labels; these features remain pending below.
- [x] Add contextual **Unlock this chapter** links beside locked chapters and inside the reader, showing price, duration and the demo-payment notice. Preselect the requested chapter and an available duration; distinguish whole-story-only offers and signed-out readers.
- [x] Validate contextual purchase navigation at 320/390/1280px, mock purchase access, 145 standard tests, five database integration tests, lint, TypeScript and production build. Delivery: pushed as `5525982` and deployed as Fly v41.

- [x] Apply additive migration `0050` to production, deploy `5525982` as Fly v41 and pass eight live HTTP smoke checks plus desktop/mobile unlock visibility checks.

**Evidence:** [Chapter access QA](docs/CHAPTER_ACCESS_QA_2026-10-14.md), [Payment QA](docs/PAYMENT_QA_2026-10-14.md), [wallet implementation/setup](docs/AUTHOR_WALLET.md).

### 2026-10-13: Security, mobile fixes and payment preparation

- [x] Fix the 320px feed header/avatar layout and extend 16px inputs to phone landscape. Validated 130 local route/viewport/state checks and 15 live public-page checks; deployed as `62c1c39`, Fly v39.
- [x] Update vulnerable runtime dependencies and validate auth/API, editor, document conversion, mobile layouts and native inference. Production dependency audit reduced from 49 findings to zero; five development-only findings remain.
- [x] Deploy the security update as `9913549`, Fly v40; production health and 17 smoke checks passed.
- [x] Prepare Stripe server pricing, minor-unit conversion, offline Checkout parameters and signed-event verification. Foundation tests passed locally; included in the later `62b28ef` push.
- [x] Record Google signup as working based on user confirmation; defer additional provider edge-case checks at the user's request and move to payments.

**Evidence:** [Security update](docs/DEPENDENCY_SECURITY_UPDATE.md), [mobile audit](docs/MOBILE_LAYOUT_AUDIT.md), [payment plan](docs/PAYMENTS_IMPLEMENTATION_PLAN.md).

### 2026-10-12: Signup and verification release

- [x] Validate real Resend OTP delivery and user-completed email verification through onboarding.
- [x] Configure production Google/Resend settings without committing credentials; apply migration `0049`, giving eight existing accounts the agreed 30-day transition.
- [x] Deploy signup/activation, the theme audit and landing-page positioning as `02f3a9b`, Fly v38.
- [x] Pass 17 production smoke checks covering public pages, protected redirects, Google initiation/cancellation presentation and database health.

**Evidence:** [Signup/verification](docs/AUTH_VERIFICATION.md).

### 2026-10-11: Activation rules and landing-page positioning

- [x] Implement Google signup/sign-in, Resend OTP, hashed short-lived codes, resend/attempt limits and interrupted-signup recovery (`TASK-AUTH-01`).
- [x] Enforce fresh account activation state across protected pages/APIs; verify active and inactive reader/account flows, including bookmarking, reviews, community submissions and saved reading position.
- [x] Clarify original stories, author ownership and returning readership in the landing-page introduction (`TASK-PAGE-01`).
- [x] Document the combined parent-managed under-18 plan (`TASK-SAFE-01`); implementation remains pending and last in the order.

**Delivery:** Included in later releases. Local validation at this stage preceded the real-provider checks recorded above.

### 2026-10-09: Theme consistency

- [x] Complete the shared-component/theme audit, semantic status/rating colours, appearance controls and reader-local palettes (`TASK-SYS-05`).
- [x] Validate 42 contrast combinations, 60 responsive route checks, tests, lint and production build. Included in the 2026-10-12 release.

**Evidence:** [Theme audit](docs/THEME_AUDIT.md).

### 2026-10-08: Library, author profiles and mobile audit

- [x] Deliver the library gallery, filters, collection search, saved chapter/page position, explicit completion and new-chapter handling (`TASK-PAGE-07`); deploy `5fe087d`, Fly v36, with migration `0048`.
- [x] Audit all 27 page templates for mobile layout; fix profile overflow, navigation, collections, forms, resume cards and reader hydration.
- [x] Deliver author portfolios, work filters, membership presentation, selected reader notes and owner-only drafts/analytics (`TASK-PAGE-06`).
- [x] Fix long-title/review wrapping and narrow preview positioning; deploy profiles and follow-up mobile fixes as `6cbbf59`, Fly v37.

### 2026-10-07: Discovery feed and writing studio

- [x] Deliver discovery shelves, genre filters, saved-page resume and weekly reading activity/streaks (`TASK-PAGE-04`); deploy through `72e7380`, Fly v33.
- [x] Deliver the stepped Author Studio, chapter manager, focus mode, access presets, save integrity and publication review (`TASK-PAGE-05`); deploy `0536301`, Fly v29.
- [x] Record the admin console/observability scope (`TASK-ADMIN-01`); implementation remains pending after payments.

### 2026-10-05–06: Visual foundations and reading experience

- [x] Deliver editorial typography, brand/navigation, modern shelves/spines and generated cover layouts (`TASK-SYS-01`–`TASK-SYS-04`).
- [x] Deliver the landing page and author-ownership message, cream header and clear navigation (`TASK-PAGE-01`).
- [x] Deliver shared in-place book previews with book-only hover, tap/keyboard controls, saved-chapter links and “A glimpse” wording. Add ordinary copy/selection/drag deterrence for public synopses.
- [x] Deliver reader preferences, focus mode and saved-page restoration (`TASK-PAGE-02`).
- [x] Deliver the editorial story overview, chapter/access list, author sidebar and rating breakdown (`TASK-PAGE-03`).
- [x] Deploy the landing/reader/overview and shared-preview release as `82691f8`, Fly v28.

### Completed task summary

| Task ID | Delivered scope | Current status |
| :--- | :--- | :--- |
| TASK-SYS-01 | Editorial typography | Completed |
| TASK-SYS-02 | Brand identity and responsive navigation | Completed |
| TASK-SYS-03 | Modern shelves and book-spine styling | Completed |
| TASK-SYS-04 | Generated book-cover layouts | Completed |
| TASK-SYS-05 | Semantic surfaces, theme consistency and shared-component audit | Completed; included in deployed auth/theme release |
| TASK-PAGE-01 | Landing positioning, author ownership message and shared in-place book previews | Completed |
| TASK-PAGE-02 | Reader preferences, focus mode and saved-page restoration | Completed |
| TASK-PAGE-03 | Editorial story overview, chapter/access list and ratings | Completed |
| TASK-PAGE-04 | Discovery shelves, genre selection, resume and weekly reading activity | Completed and deployed |
| TASK-PAGE-05 | Stepped writing studio, chapter manager and publication review | Completed and deployed |
| TASK-PAGE-06 | Author portfolio, membership presentation and owner-only drafts/analytics | Completed and deployed |
| TASK-PAGE-07 | Library gallery, filters, saved position and explicit completion | Completed and deployed |
| TASK-AUTH-01 | Google signup/sign-in, Resend email OTP, activation gates and existing-account transition | Implemented and deployed; Google success confirmed by user |

**Clarifications:** Library progress describes saved position rather than inferred words consumed. Book-preview copy controls deter ordinary copying of public synopses; they are not DRM. Paid access and author memberships still use demo checkout until real payments are connected.

**Validation references:** [Signup/verification](docs/AUTH_VERIFICATION.md), [mobile audit](docs/MOBILE_LAYOUT_AUDIT.md), [theme audit](docs/THEME_AUDIT.md), [security update](docs/DEPENDENCY_SECURITY_UPDATE.md).

Older detailed notes remain available in the [dated archive](docs/IMPROVEMENT_TASKS_HISTORY_2026-10-14.md), but the recent done-work record and all pending tasks are tracked here.

## Pending

### Execution order

| Order | Task | Priority | Status |
| :--- | :--- | :--- | :--- |
| 1 | [Payments and chapter-unlock visibility](#task-pay-01-payments-and-chapter-unlock-visibility) | High | In progress; wallet and demo unlocking deployed |
| 2 | [Admin console and observability](#task-admin-01-admin-console-and-observability) | High | Pending |
| 3 | [Reading milestones and author-controlled rewards](#task-eng-01-reading-milestones-and-author-controlled-rewards) | Medium | Planning |
| 4 | [Regional-language discovery pilot](#task-lang-01-regional-language-discovery-pilot) | Medium | Planning |
| 5 | [Author-approved audiobook pilot](#task-audio-01-author-approved-audiobook-pilot) | Medium | Planning |
| 6 | [Protected under-18 experience](#task-safe-01-protected-under-18-experience) | High | Planning; keep last |

Payments must be completed and validated before administration. The protected under-18 experience remains last, after the preceding tasks are validated.

### TASK-PAY-01: Payments and chapter-unlock visibility

**Goal:** Replace demo purchases/subscriptions with verified payment processing and let authors withdraw confirmed earnings from their connected Stripe account.

**Already done:** See the [2026-10-14 checklist](#2026-10-14-wallet-and-mock-payment-validation). The overall payments task remains in progress.

**Remaining implementation:**

- [ ] Distinguish free, purchased, subscriber, expired, demo and unavailable checkout states. Preserve the no-charge notice while billing is mocked.
- [ ] Validate the new order ledger and immutable snapshots through actual Stripe checkout. The gated implementation separates order-linked provider grants from legacy demo grants.
- [ ] Complete actual-provider end-to-end validation of the gated Checkout Session implementation for chapters, whole stories and time-limited access.
- [ ] Add recurring author subscriptions and billing/customer-portal management; align displayed access terms with actual billing periods.
- [ ] Validate the implemented one-time checkout fulfillment with actual Stripe payment/webhook delivery. Extend it for subscriptions, unpaid renewals, refunds and disputes before live billing. Ownership, amount, currency and paid-state checks are implemented; real-provider completion remains pending.
- [ ] Validate the implemented private payment status/return page with actual provider completion; add receipts. Returning from checkout alone must not grant access.

**Provider validation and deployment:**

- [ ] Complete Singapore sandbox author onboarding and confirm each launch author country's eligibility and account capabilities. The platform test key and local Connect webhook connection are validated.
- [ ] Confirm full-Dashboard payout controls and earlier standard withdrawals while daily/weekly automatic payouts remain active. Permanent manual/monthly schedules are blocked by the current app flow.
- [ ] Validate real test-mode onboarding, checkout, subscriptions, settlement, payout delivery/events, failures, cancellation, refunds/disputes and unknown-response retries.
- [ ] Decide platform commission, subscription currency/terms and refund/tax responsibilities before live billing.
- [ ] Validate the new real-checkout flow on desktop/mobile, including purchase discovery, authentication/activation gates and active/expired access.
- [ ] Complete the manual native-confirmation browser check; automated DOM confirmation/cancellation tests already pass.
- [ ] Enable live billing only after provider configuration and validation. Migration `0050` and the demo/wallet release are already deployed; real-checkout deployment checks remain pending.

**Rules:** Funds remain with Stripe. Pending funds cannot be withdrawn. Mock purchases never credit the wallet. Keep currencies separate and authors in control of their work. Initial app withdrawals support INR/USD/EUR/GBP/SGD/AUD/CAD/JPY; the wallet shows recent provider transactions, not a lifetime earnings total. Unknown withdrawals retain reservations and must not be blindly recreated after idempotency expiry.

**References:** [Payment plan](docs/PAYMENTS_IMPLEMENTATION_PLAN.md), [wallet setup and limitations](docs/AUTHOR_WALLET.md), [payment QA](docs/PAYMENT_QA_2026-10-14.md).

### TASK-ADMIN-01: Admin console and observability

**Status:** Pending. Start after payments are completed and validated.

**Goal:** Give authorised administrators control over users/content and a trustworthy view of product activity and operational health.

- [ ] Define admin roles, provisioning, suspension/reactivation semantics and allowed settings/moderation actions.
- [ ] Implement protected admin pages/APIs with server-enforced permissions and an audit trail recording who changed what, when and why.
- [ ] Add searchable user management, verification/account status, session revocation and reversible report/content moderation. Review the existing development-only reindex helper before exposing administrative utilities.
- [ ] Define click events, activity/conversion metrics, timezone, privacy boundaries and retention before collecting analytics. Deduplicate retries and filter bot/test traffic.
- [ ] Capture and aggregate signups, verified/inactive users, active readers/authors, story opens and defined clicks. Distinguish counts from unique users/sessions.
- [ ] Show verified purchases/subscriptions, revenue/refunds and webhook failures; keep financial reporting read-only initially.
- [ ] Build a responsive dashboard with date filters, trends, popular stories/genres, app/database health, errors/latency and failed background work.
- [ ] Validate role escalation, unauthorised access, suspension/session behaviour, moderation reversibility, audit records, metric accuracy and desktop/mobile layouts.

### TASK-ENG-01: Reading milestones and author-controlled rewards

**Status:** Planning. Start after payments and administration.

**Goal:** Encourage returning readers with milestones and optional goals; validate engagement before adding points or paid-content rewards.

- [ ] Define qualifying reading activity, timezone/streak rules, milestone thresholds and duplicate/spam protection.
- [ ] Add accessible badges/goals; a missed day should not erase all accumulated progress. Validate counts, date boundaries and desktop/mobile layouts.
- [ ] Evaluate capped, author-opt-in chapter promotions after payment/access rules are stable. Authors choose chapters, eligibility, duration and limits, and can stop future promotions. No automatic giveaways of paid work.
- [ ] Validate repeat claims, access grants and expiry; compare engagement against baseline data before expanding rewards.

### TASK-LANG-01: Regional-language discovery pilot

**Status:** Planning. Follow reading milestones; precede the audiobook pilot.

**Goal:** Help readers discover original stories in their preferred language, beginning with one language supported by interested authors/readers.

- [ ] Select the pilot language; define story-language metadata, multilingual stories and handling of existing unlabelled works.
- [ ] Add author language selection and language filters that work with genre/search filters.
- [ ] Validate Unicode publishing, search, appropriate fonts and reading layouts on desktop/mobile; include right-to-left behaviour if relevant to the selected language.
- [ ] Review author/reader uptake before expanding languages or translating the interface. Do not automatically translate authors' work; preserve ownership and attribution.

### TASK-AUDIO-01: Author-approved audiobook pilot

**Status:** Planning. Follow the language pilot; precede the protected under-18 experience.

**Goal:** Test one narrated story with an approving author and a willing narrator before building a larger audio catalogue.

- [ ] Agree on contributors, recording permission, credits, publication/monetisation terms and audio access. Feedback includes a volunteer offer; no contributor has been contacted or committed.
- [ ] Define recording quality, storage and delivery costs while preserving author ownership/control.
- [ ] Check existing reader keyboard/screen-reader usability and build an accessible chapter player with pause/resume, speed, navigation and saved position. Keep story text available to authorised readers.
- [ ] Enforce private/paid audio access server-side; validate unauthorised/expired access, media delivery, failed loads, accessibility and desktop/mobile layouts.
- [ ] Assess listening feedback and operating costs before expanding.

### TASK-SAFE-01: Protected under-18 experience

**Status:** Planning. Keep this last, after administration and the preceding feedback tasks are completed and validated.

**Goal:** Provide a combined parent-managed experience for everyone under 18, with curated reading and private writing. Do not advertise child-account support before safeguards are ready.

- [ ] Define launch markets, minimum supported age, age assurance, guardian consent/responsibilities, retention and transition to adult permissions. Google login/email OTP alone does not establish age.
- [ ] Implement parent-managed onboarding, private profiles and server-enforced guardian/age permissions.
- [ ] Define reviewed suitability labels, content warnings and curated discovery. Suggested categories such as below 10, 10–15, young adults and adults are provisional content labels, not approved signup age bands.
- [ ] Keep writing private by default. Public publishing requires guardian approval and moderation review, with audit records and reversible withdrawal.
- [ ] Prevent open social interaction, including public comments, direct messaging and contact-detail exposure; explicitly define any restricted interactions.
- [ ] Prevent independent under-18 monetisation. Any guardian-managed purchases/earnings need a separately designed and validated flow.
- [ ] Add publishing-readiness checks, submission limits and spam/duplicate review based on completeness, originality and policy compliance; define draft/rejection retention and notice before deletion.
- [ ] Validate consent withdrawal, guardian access boundaries, adult transitions, publishing bypasses, content isolation across previews/search/shared links and desktop/mobile layouts.

### Other validation follow-ups

- [ ] Additional Google cancellation/returning-account provider checks, deferred at the user's request. Implemented signup remains usable and does not block payments.
- [ ] Real-device mobile checks beyond the completed browser viewport audits.
