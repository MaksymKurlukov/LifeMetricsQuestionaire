# LifeMetrics Questionnaires - authoritative implementation plan

Plan version: 1.0

Created: 2026-09-03

Repository: `/Applications/XAMPP/xamppfiles/htdocs/pss`

Plugin: `/Applications/XAMPP/xamppfiles/htdocs/pss/lifemetrics-questionnaires`

Scope of this document: planning only; no implementation is authorized by this document's creation.

Current overall status: `STAGE_0_PASS / STAGE_1_PASS / STAGE_2_PASS / PSS10_RUNTIME_STABILIZATION_PASS / STAGE_3_PASS / STAGE_4_PASS / STAGE_5_PASS / STAGE_6_PASS / STAGE_7_PASS / STAGE_8_PASS / STAGE_9_PASS`

Next executable task: `STAGE 10 - Proprietary Questionnaires Rollout`

Stage 9 completed the multi-destination Google backend architecture, transport adapter, submission service, and REST routing. Stage 10 has not started.

## Status vocabulary

- Stage status: `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `PASS`, `FAIL`, `ROLLED_BACK`.
- Content status: `CONTENT_READY` means all question and result wording needed for implementation is present; it does not mean approved for publication.
- Scoring status: `SCORING_READY` means question scoring, ranges, dimensions, N/A rules, safety rules, and guardrails are explicit and have no known unresolved scoring decision.
- Implementation status: `IMPLEMENTATION_READY` means the content owner has approved the exact source and all scoring prerequisites are ready; `BLOCKED_BY_CONTENT`, `BLOCKED_BY_SCORING`, and `BLOCKED_BY_APPROVAL` identify the gate.
- `PRODUCTION_READY` is granted only after the three-level Definition of Done in section 19 is satisfied.
- A PDF's filename or version label alone never grants any readiness status.

# 1. Executive objective

Provide one installable WordPress plugin ZIP containing multiple independent questionnaires with shared technical infrastructure, while allowing questionnaire-specific methodologies and presentation.

Key final capabilities:
- ONE WordPress plugin (`lifemetrics-questionnaires.zip`).
- Embeddable via shortcode (e.g., `[lifemetrics_questionnaire id="pss10"]`, `[lifemetrics_questionnaire id="hydratation"]`).
- Shared core infrastructure: registry, schema validation, scoring engine, generic submission orchestration.
- Support for questionnaire-specific rules: dimensions, N/A answers, normalization, safety questions, guardrails, non-linear scoring, CTA, and result formatting.
- PSS10 is treated as a distinct legacy profile and must remain functionally frozen, not a universal template for proprietary LifeMetrics questionnaires.
- Frontend architecture separates shared runtime logic from optional presentation overrides (default vs. custom layouts).
- Storage architecture uses generic server-side transport routing to questionnaire-specific Google Sheets targets.

# 2. Current repository baseline

## 2.1 Actual Git state on 2026-09-03

- Branch: `main`, aligned with `origin/main` at commit `fd5dc7a`.
- Tracked source is the standalone PSS10 application.
- Tracked modification already present before this plan: `assets/.DS_Store`.
- Untracked items already present before this plan: root `.DS_Store` and the entire `lifemetrics-questionnaires/` plugin tree, including its `.DS_Store` files.
- Consequence: the WordPress plugin currently has no Git rollback point. This is the reason STAGE 0 is mandatory before source changes.

## 2.2 Actual repository tree relevant to this project

```text
pss/
├── index.html                              # tracked standalone entry point
├── assets/
│   ├── css/style.css                       # tracked standalone CSS
│   ├── js/app.js                           # tracked standalone browser logic
│   ├── js/config.js                        # tracked standalone Google URL config
│   └── icons/{clock,lock,shield}.svg        # tracked standalone icons
├── google-apps-script.gs                   # tracked standalone Apps Script
├── README.md                               # tracked, describes standalone architecture
├── LIFEMETRICS-GUIDE.md                    # tracked, describes standalone operations
├── PRODUCTION-AUDIT-FINAL.md               # tracked, older standalone audit
└── lifemetrics-questionnaires/             # currently entirely untracked
    ├── lifemetrics-questionnaires.php      # WordPress bootstrap + all PHP behavior, 254 lines
    ├── backend/google-apps-script.gs        # hardened plugin-side Apps Script, 143 lines
    ├── questionnaires/pss10/
    │   ├── template.php                    # PSS10 WordPress markup, 128 lines
    │   └── assets/
    │       ├── css/style.css               # PSS10-scoped stylesheet, 658 lines
    │       ├── js/app.js                    # PSS10 WordPress browser app, 402 lines
    │       ├── js/config.js                 # comment-only; no runtime configuration
    │       └── icons/{clock,lock,shield}.svg
    └── tests/backend-logic.test.js          # Apps Script smoke test, 23 lines
```

No `includes/`, shared plugin `assets/`, questionnaire PHP configuration, schema validator, PHP scoring service, frontend scoring unit tests, WordPress test harness, or generic submission contract exists yet.

## 2.3 Current entry points and PSS10 flow

### WordPress/PHP entry point

`lifemetrics-questionnaires/lifemetrics-questionnaires.php` currently performs every plugin responsibility in one file:

1. rejects direct access through `ABSPATH`;
2. defines a server-controlled `LMQ_PSS10_GOOGLE_ENDPOINT`;
3. registers the PSS10 stylesheet and script;
4. prints late-enqueued CSS in the footer for builder compatibility;
5. registers `[lifemetrics_questionnaire]`;
6. sanitizes the ID and resolves it through an explicit one-item whitelist;
7. enqueues PSS10 assets only when the shortcode renders;
8. creates a unique instance ID and includes the PSS10 template;
9. registers `POST /wp-json/lifemetrics-questionnaires/v1/pss10/submit`;
10. validates the PSS10 payload, recomputes the category, forwards it with `wp_remote_post()`, validates the upstream response, and returns same-origin JSON.

### Rendering and browser flow

`questionnaires/pss10/template.php` renders intro, ten-question shell, results, modal, retry state, and toast. Each root has a unique DOM ID plus `data-lmq-questionnaire="pss10"` and its same-origin submission URL. SVG gradient and modal IDs are instance-specific.

`questionnaires/pss10/assets/js/app.js`:

- discovers every PSS10 root with `querySelectorAll` and keeps state inside `initPss10()`;
- contains PSS10 questions, labels, reverse-question indices, category thresholds, and result copy;
- supports intro, auto-next after 400 ms, back, restart, modal focus return, progress, gauge, retry, and multiple instances;
- uses root-scoped selectors and `ownerDocument`; it contains no `document.getElementById` and no mutable `window.PSS_*` state;
- reverse-scores questions 4, 5, 7, and 8 as `6 - selectedValue`;
- sends only to the same-origin REST URL supplied by PHP and verifies `response.ok` plus `data.success === true`.

Observed PSS10 score behavior to freeze before migration:

- selected answers: integers 1-5;
- stored/scored answers for questions 4, 5, 7, 8 are reversed;
- total: 10-50;
- category boundaries: 10-20 `Stress bas`, 21-26 `Stress assez élevé`, 27-50 `Stress très élevé`;
- displayed middle/high badges currently use `Stress modéré` and `Stress élevé`, while stored categories use the longer labels;
- no dimensions, N/A answers, or safety questions;
- at the STAGE 2 freeze, result CTA buttons were non-navigating stubs; this historical baseline was later changed by separately authorized UI stabilization, with current CTA state recorded in the milestone report;
- PSS10 wording, score direction, gauge behavior, modal, timing, error messages, endpoint path, and accessibility behavior are migration invariants unless a later content/UX change is separately authorized.

### Backend flow

```text
browser PSS10 instance
  -> same-origin POST /wp-json/lifemetrics-questionnaires/v1/pss10/submit
  -> WordPress body/content-type/UUID/timestamp/answer/score/category validation
  -> WordPress derives canonical category
  -> fixed server-side Google Apps Script endpoint via wp_remote_post()
  -> Apps Script validates again, derives category, rate-limits, locks, de-duplicates session_id
  -> append to results Sheet
  -> verified {ok:true} response
  -> WordPress {success:true, duplicate:boolean}
  -> browser success toast; otherwise classified retry state
```

The visitor cannot provide or override the upstream URL. The browser does not call Google directly.

## 2.4 Current tests and audit evidence

Read-only checks performed while preparing this plan:

- XAMPP PHP 8.2.4 lint: plugin entry point `PASS`.
- XAMPP PHP 8.2.4 lint: PSS10 template `PASS`.
- Node syntax check: PSS10 `app.js` `PASS`.
- `node tests/backend-logic.test.js`: `PASS`.
- The Apps Script test verifies category boundaries, formula-injection escaping, UUID validation, traversal-like invalid input rejection, and timestamp validation.
- Direct `node --check file.gs` is not a valid check in the installed Node version because `.gs` is an unknown module extension; the VM-based smoke test does parse the complete script and is the current executable syntax signal.
- There are no automated PSS10 scoring tests, UI tests, PHP unit tests, schema tests, REST integration tests, WordPress activation tests, browser tests, or responsive visual tests in the plugin.
- `PRODUCTION-AUDIT-FINAL.md` describes the older standalone/no-cors architecture and must not be treated as proof that the newer WordPress wrapper is production validated.

## 2.5 Duplicated or suspicious files

- `google-apps-script.gs` and `lifemetrics-questionnaires/backend/google-apps-script.gs` are different, not duplicate-equal. The plugin copy is hardened with strict JSON parsing, canonical category derivation, formula-injection protection, locking, and idempotent duplicate success. Neither may be deleted until provenance and deployed-version checks are complete.
- The three SVG icons are byte-identical between standalone and plugin copies. They may become one shared plugin copy only after the PSS10 freeze.
- Standalone and plugin `app.js`, `style.css`, and markup are related but not identical. The plugin versions add scoping, multiple-instance behavior, same-origin REST, and stronger error handling. They must not be mechanically replaced with root copies.
- Plugin `config.js` contains only a comment and is not enqueued. It is a removal candidate after dependency verification, not before.
- `.DS_Store` files are tracked/untracked noise and should be handled only after a baseline commit and explicit cleanup stage.
- Root documentation is authoritative for the old standalone deployment, not for the WordPress plugin. Future documentation must label both contexts clearly until the standalone source is formally archived.

## 2.6 Technical debt and files protected for now

Known debt:

- all PHP concerns are coupled in one global-function file;
- scoring/content/UI/API are coupled in PSS10 `app.js`;
- PSS10 content is split between JavaScript and template;
- only the final category, not the original selected values plus scoring provenance, is server-verifiable;
- the backend schema is hardcoded to q1-q10 and a single questionnaire;
- no questionnaire version is stored;
- no generic schema or lifecycle gate exists;
- no runtime WordPress environment exists;
- the plugin is not tracked by Git;
- no documented link exists between repository Apps Script and the currently deployed Google version.

Protected until the stage that explicitly allows changes:

- all tracked standalone files at repository root;
- all existing plugin PHP, JS, CSS, templates, icons, and Apps Script during STAGE 0-2;
- all approved/near-approved PDF source files;
- the live Google deployment and Sheet;
- the absent local WordPress location (do not install it before STAGE 8).

# 3. Target architecture

## 3.1 Proposed final tree

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
│   └── class-rest-controller.php
├── templates/
│   └── questionnaire.php                # default presentation template
├── assets/
│   ├── css/questionnaire.css            # default scoped stylesheet
│   ├── js/questionnaire-engine.js       # universal scoring logic
│   └── js/questionnaire-ui.js           # universal frontend runtime
└── questionnaires/
    ├── pss10/
    │   └── questionnaire.php
    ├── hydratation/
    │   ├── questionnaire.php
    │   ├── presentation.php             # optional questionnaire-specific override
    │   └── style.css                    # optional questionnaire-specific CSS
    └── sedentarite/
        └── questionnaire.php
```

## 3.2 Shared Core vs Extension Points

SHARED CORE:
- plugin bootstrap, registry, shortcode handling.
- schema validation, generic PHP/JS scoring engine (handles dimensions, N/A normalization, guardrails, safety, calculated categories).
- generic submission infrastructure (REST controller, adapter infrastructure).
- frontend runtime logic (state, scoring integration, submission error handling, auto-next).

QUESTIONNAIRE EXTENSION POINTS:
- `questionnaire.php`: defines questions, explicit point mappings, dimensions, classification rules, messages, safety block, guardrails, results, and CTA.
- `presentation`: optional override defined in config or via directory files to allow custom layouts/themes without duplicating the `questionnaire-ui.js` business logic.
- `storage`: backend configuration mapping each questionnaire to a distinct Google Apps Script endpoint/destination.

# 4. Questionnaire schema contract

## 4.1 Contract rules

- Canonical authoring format: a PHP file returning one plain associative array.
- It is loaded only from the registry's explicit map.
- `schema_version` versions the configuration shape; `version` versions questionnaire content/scoring.
- Changes to wording that affect interpretation, answer values, points, dimensions, thresholds, safety behavior, or guardrails require a questionnaire version increment and new golden fixtures.
- Reordering display-only text may be a patch version; scoring changes require at least a minor version. The exact SemVer policy is finalized in DEC-009.
- No closures/callables, HTML scripts, dynamic file includes, or environment-specific URLs in configuration.
- All IDs use lowercase kebab-case at questionnaire level and uppercase stable codes for questions/categories where source material defines them.
- Public registry access returns only `status === 'ready'`; `draft`, `review`, and `disabled` are never serialized to visitors or accepted by public REST.

## 4.2 Required and optional fields

| Field | Requirement | Contract |
|---|---|---|
| `schema_version` | REQUIRED | configuration contract version, currently `2.0.0` |
| `id` | REQUIRED | exact registry key, lowercase `[a-z0-9-]+` |
| `version` | REQUIRED | questionnaire SemVer string |
| `status` | REQUIRED | `draft`, `review`, `ready`, or `disabled` |
| `title` | REQUIRED | public result/header title |
| `seo_title` | OPTIONAL | page metadata suggestion; shortcode does not mutate page SEO by default |
| `description` | REQUIRED | intro copy or structured intro paragraphs |
| `population` | REQUIRED | target population text |
| `recall_period` | REQUIRED | evaluated period text |
| `estimated_duration` | REQUIRED | human-readable duration |
| `locale` | REQUIRED | initially `fr-FR` |
| `scoring_direction` | REQUIRED | `higher_is_better` or `higher_is_worse` |
| `score` | REQUIRED | target min/max, normalization policy, rounding mode |
| `questions` | REQUIRED | ordered non-empty scored-question array |
| `dimensions` | REQUIRED | may be empty only for explicitly dimensionless instruments such as migrated PSS10 |
| `result_levels` | REQUIRED | exhaustive, non-overlapping target-score ranges with stable codes and display copy |
| `safety_questions` | OPTIONAL | ordered non-scored questions; empty array when none |
| `safety_messages` | REQUIRED if safety exists | stable message codes and presentation copy |
| `classification_rules` | OPTIONAL | declarative ordered guardrails; empty array when none |
| `classification_messages` | REQUIRED | ordinary guardrail/attention messages referenced by stable code |
| `weakest_dimensions` | OPTIONAL | count, eligibility, tie policy, attention threshold; omitted when dimensions empty |
| `result_ctas` | REQUIRED | ordered label, URL, variant, and enabled state; URLs must satisfy the approved destination policy |
| `disclaimer` | REQUIRED | before-test and after-result copy |
| `attribution` | OPTIONAL | source/licensing/legal metadata, required for PSS10 if applicable |
| `content_revision` | OPTIONAL | internal approved document/hash reference; not a replacement for `version` |
| `approvals` | REQUIRED for `ready` | content/scoring, legal/licensing, technical/runtime, and publication gates must be true |

Each scored question requires:

- `id`, `dimension` (or `null` when allowed), `text`, `required`, and ordered `answers`;
- each answer requires a stable scalar `value`, public `label`, `points` integer/decimal or `null`, and `applicable` boolean;
- `points: null` is legal only when `applicable: false`;
- answer points are explicit. Reverse and non-linear scoring are represented by the points attached to answer values, avoiding questionnaire-ID or question-ID branches in engine code;
- optional `help`, `examples`, and `scoring_note` are content/audit metadata only.

Each dimension requires `id`, `label`, ordered `question_ids`, and optional attention/weakest-display settings. Question references must exist exactly once unless an approved multi-dimension design explicitly changes that invariant.

Each result level requires `code`, inclusive `min`, inclusive `max`, `rank` (worst to best), `title`, `description`, and optional `recommendations`. Ranges must cover every integer target score exactly once.

Each classification rule initially supports only an allowlisted rule grammar:

```text
type: category_cap
metric: dimension_score | dimension_percentage
dimension: <known dimension id>
operator: < | <= | == | >= | >
value: number
max_category: <known result code>
message: <known message code, optional>
```

New rule types require schema, PHP, JS, parity tests, and an ADR. Arbitrary expressions or `eval` are forbidden.

## 4.3 Small illustrative configuration fragment

This fragment documents the contract using approved Hydratation wording; it is not an implementation and must not be copied into production before its implementation stage.

```php
<?php
return array(
    'schema_version' => '2.0.0',
    'id' => 'hydratation',
    'version' => '1.0.0',
    'status' => 'review',
    'title' => 'Score LifeMetrics - Hydratation',
    'seo_title' => "Auto-évaluation LifeMetrics - Vos habitudes d'hydratation sont-elles adaptées ?",
    'description' => "Évaluez vos habitudes quotidiennes d'hydratation.",
    'population' => 'Adultes de 18 à 64 ans',
    'recall_period' => '14 derniers jours',
    'estimated_duration' => '2-3 minutes',
    'locale' => 'fr-FR',
    'scoring_direction' => 'higher_is_better',
    'score' => array(
        'target_min' => 0,
        'target_max' => 48,
        'normalize_when_unavailable' => true,
        'rounding' => 'half_up',
    ),
    'questions' => array(
        array(
            'id' => 'HY01',
            'dimension' => 'eau-boissons',
            'text' => "Au cours des 14 derniers jours, quelle place l'eau a-t-elle occupée parmi les boissons que vous consommez pour vous hydrater ?",
            'required' => true,
            'answers' => array(
                array('value' => 'tres-faible', 'label' => 'Très faible', 'points' => 0, 'applicable' => true),
                array('value' => 'faible', 'label' => 'Faible', 'points' => 1, 'applicable' => true),
                array('value' => 'moitie', 'label' => 'Environ la moitié de mes boissons', 'points' => 2, 'applicable' => true),
                array('value' => 'majoritaire', 'label' => 'Majoritaire', 'points' => 3, 'applicable' => true),
                array('value' => 'principale', 'label' => "L'eau est clairement ma boisson principale", 'points' => 4, 'applicable' => true),
            ),
        ),
    ),
    'dimensions' => array(),
    'result_levels' => array(),
    'safety_questions' => array(),
    'classification_rules' => array(),
    'cta' => array('label' => 'Découvrir mon bilan VitaScan', 'destination' => 'vitascan'),
    'disclaimer' => array('before' => '...', 'after' => '...'),
);
```

The empty collections above make the fragment intentionally invalid as a production questionnaire. A contract test must reject an incomplete ready configuration.

# 5. Generic scoring model

## 5.1 Canonical inputs and trust

The request supplies stable selected answer values, not authoritative points. Both browser and PHP map values through the same versioned configuration. PHP recomputes the complete canonical result and rejects a mismatch with any client-supplied derived field. Persisted scores/categories/dimensions/safety flags are server-derived.

Reverse scoring is not a special questionnaire branch. Example: a PSS10 answer value `5` may map to `points: 1` for a reversed question and `points: 5` for a normal question.

## 5.2 Exact operation order

1. Resolve `(questionnaire_id, questionnaire_version)` through the registry; reject a non-public lifecycle status or version mismatch.
2. Validate the schema before scoring. A ready questionnaire with an invalid schema fails closed.
3. Validate request shape, size, IDs, timestamp, locale, answer key set, and scalar value types.
4. Require one selected value for every required scored and safety question. Reject unknown, duplicate, or missing question IDs.
5. Map each selected value to its configured answer. Unknown values fail; no coercion from strings to numbers.
6. Partition scored answers into applicable and N/A. N/A contributes neither score nor min/max capacity.
7. Compute `raw_score` as the sum of configured points for applicable answers.
8. Compute `available_min` and `available_max` as sums of the minimum and maximum possible configured points for each applicable question. Do not assume every question is 0-4.
9. If normalization is enabled and capacity was removed by N/A, calculate:

   ```text
   normalized = target_min
              + (raw_score - available_min)
              / (available_max - available_min)
              * (target_max - target_min)
   final_score = configured_round(normalized)
   ```

   For the LifeMetrics 0-4 model this reduces to `ROUND(raw_score / available_max * 48)`. If `available_max === available_min`, reject as unscorable. If no capacity was removed and the configured scale already equals the raw range, `final_score = raw_score`.
10. Compute each dimension from applicable member questions: `raw_score`, `available_min`, `available_max`, and `percentage = (raw-min)/(max-min)*100`. A dimension with zero available capacity is marked unavailable and excluded from weakest comparisons.
11. Select `calculated_category` from the exhaustive result range containing `final_score`.
12. Apply classification rules in declared order against canonical dimension metrics and category ranks. Rules may change only `displayed_category` and add explanatory messages; they never change `raw_score`, `available_max`, `final_score`, or `calculated_category`.
13. Rank eligible dimensions weakest-first by percentage, then configuration order for deterministic ties; select the configured one or two. Evaluate attention thresholds against configured raw or percentage metrics.
14. Evaluate safety answers independently. Triggered safety flags add stable codes and priority messages; they never alter score or category and are rendered before general recommendations even when the score is favorable.
15. Build the canonical result and storage payload, then compare it with any client-derived summary. Return the canonical server result.

## 5.3 Boundaries and parity

- Range endpoints are inclusive and must be exhaustive/non-overlapping.
- `half_up` is the initial only allowed rounding mode: JavaScript helper and PHP `PHP_ROUND_HALF_UP` must match golden vectors.
- Category quality is determined by explicit `rank`, not lexical ordering.
- Guardrails are applied after numeric classification and before display rendering.
- Safety evaluation occurs after score computation only for pipeline clarity; UI priority is independent and always above general recommendations.
- Raw answer values, awarded points, applicability, and questionnaire version must remain auditable in the canonical submission.
- Every algorithm fixture is executed against both PHP and JavaScript; unequal canonical outputs are a release failure.

# 6. Frontend engine responsibilities

## `questionnaire-engine.js`

- validate the client-safe serialized configuration defensively;
- own per-instance state: intro/question/result, current index, selected values, session ID, pending timer, last payload, submission state;
- map answer values to points and compute the exact model in section 5;
- expose pure calculation/state functions that run in Node without a DOM;
- produce a view model for the UI and a request object for the API;
- contain no `document`, `window`, `fetch`, WordPress, Google, questionnaire ID, or question ID branches.

## `questionnaire-ui.js`

- discover uninitialized roots and create one isolated controller per root;
- render intro, questions, answer controls, progress, back/restart, result levels, dimensions, guardrail explanations, safety messages, CTA, retry/error states, and optional information modal;
- preserve keyboard navigation, labels, focus management, `aria-live`, progress semantics, reduced-motion behavior, and unique per-instance IDs;
- cancel stale auto-next timers when navigating back/restarting;
- use only root-scoped DOM queries and event listeners;
- contain no scoring formula, Google URL, hardcoded questionnaire content, `document.getElementById`, or mutable global questionnaire state.

## `questionnaire-api.js`

- submit JSON to the same-origin URL supplied on the root/config;
- send cookies only same-origin, set content type, enforce an explicit timeout through `AbortController`, parse/validate responses, and classify configuration/validation/network/backend errors;
- support idempotent retry of the exact last request and prevent concurrent double submission;
- never calculate or render results, never read Google-specific fields, and never accept an upstream URL from questionnaire content.

The three files may be shipped as classic scripts with one deliberately namespaced immutable bootstrap if WordPress/browser compatibility requires it, or as modules after compatibility testing. The final choice is made in STAGE 5; adding a bundler is out of scope unless native scripts cannot satisfy target browsers.

# 7. WordPress PHP architecture

## 7.1 Bootstrap and services

`lifemetrics-questionnaires.php` becomes a small bootstrap: direct-access guard, plugin metadata, version/path/URL constants, required orchestrator file, and `LifeMetrics_Questionnaires_Plugin::init()`.

The orchestrator registers services once. No service container or dependency-injection framework is needed; explicit constructors/static initialization are sufficient.

## 7.2 Registry and resolution

The registry owns a hardcoded map from supported ID to canonical file. It never constructs an include path from shortcode or REST input. Resolution:

```text
shortcode id
 -> sanitize_key
 -> exact registry lookup
 -> load plain PHP array
 -> validate id matches key and schema is valid
 -> require status=ready for public access
 -> renderer
```

Unknown, invalid, review, draft, or disabled IDs render an empty string plus an optional developer-only logged diagnostic; no path detail or content is exposed to the visitor.

## 7.3 Renderer and serialization

- Renderer creates `wp_unique_id('lmq-')`, submit URL, asset URL map, and an allowlisted client-safe configuration projection.
- It escapes text/attributes/URLs at output and JSON-encodes with WordPress helpers.
- Configuration is attached per instance in a `<script type="application/json" data-lmq-config>` child or an equivalent nonce-independent data mechanism; `wp_localize_script` global config is avoided because it conflicts with multiple differing instances.
- One shared template renders semantic placeholders. Questionnaire-specific copy comes from config.
- Shared asset handles enqueue once when the first valid shortcode renders. Late stylesheet handling remains until verified unnecessary in both Gutenberg and Elementor.

## 7.4 REST and server validation

Canonical route: `POST /wp-json/lifemetrics-questionnaires/v1/{id}/submit`, implemented through an allowlisted route regex and registry lookup. This preserves the existing PSS10 URL shape.

REST responsibilities:

- public permission callback is explicit because the questionnaire is anonymous, but authorization assumptions are documented;
- enforce body-size and JSON content-type limits before parsing;
- validate submission envelope and exact config version;
- rate-limit design is addressed without collecting new personal data;
- compute canonical result with PHP scoring engine;
- compare/reject mismatched client derived values;
- submit only canonical data through the adapter;
- map upstream errors to stable non-sensitive error codes;
- return canonical display result and duplicate status.

CSRF nonce is not an authorization control for an intentionally public anonymous endpoint. If used, it is a friction/replay control only and must not replace validation, idempotency, and abuse monitoring.

# 8. Backend/integration architecture

## 8.1 Storage architecture (DEC-024)

Storage uses ONE central Google Spreadsheet ("LifeMetrics — Questionnaires") hosting dedicated raw data worksheets per questionnaire and separated analytics/dashboard tabs:

- **Central Spreadsheet**: Single file simplifies administration, permissions, backups, and cross-instrument analytics.
- **Dedicated Raw Data Worksheets**: `PSS10`, `Sedentarite`, `Hydratation`, `Fatigue`, `Sommeil`, `Nutrition`, `Activite_Physique`, `Pieds_Confort`. Each tab retains its own physical column schema for analytical clarity.
- **Dedicated Dashboard / Analytics Worksheets**: `Dashboard_Global`, `Dashboard_<Questionnaire>` compute aggregate metrics/visualizations from raw data. Direct submission writes to dashboard tabs are prohibited.
- **Server-Side Allowlist Routing**: Submissions pass from WordPress REST to a central Google Apps Script endpoint (`LMQ_GOOGLE_ENDPOINT`), which resolves `questionnaire_id` to its dedicated worksheet via an internal allowlist.
- **Legacy PSS10 Compatibility**: `LMQ_PSS10_GOOGLE_ENDPOINT` is preserved as a narrow legacy exception until PSS10 storage is formally consolidated.

## 8.2 Integration invariants

- Browser never calls Google Apps Script.
- Endpoint is configured server-side only and allowlisted; request input can never select a URL.
- WordPress and Apps Script validate independently and derive canonical scores/categories.
- Formula-injection protection applies to every string written to Sheets, including JSON cells if exported/formula-parsed.
- Duplicate submission returns idempotent success and never creates another canonical row.
- Apps Script lock covers duplicate check plus append.
- Upstream HTTP and JSON body are verified before frontend success.
- Timeout, retry, stale-deployment detection, schema-version rejection, and deployment provenance are tested.
- Existing backend is not migrated until STAGE 10 and an export/backup plus rollback deployment exists.

# 9. Standard submission payload

## 9.1 Browser request envelope

```json
{
  "submission_schema_version": "1.0.0",
  "questionnaire_id": "sedentarite",
  "questionnaire_version": "1.0.0",
  "client_version": "<plugin asset version>",
  "session_id": "<uuid-v4>",
  "completed_at": "<UTC ISO-8601>",
  "locale": "fr-FR",
  "source_page": "/questionnaire-sedentarite/",
  "answers": {
    "SD01": "<stable answer value>",
    "SD02": "<stable answer value>"
  },
  "client_result": {
    "raw_score": 0,
    "available_max": 0,
    "final_score": 0,
    "calculated_category": "CODE",
    "displayed_category": "CODE"
  }
}
```

`client_result` is optional diagnostic evidence and never authoritative. The server response contains the canonical result.

## 9.2 Canonical persisted envelope

At minimum:

- `submission_schema_version`;
- `questionnaire_id`, `questionnaire_version`, `client_version`;
- `session_id`, `completed_at`, server `received_at`;
- `locale`;
- sanitized path-only `source_page` or null;
- `answers`: selected value, server-derived points, and applicability per question;
- `raw_score`, `available_min`, `available_max`, `final_score`;
- `calculated_category`, `displayed_category`;
- `applied_classification_rules`;
- `dimensions`: raw/min/max/percentage/attention per dimension;
- `weakest_dimensions`;
- `safety_flags` with stable codes only;
- adapter/storage schema version and duplicate marker as operational metadata.

Current PSS10 `created_at` is migrated to `completed_at` through an explicit compatibility mapping; historical fields are not silently reinterpreted.

## 9.3 Privacy/PHI implications

Questionnaire answers and safety flags can reveal health-related information even without name/email. Treat the dataset as potentially sensitive personal data if it can be linked through logs, URLs, accounts, IP addresses, or external systems.

- Do not add name, email, phone, WordPress user ID, IP, full user-agent, device fingerprint, free text, or marketing identifiers without a separate privacy decision/DPIA and explicit consent basis.
- Store `source_page` as path only; strip query string, fragment, credentials, and arbitrary visitor values because URLs can contain identifiers or health data.
- `locale` is low-risk and useful for content/version interpretation.
- `client_version` and `submission_schema_version` are required for debugging/audit.
- Define retention, access control, export/deletion procedure, incident handling, Sheet ownership, and log redaction before production.
- Safety messages must not leak answer details into public/server logs.

# 10. Questionnaire inventory

Search scope included the repository, Codex attachments, and `/Volumes/T7/StageBut3`. Seven relevant questionnaire PDFs were found in `/Volumes/T7/StageBut3/Questionner de test `. No matching PDFs/specifications were found for Stress & équilibre quotidien, Composition corporelle, or Bien-être général.

Readiness below is evidence-based from the PDFs, not an approval claim:

| questionnaire_id | document/source | content_status | scoring_status | safety | N/A | guardrail | CTA | implementation_status | blockers |
|---|---|---|---|---|---|---|---|---|---|
| `pss10` | current plugin + tracked standalone; no local questionnaire PDF found | legacy behavior frozen for structural migration | executable 1-5/reverse/10-50 baseline approved on 2026-09-04 | none | none | none | current stub buttons approved only as legacy baseline | `BLOCKED_BY_APPROVAL` | licensing/attribution and any production UX/content/CTA approval remain pending for their planned stages |
| `activite-physique` | `Score_LifeMetrics_Activite_Physique_V1.pdf` | `CONTENT_READY` (document de travail) | ranges specified, but PDF explicitly requires synthetic validation/pilot | none | none | none | VitaScan | `BLOCKED_BY_SCORING` | run/approve synthetic profiles; content-owner approval |
| `sommeil` | `Score_LifeMetrics_Sommeil_V1.pdf` | `CONTENT_READY` (document de travail) | scoring/dimensions specified; no completed synthetic-validation evidence in document | SLSF01-03 | none | none | VitaScan | `BLOCKED_BY_SCORING` | synthetic boundary/profile approval; content-owner approval |
| `hydratation` | `Score_LifeMetrics_Hydratation_V1.pdf` | `CONTENT_READY` (document de travail) | `SCORING_READY` based on documented synthetic validation | HYSF01-03 | HY05 | none | VitaScan | `BLOCKED_BY_APPROVAL` | explicit content-owner approval and destination URL |
| `nutrition` | `Score_LifeMetrics_Nutrition_V1.pdf` | `CONTENT_READY` (document de travail) | scoring specified; no completed synthetic-validation section | NTSF01-03 | none | none | VitaScan | `BLOCKED_BY_SCORING` | synthetic scoring/boundary approval; content-owner approval |
| `fatigue-recuperation` | `Score_LifeMetrics_Fatigue_Recuperation_V1.pdf` | `CONTENT_READY` | `SCORING_READY` based on documented synthetic validation and retained ranges | FRSF01-03 | none | dimension attention only | VitaScan + Metabolism Analytics | `BLOCKED_BY_APPROVAL` | explicit content-owner approval and CTA destination |
| `sedentarite` | `Score_LifeMetrics_Sedentarite_V1.pdf` | `CONTENT_READY` (`Document LifeMetrics`) | `SCORING_READY`; profiles A-F and mandatory D1 guardrail documented | none | SD07, SD08 | D1 <= 2/8 caps display at `SEDENTARITE_A_REDUIRE` | VitaScan + Metabolism Analytics | `BLOCKED_BY_APPROVAL` | confirm approved source, final CTA URL, and formal stage approval; still not production-ready |
| `pieds-confort-postural` | `Score_LifeMetrics_Pieds_Confort_Postural_V1.pdf` | `CONTENT_READY` | categories explicitly provisional; PF09-PF10 guardrail undecided | PFSF01-04 | none | unresolved | Podos360 | `BLOCKED_BY_SCORING` | synthetic profiles A-F; guardrail decision; approve ranges/content |
| `stress-equilibre` | no source found | `BLOCKED_BY_CONTENT` | unknown | unknown | unknown | unknown | unknown | `BLOCKED_BY_CONTENT` | complete approved specification missing |
| `composition-corporelle` | no source found | `BLOCKED_BY_CONTENT` | unknown | unknown | unknown | unknown | unknown | `BLOCKED_BY_CONTENT` | complete approved specification missing |
| `bien-etre-general` | no source found | `BLOCKED_BY_CONTENT` | unknown | unknown | unknown | unknown | unknown | `BLOCKED_BY_CONTENT` | complete approved specification missing |

Exact files found:

```text
/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Activite_Physique_V1.pdf
/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Fatigue_Recuperation_V1.pdf
/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Hydratation_V1.pdf
/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Nutrition_V1.pdf
/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Pieds_Confort_Postural_V1.pdf
/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Sedentarite_V1.pdf
/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Sommeil_V1.pdf
```

Inventory maintenance rule: record source path, SHA-256, document version/date, page count, approval owner/date, implementation version, and any transcription deviations before coding a questionnaire. Never fill missing wording or rules from general health knowledge.

# 11. Migration strategy for PSS10

## 11.1 Frozen invariants

Before refactoring, capture executable fixtures and screenshots for:

- exact ten questions, answer labels, order, 1-5 values, reverse mapping 4/5/7/8;
- totals 10 and 50 plus category boundaries 20/21/26/27;
- intro/question/result/modal copy and attribution links;
- intro -> question -> auto-next -> back/change -> result -> restart;
- 400 ms auto-next behavior and cancellation on navigation;
- progress values/labels, selected-answer restoration, gauge score/needle;
- stored versus displayed category labels;
- same-origin endpoint path and payload fields;
- unique UUID per new run, one submission per completion, exact retry payload reuse;
- error messages/toasts and success only after verified backend response;
- multiple instances, unique element/radio/SVG/modal identifiers, root CSS/DOM isolation;
- keyboard Escape/modal focus and responsive layout.

## 11.2 Migration sequence

1. Create golden fixture vectors and DOM/static assertions without editing source.
2. Add generic infrastructure in parallel; legacy shortcode/route remains active.
3. Express PSS10 as `questionnaire.php`, including explicit answer points for reverse questions, result copy, attribution, and UI metadata.
4. Run schema and PHP/JS scoring parity tests; compare every frozen vector.
5. Render generic PSS10 behind a development-only selection mechanism or isolated test shortcode/page; do not switch public output yet.
6. Compare legacy and generic DOM screenshots/interactions at desktop/tablet/mobile and multiple-instance pages.
7. Switch the production shortcode implementation in one commit only after all tests pass.
8. Keep legacy PSS10 files and route behavior available for one rollback checkpoint; remove only in a later cleanup commit after runtime acceptance.
9. Do not change PSS10 scoring methodology, category copy, CTA behavior, or legal attribution during structural migration.

## 11.3 Regression and rollback

Required regression tests: PHP/JS golden vectors, request/response contract, static forbidden-pattern checks, browser path, retry/errors, multi-instance, Gutenberg, Elementor, responsive snapshots, and a sandbox Sheet duplicate test.

Rollback trigger: any score/category/payload divergence, missing content, accessibility regression, asset loading regression, REST incompatibility, or backend write discrepancy. Roll back the single cutover commit to the legacy renderer/assets/handler; preserve test evidence and generic files for diagnosis. Do not rewrite the live Sheet to hide a migration failure.

Files eventually affected: bootstrap, new includes/assets/template, `questionnaires/pss10/questionnaire.php`, legacy PSS10 template/assets, tests, plugin docs. Apps Script remains unchanged until STAGE 10.

# 12. Test strategy

## STATIC

- PHP lint for every PHP file with the approved minimum supported PHP 8.2;
- JS parse checks using `.js` inputs; Apps Script parse through VM/copy-to-temporary-`.js` test;
- registry paths remain within plugin directory and match explicit map;
- no visitor-derived include paths;
- no `document.getElementById`, `window.PSS_*`, hardcoded questionnaire/question branches, direct `script.google.com` in frontend, hardcoded `/wp-content/`, `eval`, or executable config callbacks;
- CSS selectors scoped under `.lm-questionnaire` except documented reset/keyframes; no global element leakage;
- no duplicate shared icons/assets after approved cleanup;
- no secrets or backend endpoints in browser files/configuration.

## UNIT

- normal explicit 0-4 mapping;
- PSS10 reverse mapping and 10-50 bounds;
- N/A removes min/max capacity and half-up normalization matches PHP/JS;
- one and multiple N/A cases, all-unavailable rejection;
- dimension raw/min/max/percentage including partial N/A;
- weakest one/two dimensions, tie ordering, unavailable exclusion, attention threshold;
- safety flags with favorable and unfavorable scores;
- category endpoints and exhaustive coverage;
- category cap guardrail at D1 2/8, no cap at 3/8, unchanged numeric scores;
- higher-is-better and higher-is-worse category rank behavior if both remain supported.

## CONTRACT

- required/optional fields and lifecycle enum;
- duplicate IDs, missing references, invalid status/version/locale;
- answer values unique; `points:null` only for N/A;
- result ranges exhaustive/non-overlapping; ranks/codes unique;
- guardrail references and operators allowlisted;
- serialized client config excludes internal URLs/approval metadata;
- browser request and canonical persisted payload validation;
- server rejects client/server score/category/dimension mismatch and unknown answers.

## WORDPRESS INTEGRATION

- clean activation/deactivation with no warnings;
- generic shortcode valid/invalid/draft/disabled behavior;
- canonical REST route, body limit, content type, validation, upstream errors;
- assets absent on pages without shortcode and loaded once with one/multiple instances;
- late-rendered shortcode CSS behavior;
- Gutenberg and Elementor render/editor/public views;
- no hardcoded content paths; symlinked plugin works.

## BROWSER / E2E

- intro, modal/focus, start, each question, auto-next, back/change, progress, final answer;
- result/category/gauge or generic visualization, weakest dimensions, attention marker, guardrail message;
- safety message appears before recommendations and with high score;
- submit, verified success, timeout, malformed response, validation error, backend error, offline retry, duplicate success;
- restart creates new session and clears state;
- two different questionnaire instances and two same-ID instances do not share state.

## RESPONSIVE / ACCESSIBILITY

- representative desktop 1440 px, tablet 768 px, mobile 375 px plus zoom 200%;
- no horizontal overflow, clipped controls, overlapping text, unreadable result blocks;
- keyboard-only flow, visible focus, radio group semantics, headings, labels, status announcements, contrast, reduced motion.

## BACKEND

- success; invalid JSON/type/size/schema/version/questionnaire/answer;
- formula-leading strings; server score/category derivation;
- duplicate and concurrent duplicate attempts under lock;
- lock timeout, backend unavailable, non-2xx, malformed JSON, `{ok:false}`;
- old and new PSS10 path during migration;
- common-sheet headers/version, stale deployment detection, shadow-write reconciliation, rollback.

Every non-trivial scoring branch leaves one minimal runnable regression check. A stage cannot claim PASS based only on lint.

# 13. Local WordPress environment stage

Current verified facts: `/Applications/XAMPP/xamppfiles/htdocs/pss-wordpress-test` is absent; WP-CLI is absent; XAMPP PHP is 8.2.4; shell/Homebrew PHP is 8.4.1. Process inspection was sandbox-restricted during this audit, so Apache/MariaDB stopped status is retained from the supplied verified baseline and must be rechecked at execution time.

STAGE 8 will, only after explicit approval:

1. verify ports, XAMPP Apache/MariaDB status, PHP extensions, and existing databases;
2. start only the required isolated services;
3. create a dedicated local database/user with non-production credentials;
4. install a clean supported WordPress into `/Applications/XAMPP/xamppfiles/htdocs/pss-wordpress-test`;
5. create the exact symlink from its plugin directory to the repository plugin;
6. activate the plugin and capture activation logs;
7. create test pages for no shortcode, valid PSS10, invalid ID, duplicate PSS10 instances, mixed questionnaires, Gutenberg, and Elementor if available;
8. configure a sandbox/fake backend endpoint, never the production Sheet, for destructive/error tests;
9. record WordPress/PHP/database/theme/builder versions and teardown/restart instructions.

This plan creation does not start services, create a database, install WordPress/WP-CLI, or create the symlink.

# 14. Stage-by-stage implementation roadmap

Only one stage may be `IN_PROGRESS`. Every stage ends with a report and stop. PASS does not authorize the next stage.

## STAGE 0 to STAGE 5 - COMPLETED
- **Status:** `PASS`
- **Objective:** Establish baseline, schema 2.0.0, freeze PSS10 legacy behavior, extract WP architecture, implement universal scoring, and create shared frontend UI/API.

## STAGE 6 - Migrate PSS10 to generic configuration
- **Status:** `PASS`
- **Objective:** Prove the generic stack supports the structurally different PSS10 legacy profile without changing its observed behavior.
- **Prerequisites:** STAGES 0-5 PASS.
- **Scope:** `questionnaires/pss10/questionnaire.php`, legacy adapter hooks.
- **Do not touch:** Proprietary methodologies, generic frontend logic, Google Sheet destinations.
- **Tasks:** Transcribe PSS10 to canonical `questionnaire.php`. Render with generic engine. Ensure visual/scoring parity.
- **Required tests:** Frozen outputs equal; public shortcode/route shape unchanged.
- **Pass criteria:** 100% regression parity on scoring and payload.
- **Blockers:** None expected.
- **Rollback:** Revert cutover commit; retain legacy files.
- **Next stage:** STAGE 7.

## STAGE 7 - All-PDF Capability Audit & Engine Hardening
- **Status:** `PASS`
- **Objective:** Prove the common platform supports all proprietary LifeMetrics PDF methodologies before building them, and harden the engine against any gaps.
- **Prerequisites:** STAGE 6 PASS.
- **Scope:** `QUESTIONNAIRE_INVENTORY.md`, `class-questionnaire-scoring-engine.php`, `questionnaire-engine.js`.
- **Do not touch:** UI code, backend code.
- **Tasks:** Audit Activité, Hydratation, Fatigue, Nutrition, Sédentarité, Sommeil, Pieds against generic capabilities (N/A, dimensions, guardrails, non-linear). Implement any missing engine features (e.g. Sommeil SL01 non-linearity).
- **Required tests:** Unit tests for any added engine capability.
- **Pass criteria:** Every PDF's logic is definitively supported by the engine or explicitly blocked by methodology approvals.
- **Rollback:** Revert engine additions if they break PSS10 regressions.
- **Next stage:** STAGE 8.

## STAGE 8 - Isolated Local WordPress & PSS10 Validation
- **Status:** `PASS`
- **Objective:** Create real local WordPress runtime, test generic REST routing, and prove migrated PSS10 end-to-end.
- **Prerequisites:** STAGE 7 PASS.
- **Scope:** Local WP environment, `class-rest-controller.php`.
- **Do not touch:** Production WP, production Google Sheet.
- **Tasks:** Setup local WP. Symlink plugin. Run PSS10 shortcode. Verify responsive behavior.
- **Required tests:** Integration/browser/responsive matrix.
- **Pass criteria:** PSS10 works seamlessly in standard WP environment without console/PHP errors.
- **Rollback:** Destroy local WP container/DB.
- **Next stage:** STAGE 9.

## STAGE 9 - Multi-Destination Google Backend Architecture
- **Status:** `PASS`
- **Objective:** Implement generic server-side submission transport routing to questionnaire-specific Google Sheets targets.
- **Prerequisites:** STAGE 8 PASS.
- **Scope:** `class-submission-service.php`, `class-google-apps-script-adapter.php`, backend configuration metadata.
- **Do not touch:** Frontend submission API, monolithic sheet assumptions (they are obsolete).
- **Tasks:** Build server-side map routing submissions to different Apps Script URLs. Establish exact payload schema expectations per questionnaire.
- **Required tests:** Backend tests BACK-001 through BACK-012 (multi-destination routing).
- **Pass criteria:** Submissions securely reach intended, independent Google destinations.
- **Rollback:** Revert adapter commits.
- **Next stage:** STAGE 10.

## STAGE 10 - Proprietary Questionnaires Rollout
- **Status:** `IN_PROGRESS` (Sequential execution: 4/7 complete)
  - 1. Sédentarité (`sedentarite`): `PASS` (Stage 10.1 on 2026-09-09)
  - 2. Hydratation (`hydratation`): `PASS` (Stage 10.2 on 2026-09-09)
  - 3. Fatigue & Récupération (`fatigue-recuperation`): `PASS` (Stage 10.3 on 2026-09-09)
  - 4. Sommeil (`sommeil`): `PASS` (Stage 10.4 on 2026-09-09)
  - 5. Nutrition (`nutrition`): `NOT_STARTED` (Next)
  - 6. Activité Physique (`activite-physique`): `NOT_STARTED`
  - 7. Pieds & Confort Postural (`pieds-confort-postural`): `NOT_STARTED`
- **Objective:** Implement the proprietary questionnaires sequentially (Sédentarité, Hydratation, Fatigue, Sommeil, Nutrition, Activité, Pieds).
- **Prerequisites:** STAGE 9 PASS, methodology approvals.
- **Scope:** `questionnaires/<id>/questionnaire.php`, `presentation.php` (if needed).
- **Do not touch:** Shared core engine, `questionnaire-ui.js`, PSS10.
- **Tasks:** Process sequentially one questionnaire per execution. For each: create `questionnaire.php`, register in registry mapping, verify Schema 2.0.0 compliance, add dedicated test suite matching PDF synthetic profiles.
- **Required tests:** Full scoring fixtures and synthetic profiles per PDF.
- **Pass criteria:** Each test completes independently and passes all schema, boundary, and scoring tests.
- **Rollback:** Disable questionnaire config status to `draft` or `disabled`.
- **Next stage:** STAGE 10.5 (Nutrition).

## STAGE 11 - Final Production Packaging & Release
- **Status:** `NOT_STARTED`
- **Objective:** Generate final installable `lifemetrics-questionnaires.zip` and verify production deployment readiness.
- **Prerequisites:** STAGE 10 PASS, final methodology approvals.
- **Scope:** Release scripts, plugin manifest.
- **Do not touch:** Source code logic.
- **Tasks:** Clean test/dev files. Create ZIP. Verify checksums. Perform install test on fresh WP.
- **Required tests:** Complete clean-install regression.
- **Pass criteria:** ZIP installs and functions perfectly; rollback plan is documented.
- **Blockers:** Final approvals.
- **Rollback:** N/A.
