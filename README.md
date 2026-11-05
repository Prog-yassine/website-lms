# Grupedia

Grupedia est une plateforme de création d’applications en cours de développement : bases de données, authentification, stockage, templates et plugins. Ce dépôt contient la vitrine responsive, un premier tableau de bord et une API REST fonctionnelle pour les comptes, la consultation de données de test et le stockage de fichiers privés.

## Ce qui fonctionne

- Inscription et connexion par e-mail et mot de passe, avec session côté serveur.
- JWT d’accès conservé en mémoire dans le navigateur et renouvellement par cookie `HttpOnly`.
- Un projet **Starter project** créé automatiquement pour chaque nouveau compte.
- Consultation des tables de test `products`, `customers` et `orders` dans `main`, avec colonnes, recherche et pagination.
- Vue `auth` séparée : profils et sessions du propriétaire du projet, sans hachages ni identifiants de renouvellement.
- Contrôle de propriété des projets : un utilisateur ne peut pas consulter les données d’un autre compte.
- Déconnexion qui révoque la session, y compris les jetons d’accès encore valides.
- Section Authentication : compte propriétaire du projet, fournisseur e-mail/mot de passe, sessions actives et révocation des autres sessions.
- Section Storage : buckets privés, import, recherche, téléchargement et suppression de fichiers ; suppression des buckets vides.
- Accueil, tarifs, simulateur et présentation développeurs adaptés au mobile.

Les données de test sont réellement enregistrées en SQLite en local et dans Cloudflare D1 pour l’environnement hébergé. Chaque compte possède son projet et ses lignes de démonstration, dans une base physique partagée avec filtrage par projet. Les fichiers sont stockés dans Cloudflare R2 et leurs métadonnées dans D1. En local, les fichiers restent dans `server/.local/objects`. **Ce MVP ne provisionne aucune infrastructure AWS ni base PostgreSQL.** Les services AWS, les tarifs commerciaux et les intégrations décrits dans la vitrine restent des propositions.

La vérification d’adresse e-mail, le mot de passe oublié, IAM/SSO, les écritures dans les tables, l’éditeur SQL, les bases PostgreSQL réelles, les connexions Google/GitHub et les paiements ne sont pas encore implémentés. Les comptes utilisateurs des applications clientes restent à développer : la section Authentication montre actuellement le compte propriétaire du projet, jamais les comptes des autres projets. Les pages qui les annoncent ne constituent pas une offre active.

## Démarrer en local

Prérequis : **Node.js 24 ou version ultérieure** et npm. Le serveur local et les tests API utilisent le module natif `node:sqlite`.

```sh
npm ci
npm ci --prefix server
npm run build:site
npm run dev:fullstack
```

Ouvrir **http://127.0.0.1:8787**, créer un compte, puis se connecter pour consulter le projet de test. Le menu du tableau de bord donne accès à Database, Authentication et Storage sur ordinateur et mobile. Ce serveur sert l’interface et `/api/*` sur la même origine. Le mode `npm start` conserve le serveur de développement React ; il ne lance pas, à lui seul, l’API nécessaire au parcours complet.

Le premier lancement initialise `server/.local/grupedia.sqlite` à partir du schéma et du suivi des migrations. Cette base locale conserve les comptes, projets et métadonnées des fichiers entre les redémarrages. Les contenus des fichiers persistent séparément dans `server/.local/objects`. Pour repartir à zéro, arrêter le serveur puis supprimer le dossier `server/.local` avant de relancer `npm run dev:fullstack`.

### Configuration

- **`JWT_SECRET`** : secret réservé au serveur, d’au moins 32 octets UTF-8. En local, une valeur aléatoire est générée en mémoire si elle est absente. Fournir une valeur stable dans l’environnement du processus permet de conserver la même clé entre les lancements. Une clé locale régénérée invalide les anciens JWT d’accès ; un cookie de renouvellement encore valide peut restaurer la session avec la nouvelle clé.
- **`REACT_APP_API_URL`** : laisser cette valeur vide pour utiliser `/api/*` sur l’origine du site. La configuration est intégrée au build React. Une URL d’API sur une autre origine n’est pas prise en charge par la politique actuelle des requêtes de navigateur.
- En hébergement, le Worker attend un binding D1 nommé **`DB`**, un binding R2 nommé **`BUCKET`** et un secret serveur **`JWT_SECRET`**. Le fichier `.openai/hosting.json` décrit le site et les ressources nécessaires ; le secret n’y est pas enregistré.

Les variables `REACT_APP_*` sont publiques dans le navigateur : ne jamais y placer de secret. Les fichiers d’environnement locaux, la base locale et les dépendances ne sont pas suivis par Git.

## Vérifier et construire

```sh
CI=true npm test -- --watchAll=false --runInBand
npm run test:api
npm run build:site
```

Les tests API exécutent les requêtes réelles du Worker contre une base SQLite isolée par test, avec bcrypt et la cryptographie réels. Ils vérifient notamment l’isolation des comptes, les sessions, les identifiants SQL autorisés, la recherche, la pagination, les origines, la limitation des tentatives, les quotas du stockage privé et les opérations binaires. Les tests de stockage utilisent un adaptateur R2 en mémoire ; le serveur local utilise le système de fichiers.

`npm run build:site` construit l’interface et le Worker dans `dist/` avec la configuration d’hébergement. Un hébergement purement statique du dossier React `build/` ne suffit pas pour la connexion et le tableau de bord : il faut également exécuter l’API et relier la base. L’interface utilise une redirection SPA vers `index.html` pour ses routes, tandis que `/api/*` doit être traité par le Worker. Les téléchargements de fichiers renvoient du binaire ; les autres réponses sont JSON.

## API REST

Voir [la référence REST et le cycle des sessions](docs/rest-api.md) pour les routes, les formats JSON, les limites et les exemples. La nouvelle connexion utilise `POST /api/auth/login` ; `/api/auth/root` reste un alias de compatibilité. Les anciennes routes IAM et `/api/auth/verify` ne font pas partie de cette API.

## Sections du tableau de bord

- `/dashboard` ou `/dashboard/database` : exploration des tables de test en lecture seule.
- `/dashboard/auth` : profil du propriétaire du projet, fournisseurs disponibles, sessions actives et liens vers `auth.users` et `auth.sessions`. Le compte courant se déconnecte avec Sign out ; une autre session peut être révoquée après confirmation.
- `/dashboard/storage` : fichiers privés accessibles uniquement avec un JWT du propriétaire du projet. Les fichiers ne reçoivent pas d’URL publique et sont téléchargés comme pièces jointes.

Le sélecteur de schéma du Table Editor distingue `main` et `auth`. Dans ce prototype SQLite/D1, `auth` est un espace de noms logique avec projections et filtrage côté serveur ; ce n’est pas encore un schéma PostgreSQL physique. Les hachages des mots de passe et des cookies restent hors de ces vues. Un véritable schéma PostgreSQL `auth` pourra être créé lors de la migration vers AWS.

Limites du prototype : **5 MiB par fichier**, **25 MiB par projet**, **5 buckets par projet** et **50 fichiers par bucket**. Ces limites techniques sont indépendantes des offres commerciales proposées sur la page des tarifs. Les quotas comptent aussi les imports en cours.

## Aperçus

![Accueil sur ordinateur](docs/previews/home-desktop.png)

[Accueil mobile](docs/previews/home-mobile.png) · [Tarifs sur ordinateur](docs/previews/pricing-1440.png) · [Tarifs sur mobile](docs/previews/pricing-390.png)

[Tableau de bord sur ordinateur](docs/previews/dashboard-desktop.png) · [Tableau de bord sur mobile](docs/previews/dashboard-mobile.png)

[Authentication sur ordinateur](docs/previews/authentication-desktop.png) · [Authentication sur mobile](docs/previews/authentication-mobile.png) · [Storage sur ordinateur](docs/previews/storage-desktop.png) · [Storage sur mobile](docs/previews/storage-mobile.png)

Ces captures ne remplacent pas un test de la version exécutée.

## Architecture et tarifs proposés

- [Recherche AWS et modèle économique](docs/aws-architecture-and-pricing.fr.md) : services recommandés, coûts vérifiés à Stockholm et hypothèses.
- [Architecture AWS approfondie](docs/architecture-aws-complete.fr.md) : besoins du MVP, options de croissance, isolation et budgets reproductibles.
- [Budget de démarrage](docs/budget-demarrage-grupedia.fr.md) : trésorerie sur six mois et hypothèses de travail personnel ou sous-traité.
- [Coûts AWS et prix de vente proposés](docs/prix-grupedia-bases-sur-aws.fr.md).

La page `/pricing` présente Free, Pro à 25 $/mois et Team à 99 $/mois, leurs quotas partagés par espace et des dépassements proposés. L’estimateur utilise `src/lib/pricing.js` et calcule uniquement dans le navigateur. Il ne collecte aucun paiement, ne crée aucun abonnement et ne mesure pas les consommations réelles.

## Structure

- `src/auth/` et `src/lib/api.js` : état de session en mémoire, client JSON et renouvellement.
- `src/router/` : vitrine, formulaires et tableau de bord.
- `src/components/` : identité, navigation et composants de l’interface.
- `server/worker.js` : API REST, authentification et autorisation des projets.
- `server/schema.sql` : schéma SQLite/D1 des comptes, sessions et données de test.
- `server/db/schema.js` et `drizzle/` : schéma Drizzle et migrations de déploiement, à générer avec `npm run db:generate --prefix server` avant toute évolution de structure.
- `server/*.test.mjs`, `server/test-d1.mjs` et `server/test-r2.mjs` : tests d’intégration sur SQLite réel et adaptateur R2.
- `server/local-r2.mjs` : stockage local des contenus binaires pour le développement.

Les anciennes pages restent récupérables dans l’historique Git.
