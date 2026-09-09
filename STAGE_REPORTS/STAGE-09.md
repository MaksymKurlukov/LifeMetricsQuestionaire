# Stage 9: Multi-Destination Google Backend Architecture

**Status:** PASS  
**Completion Date:** 2026-09-09  

## Objective
Implement generic server-side submission transport routing to questionnaire-specific Google Sheets targets, supporting independent Google Apps Script destinations per instrument while maintaining 100% frozen PSS10 backward compatibility.

## Architectural Deliverables

1. **Google Apps Script Transport Adapter (`includes/class-google-apps-script-adapter.php`):**
   - Encapsulates HTTP transport with Google Apps Script web apps.
   - Enforces strict 302 redirect verification (accepting only `https://script.googleusercontent.com` targets with valid scheme, host, and no user/port anomalies).
   - Handles network timeouts (HTTP 502 `lmq_upstream_network_error`), HTTP error responses (`lmq_upstream_http_error`), backend rejection (`lmq_upstream_rejected`), and unconfigured storage (`lmq_backend_not_configured`).
   - Supports idempotent repeat responses (`duplicate: true`).

2. **Generic Submission Service (`includes/class-submission-service.php`):**
   - Resolves questionnaire-specific Google endpoints dynamically via:
     - Questionnaire ID constant map (e.g., `LMQ_PSS10_GOOGLE_ENDPOINT`, `LMQ_HYDRATATION_GOOGLE_ENDPOINT`).
     - Global constant map `LMQ_GOOGLE_ENDPOINTS`.
     - Filter hook `lifemetrics_questionnaire_backend_endpoint`.
   - Recomputes and validates scores server-side with `LifeMetrics_Questionnaire_Scoring_Engine` to prevent client tampering.
   - Canonicalizes submission envelopes with full audit metadata (`session_id`, `completed_at`, `received_at`, `answers`, `dimensions`, `safety_flags`, `raw_score`, `final_score`, `calculated_category`, `displayed_category`, `source_page`).
   - Preserves frozen legacy PSS10 submission contract (`q1`..`q10`, `final_score`, `category`).

3. **REST Controller Generic & Legacy Routing (`includes/class-rest-controller.php`):**
   - Registers explicit `/pss10/submit` route for backward compatibility.
   - Registers regex route `/(?P<id>[a-zA-Z0-9_-]+)/submit` for multi-questionnaire generic submissions.
   - Forwards request execution to `LifeMetrics_Submission_Service`.

4. **Generic Google Apps Script Backend (`backend/generic-google-apps-script.gs`):**
   - Implements Google Apps Script Web App for multi-questionnaire persistence.
   - Includes formula-injection escaping (`safeSheetText` on all strings/JSON), script lock (`LockService.getScriptLock()`), rapid rate-limiting (`CacheService.getScriptCache()`), and session deduplication.

## Validation Results & Test Evidence

- **Test Suite: `tests/backend-routing.test.php` (BACK-001 through BACK-012):**
  - BACK-001/002: Endpoint resolution via per-questionnaire constants — PASS.
  - BACK-003: Filter hook endpoint override — PASS.
  - BACK-004: Unconfigured destination handling — PASS.
  - BACK-005: Safe 302 redirect following to `script.googleusercontent.com` — PASS.
  - BACK-006: Malicious redirect rejection — PASS.
  - BACK-007: Upstream network timeout / connection error handling — PASS.
  - BACK-008: Upstream HTTP error handling — PASS.
  - BACK-009: Upstream rejection (`{ok: false}`) handling — PASS.
  - BACK-010: Idempotent duplicate submission handling — PASS.
  - BACK-011: Unconfigured endpoint error handling — PASS.
  - BACK-012: Full multi-destination submission service flow — PASS.

- **Test Suite: `tests/backend-logic.test.js`:**
  - PSS10 legacy Apps Script formula protection and session validation — PASS.
  - Generic Google Apps Script formula escaping, JSON serialization, and UUID/timestamp validation — PASS.

- **Full Regression Matrix (16 test suites):**
  - All 16 PHP and Node.js test suites passing (0 errors, 0 warnings).

## Next Stage
- STAGE 10: Proprietary Questionnaires Rollout (Sédentarité, Hydratation, Fatigue, Sommeil, Nutrition, Activité, Pieds).
