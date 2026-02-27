# PSS-10 — Questionnaire de stress perçu

Mini-projet SPA (une seule page) : échelle PSS-10 (Cohen & Williamson, 1983) avec sections Intro → Test → Résultat, sans rechargement.

**Stack :** HTML / CSS / JavaScript (vanilla) + Google Apps Script (Google Sheets). Aucun framework.

---

## Prérequis

- Un navigateur moderne
- Un serveur web local (XAMPP, MAMP, ou `python -m http.server`)
- Google Apps Script configuré (voir ci-dessous)

---

## Configuration Google Sheets

### 1. Créer une Google Sheet

1. Créez une nouvelle Google Sheet nommée **results**
2. Ajoutez les colonnes suivantes dans la première ligne :
   - `created_at`, `session_id`, `q1`, `q2`, `q3`, `q4`, `q5`, `q6`, `q7`, `q8`, `q9`, `q10`, `final_score`, `category`

### 2. Ajouter le Google Apps Script

1. Dans votre Google Sheet : **Extensions** → **Apps Script**
2. Collez le code du fichier **`google-apps-script.gs`** (à la racine du projet) — fonction `doPost(e)` avec validation, rate limit et option secret.
3. **Deploy** → **New deployment** → Type: **Web app**
4. Copiez l'URL générée

### 3. Configurer l'URL dans le projet

1. Ouvrez **`assets/js/config.js`** et remplacez `VOTRE_SCRIPT_ID` par l’ID de votre déploiement Web App.
2. Ou bien, modifiez directement la constante `GOOGLE_ENDPOINT` au début de `assets/js/app.js` (ligne ~10).

### 4. Format requête / réponse (API Google Apps Script)

**Corps de la requête POST (JSON)** envoyé en fin de test :
- `created_at` — date/heure ISO (ex. `2025-02-26T12:00:00.000Z`)
- `session_id` — UUID généré côté client
- `q1` … `q10` — réponses brutes 1–5 pour les questions normales ; pour les questions inversées (4, 5, 7, 8), l’app envoie déjà la valeur de score `6 - selected_value`
- `final_score` — score total (10–50)
- `category` — `low` | `medium` | `high`

**Réponse du script** : avec `fetch(..., { mode: 'no-cors' })` le corps de la réponse n’est pas lisible côté client. En cas de succès, l’app considère qu’il n’y a pas d’erreur réseau. 
### 5. Vérification de la sauvegarde

- **Envoi** : l'app utilise `fetch` en `no-cors`. En cas de succès, un toast « Résultat enregistré » s'affiche. En cas d'échec, un message et le bouton « Réessayer » permettent de renvoyer les données.

---

## Lancer le projet

1. Placez le dossier **`pss`** dans votre serveur web :
   - **XAMPP (macOS):** `/Applications/XAMPP/htdocs/pss`
   - **XAMPP (Windows):** `C:\xampp\htdocs\pss`

2. Ouvrez dans le navigateur : **`http://localhost/pss/`**

3. Ou utilisez Python : `cd pss && python3 -m http.server 8000`

---

## Structure des fichiers

```
pss/
├── index.html              # Page unique (intro + test + résultat + modal)
├── README.md               # Ce fichier
├── google-apps-script.gs   # Code à coller dans Apps Script (doPost)
├── tests/
│   └── pss-test.html      # Tests QUnit (computeScoreLocal, buildPayload)
└── assets/
    ├── css/
    │   └── style.css   # Styles
    ├── js/
    │   └── app.js      # Logique SPA, Google Sheets, jauge
    └── icons/
        ├── shield.svg
        ├── lock.svg
        └── clock.svg
```

---

## Flow de l'application

1. **Intro** : Titre, description, badges, bouton « COMMENCER », modal
2. **Questionnaire** : 10 questions avec réponses 1-5, progression, bouton retour
3. **Résultat** : Score, catégorie, jauge demi-cercle, analyse, boutons CTA
4. **Sauvegarde** : Envoi automatique vers Google Sheets

---

## Scoring PSS-10

- Réponses 1–5 (Jamais → Très souvent)
- Questions **inversées** : 4, 5, 7, 8 → `score = 6 - selected_value`
- Score final = somme des 10 valeurs → entre **10** et **50**
- Catégories : **0–20** low, **21–26** medium, **≥27** high

---

## Tests (QUnit)

Ouvrez **`tests/pss-test.html`** dans le navigateur (via le même serveur web que l’app, ex. `http://localhost/pss/tests/pss-test.html`). Les tests vérifient :

- **computeScoreLocal()** : somme avec reverse pour les questions 4, 5, 7, 8 ; catégories low / medium / high.
- **buildPayload(result)** : présence des champs `created_at`, `session_id`, `q1`…`q10`, `final_score`, `category` ; valeurs de score correctes pour les questions inversées.

## Références

- Échelle PSS-10 : [psy.cmu.edu](https://www.psy.cmu.edu/~scohen/)
