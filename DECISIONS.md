# LifeMetrics Questionnaires decision log

Log version: 1.0.0

Status: `APPROVED`

Last updated: 2026-09-08

Decision owner and approver: Maksym Kurlukov.

DEC-001 through DEC-015 were accepted by Maksym Kurlukov on 2026-09-03. DEC-016 through DEC-019 were accepted through explicit project directions on 2026-09-08. Future changes must preserve this approval history and use an amended or superseding ADR.

Authority: this file owns architectural decisions. Sequencing remains in `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`; accepted component and schema consequences are reflected in `ARCHITECTURE.md` and `QUESTIONNAIRE_SCHEMA.md`.

## ADR format

Each decision records context, alternatives, proposal/rationale, consequences, and rollback/compatibility impact. Future changes append or supersede an ADR; they do not rewrite an accepted decision silently.

## DEC-001 - One engine, many configurations

- Status: `ACCEPTED` on 2026-09-03 by Maksym Kurlukov.
- Context: duplicating PSS10 JS/CSS for every questionnaire multiplies fixes and drift.
- Alternatives: independent applications; partially shared UI; one fully shared runtime.
- Proposal/rationale: one shared PHP/frontend runtime and versioned data configurations. Shared behavior is implemented once.
- Consequences: schema quality and generic tests become release-critical; exceptional presentation needs declarative data or an ADR.
- Rollback/compatibility: PSS10 legacy remains until generic parity; revert its cutover without affecting standalone.

## DEC-002 - PHP questionnaire configuration and one shared template

- Status: `ACCEPTED` on 2026-09-03 by Maksym Kurlukov.
- Context: per-test `config.js` creates two sources of truth and copied templates invite divergence.
- Alternatives: JSON files, per-test JS, per-test PHP/template, PHP data plus one template.
- Proposal/rationale: `questionnaires/<id>/questionnaire.php` returns plain data; `templates/questionnaire.php` is shared. PHP is already the trusted WordPress runtime and safely serializes a client projection.
- Consequences: configuration must contain no callbacks/I/O; template overrides require a new ADR based on a real unmet need.
- Rollback/compatibility: legacy PSS template/assets remain through cutover rollback window.

## DEC-003 - One generic shortcode with explicit lifecycle gate

- Status: `ACCEPTED` on 2026-09-03 by Maksym Kurlukov.
- Context: aliases add registration/documentation surface without new capability.
- Alternatives: one shortcode per questionnaire; aliases plus generic; generic only.
- Proposal/rationale: V1 supports only `[lifemetrics_questionnaire id="..."]`; registry explicit lookup and `ready` status control exposure.
- Consequences: simple WordPress authoring and one validation path; aliases can be added later only for demonstrated migration need.
- Rollback/compatibility: preserves current PSS10 shortcode shape.

## DEC-004 - Generic same-origin REST and canonical server calculation

- Status: `ACCEPTED` on 2026-09-03 by Maksym Kurlukov.
- Context: browser totals can be modified and Google must not be called directly.
- Alternatives: browser-to-Google; per-questionnaire routes; generic same-origin route with server scoring.
- Proposal/rationale: `POST /lifemetrics-questionnaires/v1/{id}/submit`; PHP resolves exact version and recomputes every derived field.
- Consequences: PHP and JS scoring implementations require golden parity; client result is optional evidence only.
- Rollback/compatibility: route shape preserves current `/v1/pss10/submit`; legacy handler can remain during migration.

## DEC-005 - Hybrid Sheet model with one canonical write

- Status: `ACCEPTED` on 2026-09-03 by Maksym Kurlukov.
- Context: questionnaires have variable answers/dimensions/safety, while one tab per questionnaire fragments global audit/deduplication.
- Alternatives: one wide common tab; canonical tab per questionnaire; common ledger plus canonical detail tabs; one common canonical row plus derived views.
- Proposal/rationale: one canonical `submissions` append with common columns and JSON snapshots; per-questionnaire views are derived/noncanonical.
- Consequences: avoids sparse columns and multi-tab partial commits; manual JSON analysis is less convenient.
- Rollback/compatibility: PSS10 legacy `results` is untouched until shadow migration; if JSON operations fail, move to a proper datastore rather than dual canonical Sheets.

## DEC-006 - General min/max N/A normalization with half-up rounding

- Status: `ACCEPTED` on 2026-09-03 by Maksym Kurlukov.
- Context: count x 4 works for current proprietary tests but not PSS10 or future non-uniform scales.
- Alternatives: questionnaire-specific formulas; raw/available-max only; general min/max affine normalization.
- Proposal/rationale: sum applicable min/max capacity, map to configured target scale, and use one `half_up` mode. It reduces to the source 0-4 formula where applicable.
- Consequences: more general without ID branches; zero capacity fails closed; parity fixtures are mandatory.
- Rollback/compatibility: PSS10 without N/A remains raw 10-50; source-specific formula can only replace this through versioned ADR.

## DEC-007 - Calculated and displayed categories remain distinct

- Status: `ACCEPTED` on 2026-09-03 by Maksym Kurlukov.
- Context: Sédentarité requires a category cap without changing numeric score.
- Alternatives: hidden weighting; mutate final score; one category field; two explicit category fields.
- Proposal/rationale: numeric score selects `calculated_category`; ordered guardrails produce `displayed_category` and message codes only.
- Consequences: payload/storage/UI must retain both and applied rule IDs; no silent weighting.
- Rollback/compatibility: questionnaires without guardrails store equal category codes.

## DEC-008 - Safety is non-scored and independently prioritized

- Status: `ACCEPTED` on 2026-09-03 by Maksym Kurlukov.
- Context: favorable lifestyle scores can coexist with answers requiring professional attention.
- Alternatives: subtract points; cap category; hide safety behind general results; separate non-scored safety path.
- Proposal/rationale: safety triggers never enter scores/categories and render before general recommendations at any score.
- Consequences: safety content and privacy need strict handling; dedicated high-score trigger tests required.
- Rollback/compatibility: configurations without safety use empty collections and unchanged result flow.

## DEC-009 - Independent mandatory versioning

- Status: `ACCEPTED` on 2026-09-03 by Maksym Kurlukov.
- Context: historical scores must remain interpretable after content/scoring/backend changes.
- Alternatives: plugin version only; mutable current config; questionnaire/schema/submission versions.
- Proposal/rationale: store questionnaire version, configuration schema version, and submission schema version independently; use documented SemVer gates.
- Consequences: unsupported versions fail; historical fixtures/config references are retained; scoring changes require at least a questionnaire minor bump.
- Rollback/compatibility: current PSS payload gets an explicit compatibility mapping; history is not silently relabeled.

## DEC-010 - Lifecycle statuses and public-only ready

- Status: `ACCEPTED` on 2026-09-03 by Maksym Kurlukov.
- Context: incomplete/future content must coexist without accidental exposure.
- Alternatives: directory presence means public; boolean enabled; four-state lifecycle.
- Proposal/rationale: `draft`, `review`, `ready`, `disabled`; only `ready` is rendered/accepted publicly.
- Consequences: transition requires source/approval/tests; non-public content is not serialized.
- Rollback/compatibility: set a config `disabled` or revert registry entry without deleting historical files.

## DEC-011 - Explicit answer points encode reverse/non-linear scoring

- Status: `ACCEPTED` on 2026-09-03 by Maksym Kurlukov.
- Context: reverse flags and question-ID conditions create special-case engines and can miss non-linear answers.
- Alternatives: engine formula types; reverse question lists; explicit points for every answer.
- Proposal/rationale: every answer defines selected `value`, public label, points, and applicability.
- Consequences: configuration is verbose but fully auditable and generic; transcription tests become essential.
- Rollback/compatibility: exactly represents current PSS reverse scoring and Sommeil SL01 non-linearity.

## DEC-012 - One canonical backend append

- Status: `ACCEPTED` on 2026-09-03 by Maksym Kurlukov.
- Context: Apps Script cannot provide a robust transaction across multiple Sheet tabs.
- Alternatives: multi-tab canonical writes with recovery; one canonical row; external database now.
- Proposal/rationale: append exactly one versioned canonical row under lock; generate reporting views later.
- Consequences: JSON snapshot columns; simple idempotency and recovery; possible future datastore migration.
- Rollback/compatibility: legacy Sheet remains available during shadow run.

## DEC-013 - Structural PSS10 migration freezes behavior

- Status: `ACCEPTED` on 2026-09-03 by Maksym Kurlukov.
- Context: refactoring and content/scoring changes together make regressions unauditable.
- Alternatives: improve PSS during migration; freeze then change separately.
- Proposal/rationale: characterize and preserve exact current behavior; later UX/content/legal changes are separately authorized/versioned.
- Consequences: current label inconsistencies and CTA stubs may temporarily remain.
- Rollback/compatibility: one cutover commit with retained legacy files.

## DEC-014 - Privacy-minimal payload

- Status: `ACCEPTED` on 2026-09-03 by Maksym Kurlukov.
- Context: answers/safety may be health-related even without direct identity.
- Alternatives: collect analytics/identity by default; anonymous minimal fields; no persistence.
- Proposal/rationale: store only answer/result/version/session/operational essentials; path-only source page; no IP, fingerprint, identity, free text, or query data by default.
- Consequences: fewer analytics/abuse signals; any expansion needs privacy decision and schema review.
- Rollback/compatibility: fields can be omitted/null without inventing historical identity.

## DEC-015 - Native tooling before dependencies

- Status: `ACCEPTED` on 2026-09-03 by Maksym Kurlukov.
- Context: the plugin currently has no build chain and target behavior is feasible with PHP/vanilla JS/CSS.
- Alternatives: bundler/framework/test framework immediately; native modules/scripts plus minimal Node/PHP checks.
- Proposal/rationale: no bundler/runtime dependency until compatibility or test evidence proves native tools insufficient.
- Consequences: less operational complexity; shared modules may use classic scripts if WordPress/browser support requires it.
- Rollback/compatibility: a later dependency decision records measured need, migration, and removal plan.

## DEC-016 - Plugin versus WordPress page-layout boundary

- Status: `ACCEPTED` on 2026-09-08 by Maksym Kurlukov.
- Context: two scoped plugin full-bleed techniques did not make the `#faf8f5` background span the real theme viewport because the shortcode remains inside WordPress layout containers.
- Alternatives: couple plugin CSS to the current page/theme/Elementor; apply global body styles; keep trying root escape techniques; assign surrounding page composition to WordPress.
- Proposal/rationale: the plugin owns the questionnaire/card/modal/flow/result/CTA/REST/assets; WordPress owns header/footer, full-width surrounding background, and catalogue page layout. No page ID, theme class, Elementor selector, or global body/html coupling is allowed in the plugin.
- Consequences: the full-bleed background remains an explicit page-layout task and is not claimed solved by plugin runtime stabilization.
- Rollback/compatibility: no runtime change; future layout work is reversible in WordPress without changing questionnaire behavior.

## DEC-017 - Silent persistence and configuration-owned result actions

- Status: `ACCEPTED` on 2026-09-08 by Maksym Kurlukov.
- Context: technical saving/success toasts create unnecessary ambiguity in an anonymous self-assessment, and per-questionnaire CTA literals do not scale.
- Alternatives: retain storage notices; hardcode actions in JavaScript; define result actions in questionnaire configuration.
- Proposal/rationale: normal saving and success remain silent, errors remain visible, and Stage 3 introduces ordered `result_ctas` with `label`, `url`, `variant`, and `enabled`.
- Consequences: submission/storage semantics remain unchanged; disabled future destinations render without a broken public link; CTA behavior becomes testable data.
- Rollback/compatibility: the current PSS10 primary link and disabled secondary action are the migration input; no Stage 3 runtime work is authorized by this ADR.

## DEC-018 - Narrow Stage 3 and require PHP 8.2

- Status: `ACCEPTED` on 2026-09-08 by Maksym Kurlukov.
- Context: the original Stage 3 proposed empty renderer/assets shells and generic REST routing before schema, scoring, frontend, or generic submission behavior existed.
- Alternatives: retain all original scaffolding; narrow Stage 3 to the five immediately useful PHP classes; combine later stages.
- Proposal/rationale: Stage 3 contains only `LifeMetrics_Plugin`, `LifeMetrics_Questionnaire_Registry`, `LifeMetrics_Legacy_PSS10_Runtime`, `LifeMetrics_Shortcodes`, and `LifeMetrics_REST_Controller`. It preserves the exact PSS10 route and defers all specified later-stage responsibilities. Minimum PHP is 8.2.
- Consequences: Stage 3 can progress in small working units without dead classes or premature public behavior; PSS10 remains on a named compatibility path through Stage 6.
- Rollback/compatibility: each Stage 3 unit is independently revertible to baseline `e663351`; no wildcard route or PSS10 configuration migration exists to unwind.

## DEC-019 - Schema 2.0.0 readiness and message separation

- Status: `ACCEPTED` on 2026-09-08 by Maksym Kurlukov.
- Context: strict Stage 4 validation required an explicit home for ordinary guardrail messages, one authoritative CTA field, and configuration-readable publication gates.
- Alternatives: leave message codes unresolved; reuse safety messages; keep approvals external; introduce a generic workflow engine.
- Proposal/rationale: schema 2.0.0 adds `classification_messages`, keeps `safety_messages` separate, standardizes on `result_ctas`, and requires four boolean approval gates for `ready` only.
- Consequences: every ordinary rule/attention message resolves explicitly; incomplete approvals do not invalidate non-ready lifecycle states; required-field additions follow the approved major-version policy.
- Rollback/compatibility: Stage 4 remains disconnected from live rendering and submission; legacy PSS10 behavior and its later Stage 6 migration remain unchanged.

## Approval record

| Field | Value |
|---|---|
| Decision owner | Maksym Kurlukov |
| Approver | Maksym Kurlukov |
| Approval date | 2026-09-03 for DEC-001 through DEC-015; 2026-09-08 for DEC-016 through DEC-019 |
| Approved decisions | DEC-001 through DEC-019 |
| Required action | none for STAGE 1; future changes require an amended or superseding ADR |
