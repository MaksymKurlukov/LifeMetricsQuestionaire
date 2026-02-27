# PSS-10 — Questionnaire de stress perçu

Mini-projet SPA (une seule page) : échelle PSS-10 (Cohen & Williamson, 1983) avec sections Intro → Test → Résultat, sans rechargement.

**Stack :** HTML / CSS / JavaScript (vanilla) + PHP (API JSON) + MySQL (XAMPP). Aucun framework.

---

## Prérequis

- **XAMPP** (Apache + MySQL + PHP 7.4+)
- Un navigateur moderne

---

## Étapes pour lancer le projet

### 1. Importer le schéma SQL

1. Démarrez **XAMPP** et lancez **Apache** et **MySQL**.
2. Ouvrez **phpMyAdmin** : `http://localhost/phpmyadmin`
3. Créez une base de données nommée **`pss10_db`** (ou le nom que vous utiliserez).
4. Sélectionnez cette base, onglet **Importer** (Import).
5. Choisissez le fichier **`sql/schema.sql`** du projet et exécutez l’import.
6. Vérifiez que les tables **`pss_sessions`** et **`pss_answers`** sont présentes.

### 2. Configurer la connexion base de données

1. Ouvrez **`api/db.php`**.
2. Ajustez les constantes en haut du fichier selon votre environnement :
   - **DB_HOST** : en général `localhost`
   - **DB_NAME** : `pss10_db` 
   - **DB_USER** : `root` (par défaut XAMPP)
   - **DB_PASS** : mot de passe MySQL


### 3. Placer le projet sous le serveur web

1. Copiez le dossier **`pss`** (contenant `index.html`, `api/`, `assets/`, `sql/`) dans le répertoire des projets Apache de XAMPP :
   - **Windows :** `C:\xampp\htdocs\pss`
   - **macOS :** `/Applications/XAMPP/htdocs/pss`
2. Ou configurez un Virtual Host pointant vers le chemin du dossier `pss`.

### 4. Ouvrir et tester le flow complet

1. Ouvrez dans le navigateur : **`http://localhost/pss/`** (ou l’URL correspondant à votre configuration).
2. **Intro** : vérifiez le titre, le texte, les badges, le bouton « COMMENCER », le lien « En savoir plus » (modal) et le footer.
3. Cliquez sur **« COMMENCER »** : la section questionnaire doit s’afficher (Question 1/10).
4. **Questionnaire** : cliquez sur une réponse (radio card) → la réponse se surligne, puis passage automatique à la question suivante après ~400 ms. Testez le bouton **« ← Retour »** à partir de la question 2 ; la réponse précédente doit rester sélectionnée.
5. Après la **question 10** : la section **Résultat** s’affiche avec le score, la pastille (low/medium/high), la jauge demi-cercle, le titre d’interprétation, le bloc d’analyse et les deux boutons CTA.

Si l’API PHP ou MySQL n’est pas disponible, le questionnaire fonctionne quand même : les réponses sont gardées en mémoire et le score est calculé côté client à la fin (pas de sauvegarde en base).

---

## Structure des fichiers

```
pss/
├── index.html          # Page unique (intro + test + résultat + modal)
├── README.md           # Ce fichier
├── assets/
│   ├── css/
│   │   └── style.css   # Styles (design type LifeMetrics)
│   └── js/
│       └── app.js      # Logique SPA, appels API, jauge
├── api/
│   ├── db.php          # Connexion PDO MySQL
│   ├── start_session.php
│   ├── save_answer.php
│   └── finish_session.php
└── sql/
    └── schema.sql      # Tables pss_sessions, pss_answers
```

---

## API (JSON)

- **POST** `api/start_session.php`  
  Corps : `{}`  
  Réponse : `{ "session_id": 123 }`

- **POST** `api/save_answer.php`  
  Corps : `{ "session_id": 123, "question_id": 1, "selected_value": 3 }`  
  Réponse : `{ "ok": true }`

- **POST** `api/finish_session.php`  
  Corps : `{ "session_id": 123 }`  
  Réponse : `{ "final_score": 28, "category": "high", "interpretation_title": "...", "analysis_text": "..." }`

---

## Scoring PSS-10

- Réponses 1–5 (Jamais → Très souvent).
- Questions **inversées** (reverse) : 4, 5, 7, 8 → `score_value = 6 - selected_value`.
- Score final = somme des 10 `score_value` → entre **10** et **50**.
- Catégories : **0–20** low, **21–26** medium, **≥27** high.

---

## Références

- Références : [psy.cmu.edu](https://www.psy.cmu.edu/~scohen/)
