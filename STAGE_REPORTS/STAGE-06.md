# Stage 6: Migrate PSS10 to generic configuration

**Status:** PASS
**Completion Date:** 2026-09-09

## Objective
Prove the generic stack supports the structurally different PSS10 legacy profile without changing its frozen observed behavior.

## Implementation Details
- Transcribed PSS10 into canonical schema 2.0.0 at `questionnaires/pss10/questionnaire.php`.
- Schema strictly validates with 0 errors (`class-questionnaire-schema-validator.php`), with `status = review` and explicit unapproved gates (`'legal_licensing' => false, 'publication' => false`) without inventing approvals.
- Narrow legacy compatibility lifecycle exception documented in `class-legacy-pss10-runtime.php`: resolves `'pss10'` via `get_internal('pss10')` to preserve existing frozen production shortcode while legal licensing remains unresolved.
- Frontend runtime: PSS10 is rendered via `LifeMetrics_Questionnaire_Renderer`, active runtime is the shared generic frontend (`questionnaire-ui.js` + `questionnaire-engine.js`), with PSS10 presentation overrides (`questionnaires/pss10/template.php` and `css/style.css` per DEC-021/DEC-022). Legacy `app.js` is retained on disk solely as a rollback asset.
- Server-side scoring and persistence: `LifeMetrics_Legacy_PSS10_Runtime::submit()` utilizes the generic PHP scoring engine (`LifeMetrics_Questionnaire_Scoring_Engine`) to score and canonicalize the category, while constructing the exact legacy flat payload required by Google Apps Script.

## Verification & Parity Evidence
- **Scoring Parity:** 10/20/21/26/27/50 scoring vectors, Q4/Q5/Q7/Q8 reverse scoring, and category boundaries verified identical across PHP and JS engines (`questionnaire-parity.test.php`).
- **REST Payload & Upstream Contract:** 100% regression parity on `/pss10/submit` (`pss10-rest-characterization.test.php`). All validation errors (`session_id`, `created_at`, `q1`..`q10`, `final_score`, `category`), payload size limits, content types, and Google ContentService 302 redirects pass.
- **Frontend Mutation Guards:** All 13 characterization mutation guards pass (`pss10-frontend-characterization.test.js`).
- **Visual Parity:** `VISUAL_PARITY = NOT_RUNTIME_VERIFIED` (real browser visual testing at 375px/768px/1440px is scheduled for Stage 8).

## Rollback Retained
Legacy files `app.js` and `style.css` are preserved in `questionnaires/pss10/assets/`.
