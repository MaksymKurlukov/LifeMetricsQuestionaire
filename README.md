# PSS-10 — Questionnaire de stress perçu

Application **standalone** (SPA) : échelle PSS-10 (Cohen, Kamarck & Mermelstein). Une seule page HTML, logique en JavaScript, sauvegarde des résultats via **Google Apps Script** dans **Google Sheets**. Aucun serveur applicatif, aucune base de données tierce.

**Stack :** HTML5, CSS3, JavaScript (vanilla), Google Apps Script, Google Sheets.

---

## Documentation

| Public | Fichier | Contenu |
|--------|---------|---------|
| **Équipe LifeMetrics (non-dev)** | [LIFEMETRICS-GUIDE.md](./LIFEMETRICS-GUIDE.md) | Où ouvrir la Sheet, déployer le script, dépanner « données ne s’écrivent pas », changer l’URL. |
| **Développeurs** | Ce README | Architecture, configuration, API, structure, déploiement. |

---

## Prérequis techniques

- Navigateur moderne (ES5+)
- Hébergement statique (Netlify, Vercel, GitHub Pages, ou serveur web local)
- Compte Google (Google Workspace) pour Sheets + Apps Script

---

## Structure du projet

```
pss/
├── index.html                 # Point d’entrée unique (intro / test / résultat + modal)
├── README.md                  # Documentation développeur (ce fichier)
├── LIFEMETRICS-GUIDE.md       # Guide support équipe LifeMetrics
├── google-apps-script.gs      # Code à déployer dans Apps Script (doPost, validation, rate limit)
└── assets/
    ├── css/style.css
    ├── js/
    │   ├── config.js          # URL du Web App (googleScriptUrl) — ne pas commiter de secret
    │   └── app.js             # Logique SPA : state, scoring, envoi Sheets
    └── icons/                 # SVG (shield, lock, clock)
```

---

## Configuration

### 1. Google Sheet

- Créer une Google Sheet.
- Premier onglet nommé **`results`** (ou le script utilisera le premier onglet).
- Ligne 1 = en-têtes :  
  `created_at` | `session_id` | `q1` | `q2` | … | `q10` | `final_score` | `category`

### 2. Apps Script (Web App)

1. Dans la Sheet : **Extensions** → **Apps Script**.
2. Coller le contenu de **`google-apps-script.gs`** dans l’éditeur (remplacer le contenu par défaut). Sauvegarder.
3. **Déployer** → **Nouveau déploiement** → type **Application Web** :
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Toute personne** (pour accepter les requêtes du front public).
4. Copier l’**URL du déploiement** (ex. `https://script.google.com/macros/s/.../exec`).

### 3. Front : config.js

Dans **`assets/js/config.js`** :

```js
window.PSS_CONFIG = {
  googleScriptUrl: 'https://script.google.com/macros/s/VOTRE_ID/exec'
};
```

Remplacer par l’URL réelle du déploiement. **Ne pas** ajouter de secret côté client (voir section Sécurité).

---

## API (contrat Google Apps Script)

### Requête POST

- **Content-Type :** `application/json`
- **Corps (JSON) :**
  - `created_at` (string, ISO 8601)
  - `session_id` (string, UUID)
  - `q1` … `q10` (number, 1–5 ; pour les questions inversées 4,5,7,8 le client envoie déjà `6 - value`)
  - `final_score` (number, 10–50)
  - `category` (string : `low` | `medium` | `high`)

### Réponse

- **200** + JSON `{ "ok": true }` en cas de succès.
- **200** + JSON `{ "ok": false, "error": "..." }` en cas d’erreur (validation, rate limit, doublon session_id, etc.).

Le front utilise `fetch` en **no-cors** : le corps de la réponse n’est pas lu. Succès = pas d’erreur réseau. Si `googleScriptUrl` est vide, l’app affiche « Enregistrement non configuré » et n’envoie pas.

### Côté script (résumé)

- Validation : champs requis, `q1`…`q10` ∈ [1,5], `final_score` ∈ [10,50], `sum(q1..q10) === final_score`.
- Rate limit par `session_id` (CacheService, 5 s).
- Rejet si `session_id` déjà présent dans la feuille (une ligne par session).
- Pas de `PSS_SECRET` en production (ne pas définir dans Script Properties ; ne pas commiter de secret dans le repo).

---

## Lancer en local

```bash
# Depuis la racine du projet
python3 -m http.server 8000
# Puis ouvrir http://localhost:8000/
```

Ou placer le dossier sous un serveur web (XAMPP, MAMP, etc.) et ouvrir l’URL correspondante.

---

## Flow applicatif

1. **Intro** — Titre, texte, bouton « COMMENCER », lien « En savoir plus » (modal).
2. **Test** — 10 questions PSS-10, une par écran, auto-avancement au clic sur une réponse, bouton « Retour ».
3. **Résultat** — Score (10–50), catégorie (low / medium / high), jauge, texte d’analyse, bouton « Refaire le test », CTA (stubs), « Réessayer » si l’envoi a échoué.
4. **Sauvegarde** — Un seul POST en fin de test vers l’URL configurée ; toast « Résultat enregistré » ou « Résultat non sauvegardé » / « Enregistrement non configuré » si URL vide.

---

## Scoring PSS-10

- Réponses 1–5 (Jamais → Très souvent).
- Questions **inversées** 4, 5, 7, 8 : `score_value = 6 - selected_value`.
- Score final = somme des 10 scores ∈ [10, 50].
- Catégories : **0–20** low, **21–26** medium, **≥27** high.

---


## Déploiement (production)

- **Front :** déployer le contenu du dossier (HTML, CSS, JS, assets) sur un hébergement statique (Netlify, Vercel, GitHub Pages, etc.). Aucun build requis.
- **Config :** s’assurer que `config.js` contient la bonne `googleScriptUrl` pour l’environnement (variable d’environnement au build ou fichier spécifique à l’env si besoin).
- **Apps Script :** déjà hébergé par Google ; en cas de nouveau déploiement, mettre à jour l’URL dans le front et redéployer le site. Voir [LIFEMETRICS-GUIDE.md](./LIFEMETRICS-GUIDE.md) pour la procédure côté équipe support.

---

## Sécurité

- **Pas de secret dans le repo.** Ne pas commiter `pssSecret` (ou équivalent) dans `config.js`. En production, nous n’utilisons pas de secret côté client.
- Données strictement anonymes : `session_id`, réponses, score, catégorie. Pas d’email, pas d’IP, pas de login.
- Protection côté script : validation stricte, rate limit, unicité `session_id` dans la feuille.

---

## Références

- PSS-10 : [Cohen & Williamson, 1983](https://www.psy.cmu.edu/~scohen/) — [psy.cmu.edu](https://www.psy.cmu.edu/~scohen/)
