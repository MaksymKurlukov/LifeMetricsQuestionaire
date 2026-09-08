# Changelog

All notable LifeMetrics Questionnaires plugin/project changes are documented here. The tracked standalone PSS10 changelog/history remains separate.

## [Unreleased]

### Documentation

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

- Began the approved narrowed Stage 3 with a PHP-only bootstrap/orchestration extraction: `LifeMetrics_Plugin` registers hooks once and the temporary `LifeMetrics_Legacy_PSS10_Runtime` preserves the validated PSS10 path.
- Updated plugin metadata to the approved minimum PHP version 8.2. No generic registry, schema, scoring, renderer, assets, wildcard REST route, backend adapter, or questionnaire migration was introduced in this unit.
- Fixed the confirmed OVH/WordPress automatic ContentService redirect failure in `1e8899c`: the Apps Script payload is POSTed once, the trusted HTTPS Google redirect is followed once with a clean GET, and final success remains strictly verified.
- Removed the temporary PHI-safe upstream diagnostic logging after confirmation.
- No questionnaire content, scoring, frontend UX, REST contract, Apps Script, or Sheet schema change.
- Subsequent focused PSS10 UI stabilization commits: `54367e1`, `84d12d8`, `943a946`, `d9f41f8`, `046743b`, and `bfb1385`; see the dedicated production-runtime milestone report for scope and superseded background attempts.

## Baseline - 2026-09-03

- Recorded the existing PSS10 WordPress plugin at checkpoint `d816898` without changing source bytes.
- Baseline source-manifest SHA-256: `5206e7a4a4fff67661e21d2761fd3b2ea94f1a435f05bcd65376b844a6d3cdb9`.
