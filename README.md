# LifeMetrics Questionnaires

WordPress plugin providing a unified questionnaire runtime for LifeMetrics health, wellness, and lifestyle assessments.

---

## Supported Questionnaires

| Canonical ID | Questionnaire Name | Target Score Range | Scoring Direction | Target Storage Tab | Status |
|---|---|---|---|---|---|
| `pss10` | Échelle de Stress Perçu (PSS-10) | 10 – 50 | Higher is worse | `PSS10` | `review` (Frozen Legacy) |
| `sedentarite` | Score Sédentarité | 0 – 48 | Higher is better | `Sedentarite` | `review` |
| `hydratation` | Score Hydratation | 0 – 48 | Higher is better | `Hydratation` | `review` |
| `fatigue-recuperation` | Score Fatigue & Récupération | 0 – 48 | Higher is better | `Fatigue` | `review` |
| `sommeil` | Score Sommeil | 0 – 48 | Higher is better | `Sommeil` | `review` |
| `nutrition` | Score Nutrition | 0 – 48 | Higher is better | `Nutrition` | `review` |
| `activite-physique` | Score Activité Physique | 0 – 48 | Higher is better | `Activite_Physique` | `review` |
| `pieds-confort-postural` | Score Pieds & Confort Postural | 0 – 48 | Higher is better | `Pieds_Confort` | `review` |

---

## Lifecycle Model

Each questionnaire configuration declares a lifecycle `status`:
- `review`: Questionnaire is under editorial, scientific, or clinical review. Excluded from public discovery (`get_public()` returns `null`). Can be rendered explicitly via WordPress shortcode for testing and validation.
- `ready` / `published`: Fully approved and eligible for public discovery and listing.

> [!NOTE]
> Explicit shortcode rendering for testing must NOT be confused with public publication. All 7 proprietary questionnaires remain in `review` status during development and testing.

---

## WordPress Shortcode

Use the unified shortcode on any WordPress page or post:

```text
[lifemetrics_questionnaire id="<questionnaire-id>"]
```

### Routing Behavior
- `id="pss10"` (or empty `id`): Routes directly to `LifeMetrics_Legacy_PSS10_Runtime` to execute the frozen legacy PSS-10 experience.
- `id="<proprietary-id>"`: Resolves configuration via `LifeMetrics_Questionnaire_Registry` and renders via `LifeMetrics_Questionnaire_Renderer` using shared generic assets (`questionnaire.css`, `questionnaire-engine.js`, `questionnaire-ui.js`).
- Unknown `id`: Safely returns an empty string without throwing errors or leaking information.

---

## Frontend Architecture

The generic questionnaire frontend is structured around 3 sequential views:

1. **Intro Screen**:
   - Title, description, and metadata badges (duration, questions count, target population, recall period).
   - "COMMENCER" start button.
   - "En savoir plus" modal link with structured methodology explanations.

2. **Question Screen**:
   - Dynamic progress indicator (`Question X sur Y`) and visual progress bar.
   - Question text and optional contextual help.
   - Vertical answer cards with hover/focus states and keyboard accessibility.
   - Declarative N/A option handling (`applicable: false`).
   - Safety questions (if configured) with immediate clinical disclaimer flags.
   - Back navigation button (`Retour`) with preserved state.
   - Automatic smooth advance (400ms delay) on answer selection.

3. **Result Screen**:
   - SVG circular gauge visualization with dynamic needle animation.
   - Numerical score display (`X / Y`) and category badge.
   - Detailed interpretation title and clinical analysis text.
   - Dimension analysis breakdowns (progress bars, percentages, attention flags).
   - Prominent safety alerts (rendered before recommendations if safety questions are flagged).
   - Configurable Call to Action (CTA) buttons (e.g. VitaScan, Podos360, Metabolism Analytics).
   - "Refaire le test" restart button.
   - Non-intrusive save error banner with idempotent "Réessayer" retry button.

### Client-Side Mechanics
- **Immediate UI Feedback**: Instant client-side scoring via `assets/js/questionnaire-engine.js`.
- **Silent Asynchronous Submission**: Submits payload to WordPress REST API using `fetch` with 25s timeout and `credentials: 'same-origin'`.
- **Session Tracking & Idempotency**: A unique UUID v4 `session_id` is generated at test start and preserved across retry attempts to guarantee deduplication.

---

## Backend Architecture & Security Boundaries

```
[Browser Client]
       │  (1) POST answers + session_id
       ▼
[WordPress REST Controller]
  /wp-json/lifemetrics-questionnaires/v1/<id>/submit
       │
       ▼
[Questionnaire Registry] ──> loads canonical configuration
       │
       ▼
[Server Scoring Engine] ──> Authoritative recalculation of score,
       │                    categories, dimensions, and safety flags
       ▼
[Submission Service] ──> Builds canonical tamper-resistant payload
       │
       ▼
[Google Apps Script Adapter] ──> wp_remote_post with SSL verification
       │
       ▼
[Google Apps Script Web App] ──> Validates schema & deduplicates session_id
       │
       ▼
[Google Sheets Spreadsheet] ──> Appends row to questionnaire tab
```

### Security & Authority Invariants
1. **Raw Input Only**: The browser sends only question answers, `session_id`, and client timestamp.
2. **Server-Authoritative Calculation**: Browser-calculated scores and categories are never trusted. WordPress recalculates all scores, category thresholds, dimension percentages, and safety flags on the server.
3. **No Sheet Selection by Client**: The client never provides or controls worksheet tab names. Tab mapping is handled strictly by Google Apps Script based on the server-authenticated `questionnaire_id`.
4. **Isolated Endpoints**: Google Apps Script endpoints are stored server-side in WordPress constants (`LMQ_GOOGLE_ENDPOINT`, `LMQ_PSS10_GOOGLE_ENDPOINT`) and are never exposed to client-side scripts.

---

## PSS-10 Frozen Legacy Compatibility

PSS-10 is the clinical reference benchmark for the LifeMetrics platform:
- Implemented via `LifeMetrics_Legacy_PSS10_Runtime` in `questionnaires/pss10/`.
- Protected by 13 characterization mutation guards and automated regression test suites.
- Preserves dedicated styling, exact scoring rules, and independent storage endpoint.

---

## Current Verification State

| Verification Level | Target | Status | Notes |
|---|---|---|---|
| **Automated Unit & Parity** | All 8 Questionnaires | **PASS** | 20 PHP test suites, 11 JS test suites passing (0 failures). |
| **Tamper Resistance** | All 8 Questionnaires | **PASS** | Verified that malicious client payloads are overridden by server authority. |
| **Backend Storage E2E** | All 8 Questionnaires | **PASS** | Real Google Apps Script webhook writes verified for all 8 worksheets. |
| **Real Browser E2E** | `hydratation` | **PASS** | Verified on live WordPress: Intro ➔ Questions ➔ Results ➔ REST ➔ Google Apps Script ➔ Google Sheets. |
| **PSS10 Regression** | `pss10` | **PASS** | Verified 100% intact with 13 mutation guards and responsive visual tests. |

---

## Build & Deployment

To build a clean release ZIP for WordPress installation:

```bash
bash scripts/build-release-zip.sh lifemetrics-questionnaires-stage11-rc12.zip
```

Installation: Upload and activate `lifemetrics-questionnaires-stage11-rc12.zip` in WordPress Plugins. Zero manual database or `wp-config.php` configuration required.

---

## Next Phase: Questionnaire Content & Specification Review

The next phase is **not** public release, but an in-depth **specification and content review** of each proprietary questionnaire using PSS-10 as the structural reference model:
1. Introduction & user guidance wording
2. Clinical purpose & population context
3. Question clarity & answer scales
4. Scoring formulas & normalization rules
5. Result threshold categories & severity labels
6. Interpretation & analysis texts
7. Dimension breakdown presentation
8. Safety flags & disclaimer messaging
9. Call-to-action alignment
10. Historical tracking & comparison readiness
