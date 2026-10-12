# Theme consistency audit — 2026-10-09

Implemented locally for TASK-SYS-05. Pending review, commit, push and deployment.

## Scope

Remaining neutral UI classes were moved onto the existing surface, text, border and accent tokens. Coverage includes login/signup forms, settings, profile editing, author analytics/reporting, search and genres, connections, collections and sharing, notifications, posts and mention suggestions, draft lists, story ratings/reviews/access controls, and shared author/editor controls.

Success, warning and danger text/background/border tokens now follow light/dark mode and the saved background. Ratings use a separate gold token. Destructive filled actions retain a consistent high-contrast red/white treatment. Field radii are centralized alongside existing card/pill radii. Appearance selectors expose their selected state and accent swatches have 44px targets.

The reading canvas remains independent of site appearance. Paper/sepia and night/OLED now supply their own feedback colors and native color scheme; code blocks, links, placeholders and bookmark actions follow the canvas rather than the surrounding app theme.

## Intentional artwork colors

Book jackets and spine highlights, shelf finish samples, the colorful welcome hero/creator section, and reader paper palettes retain their art direction. The welcome page's dark canvas/secondary text now follow the saved background. The reader privacy shield intentionally remains a black screen. These are not generic app surfaces.

## Validation

- ESLint and 64 existing tests passed; TypeScript passed through the production build.
- Built-app appearance controls checked all 42 combinations: 2 modes × 3 backgrounds × 7 accents. Minimum sampled contrast was 5.39:1 for secondary text, 5.82:1 for warning text, 5.70:1 for danger text, and 5.48:1 for primary buttons. These are sampled controls, not a claim that every possible user-supplied color/cover has been contrast-certified.
- 60 route/viewport checks passed: 15 signed-in routes in dark slate at 320px, 390px and 1280px; the same routes in light warm paper at 390px. No page overflow or application errors were found. Routes: feed, library, settings, search, genre, notifications, drafts, studio, author profile/edit/connections, collection detail, post detail, story and reviews.
- Screenshots inspected for dark mobile cards, forms, profile, reviews, drafts and studio; six desktop background/mode settings previews captured. Appearance persistence was checked using only the existing local QA author account.
- Reader Paper, Sepia, Night and OLED inspected in site dark mode; foreground/feedback tokens and native color schemes followed the canvas with no overflow.
- Navigation menu, notification popup, reading preferences and collection picker opened using keyboard controls. No purchase, public post, real-user setting change, migration or production data change was part of validation.

Proofs are saved in `/private/tmp/talerooms-theme-qa/`, including `contrast.json` and screenshots. The disposable local accounts from the previous profile audit are reused; deletion still requires the previously requested explicit approval.
