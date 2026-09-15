# LifeMetrics Questionnaires Architecture

Document version: 2.1.0
Status: `VERIFIED PRODUCTION ARCHITECTURE`
Last updated: 2026-09-14

## 1. System Purpose & Core Principles

The `lifemetrics-questionnaires` plugin provides a unified, extensible runtime for LifeMetrics health, wellness, and lifestyle self-assessments inside WordPress.

### Invariants
1. **Configuration as Data**: Questionnaire content, questions, answer scales, dimension definitions, scoring ranges, result tiers, safety checks, and actions live in pure PHP declarative configurations.
2. **Server-Authoritative Authority**: Client scoring is advisory for immediate feedback only. WordPress recalculates all scores, normalizations, dimension profiles, safety triggers, and result tiers on the server before storage.
3. **No Database Burden / Direct Google Storage**: Submissions are transmitted via server-side HTTP webhook directly to a centralized Google Apps Script Web App writing to a Google Spreadsheet. No local custom database tables or admin storage configuration needed.
4. **Isolated PSS-10 Legacy Runtime**: Production PSS-10 remains served through `LifeMetrics_Legacy_PSS10_Runtime`. Its configuration can also be rendered by the standalone common preview for visual comparison without replacing the production runtime.
5. **Generic Shared Architecture**: All 9 LifeMetrics questionnaires share one renderer, stylesheet, and pair of client/server scoring engines.

---

## 2. Supported Questionnaire Inventory

| Questionnaire ID | Human Title | Questions | Range | Storage Worksheet | Mode |
|---|---|---|---|---|---|
| `pss10` | Échelle de Stress Perçu | 10 | 10–50 | `PSS10` | Frozen Legacy |
| `activite-physique` | Score LifeMetrics - Activité physique | 12 | 12–60 | `Activite_Physique` | Generic V2 (`review`) |
| `bien-etre` | Score LifeMetrics - Bien-être | 12 | 12–60 | `Bien_Etre` | Generic V2 (`review`) |
| `fatigue-recuperation` | Score LifeMetrics - Fatigue & récupération | 12 + 3 Safety | 12–60 | `Fatigue` | Generic V2 (`review`) |
| `hydratation` | Score LifeMetrics - Hydratation | 12 (1 avec N/A) + 3 Safety | 12–60 | `Hydratation` | Generic V2 (`review`) |
| `nutrition` | Score LifeMetrics - Nutrition | 12 + 3 Safety | 12–60 | `Nutrition` | Generic V2 (`review`) |
| `pieds-confort-postural` | Score LifeMetrics - Pieds & confort postural | 12 + 4 Safety | 12–60 | `Pieds_Confort` | Generic V2 (`review`) |
| `risque-nutritionnel` | Score LifeMetrics - Risque nutritionnel | 12 + 4 Safety | 12–60 | `Risque_Nutritionnel` | Generic V2 (`review`) |
| `sedentarite` | Score LifeMetrics - Sédentarité | 12 (2 avec N/A) | 12–60 | `Sedentarite` | Generic V2 (`review`) |
| `sommeil` | Score LifeMetrics - Sommeil | 12 + 3 Safety | 12–60 | `Sommeil` | Generic V2 (`review`) |

---

## 3. End-to-End Data Flow

```text
[ WordPress Shortcode ]
       |
       v
[ LifeMetrics_Shortcodes ]
       |
       +--- id="pss10" ------------> [ LifeMetrics_Legacy_PSS10_Runtime ]
       |                                       |
       |                                       v
       |                             (Render Legacy PSS10)
       |
       +--- id="<proprietary>" ----> [ LifeMetrics_Questionnaire_Registry ]
                                               |
                                               v
                                     [ LifeMetrics_Questionnaire_Renderer ]
                                               |
                                               v
                                     (Render Shared HTML + Config JSON)
                                               |
                                               v
                                     [ Browser Client JS Runtime ]
                                       - Interactive state & auto-advance
                                       - Instant local scoring engine
                                       - 25s fetch timeout & session_id
                                               |
                                               v
                                     [ WordPress REST Controller ]
                                       POST /wp-json/lifemetrics-questionnaires/v1/<id>/submit
                                               |
                                               v
                                     [ LifeMetrics_Questionnaire_Scoring_Engine ]
                                       - Authoritative score & normalization
                                       - Dimension scores & attention flags
                                       - Safety flags evaluation
                                               |
                                               v
                                     [ LifeMetrics_Submission_Service ]
                                       - Canonical JSON payload assembly
                                       - Endpoint resolution (central / legacy)
                                               |
                                               v
                                     [ LifeMetrics_Google_Apps_Script_Adapter ]
                                       - wp_remote_post / 302 redirect follow
                                               |
                                               v
                                     [ Google Apps Script Web App ]
                                       - Session deduplication (CacheService)
                                       - Sheet routing by questionnaire_id
                                               |
                                               v
                                     [ Central Google Spreadsheet ]
                                       - Append row to target worksheet
```

---

## 4. Component Responsibilities

### A. Plugin Bootstrap (`lifemetrics-questionnaires.php`, `class-lifemetrics-plugin.php`)
- Sets plugin constants (`LMQ_PLUGIN_PATH`, `LMQ_PLUGIN_URL`, `LMQ_GOOGLE_ENDPOINT`, `LMQ_PSS10_GOOGLE_ENDPOINT`).
- Initializes and injects dependencies once on WordPress boot.
- Registers WordPress shortcodes, script hooks, and REST API routes.

### B. Registry (`class-questionnaire-registry.php`)
- Maintains authoritative lookup for registered questionnaires.
- Differentiates `get_internal($id)` (used for explicit shortcodes and REST processing) from `get_public($id)` (used for public discovery; returns `null` while in `review`).

### C. Legacy PSS-10 Runtime (`class-legacy-pss10-runtime.php`)
- Self-contained renderer for PSS-10.
- Serves frozen legacy assets (`questionnaires/pss10/assets/`).
- Emits legacy PSS-10 DOM structure and handles legacy PSS-10 REST payload conversions.

### D. Generic Renderer & Assets (`class-questionnaire-renderer.php`, `class-assets.php`)
- Embeds questionnaire configuration into the page via secure `<script type="application/json">` elements.
- Enqueues shared styling (`questionnaire.css`) and script modules (`questionnaire-engine.js`, `questionnaire-ui.js`) with cache-busting `filemtime` timestamps.
- **UI Freeze Rule**: The frontend baseline is strictly frozen after commit `75dc058`. No visual or structural UI/UX changes permitted during Phases 14–16.

### E. REST Controller (`class-rest-controller.php`)
- Registers `POST /wp-json/lifemetrics-questionnaires/v1/<id>/submit`.
- Applies rate limiting, JSON format validation, and payload length guards.

### F. Scoring Engine (`class-questionnaire-scoring-engine.php`)
- Computes raw score, available capacity (accounting for N/A items), normalized final score, dimension metrics, attention flags, and safety triggers.
- JavaScript equivalent in `assets/js/questionnaire-engine.js` guarantees 100% parity for browser feedback.
- All nine LifeMetrics V2 questionnaires use a 12–60 normalized range with `lower_is_better`; PSS-10 keeps its isolated 10–50 `higher_is_worse` scale.
- Result colors resolve from the displayed category severity, independently of whether ranks are encoded as 0/1/2 or 1/2/3.
- Guardrails preserve the numeric score while changing only the displayed category. Favorable results expose a priority axis only for an available dimension whose mean is at least 2.50; intermediate and unfavorable results expose at most two.

### G. Submission Service & Upstream Adapter (`class-submission-service.php`, `class-google-apps-script-adapter.php`)
- Generates canonical submission payload with full audit metadata.
- Posts data securely to Google Apps Script via WordPress HTTP API, handling Google 302 redirects with SSL verification.

---

## 5. Security & Isolation Boundaries

- **Browser input is untrusted**: Only `answers`, `session_id`, and `completed_at` are accepted. Scores, levels, and dimension values submitted by clients are discarded and recomputed server-side.
- **Client cannot select destination**: The Google Sheet ID and worksheet tab are resolved strictly by the server and Google Apps Script.
- **Deduplication**: `session_id` UUID prevents double-counting across network retries.

---

## 6. Verification Status

- **Automated Tests**: 23 PHP test suites and 19 JavaScript test suites (all passing).
- **PSS-10 Characterization**: 13 mutation guards protecting the clinical baseline.
- **Shared Preview**: `preview.php` renders all nine LifeMetrics V2 questionnaires plus the PSS-10 configuration at desktop, tablet, and mobile widths without WordPress storage side effects.
- **Real Browser E2E**: Hydratation remains covered on live production WordPress (RC12); the standalone preview supports the full cross-questionnaire visual matrix.
