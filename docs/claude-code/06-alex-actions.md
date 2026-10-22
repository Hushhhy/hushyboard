# 06 · Actions d'Alex (comptes, clés, tests)

Claude Code s'arrête et te renvoie ici quand il a besoin de toi. Coche au fur et à mesure.

## Avant de lancer Claude Code

- [ ] Fais le ménage dans Figma (voir la checklist du chat), puis exporte en PNG (×1) les 10 cadres de la page « Écrans » dans `docs/claude-code/mockups/figma/`, avec exactement ces noms :
  - `v1-home.png` (Accueil)
  - `v1-job-search-applications.png` (Recherches pro · Candidatures)
  - `v1-job-search-watch.png` (Recherches pro · Veille, déjà présent, à remplacer)
  - `v1-job-search-analytics.png` (Recherches pro · Analyses)
  - `v1-career-progress.png` (Carrière · Progression)
  - `v1-career-resume.png` (Carrière · CV)
  - `v1-career-certifications.png` (Carrière · Certifications)
  - `v2-career-profile.png` (v2 · Carrière · Profil)
  - `v2-career-profile-skill-javascript.png` (déjà présent, à remplacer)
  - `v2-job-search-offer.png` (déjà présent, à remplacer)
- [ ] Commit et push de ce dossier `docs/` et du fichier `CLAUDE.md`.
- [ ] Lance Claude Code à la racine du projet et donne-lui le premier message de `07-premier-message.md`.

## Phase 2b · Jeton GitHub (projets)

1. Sur GitHub, ouvre ta photo de profil, puis Settings, puis Developer settings. Choisis Personal access tokens, puis **Fine-grained tokens**, puis Generate new token.
2. Remplis le formulaire ainsi :
   - Nom : « Hushyboard projets ».
   - Expiration : 1 an. Note la date dans ton agenda.
   - Repository access : **All repositories**.
   - Permissions (onglet Repositories) : **Contents : Read-only** et **Metadata : Read-only**. Rien d'autre.
3. Copie le jeton (tu ne le reverras plus), puis ajoute `GITHUB_TOKEN=...` dans `.env` et sur Vercel (Production). Redéploie.
4. Bon à savoir : ce jeton ne peut que lire tes dépôts. Pour un projet d'équipe hébergé sur le compte d'un camarade, utilise « Ajouter un dépôt » dans l'app, avec son URL. Ça marche si le dépôt est public.

## Phase 2 · Clé Gemini (gratuite)

1. Va sur https://aistudio.google.com, connecte-toi avec ton compte Google, puis ouvre « Get API key » et « Create API key ».
2. Ajoute dans `.env` (local) : `GEMINI_API_KEY=...` et `GEMINI_MODEL=` (laisse la valeur que Claude Code te donne).
3. Sur Vercel, ouvre Project et Settings, puis Environment Variables. Ajoute les deux mêmes variables pour l'environnement Production, puis redéploie.
4. À savoir : avec l'offre gratuite, Google peut utiliser ce que tu envoies pour améliorer ses produits. Le dashboard n'envoie que des noms de notions et de propriétés (pour les fiches mémo), ton CV, les offres et les mails de recruteurs. Il n'envoie jamais tes finances.

## Phase 5 · Gmail

1. Va sur https://console.cloud.google.com et crée un projet nommé « Hushyboard ».
2. Ouvre APIs & Services, puis Library. Cherche « Gmail API » et clique sur Enable.
3. Ouvre OAuth consent screen et remplis-le ainsi :
   - Type : External.
   - Nom de l'app : Hushyboard. Email de support : ton Gmail.
   - Scopes : ajoute `https://www.googleapis.com/auth/gmail.modify`.
   - Test users : ajoute ton adresse Gmail.
   - Laisse le statut en **Testing**.
4. Ouvre Credentials, puis Create credentials, puis OAuth client ID. Choisis le type « Web application ».
   - Authorized redirect URIs :
     - `http://localhost:3000/api/gmail/callback`
     - `https://hushyboard.vercel.app/api/gmail/callback`
5. Copie le Client ID et le Client secret.
   - Dans `.env` : `GOOGLE_CLIENT_ID=...` et `GOOGLE_CLIENT_SECRET=...`.
   - Génère la clé de chiffrement avec `openssl rand -base64 32` dans Git Bash, puis ajoute `TOKEN_ENCRYPTION_KEY=...`.
6. Mets les mêmes 3 variables sur Vercel (Production), puis redéploie.
7. À savoir : en mode Testing, Google te déconnecte tous les 7 jours, et il suffit de cliquer sur « Reconnecter ». Si ça t'agace, passe l'app en « In production ». Google affichera alors un écran « app non vérifiée » : clique sur Paramètres avancés, puis sur Continuer.

## À chaque fin de phase

- [ ] Lis la PR et suis la checklist « Comment tester » en local (`npm run db:up` puis `npm run dev`).
- [ ] Si tout va bien, merge la PR sur GitHub. Vercel déploie tout seul et applique les migrations sur Neon.
- [ ] Teste en production sur https://hushyboard.vercel.app (et non sur l'URL de déploiement).
- [ ] Si quelque chose ne va pas, décris-le à Claude Code avec une capture d'écran.
