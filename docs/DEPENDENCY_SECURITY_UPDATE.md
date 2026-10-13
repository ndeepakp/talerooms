# Dependency security update — 2026-10-13

Status: implemented, validated and deployed on 2026-10-13 from app commit `9913549`. Fly v40, health 1/1.

## Changes

- Next.js and matching ESLint config: 16.2.7 → 16.4.0.
- Better Auth: 1.6.14 → 1.6.33, kept on the 1.6 patch line.
- All direct Tiptap packages: 3.26.1 → 3.31.4, resolved as a matching peer set.
- Transformers: 4.2.0 → 4.3.1, including updated ONNX runtime and Sharp dependencies.
- Mammoth: 1.12.0 → 1.13.0. A Mammoth-only `argparse: 2.0.1` override removes its vulnerable legacy sprintf dependency. Both CLI help and actual sample conversion passed; v2 preserves Mammoth's deprecated v1 API, unlike argparse v3.
- Vitest: 4.1.9 → 4.1.11. Regenerated the lockfile with normal peer checks; no force/legacy-peer bypasses or audit suppression.
- Next dev refreshed its generated AGENTS.md block. Confirmed the generator source matches the output.

## Audit results

The prior production audit reported 49 package findings. The updated production-only audit reports **zero findings**. The full audit still reports **five high-severity development-only package findings**, all in the Next ESLint plugin → fast-glob → micromatch → braces chain. The currently published braces release remains 3.0.3, which the advisory flags. npm suggests downgrading the ESLint config to Next 14; that would mismatch the framework, so it was not applied. These remaining tool-chain findings need upstream remediation and are not included in the production standalone server. Zero audit findings is not a guarantee that the application has no security issues.

Sources: [Next ImageResponse advisory](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j), [Better Auth OTP sign-in advisory](https://github.com/better-auth/better-auth/security/advisories/GHSA-qq9h-g4jm-xgf3), [Argparse changelog](https://github.com/nodeca/argparse/blob/master/CHANGELOG.md), [unpatched braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Final audit reports: `/private/tmp/talerooms-security-qa/{all,production}-audit.json`.

## Validation

- 72 unit tests and ESLint passed. TypeScript and Next 16.4 production build passed. Font-download network access was required for the clean framework build.
- 35 production-build API/page checks passed: verified/pending login and session activation; protected page/API gates; reader/profile/collection/post screens; disabled OTP passwordless endpoint; formatted Word import; malformed/anonymous import rejection; Google provider initiation and error presentation.
- Nine synthetic OTP checks passed on the updated auth package: pending login and mutation rejection, local delivery, resend cooldown, wrong code, successful activation, persisted verification, existing-session activation and consumed-code rejection. Restored the synthetic account's original pending state afterward; no external email was sent.
- 66 production-build mobile route checks passed at 320/390/430px without horizontal overflow or undersized text inputs. Tiptap body editing/bold formatting passed in an unsaved, untitled manuscript.
- The actual `Xenova/all-MiniLM-L6-v2` model loaded in the updated native runtime and produced 384 finite values with unit norm. Mammoth CLI help and conversion of the bundled two-chapter sample succeeded.
- Stopped temporary QA servers and restarted the normal local dev app on port 3000 with the existing Google/Resend environment. No environment file or production database change. No migrations required.

Completed Google consent/callback still requires a human provider-flow check. Physical-device testing and Linux Docker runtime validation were not repeated in this local pass. The production server and dependency changes are not yet deployed.

## Production delivery — 2026-10-13

App commit `9913549` deployed as Fly v40. Linux/Node 22.23.3 runtime checks passed: Sharp generated PNG output, ONNX session API loaded, and the Transformers pipeline module loaded. Seventeen production route/auth smoke checks passed; deployed CSS still contains both mobile fixes. No production data or schema changes. Local full-model inference and mobile/auth checks remain the detailed behavioral evidence; production native-module checks do not independently run full model inference.
