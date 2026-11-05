# API REST de Grupedia

Cette API implémente l’inscription, la connexion, les sessions la consultation d’un projet de test par utilisateur et la gestion de fichiers privés. Elle utilise une base SQLite locale en développement et un binding Cloudflare D1 `DB` en hébergement, ainsi qu’un binding R2 `BUCKET` pour les contenus des fichiers. Aucune infrastructure AWS, base PostgreSQL distante ou fonctionnalité de facturation n’est provisionnée par ces routes.

Le point d’entrée est `handleApi(request, env)` dans `server/worker.js`. Le serveur et l’interface utilisent la même origine : `http://127.0.0.1:8787` en développement complet, ou l’URL du site hébergé.

## Requêtes et réponses

- Les réponses API sont JSON, sauf les téléchargements binaires, et comportent `Cache-Control: no-store` et `X-Content-Type-Options: nosniff`.
- Les corps des requêtes d’authentification sont des objets JSON, avec `Content-Type: application/json`, limités à **16 KiB**. `refresh` et `logout` acceptent un corps vide.
- Les routes protégées attendent `Authorization: Bearer <access-token>` ; le cookie seul ne donne pas directement accès aux données.
- Les erreurs suivent `{ "error": "message" }` et ne renvoient ni requêtes SQL, ni traces internes, ni secrets.
- Les requêtes POST et DELETE qui contiennent un en-tête `Origin` doivent correspondre exactement à l’origine de l’URL demandée. Les clients REST sans cet en-tête sont acceptés. Les requêtes cross-origin du navigateur ne sont pas prises en charge.
- `OPTIONS /api/*` renvoie `204` pour la même origine. Il n’ouvre pas une politique CORS publique.

## Authentification

| Méthode et route | Corps / justificatif | Résultat |
|---|---|---|
| `POST /api/auth/register` | `{ name, email, password }` | `201`, profil public et message ; crée aussi un projet de test |
| `POST /api/auth/login` | `{ email, password }` | `200`, JWT d’accès, durée et profil ; pose le cookie de renouvellement |
| `POST /api/auth/root` | Identique à `login` | Alias de compatibilité de `login`, sans rôle administrateur supplémentaire |
| `POST /api/auth/refresh` | Cookie de renouvellement ; corps vide ou `{}` | `200`, nouveau JWT, profil et cookie renouvelé |
| `GET /api/auth/me` | JWT Bearer | `200`, `{ user }` |
| `POST /api/auth/logout` | Cookie et/ou JWT Bearer ; corps vide ou `{}` | `200`, révoque les sessions présentées et efface le cookie |

`/api/auth/iam`, `/api/auth/verify`, la vérification d’e-mail et la réinitialisation de mot de passe ne sont pas implémentées.

### Inscription

```json
{
  "name": "Alex Learner",
  "email": "alex@example.test",
  "password": "choose-a-unique-password"
}
```

Le nom est nettoyé en début et fin de chaîne et doit contenir de 2 à 80 caractères, sans caractères de contrôle. L’e-mail est nettoyé, normalisé en minuscules, validé et limité à 254 caractères. Le mot de passe doit contenir au moins 8 caractères et ne pas dépasser **72 octets UTF-8** ; il est haché avec bcrypt, coût 12. L’e-mail est unique sans distinction de casse.

Réponse `201` :

```json
{
  "message": "Account created. You can now sign in",
  "user": {
    "id": "bd53cad7-d18e-4b10-bf78-b58a865a8de6",
    "name": "Alex Learner",
    "email": "alex@example.test",
    "createdAt": "2026-11-02T10:00:00.000Z"
  }
}
```

L’inscription ne connecte pas automatiquement : elle ne renvoie pas de JWT et ne pose pas de cookie de session. Le compte et ses données de test sont créés dans un lot atomique. Un e-mail déjà enregistré renvoie `409`.

Chaque compte reçoit un projet `Starter project`, marqué `databaseType: "SQLite"`, `environment: "test"` et `seeded: true`, avec trois produits, trois clients fictifs et trois commandes. Ces données sont propres au projet et ne constituent pas des données de clients réels.

### Connexion et cycle de session

La connexion renvoie :

```json
{
  "token": "<JWT-access-token>",
  "expiresIn": 900,
  "user": {
    "id": "bd53cad7-d18e-4b10-bf78-b58a865a8de6",
    "name": "Alex Learner",
    "email": "alex@example.test",
    "createdAt": "2026-11-02T10:00:00.000Z"
  }
}
```

L’échec d’un mot de passe ou d’un compte inconnu renvoie le même message générique avec `401`. Les mots de passe et les hachages ne font jamais partie du profil public.

Le JWT est signé en HS256 avec le secret serveur `JWT_SECRET`, comporte `sub`, `sid`, `iss`, `aud`, `iat` et `exp`, et expire au bout de **15 minutes**. Chaque accès protégé vérifie aussi que la session correspondante existe encore, n’est pas révoquée et n’a pas expiré. La signature seule ne suffit donc pas après une déconnexion.

Dans l’interface, le JWT reste **en mémoire** dans `src/lib/api.js` : il n’est stocké ni dans `localStorage`, ni dans `sessionStorage`. Le navigateur reçoit séparément un cookie :

```text
grupedia_refresh=<random-token>; Path=/api/auth; HttpOnly; SameSite=Strict; Secure; ...
```

Le cookie est inaccessible au JavaScript et dure au maximum **7 jours à partir de la connexion**. `Secure` n’est omis que pour HTTP sur `localhost`, `127.0.0.1` ou `[::1]`. Le serveur ne conserve que le hachage SHA-256 de sa valeur.

À chaque renouvellement, le cookie est remplacé atomiquement ; l’ancien jeton de renouvellement devient invalide. Cette opération ne prolonge pas la date absolue de fin de session. Au rechargement de l’application, le client tente de restaurer la session avec `POST /api/auth/refresh`. Après un `401` sur une requête protégée, il partage un renouvellement entre les requêtes concurrentes, puis réessaie une seule fois. Les formulaires de connexion et d’inscription ne déclenchent pas cette boucle de renouvellement.

La déconnexion invalide la session présentée par le cookie et/ou par le JWT, puis expire le cookie avec `Max-Age=0`. Elle ne constitue pas une fonction « déconnecter tous les appareils ». Le client efface immédiatement sa session en mémoire ; la révocation côté serveur nécessite que la requête de déconnexion lui parvienne.

## Projets et données de test

Toutes ces routes sont en lecture seule et exigent un JWT Bearer.

| Méthode et route | Réponse |
|---|---|
| `GET /api/projects` | `{ projects: [{ id, name, databaseType, environment, seeded }] }` |
| `GET /api/projects/:projectId/tables` | `{ tables: [{ id, name, schema, rowCount, description }] }` |
| `GET /api/projects/:projectId/tables/:tableId/rows` | Métadonnées des colonnes, lignes et pagination |

`:projectId` doit identifier un projet appartenant au compte connecté. Un projet absent, invalide ou appartenant à un autre utilisateur renvoie `404`. L’API n’expose pas l’existence du projet d’un autre compte.

Sans paramètre `schema`, l’API utilise `main` : seules les tables **`products`**, **`customers`** et **`orders`** sont autorisées. Avec `schema=auth`, elle propose les projections sûres **`users`** et **`sessions`** du propriétaire connecté. Tout autre espace de noms est refusé. `main.users`, `auth.products` et `rate_limits` ne sont pas exposés. Les noms de table et de colonne proviennent d’une liste fixe ; les valeurs des requêtes sont liées comme paramètres SQL.

Le paramètre `schema=auth` fonctionne sur la liste des tables comme sur la lecture des lignes :

```http
GET /api/projects/<project-id>/tables?schema=auth
GET /api/projects/<project-id>/tables/users/rows?schema=auth&page=1&pageSize=25
Authorization: Bearer <access-token>
```

Dans SQLite/D1, `auth` est un espace de noms logique de l’API et de l’interface, pas un schéma PostgreSQL physique. La vue `auth.users` ne contient que le propriétaire du projet. La vue `auth.sessions` contient son historique de sessions, avec les dates d’expiration/révocation, mais aucun hachage de mot de passe ni de token. Les contrôles de propriété du projet et de l’utilisateur s’appliquent aussi à ces vues. La section Authentication garde une vue des seules sessions actives, distincte de cet historique. La future migration AWS pourra créer le schéma PostgreSQL `auth` réel.

La base physique est partagée. Pour `main`, le filtrage `project_id` et la vérification du propriétaire sont appliqués côté serveur. Pour `auth`, les projections filtrent l’identifiant du propriétaire connecté après vérification du projet. `project_id` est une colonne interne : elle n’est renvoyée ni dans les lignes ni dans les métadonnées des colonnes visibles.

### Lecture des lignes

Exemple :

```http
GET /api/projects/<project-id>/tables/products/rows?page=1&pageSize=25&search=canvas
Authorization: Bearer <access-token>
```

| Paramètre | Défaut | Règle |
|---|---:|---|
| `page` | `1` | Entier positif, maximum 1 000 000 |
| `pageSize` | `25` | Entier positif, maximum 100 |
| `search` | Vide | Chaîne nettoyée, maximum 200 caractères |
| `schema` | `main` | `main` ou `auth` uniquement |

La recherche est effectuée sur les colonnes visibles, sans distinction de casse pour les caractères pris en charge par SQLite `NOCASE`. Les caractères `%`, `_` et `\` sont traités comme données littérales, pas comme un langage de motifs SQL. Les résultats sont triés par `id` croissant. Il n’existe pas de paramètre de tri libre ni d’exécution SQL arbitraire.

Réponse illustrative, abrégée :

```json
{
  "table": { "id": "products", "name": "products", "schema": "main" },
  "columns": [
    { "name": "id", "type": "INTEGER", "nullable": false, "primaryKey": true },
    { "name": "name", "type": "TEXT", "nullable": false, "primaryKey": false }
  ],
  "rows": [
    { "id": 1, "name": "Canvas tote bag", "description": "A reusable canvas bag for everyday essentials.", "price": 18, "stock": 42, "status": "active", "created_at": "2026-11-02T10:00:00.000Z" }
  ],
  "page": 1,
  "pageSize": 25,
  "rowCount": 1,
  "totalPages": 1
}
```

`rowCount` et `totalPages` correspondent au filtre courant. Sans résultat, `rows` est vide et `totalPages` vaut `0`. Une page au-delà du dernier résultat renvoie une liste vide. Aucune route de création, modification ou suppression de projet, table ou ligne n’est fournie dans ce MVP.

## Interface Authentication

`GET /api/projects/:projectId/auth` exige un JWT et vérifie d’abord que le projet appartient au compte connecté. La réponse contient :

- `users` : le profil public du propriétaire, avec `role: "owner"`, `provider: "email"` et `lastSignInAt` ; aucun autre compte Grupedia.
- `sessions` : les sessions actives de ce propriétaire, avec `id`, `createdAt`, `lastUsedAt`, `expiresAt` et `current`.
- `providers` : e-mail/mot de passe activé ; Google et GitHub non connectés.
- `settings` : `accessTokenSeconds`, `refreshTokenSeconds` et `passwordMinLength`, en lecture seule.

Les hachages de mots de passe et de renouvellement ne sont jamais exposés. Cette section concerne actuellement le propriétaire du projet, pas un nouveau système d’utilisateurs finaux pour ses applications.

`DELETE /api/projects/:projectId/auth/sessions/:sessionId` révoque une autre session active du même propriétaire. La session courante renvoie `409` : utiliser `POST /api/auth/logout` pour fermer la session du navigateur et effacer son cookie. Une session étrangère ou introuvable n’est pas révélée.

## Stockage privé

Le point d’entrée est `/api/projects/:projectId/storage`. Chaque route exige un JWT valide et vérifie le propriétaire du projet, puis le rattachement du bucket et du fichier. Il n’existe pas de téléchargement anonyme ni de bucket public.

| Méthode et route relative | Corps / réponse |
|---|---|
| `GET /buckets` | `{ buckets, usage, limits, provider, configured }` |
| `POST /buckets` | JSON `{ name }` → `201`, `{ bucket }` |
| `DELETE /buckets/:bucketId` | Supprime un bucket vide ; un bucket contenant des fichiers renvoie `409` |
| `GET /buckets/:bucketId/objects?search=...` | `{ bucket, objects, usage, limits }` |
| `POST /buckets/:bucketId/objects?filename=...` | Corps binaire brut → `201`, `{ object }` |
| `GET /buckets/:bucketId/objects/:objectId/content` | Contenu binaire en pièce jointe |
| `DELETE /buckets/:bucketId/objects/:objectId` | Supprime le contenu et ses métadonnées |

Un bucket renvoie `id`, `name`, `createdAt`, `fileCount` et `totalBytes`. Un fichier renvoie `id`, `name`, `size`, `contentType` et `createdAt`. Les clés internes R2 ne sont pas renvoyées comme URL publiques.

Les noms de bucket utilisent de 1 à 63 caractères minuscules, chiffres ou tirets, sans tiret au début ou à la fin, et sont uniques dans le projet. Le nom de fichier est fourni dans le paramètre URL `filename`, limité à 120 caractères, sans séparateur de chemin, caractères de contrôle, `.` ou `..`.

Les limites du prototype sont **5 MiB par fichier**, **25 MiB par projet**, **5 buckets par projet** et **50 fichiers par bucket**. Les fichiers vides et trop volumineux sont refusés. La taille réelle du corps est contrôlée, même sans en-tête `Content-Length`. La réservation des quotas comprend les imports en cours pour éviter leur dépassement par des requêtes concurrentes. Si une écriture R2 et son nettoyage échouent tous les deux, la réservation est conservée pour ne pas masquer des octets potentiellement stockés ; elle nécessite une réconciliation administrative.

L’import n’utilise pas de JSON ni de base64 : envoyer les octets avec leur `Content-Type`. Le client partagé supporte :

```js
await apiRequest(`/api/projects/${projectId}/storage/buckets/${bucketId}/objects?filename=${encodeURIComponent(file.name)}`, {
  method: 'POST',
  rawBody: true,
  body: file,
  headers: { 'Content-Type': file.type || 'application/octet-stream' }
});

const blob = await apiRequest(`/api/projects/${projectId}/storage/buckets/${bucketId}/objects/${objectId}/content`, {
  responseType: 'blob'
});
```

Le renouvellement de JWT et la gestion des erreurs restent ceux du client JSON. Le serveur force `Content-Disposition: attachment`, `Cache-Control: no-store` et `X-Content-Type-Options: nosniff` pour les téléchargements. Les contenus HTML ou SVG ne sont pas affichés directement dans le site.

En hébergement, les octets sont stockés dans R2 et les métadonnées dans D1. En local, ils sont conservés dans `server/.local/objects`. Sans binding `BUCKET`, l’aperçu des buckets signale `configured: false` et les opérations de contenu sont indisponibles. La future migration vers AWS S3 et PostgreSQL est distincte de cette implémentation du prototype.

## Limites et erreurs

Les compteurs sont conservés dans D1/SQLite, par fenêtres fixes d’une minute :

- Inscription : 3 tentatives par IP **et** 3 par e-mail normalisé.
- Connexion : 5 tentatives par IP **et** 5 par e-mail normalisé.
- Renouvellement : 30 tentatives par IP.

Le premier compteur dépassé renvoie `429` et un en-tête `Retry-After` en secondes. En hébergement, l’IP vient de l’en-tête `CF-Connecting-IP` fourni par la plateforme ; le serveur doit rester derrière ce point d’entrée de confiance.

| Statut | Signification |
|---|---|
| `400` | Données ou paramètres invalides |
| `401` | Identifiants incorrects, JWT absent/invalide/expiré ou session révoquée |
| `403` | Origine interdite |
| `404` | Route, projet ou table absent/non accessible |
| `409` | Ressource existante, session courante protégée ou limite de bucket/fichiers atteinte |
| `413` | Corps trop volumineux |
| `415` | Type de contenu incorrect |
| `429` | Trop de tentatives ; respecter `Retry-After` |
| `500` | Erreur interne générique |
| `503` | Service requis indisponible : D1, stockage R2 ou signature de session |
| `507` | Quota de stockage du projet atteint |

## Exécuter et vérifier

Depuis la racine du dépôt, avec Node.js 24 ou version ultérieure :

```sh
npm ci
npm ci --prefix server
npm run build:site
npm run dev:fullstack
```

Le parcours complet est accessible sur `http://127.0.0.1:8787`. Le serveur initialise sa base dans `server/.local/grupedia.sqlite`. La configuration du secret, la réinitialisation de la base locale et les détails de livraison sont expliqués dans le [README](../README.md).

```sh
npm run test:api
```

Les tests d’intégration emploient une nouvelle base SQLite par test avec les mêmes requêtes SQL que le Worker, des transactions réelles, bcrypt et de vrais JWT. Ils ne créent aucune ressource distante et ne font aucun appel à AWS.
