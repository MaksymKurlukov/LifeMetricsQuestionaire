# Inventaire des Questionnaires LifeMetrics

Version du document : 2.0.0  
Statut : `VALIDÉ EN RUNTIME & PHASE 16`  
Dernière mise à jour : 16 septembre 2026  
Périmètre : Les 10 questionnaires réels du plugin WordPress `lifemetrics-questionnaires`.

---

## 1. Vue d'ensemble et architecture runtime

Le plugin `lifemetrics-questionnaires` intègre exactement **10 questionnaires de santé et de bien-être** :
- **1 questionnaire clinique de référence (PSS-10)** : exécuté via un **runtime legacy isolé et gelé** (`LifeMetrics_Legacy_PSS10_Runtime`, template `pss10/template.php`, assets `pss10/assets/js/app.js` et `pss10/assets/css/style.css`), protégé par 13 gardes de mutation frontend ;
- **9 questionnaires propriétaires LifeMetrics** : exécutés via un **runtime générique V2 partagé** (`templates/questionnaire.php`, `assets/js/questionnaire-ui.js`, `assets/js/questionnaire-engine.js`, `assets/css/questionnaire.css`).

Tous les questionnaires sont configurés sous le schéma canonique 2.0.0 (`questionnaires/<id>/questionnaire.php`), enregistrés dans `class-questionnaire-registry.php`, accessibles via le shortcode unique `[lifemetrics_questionnaire id="<id>"]`, et validés de bout en bout sur environnement WordPress local MAMP isolé avec écriture effective dans leurs 10 onglets Google Sheets dédiés.

---

## 2. Tableau de synthèse et readiness des 10 questionnaires

| # | ID canonique | Titre utilisateur | Runtime | Questions scorées | Échelle / Sens | Safety | N/A | Guardrail catégorie | Complétion analyse | Onglet Google Sheets | Statut Phase 16 |
|---|---|---|---|:---:|:---:|:---:|:---:|:---:|---|---|:---:|
| 1 | `pss10` | Échelle de Stress Perçu (PSS-10) | Legacy PSS-10 | 10 | 10–50 / Higher worse | Aucun | Aucun | Aucun | Pharmacies partenaires | `PSS10` (24 col) | VALIDÉ (10/10 PASS) |
| 2 | `sedentarite` | Score LifeMetrics - Sédentarité | Générique V2 | 12 | 12–60 / Lower better | Aucun | SD07, SD08 | D1 $\ge$ 8 | Pharmacies partenaires | `Sedentarite` (31 col) | VALIDÉ (10/10 PASS) |
| 3 | `hydratation` | Score LifeMetrics - Hydratation | Générique V2 | 12 | 12–60 / Lower better | 3 (HYSF01–03) | HY05 | Aucun | VitaScan | `Hydratation` (35 col) | VALIDÉ (10/10 PASS) |
| 4 | `fatigue-recuperation` | Score LifeMetrics - Fatigue & récupération | Générique V2 | 12 | 12–60 / Lower better | 3 (FRSF01–03) | Aucun | Aucun | Pharmacies partenaires | `Fatigue` (35 col) | VALIDÉ (10/10 PASS) |
| 5 | `sommeil` | Score LifeMetrics - Sommeil | Générique V2 | 12 | 12–60 / Lower better | 3 (SLSF01–03) | Aucun | Aucun | Pharmacies partenaires | `Sommeil` (35 col) | VALIDÉ (10/10 PASS) |
| 6 | `nutrition` | Score LifeMetrics - Nutrition | Générique V2 | 12 | 12–60 / Lower better | 3 (NTSF01–03) | Aucun | Aucun | VitaScan | `Nutrition` (35 col) | VALIDÉ (10/10 PASS) |
| 7 | `activite-physique` | Score LifeMetrics - Activité physique | Générique V2 | 12 | 12–60 / Lower better | Aucun | Aucun | Aucun | VitaScan | `Activite_Physique` (31 col) | VALIDÉ (10/10 PASS) |
| 8 | `pieds-confort-postural` | Score LifeMetrics - Pieds & confort postural | Générique V2 | 12 | 12–60 / Lower better | 4 (PFSF01–04) | Aucun | PF09/10 $\ge$ 4 | Podos360 | `Pieds_Confort` (36 col) | VALIDÉ (10/10 PASS) |
| 9 | `risque-nutritionnel` | Score LifeMetrics - Risque nutritionnel | Générique V2 | 12 | 12–60 / Lower better | 4 (RNSF01–04) | Aucun | RN03/04/05/08 $\ge$ 4 | VitaScan | `Risque_Nutritionnel` (36 col) | VALIDÉ (10/10 PASS) |
| 10 | `bien-etre` | Score LifeMetrics - Bien-être | Générique V2 | 12 | 12–60 / Lower better | Aucun | Aucun | Dim. Moy. $\ge$ 4.00 | Pharmacies partenaires | `Bien_Etre` (31 col) | VALIDÉ (10/10 PASS) |

---

## 3. Manifeste des sources méthodologiques

Les 9 questionnaires propriétaires sont transcrits à 100% depuis les PDF finaux validés, qui constituent la source de vérité méthodologique absolue. PSS-10 est un instrument clinique standardisé international dont l'implémentation legacy historique fait référence.

| Questionnaire | Document source | Type / Remarque |
|---|---|---|
| `pss10` | Standard Cohen et al. (1983) | Implémentation legacy WordPress gelée (10–50), 13 gardes de mutation |
| `sedentarite` | `Score_LifeMetrics_Sedentarite_V1.pdf` | Document méthodologique LifeMetrics V1.0 |
| `hydratation` | `Score_LifeMetrics_Hydratation_V1.pdf` | Document méthodologique LifeMetrics V1.0 |
| `fatigue-recuperation` | `Score_LifeMetrics_Fatigue_Recuperation_V1.pdf` | Document méthodologique LifeMetrics V1.0 |
| `sommeil` | `Score_LifeMetrics_Sommeil_V1.pdf` | Document méthodologique LifeMetrics V1.0 |
| `nutrition` | `Score_LifeMetrics_Nutrition_V1.pdf` | Document méthodologique LifeMetrics V1.0 |
| `activite-physique` | `Score_LifeMetrics_Activite_Physique_V1.pdf` | Document méthodologique LifeMetrics V1.0 |
| `pieds-confort-postural` | `Score_LifeMetrics_Pieds_Confort_Postural_V1.pdf` | Document méthodologique LifeMetrics V1.0 |
| `risque-nutritionnel` | `Score_LifeMetrics_Risque_Nutritionnel_V1.pdf` | Document méthodologique LifeMetrics V1.0 |
| `bien-etre` | `Score_LifeMetrics_Bien_Etre_V1.pdf` | Document méthodologique LifeMetrics V1.0 |

---

## 4. Règles méthodologiques transversales

### 4.1. Conventions de notation des 9 questionnaires propriétaires
- **Nombre de questions scorées** : Exactement **12 questions** numérotées par instrument (ex. SD01–SD12, HY01–HY12, etc.).
- **Échelle de notation** : **12 à 60 points** (barème par item de 1 à 5 points).
- **Sens de scoring (`scoring_direction`)** : `lower_is_better` (un score plus bas reflète un état plus favorable, moins de fatigue, moins de sédentarité, moins de risque ou de meilleures habitudes).
- **Catégories de résultat** : Exactement 3 catégories par questionnaire :
  - **12 à 24 points** : État favorable / satisfaisant (vert) ;
  - **25 à 32 points** : État intermédiaire / fragile / à renforcer (orange) ;
  - **33 à 60 points** : État défavorable / élevé / insuffisant (rouge).

### 4.2. Formule de calcul et gestion du N/A
Seuls deux questionnaires supportent des options « Non applicable » (`applicable: false`, `points: null`) :
- `sedentarite` : SD07 (`na` : « Non concerné actuellement ») et SD08 (`na` : « Très peu de déplacements actuellement ») ;
- `hydratation` : HY05 (`na` : « Non concerné actuellement »).

Formule de normalisation arithmétique certifiée :
$$\text{final\_score} = \text{ROUND}\left(\frac{\text{raw\_score}}{\text{applicable\_question\_count}} \times 12\right)$$

- Le calcul des moyennes dimensionnelles utilise uniquement les questions applicables.
- Si toutes les questions d'une dimension sont N/A (ex. SD07 et SD08 pour la dimension `travail-etudes-deplacements`), cette dimension est **exclue** de l'analyse et du tri des axes prioritaires.

### 4.3. Système Safety (hors score)
Le système Safety est un mécanisme médical d'alerte indépendant du score numérique :
- Il **ne modifie pas** le `raw_score` ;
- Il **ne modifie pas** le `final_score` ;
- Il **ne modifie pas** la catégorie calculée (`calculated_category`) ;
- Il déclenche uniquement le drapeau `safety_attention = true` et un encadré textuel sobre sur l'écran résultat.
- **Rendu visuel certifié (Phase 16)** : Titre commun textuel unique « Un point mérite votre attention. », aucun pictogramme décoratif (suppression de l'icône ⚠️), texte court et bienveillant.
- **Répartition** :
  - 3 questions Safety : `hydratation` (HYSF01–03), `fatigue-recuperation` (FRSF01–03), `sommeil` (SLSF01–03), `nutrition` (NTSF01–03) ;
  - 4 questions Safety : `pieds-confort-postural` (PFSF01–04), `risque-nutritionnel` (RNSF01–04) ;
  - Aucun Safety : `pss10`, `sedentarite`, `activite-physique`, `bien-etre`.

### 4.4. Mécanisme des Guardrails (Plafonnement de catégorie)
Un guardrail intervient lorsqu'une réponse clinique isolée ou une dimension dégradée impose de relever le niveau de vigilance sans fausser le score numérique :
- Le score numérique (`final_score`) reste **strictement inchangé** ;
- Si la catégorie numérique calculée est verte, la catégorie affichée (`displayed_category`) est plafonnée à l'orange (au minimum) ;
- Ne force jamais le rouge.
- **Répartition** :
  - `sedentarite` : Si D1 (`temps-sedentaire-quotidien` = SD01 + SD02) $\ge$ 8, plafonne à `SEDENTARITE_A_REDUIRE` ;
  - `pieds-confort-postural` : Si PF09 $\ge$ 4 OU PF10 $\ge$ 4, plafonne à `CONFORT_A_AMELIORER` ;
  - `risque-nutritionnel` : Si RN03 $\ge$ 4 OU RN04 $\ge$ 4 OU RN05 $\ge$ 4 OU RN08 $\ge$ 4, plafonne à `RISQUE_A_SURVEILLER` ;
  - `bien-etre` : Si la moyenne d'au moins une dimension $\ge$ 4.00, plafonne à `BIEN_ETRE_A_RENFORCER` ;
  - `pss10`, `hydratation`, `fatigue-recuperation`, `sommeil`, `nutrition`, `activite-physique` : Aucun guardrail.
  *(Note UI : les cartes dimensionnelles séparées « Point d'attention : <dimension> » sont supprimées globalement de l'interface des 9 questionnaires Generic V2).*

### 4.5. Restitution du résultat et texte complémentaire (`result_completion`)
- L'écran de résultat présente : Titre → Catégorie (`displayed_category`) → Jauge SVG semi-circulaire (gradient continu vert → orange → rouge dynamiquement calculé sur `result_levels`, sans reste gris, avec marqueur de score positionné sur le score numérique réel) → Safety sobre si déclenché (« Un point mérite votre attention. ») → Volet accordéon d'analyse détaillée (avec texte complémentaire intégré au dernier paragraphe) → Boutons d'action CTAs → Recommencer. (Note : aucune carte dimensionnelle séparée « Point d'attention » n'est affichée).
- **Intégration du texte complémentaire (Phase 16)** : Il n'y a plus de bloc séparé ni de titre visible « Compléter votre résultat ». Le texte de complétion est intégré comme **dernier paragraphe du volet dépliable** sous le bouton « Lire l'analyse détaillée » (`.analysis-completion`).
- **Mapping validé de l'orientation** :
  - **VitaScan** (4 questionnaires) : `hydratation`, `nutrition`, `activite-physique`, `risque-nutritionnel` ;
  - **Podos360** (1 questionnaire) : `pieds-confort-postural` ;
  - **Pharmacies partenaires LifeMetrics / texte neutre** (5 questionnaires, sans VitaScan) : `pss10`, `sedentarite`, `fatigue-recuperation`, `sommeil`, `bien-etre`.
- **CTAs principaux sur l'écran résultat** :
  - CTA principal : « Je veux faire un bilan » $\rightarrow$ `https://lifemetrics.fr/formulaire-bilan/` ;
  - CTA secondaire : « Découvrir les autres questionnaires » (ou « Découvrir les autres tests » pour PSS-10) $\rightarrow$ `/tests-sante/` ;
  - Bouton tertiaire : « Refaire le test ».

---

## 5. Fiches détaillées par questionnaire

### 1. `pss10` — Échelle de Stress Perçu (PSS-10)
- **Runtime** : `LifeMetrics_Legacy_PSS10_Runtime` (runtime legacy isolé).
- **Questions scorées** : 10 questions (PSS01 à PSS10), réponses de 1 à 5.
- **Items inversés** : Q4, Q5, Q7, Q8 calculés par $6 - \text{valeur}$.
- **Échelle & Sens** : 10 à 50 points, `higher_is_worse` (plus le score est élevé, plus le stress perçu est fort).
- **Catégories** :
  - 10–20 : `low` (« Stress bas » / *« Votre niveau de stress est bas, félicitations. »*)
  - 21–26 : `medium` (« Stress assez élevé » [stocké] / « Stress modéré » [affiché] / *« Votre niveau de stress est assez élevé. »*)
  - 27–50 : `high` (« Stress très élevé » [stocké] / « Stress élevé » [affiché] / *« Votre niveau de stress est très élevé. »*)
- **Safety / N/A / Guardrails** : Aucun.
- **Texte complémentaire** : Texte neutre orientant vers les bilans en pharmacies partenaires LifeMetrics.
- **Transport** : Endpoint REST dédié `/pss10/submit` $\rightarrow$ Web App PSS-10 dédiée (`backend/google-apps-script.gs`, constante `LMQ_PSS10_GOOGLE_ENDPOINT`) $\rightarrow$ Onglet `PSS10` en 24 colonnes physiques enrichies (métadonnées, session_id, réponses textuelles et points individuels).

### 2. `sedentarite` — Score LifeMetrics - Sédentarité
- **Runtime** : Générique V2.
- **Questions scorées** : 12 questions (SD01 à SD12), points 1 à 5.
- **Échelle & Sens** : 12 à 60 points, `lower_is_better`.
- **Catégories** :
  - 12–24 : `HABITUDES_FAVORABLES` (Habitudes très favorables)
  - 25–32 : `SEDENTARITE_A_REDUIRE` (Sédentarité modérée à réduire)
  - 33–60 : `SEDENTARITE_ELEVEE` (Sédentarité élevée à corriger)
- **Dimensions (6)** : `temps-sedentaire-quotidien` (SD01, SD02), `continuite-periodes-assises` (SD03, SD04), `pauses-interruptions` (SD05, SD06), `ecrans-loisirs` (SD09, SD10), `travail-etudes-deplacements` (SD07, SD08), `impact-fatigue-raideurs` (SD11, SD12). Mode de calcul : moyenne.
- **N/A** : SD07 et SD08 avec option `na` (`points: null`, `applicable: false`). Normalisation arithmétique sur 12, 11 ou 10 questions.
- **Guardrail** : `GUARDRAIL_TEMPS_SEDENTAIRE_D1` (si SD01 + SD02 $\ge$ 8, plafonne le vert à `SEDENTARITE_A_REDUIRE` sans modifier le score numérique).
- **Safety** : Aucun.
- **Texte complémentaire** : Texte neutre orientant vers les pharmacies partenaires LifeMetrics.
- **Transport** : Onglet `Sedentarite` (31 colonnes).

### 3. `hydratation` — Score LifeMetrics - Hydratation
- **Runtime** : Générique V2.
- **Questions scorées** : 12 questions (HY01 à HY12), points 1 à 5.
- **Échelle & Sens** : 12 à 60 points, `lower_is_better`.
- **Catégories** :
  - 12–24 : `HABITUDES_FAVORABLES` (Habitudes très favorables)
  - 25–32 : `HYDRATATION_FRAGILE` (Hydratation fragile)
  - 33–60 : `HABITUDES_INSUFFISANTES` (Habitudes insuffisantes)
- **Dimensions (6)** : `volume-quotidien`, `repartition-journee`, `boisson-prioritaire`, `hydratation-efforts-chaleur`, `boissons-a-limiter`, `signes-inconfort`.
- **N/A** : HY05 avec option `na` (`points: null`, `applicable: false`). Normalisation sur 11 ou 12 questions.
- **Safety (3)** : HYSF01, HYSF02, HYSF03 (message commun sans icône ⚠️, score intact).
- **Guardrail** : Aucun.
- **Texte complémentaire** : **VitaScan** (mesures corporelles objectives, eau corporelle et composition corporelle).
- **Transport** : Onglet `Hydratation` (35 colonnes).

### 4. `fatigue-recuperation` — Score LifeMetrics - Fatigue & récupération
- **Runtime** : Générique V2.
- **Questions scorées** : 12 questions (FR01 à FR12), points 1 à 5.
- **Échelle & Sens** : 12 à 60 points, `lower_is_better`.
- **Catégories** :
  - 12–24 : `RECUPERATION_FAVORABLE` (Récupération favorable)
  - 25–32 : `RECUPERATION_FRAGILE` (Récupération fragile)
  - 33–60 : `FATIGUE_IMPORTANTE` (Fatigue importante)
- **Dimensions (6)** : `fatigue-reveil`, `energie-journee`, `recuperation-repos`, `impact-activites`, `fatigue-mentale-physique`, `charge-quotidienne`.
- **N/A** : Aucun.
- **Safety (3)** : FRSF01, FRSF02, FRSF03 (message commun sans icône ⚠️, score intact).
- **Guardrail** : Aucun.
- **Texte complémentaire** : Texte neutre orientant vers les pharmacies partenaires LifeMetrics.
- **Transport** : Onglet `Fatigue` (35 colonnes).

### 5. `sommeil` — Score LifeMetrics - Sommeil
- **Runtime** : Générique V2.
- **Questions scorées** : 12 questions (SL01 à SL12), points 1 à 5.
- **Scoring spécifique SL01** : 7–9 h = 1 pt, >9 h = 2 pts, 6–<7 h = 3 pts, 5–<6 h = 4 pts, <5 h = 5 pts.
- **Échelle & Sens** : 12 à 60 points, `lower_is_better`.
- **Catégories** :
  - 12–24 : `SATISFAISANT` (Sommeil satisfaisant)
  - 25–32 : `ENCORE_FRAGILE` (Sommeil encore fragile)
  - 33–60 : `PERTURBE` (Sommeil perturbé)
- **Dimensions (5)** : `duree-sommeil`, `endormissement`, `continuite-reveils`, `recuperation-matinale`, `regularite-environnement`.
- **N/A** : Aucun.
- **Safety (3)** : SLSF01, SLSF02, SLSF03 (message commun sans icône ⚠️, score intact).
- **Guardrail** : Aucun.
- **Texte complémentaire** : Texte neutre orientant vers les pharmacies partenaires LifeMetrics.
- **Transport** : Onglet `Sommeil` (35 colonnes).

### 6. `nutrition` — Score LifeMetrics - Nutrition
- **Runtime** : Générique V2.
- **Questions scorées** : 12 questions (NT01 à NT12), points 1 à 5.
- **Barèmes spécifiques** : Plateau sur Q3/NT03 et Q6/NT06 où les deux options les plus fréquentes reçoivent 1 point.
- **Échelle & Sens** : 12 à 60 points, `lower_is_better`.
- **Catégories** :
  - 12–24 : `HABITUDES_FAVORABLES` (Habitudes très favorables)
  - 25–32 : `EQUILIBRE_FRAGILE` (Équilibre fragile)
  - 33–60 : `HABITUDES_INSUFFISANTES` (Habitudes insuffisantes)
- **Dimensions (6)** : `fruits-legumes`, `proteines-variete`, `fibres-feculents`, `produits-sucres-ultra-transformes`, `graisses-sel`, `rythme-comportement`.
- **N/A** : Aucun.
- **Safety (3)** : NTSF01, NTSF02, NTSF03 (message commun sans icône ⚠️, score intact).
- **Guardrail** : Aucun.
- **Texte complémentaire** : **VitaScan** (composition corporelle, masse grasse, masse musculaire).
- **Transport** : Onglet `Nutrition` (35 colonnes).

### 7. `activite-physique` — Score LifeMetrics - Activité physique
- **Runtime** : Générique V2.
- **Questions scorées** : 12 questions (AP01 à AP12), points 1 à 5.
- **Barème spécifique AP04** : 3 jours ou plus = 1 pt, 2 jours = 1 pt, 1 jour = 3 pts, moins d'un jour = 4 pts, jamais = 5 pts.
- **Échelle & Sens** : 12 à 60 points, `lower_is_better`.
- **Catégories** :
  - 12–24 : `PRATIQUE_REGULIERE` (Pratique régulière et équilibrée)
  - 25–32 : `PRATIQUE_A_CONSOLIDER` (Pratique à consolider)
  - 33–60 : `ACTIVITE_INSUFFISANTE` (Activité insuffisante)
- **Dimensions (5)** : `activite-endurance`, `renforcement-musculaire`, `mouvements-quotidiens`, `regularite-volume`, `intensite-variete`.
- **N/A / Safety / Guardrail** : Aucun.
- **Texte complémentaire** : **VitaScan** (composition corporelle, masse musculaire, condition physique).
- **Transport** : Onglet `Activite_Physique` (31 colonnes).

### 8. `pieds-confort-postural` — Score LifeMetrics - Pieds & confort postural
- **Runtime** : Générique V2.
- **Questions scorées** : 12 questions (PF01 à PF12), points 1 à 5.
- **Échelle & Sens** : 12 à 60 points, `lower_is_better`.
- **Catégories** :
  - 12–24 : `CONFORT_FAVORABLE` (Confort globalement favorable)
  - 25–32 : `CONFORT_A_AMELIORER` (Confort à améliorer)
  - 33–60 : `INCONFORT_IMPORTANT` (Inconfort important)
- **Dimensions (6)** : `douleur-inconfort`, `fatigue-appui`, `stabilite-marche`, `chaussage-tolerance`, `retentissement-fonctionnel`, `recuperation-pieds`.
- **N/A** : Aucun.
- **Guardrail** : `GUARDRAIL_PF09_LIMITATION` (PF09 $\ge$ 4) ou `GUARDRAIL_PF10_ADAPTATION` (PF10 $\ge$ 4). Si la catégorie calculée est verte, la catégorie affichée devient au minimum `CONFORT_A_AMELIORER`. Score numérique inchangé.
- **Safety (4)** : PFSF01, PFSF02, PFSF03, PFSF04 (message commun sans icône ⚠️, score intact).
- **Texte complémentaire** : **Podos360** (analyse instrumentale des appuis et de la posture).
- **Transport** : Onglet `Pieds_Confort` (36 colonnes).

### 9. `risque-nutritionnel` — Score LifeMetrics - Risque nutritionnel
- **Runtime** : Générique V2.
- **Questions scorées** : 12 questions (RN01 à RN12), points 1 à 5.
- **Échelle & Sens** : 12 à 60 points, `lower_is_better`.
- **Catégories** :
  - 12–24 : `RISQUE_FAIBLE` (Risque faible)
  - 25–32 : `RISQUE_A_SURVEILLER` (Risque à surveiller)
  - 33–60 : `RISQUE_IMPORTANT` (Risque important)
- **Dimensions (6)** : `appetit-prise-alimentaire`, `stabilite-poids`, `variete-repas`, `digestion-deglutition`, `energie-autonomie`, `contexte-vulnerabilite`.
- **N/A** : Aucun.
- **Guardrail** : `RN_GUARDRAIL_RN03`, `RN_GUARDRAIL_RN04`, `RN_GUARDRAIL_RN05` ou `RN_GUARDRAIL_RN08` $\ge$ 4. Plafonne le vert à `RISQUE_A_SURVEILLER`. Score numérique inchangé.
- **Rendu UI (suppression globale des cartes attention)** : Les cartes dimensionnelles séparées (« Point d'attention : <dimension> ») sont supprimées globalement de l'interface des 9 questionnaires Generic V2. L'utilisateur accède directement à l'analyse après le bloc Safety éventuel. La logique métier guardrail reste active côté serveur et pour le calcul de la catégorie affichée.
- **Safety (4)** : RNSF01, RNSF02, RNSF03, RNSF04 (message commun sans icône ⚠️, score intact).
- **Texte complémentaire** : **VitaScan** (mesures de composition corporelle, masse musculaire, masse maigre).
- **Transport** : Onglet `Risque_Nutritionnel` (36 colonnes).

### 10. `bien-etre` — Score LifeMetrics - Bien-être
- **Runtime** : Générique V2.
- **Questions scorées** : 12 questions (BE01 à BE12), points 1 à 5.
- **Échelle & Sens** : 12 à 60 points, `lower_is_better`.
- **Catégories** :
  - 12–24 : `BIEN_ETRE_FAVORABLE` (Bien-être favorable)
  - 25–32 : `BIEN_ETRE_A_RENFORCER` (Bien-être à renforcer)
  - 33–60 : `BIEN_ETRE_FRAGILISE` (Bien-être fragilisé)
- **Dimensions (6)** : `satisfaction-globale`, `vitalite-humeur`, `engagement-activites`, `sentiment-maitrise`, `sens-accomplissement`, `connexion-entourage`.
- **N/A / Safety** : Aucun.
- **Guardrail** : Guardrail dimensionnel. Si au moins une des 6 dimensions a une moyenne $\ge$ 4.00 et que le résultat est vert (`BIEN_ETRE_FAVORABLE`), la catégorie affichée devient au minimum `BIEN_ETRE_A_RENFORCER`. Score numérique inchangé. Les dimensions restent évaluées en interne pour l'analyse détaillée sans cartes UI séparées.
- **Texte complémentaire** : Texte neutre orientant vers les pharmacies partenaires LifeMetrics.
- **Transport** : Onglet `Bien_Etre` (31 colonnes).

---

## 6. Synthèse des flux de transport et stockage Google Sheets

Le système d'enregistrement utilise deux architectures de webhook distinctes et étanches :

1. **PSS-10 (Legacy)** :
   - Route REST : `/wp-json/lifemetrics-questionnaires/v1/pss10/submit` ;
   - Adaptateur : `LifeMetrics_Submission_Service` ;
   - Constante serveur : `LMQ_PSS10_GOOGLE_ENDPOINT` ;
   - Web App : `backend/google-apps-script.gs` ;
   - Format de stockage : Onglet `PSS10`, **24 colonnes enrichies** (métadonnées, session_id, libellés de réponses q1..q10, points q1..q10, score brut 10–50, catégorie).

2. **9 Questionnaires propriétaires (Générique V2)** :
   - Routes REST : `/wp-json/lifemetrics-questionnaires/v1/<id>/submit` ;
   - Adaptateur : `LifeMetrics_Submission_Service` avec recalcul authoritative côté serveur ;
   - Constante serveur : `LMQ_GOOGLE_ENDPOINT` ;
   - Web App : `backend/generic-google-apps-script.gs` ;
   - Format de stockage : 9 onglets distincts (`Sedentarite`, `Hydratation`, `Fatigue`, `Sommeil`, `Nutrition`, `Activite_Physique`, `Pieds_Confort`, `Risque_Nutritionnel`, `Bien_Etre`) de 31 à 36 colonnes physiques, incluant métadonnées, audit de soumission, réponses, points, dimensions, scores bruts/finaux, catégories et flags Safety.

---

## 7. Statut de certification et release

Au 16 septembre 2026, l'ensemble des 10 questionnaires a franchi toutes les étapes de qualification :
- **Suites de tests automatisés** : 23/23 suites PHP PASS, 19/19 suites JS PASS (42/42 suites au total, 100% de réussite) ;
- **Gardes de mutation PSS-10** : 13/13 gardes intactes certifiant la non-régression clinique ;
- **Validation WordPress local MAMP** : 10/10 questionnaires validés de bout en bout (parcours utilisateur, calcul, affichage sans focus parasite, sauvegarde REST HTTP 200, écriture dans les 10 onglets Sheets réels, déduplication `session_id`) ;
- **Packaging release** : Archive `lifemetrics-questionnaires.zip` générée proprement (61 fichiers de production, zéro fichier de test, de preview, Git ou `.DS_Store`) ;
- **Site de production LifeMetrics** : Préservé à 100% intact, prêt pour la remise finale à Camille (WORK-23).
