# LifeMetrics Questionnaires Architecture

Document version: 2.2.0  
Status: `VERIFIED ARCHITECTURE & PHASE 16 QUALIFIED`  
Last updated: 16 septembre 2026  

---

## 1. System Purpose & Architectural Principles

The `lifemetrics-questionnaires` plugin provides a robust, dual-runtime questionnaire engine for LifeMetrics health, wellness, and lifestyle assessments within WordPress.

### Core Invariants
1. **Configuration as Declarative Data**: Questionnaire metadata, questions, answer scales, dimension definitions, scoring weights, category thresholds, safety checks, and actions are defined in declarative PHP configurations (`questionnaires/<id>/questionnaire.php`).
2. **Server-Authoritative Calculation**: Client-side scoring in JavaScript provides instant feedback for user experience. WordPress recalculates all raw scores, normalizations, dimension metrics, guardrails, and safety triggers on the server prior to storage. Client calculations are never trusted.
3. **Direct Google Sheets Storage via Webhooks**: Submissions are transmitted via server-side HTTP webhooks to Google Apps Script Web Apps writing directly to Google Sheets. No custom WordPress database tables or admin storage configurations are required.
4. **Isolated Dual-Runtime Architecture**: Production PSS-10 runs on an isolated, frozen legacy runtime to eliminate any clinical regression risk. The 9 proprietary LifeMetrics questionnaires run on a shared, scalable Generic V2 runtime.
5. **Strict Client Blindness**: The browser never controls spreadsheet IDs, sheet tab names, or calculation rules. All webhook endpoints remain server-side in WordPress constants.

---

## 2. Dual-Runtime System Architecture

The plugin implements two strictly isolated execution branches:

```text
                                  [ [lifemetrics_questionnaire id="..."] ]
                                                     │
                                                     ▼
                                          [ LifeMetrics_Shortcodes ]
                                                     │
                         ┌───────────────────────────┴───────────────────────────┐
                         │ (id === 'pss10')                                      │ (id in registry)
                         ▼                                                       ▼
           [ LifeMetrics_Legacy_PSS10_Runtime ]                [ LifeMetrics_Questionnaire_Renderer ]
                         │                                                       │
                         ▼                                                       ▼
            Legacy PSS-10 Template & Assets                         Generic V2 Template & Assets
             - pss10/template.php                                    - templates/questionnaire.php
             - pss10/assets/js/app.js                                - assets/js/questionnaire-ui.js
             - pss10/assets/css/style.css                            - assets/js/questionnaire-engine.js
             - 13 Mutation Guards                                    - assets/css/questionnaire.css
                         │                                                       │
                         ▼                                                       ▼
            REST: /pss10/submit                                     REST: /<id>/submit
                         │                                                       │
                         ▼                                                       ▼
            LMQ_PSS10_GOOGLE_ENDPOINT                               LMQ_GOOGLE_ENDPOINT
                         │                                                       │
                         ▼                                                       ▼
            backend/google-apps-script.gs                           backend/generic-google-apps-script.gs
                         │                                                       │
                         ▼                                                       ▼
            Google Sheets: [ PSS10 ]                                Google Sheets: [ 9 Proprietary Tabs ]
            (24 enriched columns)                                   (31 to 36 columns per tab)
```

### 2.1. Branch A: PSS-10 Frozen Legacy Runtime
- **Canonical ID**: `pss10`.
- **Runtime Class**: `LifeMetrics_Legacy_PSS10_Runtime` (`includes/class-legacy-pss10-runtime.php`).
- **Frontend Layer**: Isolated template (`questionnaires/pss10/template.php`), script (`questionnaires/pss10/assets/js/app.js`), and stylesheet (`questionnaires/pss10/assets/css/style.css`).
- **Clinical Characterization**: 10 items, 1–5 scale, reverse items Q4, Q5, Q7, Q8 ($6 - \text{valeur}$), scoring 10–50 (`higher_is_worse`), 3 historical severity tiers (10–20, 21–26, 27–50). Protected by 13 JavaScript characterization mutation guards.
- **Backend & Transport**: Dedicated REST endpoint `/pss10/submit` routing via `LMQ_PSS10_GOOGLE_ENDPOINT` to `backend/google-apps-script.gs`.
- **Storage**: Worksheet `PSS10` formatted in 24 enriched physical columns.
- **Architectural Boundary**: PSS-10 **does not** use `LifeMetrics_Questionnaire_Renderer`, nor `questionnaire-ui.js`, nor `questionnaire-engine.js`. Its isolation is a deliberate, permanent design decision.

### 2.2. Branch B: Generic V2 Runtime (9 Proprietary Questionnaires)
- **Canonical IDs**: `sedentarite`, `hydratation`, `fatigue-recuperation`, `sommeil`, `nutrition`, `activite-physique`, `pieds-confort-postural`, `risque-nutritionnel`, `bien-etre`.
- **Registry & Dispatch**: `LifeMetrics_Questionnaire_Registry` resolves configurations from `questionnaires/<id>/questionnaire.php`.
- **Frontend Layer**: Unified template (`templates/questionnaire.php`), controller (`assets/js/questionnaire-ui.js`), client engine (`assets/js/questionnaire-engine.js`), and stylesheet (`assets/css/questionnaire.css`).
- **Scoring Model**: 12 scored items per instrument, 1–5 scale, target score 12–60 (`lower_is_better`), 3 standardized categories (12–24 Favorable, 25–32 Intermédiaire, 33–60 Défavorable).
- **Clinical Safety & Guardrails**: Independent out-of-score Safety system and clinical guardrails that cap `displayed_category` to intermediate orange without altering numerical scores.
- **Backend & Transport**: Dynamic REST routes `/<id>/submit` processed by `LifeMetrics_Questionnaire_Scoring_Engine`, assembled by `LifeMetrics_Submission_Service`, and posted via `LifeMetrics_Google_Apps_Script_Adapter` through `LMQ_GOOGLE_ENDPOINT` to `backend/generic-google-apps-script.gs`.
- **Storage**: 9 dedicated worksheets (31 to 36 physical columns).

---

## 3. Supported Questionnaire Inventory & Storage Matrix

| # | Questionnaire ID | Human Title | Runtime | Scored Items | Range / Direction | Safety Items | N/A Support | Category Guardrail | Result Completion | Storage Tab | Phase 16 Status |
|---|---|---|---|:---:|:---:|:---:|:---:|:---:|---|---|:---:|
| 1 | `pss10` | Échelle de Stress Perçu (PSS-10) | Legacy PSS-10 | 10 | 10–50 / Higher worse | None | None | None | Partner pharmacies | `PSS10` (24 col) | QUALIFIED (10/10 PASS) |
| 2 | `sedentarite` | Score LifeMetrics - Sédentarité | Generic V2 | 12 | 12–60 / Lower better | None | SD07, SD08 | D1 $\ge$ 8 | Partner pharmacies | `Sedentarite` (31 col) | QUALIFIED (10/10 PASS) |
| 3 | `hydratation` | Score LifeMetrics - Hydratation | Generic V2 | 12 | 12–60 / Lower better | 3 | HY05 | None | VitaScan | `Hydratation` (35 col) | QUALIFIED (10/10 PASS) |
| 4 | `fatigue-recuperation` | Score LifeMetrics - Fatigue & récupération | Generic V2 | 12 | 12–60 / Lower better | 3 | None | None | Partner pharmacies | `Fatigue` (35 col) | QUALIFIED (10/10 PASS) |
| 5 | `sommeil` | Score LifeMetrics - Sommeil | Generic V2 | 12 | 12–60 / Lower better | 3 | None | None | Partner pharmacies | `Sommeil` (35 col) | QUALIFIED (10/10 PASS) |
| 6 | `nutrition` | Score LifeMetrics - Nutrition | Generic V2 | 12 | 12–60 / Lower better | 3 | None | None | VitaScan | `Nutrition` (35 col) | QUALIFIED (10/10 PASS) |
| 7 | `activite-physique` | Score LifeMetrics - Activité physique | Generic V2 | 12 | 12–60 / Lower better | None | None | None | VitaScan | `Activite_Physique` (31 col) | QUALIFIED (10/10 PASS) |
| 8 | `pieds-confort-postural` | Score LifeMetrics - Pieds & confort postural | Generic V2 | 12 | 12–60 / Lower better | 4 | None | PF09/10 $\ge$ 4 | Podos360 | `Pieds_Confort` (36 col) | QUALIFIED (10/10 PASS) |
| 9 | `risque-nutritionnel` | Score LifeMetrics - Risque nutritionnel | Generic V2 | 12 | 12–60 / Lower better | 4 | None | RN03/04/05/08 $\ge$ 4 | VitaScan | `Risque_Nutritionnel` (36 col) | QUALIFIED (10/10 PASS) |
| 10 | `bien-etre` | Score LifeMetrics - Bien-être | Generic V2 | 12 | 12–60 / Lower better | None | None | Dim. Moy. $\ge$ 4.00 | Partner pharmacies | `Bien_Etre` (31 col) | QUALIFIED (10/10 PASS) |

---

## 4. Shortcode Routing & Dispatching Logic

Questionnaires are rendered via the unified shortcode `[lifemetrics_questionnaire id="<id>"]`. The handler `LifeMetrics_Shortcodes::render()` evaluates:

1. **PSS-10 Legacy Branch (`id="pss10"`)**: Evaluates `if ($id === '' || $id === 'pss10')` and delegates to `LifeMetrics_Legacy_PSS10_Runtime::render_shortcode()`. Inside the legacy runtime, an explicit guard (`if (sanitize_key($attributes['id']) !== 'pss10') return '';`) ensures that an empty ID (`[lifemetrics_questionnaire]`) **returns an empty string (`''`)**. PSS-10 is rendered **strictly and exclusively** when `id="pss10"` is provided.
2. **Generic V2 Branch (`id="<proprietary-id>"`)**: For any registered proprietary ID, configuration is resolved via `LifeMetrics_Questionnaire_Registry::get_internal($id)`. If valid, it is passed to `LifeMetrics_Questionnaire_Renderer::render($config, $submit_url)`.
3. **Safe Fallback**: Any missing, empty, or unknown `id` returns an empty string (`''`) safely without throwing exceptions or rendering any default questionnaire.

---

## 5. Scoring, Normalization & Clinical Safety Architecture

### 5.1. PSS-10 Clinical Baseline
- 10 standardized items, answers rated 1 to 5.
- Reverse scoring applied to items Q4, Q5, Q7, Q8:
  $$\text{points} = 6 - \text{valeur}$$
- Raw sum produces final score between 10 and 50 (`higher_is_worse`).
- Categories: 10–20 (`low`), 21–26 (`medium`), 27–50 (`high`).

### 5.2. Proprietary V2 Scoring Model
- Exactly 12 scored items per questionnaire.
- Item weights range from 1 to 5 points.
- Score ranges from 12 to 60 points (`lower_is_better`).
- Standard 3-tier severity classification:
  - **12 to 24 points**: Favorable / Satisfaisant (Vert)
  - **25 to 32 points**: Intermédiaire / Fragile (Orange)
  - **33 to 60 points**: Défavorable / Insuffisant (Rouge)

### 5.3. Proportional N/A Normalization
Supported by two instruments for non-applicable life situations:
- `sedentarite`: SD07 (`na`: "Non concerné actuellement") and SD08 (`na`: "Très peu de déplacements actuellement").
- `hydratation`: HY05 (`na`: "Non concerné actuellement").

Formulation:
$$\text{final\_score} = \text{ROUND}\left(\frac{\text{raw\_score}}{\text{applicable\_question\_count}} \times 12\right)$$

- Dimension scores compute averages strictly over applicable items.
- If all questions within a dimension are answered N/A (e.g. SD07 + SD08), that dimension is **excluded** from analysis and priority ranking.
- N/A does not assign 0 points and does not introduce statistical bias.

### 5.4. Safety Alert System (Out-of-Score)
The Safety layer functions as an independent medical awareness mechanism:
- **Zero Impact on Scoring**: Does not alter `raw_score`, `final_score`, or `calculated_category`.
- **Distribution**: 3 questions on `hydratation`, `fatigue-recuperation`, `sommeil`, `nutrition`; 4 questions on `pieds-confort-postural`, `risque-nutritionnel`; 0 on `pss10`, `sedentarite`, `activite-physique`, `bien-etre`.
- **Presentation**: Clean, sober text alert banner titled *"Un point mérite votre attention."* without warning icons or emojis (⚠️ removed). Displayed above the detailed analysis.

### 5.5. Clinical Guardrails (Category Threshold Capping)
Guardrails protect users by adjusting the displayed risk level when specific clinical answers warrant vigilance:
- **Core Invariant**: **A guardrail never modifies the numerical score.**
- **Mechanism**: Evaluates `calculated_category` against clinical triggers. If the calculated category is green (favorable), `displayed_category` is elevated to orange (intermediate minimum). Guardrails never force red.
- **Triggers**:
  - `sedentarite`: Dimension 1 (`temps-sedentaire-quotidien` = SD01 + SD02) $\ge$ 8.
  - `pieds-confort-postural`: PF09 $\ge$ 4 OR PF10 $\ge$ 4.
  - `risque-nutritionnel`: RN03 $\ge$ 4 OR RN04 $\ge$ 4 OR RN05 $\ge$ 4 OR RN08 $\ge$ 4.
  - `bien-etre`: Any dimension mean $\ge$ 4.00 (elevates category to orange).
  - None: `pss10`, `hydratation`, `fatigue-recuperation`, `sommeil`, `nutrition`, `activite-physique`.
  *(Note UI: Separate dimensional attention cards « Point d'attention : <dimension> » are globally suppressed across all 9 Generic V2 questionnaires; dimensions are computed internally for analysis and guardrails).*

---

## 6. End-to-End Transport Pipeline & Storage

Submissions travel through a secure, unidirectional pipeline with server-side validation and dual Apps Script routing:

```text
[ Browser Client ]
       │  (1) POST raw answers, UUID session_id, completed_at
       ▼
[ WordPress REST Controller ]
  /wp-json/lifemetrics-questionnaires/v1/<id>/submit
       │
       ▼
[ Server Authority & Scoring Engine ]
  Recalculates raw score, applicable capacity, final score,
  dimension profiles, clinical guardrails, and safety flags
       │
       ▼
[ LifeMetrics_Submission_Service ]
  Assembles canonical tamper-resistant payload
       │
       ├─────────────────────────────────────────┐
       │ (id === 'pss10')                        │ (id !== 'pss10')
       ▼                                         ▼
[ LMQ_PSS10_GOOGLE_ENDPOINT ]             [ LMQ_GOOGLE_ENDPOINT ]
       │                                         │
       ▼                                         ▼
[ backend/google-apps-script.gs ]         [ backend/generic-google-apps-script.gs ]
  - PSS-10 legacy schema                    - Generic V2 dynamic schema
  - Deduplication (session_id)              - Deduplication (session_id)
       │                                         │
       ▼                                         ▼
[ Google Sheets: PSS10 ]                  [ Google Sheets: 9 Dedicated Tabs ]
  (24 columns enriched)                     - Sedentarite (31 col)
                                            - Hydratation (35 col)
                                            - Fatigue (35 col)
                                            - Sommeil (35 col)
                                            - Nutrition (35 col)
                                            - Activite_Physique (31 col)
                                            - Pieds_Confort (36 col)
                                            - Risque_Nutritionnel (36 col)
                                            - Bien_Etre (31 col)
```

### Security & Integrity Controls
- **Untrusted Client Data**: Scores, categories, and dimension calculations submitted by clients are completely discarded.
- **Server Authority**: The server re-evaluates all results using canonical configs before dispatching the payload.
- **Destination Isolation**: Client scripts have zero access to spreadsheet keys, sheet names, or webhook secrets.
- **Deduplication**: UUID v4 `session_id` cached in Google Apps Script `CacheService` prevents double-insertion on network retries.

---

## 7. Frontend Result Presentation & Completion Mapping

The result screen presents a coherent, streamlined user experience:

```text
Mon résultat
  ├── Catégorie de résultat (Badge sémantique : displayed_category)
  ├── Jauge semi-circulaire SVG (Gradient continu vert → orange → rouge + marqueur de score numérique)
  │
  ├── [ Safety Alert ] (Uniquement si déclenché — "Un point mérite votre attention.")
  │
  ├── [ Accordéon Analyse détaillée ] (Lire / Masquer l'analyse détaillée)
  │     ├── Texte d'interprétation clinique principal
  │     ├── Analyse dimensionnelle qualitative
  │     └── [ Texte complémentaire ] (.analysis-completion — Dernier paragraphe intégré)
  │
  ├── [ Bouton CTA Principal ] ("Je veux faire un bilan" -> /formulaire-bilan/)
  ├── [ Bouton CTA Secondaire ] ("Découvrir les autres questionnaires" -> /tests-sante/)
  └── [ Bouton Tertiaire ] ("Refaire le test")
```

### Score Gauge Architecture & Guardrail Decoupling
- **Full Semicircle Continuous Gradient**: The gauge track is rendered as a complete semicircular SVG arc (`gauge-track`, $R=80$) painted with a continuous `linearGradient` transitioning smoothly from green (`#4ade80`) through orange (`#fbbf24`) to red (`#ef4444`). There is no inactive grey remainder or artificial progress masking.
- **Dynamic Threshold Alignment**: Color stop offsets in `<linearGradient>` are calculated dynamically at runtime from `config.result_levels` via `resolveGaugeGradientStops()`. The circular arc progress is mapped to horizontal gradient coordinates ($x = 100 + 80 \cos(\pi(1 - \text{ratio}))$, offset $= (x - 20) / 160$), ensuring exact color transitions at configured business thresholds (e.g. 25 and 33 on the 12–60 scale).
- **Numerical Score Marker**: A discrete circular marker (`gauge-marker`) is positioned on the arc strictly based on the real numerical score:
  $$\text{scoreRatio} = \frac{\text{final\_score} - \text{target\_min}}{\text{target\_max} - \text{target\_min}}$$
- **Intentional Guardrail Decoupling**:
  - The gauge marker represents the **raw numerical score** on the scale.
  - The category badge (`result-badge`) reflects the **`displayed_category`**, which may be capped by a clinical guardrail.
  - For example, when a guardrail triggers on favorable overall points (e.g. in `sedentarite`, `pieds-confort-postural`, `risque-nutritionnel`, or `bien-etre`):
    - The score marker remains positioned in the **green zone** of the gauge (truthful representation of the numerical score);
    - The category badge displays the **orange category** (`intermediate` / capped level).
  - This decoupling is strictly by design: the visual gauge preserves mathematical honesty, while the badge communicates the required clinical vigilance.

### Global Suppression of Attention Cards
- Intermediate dimensional cards (*« Point d'attention : <dimension> »*) are **globally suppressed** from the frontend UI across all 9 Generic V2 questionnaires.
- Dimension scores are still computed internally by the scoring engines (client and server) and feed the qualitative detailed analysis, completion recommendations, and guardrails without generating separate UI card blocks.
- **Safety Distinction**: The discrete Safety alert banner (*« Un point mérite votre attention. »*) remains entirely active and separate from dimensional attention cards, triggering strictly on configured safety items without icons or scoring impact.

### Contextual Completion Mapping (`result_completion`)
The completion text is integrated directly as the **final paragraph inside the detailed analysis accordion** (`.analysis-completion`), without a separate card or visible title:

1. **VitaScan** (Objective body composition, muscle mass, hydration monitoring):
   - `hydratation`
   - `nutrition`
   - `activite-physique`
   - `risque-nutritionnel`
2. **Podos360** (Instrumental postural and plantar pressure analysis):
   - `pieds-confort-postural`
3. **LifeMetrics Partner Pharmacies** (Neutral guidance for pharmacy health checkups):
   - `pss10`
   - `sedentarite`
   - `fatigue-recuperation`
   - `sommeil`
   - `bien-etre`

---

## 8. Local Development & Preview Tool

A standalone preview utility is provided at `preview.php`:
- Dedicated to rapid local iteration and UI validation for the **9 proprietary questionnaires** running on the generic runtime.
- Operates independently from WordPress and simulates client scoring and UI rendering across viewport sizes.
- **PSS-10 is excluded** from `preview.php` as it operates exclusively through its dedicated legacy runtime.
- **Release Invariant**: `preview.php` is strictly a development tool and is automatically excluded from production ZIP packages.

---

## 9. UI Stability & Phase 16 Refinements

While major structural redesigns were frozen to preserve system stability, targeted Phase 16 UX refinements were validated:
1. **Focus Outline Elimination**: Suppressed theme-induced blue/red focus halos on interactive options.
2. **Clean Safety Presentation**: Replaced warning icon ⚠️ with a clean, text-only alert title (*« Un point mérite votre attention. »*).
3. **Analysis Accordion Integration**: Integrated the completion text as the final paragraph inside the detailed analysis accordion.
4. **Continuous Threshold-Aligned Score Gauge (`7176816`)**: Restored a full semicircle continuous gradient dynamically derived from `result_levels` with an accurate score marker.
5. **Global Attention Card Suppression (`01ded12`)**: Unified result screen layout across all 9 Generic V2 questionnaires by suppressing separate dimensional attention cards.

---

## 10. Verification & Release Status

| Verification Scope | Status | Evidence |
|---|:---:|---|
| **PHP Automated Test Suites** | **PASS** | 23/23 PHP test suites passing (0 failures, 0 warnings). |
| **JavaScript Test Suites** | **PASS** | 19/19 JS test suites passing (including 13 PSS-10 characterization guards). |
| **Combined Coverage** | **PASS** | 42/42 test suites passing (100% automated coverage). |
| **WordPress LOCAL TEST (MAMP)** | **PASS** | Complete 10/10 questionnaires validated end-to-end: UI render, navigation, scoring, accordion analysis, REST HTTP 200, and verified insertion across all 10 Google Sheets tabs. |
| **Tamper Resistance** | **PASS** | Server authority overrides all spoofed client payloads. |
| **Production ZIP Audit** | **PASS** | Verified clean build (`lifemetrics-questionnaires.zip`) containing exactly 61 production files, zero test files, zero preview scripts, zero Git metadata. |
| **LifeMetrics Production Site** | **INTOUCHÉE** | Production environment remains 100% clean and untouched pending final review (WORK-23). |
