# Talerooms Design & Experience Improvement Tasks

A comprehensive roadmap and tracking ledger for the visual, typographic, architectural, and user-experience overhaul of Talerooms.

---

## Status Legend
- `[ ]` **Pending** — Not yet started
- `[-]` **In Progress** — Currently being worked on
- `[x]` **Completed** — Implemented and verified locally; merge status tracked separately
- `[!]` **Blocked** — Awaiting prerequisite or user decision

---

## Quick Status Overview

| Task ID | Feature / Module | Category | Priority | Status |
| :--- | :--- | :--- | :--- |
| 2026-10-08 | Mobile sanity follow-up | Rechecked public and signed-in page templates at 320px and 390px. Fixed unbroken draft-title/review text overflow and wrapping of featured-review author controls. Mobile menu and screenshots checked; scoped lint passed. Local changes pending push/deployment. | Codex |
| 2026-10-07 | `TASK-ADMIN-01` | Added a pending admin console and observability dashboard for user/content management, signup/click/activity/payment analytics, operational health, server-enforced permissions, and audit logs. Scheduled strictly after payment implementation and validation; no implementation started. | Codex | :--- |
| [`TASK-SYS-01`](#task-sys-01-editorial-typography-stack) | Editorial Typography Stack (Serif + Sans pairing) | Design System | High | `[x] Completed` |
| [`TASK-SYS-02`](#task-sys-02-brand-identity--logo-refinement) | Brand Identity & Header Overhaul | Design System | High | `[x] Completed` |
| [`TASK-SYS-03`](#task-sys-03-modern-bookshelf-elevation--spine-shadows) | Modern Bookshelf Elevation & 3D Spine Depth | Design System | High | `[x] Completed` |
| [`TASK-SYS-04`](#task-sys-04-generative-book-jacket-designer) | Generative Book Jacket Designer & Cover Art | Design System | Medium | `[x] Completed` |
| [`TASK-SYS-05`](#task-sys-05-unified-surface-tokens--border-softening) | Unified Surface Tokens & Border Softening | Design System | High | `[-] In Progress` |
| [`TASK-PAGE-01`](#task-page-01-landing-page-colorful-welcome--original-stories) | Landing Page: Colorful Welcome & Original Stories | Pages & UI | High | `[x] Completed` |
| [`TASK-PAGE-02`](#task-page-02-reading-room--customization-suite) | Reading Room: Distraction-Free & Customization Drawer | Reader | High | `[x] Completed` |
| [`TASK-PAGE-03`](#task-page-03-story-overview-page-split-layout) | Story Overview Page: Two-Column Editorial Layout | Story View | High | `[x] Completed` |
| [`TASK-PAGE-04`](#task-page-04-discovery-feed--curated-shelves) | Discovery Feed & Dynamic Categorized Shelves | Feed | Medium | `[x] Completed` |
| [`TASK-PAGE-05`](#task-page-05-author-studio-multi-step-focused-writing-suite) | Author Studio: Multi-Step Focused Writing Suite | Author Studio | High | `[x] Completed` |
| [`TASK-PAGE-06`](#task-page-06-author-portfolio--profile-page) | Author Profile: Literary Portfolio & Memberships | Profiles | Medium | `[x] Completed locally` |
| [`TASK-PAGE-07`](#task-page-07-library-bookshelf-redesign) | Personal Library: Gallery & Reading Progress | Library | Medium | `[x] Completed locally` |
| [`TASK-AUTH-01`](#task-auth-01-google-signup--email-otp-verification) | Google Signup & Email OTP Verification / Account Activation | Authentication | High | `[ ] Pending` |
| [`TASK-PAY-01`](#task-pay-01-stripe-payments-integration) | Stripe Platform: Checkout, Subscriptions, Connect & Webhooks | Payments | High | `[ ] Pending` |
| [`TASK-ADMIN-01`](#task-admin-01-admin-console--observability-dashboard) | Admin Console & Observability Dashboard | Administration & Analytics | High | `[ ] Pending` |


---

## Pending Task Execution Order

Complete and validate each step before advancing:

Author Studio (`TASK-PAGE-05`) was completed, validated, and deployed on 2026-10-07. Discovery Feed (`TASK-PAGE-04`) was completed, validated, pushed, and deployed the same day.

Personal Library (`TASK-PAGE-07`) was implemented, validated, pushed and deployed on 2026-10-08 in `5fe087d` (Fly machine v36, health 1/1). Migration `db/0048_library_progress.sql` was applied and verified on production before rollout.

The requested application-wide mobile layout audit was validated and deployed on 2026-10-08 in the same release. It covers all 27 page templates, including the reported profile overflow, navigation popovers, collections, resume/library cards, settings, studio extras and comment forms. See [mobile audit coverage and validation](docs/MOBILE_LAYOUT_AUDIT.md). This does not complete the broader author portfolio redesign or theme audit.

Author Profiles (`TASK-PAGE-06`) were implemented and validated locally on 2026-10-08; review, push and deployment remain outstanding.

1. **Visual Consistency & Theme Audit** — Finish `TASK-SYS-05`, including shared-component colors, surfaces, and light/dark styling.
2. **Signup, User Verification & Account Testing** — `TASK-AUTH-01`; add Google signup/sign-in and email OTP activation, then complete outstanding end-to-end checks for bookmarks, reviews, community submissions, reading resume, and protected account flows against the activation rules.
3. **Payments** — `TASK-PAY-01`; complete and validate before starting administration.
4. **Admin Console & Observability Dashboard** — `TASK-ADMIN-01`; user management, content moderation, product analytics, and operational visibility. Start only after the payments task is completed and validated.

---

## Detailed Task Breakdown

### Design System & Global Foundations

#### `TASK-SYS-01`: Editorial Typography Stack
- **Status**: `[x] Completed`
- **Priority**: High
- **Files Affected**:
  - `src/app/layout.tsx`
  - `src/app/globals.css`
- **Objectives**:
  - Remove the hardcoded `body { font-family: Arial, Helvetica, sans-serif; }` in `globals.css`.
  - Configure Google Fonts in `layout.tsx`:
    - **Display & Reading Serif**: `Newsreader` (editorial serif).
    - **UI & Controls**: `Geist Sans` and `Geist Mono`.
  - Establish a typographic scale with proper leading, letter spacing (`tracking-tight` for display headings), and optical sizing.
- **Checklist**:
  - [x] Add editorial serif fonts to Next.js font loader (`next/font/google`).
  - [x] Wire CSS variables `--font-serif` and `--font-sans` into Tailwind `@theme inline`.
  - [x] Apply reading line-height (`leading-[1.85]`) and measure limits (`max-w-prose`) to long-form content.

---

#### `TASK-SYS-02`: Brand Identity & Header Overhaul
- **Status**: `[x] Completed`
- **Priority**: High
- **Files Affected**:
  - `src/components/layout/TopBar.tsx`
  - `src/app/page.tsx`
  - `src/app/layout.tsx`
- **Objectives**:
  - Replace the candy-pill Web 2.0 gradient button containing block letters with an elegant, literary brand mark.
  - Redesign the global navigation bar (`TopBar.tsx`) to feel lightweight and unobtrusive:
    - Frosted glass effect with subtle border (`backdrop-blur-md bg-[var(--page)]/80`).
    - Integrated brand wordmark and responsive avatar/navigation controls.
  - Standardize the unauthenticated landing header in `page.tsx` to match the brand identity.
- **Checklist**:
  - [x] Design and render an editorial brand lockup with serif typography and accent mark.
  - [x] Redesign `TopBar` for logged-in users with balanced spacing and modern typography.
  - [x] Standardize the unauthenticated landing header in `page.tsx` to match the brand identity.

---

#### `TASK-SYS-03`: Modern Bookshelf Elevation & 3D Spine Depth
- **Status**: `[x] Completed`
- **Priority**: High
- **Files Affected**:
  - `src/app/globals.css`
  - `src/components/story/Bookshelf.tsx`
  - `src/components/story/BookCover.tsx`
  - `src/app/library/page.tsx`
- **Objectives**:
  - Remove faux-wood skeuomorphic brown gradients (`.shelf`, `.shelf-case`, `.shelf-ledge`) that look dated and muddy in dark mode.
  - Introduce modern tactile book styling:
    - Subtle left-edge spine shadow (`inset 4px 0 6px -2px rgba(0,0,0,0.25)`).
    - Ambient drop shadow on hover that creates real elevation off the page.
    - Minimalist matte or frosted floating display shelves that adapt seamlessly to light, paper, slate, and dark modes.
- **Checklist**:
  - [x] Refactor `.shelf` and `.shelf-case` in `globals.css` to clean, modern gallery shelf surfaces.
  - [x] Implement realistic book spine crease and lighting gradients on `BookCover`.
  - [x] Ensure smooth hover transitions (lift, shadow spread) respecting `prefers-reduced-motion`.

---

#### `TASK-SYS-04`: Generative Book Jacket Designer & Cover Art
- **Status**: `[x] Completed`
- **Priority**: High
- **Files Affected**:
  - `src/components/story/BookCover.tsx`
  - `src/lib/cover-style.ts`
- **Objectives**:
  - Remove harsh `border-2 border-accent` from all book covers.
  - Upgrade generated covers for stories without custom uploaded artwork:
    - Classic publishing templates with top ornament and brand seal.
    - Typographic contrast (prominent serif title, crisp uppercase author badge).
- **Checklist**:
  - [x] Remove hardcoded borders and replace with natural book edge borders.
  - [x] Create refined editorial cover layout in `BookCover.tsx`.
  - [x] Add 3D spine crease highlights and right-edge bevels to both uploaded and generated covers.

---

#### `TASK-SYS-05`: Unified Surface Tokens & Border Softening
- **Status**: `[-] In Progress` — First foundation batch implemented and validated; remaining component audit pending.
- **Priority**: High — Foundation for the page redesigns.
- **Files Affected**:
  - `src/app/globals.css`
  - `src/lib/appearance.ts`
  - All shared UI cards and panels
- **Objectives**:
  - Standardize surfaces across `plain`, `paper`, and `slate` backgrounds in light and dark modes.
  - Eliminate hardcoded color leaks (e.g. `bg-indigo-100`, `border-amber-300` appearing inconsistently across themes).
  - Unify border-radius definitions across buttons, cards, modals, and pills.
- **Checklist**:
  - [x] Define semantic surface, text, border, radius, and shadow tokens in `globals.css`.
  - [ ] Audit component color classes to ensure theme compatibility.
  - [x] Migrate navigation, search/menu/notification surfaces, bookshelves, library, access/review panels, and feed cards to semantic tokens.
  - [ ] Complete the remaining shared-component color audit during the subsequent page redesigns.
- **Validated first batch (2026-10-05)**:
  - Shared literary brand, responsive navigation, scalable generated covers, and always-visible library chapter positions.
  - Library positions are labelled "last opened"; they do not claim completed reading percentages.
  - Six background/mode combinations, seven accent colors in both modes, and viewport widths 320, 390, 768, and 1280px checked using a temporary fixture with the actual shared components.
  - Sampled secondary text contrast exceeds 5.3:1; primary accent button contrast exceeds 5.4:1.
  - Keyboard menu open/Escape dismissal, desktop/mobile shelf preview open/close, and empty-library rendering checked. Reduced-motion rules now cover book lifts and transitions.
  - 42 unit tests, ESLint, TypeScript, and production build pass. Temporary fixture removed after verification. Full authenticated user flows remain to be tested.
  - Reading-room work has not started. Real payments remain the final phase.

---

### Page & Flow Enhancements

#### `TASK-PAGE-01`: Landing Page: Colorful Welcome & Original Stories
- **Status**: `[x] Completed`
- **Priority**: High
- **Files Affected**:
  - `src/app/page.tsx`
  - `src/app/about/page.tsx`
  - `src/components/story/LandingWelcome.tsx`
  - `src/components/story/LandingWelcome.module.css`
  - `src/components/story/FeaturedBookPreview.tsx`
  - `src/components/story/BookPreview.tsx`
  - `src/components/story/Bookshelf.tsx`
  - `src/components/story/LibraryShelf.tsx`
  - `src/components/feed/NewChapters.tsx`
  - `src/app/feed/page.tsx`
  - `src/app/library/page.tsx`
  - `src/components/story/BookPreview.module.css`
  - `src/components/layout/PublicNavigation.tsx`
  - `src/app/sitemap.ts`
- **Objectives**:
  - Make original fiction, writer ownership, and relationships with returning readers clear through a fun, colorful welcome page.
  - Lead with “Get lost. Find your people.” and a primary **Find your next story** action to the published shelf.
  - Keep **Start writing** and **Log in** easy to find; preserve the signed-in feed redirect.
  - Use a saturated blue opening, oversized mixed typography, lime actions, a peach book-jacket spotlight, and a structured shelf of real published stories. Support dark styling in the shelf and footer.
  - Keep the layout simple and responsive, with gentle hover movement that respects reduced-motion preferences.
  - Keep monetization and future IP licensing out of the main promise until those experiences are available. Payments remain the final reader/author implementation phase, followed by the admin console.
- **Checklist**:
  - [x] Rebuild the hero with the editorial headline, featured-story spotlight, and a distinct creator-ownership section.
  - [x] Connect browsing, signup, login, and About to existing routes.
  - [x] Use real published covers, with long-title and empty-shelf handling.
  - [x] Preserve the creator-ownership and reader-relationship message without invented statistics.
  - [x] Separate the cream header from the blue hero; style Our story and Log in as clear buttons without header arrows.
  - [x] Remove the decorative “01 / OPEN” label.
  - [x] Open books in place across the featured book, landing shelf, feed, library, and new-chapter shelf; start hover only on the book.
  - [x] Keep the open spread within the viewport and stable when moving between its pages; support cover taps, keyboard activation, and Escape.
  - [x] Remove duplicated details and external reading controls from the featured book; keep the reading action inside, preserving saved-chapter destinations where applicable.
  - [x] Remove the title from the inside page and replace “About the story” with **“A glimpse”**.
  - [x] Disable normal selection, copying, and dragging inside shared book previews; preserve the reading action and accessible story identification.
  - [x] Validate responsive layouts, light/dark styling, contrast, keyboard focus, navigation, and the production build before advancing.

- **Initial validation (2026-10-06)**: The preceding minimal welcome design passed signup/login/About navigation, anonymous story exploration, six theme combinations, empty shelves, and long titles. The existing signed-in feed redirect was preserved by inspection; account-level redirect verification remains pending.
- **Editorial revision validation (2026-10-06)**: Replaced the initial pastel/tilted-cover revision following user feedback. Checked 320/390/768/1280px layouts, real cover images, dark styling, long titles, empty shelves, browsing anchor, signup/login, and real story navigation. Keyboard focus and reduced-motion styling retained. All 51 tests, lint, TypeScript, and production build passed. Existing signed-in redirect remains unchanged. Changes are local; temporary preview removed.
- **Featured book preview (2026-10-06)**: Added an in-place hinged cover, inside paper page with the published story’s public synopsis, and a reading link inside the book. Removed the duplicated title/author caption and outside reading/toggle controls. Mouse entry on the book itself opens the preview; the backdrop does not. Tapping/clicking the cover toggles it. Keyboard Enter/Space controls work; Escape closes and restores focus to the cover. Checked desktop hover entry/exit, narrow mobile spread, hidden preview tab order, and inside-page navigation. Reduced-motion users receive the open state without animated transitions. No private chapter bodies are queried. Cream header and arrow-free header buttons retained. All 51 tests, lint, TypeScript, and production build passed locally.
- **Shared shelf previews (2026-10-06)**: Extracted `BookPreview` for the featured book, landing shelf, feed Bookshelf, LibraryShelf, and NewChapters. Removed “01 / OPEN” and the feed’s separate preview drawer. Shelf books expand into a readable spread with viewport-aware placement and a continuous hover area. Hover starts on the book only; tap and keyboard activation remain available, with Escape restoring cover focus. Library/new-chapter reading links retain their saved chapter. Queries select only public synopses, never chapter bodies. Verified real landing links and presentation fixtures for all shelves at 320/390/768/1280px, opening/closing, keyboard controls, and continuation destinations. New-chapter books wrap to avoid clipping previews in a scrolling strip. 51 tests, lint, TypeScript, and production build passed; temporary fixture removed.
- **Preview copy controls (2026-10-06)**: Removed the repeated title from the inside page. Shared book previews now disable normal text selection, prevent copy events, and prevent dragging; the inside reading action remains functional. Verified empty selection after a real text drag and a blocked browser copy shortcut using a temporary UI fixture. This deters ordinary copying of the public synopsis; it is not DRM or a guarantee against screenshots/source access. Lint, TypeScript, and production build passed. Temporary fixture removed.
- **Latest wording (2026-10-06)**: The inside-page label is now **“A glimpse”** in the shared component, so it applies to every book preview. This final wording-only edit passed `git diff --check`; the preceding functional changes passed lint, TypeScript, production build, browser selection/copy-shortcut checks, and reading-link validation.
- **Delivery status (2026-10-06)**: App changes committed and pushed to `origin/main` as `82691f8`, then deployed to https://talerooms.fly.dev. Fly image `deployment-01M48P5N9NMJF1BMD9H2KP5F82`, machine version 28, health 1/1 passing. Production health endpoint confirms PostgreSQL/pgvector; live landing/book preview, “A glimpse” label, removed inside titles, selection controls, reading/About/login navigation, and 390px mobile layout verified with no browser errors. Pre-deploy validation: 51 tests, lint, TypeScript, and production build passed. Account write flows remain outside this production smoke check. Real payments remain scheduled last; the existing mock payment implementation is unchanged.

---

#### `TASK-PAGE-02`: Reading Room: Distraction-Free & Customization Suite
- **Status**: `[x] Completed`
- **Priority**: High
- **Files Affected**:
  - `src/components/reader/ChapterReader.tsx`
  - `src/components/reader/ChapterQuestions.tsx`
  - `src/components/reader/ChapterPrompts.tsx`
  - `src/app/stories/[id]/page.tsx`
- **Objectives**:
  - Turn the reading experience into a joyful, book-grade experience:
    - **Reading Customizer Drawer**: Font family (Serif, Sans, Mono), font size scale (14px–24px), line height, and reading background (Paper, Sepia, Night, OLED).
    - **Zen / Distraction-Free Mode**: One-click toggle that dims interface chrome, centering purely on the text.
    - **Typographic Details**: Elegant drop cap on chapter opening, proper paragraph indentation or spacing, subtle dividers for existing scene breaks.
    - **Reading Progress Bar**: Subtle, non-intrusive progress line at the top/bottom showing word-weighted page position and estimated minutes remaining.
  - Keep Bookmark and Meaning actions usable on mobile; retain the existing author copy protection.
- **Checklist**:
  - [x] Create a `ReaderPreferences` client modal/drawer with persistence (localStorage or user settings).
  - [x] Implement reader themes (Sepia, Paper, Night, OLED) scoped to the reader canvas.
  - [x] Add drop cap formatting and scene dividers in `richtext`.
  - [x] Clean up page-flip animation to ensure high performance and mobile responsiveness.

- **Validation**: 46 tests, lint, TypeScript, and production build passed. Browser checks covered Paper/Sepia/Night/OLED, preference persistence, font changes retaining page position, focus/drawer Escape behavior, saved-page resume, cross-page bookmark jumps, locked chapters, short stories, and 320px/390px layouts. Reading fixtures were removed after validation. Authenticated bookmark writes and Q&A submissions still need account-level end-to-end verification.
- **Scope notes**: Preferences are remembered per browser. A dedicated dyslexia font remains a future option; no reading-performance claim is made. Copy Quote is excluded while author copy protection is active.

---

#### `TASK-PAGE-03`: Story Overview Page: Two-Column Editorial Layout
- **Status**: `[x] Completed`
- **Priority**: High
- **Files Affected**:
  - `src/app/stories/[id]/page.tsx`
  - `src/app/stories/[id]/PublicStoryView.tsx`
  - `src/components/story/AccessPanel.tsx`
  - `src/components/story/ReviewPanel.tsx`
  - `src/components/story/StoryOverview.tsx`
  - `src/components/story/RatingBreakdown.tsx`
  - `src/lib/story-overview.ts`
  - `src/lib/story-overview.test.ts`
- **Objectives**:
  - Replace the current single-column vertical stack with a balanced two-column layout:
    - **Left Column (Sticky Desktop)**:
      - Large high-res book jacket with tactile spine depth.
      - Author profile card with avatar, follow button, and subscriber badge.
      - Clear Access / Pricing Card (Free Preview, Rent, Buy Whole Story, Author Subscription).
      - Quick metadata: Reading time, word count, and genres. Defer a verified similarity-check badge until durable check metadata exists; do not invent a verification claim.
    - **Right Column**:
      - Title, publication date, logline, and extended synopsis.
      - Interactive Chapter Table of Contents (badge indicators for Free, Purchased, Locked).
      - Reader ratings breakdown with explicitly labelled half-star bands (4.5–5, 3.5–4, 2.5–3, 1.5–2, 0.5–1).
      - Community discussion & reviews.
- **Checklist**:
  - [x] Restructure `StoryPage` layout into a responsive two-column grid (`grid-cols-1 lg:grid-cols-12`).
  - [x] Design sticky left book jacket and pricing card.
  - [x] Reformat chapter listing with status chips and reading progress indicators.
  - [x] Add star rating breakdown bar chart.

- **Layout**: Shared overview for guests and signed-in readers. Cover/author/access sidebar remains sticky and scrollable on desktop; mobile shows the title first. The reading room and existing authenticated reviews/community controls remain full-width below the overview.
- **Validated (2026-10-06)**: 51 tests, lint, TypeScript, and production build passed. Standalone production server booted; landing/About/signup/story/chapter navigation checked with no console errors. Browser checks covered free/locked chapters, first-chapter preview, no chapters, half-star rating distributions, long titles, guest follow-to-login, six themes, and 320/390/768/1280px layouts. Existing mock pricing selectors and renewal totals checked without submitting purchases. Read-only integration checks across 16 published local stories verified 15 readable bodies were serialized and 23 locked bodies were absent; a private draft returned 404. The preview fixture also excluded its locked body and was removed afterward.
- **Remaining account verification**: Signed-in grant/subscription/resume/review/community writes still require account-level end-to-end testing. Their existing server access rules and submission handlers were retained. No schema or real-payment changes; membership options link to the author profile.

---

#### `TASK-PAGE-04`: Discovery Feed & Dynamic Categorized Shelves
- **Status**: `[x] Completed` — Implemented, validated, pushed, and deployed on 2026-10-07.
- **Priority**: Medium
- **Files Affected**:
  - `src/app/feed/page.tsx`
  - `src/components/feed/ContinueReading.tsx`
  - `src/components/feed/NewChapters.tsx`
  - `src/components/feed/WeekPanel.tsx`
  - `src/components/feed/DiscoveryFeed.tsx`, `DiscoveryShelf.tsx`, and `Discovery.module.css`
  - `src/components/feed/SideTabs.tsx`
  - `src/components/story/BookPreview.tsx`
  - `src/lib/discovery.ts` and tests
  - `src/components/post/PostCard.tsx` and `src/app/layout.tsx` (hydration fixes)
- **Objectives**:
  - Elevate `/feed` into a lively literary home:
    - **"Continue Reading" Ribbon**: Modernized hero banner for in-progress stories with chapter title, progress bar, and instant "Resume Chapter" button.
    - **Categorized Discovery Carousels**:
      - *Trending in Your Genres*
      - *New Releases from Followed Authors*
      - *Quick Bites (Under 15 min reads)*
    - **Redesigned "Your Week"**: Turn the right rail into an engaging personal reading streak & milestones tracker with circular completion gauges.
- **Checklist**:
  - [x] Redesign `ContinueReading` card into a sleek, prominent resume bar.
  - [x] Organize feed stories into categorized shelves with horizontal scroll capability.
  - [x] Polish `WeekPanel` stats with modern visual metrics and streak tracking.

- **Related work completed (2026-10-06)**: Feed Bookshelf and NewChapters now use the shared in-place book preview. The old feed detail drawer was removed; new-chapter books wrap to prevent preview clipping, and their reading links retain the saved chapter. The broader categorized shelves, ContinueReading, and WeekPanel work was completed on 2026-10-07 as documented below.


- **Implemented (2026-10-07)**: Editorial reading-room header; prominent Continue Reading ribbon with chapter title/position and a resume link that restores the existing page bookmark. Categorized horizontal shelves show trending stories in preferred genres (last-seven-day views), latest stories from followed authors, short reads with estimates below 15 minutes, and all published stories with genre filters. When genre activity is absent, the personal shelf honestly says “Fresh in your genres.” Existing new-chapter notifications and community posts remain accessible. Weekly activity shows a seven-day circular gauge, daily reading markers, actual reading streak, opened-story/quiz/answer counts, and quiz accuracy. Calendar-day activity is explicitly labeled UTC. Shared book spreads are clamped to the scrolling shelf and close on horizontal scrolling; keyboard/tap/Escape controls remain available. Only public story metadata and SQL-computed word counts are sent to the client; chapter bodies stay on the server.
- **Validation corrections**: Resume links use the story slug and omit the explicit chapter query, which previously skipped the saved page. Community post dates older than 30 days now use a fixed locale/timezone to avoid hydration mismatch. The root theme element accepts the intentional pre-hydration class change from the existing theme script.
- **Validation (2026-10-07)**: 60 tests, lint, TypeScript, production build, and diff checks passed. Four discovery/activity regression tests cover genre ranking, followed authors outside preferences, quick-read bounds, fresh fallback, unique reading days, streak resets, and month boundaries. A disposable local reader exercised real follows/preferences/view activity, a two-day streak, fresh/trending shelves, empty followed-author and inactive-week states, carousel controls, genre filtering, community navigation, locked access preservation, and saved page 2 of 4. Production-build checks confirmed persistent resume dismissal and no browser console errors on the feed/community. Responsive checks at 320/390/768/1280px found no page overflow; light/dark themes and the in-place mobile book spread were checked. Test account and all its activity/access rows were removed after verification.
- **Approved editorial layout follow-up (2026-10-07, local)**: Implemented the selected split layout after mockup review: left-aligned reading-room introduction, Stories/Community segmented tabs, and Explore heading above the genres and books. Your week and the actual saved-story cover/Resume card sit together in a desktop sidebar anchored near the vertical middle; page scrolling does not move either card. Short viewports keep the sidebar accessible with its own overflow, while tablet/mobile cards return to normal document flow. Library and Write a story are in the top navigation; the hamburger remains beside notifications/avatar and includes Profile, Library, Drafts, Collections, Settings, and sign-out. Existing account themes, uploaded/template book covers, personalized shelves, chapter-position progress, and dismissal cookie remain supported. No generated mockup covers were substituted for author content.
- **Follow-up validation**: Lint, TypeScript, all 60 tests, production build, and diff checks passed. Local production-browser checks covered 320/390/768/1280px without page overflow, keyboard Stories/Community switching, hamburger/Profile visibility and Escape, Historical filtering, in-place mobile book previews, saved-story resume navigation, and dismissal persistence after reload. At 1280px the sidebar remained at y=230px while the page scrolled to y=1772px; no browser errors. Fixed an invalid foreground CSS token found during visual review and tightened mobile header spacing. Disposable local reader removed after verification. Delivery is recorded in the final release entry below.

- **Compact category controls (2026-10-07, local)**: Moved Explore genre selection into the shelf heading row beside the title/count. Removed previous/next arrow controls from all discovery shelves; native horizontal scrolling, swipe/trackpad navigation, and keyboard focus on book rails remain available. Expanded genres share a single column and left edge with the compact controls, rather than starting at the shelf edge. Initially shows four options (All stories plus three genres); the accessible + button expands all genres in the same grid and becomes − to collapse. A genre selected from the extra options stays visible in the compact row after collapse. On narrow screens controls wrap beneath the title/arrows without page overflow. Lint, TypeScript, production build, diff checks, and local production-browser checks at 1440/1280/320px passed, including expansion, Poetry filtering, selection retention, and collapse; no browser errors. Follow-up alignment checks confirmed identical compact/expanded left edges at desktop (396px) and mobile (16px), with no page overflow; lint and production build passed again. Disposable reader removed. Delivery is recorded in the final release entry below.

- **Uniform genre and Resume cover refinement (2026-10-07)**: Replaced variable-width and split genre rows with a single equal-width grid (four columns desktop, two mobile), 48px-high buttons, and a separate expand/collapse control that cannot wrap onto an isolated row. Expanded choices keep their stable alphabetical order; a selected extra genre remains visible when collapsed. Enlarged the Resume cover to 96×144px on desktop and 84×126px on narrow mobile screens, preserving chapter position, dismissal and resume behavior. Lint and production build passed; local production-browser checks confirmed all desktop genres measure 75×48px, the cover measures 96×144px desktop / 84×126px mobile, selected Science Fiction survives collapse, and 320px has no page overflow or browser errors.

- **Final release refinements (2026-10-07)**: Removed the “Your reading room” kicker and all discovery-shelf previous/next buttons, retaining native horizontal scrolling and focusable book rails. The final compact/expanded genre controls use the same aligned column. Full release validation includes lint, all 60 tests, TypeScript through the production build, and diff checks. GitHub/Fly delivery is recorded after deployment below.

- **Editorial release delivery (2026-10-07)**: Pushed `63d1e71` (reading-room layout, compact genres, arrow/kicker removal) and `04ae2b0` (uniform genre grid and larger Resume covers) to `origin/main`. Final app image `deployment-01M4B3KQNQRPM6B9BW60DDNX16` deployed to https://talerooms.fly.dev on machine `9080d707a932e8`, version 35, started with 1/1 health checks passing. Live `/api/health` confirms PostgreSQL 17.10 and pgvector 0.8.2. Full lint, 60 tests, TypeScript/production build and local production-browser validation passed before deployment; authenticated visual/interaction checks used disposable local readers, which were removed. No production test accounts, schema migrations, or payment changes.

- **Delivery (2026-10-07)**: Discovery Feed release `bb332e8`, invitation line break `84a791b`, roomier shelves/filters `e6d9bf3`, and heading-before-filters ordering `72e7380` were pushed to `origin/main` and deployed to https://talerooms.fly.dev. Final Fly image `deployment-01M4B0G4N2P772T5GGM4AQ4Y9R`, machine version 33, health 1/1 passing. Live health confirms PostgreSQL/pgvector; landing and signed-out feed redirect to login checked with no browser errors. Authenticated feed behavior was verified locally rather than repeated on production. Follow-up spacing and ordering were checked at 1280/390px, including an explicit invitation line break, larger card gaps, and genre filters grouped beneath the Explore heading. Disposable local preview readers were removed. No production data changes, schema migrations, or payment implementation. Personal Library is next.

---

#### `TASK-PAGE-05`: Author Studio: Multi-Step Focused Writing Suite
- **Status**: `[x] Completed` — Implemented, validated, pushed, and deployed on 2026-10-07.
- **Priority**: High
- **Files Affected**:
  - `src/app/write/StoryForm.tsx`
  - `src/components/write/studio/` (four steps, state/save controller, confirmation dialog, and scoped styling)
  - `src/components/write/RichTextEditor.tsx`
  - `src/components/write/ChapterQuestionsEditor.tsx`
  - `src/components/write/ChapterPromptsEditor.tsx`
  - `src/app/api/stories/route.ts`
  - `src/app/api/stories/[id]/route.ts`
  - `src/lib/story-validation.ts` and tests
  - `src/lib/studio-save-queue.ts` and tests
  - `src/lib/similarity.ts`
- **Objectives**:
  - Break down the 1,300-line monolithic form into an intuitive, multi-step authoring workflow:
    1. **Step 1: Story Identity & Cover**: Title, summary, genres, Word doc import, and interactive cover designer.
    2. **Step 2: Chapter Manuscript**: Distraction-free writing environment with a left sidebar chapter manager (reorderable list, chapter word counts) and right-side rich text canvas.
    3. **Step 3: Access & Monetization**: Simple, visual pricing presets with clear duration options.
    4. **Step 4: Originality & Publish**: Clean pledge confirmation and similarity scan report before going live.
  - Add auto-save draft indicator and word count targets.
- **Checklist**:
  - [x] Split `StoryForm` into modular step components.
  - [x] Implement split-view manuscript editor (chapter drawer + editor canvas).
  - [x] Streamline pricing configuration with one-click presets.
  - [x] Integrate clean originality pledge checklist.


- **Implemented (2026-10-07)**: Four navigable steps — Story, Manuscript, Access, and Publish. Live cover designer and Word import retained. The chapter manager supports selection, add/remove, and keyboard-accessible reordering without switching the selected manuscript. One rich-text editor is displayed at a time; focus mode hides app/studio navigation and exits with Escape. Chapter/total word counts and an adjustable writing target are shown. Quizzes and discussion prompts sit in optional reader extras. Access presets separate public reading, first-chapter preview, and restricted access; duration, currency, bundle, and individual chapter settings remain available. Publish review shows readiness, originality pledge, and similarity decisions. Real payments remain deferred.
- **Save integrity**: Draft status and explicit Save/Retry controls are visible. Dirty tracking includes cover and currency. Serialized requests prevent draft creation/publish races; edits made during an in-flight save trigger another autosave. Newly created drafts update the editor URL without remounting, so reload resumes the saved draft. Draft normalization retains empty chapter outlines and unfinished quizzes/prompts; publishing still drops empty/incomplete content. Accessible confirmation dialogs protect removal, chapter merging, and unsaved navigation (including shared-header links). Published edits stay in a private working copy until publication succeeds.
- **Originality correction**: Production-flow testing found private working copies in similarity results. Both semantic and lexical scans now include published stories only, avoiding false matches against the author's own working draft and disclosure of private draft titles.
- **Validation (2026-10-07)**: 56 tests, lint, TypeScript, diff checks, and production build passed. A local QA author exercised signup, draft creation/reload, empty outlines, stable chapter reordering, unfinished quiz persistence, short-story conversion preserving both chapter bodies, currency-only and cover-only autosave, cover upload, access presets, bundle/chapter pricing, focus/Escape, navigation warning/cancellation, failed-save recovery, initial publication, and working-copy publication. Local PostgreSQL checks confirmed one draft rather than duplicates, an unchanged live story during draft editing, and working-copy removal after successful publication. Production API checks confirmed formatted Word import, anonymous creation rejection, and unauthorized edit rejection. A regression scenario detected a real published original while excluding two identical private drafts. All four steps were checked at 320/390/768/1280px without horizontal overflow; six background/mode combinations and narrow editor extras were checked. No browser errors were observed. Disposable local QA account, stories, sessions, and test cover were cleaned up after verification.
- **Delivery (2026-10-07)**: App release `0536301` pushed to `origin/main` and deployed to https://talerooms.fly.dev. Fly image `deployment-01M4AYCEGGAD2JK0KNN43BXA2W`, machine version 29, health 1/1 passing. Live health confirms PostgreSQL/pgvector; landing page, book preview, and signed-out Author Studio redirect to login checked without browser errors. Authenticated author write flows were validated locally, not repeated on production. No schema migrations, production account changes, or real-payment implementation. Discovery Feed is next in the agreed order.

---

#### `TASK-PAGE-06`: Author Portfolio & Profile Page
- **Status**: `[x] Completed locally (2026-10-08)` — pending review, push and deployment.
- **Priority**: Medium
- **Files / Areas Affected**:
  - `src/app/[handle]/page.tsx` and the author works archive
  - `AuthorWorks`, `ProfileContent`, `Profile.module.css`, shared book previews
  - Public bibliography query in `src/lib/profile.ts`; membership action touch targets
- **Objectives**:
  - Give every profile a distinctive editorial banner, author identity, biography and clear Follow/Membership actions.
  - Present published works as a book gallery with shared in-place book opening and All works / Serials / Short stories filters.
  - Show a membership card with the actual price, restricted-story count and existing active/cancelled subscription states.
  - Feature author-pinned reader notes from published stories; preserve private drafts and owner-only analytics.
- **Checklist**:
  - [x] Integrate the author's saved accent into the banner while surfaces follow the viewer's appearance settings.
  - [x] Separate membership information from the profile identity, including anonymous login and author management actions.
  - [x] Build a responsive bibliography with existing cover art, format filters, genres, rating summaries and access labels.
  - [x] Reuse the gallery in the author works archive; preserve legacy profile redirects and protected archive access.
  - [x] Show selected reader notes only when the author has pinned a nonempty review on a published work.
  - [x] Keep private drafts and analytics visible only to the owner, with writing/setup actions for empty profiles.
  - [x] Validate desktop/tablet/mobile, light/dark, keyboard tabs, filters, book previews and account privacy.
- **Content integrity**: Biography/credentials/rights statements remain author-supplied through the existing About field; no credentials or adaptation availability are inferred. The banner uses the saved accent, not a private feed wallpaper. Membership checkout remains a demo, clearly labeled; no payment implementation added. Work cards with no published chapters say "Chapters coming soon".
- **Validation (2026-10-08)**: Lint, TypeScript, 64 tests and the production build passed. Disposable local author/reader accounts verified All works/Serials/Short stories counts, keyboard tabs and repeated story-count navigation, anonymous membership login, Follow/unfollow count refresh, active/cancelled membership states without checkout, owner-only drafts/analytics and empty profile/setup states. Pin/unpin actions added/removed the published reader quote; private-story and self-authored notes remained excluded. Public profile HTML excluded private draft titles, private reviews and manuscript bodies. Profiles, archive, aliases and shared feed/library shelves fit 320/390/430/768/1280px; dark mode and safe narrow book opening were checked with no production-browser errors. Existing local author Maya Chen supplied the final design preview. No schema migration or production data changes.
- **Preview / delivery**: Screenshots and QA notes are in `/private/tmp/talerooms-profile-qa/`. Work remains local for review; no commit, push or deployment performed.

---

#### `TASK-PAGE-07`: Personal Library Bookshelf Redesign
- **Status**: `[x] Completed and deployed (2026-10-08)` — `5fe087d`, Fly machine v36, health 1/1.
- **Priority**: Medium
- **Files / Areas Affected**:
  - `src/app/library/page.tsx`, `src/components/story/LibraryShelf.tsx` and its CSS module
  - `src/lib/library.ts`, library tests, shared `BookPreview`
  - ChapterReader progress saving, progress/completion API handlers, feed resume query
  - `db/0048_library_progress.sql`
- **Objectives**:
  - Bring opened stories, saved collection books and existing paid-access stories into one personal gallery.
  - Retain realistic cover proportions, spine styling and the shared in-place book-opening preview.
  - Show saved chapter/page position, new-chapter badges, and reader-declared completion.
  - Filter by All books, Reading, Finished, Purchased and Collections; search books/authors and select an owned collection.
- **Checklist**:
  - [x] Replace the legacy shelf/wood wrapper with a responsive gallery using semantic appearance tokens.
  - [x] Add reading-position indicators, filter counts, collection selection and search.
  - [x] Add contextual empty states, clear-filter recovery and a discover-story call to action.
  - [x] Continue from the saved page, without an explicit chapter query resetting pagination.
  - [x] Add Mark as finished / Move to reading, with authenticated ownership checks and persistent status.
  - [x] Return finished books to Reading when the author adds chapters; exclude finished books from feed resume.
  - [x] Validate local desktop/tablet/mobile, light/dark, keyboard preview, status changes, filters and API isolation.
- **Progress definition**: Percentages describe the saved position, with chapters weighted equally and page position within the bookmarked chapter. They do not claim words consumed or infer completion from opening the last page. Old bookmarks fall back to chapter position until resumed; 100% requires explicit completion.
- **Purchase scope**: Uses existing positive-amount access grants (payments are still mocked). Includes expired access with a clear label; free grants are not purchases. Library metadata never grants reading access, and chapter bodies are excluded from its server/client payload.
- **Validation (2026-10-08)**: Lint, TypeScript, 64 tests and the production build passed. Disposable local readers verified completion persistence/reversal, reader ownership, draft/unopened/own-story rejection, new-chapter handling, collection isolation, active/expired access, search/no-match recovery, empty states, anonymous redirect, saved chapter 2/page 2 restoration, keyboard book opening/Escape, and light/dark responsiveness at 320/390/768/1280px without horizontal overflow or production-browser errors.
- **Delivery**: Additive migration `0048` was applied and its two integer columns verified on production before release. Existing bookmarks remain intact. Disposable local fixture accounts and their test-owned records were removed after validation. GitHub push and Fly deployment completed; live database health, public pages, protected-page redirects and mobile profile/story layout checks passed with no browser console errors. No live payments or admin functionality implemented.

---

### Signup & Account Verification

#### `TASK-AUTH-01`: Google Signup & Email OTP Verification
- **Status**: `[ ] Pending`
- **Priority**: High — Complete before payments; validate both signup paths before advancing.
- **Files / Areas Affected**:
  - `src/lib/auth.ts` and authentication client configuration
  - Signup/login pages and verification UI
  - Server session/access checks and account persistence
  - Database migrations, transactional email delivery, and deployment configuration as needed
- **Objectives**:
  - Offer **Continue with Google** for signup and subsequent sign-in using the existing Better Auth stack.
  - Activate Google accounts only after a successful, server-validated provider flow with a verified email. If the provider does not establish email verification, require email OTP verification.
  - Keep email/password signup available for users who do not use Google. Send a one-time code to their signup email and activate the account only after successful verification. Email OTP is the intended non-Google verification channel.
  - Treat newly registered, unverified users as **inactive / pending verification**. They may complete verification, resend a code, correct their email, or sign out, but must not gain normal authenticated access or perform protected actions until active. Public browsing remains available.
  - Enforce activation on the server across sessions, protected pages, and API/mutation handlers; hiding UI alone must not grant access.
  - Define how existing accounts transition before rollout, avoiding accidental activation of unverified accounts or unexplained lockouts.
- **Checklist**:
  - [ ] Configure Google OAuth credentials and approved callback URLs for local and production environments; add signup/login controls and handle cancellation/errors.
  - [ ] Implement transactional email OTP delivery and an accessible verification screen with resend cooldown and clear pending/expired/error states.
  - [ ] Use short-lived, single-use codes with secure storage, limited attempts, and request/resend rate limits; invalidate consumed or superseded codes.
  - [ ] Persist verification/activation state using the auth provider's supported model and enforce it consistently on the server.
  - [ ] Handle returning inactive users and interrupted signup so verification can resume safely; a changed email must be verified before activation.
  - [ ] Handle duplicate emails and account linking safely without automatically merging identities solely because email strings match.
  - [ ] Document and validate the existing-account migration policy and required Google/email environment configuration.
  - [ ] Validate Google success/cancellation, email OTP success/wrong/expired/reused codes, resend limits, session activation, and direct protected-route/API attempts from inactive users.
  - [ ] Complete outstanding account-level end-to-end checks for existing bookmarking, reviews, community submissions, saved reading position, and access/subscription flows; repeat protected-flow checks with active and inactive accounts. Real payment validation belongs to the final payments phase.
  - [ ] Run relevant auth tests, lint, TypeScript, production build, and mobile/keyboard flow checks before moving to the next task.
- **Acceptance criteria**: A new email/password account remains inactive until its email OTP is verified. A Google signup with a validated verified email becomes active after the provider flow. Unverified users cannot bypass activation through login, stale sessions, or direct API requests. Real payments remain the final phase.

---

### Monetization & Payments

#### `TASK-PAY-01`: Stripe Payments Integration
- **Status**: `[ ] Pending`
- **Priority**: High (After signup/verification; before the admin console)
- **Files Affected**:
  - `src/lib/pricing.ts`
  - `src/app/api/stories/[id]/purchase/route.ts`
  - `src/app/api/users/[id]/subscribe/route.ts`
  - `src/app/api/stripe/webhook/route.ts` (New)
  - `src/components/story/AccessPanel.tsx`
  - `src/components/profile/SubscribeButton.tsx`
- **Objectives**:
  - Replace the current mock payment layer with full-fledged Stripe processing:
    - **Stripe Checkout / Elements**: Handle one-time chapter purchases, time-limited rentals, and whole-story bundle purchases.
    - **Stripe Billing / Subscriptions**: 30-day recurring author subscriptions with automatic proration and cancellation handling.
    - **Stripe Connect (Express/Custom)**: Seamless payouts and revenue splits to storytellers/authors, enabling Talerooms to act as a true IP marketplace.
    - **Webhook Endpoint**: Handle asynchronous payment confirmations (`checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`) and securely update `access_grants` and `subscriptions` in PostgreSQL.
- **Checklist**:
  - [ ] Install official `stripe` Node SDK and setup server client.
  - [ ] Implement Stripe Checkout Session creation for story bundles and chapter unlocks.
  - [ ] Implement recurring subscription checkout with customer portal access for subscription management.
  - [ ] Implement Stripe Webhook handler with signature verification (`stripe-signature`).
  - [ ] Wire Stripe Connect onboarding flow for authors to connect their bank accounts.

---

### Administration & Observability

#### `TASK-ADMIN-01`: Admin Console & Observability Dashboard
- **Status**: `[ ] Pending` — Planning only; no implementation started.
- **Priority**: High
- **Execution dependency**: Start after `TASK-PAY-01` is completed and validated. Preserve the existing Library → Profiles → Visual Audit → Signup/Verification → Payments order.
- **Planned Areas**:
  - Protected `/admin` dashboard and user/content management screens.
  - Server-authorized admin APIs and shared role/permission checks.
  - Database migrations for admin roles, action audit records, and analytics events/aggregates.
  - Existing `src/app/api/admin/reindex/route.ts` (currently a development-only helper); review administrative utilities before exposing any in production.
- **Objectives**:
  - **User management**: Search and paginate users; inspect signup date, verification/activation state, reader/author activity, and account status. Suspend/reactivate accounts with a reason and revoke sessions when appropriate. Keep account activation consistent with Google/OTP verification rules. Protect role changes from self-service escalation; use explicit authorized admin provisioning.
  - **Content and platform control**: Review reported users, stories, reviews, and community posts; hide/restore inappropriate content and record moderation reasons. Define which platform settings admins may change, with validated values and reversible changes. Use confirmations for consequential actions and prefer suspension/hiding over permanent deletion.
  - **Product analytics**: Show total users, new signups by day/week/month, verified versus inactive accounts, active readers/authors, story opens, and a defined inventory of clicks (e.g. story/author links, Read story, Resume chapter, genre selection, and Write a story). Include date filters, trends, and popular stories/genres. Distinguish total clicks, unique users/sessions, and story views; label definitions and timezones clearly.
  - **Conversion and payment visibility**: Once payments exist, show signup → verification → reading/purchase conversion and aggregate purchases, subscriptions, revenue/refunds, and webhook failures. Use verified payment records rather than estimating revenue from click events; keep financial dashboards read-only initially.
  - **Operational observability**: Surface app/database health, request errors/latency, failed background work and payment webhooks, plus relevant deployment/log links. Reuse existing health and hosting telemetry where available. Include actionable failure states rather than only cumulative counters.
  - **Trustworthy data and admin access**: Enforce authorization on every admin page and API, not just navigation visibility. Record who changed what, when, and why in an audit trail. Minimize collected analytics data, avoid story bodies/secrets/payment credentials in events, define retention, and respect applicable consent preferences. Deduplicate retries and filter obvious bot/test traffic; validate aggregates against their underlying records.
- **Checklist**:
  - [ ] Define admin permissions, account-status semantics, allowed moderation/settings actions, and the initial admin provisioning process.
  - [ ] Define the click-event inventory, unique-activity/conversion metrics, reporting timezone, privacy boundaries, and retention policy before collecting new analytics.
  - [ ] Implement protected admin pages/APIs with server-enforced roles and audit logging.
  - [ ] Build searchable user management and reversible content/report moderation flows.
  - [ ] Add first-party event capture and trustworthy aggregation for signups, clicks, reading activity, and verified payment metrics.
  - [ ] Build a responsive dashboard with date ranges, charts, useful empty/error states, and operational health links.
  - [ ] Validate unauthorized access/role escalation, suspension and session behavior, moderation reversibility, audit records, event deduplication, metric accuracy, and dashboard desktop/mobile layouts before release.

---

## Progress Log

| Date | Task ID | Update Description | Author |
| :--- | :--- | :--- | :--- |
| 2026-10-08 | `TASK-PAGE-06` | Implemented author portfolio banner, book gallery/format filters, membership card, selected reader quotes and owner-only drafts/dashboard. Narrow preview animation positioning fixed. Local lint, TypeScript, 64 tests, production build and account/viewport checks passed. Pending review, push and deployment. | Codex |
| 2026-10-08 | `TASK-PAGE-07`, mobile layout audit | Pushed `5fe087d` and deployed to Fly (machine v36, health 1/1). Applied and verified production migration 0048 before rollout. Live DB health, public pages, protected-page redirects and mobile profile/story layouts passed. No production account mutations or purchases used for smoke testing. | Codex |
| 2026-10-08 | Mobile layout audit | Fixed reported profile overflow and cramped mobile controls across navigation, collections, resume/library cards, settings, studio quiz/discussion inputs and post comments. Corrected reader date hydration. All 27 page templates audited; lint, TypeScript, 64 tests and production build passed. Full coverage in docs/MOBILE_LAYOUT_AUDIT.md. Local only; no push/deployment. | Codex |
| 2026-10-07 | `TASK-ADMIN-01` | Added a pending admin console and observability dashboard for user/content management, signup/click/activity/payment analytics, operational health, server-enforced permissions, and audit logs. Scheduled strictly after payment implementation and validation; no implementation started. | Codex |
| 2026-10-07 | `TASK-PAGE-04` | Completed categorized discovery shelves, genre filters, saved-page resume ribbon, and real weekly activity/streaks. Fixed shelf preview clipping and post-date/theme hydration issues found during validation. 60 tests, lint, TypeScript, production build, and local account/browser/responsive checks passed. Pushed and deployed through `72e7380` (Fly v33, health 1/1), including the approved line break, spacing, and heading/filter order. | Codex |
| 2026-10-07 | `TASK-PAGE-05` | Completed the stepped Author Studio, chapter manager/focus mode, access presets, save integrity fixes, and publication review. Corrected similarity scans to exclude private drafts; local production/account/responsive validation passed. Pushed `0536301` and deployed to Fly (machine v29, health 1/1); live public-page/auth-gate smoke checks passed. | Codex |
| 2026-10-06 | `TASK-AUTH-01` | Added Google signup/sign-in and email OTP activation for non-Google signups. Unverified accounts remain inactive with server-enforced restrictions; implementation and validation pending. Payments remain last. | Codex |
| 2026-10-05 | `TASK-SYS-01` to `04` | Editorial Typography (Newsreader), Brand Identity, 3D Book Spines, Modern Gallery Shelves completed. | Antigravity |
| 2026-10-05 | `TASK-SYS-05` | First foundation batch validated: semantic surfaces, shared brand/navigation, accessible accent buttons, scalable covers, and touch-friendly library details. Remaining component audit pending; payments last. | Codex |
| 2026-10-05 | `TASK-PAGE-02` | Reader customization and focus mode locally validated; saved-page restore race fixed. Payments remain last. | Codex |
| 2026-10-06 | `TASK-PAGE-01` | Editorial blue/lime/peach revision added after user feedback; locally validated. Initial purpose-led welcome page, real story shelf, and About page implemented and locally validated. | Codex |
| 2026-10-06 | `TASK-PAGE-03` | Shared editorial story overview, chapter access list, author sidebar, and half-star rating distribution implemented; private-body isolation and production navigation verified locally. | Codex |
| 2026-10-06 | `TASK-PAGE-01` | Cream header with clear arrow-free buttons; removed the decorative “01 / OPEN” label and duplicated featured-book details. Implemented locally. | Codex |
| 2026-10-06 | `TASK-PAGE-01`, `04`, `07` | Shared hinged book previews across landing, feed, library, and new-chapter shelves. Book-only hover, continuous spread hover area, responsive placement, tap/keyboard controls, and saved-chapter reading links validated locally. Broader feed/library tasks remain pending. | Codex |
| 2026-10-06 | `TASK-PAGE-01` | Removed inside titles, blocked normal text selection/copy/drag, and changed the preview label to “A glimpse”. Copy shortcut and reading action checked; final wording edit passed diff checks. Batch not deployed; payments remain last. | Codex |
| 2026-10-06 | `TASK-PAGE-01` to `03`, shared shelves | Pushed app release `82691f8` to main and deployed to Fly.io (machine v28, health 1/1). Verified production health, landing and open-book preview, reading/About/login navigation, mobile overflow, and browser console. | Codex |
