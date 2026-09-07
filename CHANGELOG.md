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

### Runtime

- Fixed the confirmed OVH/WordPress automatic ContentService redirect failure in `1e8899c`: the Apps Script payload is POSTed once, the trusted HTTPS Google redirect is followed once with a clean GET, and final success remains strictly verified.
- Removed the temporary PHI-safe upstream diagnostic logging after confirmation.
- No questionnaire content, scoring, frontend UX, REST contract, Apps Script, or Sheet schema change.

## Baseline - 2026-09-03

- Recorded the existing PSS10 WordPress plugin at checkpoint `d816898` without changing source bytes.
- Baseline source-manifest SHA-256: `5206e7a4a4fff67661e21d2761fd3b2ea94f1a435f05bcd65376b844a6d3cdb9`.
