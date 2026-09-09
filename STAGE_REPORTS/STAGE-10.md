# Stage 10: Proprietary Questionnaires Rollout

**Status:** IN_PROGRESS (3/7 Questionnaires Complete)
**Completion Date (Stage 10.3):** 2026-09-09

---

## 1. Rollout Progress Overview

| # | Questionnaire | ID | Status | Milestone Completed | Config Status |
|---|---|---|---|---|---|
| 1 | Sédentarité | `sedentarite` | **PASS** | 2026-09-09 (Stage 10.1) | `review` |
| 2 | Hydratation | `hydratation` | **PASS** | 2026-09-09 (Stage 10.2) | `review` |
| 3 | Fatigue & Récupération | `fatigue-recuperation` | **PASS** | 2026-09-09 (Stage 10.3) | `review` |
| 4 | Sommeil | `sommeil` | **NOT_STARTED** | Next (Stage 10.4) | `draft` |
| 5 | Nutrition | `nutrition` | **NOT_STARTED** | Pending | `draft` |
| 6 | Activité Physique | `activite-physique` | **NOT_STARTED** | Pending | `draft` |
| 7 | Pieds & Confort Postural | `pieds-confort-postural` | **NOT_STARTED** | Pending | `draft` |

---

## 2. Stage 10.3: Fatigue & Récupération Implementation Summary

### 2.1 Canonical Configuration (`questionnaires/fatigue-recuperation/questionnaire.php`)
- **Metadata**:
  - `schema_version`: `2.0.0`
  - `id`: `fatigue-recuperation`
  - `version`: `1.0.0`
  - `status`: `review`
  - `locale`: `fr-FR`
  - `title`: `Score LifeMetrics - Fatigue & récupération`
  - `seo_title`: `Auto-évaluation LifeMetrics - Comment récupérez-vous au quotidien ?`
  - `scoring_direction`: `higher_is_better`
  - `score`: `target_min: 0`, `target_max: 48`, `normalize_when_unavailable: false`, `rounding: half_up`
- **12 Scored Questions (FR01–FR12)**:
  - Exact verbatim French text, answer labels, and 0–4 scale points from `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Fatigue_Recuperation_V1.pdf`.
  - Reverse scoring properly defined on FR05, FR06, and FR10.
- **6 Dimensions (D1–D6)**:
  - `energie-recuperation-reveil`: FR01, FR02 (Max 8 pts, attention threshold <= 2)
  - `energie-fonctionnement-journee`: FR03, FR04 (Max 8 pts, attention threshold <= 2)
  - `retentissement-fatigue`: FR05, FR06 (Max 8 pts, attention threshold <= 2)
  - `recuperation-effort`: FR07, FR08 (Max 8 pts, attention threshold <= 2)
  - `efficacite-repos`: FR09, FR10 (Max 8 pts, attention threshold <= 2)
  - `stabilite-recuperation-globale`: FR11, FR12 (Max 8 pts, attention threshold <= 2)
- **Result Levels (0–48 Target Score)**:
  - 0–15: `FATIGUE_IMPORTANTE_RECUPERATION_INSUFFISANTE`
  - 16–27: `RECUPERATION_A_RENFORCER`
  - 28–38: `RECUPERATION_GLOBALEMENT_FAVORABLE`
  - 39–48: `TRES_BON_PROFIL_RECUPERATION`
- **Dimension Attention Rule**:
  - Automatically flags any dimension with score $\le 2/8$ as `attention === true` with descriptive point-of-attention messages without altering numeric score or calculated category.
- **Safety Questions (FRSF01, FRSF02, FRSF03)**:
  - `FRSF01`: Fatigue persistante malgré le repos
  - `FRSF02`: Retentissement important
  - `FRSF03`: Signes associés ou récupération anormalement difficile
  - Emit priority safety flag `FATIGUE_ATTENTION_MESSAGE` without mutating numeric scores or categories.
- **Result CTAs & Disclaimers**:
  - Configured for VitaScan and Metabolism Analytics with clear boundary separation between questionnaire self-evaluation and physiological measurements.

### 2.2 Plugin Registry Mapping (`includes/class-lifemetrics-plugin.php`)
- Added `'fatigue-recuperation' => 'fatigue-recuperation/questionnaire.php'` to `LifeMetrics_Questionnaire_Registry`.

### 2.3 Unit & Parity Test Suites
- **PHP Unit Test Suite (`tests/questionnaire-fatigue-recuperation.test.php`)**:
  - Schema 2.0.0 validation: PASS.
  - Boundary scores (0, 15, 16, 27, 28, 38, 39, 48): PASS.
  - Dimension attention trigger (threshold $\le 2/8$): PASS.
  - Safety questions score/category independence: PASS.
  - Authoritative synthetic profiles 1–7 from PDF: PASS.
  - Registry and submission service integration: PASS.
- **JavaScript Unit Test Suite (`tests/questionnaire-fatigue-recuperation.test.js`)**:
  - Scoring engine parity for boundaries, dimension attention, safety questions, and synthetic profiles: PASS.

---

## 3. Full Test Suite Matrix (22 Test Suites)

All 22 PHP and JavaScript test suites executed cleanly with 0 errors and 0 warnings.

---

## 4. Next Step
- **Stage 10.4**: Implement the next proprietary questionnaire in sequence: **Sommeil** (`sommeil`).
