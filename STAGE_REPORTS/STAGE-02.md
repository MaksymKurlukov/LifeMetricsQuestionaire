# STAGE 2 report - Freeze PSS10 behavior with tests

STAGE = STAGE 2

STATUS = PASS

DATE = 2026-09-04

BASE_COMMIT = `9e96bcc`

CHECKPOINT_COMMIT = `9ae9560` (`test: freeze current PSS10 behavior`); approval closure: `9a768e8` (`docs: approve PSS10 migration baseline`).

OBJECTIVE = Create an executable characterization harness for the current PSS10 WordPress plugin without changing runtime behavior.

## Files

FILES_CREATED =

- `lifemetrics-questionnaires/tests/fixtures/pss10-golden-v1.json`
- `lifemetrics-questionnaires/tests/fixtures/pss10-backend-contract-v1.json`
- `lifemetrics-questionnaires/tests/pss10-frontend-characterization.test.js`
- `lifemetrics-questionnaires/tests/pss10-rest-characterization.test.php`
- `lifemetrics-questionnaires/tests/README.md`
- `STAGE_REPORTS/STAGE-02.md`

FILES_MODIFIED =

- `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- `QUESTIONNAIRE_INVENTORY.md`
- `TEST_MATRIX.md`
- `CHANGELOG.md`

FILES_DELETED = NONE

PRE_EXISTING_CHANGES_PRESERVED = YES

- The branch was clean at `9e96bcc`; its two STAGE 1 commits ahead of origin were preserved.
- Existing plugin runtime, legacy test, standalone source, `.DS_Store`, PDFs, backend deployment, and environment were not edited.
- The approval-closure run found task-aligned changes in the five explicitly authorized state documents plus an unrelated `.DS_Store` modification. The state changes were reviewed and completed; `.DS_Store` is preserved and excluded from the checkpoint.

## Implementation summary

- Captured the exact ten PSS10 questions, five answer labels, reverse questions Q4/Q5/Q7/Q8, category copy, and score vectors 10/20/21/26/27/50.
- Executed the actual frontend score and payload functions by instrumenting only an in-memory VM copy; no runtime source or generated instrumented file was written.
- Added 13 self-checking mutation guards covering the 10/50 clamps, 21/27 category boundaries, each reverse question, and every payload field group.
- Captured the legacy browser payload and WordPress-forwarded payload, including server-derived category behavior.
- Exercised the actual PHP REST callback behind minimal test-only WordPress stubs for all frozen boundaries, validation errors, upstream failures, success, and duplicate success.
- Rendered the actual template twice in the PHP harness to verify isolated root, gradient, and modal identifiers plus the same-origin route shape.
- Preserved the existing discrepancy: stored categories use `Stress assez élevé`/`Stress très élevé`, while displayed badges use `Stress modéré`/`Stress élevé`.
- Preserved the two result CTA buttons as non-navigating stubs.
- Maksym Kurlukov explicitly accepted all captured behavior as the structural-migration/regression baseline on 2026-09-04. This does not permanently approve legacy UX, wording, CTA behavior, licensing, or attribution for production.
- Did not create generic runtime infrastructure or begin STAGE 3.

## Tests run

| Command/check | Result |
|---|---|
| `node --check lifemetrics-questionnaires/tests/pss10-frontend-characterization.test.js` | PASS |
| parse both JSON fixtures with Node `JSON.parse` | PASS |
| `/Applications/XAMPP/xamppfiles/bin/php -l lifemetrics-questionnaires/tests/pss10-rest-characterization.test.php` | PASS |
| `node lifemetrics-questionnaires/tests/pss10-frontend-characterization.test.js` | PASS; 6 score vectors and 13 mutation guards |
| `/Applications/XAMPP/xamppfiles/bin/php lifemetrics-questionnaires/tests/pss10-rest-characterization.test.php` | PASS; REST/payload/error/template assertions |
| `/Applications/XAMPP/xamppfiles/bin/php -l lifemetrics-questionnaires/lifemetrics-questionnaires.php` | PASS |
| `/Applications/XAMPP/xamppfiles/bin/php -l lifemetrics-questionnaires/questionnaires/pss10/template.php` | PASS |
| `node --check lifemetrics-questionnaires/questionnaires/pss10/assets/js/app.js` | PASS |
| `node lifemetrics-questionnaires/tests/backend-logic.test.js` | PASS |
| frontend scan for direct Google URL, `document.getElementById`, `window.PSS_*`, and `/wp-content/` | PASS |
| explicit original ten-file manifest and `git diff` against forbidden runtime/standalone paths | PASS; digest `5206e7a4a4fff67661e21d2761fd3b2ea94f1a435f05bcd65376b844a6d3cdb9` |
| `git diff --check` and manual final diff review | PASS |
| approval-scope consistency across plan, inventory, test matrix, changelog, and this report | PASS; migration/regression-only acceptance recorded |

## Tests skipped

- Reference browser screenshots, live 400 ms timing, focus/keyboard interaction, and responsive layout: no WordPress/browser test environment; explicitly deferred to STAGES 8-9 by the plan.
- WordPress activation, Gutenberg, Elementor, live REST HTTP, database, Sheet, and Google deployment tests: outside STAGE 2 and require later environment/backend stages.

## Acceptance criteria

- [x] A deterministic green harness executes actual legacy frontend and PHP behavior.
- [x] Exact content, reverse scoring, 10/20/21/26/27/50 boundaries, stored/displayed labels, payload fields, errors, CTA stubs, and multi-instance identifiers are frozen.
- [x] Deliberate changes to every score clamp/category boundary, reverse question, and payload field group cause a test failure.
- [x] Runtime, standalone, backend, and environment remain unchanged.
- [x] Runtime-only gaps are explicitly deferred rather than falsely passed.
- [x] Maksym Kurlukov explicitly accepted the observed behavior as the structural migration baseline on 2026-09-04.

## Known risks

- WordPress/browser interaction and visual behavior remain unverified until STAGES 8-9.
- The VM instrumentation deliberately depends on stable legacy function markers; a pre-cutover legacy refactor will fail closed and require review.
- PSS10 licensing/attribution approval remains a later migration/release gate.

## Blockers

NONE for STAGE 2. Later production/legal/UX approvals remain separate gates.

## Rollback

Revert the metadata-only follow-up, then `9a768e8`; revert `9ae9560` only if the characterization harness must also be removed. Use focused `git revert` commits; do not alter runtime, STAGE 0-1, user metadata, or standalone source.

## User action required

NONE for STAGE 2.

NEXT_STAGE_PROPOSED = `STAGE 3 - Generic PHP infrastructure in parallel`.

NEXT_STAGE_STARTED = NO
