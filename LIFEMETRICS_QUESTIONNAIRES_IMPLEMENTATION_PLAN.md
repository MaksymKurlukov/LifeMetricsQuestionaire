# LIFEMETRICS QUESTIONNAIRES — CODE IMPLEMENTATION & WORDPRESS RELEASE PLAN

---

## Tableau de progression

| Phase | Description | Statut |
|---|---|---|
| 1 | Schema Validator V2 | TERMINÉ |
| 2 | Scoring Engine V2 PHP / JavaScript | TERMINÉ |
| 3 | Architecture CSS extensible | TERMINÉ |
| 4 | Activité physique V2 | TERMINÉ |
| 5 | Sommeil V2 | TERMINÉ |
| 6 | Nutrition V2 | TERMINÉ |
| 7 | Pieds & confort postural V2 | TERMINÉ |
| 8 | Hydratation V2 | TERMINÉ |
| 9 | Sédentarité V2 | TERMINÉ |
| 10 | Fatigue & récupération V2 | TERMINÉ |
| 11 | Risque nutritionnel V1 | TERMINÉ |
| 12 | Bien-être V1 | TERMINÉ |
| 13 | Restitution frontend finale | TERMINÉ |
| 14 | Vérification transport et Google Sheets | À FAIRE |
| 15 | Full Regression Test | À FAIRE |
| 16 | WordPress Release ZIP | À FAIRE |

---

## État actuel du projet

- Phase actuelle : Aucune
- Dernière phase terminée : PHASE 13 — Restitution frontend finale
- Prochaine phase à exécuter : PHASE 14 — Vérification transport et Google Sheets
- Blocages : Aucun
- Nombre de phases terminées : 13 / 16
- Nombre de phases restantes : 3
- Dernier commit de phase : lifemetrics: phase 13 - restitution frontend finale
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

### 7. Règle obligatoire de migration des questionnaires (Phases 4 à 12)
Le but des phases questionnaires n'est PAS simplement de vérifier que l'ancien code fonctionne, mais de MIGRER les fichiers questionnaire.php vers le contenu des PDF finaux validés :
1. Le PDF final validé est la source de vérité absolue.
2. Pour chaque questionnaire, Antigravity doit comparer directement le fichier questionnaire.php existant au PDF final validé.
3. Il doit vérifier au minimum :
   - toutes les questions ;
   - les textes exacts ;
   - toutes les réponses ;
   - tous les points ;
   - les identifiants ;
   - les dimensions ;
   - les calculs des dimensions ;
   - les catégories ;
   - les seuils ;
   - les textes de résultat ;
   - les Safety ;
   - les N/A ;
   - les guardrails ;
   - les axes d'amélioration ;
   - le funnel ;
   - le CTA (selon la règle globale ci-dessous) ;
   - le disclaimer.
4. Si le fichier questionnaire.php contient une ancienne version, il doit être réellement MODIFIÉ pour correspondre au PDF final.
5. Les anciens tests ne sont PAS une preuve que le questionnaire est conforme (ils peuvent eux-mêmes décrire une ancienne version).
6. Après la migration du questionnaire.php, les tests PHP/JS du questionnaire doivent être mis à jour ou complétés pour vérifier la NOUVELLE version issue du PDF.
7. Une phase questionnaire ne peut pas être marquée TERMINÉ uniquement parce que les anciens tests passent.
8. Une phase questionnaire ne peut être terminée avec uniquement une modification du fichier MD, sauf si une comparaison explicite et complète démontre que le questionnaire.php correspond déjà exactement au PDF final.
9. Dans le rapport de chaque phase questionnaire, indiquer clairement :
   - ancien état trouvé ;
   - différences avec le PDF ;
   - contenu réellement remplacé ;
   - fichier questionnaire.php réellement vérifié/modifié ;
   - tests adaptés à la nouvelle version.
10. Règle de non-présomption : Une ancienne phase marquée TERMINÉ ne constitue jamais une preuve de conformité si son contenu contredit le PDF final.

### 8. Règle CTA globale pour tous les questionnaires (Phases 4 à 12)
Sur la page de résultat de TOUS les questionnaires LifeMetrics, il doit y avoir exactement deux CTA principaux :

1. CTA principal :
   - Texte : « Je veux faire un bilan »
   - URL exacte : `https://lifemetrics.fr/formulaire-bilan/`
   - Configuration : `variant: 'primary'`, `enabled: true`

2. CTA secondaire :
   - Texte : « Découvrir les autres questionnaires » (ou « Découvrir les autres tests »)
   - Rôle : Retour vers la page LifeMetrics qui présente la liste des autres questionnaires
   - Configuration technique : `variant: 'secondary'`, `enabled: true`
   - Statut URL de production : NON DÉTERMINÉ. L'URL finale de production n'est pas encore confirmée sur `lifemetrics.fr`. Le chemin `/tests-sante/` documenté dans `QUESTIONNAIRE_INVENTORY.md` est un chemin planifié / placeholder technique interne et ne doit pas être présenté comme une URL de production validée tant qu'elle n'est pas formellement déployée ou confirmée.

Cette règle est commune à tous les questionnaires des phases 4 à 12. Elle remplace les anciens CTA spécifiques ou destinations inventées dans les configurations (ex. `/vitascan/`, `/podos360/`).
Les PDF restent la source de vérité pour les questions, réponses, points, dimensions, catégories, textes de résultat, Safety, guardrails et disclaimers, mais cette règle globale est prioritaire pour les deux CTA de la page de résultat.

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

- Statut : TERMINÉ
- Rôle : Premier questionnaire étalon V2.
- Objectif : Valider le moteur générique avec un questionnaire standard avant de migrer les autres, en implémentant exactement le PDF validé (échelle 12–60, 3 catégories de résultat, dimensions et questions issues du PDF final).
- Règle frontend : Inclure l'adaptation frontend minimale si strictement nécessaire pour afficher et tester les axes d'amélioration de ce questionnaire.
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/questionnaires/activite-physique/questionnaire.php
  - lifemetrics-questionnaires/tests/questionnaire-activite-physique.test.php
  - lifemetrics-questionnaires/tests/questionnaire-activite-physique.test.js
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-activite-physique.test.php
  - node lifemetrics-questionnaires/tests/questionnaire-activite-physique.test.js
- Critères de validation :
  - Questions exactes, réponses exactes, scoring exact, catégories exactes (3 catégories issues du PDF), dimensions exactes, axes exacts, textes résultat exacts conformes au PDF final validé ;
  - Tests PHP et JS PASS adaptés à la nouvelle version issue du PDF.

- Fichiers réellement modifiés : `lifemetrics-questionnaires/questionnaires/activite-physique/questionnaire.php`, `lifemetrics-questionnaires/tests/questionnaire-activite-physique.test.php`, `lifemetrics-questionnaires/tests/questionnaire-activite-physique.test.js`, `lifemetrics-questionnaires/tests/stage11-release-audit.test.php`
- Tests exécutés : `php lifemetrics-questionnaires/tests/questionnaire-activite-physique.test.php` (PASS), `node lifemetrics-questionnaires/tests/questionnaire-activite-physique.test.js` (PASS), suite complète PHP 20/20 (PASS), suite complète JS 11/11 (PASS)
- Résultat : Migration intégrale du questionnaire Activité physique depuis le PDF final validé (`Score_LifeMetrics_Activite_Physique_V1.pdf`). 12 questions AP01–AP12 (points 1 à 5, lower_is_better), duplication 1 pt sur AP04 (3+ jours = 1 pt, 2 jours = 1 pt), 5 dimensions en `calculation_mode: average`, échelle 12–60 avec 3 catégories (`SATISFAISANTE` 12-24, `A_RENFORCER` 25-32, `INSUFFISANTE` 33-60), sélection des 2 dimensions les plus défavorables (plus fort pourcentage d'impact), 2 CTAs globaux conformes à la règle de résultat (CTA principal « Je veux faire un bilan » -> `https://lifemetrics.fr/formulaire-bilan/` ; CTA secondaire « Découvrir les autres questionnaires » -> `/tests-sante/`), disclaimers et textes exacts.
- NON DÉTERMINÉ : URL finale de production du catalogue des questionnaires pour le CTA secondaire (chemin planifié documenté : `/tests-sante/`, à confirmer lors du déploiement catalogue).
- Commit : lifemetrics: phase 04 - activite physique v2
- Date : 2026-09-11

---

### PHASE 5 — Sommeil V2

- Statut : TERMINÉ
- Objectif : Migration exacte depuis le PDF validé (score 12–60, 3 catégories, scoring Q1: 7-9h = 1 pt, >9h = 2 pts) et validation du mécanisme Safety standard (3 questions hors score).
- Inventaire méthodologique validé :
  - 12 questions scorées ;
  - 3 questions Safety hors score ;
  - 5 dimensions (issues du PDF validé).
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/questionnaires/sommeil/questionnaire.php
  - lifemetrics-questionnaires/tests/questionnaire-sommeil.test.php
  - lifemetrics-questionnaires/tests/questionnaire-sommeil.test.js
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-sommeil.test.php
  - node lifemetrics-questionnaires/tests/questionnaire-sommeil.test.js
- Critères de validation :
  - Safety hors score avec priorité visuelle claire sans impact sur le score brut ;
  - Conformité stricte au PDF (12-60, 3 catégories) et tests PHP/JS PASS.

- Fichiers réellement modifiés : `lifemetrics-questionnaires/questionnaires/sommeil/questionnaire.php`, `lifemetrics-questionnaires/tests/questionnaire-sommeil.test.php`, `lifemetrics-questionnaires/tests/questionnaire-sommeil.test.js`, `lifemetrics-questionnaires/tests/stage11-release-audit.test.php`
- Tests exécutés : `php lifemetrics-questionnaires/tests/questionnaire-sommeil.test.php` (PASS), `node lifemetrics-questionnaires/tests/questionnaire-sommeil.test.js` (PASS), suite complète PHP 20/20 (PASS), suite complète JS 11/11 (PASS)
- Résultat : Migration intégrale du questionnaire Sommeil depuis le PDF final validé (`Score_LifeMetrics_Sommeil_V1.pdf`). 12 questions scorées SL01–SL12 (points 1 à 5, lower_is_better), scoring spécifique SL01 (7-9h = 1 pt, >9h = 2 pts, 6-7h = 3 pts, 5-6h = 4 pts, <5h = 5 pts), 3 questions Safety hors score SLSF01–SLSF03 déclenchant l'alerte médicale `SOMMEIL_SAFETY_MESSAGE` (priorité 100) sans altérer le score numérique, 5 dimensions en `calculation_mode: average`, échelle 12–60 avec 3 catégories (`SATISFAISANT` 12-24, `ENCORE_FRAGILE` 25-32, `PERTURBE` 33-60), sélection des 2 dimensions les plus défavorables, 2 CTAs globaux conformes à la règle de résultat (CTA principal « Je veux faire un bilan » -> `https://lifemetrics.fr/formulaire-bilan/` ; CTA secondaire « Découvrir les autres questionnaires » -> `/tests-sante/`), disclaimers conformes.
- NON DÉTERMINÉ : URL finale de production du catalogue des questionnaires pour le CTA secondaire (chemin planifié documenté : `/tests-sante/`, à confirmer lors du déploiement catalogue).
- Commit : lifemetrics: phase 05 - sommeil v2
- Date : 2026-09-11

---

### PHASE 6 — Nutrition V2

- Statut : TERMINÉ
- Objectif : Transcription exacte du PDF validé pour le questionnaire Nutrition (score 12–60, 3 catégories, 12 questions scorées, 3 questions Safety, dimensions, textes).
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/questionnaires/nutrition/questionnaire.php
  - lifemetrics-questionnaires/tests/questionnaire-nutrition.test.php
  - lifemetrics-questionnaires/tests/questionnaire-nutrition.test.js
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-nutrition.test.php
  - node lifemetrics-questionnaires/tests/questionnaire-nutrition.test.js
- Critères de validation :
  - Conformité stricte au PDF (12-60, 3 catégories, textes et paliers exacts) et tests PHP/JS PASS.

- Fichiers réellement modifiés : `lifemetrics-questionnaires/questionnaires/nutrition/questionnaire.php`, `lifemetrics-questionnaires/tests/questionnaire-nutrition.test.php`, `lifemetrics-questionnaires/tests/questionnaire-nutrition.test.js`, `lifemetrics-questionnaires/tests/stage11-release-audit.test.php`
- Tests exécutés : `php lifemetrics-questionnaires/tests/questionnaire-nutrition.test.php` (PASS), `node lifemetrics-questionnaires/tests/questionnaire-nutrition.test.js` (PASS), suite complète PHP 20/20 (PASS), suite complète JS 11/11 (PASS)
- Résultat : Migration intégrale du questionnaire Nutrition depuis le PDF final validé (`Score_LifeMetrics_Nutrition_V1 09.33.50.pdf`). 12 questions scorées NT01–NT12 (points 1 à 5, lower_is_better), barèmes spécifiques avec plateau validé sur Q3/NT03 (3+ fois/sem = 1 pt, 2 fois/sem = 1 pt [plateau], ~1 fois/sem = 3 pts, <1 fois/sem = 4 pts, Jamais/presque jamais = 5 pts) et Q6/NT06 (>2 fois/sem = 1 pt, ~2 fois/sem = 1 pt [plateau], ~1 fois/sem = 3 pts, <1 fois/sem = 4 pts, Jamais = 5 pts), 6 dimensions en `calculation_mode: average`, échelle 12–60 avec 3 catégories (`HABITUDES_FAVORABLES` 12-24, `EQUILIBRE_FRAGILE` 25-32, `HABITUDES_INSUFFISANTES` 33-60), 3 questions Safety hors score NTSF01–NTSF03 déclenchant l'alerte médicale `NUTRITION_SAFETY_MESSAGE` (priorité 100) sans altérer le score numérique brut, sélection des 2 dimensions les plus défavorables, 2 CTAs globaux conformes à la règle de résultat (CTA principal « Je veux faire un bilan » -> `https://lifemetrics.fr/formulaire-bilan/` ; CTA secondaire « Découvrir les autres questionnaires » -> `/tests-sante/`), disclaimers conformes.
- NON DÉTERMINÉ : URL finale de production du catalogue des questionnaires pour le CTA secondaire (chemin planifié documenté : `/tests-sante/`, à confirmer lors du déploiement catalogue).
- Commit : lifemetrics: phase 06 - nutrition v2
- Date : 2026-09-11

---

### PHASE 7 — Pieds & confort postural V2

- Statut : TERMINÉ
- Objectif : Migration exacte depuis le PDF validé pour Pieds & Confort Postural (score 12–60, 3 catégories, 12 questions PF01–12, 6 dimensions, 4 Safety PFSF01–04, guardrail validé PF09/PF10 >= 4, aucune URL non démontrée).
- Règle URL : Intégrer une URL uniquement si elle est réellement connue et démontrée ; sinon indiquer NON DÉTERMINÉ (pas d'URL inventée type /podos360/).
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/questionnaires/pieds-confort-postural/questionnaire.php
  - lifemetrics-questionnaires/tests/questionnaire-pieds-confort-postural.test.php
  - lifemetrics-questionnaires/tests/questionnaire-pieds-confort-postural.test.js
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-pieds-confort-postural.test.php
  - node lifemetrics-questionnaires/tests/questionnaire-pieds-confort-postural.test.js
- Critères de validation :
  - Safety et guardrail validés selon PDF ; tests PHP et JS PASS.

- Fichiers réellement modifiés : `lifemetrics-questionnaires/includes/class-questionnaire-schema-validator.php`, `lifemetrics-questionnaires/includes/class-questionnaire-scoring-engine.php`, `lifemetrics-questionnaires/assets/js/questionnaire-engine.js`, `lifemetrics-questionnaires/questionnaires/pieds-confort-postural/questionnaire.php`, `lifemetrics-questionnaires/tests/questionnaire-pieds-confort-postural.test.php`, `lifemetrics-questionnaires/tests/questionnaire-pieds-confort-postural.test.js`, `lifemetrics-questionnaires/tests/stage11-release-audit.test.php`
- Tests exécutés : `php lifemetrics-questionnaires/tests/questionnaire-pieds-confort-postural.test.php` (PASS), `node lifemetrics-questionnaires/tests/questionnaire-pieds-confort-postural.test.js` (PASS), suites complètes PHP 20/20 (PASS) et JS 11/11 (PASS)
- Résultat : Migration intégrale du questionnaire Pieds & confort postural depuis le PDF final validé (`Score_LifeMetrics_Pieds_Confort_Postural_V1.pdf`). 12 questions scorées PF01–PF12 (points 1 à 5, lower_is_better), 6 dimensions en `calculation_mode: average`, échelle 12–60 avec 3 catégories (`CONFORT_FAVORABLE` 12-24, `CONFORT_A_AMELIORER` 25-32, `INCONFORT_IMPORTANT` 33-60), guardrail fonctionnel validé (PF09 >= 4 ou PF10 >= 4 plafonne la catégorie à `CONFORT_A_AMELIORER` avec message d'attention fonctionnel sans modifier le score numérique brut), 4 questions Safety hors score PFSF01–PFSF04 déclenchant l'alerte médicale `PIEDS_SAFETY_MESSAGE` (priorité 100) sans altérer le score numérique brut, sélection des 2 dimensions les plus défavorables, 2 CTAs globaux conformes à la règle de résultat (CTA principal « Je veux faire un bilan » -> `https://lifemetrics.fr/formulaire-bilan/` ; CTA secondaire « Découvrir les autres questionnaires » -> `/tests-sante/`), disclaimers conformes.
- NON DÉTERMINÉ : URL finale de production du catalogue des questionnaires pour le CTA secondaire (chemin planifié documenté : `/tests-sante/`, à confirmer lors du déploiement catalogue).
- Commit : lifemetrics: phase 07 - pieds confort postural v2
- Date : 2026-09-11

---

### PHASE 8 — Hydratation V2

- Statut : TERMINÉ
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

- Fichiers réellement modifiés : `lifemetrics-questionnaires/questionnaires/hydratation/questionnaire.php`, `lifemetrics-questionnaires/tests/stage11-release-audit.test.php`, `lifemetrics-questionnaires/tests/questionnaire-hydratation.test.php`, `lifemetrics-questionnaires/tests/questionnaire-hydratation.test.js`, `lifemetrics-questionnaires/tests/rest-backend-submission.test.php`
- Tests exécutés : `php lifemetrics-questionnaires/tests/questionnaire-hydratation.test.php` (PASS), `node lifemetrics-questionnaires/tests/questionnaire-hydratation.test.js` (PASS), suites complètes PHP 20/20 (PASS) et JS 11/11 (PASS)
- Résultat : Migration intégrale du questionnaire Hydratation depuis le PDF final validé (`Score_LifeMetrics_Hydratation_V1.pdf`). 12 questions scorées HY01–HY12 (points 1 à 5, lower_is_better), question HY05 avec option N/A (« Non concerné actuellement », `points: null`, `applicable: false`), formule de normalisation arithmétique `final_score = ROUND((raw_score / applicable_question_count) * 12)` strictement vérifiée (11 questions applicables normalisées sur l'échelle 12–60 avec `target_min: 12`, `target_max: 60`), 6 dimensions en `calculation_mode: average`, échelle 12–60 avec 3 catégories (`HABITUDES_FAVORABLES` 12-24, `HYDRATATION_FRAGILE` 25-32, `HABITUDES_INSUFFISANTES` 33-60), 3 questions Safety hors score HYSF01–HYSF03 déclenchant l'alerte médicale `HYDRATATION_SAFETY_MESSAGE` (priorité 100) sans altérer le score numérique brut, sélection des 2 dimensions les plus faibles/défavorables, 2 CTAs globaux conformes à la règle de résultat (CTA principal « Je veux faire un bilan » -> `https://lifemetrics.fr/formulaire-bilan/` ; CTA secondaire « Découvrir les autres questionnaires » -> `/tests-sante/`), disclaimers conformes.
- NON DÉTERMINÉ : URL finale de production du catalogue des questionnaires pour le CTA secondaire (chemin planifié documenté : `/tests-sante/`, à confirmer lors du déploiement catalogue).
- Commit : lifemetrics: phase 08 - hydratation v2
- Date : 2026-09-11

---

### PHASE 9 — Sédentarité V2

- Statut : TERMINÉ
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

- Fichiers réellement modifiés : `lifemetrics-questionnaires/questionnaires/sedentarite/questionnaire.php`, `lifemetrics-questionnaires/tests/stage11-release-audit.test.php`, `lifemetrics-questionnaires/tests/questionnaire-sedentarite.test.php`, `lifemetrics-questionnaires/tests/questionnaire-sedentarite.test.js`
- Tests exécutés : `php lifemetrics-questionnaires/tests/questionnaire-sedentarite.test.php` (PASS), `node lifemetrics-questionnaires/tests/questionnaire-sedentarite.test.js` (PASS), suites complètes PHP 20/20 (PASS) et JS 11/11 (PASS)
- Résultat : Migration intégrale du questionnaire Sédentarité depuis le PDF final validé (`Score_LifeMetrics_Sedentarite_V1.pdf`). 12 questions scorées SD01–SD12 (points 1 à 5, lower_is_better), questions SD07 et SD08 avec option N/A (« Non concerné actuellement » / « Très peu de déplacements actuellement », `points: null`, `applicable: false`), formule de normalisation arithmétique `final_score = ROUND((raw_score / applicable_question_count) * 12)` strictement vérifiée (sur 12, 11 ou 10 questions applicables, normalisées sur l'échelle 12–60 avec `target_min: 12`, `target_max: 60`), exclusion propre de la dimension `travail-etudes-deplacements` lorsque SD07 et SD08 sont tous deux N/A, 6 dimensions en `calculation_mode: average`, échelle 12–60 avec 3 catégories (`HABITUDES_FAVORABLES` 12-24, `SEDENTARITE_A_REDUIRE` 25-32, `SEDENTARITE_ELEVEE` 33-60), guardrail D1 validé (D1 = SD01 + SD02 >= 8 plafonne `displayed_category` à `SEDENTARITE_A_REDUIRE` avec message associé `SEDENTARITE_VOLUME_CAP` tout en conservant `calculated_category` verte et en laissant `final_score` strictement inchangé ; ne force jamais le rouge), 2 CTAs globaux conformes (CTA principal « Je veux faire un bilan » -> `https://lifemetrics.fr/formulaire-bilan/` ; CTA secondaire « Découvrir les autres questionnaires » -> `/tests-sante/`), disclaimers conformes.
- NON DÉTERMINÉ : URL finale de production du catalogue des questionnaires pour le CTA secondaire (chemin planifié documenté : `/tests-sante/`, à confirmer lors du déploiement catalogue).
- Commit : lifemetrics: phase 09 - sedentarite v2
- Date : 2026-09-11

---

### PHASE 10 — Fatigue & récupération V2

- Statut : TERMINÉ
- Objectif : Implémenter fidèlement la configuration validée issue du PDF Fatigue & Récupération (12 questions, points 1 à 5, scoring_direction: lower_is_better, 6 dimensions en calculation_mode: average, 3 catégories 12–24 / 25–32 / 33–60, 3 questions Safety FRSF01–03 hors score, CTAs globaux, disclaimers).
- Règle : Ne pas inventer de N/A, de guardrail ou de règle d'attention supplémentaire absents du PDF.
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/questionnaires/fatigue-recuperation/questionnaire.php
  - lifemetrics-questionnaires/tests/questionnaire-fatigue-recuperation.test.php
  - lifemetrics-questionnaires/tests/questionnaire-fatigue-recuperation.test.js
  - lifemetrics-questionnaires/tests/stage11-release-audit.test.php
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-fatigue-recuperation.test.php
  - node lifemetrics-questionnaires/tests/questionnaire-fatigue-recuperation.test.js
- Critères de validation :
  - Conformité stricte au PDF et tests PHP/JS PASS.

- Fichiers réellement modifiés :
  - lifemetrics-questionnaires/questionnaires/fatigue-recuperation/questionnaire.php
  - lifemetrics-questionnaires/tests/stage11-release-audit.test.php
  - lifemetrics-questionnaires/tests/questionnaire-fatigue-recuperation.test.php
  - lifemetrics-questionnaires/tests/questionnaire-fatigue-recuperation.test.js
- Tests exécutés :
  - php lifemetrics-questionnaires/tests/questionnaire-fatigue-recuperation.test.php (PASS)
  - node lifemetrics-questionnaires/tests/questionnaire-fatigue-recuperation.test.js (PASS)
  - Full suite PHP (20 tests PASS)
  - Full suite JS (14 tests PASS)
- Résultat : Migration V2 complète et rigoureuse du questionnaire Fatigue & Récupération d'après le PDF validé (`Score_LifeMetrics_Fatigue_Recuperation_V1.pdf`). 12 questions scorées de 1 à 5 (lower_is_better), échelle 12 à 60, 3 catégories exactes (12–24: RECUPERATION_FAVORABLE, 25–32: RECUPERATION_FRAGILE, 33–60: FATIGUE_IMPORTANTE), 6 dimensions calculées par moyenne, 3 questions Safety hors score avec code message `FATIGUE_SAFETY_MESSAGE`, CTAs globaux conformes.
- NON DÉTERMINÉ : URL de production du catalogue des questionnaires pour le CTA secondaire (placeholder technique `/tests-sante/`).
- Commit : lifemetrics: phase 10 - fatigue recuperation v2
- Date : 2026-09-11

---

### PHASE 11 — Risque nutritionnel V1

- Statut : TERMINÉ
- Objectif : Nouveau questionnaire : créer sa configuration à partir du PDF final validé (`Score_LifeMetrics_Risque_Nutritionnel_V1.pdf`).
- Contenu requis :
  - 12 questions (RN01 à RN12 scorées de 1 à 5, points 1=favorable, 5=défavorable, lower_is_better, aucun N/A, score 12–60) ;
  - 6 dimensions en `calculation_mode: average` (Appétit et satiété, Réduction des apports, Évolution pondérale, Difficultés à s'alimenter, Symptômes limitants, Accès/autonomie/continuité) ;
  - Guardrail validé sur questions critiques : Si RN03 >= 4 ou RN04 >= 4 ou RN05 >= 4 ou RN08 >= 4, la catégorie verte est plafonnée à `Risque nutritionnel à surveiller` (sans modifier final_score, et sans forcer rouge) ;
  - 4 questions Safety hors score (RNSF01 perte de poids rapide, RNSF02 apports très réduits, RNSF03 déglutition/fausses routes, RNSF04 symptômes empêchant de manger) avec message prioritaire `RN_SAFETY_MESSAGE` ;
  - Axes d'amélioration : 2 dimensions les plus défavorables (orange/rouge), en vert uniquement si moyenne >= 2.50 ;
  - CTAs globaux standardisés (« Je veux faire un bilan » et « Découvrir les autres questionnaires ») ;
  - Textes résultat, funnel VitaScan mesuré et disclaimers complets.
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/questionnaires/risque-nutritionnel/questionnaire.php
  - lifemetrics-questionnaires/includes/class-lifemetrics-plugin.php
  - lifemetrics-questionnaires/tests/questionnaire-risque-nutritionnel.test.php
  - lifemetrics-questionnaires/tests/questionnaire-risque-nutritionnel.test.js
  - lifemetrics-questionnaires/tests/stage11-release-audit.test.php
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-risque-nutritionnel.test.php
  - node lifemetrics-questionnaires/tests/questionnaire-risque-nutritionnel.test.js
- Critères de validation :
  - Configuration valide, scoring conforme, tests PHP/JS PASS.

- Fichiers réellement modifiés :
  - lifemetrics-questionnaires/questionnaires/risque-nutritionnel/questionnaire.php (nouveau fichier créé)
  - lifemetrics-questionnaires/includes/class-lifemetrics-plugin.php
  - lifemetrics-questionnaires/tests/stage11-release-audit.test.php
  - lifemetrics-questionnaires/tests/questionnaire-risque-nutritionnel.test.php (nouveau fichier créé)
  - lifemetrics-questionnaires/tests/questionnaire-risque-nutritionnel.test.js (nouveau fichier créé)
- Tests exécutés :
  - php lifemetrics-questionnaires/tests/questionnaire-risque-nutritionnel.test.php (PASS)
  - node lifemetrics-questionnaires/tests/questionnaire-risque-nutritionnel.test.js (PASS)
  - Full suite PHP (21 tests PASS)
  - Full suite JS (15 tests PASS)
- Résultat : Questionnaire Risque nutritionnel V1 entièrement implémenté et validé conformément au PDF. 12 questions scorées (1..5, échelle 12–60), 6 dimensions calculées par moyenne, 3 catégories (12–24: RISQUE_FAIBLE, 25–32: RISQUE_A_SURVEILLER, 33–60: RISQUE_IMPORTANT), guardrail sur RN03/RN04/RN05/RN08 >= 4 plafonnant le vert à orange sans altérer le score numérique, 4 questions Safety hors score avec message prioritaire, CTAs globaux conformes.
- NON DÉTERMINÉ : URL de production du catalogue des questionnaires pour le CTA secondaire (placeholder technique `/tests-sante/`).
- Commit : lifemetrics: phase 11 - risque nutritionnel v1
- Date : 2026-09-11

---

### PHASE 12 — Bien-être V1

- Statut : TERMINÉ
- Objectif : Nouveau questionnaire : implémenter la version finale validée issue du PDF (`Score_LifeMetrics_Bien_etre_V1.pdf`).
- Contenu requis :
  - 12 questions (BE01 à BE12 scorées de 1 à 5, points 1=favorable, 5=défavorable, lower_is_better, aucun N/A, aucun bloc Safety, échelle 12–60) ;
  - 6 dimensions en `calculation_mode: average` (Satisfaction globale, Équilibre émotionnel, Engagement/intérêt, Maîtrise/capacité à faire face, Sens/accomplissement, Connexion sociale) ;
  - Guardrail dimensionnel validé : Si au moins une dimension a une moyenne >= 4.00 (raw_score >= 8/10), la catégorie verte (`BIEN_ETRE_FAVORABLE`) est plafonnée à `BIEN_ETRE_A_RENFORCER` (*Bien-être à renforcer*), sans modifier `final_score` et sans forcer le rouge. La dimension responsable apparaît obligatoirement dans les axes d'amélioration ;
  - Axes d'amélioration : 2 dimensions les plus défavorables (orange/rouge), en vert uniquement si moyenne >= 2.50 (aucun axe artificiel si tout est < 2.50) ;
  - Absence stricte de bloc Safety (pas de questions psychiatriques/suicide, rôle d'auto-évaluation du bien-être subjectif préservé) ;
  - Parcours d'engagement / suivi validé dans le funnel, CTAs globaux standardisés (« Je veux faire un bilan » et « Découvrir les autres questionnaires ») ;
  - Disclaimers complets issus du PDF.
- Règle de persistance : Le suivi longitudinal métier est une orientation fonctionnelle. Aucune nouvelle architecture de persistance complexe (localStorage, table SQL) n'est créée dans ce MVP.
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/questionnaires/bien-etre/questionnaire.php
  - lifemetrics-questionnaires/includes/class-lifemetrics-plugin.php
  - lifemetrics-questionnaires/tests/questionnaire-bien-etre.test.php
  - lifemetrics-questionnaires/tests/questionnaire-bien-etre.test.js
  - lifemetrics-questionnaires/tests/stage11-release-audit.test.php
- Tests :
  - php lifemetrics-questionnaires/tests/questionnaire-bien-etre.test.php
  - node lifemetrics-questionnaires/tests/questionnaire-bien-etre.test.js
- Critères de validation :
  - Configuration valide, scoring conforme, tests PHP/JS PASS.

- Fichiers réellement modifiés :
  - lifemetrics-questionnaires/questionnaires/bien-etre/questionnaire.php (nouveau fichier créé)
  - lifemetrics-questionnaires/includes/class-lifemetrics-plugin.php
  - lifemetrics-questionnaires/tests/stage11-release-audit.test.php
  - lifemetrics-questionnaires/tests/questionnaire-bien-etre.test.php (nouveau fichier créé)
  - lifemetrics-questionnaires/tests/questionnaire-bien-etre.test.js (nouveau fichier créé)
- Tests exécutés :
  - php lifemetrics-questionnaires/tests/questionnaire-bien-etre.test.php (PASS)
  - node lifemetrics-questionnaires/tests/questionnaire-bien-etre.test.js (PASS)
  - Full suite PHP (22 tests PASS)
  - Full suite JS (16 tests PASS)
- Résultat : Questionnaire Bien-être V1 entièrement implémenté et validé conformément au PDF. 12 questions scorées (1..5, échelle 12–60), 6 dimensions calculées par moyenne, 3 catégories (12–24: BIEN_ETRE_FAVORABLE, 25–32: BIEN_ETRE_A_RENFORCER, 33–60: BIEN_ETRE_FRAGILISE), guardrail dimensionnel sur moyenne >= 4.00 plafonnant le vert à orange sans altérer le score numérique, aucun bloc Safety, CTAs globaux conformes.
- NON DÉTERMINÉ : URL de production du catalogue des questionnaires pour le CTA secondaire (placeholder technique `/tests-sante/`), ainsi que l'infrastructure de suivi longitudinal futur pour le parcours (« Suivre l'évolution de mon bien-être »).
- Commit : lifemetrics: phase 12 - bien-etre v1
- Date : 2026-09-11

---

### PHASE 13 — Restitution frontend finale

- Statut : TERMINÉ
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
  - node lifemetrics-questionnaires/tests/frontend-restitution-phase13.test.js
  - node lifemetrics-questionnaires/tests/shared-frontend.test.js
  - node lifemetrics-questionnaires/tests/hydratation-ui-flow-regression.test.js
- Critères de validation :
  - Rendu fidèle et hiérarchisé sans régression d'affichage sur desktop et mobile.

- Fichiers réellement modifiés :
  - `lifemetrics-questionnaires/assets/css/questionnaire.css`
  - `lifemetrics-questionnaires/assets/js/questionnaire-ui.js`
  - `lifemetrics-questionnaires/tests/frontend-restitution-phase13.test.js`
  - `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés :
  - `node lifemetrics-questionnaires/tests/frontend-restitution-phase13.test.js` (PASS)
  - `node lifemetrics-questionnaires/tests/shared-frontend.test.js` (PASS)
  - `node lifemetrics-questionnaires/tests/hydratation-ui-flow-regression.test.js` (PASS)
  - Full suite PHP (23/23 PASS)
  - Full suite JS (19/19 PASS)
- Résultat : Restitution frontend partagée consolidée :
  1. Intro : Surcharge visuelle réduite, espacements resserrés et lisibilité maximale des descriptions (largeur max 38rem, line-height 1.65, structuration des paragraphes).
  2. Badges Intro : Ajout d'icônes SVG intégrées (Anonyme, Sécurisé, Durée) alignées et compactes sans dépendance externe.
  3. Questions : Typographie stabilisée et homogénéisée (`clamp(1.125rem, 2.5vw, 1.35rem)`, weight 600, line-height 1.45) indépendamment de la longueur du texte.
  4. Restitution : Titre « Mon résultat » mis en valeur avec séparateur subtil en dégradé brandé LifeMetrics.
  5. Catégories : Restauration des couleurs sémantiques claires (vert favorable / orange intermédiaire / rouge défavorable) selon `displayed_category`, couvrant fidèlement les transitions avec guardrails (ex. vert calculé -> orange affiché).
  6. Textes d'analyse longs : Espacement aéré et padding équilibré pour un confort de lecture optimal.
  7. CTAs de résultat : Suppression totale du soulignement sur tous les états (`normal`, `visited`, `hover`, `focus`, `active`) avec conservation du focus visible accessible et garantie de 2 CTAs principaux uniques.
- NON DÉTERMINÉ : URL finale de production du catalogue des questionnaires pour le CTA secondaire (placeholder technique `/tests-sante/`).
- Commit : lifemetrics: phase 13 - restitution frontend finale
- Date : 2026-09-11

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

### 2026-09-11 — Note d'invalidation : PHASES 4 à 7 remises À FAIRE
- Statut : INVALIDÉ / REMIS À FAIRE
- Motif : Suite à la comparaison détaillée avec les PDF finaux validés, les anciens enregistrements de validation des Phases 4, 5, 6 et 7 ont été invalidés car ils contredisaient les spécifications méthodologiques des PDF (échelle 12–60 et 3 catégories au lieu de 0–48 et 4 catégories, points Q1 Sommeil 1 et 2 au lieu de 4 et 3, guardrail PF09/PF10 >= 4, absence d'URL /podos360/ validée).
- Action : Les Phases 4, 5, 6 et 7 sont remises au statut À FAIRE pour une migration réelle ligne par ligne depuis les PDF finaux validés.

### 2026-09-11 — PHASE 4 — Activité physique V2
- Statut : TERMINÉ
- Fichiers modifiés : `lifemetrics-questionnaires/questionnaires/activite-physique/questionnaire.php`, `lifemetrics-questionnaires/tests/questionnaire-activite-physique.test.php`, `lifemetrics-questionnaires/tests/questionnaire-activite-physique.test.js`, `lifemetrics-questionnaires/tests/stage11-release-audit.test.php`
- Tests exécutés : `php lifemetrics-questionnaires/tests/questionnaire-activite-physique.test.php` (PASS), `node lifemetrics-questionnaires/tests/questionnaire-activite-physique.test.js` (PASS), suite complète PHP 20/20 (PASS), suite complète JS 11/11 (PASS)
- Résultat : Migration rigoureuse du questionnaire Activité physique depuis le PDF final validé (`Score_LifeMetrics_Activite_Physique_V1.pdf`). 12 questions AP01–AP12 (points 1 à 5, lower_is_better), duplication 1 pt sur AP04 (3+ jours = 1 pt, 2 jours = 1 pt), 5 dimensions en `calculation_mode: average`, échelle 12–60 avec 3 catégories (`SATISFAISANTE` 12-24, `A_RENFORCER` 25-32, `INSUFFISANTE` 33-60), sélection des 2 dimensions les plus défavorables, intégration des 2 CTAs globaux (CTA principal « Je veux faire un bilan » -> `https://lifemetrics.fr/formulaire-bilan/` ; CTA secondaire « Découvrir les autres questionnaires » -> `/tests-sante/`), disclaimers conformes. Zéro régression sur le reste du plugin et PSS-10.
### 2026-09-11 — PHASE 5 — Sommeil V2
- Statut : TERMINÉ
- Fichiers modifiés : `lifemetrics-questionnaires/questionnaires/sommeil/questionnaire.php`, `lifemetrics-questionnaires/tests/questionnaire-sommeil.test.php`, `lifemetrics-questionnaires/tests/questionnaire-sommeil.test.js`, `lifemetrics-questionnaires/tests/stage11-release-audit.test.php`, `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés : `php lifemetrics-questionnaires/tests/questionnaire-sommeil.test.php` (PASS), `node lifemetrics-questionnaires/tests/questionnaire-sommeil.test.js` (PASS), suite complète PHP 20/20 (PASS), suite complète JS 11/11 (PASS)
- Résultat : Migration rigoureuse du questionnaire Sommeil depuis le PDF final validé (`Score_LifeMetrics_Sommeil_V1.pdf`). 12 questions scorées SL01–SL12 (points 1 à 5, lower_is_better), barème exact SL01 (7-9h = 1 pt, >9h = 2 pts, 6-7h = 3 pts, 5-6h = 4 pts, <5h = 5 pts), 3 questions Safety hors score SLSF01–SLSF03 déclenchant l'alerte médicale `SOMMEIL_SAFETY_MESSAGE` sans altération du score brut, 5 dimensions en `calculation_mode: average`, échelle 12–60 avec 3 catégories (`SATISFAISANT` 12-24, `ENCORE_FRAGILE` 25-32, `PERTURBE` 33-60), sélection des 2 dimensions les plus défavorables, intégration des 2 CTAs globaux (CTA principal « Je veux faire un bilan » -> `https://lifemetrics.fr/formulaire-bilan/` ; CTA secondaire « Découvrir les autres questionnaires » -> `/tests-sante/`), disclaimers conformes. Zéro régression sur le reste du plugin et PSS-10.
- Notes : Prêt pour la Phase 6 (Nutrition V2).

### 2026-09-11 — PHASE 13 — Restitution frontend finale
- Statut : TERMINÉ
- Fichiers modifiés : `lifemetrics-questionnaires/assets/css/questionnaire.css`, `lifemetrics-questionnaires/assets/js/questionnaire-ui.js`, `lifemetrics-questionnaires/tests/frontend-restitution-phase13.test.js`, `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés : `node lifemetrics-questionnaires/tests/frontend-restitution-phase13.test.js` (PASS), suite complète PHP 23/23 (PASS), suite complète JS 19/19 (PASS)
- Résultat : Restitution frontend globale optimisée :
  1. Intro : Surcharge visuelle réduite, espacement équilibré, structuration nette des paragraphes.
  2. Badges Intro : Icônes vectorielles SVG légères et accessibles (Anonyme, Sécurisé, Durée).
  3. Questions : Typographie homogénéisée et stable indépendamment de la longueur du texte.
  4. Mon résultat : Titre valorisé avec séparateur stylisé.
  5. Catégories : Couleurs sémantiques (vert/orange/rouge) restaurées et liées à `displayed_category` (incluant les garde-fous).
  6. Textes longs : Confort de lecture optimal (line-height 1.7, padding aéré).
  7. CTAs : Suppression stricte du soulignement sur tous les états avec focus visible préservé.
- Notes : Prêt pour la Phase 14 (Vérification transport et Google Sheets).

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
- pour les phases 4 à 12, ne valide jamais le questionnaire à partir des tests existants seulement. Compare obligatoirement le questionnaire.php au PDF final validé et migre réellement son contenu si une différence existe ;
- pas de modification du PSS-10 sauf nécessité de non-régression ;
- pas de modification d'une phase future sauf moteur partagé strictement nécessaire ;
- ne jamais écraser les modifications utilisateur existantes ;
- ne jamais utiliser de commande Git destructive ;
- si une donnée est inconnue : NON DÉTERMINÉ.

Si la phase est déjà entièrement satisfaite par le code existant :
- le démontrer par inspection et tests (pour les phases 4 à 12 : comparaison ligne par ligne avec le PDF final démontrant une conformité stricte à 100%) ;
- mettre le plan à jour ;
- la marquer terminée si tous ses critères sont réellement remplis ;
- faire le commit du plan/tests nécessaires uniquement ;
- ne pas réécrire du code inutilement.

À la fin réponds avec :

# PHASE EXECUTION REPORT
- Phase exécutée :
- Statut final :
- État initial (ancien état trouvé) :
- Différences avec le PDF (pour phases 4 à 12) :
- Modifications nécessaires identifiées (contenu réellement remplacé) :
- Fichiers modifiés (questionnaire.php réellement vérifié/modifié) :
- Tests exécutés / adaptés à la nouvelle version :
- Résultats :
- NON DÉTERMINÉ :
- Commit :
- Prochaine phase :
- Confirmation qu'aucune phase supplémentaire n'a été commencée.

