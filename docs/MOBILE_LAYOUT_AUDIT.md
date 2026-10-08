# Mobile layout audit — 2026-10-08

Status: validated, pushed and deployed on 2026-10-08. App commit `5fe087d`; Fly machine v36, health 1/1.

## Scope and method

Reviewed all 27 `src/app/**/page.tsx` route templates using the local app and an optimized production build. Two disposable local accounts supplied long author names, biographies, story/chapter titles, populated collections, reviews, comments, notifications and three-chapter manuscripts. Checked signed-in and public views separately.

The production route matrix covers 320, 390 and 430 CSS-pixel widths; key pages also cover 768 and 1280px. Landscape checks use 844×390. Page-width measurements accompany screenshots and interaction checks: a correct page width alone does not establish that controls or text fit inside their cards. Horizontal book shelves deliberately scroll within their own containers.

## Route coverage

| Page templates | Views inspected |
| --- | --- |
| `/`, `/about`, `/login`, `/signup` | Public landing, About and account forms |
| `/feed`, `/library`, `/drafts` | Populated discovery/library/drafts; expanded genres, community composer, resume card, library filters and book previews |
| `/settings`, `/notifications`, `/search` | Appearance choices, shelf controls, deletion confirmation without submission, notification list and dropdown, search results and suggestions |
| `/[handle]`, `/[handle]/edit`, `/[handle]/stories`, `/[handle]/connections` | Own and other profiles, Follow/Subscribe layout, long bio/name, analytics and expanded chart, profile edit, stories and both connection tabs |
| `/[handle]/collections`, `/[handle]/collections/[id]` | Long collection names and populated public/locked story cards |
| `/stories/[id]`, `/stories/[id]/reviews` | Free and locked story overview, paginated reader, reader settings/focus, quizzes, reviews and collection picker |
| `/write`, `/stories/[id]/edit` | New story, existing draft and published-story editing; all four studio steps, long chapter manager, expanded quiz/discussion fields, restricted access pricing and publication review |
| `/posts/[id]`, `/genres/[id]` | Long post/link, expanded comments and genre shelf |
| `/users/[id]`, `/users/[id]/edit`, `/users/[id]/connections` | Legacy profile aliases redirect to their canonical handle routes |
| `/collections`, `/collections/[id]` | Legacy collection aliases redirect to their canonical handle routes |

Story UUID view/review aliases were checked as well. Studio edit URLs use story UUIDs. No purchase, subscription, report, publication or deletion was submitted as part of the layout audit.

## Fixes

- Profiles: separate identity, biography, two-column mobile stats and actions; allow names/bios to wrap and keep Follow/Subscribe inside the viewport. This resolves the reported screenshot's overflow.
- Navigation: larger profile/brand touch targets; bounded notification/menu/search popovers with scrolling where needed. Notifications close with Escape.
- Collections: stack long headers and story cards on small screens. The mobile save picker has screen margins, a bounded scrollable panel and a form input that can shrink beside Add.
- Feed: keep the resume cover and details together, clamp exceptionally long titles, and give the progress bar and Resume action full-width rows on mobile.
- Library/settings: uniform mobile library filters and actions; shelf preview and appearance choices stack with room for their labels.
- Studio/comments: single-column mobile chapter manager, larger chapter controls, bounded dialogs and shrinkable quiz/discussion/comment inputs so Remove/Send stay inside the card.
- Mobile text inputs use a 16px font to avoid Safari's small-input focus zoom.
- Reader: a locale-dependent date stamp caused a server/client text mismatch for signed-in readers. Render the stamp after mount, preserving the browser's local date format without a hydration mismatch.

## Validation

- ESLint, TypeScript through the production build, and all 64 tests pass.
- 121 production route/width checks pass with no horizontal page overflow or application error page. Includes mobile canonical pages and legacy aliases plus tablet/desktop regression checks.
- Light and dark mobile feed, library, profile and settings screenshots reviewed. Reader appearance remains independently configurable.
- Extra checks cover expanded genres, notification/menu/search bounds, collection picker, report/deletion confirmation forms without submission, analytics expansion, community comments, reader appearance/focus and studio extras.
- The corrected production build repeats all 121 route/width checks with zero browser console errors.
- Removed the two exact disposable QA accounts and verified that their fixture stories, collections and post were removed. Stopped the temporary production server and restored the browser viewport.

Local proof images and route measurements are in `/private/tmp/talerooms-mobile-audit/`. The main profile proof is `profile-final-390.png`; other proofs include `library-final-390.png`, `settings-final-390.png`, `studio-manuscript-final-320.png` and desktop/tablet screenshots.

## Limits and delivery

These are browser viewport checks, not physical iPhone/Android tests. Native virtual-keyboard behavior, Safari-specific rendering and device safe-area behavior still need a real-device smoke check. Payments and external notification delivery were outside this audit.

Keep the broader author portfolio redesign and theme audit pending. Personal Library migration `db/0048_library_progress.sql` was applied and verified on production before this rollout.

Live smoke checks on `https://talerooms.fly.dev/` passed: PostgreSQL/pgvector health, public landing/About/login/signup, anonymous redirects for library/feed/settings, and 390px landing/story/profile layouts with no horizontal page overflow or browser console errors. Signed-in library behavior was validated locally; no production account records were changed for live smoke testing. The custom domain `talerooms.com` still serves its existing holding page and was not changed by this Fly deployment.
