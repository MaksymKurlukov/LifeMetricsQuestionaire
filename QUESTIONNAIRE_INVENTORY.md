# LifeMetrics questionnaire inventory

Inventory version: 1.0.0

Status: `APPROVED AS CURRENT INVENTORY STATE`

Last verified: 2026-09-08

Approved by: Maksym Kurlukov on 2026-09-03. This accepts the inventory contract and recorded readiness state; it does not approve questionnaire content for implementation/publication or assign questionnaire-specific owners.

Search scope: repository, available Codex attachments, and `/Volumes/T7/StageBut3`.

Authority: this file owns current source/readiness/approval state. Sequencing and gates remain in `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`; normative field/scoring rules remain in `QUESTIONNAIRE_SCHEMA.md`.

## Readiness meanings

- `CONTENT_READY`: implementation-relevant wording exists; publication approval may still be pending.
- `SCORING_READY`: scoring, ranges, dimensions, N/A, safety, and guardrails have no known unresolved decision.
- `IMPLEMENTATION_READY`: source and scoring are ready and explicitly approved for implementation.
- `BLOCKED_BY_CONTENT`, `BLOCKED_BY_SCORING`, `BLOCKED_BY_APPROVAL`: exact gate.
- `PRODUCTION_READY`: never assigned from document existence; requires full project Definition of Done.

Approval owner is currently `UNASSIGNED` for every questionnaire. Approval date is `PENDING` unless stated otherwise. This prevents document filenames such as `V1` from being treated as approval.

## Source file manifest

PDF files are external read-only sources and are not tracked by this repository.

| Source | SHA-256 | Pages | Bytes | Document marker |
|---|---|---:|---:|---|
| `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Activite_Physique_V1.pdf` | `0838ef135dd547259bee2fc0d49fcaafb200c69f16a490ed427d4ee6c0c100a6` | 10 | 89116 | `Version 1.0 - Document de travail LifeMetrics` |
| `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Fatigue_Recuperation_V1.pdf` | `560ce21457a8f6cd935e2e531758955abc755f7f9f49e60246010022cbe48f5a` | 11 | 93244 | Version 1.0; proprietary methodology |
| `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Hydratation_V1.pdf` | `9ebb0f393143bca4f30409726dcec8a26f3f590868ec83de73bc186d18d77ff6` | 11 | 93646 | `Version 1.0 - Document de travail LifeMetrics` |
| `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Nutrition_V1.pdf` | `9ba7c01b556140c21f1a73ca1375dff5c5ebca274006618f4ed65e00961117ba` | 11 | 92485 | `Version 1.0 - Document de travail LifeMetrics` |
| `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Pieds_Confort_Postural_V1.pdf` | `6224345331d65875b506d3e44b701cf4d88222ec5d09cc078dcc6c9a98be4fb4` | 11 | 91820 | content V1; categories/guardrail explicitly provisional |
| `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Sedentarite_V1.pdf` | `be267dfa9e238a81ddb203c67796dfb54fdbc299557720bb775df5f55096a0da` | 11 | 94002 | `Version 1.0 - Document LifeMetrics` |
| `/Volumes/T7/StageBut3/Questionner de test /Score_LifeMetrics_Sommeil_V1.pdf` | `ff962ec2b9a185c2b6324ac2fd1dd0f0b87d4b308104d5a9515f019097d116d9` | 11 | 91228 | `Version 1.0 - Document de travail LifeMetrics` |

## Questionnaire readiness

| ID | Content | Scoring | Safety | N/A | Guardrail/attention | CTA | Implementation | Approval/blocker |
|---|---|---|---|---|---|---|---|---|
| `pss10` | existing plugin/standalone behavior; no separate questionnaire PDF found | executable freeze approved for structural migration: 1-5, reverse Q4/Q5/Q7/Q8, 10-50, boundaries 20/21/26/27 | none | none | none | primary `/formulaire-bilan/`; secondary reserved for `/tests-sante/` and currently unlinked | `BLOCKED_BY_APPROVAL` | runtime/E2E stabilized and passed; licensing/attribution and publication approval remain separate blockers |
| `activite-physique` | `CONTENT_READY` | ranges defined, but source requires synthetic validation/pilot | none | none | none | VitaScan | `BLOCKED_BY_SCORING` | confirm AP04 duplicate 4-point mapping; run/approve profiles; owner/date/URL pending |
| `sommeil` | `CONTENT_READY` | `SCORING_READY` | SLSF01-SLSF03 | none | none | VitaScan | `IMPLEMENTATION_READY` | Canonical configuration and unit tests complete in Stage 10.4 (`status: review`); publication/legal approvals pending |
| `hydratation` | `CONTENT_READY` | `SCORING_READY` based on documented synthetic validation | HYSF01-HYSF03 | HY05 | weakest dimensions; no category guardrail | VitaScan | `IMPLEMENTATION_READY` | Canonical configuration and unit tests complete in Stage 10.2 (`status: review`); publication/legal approvals pending |
| `nutrition` | `CONTENT_READY` | `SCORING_READY` | NTSF01-NTSF03 | none | none | VitaScan | `IMPLEMENTATION_READY` | Canonical configuration and unit tests complete in Stage 10.5 (`status: review`); publication/legal approvals pending |
| `fatigue-recuperation` | `CONTENT_READY` | `SCORING_READY` based on documented synthetic validation | FRSF01-FRSF03 | none | weakest 1-2; attention <=2/8 | VitaScan + Metabolism Analytics | `IMPLEMENTATION_READY` | Canonical configuration and unit tests complete in Stage 10.3 (`status: review`); publication/legal approvals pending |
| `sedentarite` | `CONTENT_READY` | `SCORING_READY`; documented profiles A-F | none | SD07, SD08 | D1 <=2/8 caps display at `SEDENTARITE_A_REDUIRE`; weakest/attention | VitaScan + Metabolism Analytics | `IMPLEMENTATION_READY` | Canonical configuration and unit tests complete in Stage 10 (`status: review`); publication/legal approvals pending |
| `pieds-confort-postural` | `CONTENT_READY` | categories provisional; PF09-PF10 guardrail unresolved | PFSF01-PFSF04 | none | weakest/attention; category guardrail undecided | Podos360 | `BLOCKED_BY_SCORING` | profiles A-F, guardrail/ranges, owner/date/URL pending |
| `stress-equilibre` | `BLOCKED_BY_CONTENT` | unknown | unknown | unknown | unknown | unknown | `BLOCKED_BY_CONTENT` | no source found |
| `composition-corporelle` | `BLOCKED_BY_CONTENT` | unknown | unknown | unknown | unknown | unknown | `BLOCKED_BY_CONTENT` | no source found |
| `bien-etre-general` | `BLOCKED_BY_CONTENT` | unknown | unknown | unknown | unknown | unknown | `BLOCKED_BY_CONTENT` | no source found; aggregate-vs-standalone scope also unknown |

## Source-specific notes

### PSS10

- Plugin baseline source manifest: `5206e7a4a4fff67661e21d2761fd3b2ea94f1a435f05bcd65376b844a6d3cdb9` in `STAGE_REPORTS/STAGE-00.md`.
- Current code is the behavior source until a separately approved legal/content source is recorded.
- Stored and displayed category labels are not identical; migration must preserve this before any later UX/content decision.
- STAGE 2 golden fixtures and mutation guards are executable and accepted as the structural-migration/regression baseline by Maksym Kurlukov on 2026-09-04.
- The current legacy PSS10 path completed the controlled production-runtime cycle on `lifemetrics.fr`: `WORDPRESS_RUNTIME`, `SHEET_WRITE`, `REST_RESPONSE`, `FRONTEND_CONFIRMATION`, `DUPLICATE_CHECK`, and `PSS10_END_TO_END` are all `PASS`. Full evidence and commit chronology are in `STAGE_REPORTS/PSS10-PRODUCTION-RUNTIME-VALIDATION-AND-UI-STABILIZATION.md`.
- Current result actions are `Je veux faire un bilan` -> `/formulaire-bilan/` (normal relative link) and `Découvrir les autres tests` (intentionally unlinked until `/tests-sante/` exists). Stage 6 must migrate these into `result_ctas` configuration.
- This baseline acceptance does not permanently approve legacy UX/content/legal choices for production; changes to wording, CTA behavior, licensing/attribution, or UX require a separate authorized stage.

### Activité physique

- AP01-AP12, 12 x 0-4, max 48, five dimensions.
- No safety/N/A/guardrail.
- AP04 source assigns 4 points both to `2 jours par semaine` and `3 jours ou plus`; implementation must not correct or reinterpret it without explicit confirmation.
- Source explicitly requires synthetic profiles before production.

### Sommeil

- SL01-SL12, max 48, five dimensions, four result levels.
- SL01 is non-linear: 7-9 hours receives 4 and more than 9 hours receives 3.
- Three non-scored safety questions; any positive trigger shows attention without changing score.

### Hydratation

- HY01-HY12, max 48, six dimensions, four result levels.
- HY05 supports N/A; example 44/44 normalizes to 48/48.
- Three non-scored safety questions; safety can coexist with a favorable score.

### Nutrition

- NT01-NT12, max 48, six dimensions, four result levels.
- Three non-scored safety questions.
- No N/A or category guardrail documented.

### Fatigue & récupération

- FR01-FR12, max 48, six dimensions, four result levels.
- Three non-scored safety questions.
- Final FR10 is `besoin de récupération supplémentaire`; an older coping-oriented draft must not return.
- Display weakest 1-2 dimensions; attention at <=2/8.

### Sédentarité

- SD01-SD12, normalized max 48, six dimensions, four result levels.
- SD07 and SD08 may be N/A and are excluded from available capacity.
- D1 = SD01 + SD02. If D1 <=2/8 and calculated category is better than `SEDENTARITE_A_REDUIRE`, display is capped at `SEDENTARITE_A_REDUIRE`; numeric score is unchanged.

### Pieds & confort postural

- PF01-PF12, max 48, six dimensions; PFSF01-PFSF04 non-scored safety.
- Result ranges remain provisional.
- Source requires deciding whether PF09-PF10 needs a guardrail after profiles A-F.
- CTA is Podos360, not VitaScan.

## Planned Tests santé catalogue

The WordPress catalogue page is named `Tests santé` with planned path `/tests-sante/`. It will list these ten proprietary questionnaires from registry/config metadata: Activité physique; Sommeil; Hydratation; Nutrition; Fatigue et récupération; Sédentarité; Stress et équilibre quotidien; Pieds & confort postural; Habitudes favorables à la composition corporelle; Bien-être général. Each entry exposes title, description, estimated duration, lifecycle/status, and CTA; non-ready entries are disabled or marked unavailable. PSS10 is separate if retained because it is a standardized instrument rather than a proprietary LifeMetrics questionnaire.

## Approval ledger

| Questionnaire | Content owner | Methodology/scoring owner | Legal/medical claims owner | CTA owner | Approval date | Approved source hash |
|---|---|---|---|---|---|---|
| all current entries | `UNASSIGNED` | `UNASSIGNED` | `UNASSIGNED` | `UNASSIGNED` | `PENDING` | `PENDING` |

The STAGE 1 inventory contract was approved by Maksym Kurlukov on 2026-09-03. Questionnaire-level content, methodology, claims, CTA, source, implementation, and publication approvals remain separate gates in their planned stages.
