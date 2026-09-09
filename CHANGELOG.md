# Changelog

All notable LifeMetrics Questionnaires plugin/project changes are documented here. The tracked standalone PSS10 changelog/history remains separate.

## [Unreleased]

### Documentation

- Conducted a major architecture and documentation reconciliation run (2026-09-08) to align the implementation plan with newly clarified product requirements.
- Updated DECISIONS.md: Superseded DEC-005 (One canonical common submission sheet) with DEC-020 (Generic submission infrastructure with per-questionnaire server-side routing) and DEC-023 (Questionnaire-specific physical Sheet schemas). Added DEC-021 (PSS10 is a distinct legacy profile) and DEC-022 (Shared frontend runtime plus optional presentation overrides).
- Restructured the roadmap in `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md` to define PSS10 migration as a legacy profile test (Stage 6), require a PDF capability audit (Stage 7), define presentation and storage routing metadata (Stage 7B), and explicitly separate questionnaire implementations sequentially (Stages 11-20).
- Explicitly documented that each proprietary LifeMetrics questionnaire may have a unique backend Google Sheet destination and physical schema structure, abandoning the monolithic sheet assumption.
- Formalized the frontend presentation extension architecture in `ARCHITECTURE.md` to allow custom layouts/themes per test while sharing core business logic.

- Added the authoritative staged implementation plan and recoverable WordPress plugin baseline.
- Approved component architecture, questionnaire schema/scoring/payload contract, source/readiness inventory, test matrix, and DEC-001 through DEC-015 for STAGE 1.
- Recorded Maksym Kurlukov as project owner and approval owner for DEC-001 through DEC-015.
- Aligned Sédentarité readiness with the lifecycle definition: scoring is complete, but implementation remains blocked until explicit source approval.
- Added an executable PSS10 characterization harness with golden scoring/payload fixtures, PHP REST/markup checks, and mutation guards; runtime behavior is unchanged.
- Recorded approval of the captured PSS10 behavior strictly as a structural-migration/regression baseline; production UX/content/CTA/licensing decisions remain separate.
- Recorded the 2026-09-07 out-of-sequence real-WordPress PSS10 runtime, redirect diagnosis, fix evidence, and successful controlled E2E without advancing the roadmap.
- Recorded completion of the PSS10 production-runtime validation cycle: WordPress runtime, Sheet write, REST response, frontend confirmation, duplicate check, and end-to-end path are `PASS`.
- Documented the UI stabilization sequence through `bfb1385`, including modal/close behavior, theme-hover/link isolation, CTA alignment, same-answer reselection, silent normal submission, retained error feedback, and filemtime asset cache busting.
- Defined the future `result_ctas` configuration, the `/tests-sante/` catalogue requirement, the standard questionnaire lifecycle/runtime gate, and the plugin-versus-page-layout boundary.
- Recorded the unsolved `#faf8f5` full-viewport background as a WordPress/page-layout task rather than a plugin full-bleed responsibility.

### Runtime

- Enhanced Central Google Sheets Storage Format: transitioned from monolithic JSON blobs to deterministic, human-readable column-by-column layout across all 7 proprietary worksheets (`Sedentarite`, `Hydratation`, `Fatigue`, `Sommeil`, `Nutrition`, `Activite_Physique`, `Pieds_Confort`).
- Added canonical scored question headers (`QUESTION_ID — question text`) and safety question headers in canonical order.
- Enriched server-side scoring engine output with authoritative human-readable answer labels (`label`).
- Enforced strict header schema validation in Google Apps Script with fail-safe rejection (`schema_conflict`) on incompatible existing headers.
- Added test suites `tests/google-sheets-storage-format.test.php` and `tests/google-sheets-storage-format.test.js` verifying schema generation, formula-injection protection, and tamper resistance across all 34 test suites.

- Completed Stage 11 (Final Production Packaging & Release Readiness): built deterministic release candidate archive `lifemetrics-questionnaires-stage11-rc1.zip` containing all runtime-required plugin files with strict exclusion of development artifacts (`tests/`, `.DS_Store`, `.git*`).
- Created release packaging script `scripts/build-release-zip.sh`.
- Added global tamper-resistance test suite `tests/global-tamper-resistance.test.php` proving that for all 8 questionnaires (PSS10 + 7 proprietary instruments), forged client scores, categories, dimensions, and safety flags are strictly rejected in favor of server-side raw answer evaluation.
- Added release audit test suite `tests/stage11-release-audit.test.php` verifying inventory completeness, secret/absolute path scan clean status, and lifecycle fail-closed behavior for unapproved review questionnaires.
- Verified complete test suite matrix (32/32 PASS across 19 PHP and 13 JS test suites).
- Documented manual WordPress activation checklist and Google Apps Script deployment procedure in `STAGE_REPORTS/STAGE-11.md`.

- Completed Stage 10.7 (Pieds & Confort Postural): implemented canonical configuration `questionnaires/pieds-confort-postural/questionnaire.php` conforming strictly to Schema 2.0.0 using authoritative text from `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Pieds_Confort_Postural_V1.pdf`.
- Registered `pieds-confort-postural` in `LifeMetrics_Questionnaire_Registry` mapping.
- Added comprehensive PHP and JavaScript unit test suites (`tests/questionnaire-pieds-confort-postural.test.php` and `tests/questionnaire-pieds-confort-postural.test.js`) verifying Schema 2.0.0 compliance, boundary score classification (0, 15, 16, 27, 28, 38, 39, 48), 6 dimensions with 8 pts capacity each (48 total), dimension attention threshold rule ($\le 2/8$ emitting `ATTENTION_*` messages without category capping), 4 non-scored safety questions (PFSF01–PFSF04) emitting `PIEDS_ATTENTION_MESSAGE`, empty classification rules (`GUARDRAILS_PRESENT = NO`), weakest dimension ordering with deterministic tie-breaking, Profile E arithmetic verification, and server scoring authority.
- Completed Stage 10: all 7 proprietary LifeMetrics questionnaires (Sédentarité, Hydratation, Fatigue & Récupération, Sommeil, Nutrition, Activité Physique, Pieds & Confort Postural) are implemented, registered, and verified across all 30 automated test suites.

- Completed Stage 10.6 (Activité Physique): implemented canonical configuration `questionnaires/activite-physique/questionnaire.php` conforming strictly to Schema 2.0.0 using authoritative text from `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Activite_Physique_V1.pdf`.
- Registered `activite-physique` in `LifeMetrics_Questionnaire_Registry` mapping.
- Added comprehensive PHP and JavaScript unit test suites (`tests/questionnaire-activite-physique.test.php` and `tests/questionnaire-activite-physique.test.js`) verifying Schema 2.0.0 compliance, AP04 duplicate 4-point maximum (options 3 & 4 = 4 pts), boundary score classification (0, 15, 16, 27, 28, 39, 40, 48), 5 dimensions with capacities 12/8/8/8/12 (48 total), weakest dimension percentage ranking with deterministic tie-breaking, and server scoring authority.

- Completed Stage 10.5 (Nutrition): implemented canonical configuration `questionnaires/nutrition/questionnaire.php` conforming strictly to Schema 2.0.0 using authoritative text from `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Nutrition_V1.pdf`.
- Registered `nutrition` in `LifeMetrics_Questionnaire_Registry` mapping.
- Added comprehensive PHP and JavaScript unit test suites (`tests/questionnaire-nutrition.test.php` and `tests/questionnaire-nutrition.test.js`) verifying Schema 2.0.0 compliance, duplicate 4-point mappings (NT03: options 3 & 4 = 4 pts, NT06: options 3 & 4 = 4 pts), non-linear fruit scoring (NT02: option 3 = 4 pts [max], option 4 = 3 pts), reverse scoring (NT09 and NT10), boundary score classification (0, 15, 16, 27, 28, 38, 39, 48), 6 dimensions with 8 pts capacity each (48 total), safety questions (NTSF01–NTSF03) score independence with `NUTRITION_ATTENTION_MESSAGE`, weakest dimension ordering, and server scoring authority.

- Completed Stage 10.4 (Sommeil): implemented canonical configuration `questionnaires/sommeil/questionnaire.php` conforming strictly to Schema 2.0.0 using authoritative text from `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Sommeil_V1.pdf`.
- Registered `sommeil` in `LifeMetrics_Questionnaire_Registry` mapping.
- Added comprehensive PHP and JavaScript unit test suites (`tests/questionnaire-sommeil.test.php` and `tests/questionnaire-sommeil.test.js`) verifying Schema 2.0.0 compliance, non-linear Q1 scoring (SL01: 0, 1, 2, 4, 3 points), boundary score classification (0, 15, 16, 27, 28, 38, 39, 48), 5 dimensions with capacities 8/12/8/12/8 (48 total), safety questions (SLSF01–SLSF03) score independence, and weakest dimension ordering.

- Completed Stage 10.3 (Fatigue & Récupération): implemented canonical configuration `questionnaires/fatigue-recuperation/questionnaire.php` conforming strictly to Schema 2.0.0 using authoritative text from `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Fatigue_Recuperation_V1.pdf`.
- Registered `fatigue-recuperation` in `LifeMetrics_Questionnaire_Registry` mapping.
- Added comprehensive PHP and JavaScript unit test suites (`tests/questionnaire-fatigue-recuperation.test.php` and `tests/questionnaire-fatigue-recuperation.test.js`) verifying Schema 2.0.0 compliance, boundary score classification (0, 15, 16, 27, 28, 38, 39, 48), dimension attention rules ($\le 2/8$ threshold), safety questions (FRSF01–FRSF03) score independence, weakest dimension ordering, and all synthetic validation profiles 1–7.

- Completed Stage 10.2 (Hydratation): implemented canonical configuration `questionnaires/hydratation/questionnaire.php` conforming strictly to Schema 2.0.0 using authoritative text from `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Hydratation_V1.pdf`.
- Registered `hydratation` in `LifeMetrics_Questionnaire_Registry` mapping and aligned Submission Service payload attributes.
- Added comprehensive PHP and JavaScript unit test suites (`tests/questionnaire-hydratation.test.php` and `tests/questionnaire-hydratation.test.js`) verifying Schema 2.0.0 compliance, boundary score classification (0, 15, 16, 27, 28, 38, 39, 48), N/A capacity normalization on HY05 (44/44 -> 48/48, non-integer rounding), safety questions (HYSF01–HYSF03) score independence and priority triggering, weakest dimension ordering, and all synthetic validation profiles 1–5.

- Completed Stage 10.1 (Sédentarité): implemented canonical configuration `questionnaires/sedentarite/questionnaire.php` conforming strictly to Schema 2.0.0 using authoritative text from `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Sedentarite_V1.pdf`.
- Registered `sedentarite` in `LifeMetrics_Questionnaire_Registry` mapping.
- Added comprehensive PHP and JavaScript unit test suites (`tests/questionnaire-sedentarite.test.php` and `tests/questionnaire-sedentarite.test.js`) verifying Schema 2.0.0 compliance, boundary score classification (0, 15, 16, 27, 28, 38, 39, 48), N/A capacity normalization for optional occupational items SD07/SD08, D1 guardrail capping at `SEDENTARITE_A_REDUIRE`, dimension attention rules, weakest dimension ordering, and all synthetic validation profiles A–F.

- Completed Stage 9 Multi-Destination Google Backend Architecture: implemented generic server-side submission transport routing (`class-submission-service.php`, `class-google-apps-script-adapter.php`, and `backend/generic-google-apps-script.gs`).
- Added dynamic endpoint resolution supporting per-instrument constants (e.g. `LMQ_PSS10_GOOGLE_ENDPOINT`, `LMQ_HYDRATATION_GOOGLE_ENDPOINT`), mapping array `LMQ_GOOGLE_ENDPOINTS`, and filter hook `lifemetrics_questionnaire_backend_endpoint`.
- Added strict HTTPS 302 redirect verification (accepting only `script.googleusercontent.com` targets), formula-injection protection, idempotency handling, and comprehensive error mapping (500 for unconfigured storage, 502 for upstream network/HTTP/rejection errors).
- Added multi-destination routing test suite `tests/backend-routing.test.php` verifying BACK-001 through BACK-012.

- Completed Stage 8 Isolated Local WordPress & PSS10 Validation: verified complete WordPress runtime lifecycle (plugin bootstrap, shortcode rendering, dynamic instance IDs, asset enqueues, REST dispatch, server-side scoring, and upstream Google Sheet forwarding).
- Added responsive browser simulation matrix tests across mobile (375px), tablet (768px), and desktop (1440px) with 0 errors (`tests/wordpress-integration.test.php` and `tests/pss10-browser-responsive.test.js`).

- Completed Stage 7 All-PDF Capability Audit: verified full PHP and JavaScript engine support for all 7 proprietary LifeMetrics questionnaire methodologies (duplicate point mappings, non-linear scoring, N/A capacity normalization, category guardrails, dimension attention thresholds, weakest dimension ordering, and priority-sorted safety messages).
- Added standalone PHP and Node.js audit test suites (`all-pdf-capability-audit.test.php` and `all-pdf-capability-audit.test.js`).

- Migrated PSS10 to the generic configuration engine (`questionnaires/pss10/questionnaire.php`) strictly validated under Schema 2.0.0.
- Wired PSS10 shortcode to render via `LifeMetrics_Questionnaire_Renderer` with the shared generic frontend runtime (`questionnaire-ui.js` + `questionnaire-engine.js`) and PSS10 presentation overrides (`template.php`, `style.css`), retaining `app.js` on disk strictly as a rollback asset.
- Upgraded PSS10 REST submission adapter in `class-legacy-pss10-runtime.php` to score submissions via `LifeMetrics_Questionnaire_Scoring_Engine` and construct the exact flat payload required by Google Apps Script.
- Replaced hardcoded root ID logic with dynamic config-driven unique IDs.


- Added schema 2.0.0 validation with separate classification/safety messages, authoritative result CTAs, explicit ready approvals, and fail-closed public registry integration.
- Added pure PHP and JavaScript scoring engines with explicit answer mapping, N/A normalization, half-up rounding, dimensions, attention, weakest dimensions, category caps, safety flags, and canonical JSON parity tests. The generic core is not connected to live rendering or REST submission.
- Completed Stage 3 with dedicated shortcode and REST controllers. They preserve the exact PSS10 shortcode and `/pss10/submit` route by delegating to the temporary legacy runtime; no wildcard route, generic renderer, scoring, configuration, or backend cutover was introduced.
- Added the Stage 3.2 explicit questionnaire registry with in-directory path enforcement, cached internal resolution, and a fail-closed public `ready` lifecycle gate. Its production map is intentionally empty, so PSS10 remains on the unchanged legacy path and no new questionnaire is exposed.
- Began the approved narrowed Stage 3 with a PHP-only bootstrap/orchestration extraction: `LifeMetrics_Plugin` registers hooks once and the temporary `LifeMetrics_Legacy_PSS10_Runtime` preserves the validated PSS10 path.
- Updated plugin metadata to the approved minimum PHP version 8.2. No generic registry, schema, scoring, renderer, assets, wildcard REST route, backend adapter, or questionnaire migration was introduced in this unit.
- Fixed the confirmed OVH/WordPress automatic ContentService redirect failure in `1e8899c`: the Apps Script payload is POSTed once, the trusted HTTPS Google redirect is followed once with a clean GET, and final success remains strictly verified.
- Removed the temporary PHI-safe upstream diagnostic logging after confirmation.
- No questionnaire content, scoring, frontend UX, REST contract, Apps Script, or Sheet schema change.
- Subsequent focused PSS10 UI stabilization commits: `54367e1`, `84d12d8`, `943a946`, `d9f41f8`, `046743b`, and `bfb1385`; see the dedicated production-runtime milestone report for scope and superseded background attempts.

## Baseline - 2026-09-03

- Recorded the existing PSS10 WordPress plugin at checkpoint `d816898` without changing source bytes.
- Baseline source-manifest SHA-256: `5206e7a4a4fff67661e21d2761fd3b2ea94f1a435f05bcd65376b844a6d3cdb9`.
