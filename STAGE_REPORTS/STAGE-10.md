# Stage 10: Proprietary Questionnaires Rollout

**Status:** IN_PROGRESS (5/7 Questionnaires Complete)  
**Completion Date (Stage 10.5):** 2026-09-09  

---

## 1. Rollout Progress Overview

| # | Questionnaire | ID | Status | Milestone Completed | Config Status |
|---|---|---|---|---|---|
| 1 | Sédentarité | `sedentarite` | **PASS** | 2026-09-09 (Stage 10.1) | `review` |
| 2 | Hydratation | `hydratation` | **PASS** | 2026-09-09 (Stage 10.2) | `review` |
| 3 | Fatigue & Récupération | `fatigue-recuperation` | **PASS** | 2026-09-09 (Stage 10.3) | `review` |
| 4 | Sommeil | `sommeil` | **PASS** | 2026-09-09 (Stage 10.4) | `review` |
| 5 | Nutrition | `nutrition` | **PASS** | 2026-09-09 (Stage 10.5) | `review` |
| 6 | Activité Physique | `activite-physique` | **NOT_STARTED** | Next (Stage 10.6) | `draft` |
| 7 | Pieds & Confort Postural | `pieds-confort-postural` | **NOT_STARTED** | Pending | `draft` |

---

## 2. Stage 10.5: Nutrition Implementation Summary

### 2.1 Canonical Configuration (`questionnaires/nutrition/questionnaire.php`)
- **Metadata**:
  - `schema_version`: `2.0.0`
  - `id`: `nutrition`
  - `version`: `1.0.0`
  - `status`: `review`
  - `locale`: `fr-FR`
  - `title`: `Score LifeMetrics - Nutrition`
  - `seo_title`: `Auto-évaluation LifeMetrics - Comment évaluer la qualité globale de votre alimentation ?`
  - `description`: `Évaluer le profil global des habitudes alimentaires : diversité végétale, qualité des glucides et fibres, variété des sources protéiques, matières grasses, produits à limiter et organisation des repas.`
  - `population`: `Adultes de 18 à 64 ans`
  - `recall_period`: `7 derniers jours`
  - `estimated_duration`: `3-4 minutes`
  - `scoring_direction`: `higher_is_better`
  - `score`: `target_min: 0`, `target_max: 48`, `normalize_when_unavailable: false`, `rounding: half_up`
- **12 Scored Questions (NT01–NT12)**:
  - Exact verbatim French text, answer labels, and points from `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Nutrition_V1.pdf`.
  - **Duplicate 4-point mappings**:
    - `NT03` (Légumes secs): `2 fois par semaine` = 4 pts, `3 fois ou plus par semaine` = 4 pts.
    - `NT06` (Poisson & alternatives): `Environ 2 fois par semaine` = 4 pts, `Plus de 2 fois par semaine...` = 4 pts.
  - **Non-linear scoring**:
    - `NT02` (Fruits frais): `2 fruits par jour` = 4 pts (optimal max), `3 fruits ou plus par jour` = 3 pts.
  - **Reverse scoring**:
    - `NT09` (Boissons sucrées): `Plusieurs fois par jour` = 0 pts ... `Rarement ou jamais` = 4 pts.
    - `NT10` (Produits ultra-transformés): `Plusieurs fois par jour` = 0 pts ... `Rarement (1 fois par semaine ou moins)` = 4 pts.
- **6 Dimensions (D1–D6)**:
  - `fruits-legumes-diversite`: NT01, NT02 (Max 8 pts)
  - `fibres-glucides-qualite`: NT03, NT04 (Max 8 pts)
  - `proteines-variete`: NT05, NT06 (Max 8 pts)
  - `matieres-grasses-qualite`: NT07, NT08 (Max 8 pts)
  - `produits-a-limiter`: NT09, NT10 (Max 8 pts)
  - `organisation-equilibre-global`: NT11, NT12 (Max 8 pts)
  - Total Capacity: $8 \times 6 = 48$ points.
- **Result Levels (0–48 Target Score)**:
  - 0–15: `HABITUDES_A_AMELIORER` (Habitudes nutritionnelles à améliorer)
  - 16–27: `EQUILIBRE_A_RENFORCER` (Équilibre nutritionnel à renforcer)
  - 28–38: `PROFIL_GLOBALEMENT_FAVORABLE` (Profil nutritionnel globalement favorable)
  - 39–48: `HABITUDES_TRES_FAVORABLES` (Habitudes nutritionnelles très favorables)
- **Safety Questions (NTSF01, NTSF02, NTSF03)**:
  - `NTSF01`: Régime alimentaire médicalement prescrit (Non / Oui)
  - `NTSF02`: Variation pondérale involontaire importante (Non / Oui)
  - `NTSF03`: Difficultés alimentaires ou troubles sévères (Non / Oui)
  - Emit priority safety flag `NUTRITION_ATTENTION_MESSAGE` without mutating numeric score or calculated category.
- **Result CTAs & Disclaimers**:
  - Primary CTA: `Découvrir le bilan VitaScan` (`/vitascan/`, `enabled: true`), matching Page 9 of the PDF.
  - Secondary CTA: `Découvrir les autres tests` (`/tests-sante/`, `enabled: false`, pending publication approval).
  - Verbatim disclaimers from the authoritative PDF.

### 2.2 Plugin Registry Mapping (`includes/class-lifemetrics-plugin.php`)
- Added `'nutrition' => 'nutrition/questionnaire.php'` to `LifeMetrics_Questionnaire_Registry`.

### 2.3 Unit & Parity Test Suites
- **PHP Unit Test Suite (`tests/questionnaire-nutrition.test.php`)**:
  - Schema 2.0.0 validation: PASS.
  - Duplicate 4-point mapping on NT03 and NT06: PASS.
  - Non-linear NT02 and reverse NT09/NT10 scoring: PASS.
  - Boundary scores (0, 15, 16, 27, 28, 38, 39, 48): PASS.
  - 6 dimensions with 8 pts capacity each: PASS.
  - Weakest dimensions deterministic tie-breaking: PASS.
  - Safety questions score/category independence: PASS.
  - Registry and server scoring authority: PASS.
- **JavaScript Unit Test Suite (`tests/questionnaire-nutrition.test.js`)**:
  - Dynamic canonical loading via PHP CLI bridge: PASS.
  - Parity guard and scoring engine equality across all boundaries, options, duplicate mappings, reverse scoring, and safety questions: PASS.

---

## 3. Full Test Suite Matrix (26 Test Suites)

All 15 PHP and 11 JavaScript test suites executed cleanly with 0 errors and 0 warnings:

### PHP Test Suites (15/15 PASS)
1. `tests/all-pdf-capability-audit.test.php`
2. `tests/backend-routing.test.php`
3. `tests/pss10-rest-characterization.test.php`
4. `tests/questionnaire-assets.test.php`
5. `tests/questionnaire-fatigue-recuperation.test.php`
6. `tests/questionnaire-hydratation.test.php`
7. `tests/questionnaire-nutrition.test.php`
8. `tests/questionnaire-parity.test.php`
9. `tests/questionnaire-registry.test.php`
10. `tests/questionnaire-renderer.test.php`
11. `tests/questionnaire-schema.test.php`
12. `tests/questionnaire-scoring.test.php`
13. `tests/questionnaire-sedentarite.test.php`
14. `tests/questionnaire-sommeil.test.php`
15. `tests/wordpress-integration.test.php`

### JavaScript Test Suites (11/11 PASS)
1. `tests/all-pdf-capability-audit.test.js`
2. `tests/backend-logic.test.js`
3. `tests/pss10-browser-responsive.test.js`
4. `tests/pss10-frontend-characterization.test.js`
5. `tests/questionnaire-engine.test.js`
6. `tests/questionnaire-fatigue-recuperation.test.js`
7. `tests/questionnaire-hydratation.test.js`
8. `tests/questionnaire-nutrition.test.js`
9. `tests/questionnaire-sedentarite.test.js`
10. `tests/questionnaire-sommeil.test.js`
11. `tests/shared-frontend.test.js`

---

## 4. Next Step
- **Stage 10.6**: Implement the next proprietary questionnaire in sequence: **Activité Physique** (`activite-physique`).
