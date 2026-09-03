# LifeMetrics Questionnaires architecture

Document version: 1.0.0

Status: `APPROVED`

Last updated: 2026-09-03

Approved by: Maksym Kurlukov on 2026-09-03.

Authority: this file defines component boundaries and dependency direction. Project sequencing and stage gates remain authoritative in `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`.

## Objective

The target WordPress plugin provides one shared questionnaire runtime for PSS10 and versioned LifeMetrics questionnaire configurations. Questionnaire content is data. WordPress integration, scoring behavior, UI, assets, transport, and backend integration are shared.

The existing standalone PSS10 project at repository root remains a protected reference. The plugin baseline is checkpoint `d816898` and must remain behaviorally stable until its dedicated migration stage.

## Architectural invariants

1. One shared PHP integration and one shared frontend engine.
2. A questionnaire owns configuration, not copied application code or base CSS.
3. The registry resolves only explicit IDs; visitor input never becomes a file path.
4. Public shortcode and REST access require lifecycle status `ready`.
5. PHP computes the canonical score from selected answer values. Client-derived totals are advisory only.
6. Questionnaire and submission versions are stored with every canonical result.
7. N/A, dimensions, weakest dimensions, guardrails, and safety flags are generic declarative mechanisms.
8. Guardrails may change `displayed_category`, never the numeric result or `calculated_category`.
9. Safety flags never change score/category and must render before general recommendations.
10. Browser requests remain same-origin. Google Apps Script is reachable only through the server adapter.
11. Upstream URLs are server-controlled and cannot be selected by request/config content.
12. Multiple shortcode instances have isolated state, IDs, selectors, and submission sessions.
13. No hardcoded `/wp-content/` path; WordPress URL/path helpers provide locations.
14. No runtime/build dependency is added until native PHP, browser, WordPress, or installed tooling is demonstrably insufficient.

## Target structure

```text
lifemetrics-questionnaires/
├── lifemetrics-questionnaires.php
├── README.md
├── CHANGELOG.md
├── includes/
│   ├── class-lifemetrics-plugin.php
│   ├── class-questionnaire-registry.php
│   ├── class-questionnaire-schema-validator.php
│   ├── class-questionnaire-scoring-engine.php
│   ├── class-questionnaire-renderer.php
│   ├── class-assets.php
│   ├── class-shortcodes.php
│   ├── class-rest-controller.php
│   └── class-submission-service.php
├── integrations/google-apps-script/
│   ├── class-google-apps-script-adapter.php
│   └── google-apps-script.gs
├── templates/questionnaire.php
├── assets/
│   ├── css/questionnaire-base.css
│   ├── css/questionnaire-components.css
│   ├── js/questionnaire-engine.js
│   ├── js/questionnaire-ui.js
│   ├── js/questionnaire-api.js
│   └── icons/{shield,lock,clock}.svg
├── questionnaires/<questionnaire-id>/questionnaire.php
└── tests/
```

The shared `templates/questionnaire.php` is the default and only planned template. A questionnaire-specific template is permitted only after a real approved configuration cannot be represented by the shared template and an ADR records the exception.

## Component contract

### Bootstrap

`lifemetrics-questionnaires.php` contains plugin metadata, direct-access guard, constants, required orchestrator include, and one initialization call. It contains no questionnaire markup, content, scoring, or upstream request logic.

### Plugin orchestrator

`class-lifemetrics-plugin.php` wires WordPress hooks and shared services once. No service container/framework is planned. It must not branch on questionnaire IDs.

### Questionnaire registry

`class-questionnaire-registry.php` owns the explicit ID-to-file map. It loads and caches plain arrays, verifies `config.id` equals the registry key, delegates schema validation, and exposes separate internal/public lookup methods.

It must never concatenate shortcode or route input into a path. Unknown or non-public configurations fail closed.

### Schema validator

`class-questionnaire-schema-validator.php` enforces the contract in `QUESTIONNAIRE_SCHEMA.md`, including cross-references, result-range coverage, allowed guardrail grammar, and lifecycle readiness. It reports stable developer-facing codes without exposing paths/content to visitors.

It does not repair, default, or reinterpret incomplete scoring/content.

### PHP scoring engine

`class-questionnaire-scoring-engine.php` maps selected values through configuration and produces the canonical result. It is pure application logic: no WordPress hooks, DOM, Google, or persistence.

### Shortcode layer

`class-shortcodes.php` registers only `[lifemetrics_questionnaire]` in V1. It sanitizes the ID, asks the public registry, enqueues shared assets through the asset service, and returns renderer output. Invalid/draft/review/disabled IDs render nothing and never expose content.

### Renderer and template

`class-questionnaire-renderer.php` creates a unique instance ID, same-origin submission URL, shared asset URLs, and a client-safe configuration projection. It escapes output and includes the shared template.

Per-instance configuration is emitted as inert JSON inside the questionnaire root, not as a mutable global. Internal source paths, approvals, and upstream endpoints are excluded.

The shared template contains semantic placeholders only. It does not score, fetch, or contain questionnaire-ID conditionals.

### Asset service

`class-assets.php` registers shared handles once and enqueues them only when a valid shortcode renders. Existing late-style support remains during migration until Gutenberg and Elementor tests prove whether it is still required.

### REST controller

`class-rest-controller.php` owns `POST /wp-json/lifemetrics-questionnaires/v1/{id}/submit`. It enforces request size/content type, resolves the exact public questionnaire/version, validates the request envelope, invokes server scoring, and delegates canonical persistence.

The public permission callback is explicit because the flow is anonymous. It does not weaken body validation, idempotency, or abuse controls.

### Submission service

`class-submission-service.php` compares optional client-derived fields with canonical PHP output, constructs the canonical payload, and calls a server-side adapter. It contains no Sheet column assumptions and returns stable success/duplicate/error results.

### Google Apps Script adapter

`class-google-apps-script-adapter.php` owns the fixed server-configured URL, timeout, redirect policy, serialization, and upstream response verification. It accepts canonical payload data but never an endpoint from visitor/questionnaire input.

The adapter is replaceable without changing the engine/UI/schema. No generalized arbitrary HTTP proxy interface is planned.

### Frontend engine

`questionnaire-engine.js` owns per-instance state and pure calculation/state transitions. It has no DOM, `fetch`, WordPress, Google, questionnaire-ID, or question-ID branches. It must run under Node for parity fixtures.

### Frontend UI

`questionnaire-ui.js` discovers roots, parses their inert configuration, and manages root-scoped accessible DOM rendering and events. It renders intro, progress, answers, result, dimensions, guardrail messages, safety, CTA, errors, retry, and restart. It contains no scoring formula.

### Frontend API

`questionnaire-api.js` performs same-origin JSON POST with explicit timeout, response validation, error classification, concurrency prevention, and exact-payload retry. It contains no scoring or Google-specific behavior.

### Questionnaire configuration

`questionnaires/<id>/questionnaire.php` returns one plain associative array. It has no hooks, includes, callbacks, environment URL, DOM, or HTTP behavior. Its immutable `version` identifies the exact content/scoring interpretation.

## Dependency direction

```text
WordPress
  -> bootstrap
  -> orchestrator
     -> shortcode -> public registry -> schema validator -> renderer -> template/assets
     -> REST -> public registry -> schema validator -> PHP scoring
             -> submission service -> Google adapter

questionnaire.php -> no runtime component dependencies
JS UI -> JS engine + JS API
JS engine -> no UI/API/WordPress/Google dependency
JS API -> no engine/UI/Google dependency
integration adapter -> no UI/renderer dependency
```

Circular dependencies are forbidden. Questionnaire configuration is a leaf data source.

## Public flows

### Render

```text
[lifemetrics_questionnaire id="..."]
 -> sanitize key
 -> exact registry lookup
 -> schema validation
 -> require status=ready
 -> enqueue shared assets
 -> render shared shell + client-safe JSON
 -> initialize isolated root
```

### Submit

```text
browser selected values
 -> same-origin REST
 -> envelope/config/version validation
 -> canonical PHP score
 -> optional client-result comparison
 -> canonical payload
 -> fixed server adapter
 -> independently validating backend
 -> verified response
 -> canonical result to browser
```

### Lifecycle

- `draft`: incomplete/private; invalid completeness is allowed only in non-public tooling.
- `review`: schema-complete candidate awaiting approval; not public.
- `ready`: schema-complete, approved, public shortcode/REST allowed.
- `disabled`: retained for history/rollback but not public.

Moving to `ready` requires recorded source/version/approval and passing contract tests. Files existing on disk does not make a questionnaire public.

## Storage direction

The proposed backend decision is a hybrid with one canonical write:

- one `submissions` ledger row per completion;
- common scalar metadata columns plus JSON snapshots for variable answers/dimensions/safety;
- idempotency across questionnaire ID, version, and session ID;
- optional per-questionnaire reporting tabs are derived/noncanonical;
- legacy PSS10 storage remains untouched until the backend migration stage.

This prevents partial canonical writes across multiple tabs and avoids a wide sparse schema. If JSON querying becomes inadequate, the upgrade is a proper datastore rather than two-way Sheet synchronization.

## Compatibility and migration

- Current PSS10 remains on its legacy implementation until characterization tests and generic parallel runtime exist.
- The canonical future route retains the existing URL shape `/v1/{id}/submit`.
- PSS10 content, reverse scoring, thresholds, labels, payload, errors, and interactions are frozen before cutover.
- Legacy assets remain available for one rollback checkpoint after cutover.
- Existing standalone files are never used as direct replacements for plugin files because the versions differ.

## Security and privacy boundary

- Selected answers and safety flags may constitute health-related information.
- Default payload contains no name, email, phone, WordPress user ID, IP, user-agent, fingerprint, free text, or marketing ID.
- `source_page` is path-only; query/fragment/credentials are stripped.
- Formula-leading strings are escaped before Sheet writes.
- Logs use stable error codes and do not include answer/safety payloads.
- Production retention, access, deletion/export, incident handling, and Sheet ownership must be approved before release.

## Change control

An accepted ADR is required before changing component boundaries, template override policy, route shape, storage model, normalization, category/guardrail semantics, lifecycle statuses, safety independence, version policy, or dependency strategy.

This proposed contract becomes accepted only when STAGE 1 receives explicit user approval.
