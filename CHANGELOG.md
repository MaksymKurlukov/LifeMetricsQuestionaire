# Changelog

All notable LifeMetrics Questionnaires plugin/project changes are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Generic V2 UI Refinements & Gauge Threshold Alignment (2026-09-16 / 2026-09-17)

- **Threshold-Aligned Continuous Score Gauge (`7176816`)**:
  - Detected and corrected a visual desynchronization where static gradient stops did not correspond to business category thresholds on Generic V2 questionnaires (causing intermediate scores like 28/60 or 35/60 to display inaccurate color hues).
  - Initial fix (`bec9599`) and subsequent layout refinement (`01ded12`) consolidated in final commit `7176816`:
    - Full semicircle gauge track rendered with a continuous SVG `linearGradient` transitioning smoothly from green (`#4ade80`) through orange (`#fbbf24`) to red (`#ef4444`).
    - Dynamic gradient stop offsets derived automatically at runtime from `config.result_levels`, mapping curved arc progress to horizontal gradient coordinates with zero hardcoded tier assumptions.
    - Discrete circular score marker (`gauge-marker`) accurately positioned on the arc based on the authoritative numerical score.
    - Elimination of any inactive grey remainder or artificial progress masking.
- **Global Suppression of Attention Cards (`01ded12`)**:
  - Globally removed intermediate dimensional cards (*« Point d'attention : <dimension> »*) across all 9 Generic V2 questionnaires, establishing a uniform and focused result presentation.
  - Preserved internal dimension score evaluation for qualitative detailed analysis, completion guidance, and server payloads.
- **Safety Alert Independence & Preservation**:
  - Reaffirmed that the discrete Safety alert banner (*« Un point mérite votre attention. »*) remains active, sober, and independent on the 6 configured questionnaires, completely unaffected by the removal of dimensional attention cards.

### Phase 16 / WORK-22 — WordPress Local Qualification, UX Refinements & Canonical Release (2026-09-16)

- **WordPress LOCAL TEST (MAMP) Qualification**:
  - Validated all 10/10 questionnaires end-to-end on an isolated WordPress local environment running under MAMP.
  - Verified complete user journeys: introduction screens, question navigation, auto-advance, client-side scoring, detailed analysis accordion expansion, REST HTTP 200 persistence, and deduplication (`session_id`).
  - Verified upstream data delivery to Google Sheets: live webhook write confirmed across all 10 dedicated tabs (`PSS10` + 9 proprietary worksheets).
  - **Environment boundary**: The live LifeMetrics production site remained 100% clean and untouched throughout qualification, reserved for final delivery in WORK-23.
- **Targeted UX & Accessibility Refinements**:
  - *Focus outline normalization*: Eliminated theme-induced red/blue focus outlines on interactive option cards inherited from the WordPress Twenty Twenty-Five theme, while strictly preserving `:focus-visible` for keyboard accessibility.
  - *Safety block redesign*: Removed the warning icon ⚠️ and all emojis; established a standardized, sober text-only alert title (*« Un point mérite votre attention. »*) with empathetic copy positioned above the detailed analysis accordion.
  - *Detailed analysis completion integration*: Integrated the complementary evaluation text directly as the final paragraph inside the detailed analysis accordion (`.analysis-completion`), eliminating separate visible cards and standalone titles.
  - *Vigilance cards visual suppression*: Hid intermediate "Point de vigilance" cards on `risque-nutritionnel` (`display: none`) to route directly from Safety to detailed analysis, while maintaining server guardrail logic intact (subsequently generalized globally to all 9 Generic V2 questionnaires in `01ded12`).
- **Contextual Completion Mapping**:
  - **VitaScan** (4 questionnaires): `hydratation`, `nutrition`, `activite-physique`, `risque-nutritionnel`.
  - **Podos360** (1 questionnaire): `pieds-confort-postural`.
  - **LifeMetrics Partner Pharmacies** (5 questionnaires, neutral): `pss10`, `sedentarite`, `fatigue-recuperation`, `sommeil`, `bien-etre`.
- **Dual-Backend Transport Architecture**:
  - *Branch A (PSS-10 Legacy)*: Dispatches via server constant `LMQ_PSS10_GOOGLE_ENDPOINT` to `backend/google-apps-script.gs`, writing 24 enriched columns into the `PSS10` tab.
  - *Branch B (Generic V2)*: Dispatches via server constant `LMQ_GOOGLE_ENDPOINT` to `backend/generic-google-apps-script.gs`, dynamically routing payloads to 9 dedicated worksheets (31 to 36 columns).
- **Canonical Release Packaging & Audit**:
  - Built canonical release package `lifemetrics-questionnaires.zip` via `bash scripts/build-release-zip.sh lifemetrics-questionnaires.zip`.
  - Executed automated release audit (`php lifemetrics-questionnaires/tests/stage11-release-audit.test.php`): **PASS**.
  - Verified package invariants: archive contains exactly 61 production files with strict exclusion of `preview.php`, `tests/`, `scripts/`, `.git*`, temporary backups, and `.DS_Store`.

---

### Phase 15 — Full Automated Regression & Mutation Guard Verification

- Executed full automated test matrix across PHP and JavaScript test suites:
  - **23/23 PHP test suites PASS** (0 errors, 0 warnings).
  - **19/19 JavaScript test suites PASS** (0 errors, 0 warnings).
  - **42/42 total test suites PASS** (100% automated test coverage).
- Verified 13 characterization mutation guards protecting the baseline of questionnaire PSS-10 legacy against frontend regressions.
- Confirmed full mathematical parity between client JavaScript calculation (`questionnaire-engine.js`) and authoritative server PHP calculation (`class-questionnaire-scoring-engine.php`).

---

### WORK-20 — Release Safety & Local Preview Tool Hardening

- Hardened the standalone local development utility `preview.php`:
  - Restricted preview capability strictly to the 9 proprietary V2 questionnaires.
  - Completely removed/disabled PSS-10 from the generic preview tool, establishing that PSS-10 runs exclusively via its dedicated legacy runtime.
  - Enforced strict packaging exclusions: `preview.php` and `tests/` are excluded from release archives.

---

### Phase 14 — Platform Expansion to 10 Questionnaires & 10 Storage Tabs

- Implemented and integrated the final two proprietary questionnaires under Schema 2.0.0:
  - `risque-nutritionnel`: 12 scored items, 4 Safety items, clinical guardrail capping favorable results to `RISQUE_A_SURVEILLER` on critical answers (RN03/04/05/08 $\ge$ 4).
  - `bien-etre`: 12 scored items, 6 dimensions, dimensional guardrail capping favorable results to `BIEN_ETRE_A_RENFORCER` if any dimension mean $\ge$ 4.00.
- Expanded platform scope from 8 to **10 validated questionnaires** (1 questionnaire PSS-10 legacy + 9 questionnaires propriétaires Generic V2).
- Expanded backend spreadsheet architecture from 8 to **10 dedicated Google Sheets tabs**:
  `PSS10`, `Sedentarite`, `Hydratation`, `Fatigue`, `Sommeil`, `Nutrition`, `Activite_Physique`, `Pieds_Confort`, `Risque_Nutritionnel`, `Bien_Etre`.
- *(Historical note: earlier mentions of 7 or 8 questionnaires/worksheets reflect prior project stages and are superseded by this 10-questionnaire milestone).*

---

### Phases 4–12 — Methodological Migration to Authoritative PDF Specifications (12–60 Scale)

- Reconciled all proprietary questionnaires with their authoritative source documents (`Score_LifeMetrics_*_V1.pdf`):
  - Standardized all proprietary instruments to exactly **12 scored questions** (items 01 to 12).
  - Migrated scoring scale from earlier developmental 0–48 prototypes to the uniform **12–60 points scale** (1–5 points per option).
  - Standardized scoring direction to **`lower_is_better`** across all 9 proprietary instruments.
  - Standardized result tiers into **3 categories**: Favorable (12–24 pts), Intermédiaire (25–32 pts), Défavorable (33–60 pts).
  - Established the independent **Safety alert system** (out-of-score clinical vigilance with zero impact on numerical scores).
  - Implemented proportional N/A normalization: $\text{final\_score} = \text{ROUND}\left(\frac{\text{raw\_score}}{\text{applicable\_questions}} \times 12\right)$ for `sedentarite` (SD07, SD08) and `hydratation` (HY05).
  - Implemented clinical category guardrails (`sedentarite`, `pieds-confort-postural`, `risque-nutritionnel`, `bien-etre`) that cap displayed severity without modifying the numerical score.

---

### Historical Stage 11 — Production Packaging Baseline & Tamper Resistance `[SUPERSEDED]`

> [!NOTE]
> *The candidate archive name `lifemetrics-questionnaires-stage11-rc1.zip` and the 8-questionnaire scope described in this stage were developmental milestones, later superseded by the 10-questionnaire canonical release `lifemetrics-questionnaires.zip` in Phase 16.*

- Built release candidate archive `lifemetrics-questionnaires-stage11-rc1.zip` with packaging script `scripts/build-release-zip.sh`.
- Added global tamper-resistance test suite `tests/global-tamper-resistance.test.php` proving server-side raw answer evaluation overrides client-submitted scores.
- Added release audit test suite `tests/stage11-release-audit.test.php`.
- Enhanced Google Sheets storage format: transitioned to deterministic, human-readable column headers across proprietary worksheets.

---

### Historical Stage 10.1–10.7 — Initial 7 Proprietary Questionnaires Implementation (0–48 Scale) `[SUPERSEDED]`

> [!NOTE]
> *The 0–48 scoring scale, 4-category classification, and specific boundary thresholds (0, 15, 16, 27, 28, 38, 39, 48) documented below were developmental prototypes. They were completely superseded during Phases 4–12 by the authoritative 12–60 scale, 3 categories, and `lower_is_better` methodology.*

- **Stage 10.7 (Pieds & Confort Postural)** `[SUPERSEDED]`: Implemented initial configuration `questionnaires/pieds-confort-postural/questionnaire.php` under Schema 2.0.0 prototype (0–48 scale, 6 dimensions of 8 pts, 4 safety questions).
- **Stage 10.6 (Activité Physique)** `[SUPERSEDED]`: Implemented initial configuration `questionnaires/activite-physique/questionnaire.php` (0–48 scale, 5 dimensions).
- **Stage 10.5 (Nutrition)** `[SUPERSEDED]`: Implemented initial configuration `questionnaires/nutrition/questionnaire.php` (0–48 scale, 6 dimensions, non-linear scoring).
- **Stage 10.4 (Sommeil)** `[SUPERSEDED]`: Implemented initial configuration `questionnaires/sommeil/questionnaire.php` (0–48 scale, 5 dimensions, 3 safety questions).
- **Stage 10.3 (Fatigue & Récupération)** `[SUPERSEDED]`: Implemented initial configuration `questionnaires/fatigue-recuperation/questionnaire.php` (0–48 scale, 6 dimensions, 3 safety questions).
- **Stage 10.2 (Hydratation)** `[SUPERSEDED]`: Implemented initial configuration `questionnaires/hydratation/questionnaire.php` (0–48 scale, N/A capacity normalization, 3 safety questions).
- **Stage 10.1 (Sédentarité)** `[SUPERSEDED]`: Implemented initial configuration `questionnaires/sedentarite/questionnaire.php` (0–48 scale, N/A normalization for SD07/SD08, D1 guardrail).

---

### Historical Stages 6–9 — PSS-10 Migration Exploration & Legacy Runtime Preservation `[SUPERSEDED / REVERTED]`

> [!NOTE]
> *An exploratory migration attempting to wire PSS-10 into the generic renderer and shared frontend runtime (`questionnaire-ui.js` / `questionnaire-engine.js`) was conducted during development. This direction was formally **superseded and reverted** to guarantee 100% non-regression on questionnaire PSS-10 legacy. The final production architecture strictly preserves `LifeMetrics_Legacy_PSS10_Runtime` with its dedicated template, styles, scripts, 13 mutation guards, and dedicated Google Apps Script backend.*

- **Stage 9 (Multi-Destination Backend Architecture)**: Implemented generic server-side submission transport routing (`class-submission-service.php`, `class-google-apps-script-adapter.php`, and `backend/generic-google-apps-script.gs`) supporting per-instrument constants and HTTPS 302 redirect handling.
- **Stage 8 (Isolated WordPress & PSS10 Validation)**: Verified WordPress runtime lifecycle and responsive browser simulation matrix tests.
- **Stage 7 (All-PDF Capability Audit)**: Audited PHP and JavaScript engines against complex scoring capabilities.
- **Stage 6 (Exploratory PSS10 Generic Wiring)** `[SUPERSEDED / REVERTED]`: Explored routing PSS-10 through `LifeMetrics_Questionnaire_Renderer` and the shared generic engine. Reverted in favor of permanent isolation in `LifeMetrics_Legacy_PSS10_Runtime`. PSS-10 storage was upgraded to 24 enriched physical columns in tab `PSS10` via `backend/google-apps-script.gs` while preserving the frozen legacy runtime.

---

### Stages 1–3 — Architectural Foundation, Bootstrap & Legacy Characterization

- **Stage 3.2**: Added questionnaire registry with in-directory path enforcement and fail-closed public lifecycle gate.
- **Stage 3.1**: Added dedicated shortcode controller (`LifeMetrics_Shortcodes`) and REST controller (`LifeMetrics_REST_Controller`).
- **Stage 2**: Added executable PSS-10 characterization test harness with golden fixtures, REST/markup checks, and 13 mutation guards.
- **Stage 1**: Approved modular component architecture, Schema 2.0.0 declarative contract, and foundational architectural decisions (DEC-001 through DEC-023).
- **Bootstrap**: Extracted plugin orchestration into `LifeMetrics_Plugin` under PHP 8.2+ requirements; resolved OVH/WordPress ContentService redirect flow (`1e8899c`).

---

## Baseline — 2026-09-03

- Recorded the original PSS10 WordPress plugin baseline at checkpoint `d816898` without changing source bytes.
- Baseline source-manifest SHA-256: `5206e7a4a4fff67661e21d2761fd3b2ea94f1a435f05bcd65376b844a6d3cdb9`.
