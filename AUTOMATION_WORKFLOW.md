# Automation Workflow

This document defines the canonical automation rules and universal execution prompt for the LifeMetrics Questionnaires project.

## Universal Execution Rules

To ensure safe, reproducible agent automation, the following rules MUST be respected during any run:

1. **One run = one stage**: An agent must only execute the first incomplete stage and then STOP. Never silently start the next stage.
2. **Authoritative Context**: Repository files and documentation override any stale conversational summaries.
3. **Preserve Unrelated Files**: Never use `git add .` or `git add -A`. Selectively stage only files related to the current objective. Never run `git reset --hard` or `git clean`. Never force push.
4. **No Invention**: Never invent methodology, missing content, or fake approvals. If a questionnaire is blocked, return `BLOCKED_BY_APPROVAL` and stop.
5. **No Silent Regression Hiding**: Never update a test fixture merely to hide a regression. If legacy behavior changes, it's a failure.
6. **Evidence-Based PASS**: A stage can only be marked `PASS` if all required stage tests are green. A single failing test prevents PASS.
7. **Strict PSS10 Protection**: Preserve PSS10 legacy behavior until explicitly authorized otherwise.

## Universal Prompt

Use the following exact prompt to continue the roadmap in a new Antigravity session:

```text
Continue the LifeMetrics Questionnaires roadmap.

1. Read AUTOMATION_WORKFLOW.md, LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md, and the current repository state.
2. Identify the FIRST incomplete executable stage.
3. Continue it if IN_PROGRESS, or start it if NOT_STARTED.
4. Execute ONLY that stage. Respect its scope, prerequisites, tests, and rollback rules.
5. Do not duplicate business logic; use the shared core with optional presentation overrides and server-side storage routing.
6. Run all local and stage-specific tests. A failing test blocks PASS.
7. Create focused commits (never `git add .`, never force push) and update documentation.
8. Push the branch if established workflow allows.
9. Stop completely before starting the next stage.
```
