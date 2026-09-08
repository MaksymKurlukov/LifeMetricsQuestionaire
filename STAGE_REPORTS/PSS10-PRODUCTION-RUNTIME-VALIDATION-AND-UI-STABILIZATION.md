# PSS10 production runtime validation and UI stabilization milestone

MILESTONE = OUT-OF-SEQUENCE PSS10 PRODUCTION RUNTIME VALIDATION

STATUS = PASS

DATE = 2026-09-08

STAGE_3_STARTED = NO

SCOPE = Current frozen/legacy PSS10 WordPress plugin only. This milestone does not complete the future generic/migrated STAGES 8-10.

## Final validation status

| Gate | Result | Evidence summary |
|---|---|---|
| `PSS10_WORDPRESS_RUNTIME` | PASS | plugin installed/activated; shortcode, assets, modal, ten-question flow, Retour, score and result rendered in real company WordPress |
| `PSS10_SHEET_WRITE` | PASS | expected versioned PSS10 answers/result reached Apps Script and the expected Sheet row was written |
| `PSS10_REST_RESPONSE` | PASS | WordPress returned the validated success response after explicit ContentService redirect handling |
| `PSS10_FRONTEND_CONFIRMATION` | PASS | result remained visible and the frontend accepted backend success without a storage error |
| `PSS10_DUPLICATE_CHECK` | PASS | controlled same-session duplicate handling did not create a second canonical row |
| `PSS10_END_TO_END` | PASS | browser -> WordPress -> REST/PHP -> Google Apps Script -> expected Google Sheet write -> confirmed frontend completion |

No end-to-end claim is based only on static or unit tests.

## Root cause and recovery

The initial Apps Script POST wrote the Sheet row, but WordPress automatically followed Google's ContentService `302` by replaying a malformed request to `script.googleusercontent.com`, which returned HTTP 400 and caused the public WordPress 502 branch. Commit `1e8899c` disabled automatic redirect following, required the trusted HTTPS Google ContentService host, followed exactly once with a payload-free GET, and continued to require final 2xx JSON with `ok=true`. Temporary PHI-safe diagnostic logging was removed.

## Stabilization chronology

| Commit | Recorded scope |
|---|---|
| `1e8899c` | explicit one-POST/one-GET Google ContentService redirect handling; production E2E recovery |
| `54367e1` | modal visibility, Retour/result-secondary hover isolation, result CTA alignment |
| `84d12d8` | Fermer alignment isolation and removal of `Résultat enregistré.` success toast |
| `943a946` | first scoped full-bleed background attempt; superseded after real theme failure |
| `d9f41f8` | alternate full-bleed background attempt; superseded after real theme failure |
| `046743b` | filemtime asset cache busting, same-answer reselection after Retour, main/footer hover/link isolation |
| `bfb1385` | removal of `Sauvegarde en cours...`; primary/secondary result CTA update |

## Current verified UX behavior

- En savoir plus modal opens; close control works; Escape and focus return remain available.
- Retour preserves the previous answer, allows selecting that same answer again, and is isolated from the theme's yellow hover.
- Main, footer, result primary, and result secondary link/button states are scoped against theme overrides; result CTA and Fermer text are centered.
- Normal submission continues in the background with neither `Sauvegarde en cours...` nor `Résultat enregistré.` shown.
- Existing error feedback remains visible and actionable.
- Asset URLs use file modification time for deployment cache invalidation.
- Scoring, questionnaire content, backend semantics, REST contract, Apps Script, Sheet schema, and submission payload were not changed by UI stabilization.

## Current result actions

- Primary: `Je veux faire un bilan`, normal same-site relative link to `/formulaire-bilan/`.
- Secondary: `Découvrir les autres tests`, intentionally not linked until `/tests-sante/` exists.
- Stage 3 requirement: move these into `result_ctas` configuration with `label`, `url`, `variant`, and `enabled`.

## Explicitly unresolved

- Plugin-only full-bleed background is not solved. The required `#faf8f5` surrounding full-viewport background belongs to WordPress/page layout; the plugin must not couple to page ID, Elementor, theme selectors, or global body/html styling.
- Real WordPress mobile visual/runtime validation remains required.
- PSS10 licensing/legal/attribution approval remains unresolved; runtime PASS alone does not make the instrument public-ready.
- `/tests-sante/` must be created before the secondary result CTA is enabled.
- Stage 3 generic architecture and all proprietary questionnaire migrations have not started.

## Remaining public-release blockers

PSS10 licensing/legal approval; page-level background composition; Tests santé catalogue page; secondary CTA activation; real mobile validation; generic Stage 3 architecture; proprietary questionnaire configuration/migration; and questionnaire-specific synthetic scoring approvals.

FILES_CHANGED_BY_THIS_MILESTONE_REPORT = documentation only

RUNTIME_CODE_CHANGED_BY_THIS_DOCUMENTATION_UPDATE = NO

NEXT_STAGE_PROPOSED = `STAGE 3 - Generic PHP infrastructure in parallel`, only after explicit approval.

NEXT_STAGE_STARTED = NO
