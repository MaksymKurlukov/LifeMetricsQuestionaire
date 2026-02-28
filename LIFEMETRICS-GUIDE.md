# PSS-10 — Guide de support (équipe LifeMetrics)

**Public :** équipe sans compétences techniques. Ce document permet de maintenir le questionnaire PSS-10 et de consulter les données dans Google Sheets.

---

## 1. Où ouvrir la Google Sheet (les données du test)

- Les réponses des utilisateurs sont enregistrées dans **une Google Sheet** liée au projet.
- **Où la trouver :** dans le compte Google (Google Workspace) utilisé pour créer le projet. Ouvrez **Google Drive** → cherchez la feuille dont le nom contient par exemple **« PSS »** ou **« results »** (celle que vous avez créée pour ce questionnaire).
- **Lien direct :** si quelqu’un vous a transmis le lien vers la feuille (format `https://docs.google.com/spreadsheets/d/...`), enregistrez-le dans vos favoris. Vous pourrez l’ouvrir à tout moment pour voir les nouvelles lignes (chaque passage du test = une ligne).
- **Colonnes à voir :** `created_at`, `session_id`, `q1` … `q10`, `final_score`, `category`. La première ligne doit contenir ces en-têtes.

---

## 2. Où est le Apps Script et comment faire un Déploiement (Deploy)

Le **Apps Script** est le petit programme qui reçoit les réponses du site et les écrit dans la Google Sheet. Il vit **dans la même Google Sheet**.

### Étape 1 — Ouvrir le script

1. Ouvrez la **Google Sheet** des résultats (voir section 1).
2. Dans le menu du haut : **Extensions** (ou **Outils**) → **Apps Script**.
3. Une nouvelle fenêtre (ou onglet) s’ouvre : l’éditeur Apps Script. Vous y voyez un fichier (souvent `Code.gs`) avec du code.

### Étape 2 — Vérifier / coller le code

- Si le projet a déjà été configuré, le code est déjà là. **Ne le modifiez pas** si tout fonctionne.
- Si le code a été perdu ou si on vous a demandé de tout reconfigurer : copiez tout le contenu du fichier **`google-apps-script.gs`** (fourni avec le projet) et collez-le dans l’éditeur, en remplaçant tout le contenu de `Code.gs`. Puis **Enregistrer** (icône disquette ou Ctrl+S).

### Étape 3 — Déployer en « Web app »

1. Dans l’éditeur Apps Script, en haut à droite : cliquez sur **Déployer** (ou **Deploy**) → **Nouveau déploiement** (ou **New deployment**).
2. À côté de **Type**, cliquez sur l’engrenage (⚙️) et choisissez **Application Web** (ou **Web app**).
3. Paramètres à vérifier :
   - **Exécuter en tant que :** Moi (votre compte).
   - **Qui peut y accéder :** Toute personne (ou « Tout le monde ») — pour que le site public puisse envoyer les réponses.
4. Cliquez sur **Déployer** (ou **Deploy**).
5. La première fois, Google peut demander **Autoriser l’accès** : acceptez (connexion avec le compte qui gère la feuille).
6. À la fin, une **URL** s’affiche (elle commence par `https://script.google.com/macros/s/...`). **Copiez cette URL** et gardez-la : c’est l’adresse à laquelle le site envoie les données.

**Important :** chaque fois que vous modifiez le code du script et que vous voulez que les changements soient actifs, il faut créer un **nouveau déploiement** (ou « Nouvelle version » du déploiement existant) et, si l’URL change, mettre à jour l’URL dans le site (voir section 4).

---

## 3. Que faire si les données ne s’écrivent pas

Si les utilisateurs ne voient pas « Résultat enregistré » ou si les lignes n’apparaissent pas dans la Google Sheet :

### 1) Vérifier que l’URL du script est bien configurée côté site

- Le site (celui hébergé par LifeMetrics, par exemple sur Netlify) doit connaître l’URL du déploiement Apps Script. Si cette URL n’est pas renseignée ou est incorrecte, les données ne partent pas.
- **Qui peut le faire :** une personne qui a accès au code du site (ou au fichier de configuration). Elle doit mettre l’URL du déploiement (celle copiée à l’étape 2.3) dans le fichier prévu pour ça (souvent `config.js` ou équivalent). Voir section 4 pour « comment changer l’URL ».

### 2) Vérifier que le déploiement Apps Script est bien « Toute personne »

- Dans Apps Script : **Déployer** → **Gérer les déploiements** (ou **Manage deployments**).
- Ouvrez le déploiement actif et vérifiez que **Qui peut y accéder** est bien **Toute personne** (ou équivalent). Si c’est « uniquement moi » ou « utilisateurs de l’organisation », le site public ne pourra pas envoyer les données.

### 3) Vérifier le nom de l’onglet dans la Google Sheet

- Le script écrit dans un onglet dont le nom est **`results`** (ou, à défaut, le premier onglet de la feuille).
- Ouvrez votre Google Sheet : assurez-vous qu’un onglet s’appelle exactement **results** (en minuscules). Si l’onglet s’appelle autrement, renommez-le en **results** ou placez-le en premier.

Si après ces trois points le problème continue, il faudra faire vérifier par un technicien (logs du site, éventuellement logs Apps Script).

---

## 4. Comment changer l’URL (si vous avez refait un déploiement)

Si vous avez créé un **nouveau déploiement** dans Apps Script, une **nouvelle URL** est générée. Le site doit alors utiliser cette nouvelle URL, sinon les données ne seront pas envoyées au bon endroit.

- **Où changer l’URL :** dans le projet du site, dans le fichier **`config.js`** (dans le dossier `assets/js/`). Il contient une ligne du type :  
  `googleScriptUrl: 'https://script.google.com/macros/s/...'`
- **Que faire :** remplacez l’ancienne URL par la **nouvelle URL** du déploiement (celle affichée après « Déployer » dans Apps Script).
- **Qui le fait :** une personne ayant accès au dépôt de code (Git) ou à l’hébergement du site. Après modification, le site doit être **republié** (redéployé) pour que le changement soit en ligne.

Pour les détails techniques (nom du fichier, déploiement Netlify, etc.), les développeurs peuvent s’appuyer sur le **README.md** du projet.

---

## Résumé rapide

| Besoin | Où aller |
|--------|----------|
| Voir les réponses | Google Sheet (Drive ou lien partagé) |
| Modifier le script ou redéployer | Google Sheet → Extensions → Apps Script → Déployer |
| Données ne s’écrivent pas | Vérifier URL dans le site, accès « Toute personne », onglet `results` |
| URL a changé (nouveau déploiement) | Mettre à jour `config.js` et redéployer le site |
