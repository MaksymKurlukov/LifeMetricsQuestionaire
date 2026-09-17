# LifeMetrics Questionnaires

WordPress plugin providing a dual-runtime questionnaire engine for LifeMetrics health, wellness, and lifestyle assessments.

---

## 1. Supported Questionnaires

The plugin embeds exactly **10 validated questionnaires**:
- **1 Clinical Reference Questionnaire (PSS-10)** executed through a dedicated, isolated, frozen legacy runtime.
- **9 Proprietary LifeMetrics Questionnaires** executed through a unified generic V2 runtime.

| Canonical ID | Questionnaire Name | Questions | Score Range | Direction | Safety | Completion Link | Storage Tab | Status |
|---|---|:---:|:---:|:---:|:---:|---|---|:---:|
| `pss10` | Échelle de Stress Perçu (PSS-10) | 10 | 10 – 50 | Higher is worse | None | Partner pharmacies | `PSS10` (24 col) | Validated (Phase 16) |
| `sedentarite` | Score Sédentarité | 12 | 12 – 60 | Lower is better | None | Partner pharmacies | `Sedentarite` (31 col) | Validated (Phase 16) |
| `hydratation` | Score Hydratation | 12 | 12 – 60 | Lower is better | 3 items | VitaScan | `Hydratation` (35 col) | Validated (Phase 16) |
| `fatigue-recuperation` | Score Fatigue & Récupération | 12 | 12 – 60 | Lower is better | 3 items | Partner pharmacies | `Fatigue` (35 col) | Validated (Phase 16) |
| `sommeil` | Score Sommeil | 12 | 12 – 60 | Lower is better | 3 items | Partner pharmacies | `Sommeil` (35 col) | Validated (Phase 16) |
| `nutrition` | Score Nutrition | 12 | 12 – 60 | Lower is better | 3 items | VitaScan | `Nutrition` (35 col) | Validated (Phase 16) |
| `activite-physique` | Score Activité Physique | 12 | 12 – 60 | Lower is better | None | VitaScan | `Activite_Physique` (31 col) | Validated (Phase 16) |
| `pieds-confort-postural` | Score Pieds & Confort Postural | 12 | 12 – 60 | Lower is better | 4 items | Podos360 | `Pieds_Confort` (36 col) | Validated (Phase 16) |
| `risque-nutritionnel` | Score Risque Nutritionnel | 12 | 12 – 60 | Lower is better | 4 items | VitaScan | `Risque_Nutritionnel` (36 col) | Validated (Phase 16) |
| `bien-etre` | Score Bien-être | 12 | 12 – 60 | Lower is better | None | Partner pharmacies | `Bien_Etre` (31 col) | Validated (Phase 16) |

> Complete clinical specifications, dimension mappings, and scoring formulas are detailed in [QUESTIONNAIRE_INVENTORY.md](file:///Users/maksymkurlukov/DEV/LifeMetrics/LifeMetricsQuestionaire/QUESTIONNAIRE_INVENTORY.md).

---

## 2. Dual-Runtime Architecture

To protect clinical integrity while scaling the platform, the plugin operates with two distinct and strictly isolated runtimes:

### 2.1. PSS-10 Frozen Legacy Runtime
- **Purpose**: Preserves historical PSS-10 clinical characterization with zero regression risk.
- **Components**:
  - Class: `LifeMetrics_Legacy_PSS10_Runtime` (in `questionnaires/pss10/`).
  - Frontend: Dedicated template (`pss10/template.php`), script (`pss10/assets/js/app.js`), style (`pss10/assets/css/style.css`).
  - Scoring: 10 items, 1–5 scale, reverse scoring on Q4, Q5, Q7, Q8 ($6 - \text{valeur}$), score 10–50 (`higher_is_worse`). Protected by 13 frontend mutation guards.
  - Transport & Backend: Dedicated REST endpoint `/pss10/submit` forwarding to a dedicated Google Apps Script Web App (`backend/google-apps-script.gs`) via the `LMQ_PSS10_GOOGLE_ENDPOINT` WordPress constant.
  - Storage: `PSS10` tab (24 enriched physical columns).

### 2.2. Generic V2 Runtime (9 Proprietary Questionnaires)
- **Purpose**: Unified, scalable, and responsive engine for all proprietary assessments.
- **Components**:
  - Registry & Routing: `LifeMetrics_Questionnaire_Registry` and `LifeMetrics_Questionnaire_Renderer`.
  - Frontend: Shared template (`templates/questionnaire.php`), style (`assets/css/questionnaire.css`), UI controller (`assets/js/questionnaire-ui.js`), scoring engine (`assets/js/questionnaire-engine.js`).
  - Scoring: 12 scored items per questionnaire, 1–5 points, score 12–60 (`lower_is_better`), 3 categories (Favorable, Intermédiaire, Défavorable).
  - N/A Support: Proportional normalization for `sedentarite` (SD07, SD08) and `hydratation` (HY05) via $\text{ROUND}((\text{raw\_score} / \text{applicable}) \times 12)$.
  - Guardrails: Category threshold capping to intermediate orange on critical clinical triggers without altering the numerical score (`sedentarite`, `pieds-confort-postural`, `risque-nutritionnel`, `bien-etre`).
  - Transport & Backend: Dynamic REST routes `/<id>/submit` with server-side authoritative recalculation, forwarding to a shared generic Google Apps Script Web App (`backend/generic-google-apps-script.gs`) via the `LMQ_GOOGLE_ENDPOINT` WordPress constant.
  - Storage: 9 dedicated tabs (31 to 36 physical columns).

---

## 3. WordPress Shortcode

Display any questionnaire on any WordPress page or post:

```text
[lifemetrics_questionnaire id="<questionnaire-id>"]
```

### Routing Behavior
- `id="pss10"` (or empty `id`): Routes directly to `LifeMetrics_Legacy_PSS10_Runtime`.
- `id="<proprietary-id>"` (e.g. `hydratation`, `sommeil`): Resolves configuration via `LifeMetrics_Questionnaire_Registry` and renders via generic V2 runtime.
- Unknown `id`: Safely returns an empty string without throwing errors or leaking data.

---

## 4. Frontend & User Experience Flow

The user flow is structured across three sequential screens:

1. **Intro Screen**:
   - Title, subtitle, context badges (duration, questions count, target audience).
   - "COMMENCER" primary start button.
   - "En savoir plus" modal providing structured methodology explanations.

2. **Question Screen**:
   - Visual progress bar and step counter (`Question X sur Y`).
   - Question label and contextual help text.
   - Answer cards with hover/focus states, keyboard accessibility, and smooth auto-advance (400ms).
   - Declarative N/A option handling (`applicable: false`).
   - Discrete Safety questions (when configured) presented without visual bias.
   - "Retour" back navigation preserving previous answers.

3. **Result Screen**:
   - **Result Category Badge (`result-badge`)**: Displays the final clinical category (`displayed_category`).
   - **Continuous Score Gauge**: Complete semi-circular track rendered with a continuous SVG `linearGradient` (green → orange → red) dynamically aligned with `result_levels` thresholds, featuring an accurate score marker positioned according to the real numerical score (no inactive grey remainder).
   - **Safety Alert (if triggered)**: Clean, text-only alert banner titled *"Un point mérite votre attention."* without warning icons or emojis (⚠️). Safety remains strictly out-of-score.
   - **Detailed Analysis Accordion**: Expandable analysis section toggled via *"Lire l'analyse détaillée"* / *"Masquer l'analyse détaillée"*.
   - **Integrated Result Completion (`.analysis-completion`)**: Contextual guidance appended as the final paragraph of the detailed analysis accordion (no separate card, no visible title):
     - **VitaScan** orientation for `hydratation`, `nutrition`, `activite-physique`, `risque-nutritionnel`.
     - **Podos360** orientation for `pieds-confort-postural`.
     - **LifeMetrics partner pharmacies** neutral guidance for `pss10`, `sedentarite`, `fatigue-recuperation`, `sommeil`, `bien-etre`.
   - **Call-to-Action (CTA) Buttons**:
     - Primary CTA: *"Je veux faire un bilan"* (`https://lifemetrics.fr/formulaire-bilan/`).
     - Secondary CTA: *"Découvrir les autres questionnaires"* (or *"Découvrir les autres tests"* on PSS-10) (`/tests-sante/`).
     - Tertiary action: *"Refaire le test"* to restart the assessment.
   - **No Separate Attention Cards**: Intermediate dimensional cards (*"Point d'attention : <dimension>"*) are globally suppressed across all 9 Generic V2 questionnaires; dimension scores are processed internally to drive detailed analysis and guardrails without separate UI cards.

---

## 5. Backend Architecture & Security Boundaries

```
[Browser Client]
       │  (1) POST raw answers + session_id
       ▼
[WordPress REST Controller]
  /wp-json/lifemetrics-questionnaires/v1/<id>/submit
       │
       ▼
[Questionnaire Registry] ──> loads canonical configuration
       │
       ▼
[Server Scoring Engine] ──> Authoritative recalculation of score,
       │                    categories, dimensions, guardrails, and safety flags
       ▼
[Submission Service] ──> Builds tamper-resistant payload
       │
       ▼
[Google Apps Script Adapter] ──> wp_remote_post with SSL verification
       │
       ▼
[Google Apps Script Web App] ──> Validates schema & deduplicates session_id
       │
       ▼
[Google Sheets Spreadsheet] ──> Appends row to the designated tab
```

### Security & Authority Invariants
1. **Raw Input Only**: The client submits question answers, a client-generated UUID v4 `session_id`, and a timestamp.
2. **Server-Authoritative Calculation**: Client calculations are never trusted for persistence. WordPress recalculates all scores, category thresholds, dimensions, guardrails, and safety flags before payload transmission.
3. **Strict Tab Isolation**: The client never specifies spreadsheet tab names. Tab resolution is handled strictly by Google Apps Script using the authenticated `questionnaire_id`.
4. **Credential Isolation**: Google Apps Script webhook endpoints are defined server-side via WordPress configuration constants and never exposed to the client.

---

## 6. Storage & Endpoints Configuration

Submissions are forwarded to Google Sheets via Google Apps Script Web Apps. Endpoints can be defined in `wp-config.php` or environment settings:

```php
// PSS-10 Legacy Google Apps Script Web App
define('LMQ_PSS10_GOOGLE_ENDPOINT', 'https://script.google.com/macros/s/.../exec');

// Generic V2 Google Apps Script Web App (9 proprietary questionnaires)
define('LMQ_GOOGLE_ENDPOINT', 'https://script.google.com/macros/s/.../exec');
```

> [!NOTE]
> Webhook endpoints must remain confidential. Never commit raw endpoint URLs into public repositories.

### Storage Tabs Reference
- `PSS10` (24 columns): Dedicated legacy schema with full textual answers, individual points, raw score, and category.
- `Sedentarite` (31 columns)
- `Hydratation` (35 columns)
- `Fatigue` (35 columns)
- `Sommeil` (35 columns)
- `Nutrition` (35 columns)
- `Activite_Physique` (31 columns)
- `Pieds_Confort` (36 columns)
- `Risque_Nutritionnel` (36 columns)
- `Bien_Etre` (31 columns)

---

## 7. Local Development & Preview Tool

A standalone local preview utility is available at `preview.php`:
- Dedicated to rapid local iteration and UI validation of the **9 proprietary questionnaires** on the generic runtime.
- Operates independently from WordPress and simulates client scoring and rendering.
- **PSS-10 is excluded** from `preview.php` as it runs solely on its dedicated legacy runtime.
- **Important**: `preview.php` is strictly a development tool and is automatically excluded from production release archives.

---

## 8. Current Verification & Project Status

| Verification Level | Scope | Status | Details |
|---|---|:---:|---|
| **PHP Automated Test Suites** | All modules & registries | **PASS** | 23/23 PHP test suites passing (0 errors, 0 warnings). |
| **JavaScript Test Suites** | Engines, UI & mutation guards | **PASS** | 19/19 JS test suites passing (including 13 PSS-10 guards). |
| **Combined Automated Coverage** | Full repository | **PASS** | 42/42 test suites passing (100% success). |
| **WordPress LOCAL TEST (MAMP)** | All 10 questionnaires | **PASS** | Complete end-to-end user journeys validated on local WordPress: UI render, navigation, scoring, accordion analysis, REST HTTP 200, and verified insertion across all 10 Google Sheets tabs. |
| **Tamper Resistance** | Generic & Legacy runtimes | **PASS** | Server authority overrides all spoofed client payloads. |
| **Release Archive Audit** | Production ZIP | **PASS** | Verified clean build containing exactly 61 production files, zero test files, zero preview scripts, zero Git metadata. |
| **LifeMetrics Production Site** | Live environment | **INTOUCHÉE** | Production site remains 100% clean and untouched pending final review (WORK-23). |

---

## 9. Build & Release Packaging

To build the canonical production ZIP package for WordPress installation:

```bash
bash scripts/build-release-zip.sh lifemetrics-questionnaires.zip
```

To run the automated pre-release audit verifying package integrity:

```bash
php lifemetrics-questionnaires/tests/stage11-release-audit.test.php
```

### Archive Invariants
The release build process guarantees that `lifemetrics-questionnaires.zip`:
- Contains only the core plugin directory `lifemetrics-questionnaires/` (61 production files).
- Excludes development tools: `preview.php`, `tests/`, `scripts/`, `docs/`.
- Excludes VCS and OS artifacts: `.git*`, `.DS_Store`, backup and temporary files.

Installation is performed by uploading `lifemetrics-questionnaires.zip` via the standard WordPress Plugins admin interface (`Plugins > Add New > Upload Plugin`).

---

## 10. Project Roadmap & Documentation

The project has completed its core implementation and validation phases:
- **Phases 1–15**: Architecture design, PSS-10 freezing, generic runtime implementation, scoring normalization, and Google Sheets integration.
- **Phase 16**: Safety copy refinement (no emojis/icons), integrated detailed analysis completion, UX adjustments, and end-to-end qualification of all 10 questionnaires on WordPress local (MAMP).
- **WORK-19 (Current)**: Full documentary reconciliation across all specifications and reference files.
- **WORK-23 (Upcoming)**: Final executive review and handover to Camille.

### Documentation Index
- [QUESTIONNAIRE_INVENTORY.md](file:///Users/maksymkurlukov/DEV/LifeMetrics/LifeMetricsQuestionaire/QUESTIONNAIRE_INVENTORY.md) : Exhaustive inventory, scoring scales, Safety items, N/A logic, and guardrails.
- [ARCHITECTURE.md](file:///Users/maksymkurlukov/DEV/LifeMetrics/LifeMetricsQuestionaire/ARCHITECTURE.md) : Technical architecture, data flow, security invariants, and REST specifications.
- [CHANGELOG.md](file:///Users/maksymkurlukov/DEV/LifeMetrics/LifeMetricsQuestionaire/CHANGELOG.md) : Chronological history of plugin releases and modifications.
- [LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md](file:///Users/maksymkurlukov/DEV/LifeMetrics/LifeMetricsQuestionaire/LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md) : Comprehensive implementation plan and Phase 1–16 sign-off log.
