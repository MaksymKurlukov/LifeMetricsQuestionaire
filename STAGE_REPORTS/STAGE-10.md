# Stage 10: Proprietary Questionnaires Rollout

**Status:** IN_PROGRESS (4/7 Questionnaires Complete)
**Completion Date (Stage 10.4):** 2026-09-09

---

## 1. Rollout Progress Overview

| # | Questionnaire | ID | Status | Milestone Completed | Config Status |
|---|---|---|---|---|---|
| 1 | Sédentarité | `sedentarite` | **PASS** | 2026-09-09 (Stage 10.1) | `review` |
| 2 | Hydratation | `hydratation` | **PASS** | 2026-09-09 (Stage 10.2) | `review` |
| 3 | Fatigue & Récupération | `fatigue-recuperation` | **PASS** | 2026-09-09 (Stage 10.3) | `review` |
| 4 | Sommeil | `sommeil` | **PASS** | 2026-09-09 (Stage 10.4) | `review` |
| 5 | Nutrition | `nutrition` | **NOT_STARTED** | Next (Stage 10.5) | `draft` |
| 6 | Activité Physique | `activite-physique` | **NOT_STARTED** | Pending | `draft` |
| 7 | Pieds & Confort Postural | `pieds-confort-postural` | **NOT_STARTED** | Pending | `draft` |

---

## 2. Stage 10.4: Sommeil Implementation Summary

### 2.1 Canonical Configuration (`questionnaires/sommeil/questionnaire.php`)
- **Metadata**:
  - `schema_version`: `2.0.0`
  - `id`: `sommeil`
  - `version`: `1.0.0`
  - `status`: `review`
  - `locale`: `fr-FR`
  - `title`: `Score LifeMetrics - Sommeil`
  - `seo_title`: `Auto-évaluation LifeMetrics - Quelle est la qualité de votre sommeil ?`
  - `description`: `Évaluer le profil global du sommeil : suffisance, continuité, régularité, récupération et retentissement diurne.`
  - `scoring_direction`: `higher_is_better`
  - `score`: `target_min: 0`, `target_max: 48`, `normalize_when_unavailable: false`, `rounding: half_up`
- **12 Scored Questions (SL01–SL12)**:
  - Exact verbatim French text, answer labels, and points from `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Sommeil_V1.pdf`.
  - Non-linear scoring on Q1 (SL01): `< 5 h` = 0 pts, `5 h à moins de 6 h` = 1 pt, `6 h à moins de 7 h` = 2 pts, `7 h à 9 h` = 4 pts (max), `Plus de 9 h` = 3 pts.
- **5 Dimensions (D1–D5)**:
  - `duree-suffisance`: SL01, SL02 (Max 8 pts)
  - `endormissement-continuite`: SL03, SL04, SL05 (Max 12 pts)
  - `regularite-rythme`: SL06, SL07 (Max 8 pts)
  - `recuperation-fonctionnement-diurne`: SL08, SL09, SL10 (Max 12 pts)
  - `habitudes-favorables`: SL11, SL12 (Max 8 pts)
  - Total Capacity: $8 + 12 + 8 + 12 + 8 = 48$ points.
- **Result Levels (0–48 Target Score)**:
  - 0–15: `SOMMEIL_TRES_PERTURBE`
  - 16–27: `SOMMEIL_A_AMELIORER`
  - 28–38: `SOMMEIL_GLOBALEMENT_SATISFAISANT`
  - 39–48: `SOMMEIL_FAVORABLE`
- **Safety Questions (SLSF01, SLSF02, SLSF03)**:
  - `SLSF01`: Respiration nocturne (Non / Je ne sais pas / Oui)
  - `SLSF02`: Somnolence dangereuse (Non / Oui)
  - `SLSF03`: Retentissement persistant (Non / Oui)
  - Emit priority safety flag `HEALTH_ATTENTION_MESSAGE` without mutating numeric score or calculated category.
- **Result CTAs & Disclaimers**:
  - Primary CTA: `Découvrir le bilan VitaScan` (`/vitascan/`, `enabled: true`), matching Page 9 of the PDF.
  - Secondary CTA: `Découvrir les autres tests` (`/tests-sante/`, `enabled: false`, pending publication approval).

### 2.2 Plugin Registry Mapping (`includes/class-lifemetrics-plugin.php`)
- Added `'sommeil' => 'sommeil/questionnaire.php'` to `LifeMetrics_Questionnaire_Registry`.

### 2.3 Unit & Parity Test Suites
- **PHP Unit Test Suite (`tests/questionnaire-sommeil.test.php`)**:
  - Schema 2.0.0 validation: PASS.
  - Non-linear Q1 scoring verification: PASS.
  - Boundary scores (0, 15, 16, 27, 28, 38, 39, 48): PASS.
  - 5 dimensions with capacities 8/12/8/12/8: PASS.
  - Safety questions score/category independence: PASS.
  - Registry and submission service integration: PASS.
- **JavaScript Unit Test Suite (`tests/questionnaire-sommeil.test.js`)**:
  - Dynamic canonical loading via PHP CLI bridge: PASS.
  - Parity guard and scoring engine equality across all boundaries and options: PASS.

---

## 3. Full Test Suite Matrix (24 Test Suites)

All 14 PHP and 10 JavaScript test suites executed cleanly with 0 errors and 0 warnings.

---

## 4. Next Step
- **Stage 10.5**: Implement the next proprietary questionnaire in sequence: **Nutrition** (`nutrition`).
