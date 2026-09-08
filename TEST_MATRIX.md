# LifeMetrics Questionnaires test matrix

Matrix version: 1.0.0

Status: `APPROVED`

Last updated: 2026-09-08

Approved by: Maksym Kurlukov on 2026-09-03.

Result vocabulary: `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, `NOT_APPLICABLE`. `SKIPPED` requires a recorded reason and never satisfies a mandatory gate.

Authority: this file owns test case IDs and execution evidence. Required stage gates remain in `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`; scoring expectations remain in `QUESTIONNAIRE_SCHEMA.md`.

## Environment evidence

| Environment | Version/state | Evidence status |
|---|---|---|
| Git baseline | plugin checkpoint `d816898`; metadata closure `39a818d` | PASS in STAGE 0 |
| Current branch at STAGE 1 start | `feature/multi-questionnaires`, commit `f9d27ab` | recorded |
| XAMPP PHP | 8.2.4 | available |
| Shell/Homebrew PHP | 8.4.1 | available, not minimum-runtime evidence |
| Node.js | 24.7.0 at baseline check | available |
| Local isolated WordPress test installation | absent | BLOCKED until STAGE 8 |
| Real company WordPress | `lifemetrics.fr`; OVH Web Hosting; PHP 8.2; controlled legacy PSS10 test page | out-of-sequence runtime/E2E evidence recorded on 2026-09-07 |
| WP-CLI | absent | not required for STAGE 1 |
| Elementor | unknown/unavailable | deferred |
| Google sandbox backend | not configured | deferred |

## Current executed evidence

| ID | Test | Command/evidence | Result | Stage |
|---|---|---|---|---|
| BASE-001 | plugin source manifest unchanged | combined SHA-256 `5206e7a4...d3cdb9` | PASS | 0 |
| BASE-002 | PHP entrypoint lint | XAMPP `php -l` | PASS | 0 |
| BASE-003 | PHP template lint | XAMPP `php -l` | PASS | 0 |
| BASE-004 | frontend JS syntax | `node --check` | PASS | 0 |
| BASE-005 | Apps Script smoke/parse | `node lifemetrics-questionnaires/tests/backend-logic.test.js` | PASS | 0 |
| BASE-006 | forbidden frontend Google URL/globals and hardcoded WP path | static scans | PASS | 0 |
| DOC-001 | persistent document existence/headings/cross-links | `test -s` for all eight stage documents; `rg` for required document references and DEC-001..DEC-015 | PASS on 2026-09-03; `STAGE_REPORTS/STAGE-01.md` | 1 |
| DOC-002 | PDF file hash/page manifest matches filesystem | `shasum -a 256`, bundled `pdfinfo`, and `stat -f %z` for all seven inventoried PDFs | PASS on 2026-09-03; 7/7 exact | 1 |
| DOC-003 | schema example remains non-public/incomplete | `rg` for PHP/JSON `status = ready` in `QUESTIONNAIRE_SCHEMA.md` | PASS on 2026-09-03; no ready example | 1 |
| DOC-004 | runtime source digest unchanged | sorted non-`.DS_Store` plugin manifest piped through `shasum -a 256` | PASS on 2026-09-03; `5206e7a4...d3cdb9` | 1 |
| DOC-005 | Markdown whitespace/diff check | `git diff --check` plus `git diff --no-index --check /dev/null <new-file>` for each new Markdown file | PASS on 2026-09-03 | 1 |
| DOC-006 | approval, ADR ownership, stage status, and next-stage consistency | `rg` assertions across approved documents, all 15 ADRs, plan, and STAGE 1 report | PASS on 2026-09-03; Maksym Kurlukov recorded as owner/approver | 1 |
| PSS-FREEZE-001 | exact questions, labels, reverse scoring, and 10/20/21/26/27/50 vectors through actual frontend code | `node lifemetrics-questionnaires/tests/pss10-frontend-characterization.test.js` | PASS on 2026-09-03 | 2 |
| PSS-FREEZE-002 | endpoint scores/categories, payload, validation/upstream errors, and template instance IDs through actual PHP | XAMPP PHP `lifemetrics-questionnaires/tests/pss10-rest-characterization.test.php` | PASS on 2026-09-03 | 2 |
| PSS-FREEZE-003 | deliberate endpoint/reverse/payload mutations are detected | frontend characterization child runs; 13 mutation guards | PASS on 2026-09-03 | 2 |
| PSS-FREEZE-004 | legacy Apps Script behavior remains green | `node lifemetrics-questionnaires/tests/backend-logic.test.js` | PASS on 2026-09-03 | 2 |
| PSS-FREEZE-005 | original ten-file plugin baseline remains byte-identical | explicit original-file manifest piped through `shasum -a 256` | PASS on 2026-09-03; `5206e7a4...d3cdb9` | 2 |
| PSS-FREEZE-006 | forbidden frontend globals/Google URL/WordPress path and final diff | `rg` static scan; `git diff --check` | PASS on 2026-09-03 | 2 |
| PSS-FREEZE-007 | project-owner acceptance of observed migration baseline | approval record in `STAGE_REPORTS/STAGE-02.md`; scope cross-check against plan/inventory | PASS on 2026-09-04; migration/regression only | 2 |
| PSS-REDIRECT-001 | explicit Google ContentService redirect handling | PHP regression: one POST, trusted HTTPS 302 Location, payload-free GET, no second redirect, final response validation | PASS at fix commit `1e8899c` on 2026-09-07 | out-of-sequence |
| STAGE3-BOOT-001 | bootstrap/orchestration extraction | PHP 8.2 lint; one-time hook/shortcode registration; exact shortcode/route; filemtime assets; full PSS10 frontend/REST/backend regressions | PASS in Stage 3.1 on 2026-09-08 | 3 |
| STAGE3-REG-001 | explicit registry and lifecycle public gate | in-root mapped files; cache; matching IDs; draft/review/ready/disabled; unknown/invalid IDs; traversal/outside-base rejection; full PSS10 regressions | PASS in Stage 3.2 on 2026-09-08 | 3 |

## Out-of-sequence manual real-WordPress evidence

These results cover the current legacy PSS10 path only. They do not mark the planned generic/migrated STAGES 8-10 test rows complete.

| Evidence | Result | Scope |
|---|---|---|
| Install/activate and render shortcode in real LifeMetrics theme | PASS | no activation fatal; CSS/JS/icons and one PSS10 instance loaded |
| Ten-question runtime flow | PASS | start, 400 ms auto-navigation, Back preservation, progress, result and score |
| Initial storage with failed acknowledgement | PASS as diagnostic evidence | one Sheet row; REST `lmq_upstream_http_error`/502; automatic redirect chain ended at Google 400 |
| Fixed end-to-end submission | PASS | browser -> WordPress -> REST/PHP -> Apps Script -> expected Sheet write -> verified frontend completion |
| REST response and frontend confirmation | PASS | final REST success accepted; no saving/success storage toast; result remained visible |
| Duplicate check | PASS | same-session duplicate handling verified without a second canonical row |
| Error feedback | PASS | technical saving/success notices are silent; the existing actionable failure feedback remains available |
| Mobile, multiple instances, Gutenberg/Elementor | NOT_RUN | remains manual runtime work for existing later gates |

The earlier `same-session replay = NOT_RUN` statement is superseded by the final controlled duplicate check above. The full evidence chronology is in `STAGE_REPORTS/PSS10-PRODUCTION-RUNTIME-VALIDATION-AND-UI-STABILIZATION.md`.

## Standard questionnaire runtime acceptance gate

Before any questionnaire can be marked `ready`, all applicable rows below must be `PASS` against its exact version and target WordPress environment. Static/unit evidence cannot substitute for runtime evidence.

| Gate | Required evidence |
|---|---|
| `LOCAL_TESTS` | lint, syntax, schema, scoring/parity, characterization, and backend smoke pass |
| `WORDPRESS_RENDER` | shortcode renders without PHP/console/runtime failure |
| `QUESTION_NAVIGATION` | start, all questions, progress, and automatic/manual transitions work |
| `BACK_NAVIGATION` | Retour returns to the prior question and preserves state |
| `ANSWER_RESELECTION` | the same answer can be selected again after navigating back |
| `RESULT_RENDER` | expected score/category/result copy render |
| `CTA_RENDER` | configured labels, enabled states, destinations, alignment, and hover/focus states render |
| `SUBMISSION` | exactly one intended submission is initiated and retry behavior is controlled |
| `REST_RESPONSE` | same-origin REST returns the expected validated success/duplicate/error contract |
| `STORAGE_WRITE` | the expected canonical write exists with the expected questionnaire/version/result |
| `ERROR_FEEDBACK` | real failure remains actionable and does not expose sensitive diagnostics |
| `NO_SUCCESS_STORAGE_TOAST` | normal saving and success storage messages remain invisible |
| `ASSET_VERSIONING` | deployed CSS/JS cache keys change with source modification time |
| `DESKTOP_VISUAL` | approved desktop viewport/theme visual check passes |
| `MOBILE_VISUAL` | approved mobile viewport/theme visual check passes |

## Static architecture tests

| ID | Requirement | Planned stage | Current result |
|---|---|---:|---|
| STATIC-001 | all PHP files lint on minimum supported PHP 8.2 | 3+ | PASS for current Stage 3.2 PHP files on 2026-09-08 |
| STATIC-002 | all JS and Apps Script parse | 2+ | PASS for current legacy/test JS and VM-parsed Apps Script in STAGE 2 |
| STATIC-003 | registry paths are explicit and within plugin | 3 | PASS in Stage 3.2 on 2026-09-08 |
| STATIC-004 | no visitor-derived include path/directory traversal | 3 | PASS in Stage 3.2 on 2026-09-08 |
| STATIC-005 | no frontend `script.google.com` | every source stage | baseline PASS |
| STATIC-006 | no visitor-selected upstream URL | 3/10 | NOT_RUN |
| STATIC-007 | no `document.getElementById` or mutable `window.PSS_*` | 2/5/6 | baseline PASS |
| STATIC-008 | no hardcoded `/wp-content/` | every source stage | baseline PASS |
| STATIC-009 | no questionnaire/question-ID behavior branches in shared engine | 4+ | NOT_RUN |
| STATIC-010 | no `eval`, callbacks, or executable config expressions | 4+ | NOT_RUN |
| STATIC-011 | CSS scoped under shared questionnaire root | 5+ | NOT_RUN |
| STATIC-012 | assets/icons are not copied per questionnaire | 5+ | NOT_RUN |
| STATIC-013 | no credential/secret committed | every stage | manual/static review required |
| STATIC-014 | tracked standalone files unchanged | every migration stage | PASS through STAGE 2 |

## Unit scoring tests

| ID | Case | Expected invariant | Planned stage |
|---|---|---|---:|
| UNIT-001 | ordinary explicit 0-4 points | exact raw score | 4 |
| UNIT-002 | PSS normal answer mapping | selected value maps configured points | 2/4 |
| UNIT-003 | PSS reverse mapping Q4/Q5/Q7/Q8 | explicit reverse points, no ID branch | 2/4 |
| UNIT-004 | PSS total/category boundaries | 10,20,21,26,27,50 preserved | 2/6 |
| UNIT-005 | one N/A | removes question min/max capacity | 4/7 |
| UNIT-006 | multiple N/A | general min/max normalization | 4/7 |
| UNIT-007 | zero available capacity | rejected as unscorable | 4/7 |
| UNIT-008 | half-up boundary | PHP and JS identical | 4/7 |
| UNIT-009 | dimension with full capacity | raw/min/max/percentage correct | 4 |
| UNIT-010 | dimension with partial N/A | percentage uses available capacity | 4/7 |
| UNIT-011 | unavailable dimension | excluded from weakest ranking | 4/7 |
| UNIT-012 | weakest one/two and tie | percentage then config order | 4/7 |
| UNIT-013 | attention threshold | configured metric/operator only | 4/7 |
| UNIT-014 | result endpoints | exhaustive inclusive category mapping | 4/7 |
| UNIT-015 | category cap guardrail | display capped; all numeric fields unchanged | 4/7 |
| UNIT-016 | guardrail boundary D1=2/8 and 3/8 | cap at 2, no cap at 3 | 7/11 |
| UNIT-017 | safety with favorable score | safety triggered; score/category unchanged | 4/7 |
| UNIT-018 | multiple safety triggers | stable de-duplication/priority order | 4/7 |

## Schema and payload contract tests

| ID | Case | Expected | Planned stage |
|---|---|---|---:|
| CONTRACT-001 | missing required field | invalid | 4 |
| CONTRACT-002 | invalid ID/status/version/locale | invalid | 4 |
| CONTRACT-003 | config ID differs registry key | invalid | 3/4 |
| CONTRACT-004 | duplicate question/dimension/category/rule code | invalid | 4 |
| CONTRACT-005 | unknown dimension/question/category/message reference | invalid | 4 |
| CONTRACT-006 | duplicate answer value or invalid points/applicability | invalid | 4 |
| CONTRACT-007 | result range gap/overlap/rank duplication | invalid | 4 |
| CONTRACT-008 | unsupported guardrail type/operator/metric | invalid | 4 |
| CONTRACT-009 | safety points/dimension or unknown trigger | invalid | 4 |
| CONTRACT-010 | incomplete `ready` config | invalid/fails closed | 4 |
| CONTRACT-011 | draft/review/disabled public resolution | denied | 3/4 |
| CONTRACT-012 | internal config fields in client projection | excluded | 3/5 |
| CONTRACT-013 | route/body ID or questionnaire version mismatch | rejected | 3/4 |
| CONTRACT-014 | missing/unknown/extra answer | rejected | 4 |
| CONTRACT-015 | client-derived score/category mismatch | rejected | 4/10 |
| CONTRACT-016 | source page has query/fragment | store path only | 4/10 |
| CONTRACT-017 | unsupported submission schema version | rejected | 4/10 |
| CONTRACT-018 | PHP/JS canonical fixture output | byte-equivalent canonical JSON | 4/7 |

## WordPress integration tests

| ID | Case | Expected | Planned stage |
|---|---|---|---:|
| WP-001 | clean activation/deactivation | no fatal/warning | 8/9 |
| WP-002 | valid generic shortcode | one isolated questionnaire | 9 |
| WP-003 | missing/invalid/draft/review/disabled ID | empty public output/no leak | 9 |
| WP-004 | page without shortcode | shared assets absent | 9 |
| WP-005 | one/multiple shortcode instances | assets once, state/IDs isolated | 9 |
| WP-006 | late-rendered shortcode | CSS present | 9 |
| WP-007 | canonical REST route | correct method/schema/error mapping | 9/10 |
| WP-008 | symlinked plugin path | works without hardcoded paths | 8/9 |
| WP-009 | Gutenberg editor/public | renders without conflict | 9 |
| WP-010 | Elementor editor/public | renders without conflict | 9, availability dependent |

## Browser/E2E and accessibility tests

| ID | Case | Expected | Planned stage |
|---|---|---|---:|
| E2E-001 | intro/modal/start | exact content, focus/keyboard semantics | 5/9 |
| E2E-002 | answer/auto-next/back/change | deterministic state and timer cancellation | 5/9 |
| E2E-003 | progress and final answer | correct accessible values/result transition | 5/9 |
| E2E-004 | result/category/dimensions/guardrail | canonical view model rendered | 5/11+ |
| E2E-005 | safety priority | before general recommendations at any score | 5/12+ |
| E2E-006 | submit verified success | success only after valid response | 5/9/10 |
| E2E-007 | timeout/offline/malformed/4xx/5xx | stable error and exact retry | 5/9 |
| E2E-008 | duplicate success | no duplicate UI failure | 9/10 |
| E2E-009 | restart | new session, clean state | 5/9 |
| E2E-010 | two same/different questionnaires | no cross-instance state/DOM collision | 5/9/11+ |
| A11Y-001 | keyboard-only and visible focus | complete flow | 5/9 |
| A11Y-002 | labels/headings/radiogroup/progress/live regions | valid semantics | 5/9 |
| A11Y-003 | contrast and reduced motion | accepted thresholds/preferences | 5/9 |

## Responsive tests

| ID | View | Expected | Planned stage |
|---|---|---|---:|
| RESP-001 | desktop 1440 px | no clipping/overflow/overlap | 5/9 |
| RESP-002 | tablet 768 px | no clipping/overflow/overlap | 5/9 |
| RESP-003 | mobile 375 px | no clipping/overflow/overlap | 5/9 |
| RESP-004 | 200% zoom | controls/content remain usable | 5/9 |

## Backend tests

| ID | Case | Expected | Planned stage |
|---|---|---|---:|
| BACK-001 | valid canonical payload | one verified append | 10 |
| BACK-002 | invalid JSON/type/size/schema/version/answer | rejected, no append | 10 |
| BACK-003 | tampered score/category/dimension | canonical mismatch rejected | 10 |
| BACK-004 | formula-leading string | safe Sheet text | baseline partial; full 10 |
| BACK-005 | duplicate submission | idempotent success, one row | baseline partial; full 10 |
| BACK-006 | concurrent duplicate | lock prevents duplicate | 10 |
| BACK-007 | lock timeout | stable retryable error | 10 |
| BACK-008 | network/non-2xx/malformed JSON/`ok:false` | no frontend success | 9/10 |
| BACK-009 | stale deployment/schema version | detected/rejected | 10 |
| BACK-010 | shadow old/new reconciliation | zero unexplained divergence | 10 |
| BACK-011 | rollback deployment | previous endpoint restores writes | 10 |

## Questionnaire-specific minimum fixtures

| Questionnaire | Required evidence before implementation/publication |
|---|---|
| PSS10 | reverse cases; 10/20/21/26/27/50; payload; frozen UI/errors/multiple instances |
| Sédentarité | PDF profiles A-F; SD07/08 N/A; D1=2 and 3; weakest percentages |
| Hydratation | documented profiles; 44/44 -> 48; HY05 N/A; high-score+safety |
| Fatigue & récupération | seven source profiles; final FR10; <=2/8 attention; high-score+safety |
| Sommeil | approved synthetic profiles; non-linear SL01; safety; all boundaries |
| Nutrition | approved synthetic profiles; safety; all boundaries |
| Activité physique | five source-requested profiles; AP04 decision; AP12; all boundaries |
| Pieds & confort postural | profiles A-F; approved PF09-PF10 decision; four safety flags |
| Missing-source questionnaires | no fixtures/implementation until complete approved source |

## Evidence rule

Each execution updates result, exact command/environment, date, and report link. Planned rows never imply execution. Required runtime tests cannot be replaced by static checks unless the stage explicitly permits it.
