# Stage 10: Proprietary Questionnaires Rollout

**Status:** IN_PROGRESS (2/7 Questionnaires Complete)
**Completion Date (Stage 10.2):** 2026-09-09

---

## 1. Rollout Progress Overview

| # | Questionnaire | ID | Status | Milestone Completed | Config Status |
|---|---|---|---|---|---|
| 1 | Sédentarité | `sedentarite` | **PASS** | 2026-09-09 (Stage 10.1) | `review` |
| 2 | Hydratation | `hydratation` | **PASS** | 2026-09-09 (Stage 10.2) | `review` |
| 3 | Fatigue & Récupération | `fatigue-recuperation` | **NOT_STARTED** | Next (Stage 10.3) | `draft` |
| 4 | Sommeil | `sommeil` | **NOT_STARTED** | Pending | `draft` |
| 5 | Nutrition | `nutrition` | **NOT_STARTED** | Pending | `draft` |
| 6 | Activité Physique | `activite-physique` | **NOT_STARTED** | Pending | `draft` |
| 7 | Pieds & Confort Postural | `pieds-confort-postural` | **NOT_STARTED** | Pending | `draft` |

---

## 2. Stage 10.2: Hydratation Implementation Summary

### 2.1 Canonical Configuration (`questionnaires/hydratation/questionnaire.php`)
- **Metadata**:
  - `schema_version`: `2.0.0`
  - `id`: `hydratation`
  - `version`: `1.0.0`
  - `status`: `review`
  - `locale`: `fr-FR`
  - `title`: `Score LifeMetrics - Hydratation`
  - `seo_title`: `Auto-évaluation LifeMetrics - Vos habitudes d'hydratation sont-elles adaptées ?`
  - `scoring_direction`: `higher_is_better`
  - `score`: `target_min: 0`, `target_max: 48`, `normalize_when_unavailable: true`, `rounding: half_up`
- **12 Scored Questions (HY01–HY12)**:
  - Exact verbatim French text, answer labels, and 0–4 scale points from `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Hydratation_V1.pdf`.
  - `HY05` supports `value: 'na'`, `points: null`, `applicable: false` for respondents without significant physical activity.
- **6 Dimensions (D1–D6)**:
  - `place-eau` (Place de l'eau): HY01, HY02 (Max 8 pts)
  - `repartition-hydratation` (Répartition de l'hydratation): HY03, HY04 (Max 8 pts)
  - `adaptation-activite-chaleur` (Adaptation à l'activité et à la chaleur): HY05, HY06 (Max 8 pts, or 4 pts when HY05 is N/A)
  - `choix-boissons` (Choix des boissons): HY07, HY08 (Max 8 pts)
  - `alimentation-environnement` (Alimentation et environnement): HY09, HY10 (Max 8 pts)
  - `anticipation-regularite` (Anticipation et régularité): HY11, HY12 (Max 8 pts)
- **Result Levels (0–48 Target Score)**:
  - 0–15: `HABITUDES_HYDRATATION_INSUFFISANTES`
  - 16–27: `HYDRATATION_A_RENFORCER`
  - 28–38: `HABITUDES_HYDRATATION_FAVORABLES`
  - 39–48: `TRES_BONNES_HABITUDES_HYDRATATION`
- **Safety Questions (HYSF01, HYSF02, HYSF03)**:
  - `HYSF01`: Restriction ou adaptation médicale des liquides
  - `HYSF02`: Pertes hydriques inhabituelles
  - `HYSF03`: Signes nécessitant une attention particulière
  - Emit priority safety flag `HYDRATION_ATTENTION_MESSAGE` without mutating numeric scores or categories.
- **N/A Normalization Validation**:
  - `HY05 = na`: 44/44 available raw capacity normalizes strictly to 48/48.
  - Partial non-integer scores verified against `half_up` rounding.
- **Result CTAs & Disclaimers**:
  - Configured for VitaScan LifeMetrics with strict separation between declared questionnaire habits and clinical body measurements.

### 2.2 Plugin Registry Mapping (`includes/class-lifemetrics-plugin.php`)
- Added `'hydratation' => 'hydratation/questionnaire.php'` to `LifeMetrics_Questionnaire_Registry`.
- Aligned Submission Service payload keys with scoring engine output.

### 2.3 Unit & Parity Test Suites
- **PHP Unit Test Suite (`tests/questionnaire-hydratation.test.php`)**:
  - Schema 2.0.0 validation: PASS.
  - Boundary scores (0, 15, 16, 27, 28, 38, 39, 48): PASS.
  - HY05 N/A normalization (44/44 -> 48, partial rounding): PASS.
  - Safety questions score/category independence: PASS.
  - Authoritative synthetic profiles 1–5 from PDF: PASS.
  - Registry and submission service integration: PASS.
- **JavaScript Unit Test Suite (`tests/questionnaire-hydratation.test.js`)**:
  - Scoring engine parity for boundaries, N/A normalization, safety questions, and synthetic profiles: PASS.

---

## 3. Full Test Suite Matrix (20 Test Suites)

All 20 PHP and JavaScript test suites executed cleanly with 0 errors and 0 warnings.

---

## 4. Next Step
- **Stage 10.3**: Implement the next proprietary questionnaire in sequence: **Fatigue & Récupération** (`fatigue-recuperation`).
