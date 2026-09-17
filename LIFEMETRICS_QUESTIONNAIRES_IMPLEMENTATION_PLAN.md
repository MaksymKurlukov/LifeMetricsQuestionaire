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
| 14 | Vérification transport et Google Sheets | TERMINÉ |
| 15 | Full Regression Test | TERMINÉ |
| 16 | WordPress Release ZIP | TERMINÉ |

---

## État actuel du projet

- Phase actuelle : WORK-19 — Réconciliation documentaire (TERMINÉ — 17 septembre 2026)
- Dernière phase terminée : WORK-19 — Réconciliation documentaire (17 septembre 2026)
- Prochaine étape : WORK-23 — Revue finale / remise à Camille (À FAIRE)
- Blocages : Aucun
- Nombre de phases terminées : 16 / 16 (100% du plan de développement validé) + WORK-19 terminé
- Nombre de phases restantes : 0 (toutes les phases 1 à 16 sont terminées)
- Derniers commits de release : 1a479e2 (docs(release): close phase 16 with 10/10 wordpress local validation) et 70be774 (docs(release): correct phase 16 validation summary)
- Livrable final : lifemetrics-questionnaires.zip (certifié, audité, testé de bout en bout sur WordPress local MAMP)
- Tableau Notion synchronisé : https://app.notion.com/p/3da507fddb678146b412ffe3a733ea0f

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
   - includes/class-submission-service.php : Construction du payload JSON canonique avec recalcul autoritaire côté serveur.
   - includes/class-google-apps-script-adapter.php : Adaptateur HTTP gérant les redirections 302 Google Apps Script et l'idempotence via session_id.
   - Deux Web Apps Google Apps Script étanches et isolées :
     * backend/google-apps-script.gs : Web App PSS-10 legacy dédiée (LMQ_PSS10_GOOGLE_ENDPOINT), écrivant 24 colonnes physiques enrichies dans l'onglet PSS10 ;
     * backend/generic-google-apps-script.gs : Web App générique pour les 9 questionnaires propriétaires (LMQ_GOOGLE_ENDPOINT), écrivant dans leurs 9 onglets dédiés (31 à 36 colonnes).
6. Interface Frontend Générique :
   - templates/questionnaire.php : Template DOM partagé à 3 écrans (intro, test, result).
   - assets/js/questionnaire-ui.js : Navigation, auto-avancement (400 ms), timeout 25s, gestion du retry.
   - assets/css/questionnaire.css : Système visuel partagé.
7. Outillage & Tests :
   - scripts/build-release-zip.sh : Script Bash de build du ZIP canonique (lifemetrics-questionnaires.zip).
   - 23 suites PHP et 19 suites JS exécutables localement (42/42 suites PASS, 100% de succès).

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

### 9. Règle de gel UI / UI Freeze after WORK-17
- Le frontend validé après le commit `75dc058` constitue la baseline UI officielle.
- Phase 14+ ne doit pas modifier l’interface utilisateur (templates visuels, CSS, structure visuelle, jauge, cartes, boutons, CTAs, typographie, responsive, layout, animations, textes visibles validés).
- Toute modification visuelle future doit faire l’objet d’une tâche explicitement dédiée.
- Le prochain travail de design/polish sera réalisé séparément par Camille.
- PSS-10 de `main` reste la référence visuelle historique.
- Si un problème de transport semble nécessiter une modification UI : NE PAS LA FAIRE. Documenter le problème et le marquer comme blocage / décision nécessaire.
- Cette règle n'interdit pas les corrections backend, transport, tests ou sécurité.

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

### PHASE 13 — Restitution frontend finale & Redesign UX/UI

- Statut : TERMINÉ
- Objectif : Harmoniser et moderniser l'expérience utilisateur et l'interface de restitution sur l'ensemble des 10 questionnaires (9 questionnaires propriétaires V2 + PSS-10), en respectant scrupuleusement la méthodologie validée et en intégrant les conclusions de l'Independent UX/UI Design Review.
- Alignement visuel WORK-17 : Restauration fidèle du style historique de la branche `main` (polices Syne & Plus Jakarta Sans, cartes réponses crème `#f5f0e8`, boutons hero avec effet sweep `::before`, badges résultat pastel, espacements respiratoires, pas d'indicateurs radio artificiels).
- Baseline UI gelée : Validée au commit `75dc058` (`fix(ui): finalize questionnaire visual corrections`). L'UI/UX est désormais strictement FROZEN pour les phases 14, 15 et 16.
- Fichiers modifiés :
  - `lifemetrics-questionnaires/templates/questionnaire.php`
  - `lifemetrics-questionnaires/assets/css/questionnaire.css`
  - `lifemetrics-questionnaires/assets/js/questionnaire-ui.js`
  - `lifemetrics-questionnaires/tests/frontend-restitution-phase13.test.js`
- Tests exécutés :
  - Full suite PHP (23 tests PASS)
  - Full suite JS (19 tests PASS)
  - Full Chrome CDP Browser Audit Matrix (10/10 questionnaires, 3 viewports: ALL PASSED)
- Commit initial : `lifemetrics: phase 13 - ux ui redesign` (2026-09-11)
- Commit de finalisation & freeze UI : `75dc058 fix(ui): finalize questionnaire visual corrections` (2026-09-14)

---

### PHASE 14 — Transport et Google Sheets

- Statut global : TERMINÉ (2026-09-15)
- Objectif : Valider, sécuriser et tester de bout en bout l'ensemble de la chaîne de transport des 10 questionnaires (Frontend -> REST WordPress -> Autorité Serveur -> Submission Service -> Google Apps Script -> Google Sheets), tout en respectant strictement le gel de l'UI validée au commit `75dc058`.
- Règle PSS-10 : Le questionnaire PSS-10 conserve son transport et runtime historiques isolés (`LMQ_PSS10_GOOGLE_ENDPOINT`, onglet `PSS10`, payload plat q1..q10).
- Règle UI Freeze : Aucune modification des templates, CSS, HTML, balises, scripts visuels ou textes de l'interface utilisateur.

#### Sous-étapes d'exécution de la Phase 14

##### Sous-étape 14.1 — Complétion des schémas Google Apps Script (`risque-nutritionnel` & `bien-etre`)
- Statut : TERMINÉ (2026-09-15)
- Objectif : Ajouter les définitions complètes de schémas pour `risque-nutritionnel` et `bien-etre` dans le Web App Google Apps Script central.
- Fichiers concernés : `lifemetrics-questionnaires/backend/generic-google-apps-script.gs`
- Résultat :
  1. Schéma `risque-nutritionnel` ajouté : `sheetName: 'Risque_Nutritionnel'`, `hasSafety: true`, 12 questions scorées canoniques RN01–RN12, 4 questions de sécurité canoniques RNSF01–RNSF04 (36 colonnes physiques).
  2. Schéma `bien-etre` ajouté : `sheetName: 'Bien_Etre'`, `hasSafety: false`, 12 questions scorées canoniques BE01–BE12, 0 question de sécurité (31 colonnes physiques).
  3. Alias ajoutés dans `QUESTIONNAIRE_ALIASES` : `'risque_nutritionnel': 'risque-nutritionnel'`, `'bien_etre': 'bien-etre'`.
- Tests ciblés & non-régression :
  - `node lifemetrics-questionnaires/tests/backend-logic.test.js` : PASS
  - `node lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js` : PASS
  - Smoke tests GAS `getSchema`, `getTargetSheetName`, `getHeaderList` : PASS (RN=36 colonnes, BE=31 colonnes)
  - Suites complètes : 23/23 PHP PASS, 19/19 JS PASS
- Date de complétion : 2026-09-15
- Dépendances : Aucune.
- Risque : Faible.
- Automatisation : 100% automatisable.

##### Sous-étape 14.2 — Audits du format de stockage physique Google Sheets (PHP & JS)
- Statut : TERMINÉ (2026-09-15)
- Objectif : Étendre les suites d'audit physique des feuilles Google Sheets pour couvrir les 9 questionnaires propriétaires V2 (dont `risque-nutritionnel` et `bien-etre`).
- Fichiers concernés :
  - `lifemetrics-questionnaires/tests/google-sheets-storage-format.test.php`
  - `lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js`
- Résultat :
  1. Test PHP étendu : validation rigoureuse des 9 questionnaires propriétaires (dont `risque-nutritionnel` à 36 colonnes et `bien-etre` à 31 colonnes), vérification des questions, dimensions, types, labels autoritaires et absence de points sur questions Safety.
  2. Test JS étendu : validation des en-têtes physiques générés pour les 9 questionnaires, confirmation de l'absence de colonnes techniques résiduelles, tests d'insertion doPost simulés avec succès pour `risque-nutritionnel` (avec `safety_attention = Oui`) et `bien-etre` (31 colonnes).
- Tests exécutés :
  - `php lifemetrics-questionnaires/tests/google-sheets-storage-format.test.php` : PASS (9/9 questionnaires)
  - `node lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js` : PASS (9/9 questionnaires)
  - Suites complètes : 23/23 PHP PASS, 19/19 JS PASS
- Date de complétion : 2026-09-15
- Dépendances : 14.1.
- Risque : Faible.
- Automatisation : 100% automatisable.

##### Sous-étape 14.3 — Intégrité du routage d'endpoint et de découverte (10 questionnaires)
- Statut : TERMINÉ (2026-09-15)
- Objectif : Vérifier que tous les 10 questionnaires résolvent autoritairement leurs endpoints respectifs et sont protégés contre la découverte publique non autorisée.
- Fichiers concernés :
  - `lifemetrics-questionnaires/tests/backend-routing.test.php`
  - `lifemetrics-questionnaires/tests/backend-logic.test.js`
- Résultat :
  1. Résolution autoritaire d'endpoints vérifiée sur les 10 questionnaires (BACK-001/002) : PSS-10 isolé vers `LMQ_PSS10_GOOGLE_ENDPOINT`, 9 questionnaires propriétaires (dont `risque-nutritionnel` et `bien-etre`) routés vers le Web App central `LMQ_GOOGLE_ENDPOINT`.
  2. Tests de contournement et de sécurité validés (BACK-003 à BACK-011) : filtres dynamiques, rejet d'instruments inconnus, redirections sûres 302/307, blocage strict anti-SSRF sur redirections malveillantes, gestion des erreurs réseau/HTTP/rejet, idempotence duplicate.
  3. Flux complets de soumission multi-destinations validés (BACK-012, BACK-012b, BACK-012c) : confirmation de l'émission des requêtes vers le bon endpoint avec payload structuré pour PSS-10, `risque-nutritionnel` et `bien-etre`.
  4. Validation JS `backend-logic.test.js` : tests allowlist `getTargetSheetName` et `getSchema` validés sur les 10 questionnaires et leurs aliases.
- Tests exécutés :
  - `php lifemetrics-questionnaires/tests/backend-routing.test.php` : PASS (BACK-001 à BACK-012c)
  - `node lifemetrics-questionnaires/tests/backend-logic.test.js` : PASS
  - Suites complètes : 23/23 PHP PASS, 19/19 JS PASS
- Date de complétion : 2026-09-15
- Dépendances : 14.1.
- Risque : Faible.
- Automatisation : 100% automatisable.

##### Sous-étape 14.4 — Résistance globale aux falsifications et autorité serveur (10 questionnaires)
- Statut : TERMINÉ (2026-09-15)
- Objectif : Garantir qu'aucune valeur sensible (score, catégorie, dimensions, drapeaux) transmise par le client ne peut être falsifiée, sur l'ensemble des 10 questionnaires.
- Fichiers concernés :
  - `lifemetrics-questionnaires/tests/global-tamper-resistance.test.php`
  - `lifemetrics-questionnaires/tests/rest-backend-submission.test.php`
- Résultat :
  1. Matrice de tamper-resistance étendue aux 10 questionnaires (PSS-10 + 9 propriétaires dont `risque-nutritionnel` et `bien-etre`).
  2. Vérification du rejet catégorique de l'ensemble des claims clients falsifiés : scores injectés (9999), catégories forgées (`FORGED_MAX_CATEGORY`), dimensions ou drapeaux non autorisés, fausses feuilles de destination.
  3. Garantie de l'autorité serveur absolue : le serveur recalcule tout indépendamment depuis les réponses brutes avant transmission sécurisée vers Google Apps Script / Google Sheets.
- Tests exécutés :
  - `php lifemetrics-questionnaires/tests/global-tamper-resistance.test.php` : PASS (10/10 questionnaires)
  - `php lifemetrics-questionnaires/tests/rest-backend-submission.test.php` : PASS (10/10 questionnaires)
  - Suites complètes : 23/23 PHP PASS, 19/19 JS PASS
- Date de complétion : 2026-09-15
- Dépendances : 14.1, 14.3.
- Risque : Faible.
- Automatisation : 100% automatisable.

##### Sous-étape 14.5 — Sérialisation et transport des questions & drapeaux Safety
- Statut : TERMINÉ (2026-09-15)
- Objectif : Confirmer que les questions Safety des 6 questionnaires propriétaires concernés (Sommeil, Nutrition, Pieds & confort postural, Hydratation, Fatigue & récupération, Risque nutritionnel) sont sérialisées avec labels clairs, sans points, sans altération du score numérique, et avec calcul serveur rigoureux de la colonne `safety_attention`.
  - 6 questionnaires propriétaires avec questions Safety : Sommeil (3 questions), Nutrition (3 questions), Pieds & confort postural (4 questions), Hydratation (3 questions), Fatigue & récupération (3 questions), Risque nutritionnel (4 questions).
  - Absence stricte de bloc Safety sur : Bien-être (0), Activité physique (0), Sédentarité (0).
- Fichiers concernés :
  - `lifemetrics-questionnaires/includes/class-submission-service.php`
  - `lifemetrics-questionnaires/tests/google-sheets-storage-format.test.php`
  - `lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js`
- Modification nécessaire : Ajouter des tests de non-régression explicites vérifiant que `safety_attention` prend la valeur "Oui" si un trigger est actif et "Non" sinon, et qu'aucun point numérique n'est jamais attribué.
- Tests exécutés :
  - `php lifemetrics-questionnaires/tests/google-sheets-storage-format.test.php` : Section 8 PASS (6 questionnaires safety testés sans pollution, 3 questionnaires sans safety vérifiés à 0 question/message, zero-score-pollution certifiée)
  - `node lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js` : Tests H & I PASS (`safety_attention` = "Non" quand flags vides, absence stricte de colonne `safety_attention` dans schemas/headers pour Sédentarité, Activité physique, Bien-être)
  - Suites complètes : 23/23 PHP PASS, 19/19 JS PASS
- Date de complétion : 2026-09-15
- Dépendances : 14.1, 14.2.
- Risque : Faible.
- Automatisation : 100% automatisable.

##### Sous-étape 14.6 — Audit du transport N/A et normalisation du score
- Statut : TERMINÉ (2026-09-15)
- Objectif : Confirmer que les options N/A d'Hydratation (HY05) et de Sédentarité (SD07, SD08) transmettent des chaînes vides `""` dans la colonne Points sans introduire de décalage de colonnes, et que le score est normalisé selon la formule méthodologique validée de référence :
  `final_score = ROUND((raw_score / applicable_question_count) * 12)`
  Ne pas la remplacer dans la documentation ou les critères de validation par `round((raw_score / available_max) * 60)`. Cette formule validée reste la source de vérité et doit être celle explicitement vérifiée.
- Fichiers concernés :
  - `lifemetrics-questionnaires/includes/class-submission-service.php`
  - `lifemetrics-questionnaires/backend/generic-google-apps-script.gs`
  - `lifemetrics-questionnaires/tests/google-sheets-storage-format.test.php`
  - `lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js`
- Modification nécessaire : Valider dans les tests de stockage que le cas N/A écrit le libellé dans la colonne texte et laisse la colonne de points vide (`""`), et vérifier explicitement que le calcul du score normalisé respecte strictement la formule de référence `final_score = ROUND((raw_score / applicable_question_count) * 12)`.
- Tests exécutés :
  - `php lifemetrics-questionnaires/tests/google-sheets-storage-format.test.php` : Section 9 PASS (Audit inventaire global N/A : HY05, SD07, SD08 uniquement ; formule de normalisation de référence `final_score = ROUND((raw_score / applicable_question_count) * 12)` rigoureusement confirmée pour Hydratation et Sédentarité sur toutes les valeurs uniformes et combinées ; sérialisation N/A `applicable: false`, `points: null`, labels conformes)
  - `node lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js` : Test J PASS (Vérification physique des lignes Google Sheets : Col 12 HY05 = `""`, Col 16 SD07 = `""`, Col 18 SD08 = `""`, zéro décalage de colonnes, total 35 colonnes Hydratation, total 31 colonnes Sédentarité ; validation mathématique de l'équivalence universelle avec `Math.round((raw / count) * 12)`)
  - Suites complètes : 23/23 PHP PASS, 19/19 JS PASS
- Date de complétion : 2026-09-15
- Dépendances : 14.2.
- Risque : Faible.
- Automatisation : 100% automatisable.

##### Sous-étape 14.7 — Vérification du transport des guardrails et de la catégorie affichée
- Statut : TERMINÉ (2026-09-15)
- Objectif : Valider que pour les 4 questionnaires avec guardrails (Pieds & confort postural, Sédentarité, Risque nutritionnel, Bien-être), le transport transmet à la fois `calculated_category` et `displayed_category`, et que le tableur stocke la catégorie affichée sans altérer le score numérique.
  - **Sédentarité** : Le guardrail validé n'est PAS `SD01 >= 4`. La règle validée est : `D1 = SD01 + SD02`. Si `D1 >= 8` ET que `calculated_category` est verte (`HABITUDES_FAVORABLES`), alors `displayed_category` est plafonnée à la catégorie orange `SEDENTARITE_A_REDUIRE`. Le `final_score` reste inchangé. Le guardrail ne doit jamais forcer une catégorie rouge.
  - **Pieds & confort postural** : Guardrail fonctionnel (PF09 ou PF10 >= 4 plafonne à `CONFORT_A_AMELIORER` orange sans altérer le score brut).
  - **Risque nutritionnel** : Guardrails RN03, RN04, RN05, RN08 >= 4 plafonnent à `RISQUE_A_SURVEILLER` orange sans altérer le score brut.
  - **Bien-être** : Guardrail dimensionnel (moyenne dimension >= 4.00 plafonne le vert à `BIEN_ETRE_A_RENFORCER` orange sans altérer le score brut).
- Fichiers concernés :
  - `lifemetrics-questionnaires/includes/class-submission-service.php`
  - `lifemetrics-questionnaires/backend/generic-google-apps-script.gs`
  - `lifemetrics-questionnaires/tests/rest-backend-submission.test.php`
  - `lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js`
- Modification nécessaire : Tester les cas de déclenchement des garde-fous (dont spécifiquement `D1 = SD01 + SD02 >= 8` plafonnant à `SEDENTARITE_A_REDUIRE` pour Sédentarité) et vérifier les valeurs écrites dans la colonne `category`.
- Tests exécutés :
  - `php lifemetrics-questionnaires/tests/rest-backend-submission.test.php` : Section 8 PASS (Validation des 4 questionnaires à guardrails : Sédentarité `D1 = SD01 + SD02 >= 8` plafonne à `SEDENTARITE_A_REDUIRE` sans forcer le rouge et sans altérer raw/final score 18 ; Pieds PF09 >= 4 plafonne à `CONFORT_A_AMELIORER` score 15 intact ; RN03 >= 4 plafonne à `RISQUE_A_SURVEILLER` score 15 intact ; Bien-être dimension raw >= 8 plafonne à `BIEN_ETRE_A_RENFORCER` score 18 intact ; transmission conjointe de `calculated_category`, `displayed_category` et `applied_classification_rules`)
  - `node lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js` : Test K PASS (Vérification physique dans Google Sheets : stockage effectif de la catégorie plafonnée dans la colonne `category` pour les 4 questionnaires avec préservation stricte des scores numériques et sans altération des métriques)
  - Suites complètes : 23/23 PHP PASS, 19/19 JS PASS
- Date de complétion : 2026-09-15
- Dépendances : 14.4.
- Risque : Faible.
- Automatisation : 100% automatisable.

##### Sous-étape 14.8 — Vérification de l'idempotence, du session_id et du rate limiting
- Statut : TERMINÉ (2026-09-15)
- Objectif : Valider le mécanisme anti-doublon (idempotence) sur requêtes répétées, doubles-clics, retries réseau, et expiration de lock.
- Fichiers concernés :
  - `lifemetrics-questionnaires/includes/class-google-apps-script-adapter.php`
  - `lifemetrics-questionnaires/backend/generic-google-apps-script.gs`
  - `lifemetrics-questionnaires/tests/backend-routing.test.php`
  - `lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js`
- Modification nécessaire : Ajouter des cas de tests reproduisant l'envoi répété d'un même `session_id` pour confirmer la réponse `{ success: true, duplicate: true }` sans écriture redondante, tester le rate limiting et l'expiration de lock.
- Tests exécutés :
  - `php lifemetrics-questionnaires/tests/backend-routing.test.php` : BACK-013 à BACK-017 PASS (Soumission répétée avec `session_id` identique renvoie `{ success: true, duplicate: true }` ; erreur amont `rate_limited` renvoie `lmq_upstream_rejected` 502 ; erreur `lock_timeout` renvoie `lmq_upstream_rejected` 502 ; timeout réseau renvoie `lmq_upstream_network_error` 502 ; réponse amont non-JSON renvoie `lmq_upstream_rejected` 502)
  - `node lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js` : Test L PASS (Idempotence multi-réémissions : 5 appels avec `session_id` identique insèrent exactement 1 ligne, les appels 2 à 5 renvoient `{ ok: true, duplicate: true }` avec 0 ligne dupliquée ajoutée ; rate limiting `CacheService` renvoie `{ ok: false, code: 'rate_limited' }` avec 0 ligne insérée ; expiration de lock `LockService` renvoie `{ ok: false, code: 'lock_timeout' }` avec 0 ligne insérée)
  - Suites complètes : 23/23 PHP PASS, 19/19 JS PASS
- Critères d'acceptation : Zéro ligne dupliquée dans le tableur lors de réémissions du même `session_id`.
- Date de complétion : 2026-09-15
- Dépendances : 14.1.
- Risque : Faible.
- Automatisation : 100% automatisable.

##### Sous-étape 14.9 — Neutralisation systématique des injections de formules
- Statut : TERMINÉ (2026-09-15)
- Objectif : Valider la neutralisation systématique des caractères de formules Google Sheets (`=`, `+`, `-`, `@`) sur tous les champs textuels des payloads.
- Fichiers concernés :
  - `lifemetrics-questionnaires/backend/generic-google-apps-script.gs`
  - `lifemetrics-questionnaires/tests/backend-logic.test.js`
  - `lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js`
- Modification nécessaire : S'assurer que chaque valeur textuelle insérée dans une cellule passe par `safeSheetText()` et est préfixée d'une apostrophe si elle commence par un caractère de formule (y compris avec espaces ou retours à la ligne initiaux).
- Tests exécutés :
  - `node lifemetrics-questionnaires/tests/backend-logic.test.js` : PASS (Validation unitaire exhaustive de `safeSheetText` sur l'ensemble des déclencheurs `=+-@`, espaces initiaux, tabulations, retours à la ligne, vecteurs d'attaque `IMPORTXML`, `HYPERLINK`, `cmd|calc`, textes sûrs préservés sans apostrophe, et préservation des textes déjà échappés sans double échappement)
  - `node lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js` : Test M PASS (Validation d'injection de payload complet sur `sommeil` avec formules sur version, libellés de questions scorées et de sécurité, catégorie et scores non numériques : neutralisation systématique confirmée sur chaque cellule de la ligne physique sans altérer la structure des 35 colonnes)
  - Suites complètes : 23/23 PHP PASS, 19/19 JS PASS
- Critères d'acceptation : Aucun texte commençant par `=+-@` ne peut s'exécuter comme formule dans Google Sheets.
- Date de complétion : 2026-09-15
- Dépendances : 14.1.
- Risque : Faible.
- Automatisation : 100% automatisable.

##### Sous-étape 14.10 — Isolation du transport PSS-10 legacy et certification globale
- Statut : TERMINÉ (2026-09-15)
- Objectif : Certifier la non-régression absolue du transport PSS-10 historique et valider l'ensemble de la suite de tests (PHP + JS) à 100% de succès.
- Fichiers concernés :
  - `lifemetrics-questionnaires/tests/pss10-rest-characterization.test.php`
  - `lifemetrics-questionnaires/tests/pss10-frontend-characterization.test.js`
  - Toutes les 23 suites PHP et 19 suites JS.
- Tests exécutés :
  - `php lifemetrics-questionnaires/tests/pss10-rest-characterization.test.php` : PASS (Contrat backend REST complet, validation 10-50, inversion Q4/5/7/8, autorité serveur, redirects 302 sécurisés sur `script.googleusercontent.com`, résilience réseau/HTTP/rejet amont, isolation des IDs d'instance DOM)
  - `node lifemetrics-questionnaires/tests/pss10-frontend-characterization.test.js` : PASS (13 gardes de mutation frontend PSS-10 vérifiés avec succès, étanchéité de l'UI et du transport legacy)
  - Suite de régression complète PHP : 23/23 tests PASS (100%)
  - Suite de régression complète JS : 19/19 tests PASS (100%)
- Critères d'acceptation : 23/23 tests PHP PASS, 19/19 tests JS PASS, 0 régression PSS-10, Phase 14 validée et clôturée.
- Date de complétion : 2026-09-15
- Dépendances : 14.1 à 14.9.
- Risque : Faible.
- Automatisation : 100% automatisable.

---

### AUTOMATED EXECUTION CONTRACT

Ce protocole régit l'exécution automatisée des sous-étapes de la Phase 14 lors des prochains runs.
À chaque prompt demandant : « Exécute la prochaine sous-étape non terminée de Phase 14 », l'assistant doit :

1. **Lecture du plan** : Lire `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md` et identifier la première sous-étape (14.1 à 14.10) dont le statut est `À FAIRE` ou `EN COURS`.
2. **Inspection ciblée** : Inspecter les fichiers source et de test associés à cette sous-étape uniquement.
3. **Implémentation stricte** :
   - Modifier uniquement ce qui est requis pour cette sous-étape.
   - Respecter le gel de l'UI (aucune modification CSS, template, ou composant visuel).
   - Ne pas toucher aux questions cliniques ou méthodologiques.
4. **Validation ciblée** :
   - Exécuter les tests unitaires et de régression spécifiés pour la sous-étape.
   - S'assurer qu'aucun test ne régresse.
5. **Mise à jour du plan** :
   - Basculer le statut de la sous-étape à `TERMINÉ`.
   - Indiquer la date, les fichiers modifiés et les résultats des tests.
   - Mettre à jour l'état actuel et désigner la prochaine sous-étape.
6. **Commit dédié** :
   - Effectuer un commit Git propre avec message conventionnel (ex. `fix(transport): add risque-nutritionnel and bien-etre to gas schema`).
7. **Rapport d'exécution** :
   - Émettre le rapport de sous-étape avec le verdict et stopper immédiatement (1 seule sous-étape par run).
8. **Gestion des blocages** :
   - Si une ambiguïté ou un échec survient : marquer `BLOQUÉ`, documenter la cause exacte et STOPPER sans contournement silencieux.

---

### PHASE 15 — Full Regression Test

- Statut : TERMINÉ (2026-09-15)
- Objectif : Exécuter toutes les suites PHP et JS pour certifier la non-régression globale avant release.
- Fichiers concernés :
  - Ensemble des 23 suites PHP et 19 suites JS dans `lifemetrics-questionnaires/tests/` (42 suites au total).
- Tests :
  - `for f in lifemetrics-questionnaires/tests/*.test.php; do php "$f" || exit 1; done` (23/23 PASS)
  - `for f in lifemetrics-questionnaires/tests/*.test.js; do node "$f" || exit 1; done` (19/19 PASS)
- Critères de validation :
  - 0 test en échec (42/42 suites validées à 100%) ;
  - 0 erreur applicative connue ;
  - Aucun nouvel avertissement introduit par les modifications ;
  - Gardes de non-régression PSS-10 intactes (13/13 mutation guards validés) ;
  - Gel UI (UI Freeze) rigoureusement respecté.
- Fichiers réellement modifiés : `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés : 23 suites PHP et 19 suites JS (42 suites) exécutées sur le HEAD actuel.
- Résultat : Non-régression certifiée à 100% sur le HEAD actuel. Prêt pour la Phase 16 (WordPress Release ZIP).
- NON DÉTERMINÉ : Aucun.
- Date de complétion : 2026-09-15

---

### PHASE 16 — WordPress Release ZIP

- Statut : TERMINÉ (2026-09-16 — Packaging et audit ZIP certifiés ; stockage PSS-10 enrichi 24 colonnes validé ; Apps Script TEST déployés ; validation manuelle de bout en bout des 10 questionnaires sur WordPress local MAMP avec succès ; tests 42/42 PASS)
- Objectif : Produire l'archive finale lifemetrics-questionnaires.zip installable dans WordPress, intégrer la mise à niveau du stockage Google Sheets PSS-10 au même niveau d'exploitabilité que les questionnaires propriétaires (sans modifier ni UI, ni runtime legacy, ni scoring, ni fusionner les backends), et valider l'intégration de bout en bout sur les 10 destinations Google Sheets réelles via un environnement WordPress isolé.

- Contexte d'environnement réel validé (16 septembre 2026) :
  - Le WordPress LifeMetrics actuellement accessible est le **site réel de production** déjà en fonctionnement avec ses extensions et fonctionnalités.
  - Il n'existe actuellement **aucun WordPress de staging/local** pour LifeMetrics.
  - MAMP est actuellement utilisé uniquement comme serveur Apache/PHP local pour ouvrir et tester `lifemetrics-questionnaires/preview.php`.
  - **IMPORTANT** : `preview.php` n'est pas un environnement WordPress et ne permet pas de certifier l'installation du ZIP, les shortcodes, le REST WordPress et le parcours production complet.

- Décision d'environnement & Stratégie de release (Gate WORK-22) :
  1. **Protection absolue du site de production** : NE PAS installer ni remplacer `lifemetrics-questionnaires.zip` sur le WordPress LifeMetrics de production à ce stade. Le site de production reste strictement INCHANGÉ jusqu'à validation complète de l'environnement isolé.
  2. **Création d'un WordPress local isolé sous MAMP** : Avant toute modification du site réel, préparer un environnement WordPress local dédié et isolé sous MAMP (ou staging isolé équivalent).
  3. **Périmètre exhaustif de validation sur l'environnement isolé** :
     - Installation du vrai ZIP `lifemetrics-questionnaires.zip` ;
     - Activation du plugin sans aucune erreur PHP ;
     - Les 10 shortcodes fonctionnels ;
     - Parcours utilisateur complet : intro → questions → résultat ;
     - Endpoints REST WordPress fonctionnels ;
     - Prise en compte de `LMQ_PSS10_GOOGLE_ENDPOINT` ;
     - Prise en compte de `LMQ_GOOGLE_ENDPOINT` ;
     - Écriture effective dans les 10 destinations Google Sheets ;
     - Nouveau stockage PSS-10 en 24 colonnes (libellés + points) vérifié ;
     - Validation spécifique de l'onglet `Risque_Nutritionnel` ;
     - Validation spécifique de l'onglet `Bien_Etre` ;
     - Idempotence et absence de doublon sur `session_id`.
  4. **État des backends Apps Script TEST (16 septembre 2026)** :
     - Les deux Apps Script TEST ont déjà été mis à jour et déployés manuellement :
       - Web App PSS-10 séparée (`lifemetrics-questionnaires/backend/google-apps-script.gs`) ;
       - Web App générique pour les 9 questionnaires propriétaires (`lifemetrics-questionnaires/backend/generic-google-apps-script.gs`).
     - Les deux URLs `/exec` existent et restent strictement distinctes.
  5. **Configuration côté serveur uniquement** : Ces URLs seront configurées exclusivement côté serveur dans le `wp-config.php` du WordPress local/staging pour la validation, sans exposition au navigateur.
  6. **UI FREEZE absolu** : Zéro modification CSS, template, balise HTML ou DOM.

- Décision de stockage PSS-10 validée (Release Gate WORK-22) :
  1. **Niveau d'exploitabilité équivalent** : Le stockage PSS-10 dans Google Sheets ne se limite plus au format minimal `created_at` / `session_id` / `q1`..`q10` numériques / `final_score` / `category`.
  2. **Détail par question (24 colonnes)** : Pour chaque question PSS-10 (q1 à q10), le stockage consigne et restitue :
     - la réponse sélectionnée / son libellé textuel ('Jamais', 'Presque jamais', 'Parfois', 'Assez souvent', 'Très souvent') ;
     - les points correspondants (avec prise en compte rigoureuse du reverse scoring validé pour q4, q5, q7, q8).
     La structure est cohérente avec le principe des questionnaires propriétaires (colonnes adjacentes `Reponse_*` / `Points_*`).
  3. **Invariants stricts (NON MODIFIÉS)** :
     - Méthodologie PSS-10 inchangée ;
     - Scoring inchangé (somme 10–50) ;
     - Reverse scoring existant validé inchangé ;
     - Catégories inchangées ('Stress bas', 'Stress assez élevé', 'Stress très élevé') ;
     - Runtime legacy de production inchangé (`LifeMetrics_Legacy_PSS10_Runtime`, template `pss10/template.php`, `style.css`, `app.js`, 13 mutation guards) ;
     - UI FREEZE absolu : 0 modification CSS, DOM ou HTML.
  4. **Isolation technique stricte des backends (NON FUSIONNÉS)** :
     - `backend/google-apps-script.gs` et `backend/generic-google-apps-script.gs` RESTENT STRICTEMENT SÉPARÉS ;
     - PSS-10 conserve son backend Apps Script dédié et son endpoint autonome (`LMQ_PSS10_GOOGLE_ENDPOINT`).
  5. **Gate Google Sheets — Vérification obligatoire des 10 onglets** :
     - Vérifier la présence effective et la configuration des 10 onglets cibles dans le/les classeurs Google Sheets :
       - `PSS10` (ou `results`)
       - `Sedentarite`
       - `Hydratation`
       - `Fatigue`
       - `Sommeil`
       - `Nutrition`
       - `Activite_Physique`
       - `Pieds_Confort`
       - **`Risque_Nutritionnel`** (onglet obligatoire)
       - **`Bien_Etre`** (onglet obligatoire)
  6. **Règle de certification** :
     - La Phase 16 NE PEUT PAS être déclarée TERMINÉE avant validation réelle sur le WordPress local isolé et sur les 10 destinations Google Sheets.

- Contrôles avant build :
  - Tous les tests PASS (42/42 suites certifiées) ;
  - Aucun fichier temporaire, cache ou artefact local inutile ;
  - Fichiers de test exclus du ZIP de production ;
  - `preview.php` et les autres outils de développement exclus du ZIP de production ;
  - Bootstrap, assets, templates et configurations présents.
- Contrôles après build (exécutés et certifiés) :
  - Archive produite : `lifemetrics-questionnaires.zip` (111 635 octets / 109 KB, 61 fichiers, 436 562 octets décompressés) ;
  - Absence stricte certifiée de `preview.php`, du dossier `tests/`, des fichiers Git (`.git*`), backups (`*~`) et `.DS_Store` ;
  - Présence certifiée des 10 questionnaires dans `questionnaires/*/questionnaire.php` ;
  - Présence certifiée des 11 classes PHP dans `includes/`, des templates, des assets CSS/JS/SVG partagés et PSS-10 legacy ;
  - Présence des deux scripts backend dans `backend/` (`google-apps-script.gs` enrichi et `generic-google-apps-script.gs`) ;
  - `php lifemetrics-questionnaires/tests/stage11-release-audit.test.php` : ALL PASSED.
- Vérification d'intégration après build (feuille de route environnement isolé) :
  - [x] Mettre à jour `lifemetrics-questionnaires/backend/google-apps-script.gs` et `backend-logic.test.js` pour stocker les libellés de réponses et points par question pour PSS-10. [RÉALISÉ]
  - [x] Reconstruire le ZIP de release `lifemetrics-questionnaires.zip` et certifier à nouveau l'audit de packaging. [RÉALISÉ]
  - [x] Déployer manuellement les 2 Web Apps Apps Script TEST le 16/09/2026 (PSS-10 et Générique) et relever leurs 2 URLs `/exec` distinctes. [RÉALISÉ]
  - [x] Préparer un environnement WordPress local dédié et isolé sous MAMP (`wordpress-local/wordpress`, DB: `lifemetrics_wordpress_test`) sans toucher au site de production. [RÉALISÉ]
  - [x] Configurer les constantes serveur `LMQ_PSS10_GOOGLE_ENDPOINT` et `LMQ_GOOGLE_ENDPOINT` dans le `wp-config.php` du WordPress local isolé. [RÉALISÉ]
  - [x] Téléverser et activer l'archive `lifemetrics-questionnaires.zip` sur le WordPress local isolé sans erreur PHP. [RÉALISÉ]
  - [x] Diagnostiquer et corriger les 4 régressions visuelles PSS-10 constatées en runtime WordPress réel :
    * Correction du contour sombre/noir parasite sur la carte sélectionnée (`:focus:not(:focus-visible)` réinitialisé, `:focus-visible` préservé pour l'accessibilité clavier) ;
    * Restauration du texte d'interprétation clinique sous "D’après vos réponses," (`classification_messages[level.code].text` injecté dans `analysisText` en l'absence de lead progressif) ;
    * Rétablissement du badge sémantique coloré pour la catégorie de stress (`result-badge--intermediate`, `result-badge--medium` et variantes de rang stylisées) ;
    * Rétablissement de la graisse typographique (`font-weight: 700`) sur `.result-title` ("Mon score stress") face aux resets de thèmes WordPress. [RÉALISÉ]
  - [x] Diagnostiquer et réparer le pipeline de soumission générique (testé sur `sedentarite`) :
    * Cause identifiée : `schema_conflict` Apps Script (code HTTP 502 / `lmq_upstream_rejected`) provoqué par une divergence d'apostrophe typographique (`’` courbe dans `sedentarite/questionnaire.php` vs `'` droite ASCII dans `generic-google-apps-script.gs` et dans l'en-tête Google Sheets) ;
    * Correction appliquée : normalisation des questions contenant des apostrophes typographiques dans `sedentarite/questionnaire.php` (sur les 12 questions scorées du questionnaire), normalisation défensive des apostrophes dans `class-submission-service.php` (`questions_schema`) et tolérance typographique dans `generic-google-apps-script.gs` ;
    * Validation réelle WordPress local sous MAMP : POST REST `sedentarite/submit` validé en HTTP 200 `{"success":true,"duplicate":false}`, déduplication certifiée en HTTP 200 `{"success":true,"duplicate":true}`, écriture réelle confirmée dans l'onglet `Sedentarite` du Google Sheet. [RÉALISÉ]
  - [x] Diagnostiquer et corriger le contour parasite sur le titre de résultat « Mon résultat » (Sédentarité / questionnaires génériques) :
    * Cause identifiée : `questionnaire-ui.js` déplace le focus vers `h2[data-lmq-role="result-header"][tabindex="-1"]` pour les lecteurs d'écran (a11y). Dans WordPress, la règle globale du thème actif `twentytwentyfive` (`:where(.wp-site-blocks *:focus) { outline-width: 2px; outline-style: solid; }`) imposait un contour rectangulaire (noir/bleu) sur le titre ;
    * Correction appliquée : neutralisation de l'outline et box-shadow sur le titre de résultat en état de focus (`.result-title:focus`, `[data-lmq-role="result-header"]:focus { outline: none; box-shadow: none; }` dans `questionnaire.css` et `style.css`), tout en conservant le focus programmatique pour les technologies d'assistance et les styles `:focus-visible` sur les contrôles interactifs au clavier (boutons CTA, accordéon, etc.). [RÉALISÉ]
  - [x] Audit global et résolution architecturale des états focus dans le runtime WordPress (thème Twenty Twenty-Five) :
    * Problème observé : après ouverture de l'accordéon "Lire l'analyse détaillée" / "Masquer l'analyse", un contour rectangulaire orange parasite entourait tout le contrôle (texte + chevron) par collision avec `:where(.wp-site-blocks *:focus)` ;
    * Inventaire exhaustif des contrôles focusables : cartes réponses (`.answer-card`, `.answer-btn`), boutons navigation (`.btn--cta`, `.btn--back`), modal (`[data-lmq-role="learn-more"]`, `.modal-close`), titres recevant un focus programmatique (`.test-question`, `.result-title`), accordéon analyse (`.analysis-toggle`), CTAs (`.result-actions .btn`, `.btn--primary`, `.btn--secondary`), bouton recommencer (`.btn--tertiary`, `.btn--restart`), réessai sauvegarde (`.btn--retry`), liens (`.link`, `.footer-link`) ;
    * Stratégie CSS globale aux namespaces `.lmq-questionnaire` et `.lmq-pss10` :
      1) Neutralisation globale sur clic souris et focus programmatique (`*:focus { outline: none; }` et `*:focus:not(:focus-visible) { outline: none; }`) surclassant la spécificité nulle `(0,0,0)` de `:where()` tout en préservant intactes les élévations et ombres natives du design LifeMetrics ;
      2) Neutralisation systématique sur les cibles de focus programmatique non-interactives (`[tabindex="-1"]:focus { outline: none; }`) ;
      3) Restitution et harmonisation d'un indicateur de focus clavier normé, visible et accessible (`:focus-visible` avec `outline: 2px solid var(--color-primary); outline-offset: 2px;`) pour tous les éléments interactifs (`button`, `a`, `input`, `.btn`, `.answer-card`, `.analysis-toggle`, `[role="button"]`, `[role="radio"]`, etc.) ;
    * Vérification et parité : comportement désormais strictement identique entre `preview.php` et le runtime WordPress réel (sans régression PSS-10 certifié ni altération du UI FREEZE). [RÉALISÉ]
  - [x] Simplification textuelle du système Safety et suppression de l'icône ⚠️ :
    * Harmonisation du titre commun : « Un point mérite votre attention. » sur les 6 questionnaires possédant des questions Safety (`hydratation`, `fatigue-recuperation`, `sommeil`, `nutrition`, `pieds-confort-postural`, `risque-nutritionnel`) ;
    * Rédaction de messages d'attention plus concis, proportionnés et bienveillants, sans modifier la mécanique Safety (IDs, règles de déclenchement, `safety_flags`, `safety_attention`, calcul des scores et catégories strictement inchangés) ;
    * Suppression du pseudo-élément CSS injectant le pictogramme `⚠️` (`.lmq-questionnaire .safety-card strong::before`) pour un rendu purement textuel, sobre et non anxiogène ;
    * Les questionnaires sans Safety (`pss10`, `sedentarite`, `activite-physique`, `bien-etre`) restent strictement inchangés. [RÉALISÉ]
  - [x] Ajout du bloc de restitution « Compléter votre résultat » sur les 10 questionnaires :
    * Intégration dans la configuration des 10 questionnaires d'une propriété dédiée `result_completion` avec le titre exact « Compléter votre résultat » et des textes d'orientation spécifiques :
      - VitaScan (4 questionnaires) : `hydratation`, `nutrition`, `activite-physique`, `risque-nutritionnel` ;
      - Podos360 (1 questionnaire) : `pieds-confort-postural` ;
      - Services des pharmacies partenaires LifeMetrics / texte neutre (5 questionnaires, sans mention de VitaScan) : `pss10`, `sedentarite`, `fatigue-recuperation`, `sommeil`, `bien-etre` ;
    * Validation stricte du schéma 2.0.0 (`TOP_LEVEL` et validation textuelle sans balises) via `LifeMetrics_Questionnaire_Schema_Validator` ;
    * Style sobre, lisible et harmonisé introduisant naturellement le bouton de bilan ;
    * Séparation architecturale legacy préservée pour PSS-10 sans fusion avec le runtime générique. [RÉALISÉ]
  - [x] Intégration du texte de complétion dans l'analyse détaillée (suppression du bloc séparé et du titre) :
    * Évolution ergonomique validée : le texte de `result_completion` devient le dernier paragraphe de l'analyse détaillée et s'affiche uniquement lorsque l'accordéon « Lire l'analyse détaillée » est déplié ;
    * À l'état initial fermé : affichage exclusif du résumé / chapeau (`analysis-lead`) avec le toggle « Lire l'analyse détaillée », le texte de complétion est masqué ;
    * À l'état ouvert : volet déplié présentant le détail de l'analyse suivi immédiatement du paragraphe de complétion (`.analysis-completion`), suivi du bouton « Masquer l'analyse » ;
    * Suppression stricte du titre « Compléter votre résultat », de la carte séparée, des bordures et fonds distincts dans les gabarits générique et legacy PSS-10 ;
    * Parité comportementale et visuelle assurée sur les 10 questionnaires (9 génériques + PSS-10 legacy), sans fusion des runtimes, avec réinitialisation de l'accordéon à la fermeture ou au redémarrage du test. [RÉALISÉ]
  - [x] Suppression des cartes visuelles « Point de vigilance » sur l'écran résultat de `risque-nutritionnel` :
    * Suppression ciblée du rendu des cartes intermédiaires `Point de vigilance` (`RN_GUARDRAIL_APPORT_REDUIT`, `RN_GUARDRAIL_REPAS_SAUTES`, `RN_GUARDRAIL_PERTE_POIDS`, `RN_GUARDRAIL_DEGLUTITION`) pour aller directement de Safety éventuel vers le bloc Analyse ;
    * Préservation intégrale et stricte de la logique métier : calcul du score, thresholds, guardrail RN03/RN04/RN05/RN08, rehaussement de la catégorie affichée (`RISQUE_A_SURVEILLER`), Safety, final_score, Google Sheets, REST, payload, Apps Script et déduplication ;
    * Règle CSS ciblée `.lmq-questionnaire[data-lmq-questionnaire="risque-nutritionnel"] .classification-messages { display: none !important; }` et conditionnement dans `questionnaire-ui.js` ;
    * Tous les autres questionnaires conservent leurs messages de classification sans aucune altération. [RÉALISÉ]
  - [x] Tester le shortcode et le parcours complet des 10 questionnaires (PSS-10 legacy + 9 génériques) : intro, questions, écran de résultat, appel REST et synchronisation Google Apps Script validés avec succès sur WordPress local MAMP. [RÉALISÉ]
  - [x] Vérifier la bonne écriture d'une seule ligne par soumission dans l'onglet correspondant pour chacun des 10 questionnaires (dont PSS-10 en 24 colonnes, `Risque_Nutritionnel` et `Bien_Etre`). [RÉALISÉ]
  - [x] Tester la déduplication : renvoyer une requête avec le même `session_id` et vérifier qu'aucun doublon n'est inséré (idempotence certifiée). [RÉALISÉ]
  - [x] Rédiger le rapport de validation manuelle pour remise à Camille avant tout déploiement sur la production. [RÉALISÉ]
- Fichiers potentiellement concernés :
  - lifemetrics-questionnaires/backend/google-apps-script.gs
  - lifemetrics-questionnaires/backend/generic-google-apps-script.gs
  - scripts/build-release-zip.sh
  - lifemetrics-questionnaires/tests/stage11-release-audit.test.php
  - lifemetrics-questionnaires/tests/backend-logic.test.js
  - lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js
  - lifemetrics-questionnaires/tests/rest-backend-submission.test.php
  - lifemetrics-questionnaires/tests/frontend-restitution-phase13.test.js
  - lifemetrics-questionnaires/questionnaires/pss10/assets/css/style.css
  - lifemetrics-questionnaires/assets/css/questionnaire.css
  - lifemetrics-questionnaires/assets/js/questionnaire-ui.js
  - lifemetrics-questionnaires/includes/class-submission-service.php
  - lifemetrics-questionnaires/questionnaires/sedentarite/questionnaire.php
- Tests :
  - bash scripts/build-release-zip.sh lifemetrics-questionnaires.zip (PASS)
  - php lifemetrics-questionnaires/tests/stage11-release-audit.test.php (PASS)
  - Contrôle du contenu ZIP (`unzip -l`) et des exclusions de production (PASS - 61 fichiers, 0 fuite test/preview)
  - Suite de tests unitaire pour le nouveau stockage PSS-10 (`backend-logic.test.js`: PASS)
  - Tests de caractérisation et responsives PSS-10 (`pss10-frontend-characterization.test.js`, `pss10-browser-responsive.test.js`: ALL PASS)
  - Tests de restitution frontend et focus (`frontend-restitution-phase13.test.js`: ALL PASS)
  - Tests de soumission REST et résilience typographique (`rest-backend-submission.test.php`: ALL PASS)
  - Tests de format physique et résilience typographique Google Sheets (`google-sheets-storage-format.test.js`: ALL PASS)
  - Régression globale 42/42 suites (23 PHP, 19 JS : 100% PASS)
  - Checklist WordPress local + Apps Script + Google Sheets exécutée sur le ZIP produit (TERMINÉ - 10/10 questionnaires PASS de bout en bout : 12 questions scorées pour chacun des 9 questionnaires propriétaires et 10 questions pour PSS-10 legacy ; titre de résultat et accordéon analyse sans contours parasites ; messages Safety simplifiés sans icône ⚠️ sur les 6 questionnaires concernés ; texte de complétion dans l'analyse détaillée orientant vers VitaScan, Podos360 ou pharmacies partenaires ; cartes de vigilance supprimées sur risque-nutritionnel)
- Critères de validation :
  - Archive ZIP propre générée ; audit de packaging PASS. [RÉALISÉ]
  - Stockage Google Sheets PSS-10 enrichi (libellés + points) sans modification UI ni scoring ni fusion backend. [RÉALISÉ LOCALEMENT]
  - Les 2 Apps Script TEST déployés avec URLs distinctes. [RÉALISÉ]
  - WordPress local MAMP isolé préparé sans modification de la production. [RÉALISÉ]
  - ZIP installé et activé dans WordPress local sans erreur. [RÉALISÉ]
  - Rétablissement visuel PSS-10 conforme sans régression méthodologique ni scoring. [RÉALISÉ]
  - Pipeline générique réparé et certifié (REST HTTP 200, écriture onglet `Sedentarite`, déduplication OK). [RÉALISÉ]
  - Titre de résultat sans contour parasite après transition (accessibilité préservée). [RÉALISÉ]
  - Stratégie globale de focus appliquée et vérifiée (suppression des contours parasites sur clic/souris, maintien de `:focus-visible` au clavier). [RÉALISÉ]
  - Messages Safety simplifiés avec titre commun et suppression de l'icône ⚠️ (répartition certifiée : 12 scorées + 3 Safety sur `hydratation`, `fatigue-recuperation`, `sommeil`, `nutrition` ; 12 scorées + 4 Safety sur `pieds-confort-postural`, `risque-nutritionnel` ; aucun Safety sur `pss10`, `sedentarite`, `activite-physique`, `bien-etre`). [RÉALISÉ]
  - Bloc « Compléter votre résultat » déployé sur les 10 questionnaires dans l'analyse détaillée (VitaScan pour `hydratation`, `nutrition`, `activite-physique`, `risque-nutritionnel` ; Podos360 pour `pieds-confort-postural` ; texte neutre vers pharmacies partenaires pour `pss10`, `sedentarite`, `fatigue-recuperation`, `sommeil`, `bien-etre`). [RÉALISÉ]
  - Les 10 questionnaires fonctionnent de bout en bout et écrivent dans les onglets attendus. [RÉALISÉ]
  - Le rapport de validation manuelle est complet et transmissible à Camille. [RÉALISÉ]
- Livrables fournis :
  - Chemin exact du ZIP et taille : `lifemetrics-questionnaires.zip` (61 fichiers de production, 449 153 octets non compressés) ;
  - Résumé du contenu vérifié : 61 fichiers conformes, packaging audité sans aucune fuite (`preview.php`, `tests/`, `.git*`, `~`, `.DS_Store`) ;
  - Checklist de validation manuelle WordPress local : 10/10 questionnaires validés avec succès.

- Fichiers réellement modifiés : `lifemetrics-questionnaires/includes/class-questionnaire-schema-validator.php`, `lifemetrics-questionnaires/templates/questionnaire.php`, `lifemetrics-questionnaires/assets/js/questionnaire-ui.js`, `lifemetrics-questionnaires/assets/css/questionnaire.css`, `lifemetrics-questionnaires/questionnaires/pss10/template.php`, `lifemetrics-questionnaires/questionnaires/pss10/assets/css/style.css`, `lifemetrics-questionnaires/questionnaires/*/questionnaire.php` (10 questionnaires), `lifemetrics-questionnaires.zip`, `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés : validation unitaire des 10 configurations et schémas (PASS), validation de l'ordre DOM générique et PSS-10 (PASS), `pss10-frontend-characterization.test.js` (PASS - 13 gardes de mutation), `frontend-restitution-phase13.test.js` (PASS), `php lifemetrics-questionnaires/tests/stage11-release-audit.test.php` (PASS), suite de régression complète 42/42 PASS (23 PHP, 19 JS).
- Résultat : Phase 16 entièrement TERMINÉE avec succès. 10/10 questionnaires validés en runtime réel WordPress local MAMP. Archive ZIP de release prête pour distribution. Prêt pour WORK-19 (Réconciliation documentaire) et WORK-23.
- NON DÉTERMINÉ : Aucun blocage technique de code.
- Commits de clôture Phase 16 : 1a479e2 (`docs(release): close phase 16 with 10/10 wordpress local validation`) et 70be774 (`docs(release): correct phase 16 validation summary`)
- Date : 2026-09-16


---

## TÂCHES DE SORTIE DU PROJET — SYNCHRONISÉES AVEC NOTION

Ces tâches existent dans la base Notion `Tâches` et appartiennent au projet `LifeMetrics Questionnaires`. Elles ne créent pas de nouvelles phases techniques : elles détaillent les conditions de documentation, de release et de remise finale autour des Phases 15 et 16. Toute modification de leur statut ou de leurs critères doit être reportée ici et dans leur page Notion correspondante.

### WORK-19 — Réconcilier la documentation avec l'état réel du code

- Statut : TERMINÉ (17 septembre 2026)
- Position : après la Phase 16 et avant la revue finale WORK-23.
- Objectif : remettre README, ARCHITECTURE, QUESTIONNAIRE_INVENTORY, CHANGELOG et le présent IMPLEMENTATION PLAN au niveau exact de l'inventaire des 10 questionnaires, des scores (12–60 propriétaires / 10–50 PSS-10), du runtime PSS-10 legacy isolé, des deux Apps Script, des correctifs UI finaux (jauge à gradient continu sans reste gris, suppression globale des cartes « Point d'attention », bloc Safety conservé) et des résultats validés en Phase 16.
- Avancement WORK-19 au 17 septembre 2026 :
  * [x] Audit documentaire global initial en lecture seule (PASS) ;
  * [x] QUESTIONNAIRE_INVENTORY.md réconcilié (10 questionnaires, règles complètes, matrices, suppression globale des cartes attention) ;
  * [x] README.md réconcilié (vue d'ensemble, installation, architecture, validation locale, restitution finale) ;
  * [x] ARCHITECTURE.md réconcilié (dual-runtime, transport, scoring, guardrails, shortcodes, spécification technique de jauge et suppression des cartes attention) ;
  * [x] CHANGELOG.md réconcilié (étiquetage [SUPERSEDED] / [REVERTED], historique clarifié, correctifs UI consolidés 7176816) ;
  * [x] LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md synchronisé et validé ;
  * [x] Contrôle global transversal en lecture seule et commit documentaire unique WORK-19 (PASS).
- Critères validés :
  - Les 5 documents de référence sont intégralement réconciliés avec le code HEAD ;
  - Les correctifs UI finaux (gradient continu seuillé, score marker, suppression globale des cartes dimensionnelles séparées, préservation du bloc Safety) sont documentés ;
  - Les chiffres de tests (23 PHP + 19 JS = 42/42 PASS), l'inventaire des 10 questionnaires, les deux Web Apps Google Apps Script et les règles de restitution correspondent rigoureusement au code et aux configurations courantes ;
  - Aucun fichier runtime modifié pendant la clôture documentaire.
- Tâche Notion : `WORK-19 — Réconcilier la documentation avec l'état réel du code`.

### WORK-20 — Corriger et sécuriser l'outil preview avant release

- Statut : TERMINÉ (2026-09-15)
- Position : gate validée de la Phase 16, avant le build ZIP final.
- Objectif : conserver le preview comme outil de développement sans le distribuer dans le ZIP de production et garantir que le chemin PSS-10 preview n'est pas présenté comme le runtime WordPress de production.
- Critères validés :
  - `preview.php` est explicitement exclu du ZIP de release dans `scripts/build-release-zip.sh` (`-x "lifemetrics-questionnaires/preview.php"`) ;
  - Le build script vérifie automatiquement après création que `preview.php` et `tests/` sont absents du ZIP (`unzip -l | grep -q`) et échoue immédiatement en cas de fuite ;
  - `lifemetrics-questionnaires/tests/stage11-release-audit.test.php` audite et certifie cette exclusion et la présence du garde-fou ;
  - Dans `preview.php`, le cas PSS-10 est explicitement désactivé dans le sélecteur avec documentation claire expliquant que son runtime historique WordPress dédié (`LifeMetrics_Legacy_PSS10_Runtime`, template `pss10/template.php`, `style.css`, `app.js`) n'est pas représentatif du moteur générique V2 autonome ;
  - Les 9 questionnaires propriétaires V2 restent 100% prévisualisables et interactifs sur desktop, tablette et mobile ;
  - Le gel UI (UI Freeze) est intégralement préservé (aucun fichier template, CSS partagé ou DOM de questionnaire modifié) ;
  - 42/42 suites de tests (23 PHP, 19 JS) passent avec succès (100%).
- Date de complétion : 2026-09-15
- Tâche Notion : `WORK-20 — Corriger et sécuriser l'outil preview avant release`.

### WORK-22 — Construire et auditer le ZIP WordPress avec stockage PSS-10 enrichi et 10 onglets Sheets

- Statut : TERMINÉ (2026-09-16)
- Position : après WORK-21 (Phase 15) et WORK-20, avant WORK-19 et WORK-23.
- Objectif : produire l'archive finale lifemetrics-questionnaires.zip, enrichir le stockage Google Sheets PSS-10 (libellés de réponses + points par question) au même niveau d'exploitabilité que les questionnaires propriétaires sans modifier ni UI, ni runtime legacy, ni scoring, ni fusionner les backends, et valider l'intégration sur les 10 onglets Google Sheets (dont obligatoirement Risque_Nutritionnel et Bien_Etre) via un environnement WordPress local MAMP isolé.
- Contexte d'environnement réel :
  - Le seul environnement WordPress LifeMetrics actuellement accessible est le **site réel de production** déjà en exploitation avec ses extensions et fonctionnalités.
  - Aucun WordPress staging ou local LifeMetrics n'existe actuellement.
  - MAMP n'était utilisé que pour `preview.php` (qui n'est pas un runtime WordPress et ne permet pas de certifier l'installation du ZIP, les shortcodes, le REST WordPress ou le parcours complet).
  - **Protection absolue de la production** : Interdiction formelle d'installer ou de remplacer `lifemetrics-questionnaires.zip` sur le site réel de production à ce stade. La production reste strictement intacte.
- Prérequis de validation :
  - Préparer préalablement un environnement WordPress local dédié et isolé sous MAMP (ou staging isolé équivalent). [RÉALISÉ]
- Critères obligatoires de validation :
  - Installation et activation du plugin depuis le ZIP réel (`lifemetrics-questionnaires.zip`, 61 fichiers de production) sans aucune erreur PHP ; [RÉALISÉ]
  - Rendu et fonctionnement complet des 10 shortcodes ; [RÉALISÉ]
  - Parcours utilisateur complet pour les 10 questionnaires (intro → questions → écran de résultat) ; [RÉALISÉ]
  - Routes REST WordPress internes vérifiées et opérationnelles ; [RÉALISÉ]
  - Configuration serveur (`wp-config.php`) des constantes d'endpoints sans exposition au navigateur :
    * `LMQ_PSS10_GOOGLE_ENDPOINT` (pointant vers la Web App PSS-10 TEST déployée le 16/09/2026) ; [RÉALISÉ]
    * `LMQ_GOOGLE_ENDPOINT` (pointant vers la Web App Générique TEST déployée le 16/09/2026) ; [RÉALISÉ]
  - Écriture effective d'une seule ligne par soumission dans les 10 onglets Google Sheets correspondants :
    * `PSS10` (format enrichi 24 colonnes avec libellés textuels et points par question) ; [RÉALISÉ]
    * `Sedentarite` ; [RÉALISÉ]
    * `Hydratation` ; [RÉALISÉ]
    * `Fatigue` ; [RÉALISÉ]
    * `Sommeil` ; [RÉALISÉ]
    * `Nutrition` ; [RÉALISÉ]
    * `Activite_Physique` ; [RÉALISÉ]
    * `Pieds_Confort` ; [RÉALISÉ]
    * `Risque_Nutritionnel` (onglet obligatoire vérifié) ; [RÉALISÉ]
    * `Bien_Etre` (onglet obligatoire vérifié) ; [RÉALISÉ]
  - Déduplication par `session_id` certifiée (aucun doublon en cas de re-soumission) ; [RÉALISÉ]
  - RÈGLE STRICTE : UI FREEZE ABSOLU (zéro modification de CSS, style, structure visuelle, templates, HTML ou DOM en dehors des correctifs d'intégration réels certifiés) ; [RÉALISÉ]
  - Zéro modification de la méthodologie, scoring, reverse scoring, catégories ou runtime legacy PSS-10 ; [RÉALISÉ]
  - Zéro fusion entre backends Apps Script (`backend/google-apps-script.gs` et `backend/generic-google-apps-script.gs` restent isolés) ; [RÉALISÉ]
  - Rédaction du rapport de validation manuelle pour remise à Camille avant tout déploiement sur la production ; [RÉALISÉ]
  - La Phase 16 et WORK-22 sont entièrement validées et TERMINÉES avec succès.
- Tâche Notion : `WORK-22 — Construire et auditer le ZIP WordPress`.

### WORK-23 — Préparer la revue finale et la stratégie de merge vers main

- Statut : À FAIRE
- Position : après la clôture de la Phase 16 et de WORK-19/WORK-20.
- Objectif : comparer la branche de release à `main`, vérifier les critères de livraison, préparer le rollback et remettre le ZIP ainsi que le rapport de validation à Camille.
- Critères : Phases 14–16 terminées ; WORK-19 et WORK-20 résolues ; installation WordPress, Apps Script et Google Sheets validés ; aucune fusion vers `main` avant cette revue.
- Tâche Notion : `WORK-23 — Préparer la revue finale et la stratégie de merge vers main`.

### Ordre de sortie unique

| Date | Élément | Statut | Dépendance |
|---|---|:---:|---|
| 2026-09-15 | PHASE 15 — Full Regression Test (WORK-21) | TERMINÉ | Phase 14 terminée (42/42 PASS) |
| 2026-09-15 | WORK-20 — Sécurisation outil preview avant release | TERMINÉ | Gate de Phase 16 validée |
| 2026-09-16 | PHASE 16 — WordPress Release ZIP (WORK-22) | TERMINÉ | Validation 10/10 WordPress local MAMP |
| 2026-09-17 | WORK-19 — Réconciliation documentaire | TERMINÉ | 5 documents réconciliés, correctifs UI finaux intégrés, HEAD aligné |
| 2026-09-17+ | WORK-23 — Revue finale, rapport et remise à Camille | À FAIRE | Phase 16 + WORK-19 terminées |

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

### 2026-09-15 — Phase 14 : Préparation, intégration Git et plan d'exécution automatisable
- Statut : EN COURS (Préparation, intégration Git & plan validés)
- Fichiers modifiés : `DECISIONS.md`, `ARCHITECTURE.md`, `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés : Suite complète PHP 23/23 PASS, suite complète JS 19/19 PASS
- Résultat :
  1. Intégration Git : Branche `feature/multi-questionnaires` synchronisée avec succès depuis `redesign/questionnaire-pages` jusqu'au commit validé `75dc058` via fast-forward strict.
  2. Règle de gel UI (UI Freeze) : Enregistrée dans DEC-025, ARCHITECTURE.md et le plan central. La baseline frontend issue de `75dc058` est gelée.
  3. Analyse approfondie Phase 14 : Identification des lacunes de schémas Google Apps Script pour `risque-nutritionnel` et `bien-etre` et couverture de tests à étendre à 10 questionnaires.
  4. Plan d'exécution automatisé : Décomposition de la Phase 14 en 10 sous-étapes granulaires (14.1 à 14.10) et formalisation de l'Automated Execution Contract.
- Notes : Prêt pour l'exécution automatisée de la sous-étape 14.1.

### 2026-09-15 — Sous-étape 14.1 : Complétion des schémas Google Apps Script (risque-nutritionnel & bien-etre)
- Statut : TERMINÉ
- Fichiers modifiés : `lifemetrics-questionnaires/backend/generic-google-apps-script.gs`, `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés : Smoke tests schémas GAS, `backend-logic.test.js`, `google-sheets-storage-format.test.js`, suite complète 23/23 PHP PASS, 19/19 JS PASS
- Résultat : Schémas `risque-nutritionnel` (onglet `Risque_Nutritionnel`, hasSafety: true, 12 questions scorées RN01–RN12, 4 questions de sécurité RNSF01–RNSF04, 36 colonnes) et `bien-etre` (onglet `Bien_Etre`, hasSafety: false, 12 questions scorées BE01–BE12, 0 questions de sécurité, 31 colonnes) enregistrés avec succès dans `generic-google-apps-script.gs`. Aliases `risque_nutritionnel` et `bien_etre` ajoutés.
- Prochaine sous-étape : 14.2 — Audits du format de stockage physique Google Sheets (PHP & JS).

### 2026-09-15 — Sous-étape 14.2 : Audits du format de stockage physique Google Sheets (PHP & JS)
- Statut : TERMINÉ
- Fichiers modifiés : `lifemetrics-questionnaires/tests/google-sheets-storage-format.test.php`, `lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js`, `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés : `google-sheets-storage-format.test.php` (PASS 9/9), `google-sheets-storage-format.test.js` (PASS 9/9), suite complète 23/23 PHP PASS, 19/19 JS PASS
- Résultat : Couverture intégrale des 9 questionnaires propriétaires V2 dans les deux environnements de test de stockage physique Google Sheets. `risque-nutritionnel` (36 colonnes) et `bien-etre` (31 colonnes) validés en colonnes canoniques, ordre, adjacence réponse/points, gestion N/A, autorité serveur des points et insertions de lignes doPost simulées.
- Prochaine sous-étape : 14.3 — Intégrité du routage d'endpoint et de découverte (10 questionnaires).

### 2026-09-15 — Sous-étape 14.3 : Intégrité du routage d'endpoint et de découverte (10 questionnaires)
- Statut : TERMINÉ
- Fichiers modifiés : `lifemetrics-questionnaires/tests/backend-routing.test.php`, `lifemetrics-questionnaires/tests/backend-logic.test.js`, `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés : `backend-routing.test.php` (BACK-001 à BACK-012c PASS), `backend-logic.test.js` (PASS), suite complète 23/23 PHP PASS, 19/19 JS PASS
- Résultat : Résolution d'endpoints autoritaire validée pour l'ensemble des 10 questionnaires (PSS-10 vers endpoint dédié legacy, 9 questionnaires propriétaires dont `risque-nutritionnel` et `bien-etre` vers `LMQ_GOOGLE_ENDPOINT`), getTargetSheetName et getSchema validés en JS, tests de rejet SSRF/redirections malveillantes confirmés, et flux complets de soumission multi-destinations BACK-012/b/c certifiés.
- Prochaine sous-étape : 14.4 — Résistance globale aux falsifications et autorité serveur (10 questionnaires).

### 2026-09-15 — Sous-étape 14.4 : Résistance globale aux falsifications et autorité serveur (10 questionnaires)
- Statut : TERMINÉ
- Fichiers modifiés : `lifemetrics-questionnaires/tests/global-tamper-resistance.test.php`, `lifemetrics-questionnaires/tests/rest-backend-submission.test.php`, `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés : `global-tamper-resistance.test.php` (PASS 10/10), `rest-backend-submission.test.php` (PASS 10/10), suite complète 23/23 PHP PASS, 19/19 JS PASS
- Résultat : Certification de l'autorité serveur et de la tamper-resistance sur les 10 questionnaires. Élimination garantie de toute tentative d'injection de score ou de catégorie cliente, isolation de PSS-10 et recalcul systématique à partir des réponses brutes.
- Prochaine sous-étape : 14.5 — Sérialisation et transport des questions & drapeaux Safety.

### 2026-09-15 — Sous-étape 14.5 : Sérialisation et transport des questions & drapeaux Safety
- Statut : TERMINÉ
- Fichiers modifiés : `lifemetrics-questionnaires/tests/google-sheets-storage-format.test.php`, `lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js`, `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés : `google-sheets-storage-format.test.php` (Section 8 PASS), `google-sheets-storage-format.test.js` (Tests H & I PASS), suites complètes 23/23 PHP PASS, 19/19 JS PASS
- Résultat : Confirmation formelle de l'inventaire Safety (exactement 6 questionnaires propriétaires avec questions Safety : Sommeil [3], Nutrition [3], Pieds & confort postural [4], Hydratation [3], Fatigue & récupération [3], Risque nutritionnel [4] ; et absence stricte de volet Safety sur Bien-être [0], Activité physique [0], Sédentarité [0]). Validation de la non-pollution stricte du score (scores bruts, max disponibles, finaux et par dimensions 100% identiques avec ou sans trigger actif), absence de points sur les réponses Safety, et transmission conforme de `safety_attention` ("Oui" ou "Non").
- Prochaine sous-étape : 14.6 — Audit du transport N/A et normalisation du score.

### 2026-09-15 — Sous-étape 14.6 : Audit du transport N/A et normalisation du score
- Statut : TERMINÉ
- Fichiers modifiés : `lifemetrics-questionnaires/tests/google-sheets-storage-format.test.php`, `lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js`, `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés : `google-sheets-storage-format.test.php` (Section 9 PASS), `google-sheets-storage-format.test.js` (Test J PASS), suites complètes 23/23 PHP PASS, 19/19 JS PASS
- Résultat : Audit exhaustif du transport des options N/A : confirmation que seuls Hydratation (HY05) et Sédentarité (SD07, SD08) possèdent des options N/A (`applicable: false`). Validation physique dans le tableur de l'écriture des libellés exacts dans la colonne texte et de chaînes vides `""` dans la colonne Points, sans aucun décalage de colonnes (total colonnes 35 pour Hydratation, 31 pour Sédentarité). Validation rigoureuse de la formule méthodologique de référence `final_score = ROUND((raw_score / applicable_question_count) * 12)` tant en PHP qu'en JS sur l'intégralité des combinaisons et plages de scores.
- Prochaine sous-étape : 14.7 — Vérification du transport des guardrails et de la catégorie affichée.

### 2026-09-15 — Sous-étape 14.7 : Vérification du transport des guardrails et de la catégorie affichée
- Statut : TERMINÉ
- Fichiers modifiés : `lifemetrics-questionnaires/tests/rest-backend-submission.test.php`, `lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js`, `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés : `rest-backend-submission.test.php` (Section 8 PASS), `google-sheets-storage-format.test.js` (Test K PASS), suites complètes 23/23 PHP PASS, 19/19 JS PASS
- Résultat : Validation complète du transport des 4 questionnaires comportant des garde-fous (Sédentarité, Pieds & confort postural, Risque nutritionnel, Bien-être). Transmission certifiée dans le payload de `calculated_category`, `displayed_category` et `applied_classification_rules`. Confirmation de la règle validée pour Sédentarité : `D1 = SD01 + SD02 >= 8` plafonne la catégorie affichée à l'orange `SEDENTARITE_A_REDUIRE` sans forcer le rouge et sans altérer les scores bruts ou finaux (qui restent intacts à 18). Confirmation du stockage dans la colonne `category` du tableur de la catégorie plafonnée pour l'ensemble des 4 questionnaires avec préservation stricte de l'intégrité des scores numériques.
- Prochaine sous-étape : 14.8 — Vérification de l'idempotence, du session_id et du rate limiting.

### 2026-09-15 — Sous-étape 14.8 : Vérification de l'idempotence, du session_id et du rate limiting
- Statut : TERMINÉ
- Fichiers modifiés : `lifemetrics-questionnaires/tests/backend-routing.test.php`, `lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js`, `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés : `backend-routing.test.php` (BACK-013 à BACK-017 PASS), `google-sheets-storage-format.test.js` (Test L PASS), suites complètes 23/23 PHP PASS, 19/19 JS PASS
- Résultat : Validation complète de l'idempotence et de la résilience transport :
  1. Idempotence bout-en-bout : Répétition de soumissions avec le même `session_id` (simulant double-clics ou retries réseau) renvoie `{ success: true, duplicate: true }` côté WordPress REST, et `{ ok: true, duplicate: true }` côté Google Apps Script avec 0 ligne dupliquée dans le tableur.
  2. Rate limiting amont : Détection du seuil limite dans `CacheService` renvoyant `{ ok: false, code: 'rate_limited' }` avec 0 ligne insérée, mappé en `lmq_upstream_rejected` (HTTP 502) côté WordPress.
  3. Expiration de verrouillage (Lock timeout) : Détection de lock saturé via `LockService.tryLock(30000)` renvoyant `{ ok: false, code: 'lock_timeout' }` avec 0 ligne insérée, mappé en `lmq_upstream_rejected` (HTTP 502).
  4. Timeouts réseau et corps de réponse malformés non-JSON : Mappés de façon étanche en HTTP 502 avec codes d'erreur explicites.
- Prochaine sous-étape : 14.9 — Neutralisation systématique des injections de formules.

### 2026-09-15 — Sous-étape 14.9 : Neutralisation systématique des injections de formules
- Statut : TERMINÉ
- Fichiers modifiés : `lifemetrics-questionnaires/backend/generic-google-apps-script.gs`, `lifemetrics-questionnaires/tests/backend-logic.test.js`, `lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js`, `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés : `backend-logic.test.js` (PASS), `google-sheets-storage-format.test.js` (Test M PASS), suites complètes 23/23 PHP PASS, 19/19 JS PASS
- Résultat : Neutralisation systématique et étanche des injections de formules Google Sheets :
  1. Regex `safeSheetText` renforcée : `/^\s*[=+\-@]/` neutralise tout caractère déclencheur de formule (`=`, `+`, `-`, `@`), y compris lorsqu'il est précédé d'espaces, de tabulations ou de sauts de ligne, en le préfixant d'une apostrophe simple `'`.
  2. Préservation des données textuelles légitimes : Les libellés légitimes contenant des tirets ou ponctuations internes (ex: `'Option 1 - description'`, `'Score : 12 points'`, `'7 à 9 heures'`) ne sont pas altérés et restent sans apostrophe. Les textes déjà échappés ne subissent aucun double échappement.
  3. Sécurisation complète des colonnes numériques : `raw_score` et `available_max` passent par `safeSheetText` s'ils sont transmis sous forme de chaînes textuelles pour éviter toute injection dans les colonnes métriques.
  4. Test physique d'injection complet : Validation sur le schéma `sommeil` avec des payloads hostiles (`=HYPERLINK(...)`, `-CMD(...)`, `\t=IMPORTXML(...)`, `@SUM(...)`, `\n+DANGEROUS_CATEGORY`) : aucune cellule de la ligne insérée ne peut s'exécuter comme formule dans Google Sheets.
- Prochaine sous-étape : 14.10 — Isolation du transport PSS-10 legacy et certification globale.

### 2026-09-15 — Sous-étape 14.10 : Isolation du transport PSS-10 legacy et certification globale (Clôture Phase 14)
- Statut : TERMINÉ (Phase 14 entièrement validée)
- Fichiers modifiés : `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés : `pss10-rest-characterization.test.php` (PASS), `pss10-frontend-characterization.test.js` (PASS avec 13 gardes de mutation), suites complètes 23/23 PHP PASS (100%), 19/19 JS PASS (100%)
- Résultat : Certification globale et clôture formelle de la Phase 14 :
  1. Isolation PSS-10 absolue : Le transport et le runtime historiques du PSS-10 restent strictement isolés et conformes (route REST `/pss10/submit`, endpoint dédié `LMQ_PSS10_GOOGLE_ENDPOINT`, onglet `PSS10`, payload plat q1..q10, échelle 10–50, et 13 gardes de mutation frontend confirmés).
  2. Couverture de test intégrale : Les 23 suites PHP et 19 suites JavaScript s'exécutent avec 100% de succès.
  3. UI Freeze respecté : Aucune modification des templates, CSS, HTML, balises, scripts visuels ou textes de l'interface utilisateur depuis le commit validé `75dc058`.
  4. Phase 14 clôturée : Les 10 sous-étapes (14.1 à 14.10) sont terminées.
- Prochaine phase : PHASE 15 — Full Regression Test.

### 2026-09-15 — Phase 15 : Régression complète sur le HEAD actuel (WORK-21)
- Statut : TERMINÉ
- Fichiers modifiés : `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés : 23 suites PHP et 19 suites JavaScript (42/42 PASS)
- Résultat : Certification globale de non-régression sur le HEAD actuel (`cfd51f2`) :
  1. Suites PHP : 23/23 PASS sans avertissement ni échec (schémas, scoring, parité, assets, renderer, routes REST, transport multi-destinations, format de stockage Sheets, tamper-resistance, PSS-10 legacy, audit PDF).
  2. Suites JavaScript : 19/19 PASS sans avertissement ni échec (moteur de calcul, UI browser, flow d'hydratation, restitution frontend Phase 13, storage format Sheets, déduplication, neutralisation d'injections formules, 13 mutation guards PSS-10).
  3. UI Freeze : Préservé à 100% (aucune modification de code CSS, template ou DOM).
  4. Non-régression PSS-10 : 100% validée.
- Prochaine phase : PHASE 16 — WordPress Release ZIP (WORK-20).

### 2026-09-15 — WORK-20 : Corriger et sécuriser l'outil preview avant release
- Statut : TERMINÉ
- Fichiers modifiés : `lifemetrics-questionnaires/preview.php`, `scripts/build-release-zip.sh`, `lifemetrics-questionnaires/tests/stage11-release-audit.test.php`, `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés : `preview.php` render tests (10/10 PASS), `stage11-release-audit.test.php` (PASS), suites complètes 23/23 PHP PASS (100%), 19/19 JS PASS (100%)
- Résultat : Sécurisation et fiabilisation de l'outil de preview autonome :
  1. Traitement PSS-10 : Option désactivée dans le `<select>` avec documentation claire affichée dans le canvas expliquant que PSS-10 possède un runtime WordPress dédié (`LifeMetrics_Legacy_PSS10_Runtime`, template `pss10/template.php`, `style.css`, `app.js`, 13 gardes de mutation) non représentatif du moteur générique V2. Les scripts d'UI génériques ne sont pas injectés pour PSS-10.
  2. 9 questionnaires V2 : Fonctionnement autonome et interactif parfait sur desktop, tablette et mobile avec sélection dynamique et affichage du statut.
  3. Exclusion du ZIP release : Exclusion explicite de `preview.php` ajoutée à `scripts/build-release-zip.sh` (`-x "lifemetrics-questionnaires/preview.php"`).
  4. Contrôle automatisé anti-fuite : Ajout dans `build-release-zip.sh` d'une vérification post-build (`unzip -l | grep -q`) bloquant le build en cas de présence de `preview.php` ou `tests/`.
  5. Audit automatisé de release : `stage11-release-audit.test.php` enrichi d'assertions vérifiant l'exclusion et les gardes dans le script de build.
  6. UI Freeze respecté : Aucun template, CSS, balise HTML ou DOM de questionnaire modifié.
- Prochaine phase : PHASE 16 — WordPress Release ZIP (WORK-22).

### 2026-09-16 — WORK-22 : Implémentation du stockage PSS-10 enrichi & Déploiement Apps Script TEST
- Statut : EN COURS (Stockage enrichi 24 colonnes validé localement, packaging ZIP audité, Apps Script TEST déployés)
- Fichiers modifiés : `lifemetrics-questionnaires/backend/google-apps-script.gs`, `lifemetrics-questionnaires/tests/backend-logic.test.js`, `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Tests exécutés : `node lifemetrics-questionnaires/tests/backend-logic.test.js` (PASS), `node lifemetrics-questionnaires/tests/google-sheets-storage-format.test.js` (PASS), `bash scripts/build-release-zip.sh lifemetrics-questionnaires.zip` (PASS), `php lifemetrics-questionnaires/tests/stage11-release-audit.test.php` (PASS), suites de régression 42/42 PASS.
- Réalisations :
  1. Stockage enrichi PSS-10 (24 colonnes) : ajout des paires de colonnes libellé textuel + points réels pour Q1 à Q10, avec prise en compte du reverse scoring validé (Q4, Q5, Q7, Q8) et rétrocompatibilité avec l'ancien schéma 14 colonnes.
  2. Préservation intégrale de la méthodologie PSS-10 (somme 10–50), des catégories ('Stress bas', 'Stress assez élevé', 'Stress très élevé') et du runtime legacy isolé (`LifeMetrics_Legacy_PSS10_Runtime`).
  3. Packaging release reconstruit et certifié : `lifemetrics-questionnaires.zip` (111 635 octets / 109 KB, 61 fichiers, 0 fuite test/preview).
  4. Déploiement manuel le 16/09/2026 des 2 Web Apps Google Apps Script TEST distinctes (PSS-10 legacy enrichi et Générique V2).
- Prochaine étape : Préparation de l'environnement WordPress local isolé sous MAMP pour certification de bout en bout.

### 2026-09-16 — WORK-22 : Cadrage de l'environnement de validation WordPress local MAMP & Protection de la production
- Statut : TERMINÉ
- Fichiers modifiés : `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Décision actée :
  1. Contexte réel : le site WordPress actuellement accessible est le site de production réel en exploitation. Aucun staging LifeMetrics n'existe. `preview.php` n'est pas un runtime WordPress.
  2. Protection absolue du site de production : interdiction formelle d'installer ou remplacer le ZIP sur la production à ce stade. La production reste strictement intacte.
  3. Environnement de test local : préparation préalable d'une instance WordPress locale dédiée et isolée sous MAMP (ou staging équivalent).
  4. Périmètre de certification locale : installation du ZIP réel, activation sans erreur PHP, rendu des 10 shortcodes, parcours utilisateur complets, endpoints REST internes, configuration serveur des constantes `LMQ_PSS10_GOOGLE_ENDPOINT` et `LMQ_GOOGLE_ENDPOINT` vers les Web Apps TEST, écritures réelles dans les 10 onglets Google Sheets (dont PSS-10 24 colonnes, `Risque_Nutritionnel` et `Bien_Etre`), déduplication `session_id`.
  5. UI FREEZE absolu : 0 modification visuelle, CSS, template, balise HTML ou DOM.
- Prochaine étape : Configuration du WordPress local sous MAMP, exécution de la checklist de validation manuelle et rapport pour Camille.

### 2026-09-16 — WORK-22 / Phase 16 : Validation manuelle 10/10 sur WordPress local, audit ZIP et clôture de la Phase 16
- Statut : TERMINÉ
- Fichiers modifiés : `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md`
- Faits marquants et validation :
  1. Validation manuelle réelle des 10 questionnaires sur WordPress local MAMP (`wordpress-local/wordpress`, DB `lifemetrics_wordpress_test`) : intro → modal → questions → résultat → analyse détaillée → CTAs → sauvegarde REST → synchronisation Google Sheets.
  2. Structure certifiée des 10 questionnaires :
     - Tous les 9 questionnaires propriétaires comportent exactement **12 questions scorées** :
       * `hydratation` : 12 questions scorées + 3 questions Safety
       * `fatigue-recuperation` : 12 questions scorées + 3 questions Safety
       * `sommeil` : 12 questions scorées + 3 questions Safety
       * `nutrition` : 12 questions scorées + 3 questions Safety
       * `pieds-confort-postural` : 12 questions scorées + 4 questions Safety
       * `risque-nutritionnel` : 12 questions scorées + 4 questions Safety
       * `sedentarite` : 12 questions scorées (aucun Safety)
       * `activite-physique` : 12 questions scorées (aucun Safety)
       * `bien-etre` : 12 questions scorées (aucun Safety)
     - `pss10` (legacy standard Cohen) : 10 questions scorées (aucun Safety).
  3. UI & UX finalisées et certifiées :
     - Élimination des focus parasites (titre « Mon résultat » et toggle « Lire l'analyse détaillée ») ;
     - Messages Safety simplifiés et sobres avec titre commun « Un point mérite votre attention. » et suppression de l'icône ⚠️ sur les 6 questionnaires concernés ;
     - Complétion du bilan intégrée comme dernier paragraphe dans le volet dépliable de l'analyse détaillée (sans titre distinct ni carte séparée) avec orientation exacte :
       * VitaScan (4 questionnaires) : `hydratation`, `nutrition`, `activite-physique`, `risque-nutritionnel` ;
       * Podos360 (1 questionnaire) : `pieds-confort-postural` ;
       * Services des pharmacies partenaires LifeMetrics / texte neutre (5 questionnaires, sans mention de VitaScan) : `pss10`, `sedentarite`, `fatigue-recuperation`, `sommeil`, `bien-etre` ;
     - Suppression des cartes « Point de vigilance » sur l'écran résultat de `risque-nutritionnel` (guardrails métier conservés côté serveur, ultérieurement généralisée à l'ensemble des 9 questionnaires Generic V2).
  4. Packaging ZIP & Release Audit :
     - `lifemetrics-questionnaires.zip` généré proprement (61 fichiers de production, 449 153 octets non compressés) ;
     - `stage11-release-audit.test.php` PASS à 100% ;
     - Zéro fuite de `preview.php`, `tests/`, `.git*`, `~` ou `.DS_Store`.
  5. Tests automatisés : 42/42 suites passées (23 PHP + 19 JS, 100% PASS), dont 13 gardes de mutation PSS-10.
  6. Site de production LifeMetrics préservé à 100% intact.

### 2026-09-17 — Clôture WORK-19 : Réconciliation documentaire complète

- Statut : TERMINÉ (17 septembre 2026)
- Livrables documentaires réconciliés :
  1. `README.md` : aligné sur l'UX finale (jauge continue seuillée, suppression globale des cartes attention, intégration complétion, flux de transport).
  2. `ARCHITECTURE.md` : spécification technique de la jauge semi-circulaire (mapping arc-to-gradient, découplage score marker / displayed_category pour les guardrails, suppression globale des cartes attention, dual-backend Apps Script).
  3. `QUESTIONNAIRE_INVENTORY.md` : inventaire exhaustif des 10 instruments (1 legacy PSS-10 + 9 Generic V2 12–60), règles d'échelles, matrices, questions Safety distinctes, complétions.
  4. `CHANGELOG.md` : historique unifié avec entrée pour les correctifs UI finaux (alignement gradient `7176816`, suppression globale cartes attention `01ded12`).
  5. `LIFEMETRICS_QUESTIONNAIRES_IMPLEMENTATION_PLAN.md` : statut mis à jour à TERMINÉ.
- Périmètre runtime : strictement gelé et intact (0 fichier PHP/JS/CSS modifié lors de la réconciliation documentaire).
- Suites de tests : 42/42 suites automatisées PASS (23 PHP, 19 JS).
- Prochaine étape : WORK-23 — Revue finale / remise à Camille (À FAIRE).

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
