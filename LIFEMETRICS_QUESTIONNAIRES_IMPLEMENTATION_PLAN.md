# LIFEMETRICS QUESTIONNAIRES — CODE IMPLEMENTATION & WORDPRESS RELEASE PLAN

---

## Tableau de progression

| Phase | Description | Statut |
|---|---|---|
| 1 | Schema Validator V2 | TERMINÉ |
| 2 | Scoring Engine V2 PHP / JavaScript | TERMINÉ |
| 3 | Architecture CSS extensible | TERMINÉ |
| 4 | Activité physique V2 | À FAIRE |
| 5 | Sommeil V2 | À FAIRE |
| 6 | Nutrition V2 | À FAIRE |
| 7 | Pieds & confort postural V2 | À FAIRE |
| 8 | Hydratation V2 | À FAIRE |
| 9 | Sédentarité V2 | À FAIRE |
| 10 | Fatigue & récupération V2 | À FAIRE |
| 11 | Risque nutritionnel V1 | À FAIRE |
| 12 | Bien-être V1 | À FAIRE |
| 13 | Restitution frontend finale | À FAIRE |
| 14 | Vérification transport et Google Sheets | À FAIRE |
| 15 | Full Regression Test | À FAIRE |
| 16 | WordPress Release ZIP | À FAIRE |

---

## État actuel du projet

- Phase actuelle : Aucune
- Dernière phase terminée : PHASE 3 — Architecture CSS extensible
- Prochaine phase à exécuter : PHASE 4 — Activité physique V2
- Blocages : Aucun
- Nombre de phases terminées : 3 / 16
- Nombre de phases restantes : 13
- Dernier commit de phase : lifemetrics: phase 03 - extensible css architecture
- Livrable final : lifemetrics-questionnaires.zip

---

## Socle existant réutilisé

Le projet s'appuie sur le plugin WordPress existant lifemetrics-questionnaires, testé et stable localement :

1. Bootstrap & Orchestration :
   - lifemetrics-questionnaires.php : Point d'entrée, constantes et initialisation.
   - includes/class-lifemetrics-plugin.php : Enregistrement des hooks WordPress (wp_enqueue_scripts, add_shortcode, rest_api_init).
2. Routage des Shortcodes :
   - includes/class-shortcodes.php : Routeur [lifemetrics_questionnaire id="..."] isolant le PSS-10 et déléguant les questionnaires propriétaires au renderer générique.
3. Runtime PSS-10 isolé (Gelé) :
   - includes/class-legacy-pss10-runtime.php et questionnaires/pss10/* : Runtime, template et assets dédiés, verrouillés par 13 gardes de mutation (pss10-frontend-characterization.test.js).
4. Catalogue & Résolution :
   - includes/class-questionnaire-registry.php : Résolution stricte par ID canonique, chargement sécurisé, distinction get_internal() / get_public().
5. Couche Transport & REST API :
   - includes/class-rest-controller.php : Endpoint POST /wp-json/lifemetrics-questionnaires/v1/<id>/submit.
   - includes/class-submission-service.php : Construction du payload JSON canonique.
   - includes/class-google-apps-script-adapter.php : Adaptateur HTTP gérant les redirections 302 Google Apps Script et l'idempotence via session_id.
   - backend/generic-google-apps-script.gs : Web App centralisée écrivant dans les onglets du Google Spreadsheet.
6. Interface Frontend Générique :
   - templates/questionnaire.php : Template DOM partagé à 3 écrans (intro, test, result).
   - assets/js/questionnaire-ui.js : Navigation, auto-avancement (400 ms), timeout 25s, gestion du retry.
   - assets/css/questionnaire.css : Système visuel partagé.
7. Outillage & Tests :
   - scripts/build-release-zip.sh : Script Bash de build du ZIP.
   - 20 suites PHP et 11 suites JS exécutables localement.

---

## Règles d'architecture obligatoires

### 1. Architecture existante
- Nous réutilisons intégralement l'architecture actuelle.
- Pas de réécriture complète du plugin.
- Pas d'ajout de nouvelle technologie, de nouvelle base de données ou de compte utilisateur sans nécessité démontrée.

### 2. Méthodologie & Hiérarchie des sources
- Les PDF validés sont la source de vérité absolue :
  PDF validé > ancien questionnaire.php > ancienne implémentation.
- Règle absolue : NE RIEN INVENTER (questions, réponses, points, catégories, seuils, dimensions, guardrails, Safety, recommandations, CTAs, URLs).
- Si une information n'est pas démontrable depuis le repository ou les PDF validés : inscrire NON DÉTERMINÉ.

### 3. Source de vérité technique
- Le code réel du repository prévaut sur toute description historique :
  Code réel du repository > description historique du plan.
- Si le plan indique qu'une capacité manque mais que le code démontre qu'elle existe déjà correctement, la réutiliser sans la réécrire.

### 4. PSS-10
- Le questionnaire PSS-10 reste isolé et strictement gelé.
- Ne pas modifier son scoring historique (10–50) ni le migrer vers la convention V2.

### 5. Architecture CSS extensible
- Le fichier CSS principal reste commun : assets/css/questionnaire.css.
- Le wrapper HTML racine de chaque questionnaire expose un identifiant stable : data-lmq-questionnaire="<id>".
- L'architecture permet l'inclusion conditionnelle d'un fichier assets/css/questionnaires/<id>.css s'il existe (file_exists()).
- Aucun fichier CSS spécifique vide ou inutile ne doit être créé par anticipation.

### 6. Transport & Persistance
- Conserver le flux : WordPress REST -> Submission Service -> Google Apps Script -> Google Sheets.
- Ne modifier cette couche que si une nécessité réelle liée aux données V2 est démontrée.

---

## Protocole obligatoire d'exécution d'une phase

### Ordre de sélection et de reprise d'une phase :
1. S'il existe une phase BLOQUÉ :
   - Ne pas passer à une autre phase ;
   - Traiter uniquement ce blocage ;
   - Si le blocage ne peut pas être résolu de manière démontrable : STOP.
2. Sinon, s'il existe une phase EN COURS :
   - Ne pas démarrer une nouvelle phase ;
   - Reprendre cette phase ;
   - Commencer par git status, git diff et l'inspection de l'état réel ;
   - Déterminer ce qui a déjà été fait avant l'interruption ;
   - Ne pas refaire ou écraser inutilement le travail existant ;
   - Terminer ou bloquer cette même phase.
3. Sinon :
   - Prendre la première phase À FAIRE.

Règle d'unicité : Il ne doit JAMAIS y avoir deux phases EN COURS simultanément. Une exécution = UNE seule phase maximum.

### Déroulement de la phase sélectionnée :
1. Lire le fichier LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md ;
2. Identifier la phase selon l'ordre de priorité ci-dessus ;
3. Basculer son statut à EN COURS dans le document ;
4. Lire l'état réel du code concerné ;
5. Comparer l'état réel du code au besoin décrit dans la phase ;
6. Identifier ce qui existe déjà et fonctionne ;
7. Identifier uniquement ce qui manque réellement ;
8. Modifier le minimum nécessaire (les listes de fichiers sont indicatives, ne jamais modifier un fichier sans besoin démontré) ;
9. Si une fonctionnalité existe déjà correctement : la réutiliser sans la réécrire ;
10. Exécuter les tests de la phase ;
11. Exécuter les tests de non-régression nécessaires ;
12. Si les tests échouent :
    - Corriger uniquement ce qui concerne la phase ;
    - Relancer les tests ;
    - Si un blocage réel persiste, marquer la phase BLOQUÉ, documenter le blocage et s'arrêter ;
13. Si tout est validé :
    - Marquer la phase TERMINÉ ;
14. Mettre à jour :
    - Tableau de progression ;
    - État actuel du projet ;
    - Section détaillée de la phase (Fichiers réellement modifiés, Tests exécutés, Résultat, NON DÉTERMINÉ, Commit, Date) ;
    - Journal d'implémentation ;
15. Faire un commit Git dédié uniquement à cette phase (format : lifemetrics: phase XX - <nom court>) ;
16. S'arrêter.

Une exécution = UNE seule phase maximum. Il est strictement interdit d'enchaîner automatiquement sur la phase suivante.

---

## Règles de modification du repository

Pendant l'exécution d'une phase :
- Ne modifier que les fichiers strictement nécessaires à cette phase ;
- Pas de refactoring esthétique ni de renommage inutile ;
- Pas de nouvelle dépendance sans nécessité démontrée ;
- Pas de nouvelle architecture si l'existante suffit ;
- Pas de fichier temporaire ou généré inutile commité ;
- Pas de modification d'un questionnaire appartenant à une phase future sauf nécessité technique démontrable du moteur partagé ;
- Pas de modification du PSS-10 hors test de non-régression, sauf bug directement provoqué par les changements en cours.

---

## Protocole Git obligatoire

### Avant modification :
1. Exécuter git status ;
2. Identifier les modifications déjà présentes avant le travail ;
3. Ne jamais supprimer ou écraser une modification utilisateur existante non liée ;
4. Ne jamais inclure dans le commit des fichiers non liés à la phase.

### Après validation de la phase :
1. Exécuter les tests ;
2. Exécuter git diff et vérifier que le diff correspond uniquement à la phase ;
3. Mettre à jour le fichier LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md ;
4. Exécuter git status ;
5. Ajouter explicitement les fichiers nécessaires (git add <fichier1> <fichier2> ...) sans utiliser aveuglément git add . ;
6. Créer le commit au format standard :
   lifemetrics: phase XX - <nom court>

Ne jamais exécuter de commandes destructives (git reset --hard, git clean -fd, rebase, force push) sans instruction explicite.

---

## Roadmap détaillée

### PHASE 1 — Schema Validator V2

- Statut : TERMINÉ
- Objectif : Adapter uniquement ce qui manque réellement au validateur actuel pour accepter les configurations finales des questionnaires V2.
- Justification : Permet au registry de valider les schémas V2 (scoring_direction: lower_is_better requis par les questionnaires propriétaires V2, champ dimensionnel calculation_mode: average, plages de scores configurables).
- Règle scoring_direction : Les questionnaires propriétaires V2 utilisent lower_is_better. Supporter ce besoin réel. Si higher_is_better existe déjà et est réellement utilisé, le conserver. Ne pas ajouter de capacité générique sans besoin réel démontré.
- Règle calculation_mode : Supporter calculation_mode: average pour les dimensions V2 validées. Si sum existe déjà dans le moteur et est réellement utilisé, le conserver. Sinon, ne pas ajouter sum par anticipation.
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/includes/class-questionnaire-schema-validator.php
  - lifemetrics-questionnaires/tests/questionnaire-schema.test.php
- Modifications nécessaires :
  - Accepter lower_is_better (et conserver higher_is_better si existant) dans scoring_direction.
  - Supporter le champ calculation_mode: average (et sum si déjà présent) dans les dimensions.
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-schema.test.php
- Critères de validation :
  - Configurations V2 nécessaires acceptées ;
  - Configurations invalides rejetées ;
  - Tests schéma PASS sans régression existante.

- Fichiers réellement modifiés : lifemetrics-questionnaires/includes/class-questionnaire-schema-validator.php, lifemetrics-questionnaires/tests/questionnaire-schema.test.php
- Tests exécutés : php lifemetrics-questionnaires/tests/questionnaire-schema.test.php (PASS), suites de tests complètes PHP et JS (PASS).
- Résultat : Validateur de schéma V2 opérationnel. Support de scoring_direction: lower_is_better, calculation_mode: average/sum, et improvement_messages.
- NON DÉTERMINÉ : Aucun.
- Commit : lifemetrics: phase 01 - schema validator v2
- Date : 2026-09-11

---

### PHASE 2 — Scoring Engine V2 PHP / JavaScript

- Statut : TERMINÉ
- Objectif : Adapter les moteurs de scoring existants uniquement aux règles nécessaires aux questionnaires validés.
- Justification : Assurer une parité arithmétique rigoureuse entre le calcul immédiat navigateur (questionnaire-engine.js) et le calcul faisant autorité sur le serveur WordPress (class-questionnaire-scoring-engine.php).
- Règles N/A et Normalisation :
  - Le moteur ne doit jamais choisir ou inventer lui-même une formule de normalisation.
  - Supporter techniquement la normalisation lorsqu'un questionnaire validé l'exige.
  - Appliquer exactement la règle déclarée pour ce questionnaire.
  - Ne jamais remplacer une formule validée par une formule générique uniquement parce qu'elle est mathématiquement équivalente.
  - Hydratation et Sédentarité doivent rester conformes à leur méthodologie validée.
- Règles à intégrer selon besoin réel :
  - Support de l'orientation lower_is_better (1 = favorable, 5 = défavorable ; échelle 12 à 60) ;
  - Calcul du score dimensionnel par moyenne arithmétique (somme / N_applicables) ;
  - Algorithme de tri et de sélection des 1 à 2 dimensions les plus défavorables (axes d'amélioration) ;
  - Maintien de l'étanchéité des guardrails (displayed_category modifiée sans altérer le score numérique brut) et des questions Safety hors score (priorité visuelle sans impact sur le score).
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/includes/class-questionnaire-scoring-engine.php
  - lifemetrics-questionnaires/assets/js/questionnaire-engine.js
  - lifemetrics-questionnaires/tests/questionnaire-scoring.test.php
  - lifemetrics-questionnaires/tests/questionnaire-parity.test.php
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-scoring.test.php
  - php lifemetrics-questionnaires/tests/questionnaire-parity.test.php
  - node lifemetrics-questionnaires/tests/questionnaire-engine.test.js
- Critères de validation :
  - Parité arithmétique 100% entre PHP et JS ;
  - Profils limites testés ;
  - Guardrails et Safety n'altèrent pas le score brut ;
  - Tests PASS.

- Fichiers réellement modifiés : lifemetrics-questionnaires/includes/class-questionnaire-scoring-engine.php, lifemetrics-questionnaires/assets/js/questionnaire-engine.js, lifemetrics-questionnaires/tests/questionnaire-scoring.test.php, lifemetrics-questionnaires/tests/questionnaire-parity.test.php, lifemetrics-questionnaires/tests/questionnaire-engine.test.js
- Tests exécutés : php lifemetrics-questionnaires/tests/questionnaire-scoring.test.php (PASS), php lifemetrics-questionnaires/tests/questionnaire-parity.test.php (PASS), node lifemetrics-questionnaires/tests/questionnaire-engine.test.js (PASS), suites complètes PHP (20 tests PASS) et JS (11 tests PASS)
- Résultat : Support complet de lower_is_better pour le tri des dimensions défavorables (weakest_dimensions). Parité PHP/JS à 100%. Étanchéité validée pour les guardrails et questions Safety.
- NON DÉTERMINÉ : Aucun.
- Commit : lifemetrics: phase 02 - scoring engine v2
- Date : 2026-09-11

---

### PHASE 3 — Architecture CSS extensible

- Statut : TERMINÉ
- Objectif : Conserver le CSS global actuel tout en permettant une personnalisation future propre pour chaque questionnaire.
- Justification : Préparer l'évolutivité graphique (ex. styles spécifiques Sommeil ou Pieds) sans modifier le core du plugin et sans créer de fichiers vides.
- Minimum nécessaire :
  - Identifiant stable du questionnaire dans le root DOM (data-lmq-questionnaire="<id>") ;
  - Possibilité de cibler un questionnaire via CSS ;
  - Possibilité d'enqueue conditionnel d'un CSS spécifique uniquement s'il existe réellement (file_exists()).
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/includes/class-assets.php
  - lifemetrics-questionnaires/includes/class-questionnaire-renderer.php
  - lifemetrics-questionnaires/templates/questionnaire.php
  - lifemetrics-questionnaires/tests/questionnaire-assets.test.php
  - lifemetrics-questionnaires/tests/questionnaire-renderer.test.php
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-assets.test.php
  - php lifemetrics-questionnaires/tests/questionnaire-renderer.test.php
- Critères de validation :
  - Le CSS global actuel continue de fonctionner ;
  - Aucun appel 404 émis ;
  - Un questionnaire peut être ciblé indépendamment ;
  - Tests renderer et assets PASS.

- Fichiers réellement modifiés : lifemetrics-questionnaires/includes/class-assets.php, lifemetrics-questionnaires/includes/class-questionnaire-renderer.php, lifemetrics-questionnaires/tests/questionnaire-assets.test.php, lifemetrics-questionnaires/tests/questionnaire-renderer.test.php
- Tests exécutés : php lifemetrics-questionnaires/tests/questionnaire-assets.test.php (PASS), php lifemetrics-questionnaires/tests/questionnaire-renderer.test.php (PASS), suites complètes PHP (20 tests PASS) et JS (11 tests PASS)
- Résultat : Architecture CSS extensible en place. Attribut data-lmq-questionnaire exposé sur le root DOM et conteneur. Enqueue conditionnel d'assets spécifiques géré via file_exists() avec dépendance lmq-shared-style et versioning filemtime.
- NON DÉTERMINÉ : Aucun.
- Commit : lifemetrics: phase 03 - extensible css architecture
- Date : 2026-09-11

---

### PHASE 4 — Activité physique V2

- Statut : À FAIRE
- Rôle : Premier questionnaire étalon V2.
- Objectif : Valider le moteur générique avec un questionnaire standard avant de migrer les autres, en implémentant exactement le PDF validé.
- Règle frontend : Inclure l'adaptation frontend minimale si strictement nécessaire pour afficher et tester les axes d'amélioration de ce questionnaire.
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/questionnaires/activite-physique/questionnaire.php
  - lifemetrics-questionnaires/tests/questionnaire-activite-physique.test.php
  - lifemetrics-questionnaires/tests/questionnaire-activite-physique.test.js
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-activite-physique.test.php
  - node lifemetrics-questionnaires/tests/questionnaire-activite-physique.test.js
- Critères de validation :
  - Questions exactes, réponses exactes, scoring exact, catégories exactes, dimensions exactes, axes exacts, textes résultat exacts ;
  - Tests PHP et JS PASS.

- Fichiers réellement modifiés : À compléter après exécution.
- Tests exécutés : À compléter après exécution.
- Résultat : À compléter après exécution.
- NON DÉTERMINÉ : À compléter si nécessaire.
- Commit : À compléter après exécution.
- Date : À compléter après exécution.

---

### PHASE 5 — Sommeil V2

- Statut : À FAIRE
- Objectif : Migration exacte depuis le PDF validé et validation du mécanisme Safety standard (3 questions hors score).
- Inventaire méthodologique validé :
  - 12 questions scorées ;
  - 3 questions Safety hors score ;
  - 5 dimensions (aucune mention de 4 dimensions).
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/questionnaires/sommeil/questionnaire.php
  - lifemetrics-questionnaires/tests/questionnaire-sommeil.test.php
  - lifemetrics-questionnaires/tests/questionnaire-sommeil.test.js
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-sommeil.test.php
  - node lifemetrics-questionnaires/tests/questionnaire-sommeil.test.js
- Critères de validation :
  - Safety hors score avec priorité visuelle claire sans impact sur le score brut ;
  - Tests PHP et JS PASS.

- Fichiers réellement modifiés : À compléter après exécution.
- Tests exécutés : À compléter après exécution.
- Résultat : À compléter après exécution.
- NON DÉTERMINÉ : À compléter si nécessaire.
- Commit : À compléter après exécution.
- Date : À compléter après exécution.

---

### PHASE 6 — Nutrition V2

- Statut : À FAIRE
- Objectif : Transcription exacte du PDF validé pour le questionnaire Nutrition (12 questions scorées, 3 questions Safety, dimensions, textes).
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/questionnaires/nutrition/questionnaire.php
  - lifemetrics-questionnaires/tests/questionnaire-nutrition.test.php
  - lifemetrics-questionnaires/tests/questionnaire-nutrition.test.js
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-nutrition.test.php
  - node lifemetrics-questionnaires/tests/questionnaire-nutrition.test.js
- Critères de validation :
  - Conformité stricte au PDF et tests PHP/JS PASS.

- Fichiers réellement modifiés : À compléter après exécution.
- Tests exécutés : À compléter après exécution.
- Résultat : À compléter après exécution.
- NON DÉTERMINÉ : À compléter si nécessaire.
- Commit : À compléter après exécution.
- Date : À compléter après exécution.

---

### PHASE 7 — Pieds & confort postural V2

- Statut : À FAIRE
- Objectif : Migration exacte depuis le PDF validé pour Pieds & Confort Postural (12 questions PF01–12, 6 dimensions, 4 Safety PFSF01–04, guardrail validé, funnel Podos360 validé).
- Règle URL : Intégrer une URL uniquement si elle est réellement connue et démontrée ; sinon indiquer NON DÉTERMINÉ.
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/questionnaires/pieds-confort-postural/questionnaire.php
  - lifemetrics-questionnaires/tests/questionnaire-pieds-confort-postural.test.php
  - lifemetrics-questionnaires/tests/questionnaire-pieds-confort-postural.test.js
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-pieds-confort-postural.test.php
  - node lifemetrics-questionnaires/tests/questionnaire-pieds-confort-postural.test.js
- Critères de validation :
  - Safety et guardrail validés ; tests PHP et JS PASS.

- Fichiers réellement modifiés : À compléter après exécution.
- Tests exécutés : À compléter après exécution.
- Résultat : À compléter après exécution.
- NON DÉTERMINÉ : À compléter si nécessaire.
- Commit : À compléter après exécution.
- Date : À compléter après exécution.

---

### PHASE 8 — Hydratation V2

- Statut : À FAIRE
- Objectif : Migration exacte depuis le PDF validé avec gestion de la réponse N/A (HY05) et normalisation arithmétique.
- Formule de référence validée :
  final_score = ROUND((raw_score / applicable_question_count) * 12)
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/questionnaires/hydratation/questionnaire.php
  - lifemetrics-questionnaires/tests/questionnaire-hydratation.test.php
  - lifemetrics-questionnaires/tests/questionnaire-hydratation.test.js
  - lifemetrics-questionnaires/tests/hydratation-browser-submission-regression.test.js
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-hydratation.test.php
  - node lifemetrics-questionnaires/tests/questionnaire-hydratation.test.js
  - node lifemetrics-questionnaires/tests/hydratation-browser-submission-regression.test.js
- Critères de validation :
  - Calcul N/A et formule de normalisation conformes au PDF ; tests PASS.

- Fichiers réellement modifiés : À compléter après exécution.
- Tests exécutés : À compléter après exécution.
- Résultat : À compléter après exécution.
- NON DÉTERMINÉ : À compléter si nécessaire.
- Commit : À compléter après exécution.
- Date : À compléter après exécution.

---

### PHASE 9 — Sédentarité V2

- Statut : À FAIRE
- Objectif : Migration exacte depuis le PDF validé pour le questionnaire Sédentarité.
- Éléments à valider :
  - 12 questions ;
  - SD07 / SD08 N/A et normalisation ;
  - 6 dimensions ;
  - Guardrail exact de temps quotidien assis (D1) avec calculated_category séparé de displayed_category (ne jamais réinterpréter librement le guardrail validé).
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/questionnaires/sedentarite/questionnaire.php
  - lifemetrics-questionnaires/tests/questionnaire-sedentarite.test.php
  - lifemetrics-questionnaires/tests/questionnaire-sedentarite.test.js
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-sedentarite.test.php
  - node lifemetrics-questionnaires/tests/questionnaire-sedentarite.test.js
- Critères de validation :
  - Guardrail exact et N/A validés ; tests PHP et JS PASS.

- Fichiers réellement modifiés : À compléter après exécution.
- Tests exécutés : À compléter après exécution.
- Résultat : À compléter après exécution.
- NON DÉTERMINÉ : À compléter si nécessaire.
- Commit : À compléter après exécution.
- Date : À compléter après exécution.

---

### PHASE 10 — Fatigue & récupération V2

- Statut : À FAIRE
- Objectif : Implémenter fidèlement la configuration validée issue du PDF Fatigue & Récupération (12 questions, 3 Safety FRSF01–03, dimensions, seuils, textes).
- Règle : Ne pas inventer de N/A, de guardrail ou de règle d'attention supplémentaire absents du PDF.
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/questionnaires/fatigue-recuperation/questionnaire.php
  - lifemetrics-questionnaires/tests/questionnaire-fatigue-recuperation.test.php
  - lifemetrics-questionnaires/tests/questionnaire-fatigue-recuperation.test.js
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-fatigue-recuperation.test.php
  - node lifemetrics-questionnaires/tests/questionnaire-fatigue-recuperation.test.js
- Critères de validation :
  - Conformité stricte au PDF et tests PHP/JS PASS.

- Fichiers réellement modifiés : À compléter après exécution.
- Tests exécutés : À compléter après exécution.
- Résultat : À compléter après exécution.
- NON DÉTERMINÉ : À compléter si nécessaire.
- Commit : À compléter après exécution.
- Date : À compléter après exécution.

---

### PHASE 11 — Risque nutritionnel V1

- Statut : À FAIRE
- Objectif : Nouveau questionnaire : créer sa configuration à partir du PDF final validé.
- Contenu requis :
  - 12 questions ;
  - 6 dimensions ;
  - Scoring, catégories, guardrail validé sur questions critiques, Safety validé, axes, textes résultat, funnel validé.
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/questionnaires/risque-nutritionnel/questionnaire.php
  - lifemetrics-questionnaires/includes/class-lifemetrics-plugin.php
  - lifemetrics-questionnaires/tests/questionnaire-risque-nutritionnel.test.php
  - lifemetrics-questionnaires/tests/questionnaire-risque-nutritionnel.test.js
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-risque-nutritionnel.test.php
  - node lifemetrics-questionnaires/tests/questionnaire-risque-nutritionnel.test.js
- Critères de validation :
  - Configuration valide, scoring conforme, tests PHP/JS PASS.

- Fichiers réellement modifiés : À compléter après exécution.
- Tests exécutés : À compléter après exécution.
- Résultat : À compléter après exécution.
- NON DÉTERMINÉ : À compléter si nécessaire.
- Commit : À compléter après exécution.
- Date : À compléter après exécution.

---

### PHASE 12 — Bien-être V1

- Statut : À FAIRE
- Objectif : Nouveau questionnaire : implémenter la version finale validée issue du PDF (12 questions, 6 dimensions, scoring, catégories, guardrail dimensionnel, axes, textes résultat, funnel de suivi).
- Règle de persistance : Le suivi longitudinal métier est une orientation fonctionnelle. Aucune nouvelle architecture de persistance complexe n'est créée dans ce MVP.
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/questionnaires/bien-etre/questionnaire.php
  - lifemetrics-questionnaires/includes/class-lifemetrics-plugin.php
  - lifemetrics-questionnaires/tests/questionnaire-bien-etre.test.php
  - lifemetrics-questionnaires/tests/questionnaire-bien-etre.test.js
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-bien-etre.test.php
  - node lifemetrics-questionnaires/tests/questionnaire-bien-etre.test.js
- Critères de validation :
  - Configuration valide, scoring conforme, tests PHP/JS PASS.

- Fichiers réellement modifiés : À compléter après exécution.
- Tests exécutés : À compléter après exécution.
- Résultat : À compléter après exécution.
- NON DÉTERMINÉ : À compléter si nécessaire.
- Commit : À compléter après exécution.
- Date : À compléter après exécution.

---

### PHASE 13 — Restitution frontend finale

- Statut : À FAIRE
- Objectif : Consolidation finale du frontend partagé : adapter uniquement le rendu nécessaire pour afficher correctement les informations fonctionnelles validées, en conservant le design LifeMetrics existant sauf nécessité démontrée.
- Éléments affichés selon les PDF :
  - Score, catégorie, titre, analyse, orientation, axes d'amélioration prioritaires, Safety avec priorité visuelle claire, bandeau Guardrail, CTA contextuel, disclaimers.
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/templates/questionnaire.php
  - lifemetrics-questionnaires/assets/js/questionnaire-ui.js
  - lifemetrics-questionnaires/assets/css/questionnaire.css
  - lifemetrics-questionnaires/tests/shared-frontend.test.js
  - lifemetrics-questionnaires/tests/hydratation-ui-flow-regression.test.js
- Tests :
  - node lifemetrics-questionnaires/tests/shared-frontend.test.js
  - node lifemetrics-questionnaires/tests/hydratation-ui-flow-regression.test.js
- Critères de validation :
  - Rendu fidèle et hiérarchisé sans régression d'affichage sur desktop et mobile.

- Fichiers réellement modifiés : À compléter après exécution.
- Tests exécutés : À compléter après exécution.
- Résultat : À compléter après exécution.
- NON DÉTERMINÉ : À compléter si nécessaire.
- Commit : À compléter après exécution.
- Date : À compléter après exécution.

---

### PHASE 14 — Vérification transport et Google Sheets

- Statut : À FAIRE
- Objectif : Vérifier que le payload existant transporte correctement les données réellement nécessaires vers le backend et Google Sheets. Ne modifier le transport que si un manque concret est démontré.
- Règle PSS-10 : Le PSS-10 est vérifié uniquement pour la non-régression de son flux historique existant. Ne pas migrer son payload, son scoring ou son runtime vers le moteur V2 uniquement pour uniformiser l'architecture.
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/includes/class-submission-service.php
  - lifemetrics-questionnaires/backend/generic-google-apps-script.gs
  - lifemetrics-questionnaires/tests/rest-backend-submission.test.php
  - lifemetrics-questionnaires/tests/google-sheets-storage-format.test.php
  - lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js
- Tests :
  - php lifemetrics-questionnaires/tests/rest-backend-submission.test.php
  - php lifemetrics-questionnaires/tests/google-sheets-storage-format.test.php
  - node lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js
- Critères de validation :
  - Payload et écriture Google Sheets validés ; tests PASS.

- Fichiers réellement modifiés : À compléter après exécution.
- Tests exécutés : À compléter après exécution.
- Résultat : À compléter après exécution.
- NON DÉTERMINÉ : À compléter si nécessaire.
- Commit : À compléter après exécution.
- Date : À compléter après exécution.

---

### PHASE 15 — Full Regression Test

- Statut : À FAIRE
- Objectif : Exécuter toutes les suites PHP et JS pour certifier la non-régression globale avant release.
- Fichiers potentiellement concernés :
  - Ensemble des fichiers dans lifemetrics-questionnaires/tests/
- Tests :
  - for f in lifemetrics-questionnaires/tests/*.test.php; do php "$f" || exit 1; done
  - for f in lifemetrics-questionnaires/tests/*.test.js; do node "$f" || exit 1; done
- Critères de validation :
  - 0 test en échec ;
  - 0 erreur applicative connue ;
  - Aucun nouvel avertissement introduit par les modifications ;
  - Gardes de non-régression PSS-10 intactes.
- Gestion d'échec : Si un test échoue, marquer BLOQUÉ et aucun build de release ne doit être fait.

- Fichiers réellement modifiés : À compléter après exécution.
- Tests exécutés : À compléter après exécution.
- Résultat : À compléter après exécution.
- NON DÉTERMINÉ : À compléter si nécessaire.
- Commit : À compléter après exécution.
- Date : À compléter après exécution.

---

### PHASE 16 — WordPress Release ZIP

- Statut : À FAIRE
- Objectif : Produire l'archive finale lifemetrics-questionnaires.zip installable dans WordPress.
- Contrôles avant build :
  - Tous les tests PASS ;
  - Aucun fichier temporaire, cache ou artefact local inutile ;
  - Fichiers de test exclus du ZIP de production ;
  - Bootstrap, assets, templates et configurations présents.
- Contrôles après build :
  - Inspecter le contenu réel du ZIP, le dossier racine, les fichiers PHP, CSS/JS et configurations.
- Fichiers potentiellement concernés :
  - scripts/build-release-zip.sh
  - lifemetrics-questionnaires/tests/stage11-release-audit.test.php
- Tests :
  - bash scripts/build-release-zip.sh lifemetrics-questionnaires.zip
  - php lifemetrics-questionnaires/tests/stage11-release-audit.test.php
- Critères de validation :
  - Archive ZIP propre générée ; audit de packaging PASS.
- Livrables à fournir :
  - Chemin exact du ZIP et taille ;
  - Résumé du contenu vérifié ;
  - Checklist de validation manuelle WordPress.

- Fichiers réellement modifiés : À compléter après exécution.
- Tests exécutés : À compléter après exécution.
- Résultat : À compléter après exécution.
- NON DÉTERMINÉ : À compléter si nécessaire.
- Commit : À compléter après exécution.
- Date : À compléter après exécution.

---

## Journal d'implémentation

### 2026-09-11 — Phase 1 : Schema Validator V2
- Statut : TERMINÉ
- Fichiers modifiés : lifemetrics-questionnaires/includes/class-questionnaire-schema-validator.php, lifemetrics-questionnaires/tests/questionnaire-schema.test.php, LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md
- Tests exécutés : php lifemetrics-questionnaires/tests/questionnaire-schema.test.php (PASS), suite complète PHP (20 tests PASS), suite complète JS (11 tests PASS)
- Résultat : Validateur de schéma étendu pour accepter `scoring_direction: lower_is_better`, `calculation_mode: average` (et sum), et `improvement_messages`. Les configurations invalides restent strictement rejetées. Aucune régression sur PSS-10 ni sur les schémas existants.
- Notes : Prêt pour la Phase 2 (Scoring Engine V2).

### 2026-09-11 — Phase 2 : Scoring Engine V2 PHP / JavaScript
- Statut : TERMINÉ
- Fichiers modifiés : lifemetrics-questionnaires/includes/class-questionnaire-scoring-engine.php, lifemetrics-questionnaires/assets/js/questionnaire-engine.js, lifemetrics-questionnaires/tests/questionnaire-scoring.test.php, lifemetrics-questionnaires/tests/questionnaire-parity.test.php, lifemetrics-questionnaires/tests/questionnaire-engine.test.js, LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md
- Tests exécutés : php lifemetrics-questionnaires/tests/questionnaire-scoring.test.php (PASS), php lifemetrics-questionnaires/tests/questionnaire-parity.test.php (PASS), node lifemetrics-questionnaires/tests/questionnaire-engine.test.js (PASS), suite complète PHP/JS (PASS)
- Résultat : Prise en charge de `scoring_direction: lower_is_better` dans le tri des dimensions les plus défavorables (weakest_dimensions). Parité PHP/JavaScript validée à 100%. Étanchéité préservée sur guardrails et questions Safety.
- Notes : Prêt pour la Phase 3 (Architecture CSS extensible).

### 2026-09-11 — Phase 3 : Architecture CSS extensible
- Statut : TERMINÉ
- Fichiers modifiés : lifemetrics-questionnaires/includes/class-assets.php, lifemetrics-questionnaires/includes/class-questionnaire-renderer.php, lifemetrics-questionnaires/tests/questionnaire-assets.test.php, lifemetrics-questionnaires/tests/questionnaire-renderer.test.php, LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md
- Tests exécutés : php lifemetrics-questionnaires/tests/questionnaire-assets.test.php (PASS), php lifemetrics-questionnaires/tests/questionnaire-renderer.test.php (PASS), suite complète PHP/JS (PASS)
- Résultat : Exposition de `data-lmq-questionnaire="<id>"` sur le wrapper DOM et enqueue conditionnel avec contrôle `file_exists()` d'un éventuel fichier `assets/css/questionnaires/<id>.css`. Zéro 404 émis et aucun fichier vide créé.
- Notes : Prêt pour la Phase 4 (Activité physique V2).

---

# PROMPT D'EXÉCUTION RÉPÉTABLE

Continue le développement LifeMetrics à partir du fichier :
LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md

Applique strictement le protocole et les règles définis dans ce document.

Ta mission pour cette exécution est :
1. Lire le plan et git status ;
2. Identifier la phase prioritaire à traiter :
   - Si BLOQUÉ : traiter uniquement ce blocage ;
   - Sinon, si EN COURS : reprendre et terminer cette phase ;
   - Sinon : sélectionner la première phase À FAIRE ;
3. Exécuter UNIQUEMENT cette phase (1 exécution = 1 seule phase maximum) ;
4. Analyser l'existant et ne modifier que le minimum strictement nécessaire ;
5. Respecter les PDF validés comme source de vérité méthodologique (ne rien inventer) ;
6. Préserver l'isolation et la non-régression du PSS-10 ;
7. Exécuter les tests locaux requis pour la phase ;
8. Mettre à jour LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md (tableau, état, détails de la phase, journal) ;
9. Créer le commit Git dédié (lifemetrics: phase XX - <nom court>) si la phase est validée ;
10. Ne commencer AUCUNE autre phase ;
11. Fournir le rapport # PHASE EXECUTION REPORT ;
12. STOP.

Règles absolues :
- une exécution = une seule phase ;
- pas de fonctionnalité spéculative ;
- pas de nouvelle méthodologie ;
- pas d'URL inventée ;
- pas de refactoring inutile ;
- pas de modification du PSS-10 sauf nécessité de non-régression ;
- pas de modification d'une phase future sauf moteur partagé strictement nécessaire ;
- ne jamais écraser les modifications utilisateur existantes ;
- ne jamais utiliser de commande Git destructive ;
- si une donnée est inconnue : NON DÉTERMINÉ.

Si la phase est déjà entièrement satisfaite par le code existant :
- le démontrer par inspection et tests ;
- mettre le plan à jour ;
- la marquer terminée si tous ses critères sont réellement remplis ;
- faire le commit du plan/tests nécessaires uniquement ;
- ne pas réécrire du code inutilement.

À la fin réponds avec :

# PHASE EXECUTION REPORT
- Phase exécutée :
- Statut final :
- État initial :
- Modifications nécessaires identifiées :
- Fichiers modifiés :
- Tests exécutés :
- Résultats :
- NON DÉTERMINÉ :
- Commit :
- Prochaine phase :
- Confirmation qu'aucune phase supplémentaire n'a été commencée.

