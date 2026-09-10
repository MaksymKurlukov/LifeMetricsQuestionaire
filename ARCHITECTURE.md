# LifeMetrics Questionnaires Architecture

Document version: 2.0.0
Status: `VERIFIED PRODUCTION ARCHITECTURE`
Last updated: 2026-09-10

## 1. System Purpose & Core Principles

The `lifemetrics-questionnaires` plugin provides a unified, extensible runtime for LifeMetrics health, wellness, and lifestyle self-assessments inside WordPress.

### Invariants
1. **Configuration as Data**: Questionnaire content, questions, answer scales, dimension definitions, scoring ranges, result tiers, safety checks, and actions live in pure PHP declarative configurations.
2. **Server-Authoritative Authority**: Client scoring is advisory for immediate feedback only. WordPress recalculates all scores, normalizations, dimension profiles, safety triggers, and result tiers on the server before storage.
3. **No Database Burden / Direct Google Storage**: Submissions are transmitted via server-side HTTP webhook directly to a centralized Google Apps Script Web App writing to a Google Spreadsheet. No local custom database tables or admin storage configuration needed.
4. **Frozen PSS-10 Clinical Legacy**: PSS-10 is isolated and preserved 100% intact through `LifeMetrics_Legacy_PSS10_Runtime` with zero behavioral or visual drift.
5. **Generic Shared Architecture**: All 7 proprietary questionnaires share a unified renderer, stylesheet, and client/server engine.

---

## 2. Supported Questionnaire Inventory

| Questionnaire ID | Human Title | Questions | Range | Storage Worksheet | Mode |
|---|---|---|---|---|---|
| `pss10` | Échelle de Stress Perçu | 10 | 10–50 | `PSS10` | Frozen Legacy |
| `sedentarite` | Score Sédentarité | 10 (2 with N/A) | 0–48 | `Sedentarite` | Generic |
| `hydratation` | Score Hydratation | 12 (1 with N/A) + 3 Safety | 0–48 | `Hydratation` | Generic |
| `fatigue-recuperation` | Score Fatigue & Récupération | 12 + 3 Safety | 0–48 | `Fatigue` | Generic |
| `sommeil` | Score Sommeil | 12 + 3 Safety | 0–48 | `Sommeil` | Generic |
| `nutrition` | Score Nutrition | 12 + 3 Safety | 0–48 | `Nutrition` | Generic |
| `activite-physique` | Score Activité Physique | 12 | 0–48 | `Activite_Physique` | Generic |
| `pieds-confort-postural` | Score Pieds & Confort Postural | 12 + 4 Safety | 0–48 | `Pieds_Confort` | Generic |

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

### E. REST Controller (`class-rest-controller.php`)
- Registers `POST /wp-json/lifemetrics-questionnaires/v1/<id>/submit`.
- Applies rate limiting, JSON format validation, and payload length guards.

### F. Scoring Engine (`class-questionnaire-scoring-engine.php`)
- Computes raw score, available capacity (accounting for N/A items), normalized final score, dimension metrics, attention flags, and safety triggers.
- JavaScript equivalent in `assets/js/questionnaire-engine.js` guarantees 100% parity for browser feedback.

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

- **Automated Tests**: 20 PHP test suites, 11 JavaScript test suites (all passing).
- **PSS-10 Characterization**: 13 mutation guards protecting the clinical baseline.
- **Real Browser E2E**: Fully verified for Hydratation on live production WordPress (RC12).
