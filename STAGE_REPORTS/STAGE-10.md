# Stage 10: Proprietary Questionnaires Rollout

**Status:** IN_PROGRESS (6/7 Questionnaires Complete)  
**Completion Date (Stage 10.6):** 2026-09-09  

---

## 1. Rollout Progress Overview

| # | Questionnaire | ID | Status | Milestone Completed | Config Status |
|---|---|---|---|---|---|
| 1 | Sédentarité | `sedentarite` | **PASS** | 2026-09-09 (Stage 10.1) | `review` |
| 2 | Hydratation | `hydratation` | **PASS** | 2026-09-09 (Stage 10.2) | `review` |
| 3 | Fatigue & Récupération | `fatigue-recuperation` | **PASS** | 2026-09-09 (Stage 10.3) | `review` |
| 4 | Sommeil | `sommeil` | **PASS** | 2026-09-09 (Stage 10.4) | `review` |
| 5 | Nutrition | `nutrition` | **PASS** | 2026-09-09 (Stage 10.5) | `review` |
| 6 | Activité Physique | `activite-physique` | **PASS** | 2026-09-09 (Stage 10.6) | `review` |
| 7 | Pieds & Confort Postural | `pieds-confort-postural` | **NOT_STARTED** | Next (Stage 10.7) | `draft` |

---

## 2. Stage 10.6: Activité Physique Implementation Summary

### 2.1 Canonical Configuration (`questionnaires/activite-physique/questionnaire.php`)
- **Metadata**:
  - `schema_version`: `2.0.0`
  - `id`: `activite-physique`
  - `version`: `1.0.0`
  - `status`: `review`
  - `locale`: `fr-FR`
  - `title`: `Score LifeMetrics - Activité physique`
  - `seo_title`: `Auto-évaluation LifeMetrics - Quel est votre niveau d'activité physique ?`
  - `description`: `Évaluer le profil global d'activité physique : volume d'activité, renforcement musculaire, mouvement quotidien, réduction de la sédentarité et régularité.`
  - `population`: `Adultes de 18 à 64 ans`
  - `recall_period`: `Principalement les 7 derniers jours ; régularité sur les 4 dernières semaines`
  - `estimated_duration`: `2-3 minutes`
  - `scoring_direction`: `higher_is_better`
  - `score`: `target_min: 0`, `target_max: 48`, `normalize_when_unavailable: false`, `rounding: half_up`
- **12 Scored Questions (AP01–AP12)**:
  - Exact verbatim French text, answer labels, and points from `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Activite_Physique_V1.pdf`.
  - **AP04 Duplicate 4-Point Maximum Confirmed**:
    - `Jamais` = 0 pts
    - `Moins d'une fois par semaine` = 1 pt
    - `1 jour par semaine` = 2 pts
    - `2 jours par semaine` = 4 pts [DUPLICATE MAX]
    - `3 jours ou plus par semaine` = 4 pts [DUPLICATE MAX]
  - All other questions (AP01–AP03, AP05–AP12) use explicit standard linear mappings (0 to 4 points).
- **5 Dimensions (D1–D5)**:
  - `activite-endurance`: AP01, AP02, AP03 (Max 12 pts)
  - `renforcement-mobilite`: AP04, AP05 (Max 8 pts)
  - `mouvement-quotidien`: AP06, AP07 (Max 8 pts)
  - `sedentarite`: AP08, AP09 (Max 8 pts)
  - `regularite`: AP10, AP11, AP12 (Max 12 pts)
  - Total Capacity: $12 + 8 + 8 + 8 + 12 = 48$ points.
- **Result Levels (0–48 Target Score)**:
  - 0–15: `ACTIVITE_INSUFFISANTE` (Activité insuffisante)
  - 16–27: `ACTIVITE_A_RENFORCER` (Activité à renforcer)
  - 28–39: `NIVEAU_FAVORABLE` (Niveau favorable)
  - 40–48: `TRES_BON_NIVEAU` (Très bon niveau d'activité)
- **Safety, N/A & Guardrails**:
  - `safety_questions`: `array()` (none in source)
  - `classification_rules`: `array()` (none in source)
  - `N/A`: None (all items mandatory with `applicable: true`)
- **Synthetic Validation Status**:
  - `PDF_SYNTHETIC_PROFILES_PRESENT`: `NO`
  - `SYNTHETIC_PROFILE_STATUS`: `NOT_DEFINED_IN_SOURCE`
  - Validation is conducted via automated engine test fixtures (`ENGINE_TEST_FIXTURES`), covering all boundary thresholds, AP04 duplicate max, dimension percentage comparison, and server authority.
- **Result CTAs & Disclaimers**:
  - Primary CTA: `Découvrir le bilan VitaScan` (`/vitascan/`, `enabled: true`), matching Page 9 of the PDF.
  - Secondary CTA: `Découvrir les autres tests` (`/tests-sante/`, `enabled: false`, pending publication approval).
  - Verbatim disclaimers from the authoritative PDF.

### 2.2 Plugin Registry Mapping (`includes/class-lifemetrics-plugin.php`)
- Added `'activite-physique' => 'activite-physique/questionnaire.php'` to `LifeMetrics_Questionnaire_Registry`.

### 2.3 Unit & Parity Test Suites
- **PHP Unit Test Suite (`tests/questionnaire-activite-physique.test.php`)**:
  - Schema 2.0.0 validation: PASS.
  - AP04 duplicate 4-point maximum verification: PASS.
  - Boundary scores (0, 15, 16, 27, 28, 39, 40, 48): PASS.
  - 5 dimensions with capacities 12/8/8/8/12 = 48: PASS.
  - Weakest dimensions percentage-based ranking and deterministic tie-breaking: PASS.
  - Registry and server scoring authority (client score/category tampering overridden): PASS.
- **JavaScript Unit Test Suite (`tests/questionnaire-activite-physique.test.js`)**:
  - Dynamic canonical loading via PHP CLI bridge: PASS (`JS_CONFIG_DUPLICATION = NO`).
  - Parity guard and scoring engine equality across all boundaries, options, and AP04 duplicate mappings: PASS.

---

## 3. Full Test Suite Matrix (28 Test Suites)

All 16 PHP and 12 JavaScript test suites executed cleanly with 0 errors and 0 warnings:

### PHP Test Suites (16/16 PASS)
1. `tests/all-pdf-capability-audit.test.php`
2. `tests/backend-routing.test.php`
3. `tests/pss10-rest-characterization.test.php`
4. `tests/questionnaire-activite-physique.test.php`
5. `tests/questionnaire-assets.test.php`
6. `tests/questionnaire-fatigue-recuperation.test.php`
7. `tests/questionnaire-hydratation.test.php`
8. `tests/questionnaire-nutrition.test.php`
9. `tests/questionnaire-parity.test.php`
10. `tests/questionnaire-registry.test.php`
11. `tests/questionnaire-renderer.test.php`
12. `tests/questionnaire-schema.test.php`
13. `tests/questionnaire-scoring.test.php`
14. `tests/questionnaire-sedentarite.test.php`
15. `tests/questionnaire-sommeil.test.php`
16. `tests/wordpress-integration.test.php`

### JavaScript Test Suites (12/12 PASS)
1. `tests/all-pdf-capability-audit.test.js`
2. `tests/backend-logic.test.js`
3. `tests/pss10-browser-responsive.test.js`
4. `tests/pss10-frontend-characterization.test.js`
5. `tests/questionnaire-activite-physique.test.js`
6. `tests/questionnaire-engine.test.js`
7. `tests/questionnaire-fatigue-recuperation.test.js`
8. `tests/questionnaire-hydratation.test.js`
9. `tests/questionnaire-nutrition.test.js`
10. `tests/questionnaire-sedentarite.test.js`
11. `tests/questionnaire-sommeil.test.js`
12. `tests/shared-frontend.test.js`

---

## 4. Next Step
- **Stage 10.7**: Implement the final proprietary questionnaire in sequence: **Pieds & Confort Postural** (`pieds-confort-postural`).
