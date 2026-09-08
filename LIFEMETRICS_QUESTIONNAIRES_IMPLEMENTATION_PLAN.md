# LifeMetrics Questionnaires - authoritative implementation plan

Plan version: 1.0

Created: 2026-09-03

Repository: `/Applications/XAMPP/xamppfiles/htdocs/pss`

Plugin: `/Applications/XAMPP/xamppfiles/htdocs/pss/lifemetrics-questionnaires`

Scope of this document: planning only; no implementation is authorized by this document's creation.

Current overall status: `STAGE_0_PASS / STAGE_1_PASS / STAGE_2_PASS / PSS10_RUNTIME_STABILIZATION_PASS / STAGE_3_NOT_STARTED`

Next executable stage: `STAGE 3 - Generic PHP infrastructure in parallel`

Stage 3 remains paused and has not started. The out-of-sequence PSS10 production-runtime milestone is complete, but it does not advance or reorder the generic implementation stages.

## Status vocabulary

- Stage status: `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `PASS`, `FAIL`, `ROLLED_BACK`.
- Content status: `CONTENT_READY` means all question and result wording needed for implementation is present; it does not mean approved for publication.
- Scoring status: `SCORING_READY` means question scoring, ranges, dimensions, N/A rules, safety rules, and guardrails are explicit and have no known unresolved scoring decision.
- Implementation status: `IMPLEMENTATION_READY` means the content owner has approved the exact source and all scoring prerequisites are ready; `BLOCKED_BY_CONTENT`, `BLOCKED_BY_SCORING`, and `BLOCKED_BY_APPROVAL` identify the gate.
- `PRODUCTION_READY` is granted only after the three-level Definition of Done in section 19 is satisfied.
- A PDF's filename or version label alone never grants any readiness status.

# 1. Executive objective

Transform the current PSS10-only WordPress wrapper into a versioned, data-driven LifeMetrics questionnaire platform in which one shared WordPress integration, one shared browser engine, one shared visual system, and one submission boundary serve multiple questionnaire configurations.

The public authoring contract remains:

```text
[lifemetrics_questionnaire id="pss10"]
[lifemetrics_questionnaire id="hydratation"]
[lifemetrics_questionnaire id="sedentarite"]
```

Adding an approved questionnaire must ultimately require only an approved `questionnaire.php` configuration, contract fixtures/tests, registry inclusion, and a WordPress page containing the generic shortcode. A questionnaire must not own a copied `app.js`, API client, or base stylesheet.

The migration must preserve the current PSS10 behavior until a separately approved stage explicitly changes it. The existing standalone project at repository root is an evidence source and rollback reference; it is not to be changed as part of the plugin migration unless a future stage explicitly authorizes that work.

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
│   ├── class-rest-controller.php
│   └── class-submission-service.php
├── integrations/
│   └── google-apps-script/
│       ├── class-google-apps-script-adapter.php
│       └── google-apps-script.gs
├── templates/
│   └── questionnaire.php
├── assets/
│   ├── css/
│   │   ├── questionnaire-base.css
│   │   └── questionnaire-components.css
│   ├── js/
│   │   ├── questionnaire-engine.js
│   │   ├── questionnaire-ui.js
│   │   └── questionnaire-api.js
│   └── icons/{shield,lock,clock}.svg
├── questionnaires/
│   ├── pss10/questionnaire.php
│   ├── activite-physique/questionnaire.php
│   ├── sommeil/questionnaire.php
│   ├── hydratation/questionnaire.php
│   ├── nutrition/questionnaire.php
│   ├── fatigue-recuperation/questionnaire.php
│   ├── sedentarite/questionnaire.php
│   ├── stress-equilibre/questionnaire.php
│   ├── pieds-confort-postural/questionnaire.php
│   ├── composition-corporelle/questionnaire.php
│   └── bien-etre-general/questionnaire.php
└── tests/
    ├── fixtures/
    │   ├── pss10-golden-v1.json
    │   └── schema-invalid-cases/
    ├── questionnaire-engine.test.js
    ├── questionnaire-schema.test.php
    ├── questionnaire-scoring.test.php
    ├── questionnaire-registry.test.php
    ├── payload-contract.test.php
    ├── static-architecture.test.js
    ├── backend-logic.test.js
    └── scoring/
        └── <questionnaire-id>.test.js
```

Deviation from the conceptual target is intentional: the default final architecture has one shared `templates/questionnaire.php`, not a copied `template.php` in every questionnaire folder. Questionnaire-specific presentation belongs in configuration. A per-questionnaire template override may be introduced only through an ADR after a real case cannot be represented by the shared template; PSS10 alone is not sufficient evidence for eleven copied templates.

Additional PHP classes beyond the prompt's conceptual tree are justified because schema validation, server-side scoring, REST handling, and backend submission are separate trust-boundary responsibilities. They prevent the renderer or registry from becoming another 1,000-line orchestrator.

## 3.2 Responsibilities and dependency direction

| Component | Responsibility | Must not do |
|---|---|---|
| bootstrap | constants, required files, one `init()` call | HTML, scoring, routes, questionnaire content |
| plugin orchestrator | wire hooks/services | questionnaire-specific branches |
| registry | explicit ID-to-file map, load/cache configs, lifecycle/public gate | derive paths from visitor input, render, score |
| schema validator | validate configuration shape and cross-references | mutate content or silently default safety/scoring decisions |
| scoring engine (PHP) | canonical server calculation from selected answer values | trust client totals/categories |
| shortcode layer | parse shortcode, resolve public config, return renderer output | read arbitrary files or call Google |
| renderer | shared escaped HTML shell and per-instance serialized config | calculate scores or enqueue Google-specific code |
| assets | register/enqueue shared handles once; late-style compatibility | per-questionnaire business logic |
| REST controller | route, request limits, content type, response mapping | storage details or UI rendering |
| submission service | validate/recompute/canonicalize/idempotency hand-off | know Google Sheet columns |
| Google adapter | fixed server-side endpoint, timeout, upstream verification | accept a visitor-supplied URL |
| `questionnaire.php` | immutable versioned data contract for one questionnaire | WordPress hooks, DOM code, HTTP calls |
| JS engine | pure client calculation and state transitions | DOM rendering or network/storage implementation |
| JS UI | root-scoped accessible DOM rendering/events | questionnaire-ID branches or scoring formulas |
| JS API | generic same-origin POST, timeout/error classification/retry | Google URLs or score calculation |
| shared template | semantic shell and data hooks | questionnaire-specific scoring or duplicated content blocks |

Dependency direction:

```text
WordPress hooks
  -> bootstrap/orchestrator
  -> shortcode -> registry -> schema -> renderer -> shared template/assets
  -> REST controller -> registry -> schema -> PHP scoring -> submission service -> adapter

questionnaire configuration -> no dependencies on WordPress, engine, renderer, or adapter
frontend UI/API -> consume engine result/config; engine imports neither UI nor API
```

No integration layer may depend on UI classes. No questionnaire configuration may invoke functions, access globals, or contain executable callbacks; it returns plain arrays only.

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
| `schema_version` | REQUIRED | configuration contract version, initially `1.0.0` |
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
| `weakest_dimensions` | OPTIONAL | count, eligibility, tie policy, attention threshold; omitted when dimensions empty |
| `cta` | REQUIRED | label, destination key/URL policy, optional supporting copy; URL must be allowlisted/sanitized server-side |
| `disclaimer` | REQUIRED | before-test and after-result copy |
| `attribution` | OPTIONAL | source/licensing/legal metadata, required for PSS10 if applicable |
| `content_revision` | OPTIONAL | internal approved document/hash reference; not a replacement for `version` |

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
    'schema_version' => '1.0.0',
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

## 8.1 Storage options

| Option | Advantages | Costs/risks | Decision |
|---|---|---|---|
| A. One common submissions sheet | one idempotency index, easy global reporting, one generic adapter | a wide fixed-answer schema becomes sparse; JSON columns are less friendly for manual analysis | viable canonical layer |
| B. One tab per questionnaire | readable stable columns per instrument; easy manual filtering | fragmented deduplication/reporting, repeated Apps Script branches, version migration in many tabs | reject as sole source of truth |
| C. Hybrid | common submission ledger plus questionnaire-specific views/details; balances audit and operations | partial-write risk if two canonical writes occur; more migration logic | recommended with only one canonical write |

Recommended hybrid model:

- canonical `submissions` tab: one locked append per completion with common columns and JSON snapshots for `answers`, `dimensions`, and `safety_flags`;
- global idempotency key: `(questionnaire_id, questionnaire_version, session_id)` or a derived stable submission key;
- optional per-questionnaire tabs are derived reporting views/exports, not a second source of truth; they may be added only when operations require them;
- keep questionnaire version and submission schema version in every canonical row;
- preserve legacy PSS10 `results` unchanged during shadow migration and backfill only through an approved, reversible script.

This avoids a multi-tab partial commit in Apps Script while retaining a path to readable questionnaire-specific reporting. If JSON querying becomes operationally inadequate, move canonical storage to a proper backend rather than growing fragile Apps Script synchronization.

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

- PHP lint for every PHP file with minimum supported PHP 7.4 and XAMPP PHP 8.2;
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

## STAGE 0 - Baseline freeze and recoverable snapshot

- **Status:** `PASS` on 2026-09-03. Evidence: `STAGE_REPORTS/STAGE-00.md`; ten plugin source files frozen with combined manifest SHA-256 `5206e7a4a4fff67661e21d2761fd3b2ea94f1a435f05bcd65376b844a6d3cdb9`; PHP/JS/backend smoke/static/diff checks passed; no runtime source bytes changed.
- **Objective:** make the existing untracked plugin and its relationship to the tracked standalone source recoverable and auditable before any refactor.
- **Prerequisites:** user approves execution of STAGE 0; no source edits in progress; review current diff together.
- **Files allowed to change:** planning/evidence Markdown, `.gitignore` only if separately approved, Git index/commit metadata; source files may be added to Git unchanged.
- **Files forbidden to change:** contents of PHP/JS/CSS/templates/Apps Script/icons/PDFs; WordPress test path; databases/services.
- **Exact tasks:** capture full tree, hashes, permissions, Git diff/status, endpoint redaction-safe inventory, deployed-version unknowns; identify pre-existing `.DS_Store`; add unchanged plugin files to version control or create an approved immutable tag/commit; record standalone/plugin file relationships; record current check outputs.
- **Required tests:** byte hashes before/after; PHP lint; JS parse; backend smoke; `git diff --check`; prove source bytes unchanged.
- **Acceptance criteria:** every plugin source file is recoverable from an identified commit/tag; pre-existing user changes are separated and preserved; baseline report records known unknowns.
- **PASS/FAIL:** PASS only if source hashes match and rollback commit exists; FAIL if any source byte changes or unrelated user change is absorbed without approval.
- **Rollback criteria:** discard only newly created audit metadata/index selection; never reset pre-existing user changes.
- **Expected deliverables:** baseline manifest/report, Git checkpoint, updated plan stage status, no production behavior change.
- **Blockers:** plugin currently untracked; deployed Apps Script provenance may be unknown.
- **User action required:** confirm which existing untracked/`.DS_Store` files should be committed or ignored and approve checkpoint commit.
- **Recommended commit checkpoint:** `docs: freeze LifeMetrics questionnaire plugin baseline`.

## STAGE 1 - Architecture contracts and persistent documentation

- **Status:** `PASS` on 2026-09-03. Maksym Kurlukov approved `ARCHITECTURE.md`, `QUESTIONNAIRE_SCHEMA.md`, `QUESTIONNAIRE_INVENTORY.md`, `TEST_MATRIX.md`, `DECISIONS.md`, and DEC-001 through DEC-015, and accepted decision ownership. Documentation checks passed; runtime source remained unchanged. Evidence is in `STAGE_REPORTS/STAGE-01.md`.
- **Objective:** turn sections 3-9 into versioned contracts before implementation.
- **Prerequisites:** STAGE 0 PASS.
- **Files allowed to change:** `ARCHITECTURE.md`, `QUESTIONNAIRE_SCHEMA.md`, `QUESTIONNAIRE_INVENTORY.md`, `TEST_MATRIX.md`, `DECISIONS.md`, `CHANGELOG.md`, this plan.
- **Files forbidden to change:** all runtime source/assets/backend; standalone; PDFs; WordPress environment.
- **Exact tasks:** finalize class/file names, schema JSON-like examples, status gate, SemVer policy, scoring/rounding/parity contract, payload/privacy contract, backend option decision, ADRs DEC-001 through DEC-010, inventory hashes/approvals.
- **Required tests:** documentation cross-link/path check; examples reviewed against all seven PDFs and PSS10 edge cases; no ready example is incomplete.
- **Acceptance criteria:** no unresolved architecture choice blocks coding; every field/rule has ownership and validation behavior.
- **PASS/FAIL:** PASS after user accepts contracts/ADRs; FAIL if storage model, score formula, public statuses, or PSS invariants remain ambiguous.
- **Rollback criteria:** revert documentation commit only; baseline remains.
- **Expected deliverables:** seven persistent state files per section 16 (as applicable), approved ADRs, updated plan.
- **Blockers:** none for STAGE 1. Questionnaire-specific ownership and approvals remain gates in their planned stages.
- **User action required:** none for STAGE 1.
- **Recommended commit checkpoint:** `docs: define questionnaire platform contracts`.

## STAGE 2 - Freeze PSS10 behavior with tests

- **Status:** `PASS` on 2026-09-04. Golden frontend/PHP REST fixtures, actual-source characterization, 13 mutation guards, payload/error/markup/multi-instance checks, baseline lint/smoke checks, and the unchanged runtime digest are recorded in `STAGE_REPORTS/STAGE-02.md`. Maksym Kurlukov explicitly accepted the captured legacy behavior as the structural-migration/regression baseline, without granting permanent production approval to legacy UX, content, CTA, licensing, or attribution choices.
- **Later out-of-sequence evidence:** the controlled production-runtime cycle is complete through `bfb1385`: `WORDPRESS_RUNTIME`, `SHEET_WRITE`, `REST_RESPONSE`, `FRONTEND_CONFIRMATION`, `DUPLICATE_CHECK`, and `PSS10_END_TO_END` are `PASS`. See `STAGE_REPORTS/PSS10-PRODUCTION-RUNTIME-VALIDATION-AND-UI-STABILIZATION.md`. This does not mark the future generic/migrated STAGES 8-10 matrices complete.
- **Objective:** create an executable characterization harness without modifying behavior.
- **Prerequisites:** STAGE 1 PASS.
- **Files allowed to change:** plugin `tests/`, test-only scripts/fixtures, test documentation.
- **Files forbidden to change:** existing PHP/JS/CSS/template/Apps Script/icons; standalone; backend deployment.
- **Exact tasks:** extract pure PSS vectors through a test-safe strategy, add 10/20/21/26/27/50 cases and reverse-answer cases, payload snapshots, markup/static invariants, multi-instance identifiers, backend contract fixtures, reference screenshots where runtime permits.
- **Required tests:** all new characterization tests plus current lint/smoke checks.
- **Acceptance criteria:** a deliberate change to each frozen score boundary/reverse mapping/payload field causes a test failure.
- **PASS/FAIL:** PASS with deterministic green harness and documented untestable runtime gaps; FAIL if tests require source behavior changes or cannot detect scoring drift.
- **Rollback criteria:** remove only new test files/fixtures.
- **Expected deliverables:** PSS10 golden fixture, test runner instructions, freeze report.
- **Blockers:** none for STAGE 2. The original statement that all browser/WordPress evidence was deferred is historical and superseded for the current legacy PSS10 path by the production-runtime milestone; migrated generic runtime, mobile, and builder coverage remain in later gates.
- **User action required:** none for STAGE 2.
- **Recommended commit checkpoint:** `test: freeze current PSS10 behavior`.

## STAGE 3 - Generic PHP infrastructure in parallel

- **Status:** `NOT_STARTED`.
- **Objective:** introduce bootstrap/orchestrator/registry/shortcode/renderer/assets/REST shells without switching PSS10 runtime behavior.
- **Prerequisites:** STAGE 2 PASS.
- **Files allowed to change:** plugin bootstrap; new `includes/`, `templates/`, shared asset registration stubs; PHP tests; changelog/plan.
- **Files forbidden to change:** legacy PSS10 template/assets behavior; both Apps Scripts; standalone; PDFs.
- **Exact tasks:** split bootstrap, create explicit registry map, lifecycle public gate, shared renderer shell, asset service, shortcode service, generic route registration that delegates existing PSS10 behavior unchanged; maintain late CSS behavior.
- **Required tests:** PHP 7.4/8.2 lint, registry traversal/status cases, shortcode invalid IDs, route resolution, legacy characterization suite.
- **Acceptance criteria:** existing shortcode and REST output remain byte/contract equivalent where frozen; new services have no questionnaire-specific branches except temporary PSS10 compatibility adapter clearly marked.
- **PASS/FAIL:** PASS if all legacy tests pass and no new public questionnaire is exposed; FAIL on any behavior or endpoint change.
- **Rollback criteria:** revert stage commit to baseline bootstrap.
- **Expected deliverables:** generic PHP skeleton with tests, no frontend cutover.
- **Blockers:** PHP 7.4 runtime may need container/CI if unavailable locally.
- **User action required:** review class boundaries and compatibility adapter.
- **Recommended commit checkpoint:** `refactor: add generic PHP infrastructure without cutover`.

### Completed out-of-sequence PSS10 stabilization milestone

This milestone is complete without starting Stage 3. Commit chronology and scope:

1. `1e8899c` - explicit trusted Google ContentService redirect handling and controlled E2E recovery;
2. `54367e1` - modal visibility plus theme hover and result CTA isolation;
3. `84d12d8` - strongly scoped Fermer alignment and removal of the success toast;
4. `943a946` - first plugin full-bleed background attempt (superseded; did not solve the real theme layout);
5. `d9f41f8` - alternate background attempt (superseded; did not solve the real theme layout);
6. `046743b` - filemtime asset cache busting, same-answer reselection after Retour, and additional hover/link isolation;
7. `bfb1385` - silent in-progress submission plus current CTA labels/navigation.

Verified current behavior: modal open/close, Escape and focus return; Retour answer preservation and same-answer reselection; isolated Retour/main/footer/result-secondary hover states; centered result and Fermer CTA text; hidden normal saving/success toasts with error feedback retained; silent background submission; and cache-busted assets. The scoring model, backend semantics, REST contract, Apps Script, and Sheet schema did not change in the UI stabilization commits.

PSS10 remains the standardized legacy instrument with reverse scoring on Q4/Q5/Q7/Q8, scale 10-50, and the characterized calculated/displayed category distinction preserved. Runtime success does not clear the unresolved licensing/legal/attribution gate.

The required full-viewport `#faf8f5` background is not solved inside the plugin. It belongs to WordPress/page composition between the unchanged header and footer; plugin code must not acquire page-ID, Elementor, theme, or global body/html coupling to force it.

## STAGE 4 - Schema validator and dual-runtime scoring core

- **Status:** `NOT_STARTED`.
- **Objective:** implement the contract and pure canonical scoring in PHP and JavaScript without rendering a live questionnaire.
- **Prerequisites:** STAGE 3 PASS.
- **Files allowed to change:** schema/scoring classes, `questionnaire-engine.js`, fixtures, schema/scoring tests; non-ready test configs.
- **Files forbidden to change:** live PSS10 rendering/assets, REST submission behavior, Apps Script, standalone.
- **Exact tasks:** implement strict schema validation, explicit answer mapping, general min/max normalization, dimensions, ranks/categories, allowlisted guardrails, weakest dimensions, safety flags, deterministic result object; no DOM/network code.
- **Required tests:** section 12 unit/contract cases in both runtimes, mutation checks for critical fixtures, PHP/JS canonical JSON parity.
- **Acceptance criteria:** every scoring branch is covered; identical fixture input/config yields identical canonical outputs; invalid ready config fails closed.
- **PASS/FAIL:** PASS only with zero parity differences; FAIL on coercion, uncovered rule types, or arbitrary expression evaluation.
- **Rollback criteria:** revert core/fixtures; live PSS remains unchanged.
- **Expected deliverables:** versioned schema validator, two pure scoring implementations, parity runner.
- **Blockers:** final rounding/version policy from STAGE 1.
- **User action required:** approve canonical formula and payload examples.
- **Recommended commit checkpoint:** `feat: add validated generic scoring core`.

## STAGE 5 - Shared frontend UI, API, template, and assets

- **Status:** `NOT_STARTED`.
- **Objective:** implement reusable presentation and same-origin transport against fixtures, still without PSS10 cutover.
- **Prerequisites:** STAGE 4 PASS.
- **Files allowed to change:** shared `assets/`, shared template, renderer/assets service, frontend tests, test pages/fixtures.
- **Files forbidden to change:** legacy PSS10 files, Apps Script, standalone, production endpoints.
- **Exact tasks:** root-scoped controller, semantic answer rendering, auto-next/back/progress/restart, results/dimensions/safety/guardrail/CTA, modal, timeout/retry/error handling, per-instance JSON config, shared CSS/icons; choose native script/module loading without a bundler unless proven necessary.
- **Required tests:** DOM/browser fixture tests, keyboard/focus, two instances, no-global/static checks, CSS scope, API error matrix, responsive visual inspection.
- **Acceptance criteria:** shared fixture questionnaire completes end-to-end against a fake endpoint with no ID-specific code or global state.
- **PASS/FAIL:** FAIL for direct Google calls, leaked CSS, shared instance state, unverified success, or inaccessible controls.
- **Rollback criteria:** shared assets/template are not live; revert stage commit.
- **Expected deliverables:** generic UI/API/assets and evidence report.
- **Blockers:** browser automation availability; document manual gaps explicitly.
- **User action required:** approve shared visual/interaction parity target.
- **Recommended commit checkpoint:** `feat: add shared questionnaire frontend`.

## STAGE 6 - Migrate PSS10 to generic configuration

- **Status:** `NOT_STARTED`.
- **Objective:** switch PSS10 to the generic stack without observed behavior change.
- **Prerequisites:** STAGE 5 PASS; STAGE 2 freeze green.
- **Files allowed to change:** PSS10 config/new migration adapter, bootstrap/registry/renderer/assets, shared files only for proven parity fixes, tests/docs.
- **Files forbidden to change:** Apps Script/storage schema, tracked standalone, PSS wording/scoring/CTA semantics, unrelated questionnaires.
- **Exact tasks:** transcribe exact PSS content/points/levels/legal data, validate, run generic vs legacy golden comparison, render in isolated mode, perform one cutover commit, retain legacy files for rollback.
- **Required tests:** all section 11 regression tests available pre-WordPress plus full legacy/generic scoring and payload parity.
- **Acceptance criteria:** frozen outputs equal; public shortcode/route shape unchanged; assets still conditional; two instances isolated.
- **PASS/FAIL:** any frozen divergence is FAIL, not an opportunity to update expected output without user approval.
- **Rollback criteria:** revert the cutover commit and re-enable legacy handler; no data migration involved.
- **Expected deliverables:** `questionnaires/pss10/questionnaire.php`, cutover report, retained rollback files.
- **Blockers:** PSS attribution/licensing approval; runtime checks pending STAGE 9.
- **User action required:** approve cutover after reviewing comparison report.
- **Recommended commit checkpoint:** `refactor: migrate PSS10 to generic engine`.

## STAGE 7 - Scoring contract hardening

- **Status:** `NOT_STARTED`.
- **Objective:** prove the generic features with synthetic non-public fixtures before real LifeMetrics content.
- **Prerequisites:** STAGE 6 PASS.
- **Files allowed to change:** scoring/schema/payload implementations only for defects; tests/fixtures/docs.
- **Files forbidden to change:** PSS content/observed behavior, Apps Script, standalone, new public questionnaire configs.
- **Exact tasks:** exhaustive boundaries, N/A/min/max normalization, dimension partial availability, ties, safety-with-high-score, Sédentarité guardrail vectors, malformed config/request fuzz table, PHP/JS parity.
- **Required tests:** complete STATIC/UNIT/CONTRACT suites; PSS regressions.
- **Acceptance criteria:** all known generic mechanisms have golden vectors and failures are fixed at shared root cause.
- **PASS/FAIL:** FAIL on any runtime parity difference or silent default of an invalid rule.
- **Rollback criteria:** revert defect patch if it breaks PSS; retain failing fixture as evidence.
- **Expected deliverables:** hardened scoring release candidate and test report.
- **Blockers:** none expected after contracts.
- **User action required:** review guardrail/normalization examples.
- **Recommended commit checkpoint:** `test: harden generic scoring contracts`.

## STAGE 8 - Isolated local WordPress environment

- **Status:** `BLOCKED` until explicit environment approval.
- **Objective:** create the isolated runtime described in section 13 without touching production.
- **Prerequisites:** STAGE 7 PASS; user approves service/database/filesystem operations and test credentials.
- **Files allowed to change:** `/Applications/XAMPP/xamppfiles/htdocs/pss-wordpress-test`, dedicated local DB, environment runbook; repository docs only.
- **Files forbidden to change:** production WordPress/DB/Google Sheet; questionnaire source except separately reviewed test fix.
- **Exact tasks:** verify/start services, install WordPress, create DB, symlink plugin, activate, create test pages/users, configure sandbox adapter, capture versions/logs.
- **Required tests:** WordPress health/login, plugin activation twice, permalink REST access, symlink/path behavior, clean restart.
- **Acceptance criteria:** reproducible isolated site and sandbox backend; no production endpoint receives test traffic.
- **PASS/FAIL:** FAIL on path/port collision, production credential use, activation warning/fatal, or non-reproducible setup.
- **Rollback criteria:** stop services if started solely for test; remove only the dedicated site/DB after explicit approval; never recursive-delete ambiguous paths.
- **Expected deliverables:** local environment, runbook, environment manifest.
- **Blockers:** services currently reported stopped, WordPress/WP-CLI absent, credentials/ports need confirmation.
- **User action required:** approve installation/service/database changes and provide Elementor package/license only if its test is required.
- **Recommended commit checkpoint:** `docs: record isolated WordPress test environment`.

## STAGE 9 - PSS10 WordPress regression validation

- **Status:** `NOT_STARTED`.
- **Objective:** prove migrated PSS10 in real WordPress/Gutenberg/Elementor and browser contexts.
- **Prerequisites:** STAGE 8 PASS.
- **Files allowed to change:** tests/evidence; narrowly scoped plugin defect fixes with separate diff; test site content.
- **Files forbidden to change:** production backend/Sheet, standalone, PSS methodology/content.
- **Exact tasks:** run integration/browser/responsive/accessibility matrix, no-shortcode asset check, one/two instances, builder views, REST validation/errors, sandbox storage success/duplicate/retry.
- **Required tests:** all relevant section 12 groups and comparison screenshots.
- **Acceptance criteria:** all frozen PSS invariants pass in target runtime; zero console/PHP warnings; sandbox writes canonical expected rows.
- **PASS/FAIL:** any scoring/content/backend-success/multi-instance regression is FAIL; cosmetic differences require explicit acceptance.
- **Rollback criteria:** revert PSS cutover if critical; keep environment/evidence.
- **Expected deliverables:** PSS10 regression report, test matrix results, accepted exceptions.
- **Blockers:** Elementor may be unavailable; production-like Google sandbox deployment may require owner action.
- **User action required:** visual acceptance and any builder/license setup.
- **Recommended commit checkpoint:** `test: validate migrated PSS10 in WordPress`.

## STAGE 10 - Generic backend shadow migration

- **Status:** `NOT_STARTED`.
- **Objective:** implement the versioned canonical payload and recommended hybrid Sheet model without blind cutover.
- **Prerequisites:** STAGE 9 PASS; DEC-005 accepted; privacy/storage owner approval; backup/export available.
- **Files allowed to change:** integration adapter, Apps Script canonical source, REST/submission service, backend/payload tests, docs.
- **Files forbidden to change:** standalone Apps Script, live deployment until explicit cutover approval, questionnaire content/scoring.
- **Exact tasks:** compare both Apps Script files/deployment; establish canonical source; version headers/schema; implement common submission row/JSON snapshots, idempotency key, formula safety, lock, error codes; deploy sandbox; shadow PSS writes and reconcile; document backfill/no-backfill decision; cut over only after report.
- **Required tests:** full BACKEND matrix, concurrency, stale deployment, malformed response, shadow reconciliation, rollback deployment.
- **Acceptance criteria:** zero unexplained shadow divergence; duplicate-safe verified writes; old data preserved; deployment ID/version recorded.
- **PASS/FAIL:** FAIL on partial/duplicate rows, client-trusted scores, unverified success, unknown deployed code, or no restore path.
- **Rollback criteria:** restore previous server endpoint/deployment; stop new writes; keep old Sheet untouched; reconcile rather than delete rows.
- **Expected deliverables:** canonical integration source, sandbox evidence, migration/cutover/rollback runbook.
- **Blockers:** Google account/Sheet access, retention/privacy decisions, deployed version provenance.
- **User action required:** export/backup, deploy/authorize Apps Script, approve cutover.
- **Recommended commit checkpoint:** `feat: add versioned generic submission backend`.

### Standard lifecycle for STAGES 11-20

Every questionnaire stage from STAGE 11 through STAGE 20 must execute and record the same A-P lifecycle. A later letter cannot compensate for an earlier missing approval or failing test:

A. approved source/config intake and immutable source/version record;
B. schema validation and lifecycle status validation;
C. explicit scoring transcription and dual-runtime parity;
D. exhaustive score bands and boundary fixtures;
E. N/A, normalization, dimension, and weakest-dimension behavior where applicable;
F. allowlisted guardrails with numeric-score invariance where applicable;
G. independent non-scored safety flags and priority where applicable;
H. result interpretation and approved claims/copy;
I. recommendations and disclaimers;
J. `result_ctas` configuration (`label`, `url`, `variant`, `enabled`);
K. generic shortcode registration/rendering with lifecycle gate;
L. generic REST request/server recomputation contract;
M. canonical storage, idempotency, and versioning;
N. automated schema/scoring/parity/contract/regression tests;
O. real WordPress runtime plus desktop/mobile visual validation;
P. `Tests santé` catalogue metadata/status/CTA integration.

The standard runtime acceptance gate in `TEST_MATRIX.md` must be fully `PASS` before status `ready`. `draft` is incomplete/private, `review` is complete enough for review but non-public, `ready` alone is public, and `disabled` remains non-public and retained for history/rollback.

The catalogue page is `Tests santé` at `/tests-sante/`. It lists the ten proprietary questionnaires from registry/config metadata (title, description, estimated duration, status, CTA) and visibly disables or marks unavailable non-ready entries. PSS10 is shown separately if retained as a standardized instrument.

## STAGE 11 - First proprietary questionnaire: Sédentarité

- **Status:** `NOT_STARTED`.
- **Objective:** prove N/A, normalized dimensions, weakest output, and category guardrail using the most technically complete proprietary specification after approval.
- **Prerequisites:** STAGE 10 PASS; PDF hash and owner approval recorded; CTA URLs supplied.
- **Files allowed to change:** `questionnaires/sedentarite/questionnaire.php`, its scoring fixture/test, registry, inventory/changelog/test matrix.
- **Files forbidden to change:** shared engine unless a contract bug is first demonstrated; PSS config; other questionnaire content; PDF; standalone.
- **Exact tasks:** execute lifecycle A-P; exact transcription SD01-SD12, SD07/08 N/A, normalized 0-48 scale, six dimensions, four levels, D1 cap/message, dimension warnings, weakest/attention rules, CTA/disclaimers; independent two-person or source-vs-code review.
- **Required tests:** profiles A-F, all category boundaries, N/A combinations, D1 2/8 and 3/8, dimension percentages/ties, payload/server parity, WordPress/browser matrix.
- **Acceptance criteria:** exact source traceability; no invented text; canonical/server outputs match PDF examples; only `ready` after approval.
- **PASS/FAIL:** mismatch or missing CTA approval is FAIL/BLOCKED, not a default.
- **Rollback criteria:** set config `disabled` or revert registry/config commit; shared PSS remains unaffected.
- **Expected deliverables:** tested Sédentarité config, source mapping, stage report.
- **Blockers:** final CTA destinations and explicit publication approval.
- **User action required:** approve transcription, result copy, and public status.
- **Recommended commit checkpoint:** `feat: add Sédentarité questionnaire v1.0.0`.

## STAGE 12 - Hydratation questionnaire

- **Status:** `BLOCKED_BY_APPROVAL`.
- **Objective:** add Hydratation with HY05 N/A and independent HYSF01-03 safety routing.
- **Prerequisites:** STAGE 11 PASS; source/content owner approval; CTA URL.
- **Files allowed to change:** Hydratation config/test, registry, docs.
- **Files forbidden to change:** other configs/shared behavior without failing generic fixture; PDF/standalone.
- **Exact tasks:** execute lifecycle A-P; exact HY01-HY12/safety/dimensions/ranges/results/disclaimers transcription and review.
- **Required tests:** documented five profiles, 44/44 -> 48, safety plus favorable score, boundaries, weakest dimensions, E2E.
- **Acceptance criteria:** exact PDF match and complete safety priority.
- **PASS/FAIL:** FAIL if N/A penalizes score or safety changes score/is hidden.
- **Rollback criteria:** disable/revert only Hydratation registration/config.
- **Expected deliverables:** versioned config, tests, source mapping/report.
- **Blockers:** formal approval and CTA destination.
- **User action required:** approve source and publication.
- **Recommended commit checkpoint:** `feat: add Hydratation questionnaire v1.0.0`.

## STAGE 13 - Fatigue & récupération questionnaire

- **Status:** `BLOCKED_BY_APPROVAL`.
- **Objective:** add FR01-FR12, six dimensions, attention threshold, and FRSF01-03 safety.
- **Prerequisites:** STAGE 12 PASS and source approval.
- **Files allowed to change:** Fatigue config/test, registry, docs.
- **Files forbidden to change:** other content/shared behavior absent demonstrated defect.
- **Exact tasks:** execute lifecycle A-P; exact transcription including final FR10 wording, result levels, weakest/attention, VitaScan/Metabolism separation.
- **Required tests:** documented seven synthetic profiles, safety with 44/48, boundaries/dimensions/E2E.
- **Acceptance criteria:** old draft FR10 is not reintroduced; safety independent and first.
- **PASS/FAIL:** any content/source or safety mismatch fails.
- **Rollback criteria:** disable/revert questionnaire only.
- **Expected deliverables:** config/tests/report.
- **Blockers:** owner approval/CTA destinations.
- **User action required:** approve publication.
- **Recommended commit checkpoint:** `feat: add Fatigue récupération questionnaire v1.0.0`.

## STAGE 14 - Sommeil questionnaire

- **Status:** `BLOCKED_BY_SCORING`.
- **Objective:** add SL01-SL12 and SLSF01-03 only after synthetic validation.
- **Prerequisites:** completed/approved synthetic boundary/profile report and content approval; prior stage PASS.
- **Files allowed to change:** Sommeil config/test, registry, docs.
- **Files forbidden to change:** source PDF, other configs, unapproved score ranges.
- **Exact tasks:** execute lifecycle A-P; validate non-linear SL01, ranges/dimensions/safety, transcribe/review, implement and test.
- **Required tests:** all boundaries, non-linear duration answer, safety high-score case, five dimensions, E2E.
- **Acceptance criteria:** scoring approval recorded and exact implementation.
- **PASS/FAIL:** remains BLOCKED rather than inventing missing validation conclusions.
- **Rollback criteria:** disable/revert questionnaire only.
- **Expected deliverables:** validation evidence then config/tests/report.
- **Blockers:** synthetic validation and owner approval.
- **User action required:** approve validation and publication.
- **Recommended commit checkpoint:** `feat: add Sommeil questionnaire v1.0.0`.

## STAGE 15 - Nutrition questionnaire

- **Status:** `BLOCKED_BY_SCORING`.
- **Objective:** add NT01-NT12 and NTSF01-03 after synthetic validation.
- **Prerequisites:** approved scoring profiles/boundaries and content.
- **Files allowed to change:** Nutrition config/test, registry, docs.
- **Files forbidden to change:** other configs/source/shared rules without proof.
- **Exact tasks:** execute lifecycle A-P; validate six dimensions/four ranges, safety and claims; exact transcription/review.
- **Required tests:** extremes/intermediate boundaries, reverse-worded mapped points, safety high-score case, E2E.
- **Acceptance criteria:** no calorie/diagnostic claims; complete source parity.
- **PASS/FAIL:** blocked on absent validation/approval; content must not be guessed.
- **Rollback criteria:** disable/revert questionnaire only.
- **Expected deliverables:** validation evidence, config/tests/report.
- **Blockers:** scoring/content approval and CTA URL.
- **User action required:** approve methodology/publication.
- **Recommended commit checkpoint:** `feat: add Nutrition questionnaire v1.0.0`.

## STAGE 16 - Activité physique questionnaire

- **Status:** `BLOCKED_BY_SCORING`.
- **Objective:** add AP01-AP12 after the PDF-required synthetic profile validation/pilot decision.
- **Prerequisites:** approved five-profile scoring report; content approval.
- **Files allowed to change:** Activité config/test, registry, docs.
- **Files forbidden to change:** ranges until approved; other configs/source.
- **Exact tasks:** execute lifecycle A-P; resolve source anomaly where AP04 lists both `2 jours` and `3 jours ou plus` as 4 points and document confirmation; validate ranges; transcribe/review.
- **Required tests:** five profiles named by PDF, AP04 confirmed mapping, AP12 ordered scoring, category boundaries, E2E.
- **Acceptance criteria:** anomaly explicitly approved; no WHO-score claim; exact output.
- **PASS/FAIL:** AP04 ambiguity or missing validation keeps stage BLOCKED.
- **Rollback criteria:** disable/revert questionnaire only.
- **Expected deliverables:** decision evidence, config/tests/report.
- **Blockers:** AP04 confirmation, synthetic validation/pilot decision, approval.
- **User action required:** resolve AP04 and approve methodology/publication.
- **Recommended commit checkpoint:** `feat: add Activité physique questionnaire v1.0.0`.

## STAGE 17 - Pieds & confort postural questionnaire

- **Status:** `BLOCKED_BY_SCORING`.
- **Objective:** add PF01-PF12/PFSF01-04 only after provisional ranges and PF09-PF10 guardrail are decided.
- **Prerequisites:** approved profiles A-F and guardrail ADR/content approval.
- **Files allowed to change:** Pieds config/test, registry, docs/ADR.
- **Files forbidden to change:** provisional source by inference; other configs.
- **Exact tasks:** execute lifecycle A-P; complete required synthetic validation, decide the unresolved PF09/PF10 guardrail, version the approved specification, exact transcription, Podos360 CTA/claims review. PFSF01-PFSF04 safety flags remain numerically independent.
- **Required tests:** profiles A-F, any approved guardrail boundaries, dimension attention, safety with favorable score, E2E.
- **Acceptance criteria:** categories no longer provisional and guardrail decision recorded.
- **PASS/FAIL:** stage remains BLOCKED while either decision is unresolved.
- **Rollback criteria:** disable/revert questionnaire only.
- **Expected deliverables:** scoring ADR, approved config/tests/report.
- **Blockers:** explicit in PDF: synthetic scoring and PF09-PF10 decision.
- **User action required:** methodological/medical/content approval and CTA URL.
- **Recommended commit checkpoint:** `feat: add Pieds confort postural questionnaire v1.0.0`.

## STAGE 18 - Stress & équilibre quotidien questionnaire

- **Status:** `BLOCKED_BY_CONTENT`.
- **Objective:** implement only from a complete approved specification distinct from PSS10.
- **Prerequisites:** exact source file, version, scoring/dimensions/safety/N/A/guardrail/CTA/disclaimer and approval.
- **Files allowed to change:** inventory first; config/test/registry only after readiness.
- **Files forbidden to change:** PSS10 or invented content.
- **Exact tasks:** execute lifecycle A-P after source approval; inventory/review source, establish distinct naming/claims, then standard transcription/test workflow.
- **Required tests:** derived from approved source plus generic suite/E2E.
- **Acceptance criteria:** no conceptual conflation with PSS10; source traceability complete.
- **PASS/FAIL:** absent/incomplete source is BLOCKED, never guessed.
- **Rollback criteria:** no registration until ready; revert config only.
- **Expected deliverables:** approved source mapping, config/tests/report.
- **Blockers:** no specification found.
- **User action required:** provide/approve specification.
- **Recommended commit checkpoint:** `feat: add Stress équilibre questionnaire <version>`.

## STAGE 19 - Composition corporelle questionnaire

- **Status:** `BLOCKED_BY_CONTENT`.
- **Objective:** implement from approved behavior-focused content without inferring diagnosis from VitaScan measurements.
- **Prerequisites:** complete approved specification and privacy/claims review.
- **Files allowed to change:** inventory then questionnaire-specific config/tests/registry.
- **Files forbidden to change:** invented scoring/medical claims/other configs.
- **Exact tasks:** execute lifecycle A-P after source approval; source review, schema mapping, claims/safety review, standard implementation.
- **Required tests:** source-specific profiles/boundaries plus generic/E2E.
- **Acceptance criteria:** scoring and product-measurement boundaries explicit.
- **PASS/FAIL:** missing source remains BLOCKED.
- **Rollback criteria:** no public registry until ready; revert questionnaire only.
- **Expected deliverables:** source mapping/config/tests/report.
- **Blockers:** no specification found.
- **User action required:** provide/approve specification.
- **Recommended commit checkpoint:** `feat: add Composition corporelle questionnaire <version>`.

## STAGE 20 - Bien-être général questionnaire

- **Status:** `BLOCKED_BY_CONTENT`.
- **Objective:** implement only after scope overlap and scoring are approved.
- **Prerequisites:** complete approved specification defining relationship to domain questionnaires.
- **Files allowed to change:** inventory then questionnaire-specific config/tests/registry.
- **Files forbidden to change:** invented aggregate weighting or cross-questionnaire data access.
- **Exact tasks:** execute lifecycle A-P after source/scope approval; decide whether standalone or aggregate through ADR, then standard implementation.
- **Required tests:** approved source vectors, overlap/privacy checks, generic/E2E.
- **Acceptance criteria:** no hidden weighting or reuse of prior answers without consent/contract.
- **PASS/FAIL:** absent source/scope decision remains BLOCKED.
- **Rollback criteria:** no public registration; revert questionnaire only.
- **Expected deliverables:** scope ADR, source mapping/config/tests/report.
- **Blockers:** no specification found and aggregate semantics unknown.
- **User action required:** provide/approve specification and scope.
- **Recommended commit checkpoint:** `feat: add Bien-être général questionnaire <version>`.

## STAGE 21 - Production packaging and deployment readiness

- **Status:** `NOT_STARTED`.
- **Objective:** package only questionnaires meeting Production Ready DoD and provide a reversible deployment checklist.
- **Prerequisites:** PSS10 and each included questionnaire have all prior stages PASS; privacy/backend/WordPress owners sign off.
- **Files allowed to change:** plugin docs/changelog/version, packaging exclusions, release manifest; source only for reviewed release defects.
- **Files forbidden to change:** questionnaire content/scoring during packaging; production before backup/approval; standalone.
- **Exact tasks:** clean package (`.DS_Store`, tests/dev evidence/endpoints per policy), version audit, lint/test full matrix, fresh WordPress install test, sandbox backend test, security/privacy/accessibility review, source hashes, ZIP/reproducibility, backup/rollback/deployment checklist.
- **Required tests:** every section 12 group applicable; clean-install and upgrade; production-like smoke against sandbox; checksum/ZIP content review.
- **Acceptance criteria:** zero critical/high open defect, all included configs `ready`, deployed backend version known, rollback rehearsed, Definition of Done satisfied.
- **PASS/FAIL:** FAIL if a questionnaire is included merely because its config exists, if tests are skipped, or if production rollback is unproven.
- **Rollback criteria:** restore prior plugin ZIP/version and endpoint/deployment; never mutate historical score rows.
- **Expected deliverables:** release ZIP, manifest/checksums, final audit, deployment and rollback runbooks.
- **Blockers:** unresolved questionnaire approvals, privacy/retention, backend ownership, builder compatibility, production credentials.
- **User action required:** final release and deployment approval.
- **Recommended commit checkpoint:** `release: LifeMetrics Questionnaires <version>` plus signed/tagged release.

# 15. Automation workflow with Codex

For every future session:

1. Open this plan and the persistent files in section 16.
2. Read the status table/last stage report and identify exactly one next incomplete approved stage.
3. Run `git status`, inspect every diff/untracked file, and distinguish pre-existing user changes from the target stage.
4. Verify stage prerequisites and blockers. If a content/approval/environment gate is missing, report `BLOCKED` and do not simulate completion.
5. Restate the stage ID, allowed files, forbidden files, tests, and rollback point before editing.
6. Execute only that stage. Do not opportunistically start the next stage or unrelated cleanup.
7. Use source documents verbatim for content and record source/hash/page mapping; never invent missing questionnaire text or scoring.
8. Run the stage's full required tests. Record commands, versions, results, skipped tests, and evidence paths.
9. Review `git diff --check`, the full diff, unexpected generated files, secrets/endpoints, and repository status.
10. Update the plan stage status, `CHANGELOG.md`, relevant inventory/test/decision docs, and a concise stage report in the same stage commit.
11. Recommend (do not silently create unless authorized) the named checkpoint commit.
12. Stop. Report PASS/FAIL/BLOCKED, exact changed files, test results, remaining risk, rollback command/commit, and the next proposed stage. Wait for explicit approval before a risky stage or any next stage.

Rules for automated continuation:

- No hidden multi-stage batch.
- A failing test stops the stage; fix only within allowed scope or roll back.
- Updating expected fixtures to match an unintended behavior change is forbidden.
- Runtime/environment/backend deployment, database, deletion/move, and production actions always require fresh explicit approval.
- If Git is dirty in overlapping files, preserve user changes; stop only when they cannot be safely isolated.
- Status updates are evidence-based: `PASS` requires acceptance criteria and test artifacts, not merely code completion.

Suggested stage report format:

```text
STAGE =
STATUS = PASS|FAIL|BLOCKED|ROLLED_BACK
BASE_COMMIT =
CHECKPOINT_COMMIT =
FILES_CHANGED =
TESTS_RUN =
TESTS_SKIPPED =
ACCEPTANCE_CRITERIA =
KNOWN_RISKS =
ROLLBACK =
USER_ACTION_REQUIRED =
NEXT_STAGE_PROPOSED =
NEXT_STAGE_STARTED = NO
```

# 16. Persistent project state files

Only this plan is created in the present task. Other files are created in STAGE 1 or the stage named below.

| File | Purpose | Created | Updated by/when | Must contain |
|---|---|---|---|---|
| `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md` | authoritative order, gates, acceptance, current stage | now | Codex at every stage; user approves status | stages, blockers, next action, DoD |
| `ARCHITECTURE.md` | current accepted component/dependency architecture | STAGE 1 | architecture-affecting stage | component boundaries, flows, directory tree, trust boundaries |
| `QUESTIONNAIRE_SCHEMA.md` | normative config/scoring/payload authoring contract | STAGE 1 | schema version change only | field requirements, validation, examples, SemVer/migration |
| `QUESTIONNAIRE_INVENTORY.md` | source/readiness/transcription ledger | STAGE 1 | every content discovery/approval/implementation | paths, hashes, versions, owners, statuses, blockers, code version |
| `TEST_MATRIX.md` | required cases and latest result by environment/questionnaire | STAGE 1 | every test stage/release | case IDs, commands, evidence, pass/fail/skip reason |
| `DECISIONS.md` | lightweight ADR log | STAGE 1 | before/with architectural deviation | decision ID/date/status/context/options/outcome/consequences |
| `CHANGELOG.md` | user-visible plugin changes by version | STAGE 1 | every source/release stage | Added/Changed/Fixed/Security; no raw work log |
| `STAGE_REPORTS/STAGE-XX.md` | immutable execution evidence for complex/risky stages | STAGE 0 onward if justified | executing Codex session | report template from section 15, hashes/log links |

Avoid duplicating normative content: this plan owns sequencing; schema details live in `QUESTIONNAIRE_SCHEMA.md`; current readiness lives in `QUESTIONNAIRE_INVENTORY.md`; decisions link rather than repeat entire contracts.

# 17. Decision log

The following decisions must be created/accepted in `DECISIONS.md` during STAGE 1:

| ID | Proposed decision | Status |
|---|---|---|
| DEC-001 | one shared engine with versioned questionnaire configurations | accepted 2026-09-03 |
| DEC-002 | canonical `questionnaire.php`; no per-test `config.js`; one shared template by default | accepted 2026-09-03 |
| DEC-003 | one generic shortcode with explicit registry/lifecycle gate; no V1 aliases | accepted 2026-09-03 |
| DEC-004 | generic same-origin REST shape `/v1/{id}/submit`; server recomputes canonical result | accepted 2026-09-03 |
| DEC-005 | hybrid Sheet architecture: one canonical common submission append, optional derived per-questionnaire views | accepted 2026-09-03 |
| DEC-006 | general min/max N/A normalization with half-up rounding; not hardcoded count x 4 | accepted 2026-09-03 |
| DEC-007 | preserve `calculated_category` and `displayed_category`; guardrails affect display only | accepted 2026-09-03 |
| DEC-008 | safety flags are non-scored and visually prioritized independently of favorable score | accepted 2026-09-03 |
| DEC-009 | mandatory questionnaire/config/submission versioning and SemVer rules | accepted 2026-09-03 |
| DEC-010 | lifecycle statuses `draft/review/ready/disabled`; public only `ready` | accepted 2026-09-03 |
| DEC-011 | explicit answer points represent reverse/non-linear scoring; no ID branches | accepted 2026-09-03 |
| DEC-012 | one canonical write with JSON snapshots to avoid Apps Script multi-tab partial commits | accepted 2026-09-03 |
| DEC-013 | PSS10 frozen migration compatibility versus later content/UX change | accepted 2026-09-03 |
| DEC-014 | privacy-minimal payload; path-only `source_page`, no identifiers/free text by default | accepted 2026-09-03 |
| DEC-015 | native browser/WordPress scripts first; no bundler/new dependency without measured need | accepted 2026-09-03 |
| DEC-016 | plugin owns questionnaire UI/runtime; WordPress owns surrounding page layout/full-width background/catalogue composition | accepted 2026-09-08 |
| DEC-017 | silent normal persistence and configuration-owned `result_ctas` | accepted 2026-09-08 |

Any deviation during implementation needs a new decision or an amended decision with date, evidence, migration consequence, and user acceptance.

# 18. Risk register

| Risk | Severity | Probability | Mitigation | Test/detection |
|---|---|---|---|---|
| break existing PSS10 | critical | medium | baseline commit, golden characterization, one-commit cutover, retained legacy rollback | parity fixtures + WP/E2E screenshots/contracts |
| accidental question/result copy change | high | medium | PDF hash/page mapping and source-vs-code review | exact content snapshot/checklist |
| PDF/code scoring inconsistency | critical | medium | explicit points, dual-runtime golden vectors, server recompute | boundary/profile parity tests |
| plugin currently untracked | critical | high/current | STAGE 0 before edits | Git commit/hash proof |
| duplicated frontend code returns | high | medium | registry/config-only questionnaire rule, static scan | forbidden per-question asset patterns |
| Sheet schema unsuitable for variable tests | high | medium | canonical versioned envelope + JSON snapshots; shadow migration | payload/schema and shadow reconciliation |
| partial hybrid backend writes | high | low after design | one canonical append; derived views noncanonical | fault injection/retry/idempotency tests |
| stale Apps Script deployment | high | medium | deployment/version field, recorded ID, sandbox then shadow | health/version response and repository/deployment comparison |
| WordPress absent | high | certain/current | dedicated STAGE 8 | environment manifest/health checks |
| Elementor conflict/unavailable | medium | medium | late CSS path retained, isolated selectors, explicit builder test | editor/public screenshot + console/PHP logs |
| CSS leakage/theme collision | high | medium | root namespace, minimal reset, no global selectors | static selector audit + theme matrix |
| multiple shortcode instance state collision | high | medium | per-root controller/config/IDs | two same/different instance E2E |
| incorrect N/A normalization | critical | medium | general min/max formula, half-up parity | HY05/SD07/08 and edge fixtures |
| incorrect guardrail ordering/category rank | critical | medium | explicit ranks/rule order; display-only mutation | D1 boundary and numeric-invariance tests |
| safety flag hidden by favorable score | critical | medium | independent evaluation and priority UI region | high-score+safety E2E/contract |
| questionnaire version drift | high | medium | immutable configs/fixtures and stored version/hash | request version mismatch + release audit |
| provisional questionnaire released early | critical | medium | lifecycle gate and inventory readiness approval | public registry/status tests + release checklist |
| client-tampered score stored | critical | medium | PHP and Apps Script recomputation/verification | tampered payload tests |
| direct browser-to-Google regression | high | low | same-origin API module only, static forbidden URL check | source scan/network E2E |
| formula injection | high | medium | escape every Sheet-bound string | malicious string backend tests |
| privacy/health data mishandling | critical | medium | minimal payload, access/retention/DPIA decisions, log redaction | privacy checklist and log/payload review |
| PSS licensing/attribution gap | high | unknown | record legal source/approval before migration/release | release legal checklist |
| content IDs renamed after data exists | high | medium | stable IDs/version migration only | schema diff/version test |
| abuse/spam on public REST | high | medium | size/type validation, idempotency, privacy-preserving rate strategy/monitoring | load/abuse tests and volume alerts |
| root standalone accidentally changed | high | low | forbidden in stages, hash manifest | Git path/diff check each stage |

# 19. Definition of Done

## QUESTIONNAIRE_IMPLEMENTATION_DONE

All of the following are true:

- exact approved source path/hash/version/owner/date recorded;
- content and scoring statuses are ready; no unresolved provisional rule;
- valid versioned configuration contains complete questions, answers, points, dimensions, levels, safety, guardrails, CTA, disclaimer, attribution as applicable;
- independent source-to-code review passed;
- schema, PHP/JS parity, boundaries, provided profiles, N/A, safety, guardrails, weakest dimensions, and payload tests pass;
- lifecycle is at most `review` until user approves public exposure;
- changelog/inventory/test matrix/stage report updated.

Before transition to `ready`, every item in the standard questionnaire runtime acceptance gate in `TEST_MATRIX.md` must be `PASS`, including WordPress render/navigation/back/reselection/result/CTA/submission/REST/storage/error/silent-success/asset-versioning/desktop/mobile evidence.

This level does not imply WordPress or backend runtime success.

## WORDPRESS_INTEGRATION_DONE

`QUESTIONNAIRE_IMPLEMENTATION_DONE` plus:

- config is intentionally `ready` and resolves through generic shortcode/REST;
- clean activation and valid/invalid/status shortcode behavior pass;
- assets are conditional/single-load and instances isolated;
- Gutenberg, Elementor (or explicitly accepted unavailable blocker), REST, sandbox backend, browser, accessibility, desktop/tablet/mobile, retry/error/duplicate tests pass;
- no PHP/JS console warnings, direct Google traffic, CSS leakage, or production test writes;
- evidence is recorded against exact environment versions.

This level still does not imply production deployment approval.

## PRODUCTION_READY

`WORDPRESS_INTEGRATION_DONE` plus:

- content/methodology/legal/medical-claims/privacy/security/accessibility owners approve as applicable;
- production backend source and deployment version are known; Sheet/storage backup, retention, access, and recovery are documented;
- release package is reproducible, contains only intended files, passes clean-install/upgrade/full regression;
- production configuration/CTA destinations are verified without exposing secrets;
- monitoring, incident response, rollback plugin/backend, and historical-version interpretation are documented and rehearsed;
- zero critical/high unresolved issue and all exceptions are explicitly accepted;
- release version/tag/checksums and final audit exist.

A PHP configuration file, a passing unit test, a PDF named V1, or a successful shortcode render alone is never `PRODUCTION_READY`.

# 20. Next action

Execute exactly one next stage in a separate run:

`STAGE 3 - Generic PHP infrastructure in parallel`

STAGE 2 passed on 2026-09-04 after Maksym Kurlukov accepted the captured PSS10 behavior strictly as the structural-migration/regression baseline. Begin STAGE 3 only in a separate run; do not reinterpret this acceptance as permanent production approval of legacy UX, content, CTA, licensing, or attribution choices.

The out-of-sequence PSS10 production-runtime validation and UI stabilization milestone is complete through `bfb1385`; its status does not start Stage 3. The earlier statement that duplicate replay remained unverified is superseded: `DUPLICATE_CHECK = PASS` is recorded in the milestone report and test matrix.

Current public-release blockers are: PSS10 licensing/legal/attribution approval; WordPress/page-layout implementation of the full-width `#faf8f5` background; creation of the `/tests-sante/` catalogue; activation of the secondary CTA after that page exists; real WordPress mobile validation; Stage 3 generic architecture; proprietary questionnaire migrations; and required synthetic scoring validation/approvals. PSS10 is not public-ready solely because runtime passed; lifecycle/legal gates remain independent.
