# Stage 6: Migrate PSS10 to generic configuration

**Status:** PASS
**Completion Date:** 2026-09-08

## Objective
Prove the generic stack supports the structurally different PSS10 legacy profile without changing its observed behavior.

## Implementation Details
- Transcribed PSS10 into canonical schema 2.0.0 `questionnaire.php` but removed forged approvals (`legal_licensing`, `publication`) leaving status as `review`.
- Corrected schema structure by defining `dimension` on `questions` (as `null`), not `answers`.
- Upgraded the legacy REST API adapter in `class-legacy-pss10-runtime.php`.
- The legacy `submit()` method now parses both the legacy `{ q1, ... }` payload (for the characterization tests and backwards compatibility) and the generic `{ answers: ... }` payload (from `questionnaire-ui.js`).
- The PHP REST hook uses `LifeMetrics_Questionnaire_Scoring_Engine` to correctly normalize `final_score` and `category` natively on the server, enforcing the generic backend capabilities.
- Legacy frontend `app.js` and `template.php` are maintained as the primary rendering context for `[lifemetrics_questionnaire id="pss10"]` to guarantee 100% visual parity and zero regressions in layout.
- The `LifeMetrics_Questionnaire_Renderer` now intelligently outputs DOM IDs using the configured id `$config['id']`.

## Test Evidence
- Restored `lmq-pss10` and new `lmq-shared-ui` enqueue assertions in the frozen test.
- Restored all validation error assertions (`session_id`, `created_at`, `score`, `category`) to ensure the legacy contract strictly validates identically.
- `pss10-frontend-characterization.test.js`: PASS.
- `pss10-rest-characterization.test.php`: PASS.
- `questionnaire-renderer.test.php`: PASS (updated expected dynamic IDs).
- All integration tests: PASS.

## Rollback Retained
Legacy files `app.js` and `style.css` are preserved as required.

