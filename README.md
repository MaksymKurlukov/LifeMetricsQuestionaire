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

1. Créez une nouvelle Google Sheet nommée **PSS_Results**
2. Ajoutez les colonnes suivantes dans la première ligne :
   - `created_at`, `session_id`, `q1`, `q2`, `q3`, `q4`, `q5`, `q6`, `q7`, `q8`, `q9`, `q10`, `final_score`, `category`

### 2. Ajouter le Google Apps Script

1. Dans votre Google Sheet : **Extensions** → **Apps Script**
2. Collez le code du script doPost
3. **Deploy** → **New deployment** → Type: **Web app**
4. Copiez l'URL générée

### 3. Configurer l'URL dans le projet

1. Ouvrez `assets/js/app.js`
2. Modifiez la ligne 10 avec votre URL Google Apps Script

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
├── index.html          # Page unique (intro + test + résultat + modal)
├── README.md           # Ce fichier
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

## Références

- Échelle PSS-10 : [psy.cmu.edu](https://www.psy.cmu.edu/~scohen/)
