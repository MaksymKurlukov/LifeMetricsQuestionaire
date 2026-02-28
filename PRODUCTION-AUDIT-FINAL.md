# PSS-10 (LifeMetrics) — Production Audit Final

**Date :** 2025-02  
**Contexte :** Standalone SPA, Google Apps Script + Google Sheets, équipe sans développeurs, anonymat strict.

---

## 1. Checklist de production

| # | Point | Statut | Où (fichier / fonction) | À corriger si besoin |
|---|--------|--------|--------------------------|----------------------|
| **A — Baseline** |
| A1 | Endpoint pris depuis config, fallback vide | **OK** | `app.js` L9–12 : `GOOGLE_ENDPOINT` depuis `PSS_CONFIG.googleScriptUrl` ou `''` | — |
| A2 | Pas de secret dans config / repo | **OK** | `config.js` : seul `googleScriptUrl`, `pssSecret` en commentaire | — |
| A3 | PSS_SECRET non utilisé en prod (optionnel côté script) | **OK** | `google-apps-script.gs` L37–46 : check seulement si `PSS_SECRET` défini dans Script Properties | Ne pas définir `PSS_SECRET` en prod |
| A4 | Bouton « Refaire le test » présent et fonctionnel | **OK** | `index.html` L98 `#btn-refaire-test` ; `app.js` `restartTest()`, L356–363, L387 | — |
| A5 | Si endpoint vide → pas de « Résultat enregistré » | **OK** | `app.js` `submitResultToBackend` L196–200, `retrySend` L217–221 : toast « Enregistrement non configuré », pas d’envoi | — |
| A6 | README + guide LifeMetrics pour support sans dev | **OK** | `README.md` (tableau doc), `LIFEMETRICS-GUIDE.md` (Sheet, Deploy, dépannage, URL) | — |
| **B — PSS-10** |
| B1 | Reverse scoring 4, 5, 7, 8 (6 − value) | **OK** | `app.js` L37 `REVERSE_QUESTIONS`, L122 `computeScoreLocal`, L156–165 `buildPayload` | — |
| B2 | Catégories 0–20 low, 21–26 medium, 27+ high | **OK** | `app.js` L126–128 : `total >= 27` → high, `total >= 21` → medium, sinon low | — |
| B3 | Envoi vers Sheets = score_value pour q1..q10 (pas raw) | **OK** | `app.js` `buildPayload` : pour 4,5,7,8 envoi `6 - answer`, sinon `answer` ; `final_score` = somme côté client | — |
| B4 | Apps Script vérifie sum(q1..q10) === final_score | **OK** | `google-apps-script.gs` L65–82 (somme), L92–97 (comparaison) | — |
| **C — UX** |
| C1 | Parcours complet intro → 10 questions → résultat | **OK** | `app.js` `startTest`, `onAnswerClick` (L296–306), `showResult`, `submitResultToBackend` | — |
| C2 | Retour (Retour) conserve la réponse et permet de la changer | **OK** | `app.js` `goBack` L344–347 ; `renderQuestion` lit `state.answers[n]` pour la carte sélectionnée | — |
| C3 | Auto-next sans bouton « Suivant » | **OK** | `app.js` L296–300 : après clic réponse, `setTimeout` → `currentQuestion++`, `renderQuestion()` | — |
| C4 | Résultat : score, catégorie, texte, jauge | **OK** | `app.js` `showResult` L311–334 ; `index.html` result section | — |
| C5 | « Refaire le test » réinitialise et renvoie à l’intro | **OK** | `app.js` `restartTest` : state réinitialisé, `showSection('intro')` ; nouveau sessionId au prochain COMMENCER | — |
| **D — Envoi Google** |
| D1 | Endpoint depuis config, pas de faux succès si vide | **OK** | `app.js` L196–200, L217–221 : si `!GOOGLE_ENDPOINT` → toast neutre, pas d’appel fetch | — |
| D2 | En no-cors, pas de message « enregistré » sans envoi | **OK** | Même garde-fou ; fetch uniquement si URL renseignée | — |
| D3 | Erreur réseau → toast + bloc « Réessayer » | **OK** | `app.js` L206–213, L228–231 : `saveFailed = true`, `resultSaveAlert.hidden = false`, toast « Résultat non sauvegardé » | — |
| **E — Apps Script** |
| E1 | Feuille « results » ou premier onglet | **OK** | `google-apps-script.gs` L101 : `getSheetByName("results") || ss.getSheets()[0]` | — |
| E2 | Blocage doublon session_id (une ligne par session) | **OK** | L99–114 : lecture colonne B à partir de la ligne 2, rejet si `session_id` déjà présent | — |
| E3 | Validation : q1..q10 ∈ [1,5], final_score ∈ [10,50], somme = final_score | **OK** | L65–97 : boucle q1..q10, `Number(val)` 1–5 ; `finalScore` 10–50 ; `sum !== finalScore` → erreur | — |
| **F — Sécurité (production-light)** |
| F1 | Aucun secret en clair côté client / repo | **OK** | `config.js` sans valeur `pssSecret` ; README + commentaire « ne pas commiter » | — |
| F2 | Aucune donnée personnelle (email, IP, nom) | **OK** | Payload : `created_at`, `session_id`, q1..q10, `final_score`, `category` uniquement | — |
| F3 | Limitation des entrées : validations + doublon + rate limit | **OK** | GAS : validations, doublon session_id, CacheService 5 s par session_id | — |
| F4 | Risque spam / bots (hors scope backend) | **WARNING** | Accepté : pas d’IP/auth. Mitigation : filtres manuels dans Sheets, surveillance du volume | Voir section 4 |

**Résumé :** 25 OK, 1 WARNING (risque spam connu, sans changement d’architecture).

---

## 2. Score de préparation (0–10)

| Critère | Note | Commentaire |
|---------|------|-------------|
| **Technique** | 9/10 | Logique PSS-10, validations, envoi, config, pas de dépendances lourdes. -1 : pas de tests automatisés (supprimés). |
| **UX** | 9/10 | Parcours clair, Retour, Refaire le test, toasts et retry, pas de « Suivant ». |
| **Fiabilité des données** | 9/10 | Validations strictes côté script, doublon et rate limit ; no-cors = pas de lecture de la réponse réelle (comportement attendu). |
| **Support sans développeur** | 9/10 | LIFEMETRICS-GUIDE + README, tout se fait dans Google (Sheet + Apps Script). |

**Note globale : 9/10** — Prêt pour la mise en production dans le périmètre défini (Google-only, pas de backend).

---

## 3. À faire avant mise en ligne (priorisé, max 10)

### Critique (avant publication)

1. **Vérifier la Sheet en prod** : onglet nommé `results`, ligne 1 = en-têtes `created_at | session_id | q1..q10 | final_score | category`, ligne 1 figée + filtres si prévu.
2. **Vérifier le déploiement Apps Script** : « Qui a accès » = **Toute personne** (ou équivalent), sinon le site public ne pourra pas envoyer.
3. **Vérifier l’URL dans config** : `config.js` (ou la build) contient bien l’URL du déploiement Web App utilisée en prod.

### Souhaitable

4. **Sauvegarder le lien de la Sheet** : le mettre dans LIFEMETRICS-GUIDE ou en favori partagé pour que l’équipe sache où regarder les données.
5. **Ne pas définir PSS_SECRET** dans les Script Properties du projet Apps Script en production (pour éviter tout blocage si un ancien secret traîne).
6. **Vérifier le domaine / hébergement** : le site (Netlify, etc.) est bien en HTTPS et accessible depuis lifemetrics.fr (lien uniquement).

### Nice-to-have

7. **Nettoyer le bloc `__PSS_RUN_TESTS__`** dans `app.js` (L391–401) : code mort depuis la suppression des tests ; optionnel.
8. **Filtrer les données dans Sheets** : utiliser les filtres natifs (ou vues filtrées) pour repérer d’éventuelles séries suspectes (même category, même score, timestamps rapprochés).
9. **Documenter la procédure « nouveau déploiement »** : si le script est republié et que l’URL change, mettre à jour `config.js` + redéployer le front (déjà décrit dans LIFEMETRICS-GUIDE §4).
10. **Surveiller le volume** : au début, vérifier régulièrement que les lignes arrivent bien dans la Sheet et qu’il n’y a pas de pic anormal (spam).

---

## 4. Risques réels (sans backend)

- **Spam / bots** : sans IP ni auth, un acteur peut envoyer beaucoup de requêtes avec des `session_id` différents.  
  **Mitigations sans backend :**  
  - Garder le rate limit (5 s par session_id) pour limiter les envois répétés depuis une même session.  
  - Dans Sheets : filtres, tri par date, suppression manuelle des lignes manifestement aberrantes.  
  - Si le volume devient problématique : envisager (hors scope actuel) un captcha ou un proxy avec limite par IP, sans aller vers PostgreSQL ni auth utilisateur.

- **Données incohérentes** : déjà limitées par les validations (q1..q10, final_score, somme) et le blocage des doublons de session_id.

---

## 5. Instruction LifeMetrics (2 minutes)

**Où voir les données**  
Ouvrez la **Google Sheet** du projet (lien dans vos favoris ou Google Drive). Les nouveaux passages du test apparaissent en **nouvelles lignes** ; colonnes : date/heure, session_id, q1…q10, score final, catégorie.

**Si les données ne s’écrivent pas**  
1) Vérifier que l’URL du script est bien celle du déploiement actif dans `config.js` (ou équivalent) du site en ligne.  
2) Vérifier que le déploiement Apps Script est en « **Toute personne** » peut y accéder.  
3) Vérifier que l’onglet s’appelle bien **results** (ou qu’il est en premier).  
Détails et étapes précises : **LIFEMETRICS-GUIDE.md** (sections 2 et 3).

**Si vous republiez le script (nouveau déploiement)**  
Une **nouvelle URL** est générée. Il faut alors mettre à jour cette URL dans le projet du site (fichier `config.js` ou équivalent), puis **republier le site** (Netlify / hébergeur). Sans ça, le site continuera d’envoyer vers l’ancienne URL et les données ne reviendront pas dans la bonne Sheet. Voir **LIFEMETRICS-GUIDE.md** §4.
