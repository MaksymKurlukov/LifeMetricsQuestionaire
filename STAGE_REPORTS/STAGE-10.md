# Stage 10: Proprietary Questionnaires Rollout — Sédentarité (`sedentarite`)

**Status:** PASS (1/7 Questionnaires Complete)  
**Completion Date:** 2026-09-09  
**Questionnaire:** Score LifeMetrics - Sédentarité (`sedentarite`)  
**Configuration File:** `lifemetrics-questionnaires/questionnaires/sedentarite/questionnaire.php`  
**Status in Config:** `review` (awaiting final publication and legal approvals)

---

## 1. Objective

Implement the first proprietary questionnaire in the sequential rollout — **Sédentarité** (`sedentarite`) — strictly following the authoritative LifeMetrics methodology (`/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Sedentarite_V1.pdf`), Schema 2.0.0, and DEC-024 central spreadsheet routing, without modifying generic core logic or breaking existing PSS10 invariants.

---

## 2. Implemented Components

### 2.1 Canonical Configuration (`questionnaires/sedentarite/questionnaire.php`)
- **Metadata**:
  - `schema_version`: `2.0.0`
  - `id`: `sedentarite`
  - `version`: `1.0.0`
  - `status`: `review`
  - `locale`: `fr-FR`
  - `scoring_direction`: `higher_is_better`
  - `score`: `target_min: 0`, `target_max: 48`, `normalize_when_unavailable: true`, `rounding: half_up`
- **12 Scored Questions (SD01–SD12)**:
  - Exact verbatim French text, answer labels, and 0–4 scale points from the PDF.
  - SD07 & SD08 support `value: 'na'`, `points: null`, `applicable: false` for individuals without seated professional activity.
- **6 Dimensions (D1–D6)**:
  - `D1` (Volume global assis): SD01, SD02 (Max 8 pts, attention threshold <= 2)
  - `D2` (Continuité et pauses): SD03, SD04 (Max 8 pts, attention threshold <= 2)
  - `D3` (Écrans de loisirs): SD05, SD06 (Max 8 pts, attention threshold <= 2)
  - `D4` (Postures au travail): SD07, SD08 (Max 8 pts, attention threshold <= 2)
  - `D5` (Déplacements passifs): SD09, SD10 (Max 8 pts, attention threshold <= 2)
  - `D6` (Mobilité et dynamisme): SD11, SD12 (Max 8 pts, attention threshold <= 2)
- **Result Levels (0–48 Target Score)**:
  - 0–15: `SEDENTARITE_ELEVEE`
  - 16–27: `SEDENTARITE_A_REDUIRE`
  - 28–38: `HABITUDES_SEDENTARITE_GLOBALEMENT_FAVORABLES`
  - 39–48: `TRES_BONNES_HABITUDES_ANTI_SEDENTARITE`
- **Guardrail Classification Rule**:
  - `CAP_HIGH_SEDENTARY_TIME`: When D1 <= 2/8, display category is capped at `SEDENTARITE_A_REDUIRE` while keeping numeric score intact.
- **Weakest Dimensions**:
  - Highlights the 1–2 weakest dimensions (lowest percentage, tie priority to lower dimension ID, excludes unavailable N/A dimensions).
- **Result CTAs & Disclaimers**:
  - Configured for VitaScan and Metabolism Analytics in accordance with inventory specifications.

### 2.2 Plugin Registry Mapping (`includes/class-lifemetrics-plugin.php`)
- Added `'sedentarite' => 'sedentarite/questionnaire.php'` to `LifeMetrics_Questionnaire_Registry` mapping.

### 2.3 Unit & Parity Test Suites
- **PHP Unit Test Suite (`tests/questionnaire-sedentarite.test.php`)**:
  - Validates configuration against `LifeMetrics_Questionnaire_Schema_Validator` (PASS).
  - Tests boundary scores (0, 15, 16, 27, 28, 38, 39, 48) and category mappings.
  - Tests N/A capacity normalization for SD07/SD08 (40 max raw -> 48 normalized).
  - Tests D1 guardrail cap rule (`CAP_HIGH_SEDENTARY_TIME`) capping category at `SEDENTARITE_A_REDUIRE`.
  - Tests dimension attention rules (`ATTENTION_DIMENSION_D1`..`D6`).
  - Tests weakest dimension identification.
  - Tests all 6 authoritative synthetic profiles A through F from the PDF specification.
  - Verifies registry resolution.
- **JavaScript Unit Test Suite (`tests/questionnaire-sedentarite.test.js`)**:
  - Verifies exact JS scoring engine parity on boundary scores, N/A normalization, guardrail capping, and synthetic profiles.

---

## 3. Test Evidence

| Test Suite | Result | Details |
|---|---|---|
| `tests/questionnaire-sedentarite.test.php` | PASS | All schema, scoring, boundary, guardrail, N/A, and profile tests passed |
| `tests/questionnaire-sedentarite.test.js` | PASS | JS scoring engine parity verified |
| Full PHP & JS Test Matrix (18 suites) | PASS | 0 errors, 0 warnings across all tests |

---

## 4. Next Step
- **Stage 10.2**: Implement the next proprietary questionnaire in sequence: **Hydratation** (`hydratation`).
