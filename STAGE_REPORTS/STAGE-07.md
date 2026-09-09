# Stage 7: All-PDF Capability Audit & Engine Hardening

**Status:** PASS
**Completion Date:** 2026-09-09

## Objective
Prove the common platform supports all proprietary LifeMetrics PDF methodologies before building them, and harden the engine against any gaps.

## Methodology Audit Findings

All 7 proprietary LifeMetrics questionnaire methodologies from the inventoried PDFs were audited against the scoring engine capabilities:

1. **Activité Physique (AP01-AP12):**
   - 12 items, 0-4 point scale, 48 max, 5 dimensions.
   - Requires duplicate point mapping support (e.g. AP04 assigning 4 points to both `2 jours par semaine` and `3 jours ou plus`).
   - *Audit Result:* Full engine support verified.

2. **Sommeil (SL01-SL12):**
   - 12 items, 48 max, 5 dimensions, 4 result levels.
   - Requires non-linear point scoring support (e.g. SL01 duration: `<5h`=0, `5-6h`=1, `6-7h`=2, `7-9h`=4 [peak], `>9h`=3).
   - 3 non-scored safety questions (SLSF01-SLSF03).
   - *Audit Result:* Full engine support verified; non-linear mapping and safety message triggers pass without scoring interference.

3. **Hydratation (HY01-HY12):**
   - 12 items, 48 max, 6 dimensions, 4 result levels.
   - Requires N/A answer capacity exclusion with normalized scaling (e.g. HY05 N/A: raw 44/44 normalizes to 48/48).
   - 3 non-scored safety questions (HYSF01-HYSF03).
   - *Audit Result:* Full engine support verified; `normalize_when_unavailable: true` scales properly using `half_up` rounding.

4. **Sédentarité (SD01-SD12):**
   - 12 items, 48 max, 6 dimensions, 4 result levels.
   - Requires multi-question N/A capacity normalization (SD07, SD08).
   - Requires category guardrail capping: Dimension D1 (SD01+SD02) score `<= 2` caps displayed category at `SEDENTARITE_A_REDUIRE` while leaving numeric score intact.
   - *Audit Result:* Full engine support verified; `category_cap` rule records rule ID, caps displayed category, and emits classification message.

5. **Fatigue & Récupération (FR01-FR12):**
   - 12 items, 48 max, 6 dimensions, 4 result levels.
   - Requires dimension attention trigger on `<= 2/8` (`metric: score, operator: <=, value: 2`).
   - Requires extraction of weakest 1-2 dimensions sorted by lowest percentage and configuration order tie-breaking.
   - 3 non-scored safety questions (FRSF01-FRSF03).
   - *Audit Result:* Full engine support verified; attention flag triggers and weakest dimension ordering passes.

6. **Pieds & Confort Postural (PF01-PF12):**
   - 12 items, 48 max, 6 dimensions.
   - 4 non-scored safety questions (PFSF01-PFSF04).
   - Requires multi-safety trigger sorting by descending priority and first trigger order.
   - *Audit Result:* Full engine support verified.

7. **PSS10 (Legacy baseline):**
   - 10 items, 1-5 answer values, 10-50 range, reverse scoring Q4/Q5/Q7/Q8, dimensionless.
   - *Audit Result:* Full engine support and regression parity preserved.

## Test Evidence
- `tests/all-pdf-capability-audit.test.php`: PASS (all 7 methodology profiles validated in PHP).
- `tests/all-pdf-capability-audit.test.js`: PASS (all 7 methodology profiles validated in JS).
- Full regression suite (12 test suites): ALL PASS.

## Next Stage
- STAGE 8: Isolated Local WordPress & PSS10 Validation.
