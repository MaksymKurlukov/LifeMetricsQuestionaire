# STAGE 3 report - Generic PHP infrastructure in parallel

STAGE = STAGE 3

STATUS = IN_PROGRESS

UNIT = 3.1-3.2 - Bootstrap/legacy runtime and explicit registry gate

DATE = 2026-09-08

BASE_COMMIT = `e663351f1959d73993b9f48525e47b981031991a`

CHECKPOINT_COMMITS = `01f282e` for Stage 3.1; this focused Stage 3.2 commit is reported at handoff

## Scope completed

- Reduced `lifemetrics-questionnaires.php` to plugin metadata, constants, two required classes, and one initialization call.
- Added `LifeMetrics_Plugin` as the one-time WordPress hook orchestrator.
- Added `LifeMetrics_Legacy_PSS10_Runtime` as the temporary compatibility container for the already validated PHP asset, shortcode, REST, validation, and Google ContentService redirect behavior.
- Updated the declared minimum PHP version from 7.4 to the explicitly approved 8.2.
- Added `LifeMetrics_Questionnaire_Registry` with an explicit ID-to-file map, fixed-base path containment, cached internal lookup, matching configuration ID/lifecycle checks, and public access only for `ready`.
- Wired one intentionally empty production registry into `LifeMetrics_Plugin`; PSS10 is not registered because its configuration migration remains deferred to Stage 6.
- Added a focused registry regression test for all lifecycle states, unknown/canonical IDs, traversal, outside-base paths, invalid arrays/statuses, ID mismatch, invalid base directories, and cache behavior.
- Did not create the shortcode controller, REST controller, generic route, schema/scoring, shared renderer/assets, submission service, adapter, or questionnaire configuration.

## Preserved behavior

- Exact `[lifemetrics_questionnaire id="pss10"]` behavior and empty output for unknown IDs.
- Exact `/wp-json/lifemetrics-questionnaires/v1/pss10/submit` route and public response contract.
- PSS10 template, JavaScript, CSS, icons, questions, scoring, reverse scoring, result UI, modal, Retour/reselection, animations, CTAs, silent success, error feedback, payload, storage, redirect handling, and filemtime cache busting.
- No wildcard REST route and no new public questionnaire.

## Tests run

| Check | Result |
|---|---|
| XAMPP PHP 8.2 lint for every plugin/test PHP file | PASS |
| PSS10 JavaScript syntax | PASS |
| frontend characterization and 13 mutation guards | PASS |
| PHP/REST characterization, redirects and duplicate behavior | PASS |
| bootstrap initialization idempotency and WordPress hook counts | PASS |
| exact shortcode, two unique instance roots, asset handles and exact REST route | PASS |
| explicit registry path containment, traversal and configuration-ID checks | PASS |
| internal lifecycle lookup and public `ready`-only gate | PASS |
| empty production registry exposes no new questionnaire | PASS |
| Apps Script/backend smoke | PASS |
| `git diff --check` | PASS |

TESTS_SKIPPED = real WordPress runtime; not required for this internal PHP extraction unit and no ZIP was requested.

## Acceptance

UNIT_3_1_STATUS = PASS

UNIT_3_2_STATUS = PASS

STAGE_3_STATUS = IN_PROGRESS

RUNTIME_BEHAVIOR_CHANGED = NO

ROLLBACK = revert this focused commit to return to `e663351`; preserve unrelated `.DS_Store` and local ZIP.

KNOWN_RISKS = complete schema validation remains deliberately deferred to Stage 4; generic public shortcode/REST wiring does not exist until Stage 3.3; real WordPress hook timing remains pending for the eventual completed Stage 3 runtime gate.

NEXT_STAGE_PROPOSED = `STAGE 3.3 - Shortcodes and exact PSS10 REST Controller extraction`

NEXT_STAGE_STARTED = NO
