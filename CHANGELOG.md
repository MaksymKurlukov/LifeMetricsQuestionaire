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
