# Stage 9: Central Spreadsheet & Multi-Worksheet Backend Architecture (Amended)

**Status:** PASS  
**Completion Date:** 2026-09-09  
**Amendment:** Product storage decision consolidated to ONE central Google Spreadsheet ("LifeMetrics — Questionnaires") with dedicated raw-data worksheets per questionnaire and separated analytics/dashboard tabs (DEC-024).

## Objective
Implement generic server-side submission transport routing from WordPress REST to a single central Google Spreadsheet, routing each questionnaire to its dedicated raw data worksheet via trusted server-side allowlists, while preserving physical schema independence, dashboard separation, and 100% frozen legacy PSS10 backward compatibility.

## Architectural Deliverables

1. **Central Spreadsheet & Worksheet Routing Model (`backend/generic-google-apps-script.gs`):**
   - **Central Spreadsheet**: "LifeMetrics — Questionnaires" hosts all questionnaires.
   - **Dedicated Raw Data Worksheets**:
     - `PSS10`
     - `Sedentarite`
     - `Hydratation`
     - `Fatigue`
     - `Sommeil`
     - `Nutrition`
     - `Activite_Physique`
     - `Pieds_Confort`
   - **Dedicated Dashboard / Analytics Worksheets**:
     - `Dashboard_Global`
     - `Dashboard_PSS10`, `Dashboard_Sedentarite`, `Dashboard_Hydratation`, `Dashboard_Fatigue`, `Dashboard_Sommeil`, `Dashboard_Nutrition`, `Dashboard_Activite`, `Dashboard_Pieds`
     - Strictly separated from raw data writes; submissions never write to dashboard tabs.
   - **Server-Side Allowlist Mapping**: Google Apps Script resolves `questionnaire_id` to its fixed target worksheet name using an internal dictionary (`QUESTIONNAIRE_SHEETS`).
   - **Client Isolation**: The browser never provides, knows, or overrides the spreadsheet ID or worksheet name.
   - **Controlled Sheet Validation**: If the target worksheet does not exist in the spreadsheet, execution fails safely (`sheet_not_found`) without creating arbitrary worksheets from untrusted input.
   - **Security Controls**: Formula injection protection (`safeSheetText` on all strings/JSON), script lock (`LockService.getScriptLock()`), rapid rate-limiting (`CacheService.getScriptCache()`), and session deduplication on column 2.

2. **Google Apps Script Transport Adapter (`includes/class-google-apps-script-adapter.php`):**
   - Encapsulates HTTP transport with the central Google Apps Script web app (`LMQ_GOOGLE_ENDPOINT`).
   - Enforces strict 302 redirect verification (accepting only `https://script.googleusercontent.com` targets with valid scheme, host, and no user/port anomalies).
   - Maps upstream network timeouts (`lmq_upstream_network_error` / 502), HTTP error responses (`lmq_upstream_http_error` / 502), backend rejection (`lmq_upstream_rejected` / 502), and unconfigured storage (`lmq_backend_not_configured` / 500).
   - Supports idempotent repeat responses (`duplicate: true`).

3. **Generic Submission Service (`includes/class-submission-service.php`):**
   - Central endpoint resolution:
     - Preferred central Google Apps Script endpoint: `LMQ_GOOGLE_ENDPOINT`.
     - Legacy compatibility exception: `LMQ_PSS10_GOOGLE_ENDPOINT` for `pss10`.
     - Extensibility hook: `lifemetrics_questionnaire_backend_endpoint` filter.
   - Recomputes and validates scores server-side with `LifeMetrics_Questionnaire_Scoring_Engine` to prevent client tampering.
   - Canonicalizes submission envelopes with full audit metadata (`session_id`, `completed_at`, `received_at`, `answers`, `dimensions`, `safety_flags`, `raw_score`, `final_score`, `calculated_category`, `displayed_category`, `source_page`).
   - Preserves frozen legacy PSS10 submission contract (`q1`..`q10`, `final_score`, `category`).

4. **REST Controller Generic & Legacy Routing (`includes/class-rest-controller.php`):**
   - Registers explicit `/pss10/submit` route for backward compatibility.
   - Registers regex route `/(?P<id>[a-zA-Z0-9_-]+)/submit` for multi-questionnaire generic submissions.
   - Forwards request execution to `LifeMetrics_Submission_Service`.

## Validation Results & Test Evidence

- **Test Suite: `tests/backend-routing.test.php` (BACK-001 through BACK-012):**
  - BACK-001/002: Central endpoint resolution (`LMQ_GOOGLE_ENDPOINT`) and PSS10 legacy resolution (`LMQ_PSS10_GOOGLE_ENDPOINT`) — PASS.
  - BACK-003: Filter hook endpoint override — PASS.
  - BACK-004: Unconfigured/unregistered questionnaire handling (`lmq_not_found`) — PASS.
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
  - Central Google Apps Script allowlisted worksheet routing (`Sedentarite`, `Hydratation`, `Fatigue`, `Sommeil`, `Nutrition`, `Activite_Physique`, `Pieds_Confort`, `PSS10`) — PASS.
  - Rejection of unknown questionnaire IDs and invalid sheet access attempts — PASS.
  - Formula injection escaping across strings and structured JSON — PASS.

- **Full Regression Matrix (16 test suites):**
  - All 16 PHP and Node.js test suites passing (0 errors, 0 warnings).

## Next Stage
- STAGE 10: Proprietary Questionnaires Rollout (Sequential implementation of Sédentarité, Hydratation, Fatigue, Sommeil, Nutrition, Activité, Pieds into their dedicated worksheets).
