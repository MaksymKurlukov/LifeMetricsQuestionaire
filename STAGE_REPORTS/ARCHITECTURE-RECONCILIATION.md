# Architecture Reconciliation Report

DATE = 2026-09-08

## Context

Following clarifications about the nature of the proprietary LifeMetrics questionnaires (Sédentarité, Hydratation, Sommeil, etc.) and PSS10, the original roadmap assumptions regarding frontend universality and backend storage have been superseded. 

The original plan assumed:
1. PSS10 was the template for all subsequent tests.
2. Every test would use identical frontend presentation templates.
3. Every test would write data into one monolithic Google Sheet.

These assumptions proved to be too rigid and did not align with the product methodologies outlined in the provided PDFs. 

## Architectural Corrections

**1. PSS10 is a Distinct Legacy Profile**
PSS10 is a functionally frozen standard profile. While the generic schema must support it, it does not dictate the shape, scoring model, dimensions, or presentation layout of the proprietary LifeMetrics questionnaires. 

**2. Presentation Extensibility**
The shared frontend runtime built in Stage 5 acts as the default LifeMetrics presentation, but the architecture officially supports a `presentation` extension point in the schema. Individual tests can define custom layouts and themes without duplicating the central `questionnaire-ui.js` and `questionnaire-engine.js` business logic.

**3. Multi-Destination Google Backend**
The backend architecture has been updated from a single canonical spreadsheet to a generic submission orchestration engine that routes payloads to questionnaire-specific server-side Google Apps Script destinations. Physical Google Sheet columns may vary by questionnaire to support test-specific analysis (e.g. `HY01` vs `Q1`).

## Superseded Decisions

- **DEC-005** (One canonical common submission sheet) was explicitly SUPERSEDED.
- Created **DEC-020** (per-questionnaire server-side routing).
- Created **DEC-021** (PSS10 as distinct legacy profile).
- Created **DEC-022** (Shared frontend runtime + optional presentation overrides).
- Created **DEC-023** (Questionnaire-specific physical Sheet schemas).

## Roadmap Updates

The remaining implementation roadmap has been redefined. Stage 6 now serves to prove the engine supports PSS10's legacy quirks, not to standardize the platform onto PSS10. Stage 7 has been introduced as a mandatory capability audit against all proprietary PDFs. Stage 10 has been redefined to build the multi-destination Google backend. Proprietary tests will be implemented sequentially in Stages 11-20.

No source functionality was altered during this reconciliation run.
