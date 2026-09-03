# LifeMetrics questionnaire schema and scoring contract

Document version: 1.0.0

Schema version: `1.0.0`

Status: `APPROVED`

Last updated: 2026-09-03

Approved by: Maksym Kurlukov on 2026-09-03.

Authority: normative questionnaire configuration, scoring, result, serialization, and submission contract. Stage sequencing remains in `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`.

## Authoring format

One file at `lifemetrics-questionnaires/questionnaires/<id>/questionnaire.php` returns one plain PHP associative array.

The file must not:

- register WordPress hooks;
- perform I/O or HTTP requests;
- include another runtime file;
- access globals/environment values;
- contain callbacks, closures, classes, or executable scoring expressions;
- contain an upstream backend URL.

The registry, not visitor input, selects the file through an explicit map.

## Top-level fields

| Field | Requirement | Validation |
|---|---|---|
| `schema_version` | required | exact supported SemVer; initially `1.0.0` |
| `id` | required | lowercase kebab-case `[a-z0-9]+(?:-[a-z0-9]+)*`; equals registry key/directory |
| `version` | required | questionnaire SemVer |
| `status` | required | `draft`, `review`, `ready`, `disabled` |
| `locale` | required | supported locale; initially `fr-FR` |
| `title` | required | non-empty plain text |
| `seo_title` | optional | plain text suggestion; does not mutate WordPress SEO automatically |
| `description` | required | non-empty plain text or approved structured paragraphs |
| `population` | required | non-empty plain text |
| `recall_period` | required | non-empty plain text |
| `estimated_duration` | required | non-empty plain text |
| `scoring_direction` | required | `higher_is_better` or `higher_is_worse` |
| `score` | required | scale and normalization object |
| `questions` | required | ordered non-empty array of scored questions |
| `dimensions` | required | ordered array; empty only for approved dimensionless instruments |
| `result_levels` | required | ordered exhaustive/non-overlapping category ranges |
| `classification_rules` | optional | ordered allowlisted guardrail rules; default empty only when explicitly present/validated |
| `weakest_dimensions` | conditional | required when dimensions must be ranked/displayed |
| `safety_questions` | optional | ordered non-scored questions |
| `safety_messages` | conditional | required when safety questions can trigger a message |
| `cta` | required | approved label/destination/supporting copy |
| `disclaimer` | required | before and after text |
| `attribution` | conditional | required when instrument/legal source needs it, including PSS10 if confirmed |
| `content_revision` | optional | approved document/hash reference; never replaces `version` |

Unknown fields fail schema validation for `ready` configurations. During schema evolution they require a new schema version rather than being silently ignored.

## Score object

Required fields:

```php
'score' => array(
    'target_min' => 0,
    'target_max' => 48,
    'normalize_when_unavailable' => true,
    'rounding' => 'half_up',
),
```

Rules:

- `target_min` and `target_max` are finite numbers and `target_max > target_min`.
- `rounding` initially accepts only `half_up` to guarantee PHP/JavaScript parity.
- `normalize_when_unavailable` is boolean.
- The configured result ranges cover every possible rounded target score.

## Scored question

```php
array(
    'id' => 'HY01',
    'dimension' => 'eau-boissons',
    'text' => "Au cours des 14 derniers jours, quelle place l'eau a-t-elle occupée parmi les boissons que vous consommez pour vous hydrater ?",
    'required' => true,
    'help' => "L'eau peut être plate ou gazeuse.",
    'answers' => array(
        array(
            'value' => 'tres-faible',
            'label' => 'Très faible',
            'points' => 0,
            'applicable' => true,
        ),
        array(
            'value' => 'principale',
            'label' => "L'eau est clairement ma boisson principale",
            'points' => 4,
            'applicable' => true,
        ),
    ),
),
```

Required question fields: `id`, `dimension`, `text`, `required`, `answers`.

- Question IDs are unique and stable after data collection begins.
- `dimension` is a known dimension ID or `null` only for an approved dimensionless configuration.
- `required` is boolean. V1 public questionnaires require every scored question to receive an answer; N/A is an answer, not omission.
- `answers` is ordered and non-empty.
- Optional `help`, `examples`, and `scoring_note` are plain content/audit metadata.

Required answer fields: `value`, `label`, `points`, `applicable`.

- `value` is a stable string or integer unique within the question; no loose equality/coercion.
- `label` is non-empty plain text.
- Applicable answers have finite numeric `points`.
- Non-applicable answers have exactly `points => null` and `applicable => false`.
- `points => null` on an applicable answer is invalid.
- Reverse and non-linear scoring are expressed through explicit answer points, never question-ID logic.

Example reverse mapping for one PSS10 question:

```php
'answers' => array(
    array('value' => 1, 'label' => 'Jamais', 'points' => 5, 'applicable' => true),
    array('value' => 2, 'label' => 'Presque jamais', 'points' => 4, 'applicable' => true),
    array('value' => 3, 'label' => 'Parfois', 'points' => 3, 'applicable' => true),
    array('value' => 4, 'label' => 'Assez souvent', 'points' => 2, 'applicable' => true),
    array('value' => 5, 'label' => 'Très souvent', 'points' => 1, 'applicable' => true),
),
```

This is illustrative contract data, not an authorization to migrate PSS10 content.

## Dimensions

```php
'dimensions' => array(
    array(
        'id' => 'eau-boissons',
        'label' => 'Eau et boissons quotidiennes',
        'question_ids' => array('HY01', 'HY02'),
        'weakest_eligible' => true,
        'attention' => array(
            'metric' => 'percentage',
            'operator' => '<=',
            'value' => 25,
            'message_code' => 'DIMENSION_ATTENTION',
        ),
    ),
),
```

- IDs are unique and stable.
- Every `question_ids` entry resolves to one scored question.
- By default, each scored question belongs to exactly one dimension. Multi-dimension membership requires an ADR/schema extension.
- `weakest_eligible` is boolean.
- Attention grammar uses the same allowlisted numeric operators as classification rules.
- Percentage is preferred for comparisons when N/A can reduce dimension capacity.

Canonical dimension result:

```json
{
  "id": "eau-boissons",
  "raw_score": 5,
  "available_min": 0,
  "available_max": 8,
  "percentage": 62.5,
  "attention": false
}
```

A dimension with `available_max === available_min` is `unavailable`, has no percentage, and is excluded from weakest ranking.

## Result levels

```php
'result_levels' => array(
    array(
        'code' => 'HABITUDES_HYDRATATION_INSUFFISANTES',
        'rank' => 0,
        'min' => 0,
        'max' => 15,
        'title' => "Habitudes d'hydratation insuffisantes",
        'description' => '...',
        'recommendations' => array('...'),
    ),
),
```

- `code` and `rank` are unique.
- `min`/`max` are inclusive.
- Ranges do not overlap and cover the complete rounded target scale exactly once.
- Rank means outcome quality from worst (`0`) to best (higher rank), independent of score direction and text order.
- Result copy must be complete before a configuration may be `ready`.

## Classification rules

V1 supports one rule type:

```php
'classification_rules' => array(
    array(
        'id' => 'CAP_HIGH_SEDENTARY_TIME',
        'type' => 'category_cap',
        'metric' => 'dimension_score',
        'dimension' => 'temps-sedentaire-quotidien',
        'operator' => '<=',
        'value' => 2,
        'max_category' => 'SEDENTARITE_A_REDUIRE',
        'message_code' => 'SEDENTARITE_VOLUME_CAP',
    ),
),
```

Validation:

- IDs are unique.
- `type` is exactly `category_cap` in schema 1.0.0.
- `metric` is `dimension_score` or `dimension_percentage`.
- Dimension/category/message references exist.
- Operator is one of `<`, `<=`, `==`, `>=`, `>`.
- Rule order is configuration order and deterministic.
- Arbitrary expressions, JavaScript/PHP snippets, `eval`, and questionnaire-ID branches are forbidden.

Application changes only `displayed_category` and records the rule ID/message. `raw_score`, capacities, `final_score`, and `calculated_category` remain unchanged.

## Weakest dimensions

```php
'weakest_dimensions' => array(
    'count' => 2,
    'tie_break' => 'configuration_order',
),
```

- `count` is 1 or 2 in schema 1.0.0.
- Rank eligible/available dimensions by ascending percentage.
- Equal percentages use configuration order.
- Attention status does not reorder ties unless a later schema/ADR says so.

## Safety questions

```php
'safety_questions' => array(
    array(
        'id' => 'HYSF01',
        'text' => '...',
        'required' => true,
        'answers' => array(
            array('value' => 'yes', 'label' => 'Oui', 'triggers' => array('HYDRATION_ATTENTION')),
            array('value' => 'no', 'label' => 'Non', 'triggers' => array()),
        ),
    ),
),
'safety_messages' => array(
    'HYDRATION_ATTENTION' => array(
        'priority' => 100,
        'title' => 'Certaines de vos réponses nécessitent une attention particulière.',
        'text' => '...',
    ),
),
```

- Safety questions have no points/dimension and never enter numeric calculations.
- Trigger codes resolve to configured messages.
- Duplicate triggers collapse by code and sort by descending priority, then first trigger order.
- Triggered messages render before general result recommendations at every score/category.

## CTA, disclaimer, and attribution

```php
'cta' => array(
    'label' => 'Découvrir mon bilan VitaScan',
    'destination' => 'vitascan',
    'supporting_text' => '...',
),
'disclaimer' => array(
    'before' => '...',
    'after' => '...',
),
'attribution' => array(
    'label' => '...',
    'url' => 'https://...',
    'license_note' => '...',
),
```

CTA `destination` is a server-side allowlisted key resolved to an approved URL. Direct arbitrary configuration URLs are not public-ready unless the schema explicitly validates an approved HTTPS allowlist. Questionnaire content cannot define an upstream submission URL.

## Lifecycle validation

| Status | Schema behavior | Public shortcode/REST |
|---|---|---|
| `draft` | may be incomplete; validation reports errors | denied |
| `review` | must be complete enough for full contract tests | denied |
| `ready` | all required fields/cross-references/approval metadata/tests valid | allowed |
| `disabled` | retained/version-readable internally; may have historical schema | denied |

Transition to `ready` requires inventory source hash, questionnaire version, content/scoring approval, passing tests, approved CTA, and required legal/privacy review.

## Canonical scoring algorithm

1. Resolve exact questionnaire ID/version and validate schema/status.
2. Validate request envelope and exact answer key set.
3. Map each selected value to one configured answer with strict type/value equality.
4. Separate applicable answers from N/A.
5. Sum applicable points as `raw_score`.
6. For each applicable question, add its minimum/maximum applicable answer points to `available_min`/`available_max`.
7. If capacity was removed and normalization is enabled:

   ```text
   normalized = target_min
              + (raw_score - available_min)
              / (available_max - available_min)
              * (target_max - target_min)
   final_score = ROUND_HALF_UP(normalized)
   ```

   Reject when `available_max === available_min`.
8. Otherwise use raw score when its configured scale equals the target scale; schema rejects ambiguous scale mapping.
9. Calculate dimension raw/min/max/percentage and attention state.
10. Select `calculated_category` from `final_score`.
11. Apply ordered guardrails to produce `displayed_category` and messages without altering numbers.
12. Select weakest dimensions.
13. Evaluate safety triggers independently.
14. Produce canonical result/payload and compare optional client summary.

For LifeMetrics 0-4 questions targeting 0-48, the formula becomes `ROUND_HALF_UP(raw_score / available_max * 48)`. For PSS10 without N/A, 10-50 remains the raw score.

## Rounding parity

`half_up` means values exactly halfway between integers round away from zero for non-negative questionnaire scores. PHP uses `round($value, 0, PHP_ROUND_HALF_UP)`. JavaScript must use an explicit tested helper, not rely on unreviewed floating-point coincidence.

Every golden fixture runs through PHP and JavaScript and compares canonical JSON fields. A mismatch blocks release.

## Browser request

```json
{
  "submission_schema_version": "1.0.0",
  "questionnaire_id": "sedentarite",
  "questionnaire_version": "1.0.0",
  "client_version": "1.0.0",
  "session_id": "123e4567-e89b-42d3-a456-426614174000",
  "completed_at": "2026-09-03T12:00:00.000Z",
  "locale": "fr-FR",
  "source_page": "/questionnaire-sedentarite/",
  "answers": {
    "SD01": "between-7-and-9-hours"
  },
  "client_result": {
    "raw_score": 1,
    "available_max": 4,
    "final_score": 12,
    "calculated_category": "SEDENTARITE_ELEVEE",
    "displayed_category": "SEDENTARITE_ELEVEE"
  }
}
```

The fragment is intentionally incomplete and therefore invalid as a real submission. It documents field shape only.

Request validation:

- JSON object and configured maximum byte size;
- exact supported submission schema version;
- route ID equals body ID;
- exact active questionnaire version;
- UUID v4 session ID;
- valid UTC ISO-8601 completion time;
- supported locale;
- source path sanitized server-side; query/fragment removed;
- answers object has exactly required scored/safety IDs and known value types;
- derived client fields, when present, must strictly match canonical server fields or request is rejected.

## Canonical persisted payload

Required fields:

- `submission_schema_version`;
- `questionnaire_id`, `questionnaire_version`, `client_version`;
- `session_id`, `completed_at`, server `received_at`;
- `locale`, sanitized path-only `source_page` or null;
- selected answer value, canonical points, applicability for each scored answer;
- selected values and triggered codes for safety answers;
- `raw_score`, `available_min`, `available_max`, `final_score`;
- `calculated_category`, `displayed_category`;
- applied classification rule/message codes;
- canonical dimensions and weakest dimensions;
- safety flag codes;
- adapter/storage schema version and duplicate indicator.

The server computes all derived fields. Current PSS10 `created_at` receives an explicit compatibility mapping to `completed_at`; no historical field is silently renamed.

## Privacy contract

Answers and safety flags are potentially health-related information.

The default schema forbids name, email, phone, WordPress user ID, IP, full user-agent, device fingerprint, free text, marketing identifiers, and arbitrary referrer/query data. Adding any requires a separate privacy decision, lawful basis/consent analysis, retention/access update, and schema version review.

`source_page` is path-only. Logs must not contain answers, safety responses, or upstream bodies. Error responses contain stable codes and no sensitive values.

## Versioning policy

### Questionnaire version

- Patch: display-only correction proven not to change meaning, answer mapping, score, result interpretation, safety, CTA destination, or persisted contract.
- Minor: backward-incompatible interpretation within the same questionnaire identity, including question/answer wording meaning, answer values/points, dimensions, ranges, N/A, guardrails, safety, or CTA/claim semantics. Historical version remains interpretable and fixture-retained.
- Major: instrument identity or conceptual scoring model changes enough that longitudinal comparison needs an explicit migration decision.

Any scoring-affecting change requires at least a minor bump. The content owner approves classification of a change.

### Schema version

- Patch for clarification with identical accepted data.
- Minor for backward-compatible optional fields/rule types.
- Major for required-field, semantics, or serialization incompatibility.

### Submission schema version

Versioned independently from questionnaire content. Backend rejects unsupported versions and records accepted version.

## Validation failures

Validation fails closed with stable codes such as:

- `invalid_schema_version`;
- `invalid_questionnaire_id`;
- `invalid_questionnaire_version`;
- `questionnaire_not_public`;
- `invalid_question_reference`;
- `invalid_answer_definition`;
- `invalid_result_ranges`;
- `invalid_classification_rule`;
- `invalid_safety_reference`;
- `invalid_submission`;
- `client_result_mismatch`;
- `unscorable_answers`.

No invalid configuration is silently accepted, normalized, or made public.

## Approval gate

This document is proposed. It becomes the accepted schema contract only after explicit user approval completes STAGE 1. No configuration implementation is authorized in STAGE 1.
