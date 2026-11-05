# API REST de Grupedia

Cette API implémente les comptes développeurs Grupedia, l’authentification des utilisateurs de leurs applications, les endpoints de données définis dans API Builder et la gestion de fichiers privés. Les deux types de comptes et de sessions sont distincts. Elle utilise une base SQLite locale en développement et un binding Cloudflare D1 `DB` en hébergement, ainsi qu’un binding R2 `BUCKET` pour les contenus des fichiers. Aucune infrastructure AWS, base PostgreSQL distante ou fonctionnalité de facturation n’est provisionnée par ces routes.

Le point d’entrée est `handleApi(request, env)` dans `server/worker.js`. Le serveur et l’interface utilisent la même origine : `http://127.0.0.1:8787` en développement complet, ou l’URL du site hébergé.

## Requêtes et réponses

- Les réponses API sont JSON, sauf les téléchargements binaires, et comportent `Cache-Control: no-store` et `X-Content-Type-Options: nosniff`.
- Les corps des requêtes d’authentification sont des objets JSON, avec `Content-Type: application/json`, limités à **16 KiB**. Pour les comptes développeurs, `refresh` et `logout` acceptent un corps vide. Pour les applications, le renouvellement transmet un `refresh_token` en JSON.
- Les routes protégées du tableau de bord attendent `Authorization: Bearer <developer-access-token>` ; le cookie seul ne donne pas directement accès aux données. Le JWT d’un utilisateur d’application n’est pas accepté par ces routes.
- Les erreurs suivent `{ "error": "message" }` et ne renvoient ni requêtes SQL, ni traces internes, ni secrets.
- Les mutations privées du tableau de bord qui contiennent un en-tête `Origin` doivent correspondre exactement à l’origine de l’URL demandée. Les clients REST sans cet en-tête sont acceptés.
- Les routes d’application `/api/apps/:projectId/auth/*` et `/api/apps/:projectId/data/*` appliquent une politique CORS propre au projet : origine exacte autorisée, origine du service ou appel serveur sans `Origin`. Leurs prérequêtes `OPTIONS` suivent cette même politique. Aucun joker CORS ni cookie développeur n’est utilisé.

## Authentification des développeurs Grupedia

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

Sans paramètre `schema`, l’API utilise `main` : seules les tables **`products`**, **`customers`** et **`orders`** sont autorisées. Avec `schema=auth`, elle propose les projections sûres **`users`** et **`sessions`** de l’application du projet. Tout autre espace de noms est refusé. `main.users`, `auth.products` et `rate_limits` ne sont pas exposés. Les noms de table et de colonne proviennent d’une liste fixe ; les valeurs des requêtes sont liées comme paramètres SQL.

Le paramètre `schema=auth` fonctionne sur la liste des tables comme sur la lecture des lignes :

```http
GET /api/projects/<project-id>/tables?schema=auth
GET /api/projects/<project-id>/tables/users/rows?schema=auth&page=1&pageSize=25
Authorization: Bearer <access-token>
```

Dans SQLite/D1, `auth` est un espace de noms logique de l’API et de l’interface, pas un schéma PostgreSQL physique. La vue `auth.users` contient les utilisateurs de l’application du projet et commence vide. Le compte développeur n’y est jamais copié automatiquement. La vue `auth.sessions` contient l’historique des sessions de ces utilisateurs, avec les dates d’expiration/révocation, mais aucun hachage de mot de passe ni jeton. La section Authentication conserve une vue des seules sessions d’application actives, distincte de cet historique. La future migration AWS pourra créer le schéma PostgreSQL `auth` réel.

La base physique est partagée. La vérification du propriétaire et le filtrage par `project_id` sont appliqués côté serveur dans les deux espaces de noms. Les utilisateurs d’application et leurs sessions utilisent des tables distinctes des comptes développeurs : `app_auth_users`, `app_auth_sessions` et `app_auth_settings`. `project_id` reste une colonne interne des projections : elle n’est renvoyée ni dans les lignes ni dans les métadonnées des colonnes visibles.

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

`rowCount` et `totalPages` correspondent au filtre courant. Sans résultat, `rows` est vide et `totalPages` vaut `0`. Une page au-delà du dernier résultat renvoie une liste vide. Ces routes du Table Editor restent en lecture seule. Les écritures sur les données de `main` passent par les endpoints explicitement définis dans [API Builder](#api-builder-et-endpoints-de-données) ; la création de tables et l’exécution SQL libre ne sont pas proposées.

## API Builder et endpoints de données

API Builder configure des endpoints sur les seules tables `main.products`, `main.customers` et `main.orders`. Le catalogue contient les colonnes visibles et leurs types, les champs modifiables, les corps d’exemple, les opérateurs et les relations autorisées. Les comptes, sessions, tables `auth`, colonnes internes et requêtes SQL libres sont exclus. Une définition est un objet JSON validé ; aucun code JavaScript saisi dans l’interface n’est exécuté.

### Administration des définitions

Toutes ces routes exigent le JWT du propriétaire Grupedia et la propriété du projet. Les corps JSON sont limités à **16 KiB** et les champs inconnus sont refusés.

| Méthode et route sous `/api/projects/:projectId/api-builder` | Corps / résultat |
|---|---|
| `GET /catalog` | `{ tables, operators, limits }` |
| `GET /endpoints` | `{ endpoints, limits }` |
| `GET /endpoints/:endpointId` | `{ endpoint }` |
| `POST /endpoints` | `{ definition }` → `201`, `{ endpoint }` |
| `PUT /endpoints/:endpointId` | `{ definition, revision }` → brouillon enregistré |
| `POST /endpoints/:endpointId/publish` | `{ revision }` → copie du brouillon publiée |
| `POST /endpoints/:endpointId/unpublish` | `{ revision }` → accès public/applicatif fermé |
| `DELETE /endpoints/:endpointId?revision=N` | Supprime la définition, sans supprimer les lignes de ses tables |
| `POST /test` | `{ definition, params?, body?, id? }` → exécution réelle et diagnostic du propriétaire |

Une ressource `endpoint` contient `id`, `definition` (brouillon), `publishedDefinition` (copie active ou `null`), `isPublished`, `hasUnpublishedChanges`, `revision`, les dates `createdAt`, `updatedAt`, `publishedAt`, et `runtimeUrl`. Une création commence à la révision `1`. Chaque modification, publication ou dépublication incrémente cette révision. Une révision périmée reçoit `409` : recharger la définition avant de réessayer.

Enregistrer un brouillon ne change pas sa copie publiée. La route et la méthode actives restent celles de `publishedDefinition` jusqu’à la prochaine publication, et `runtimeUrl` continue de les désigner. Pour une définition jamais publiée, cette URL indique sa future route. Publier deux définitions avec la même méthode et le même chemin dans un projet est refusé avec `409`. Un projet accepte au maximum **25 définitions**, publiées ou non.

### Définition JSON

Exemple de lecture des produits, avec filtre facultatif sur le nom :

```json
{
  "name": "Search products",
  "path": "/products",
  "method": "GET",
  "table": "products",
  "columns": ["id", "name", "price", "stock", "status"],
  "filters": [
    {
      "column": "name",
      "operator": "contains",
      "source": "query",
      "parameter": "q",
      "required": false
    }
  ],
  "orderBy": { "column": "price", "direction": "asc" },
  "limit": 25,
  "access": "app_user",
  "include": [],
  "defaults": {}
}
```

| Champ | Règles |
|---|---|
| `name` | De 1 à 80 caractères, sans caractères de contrôle |
| `path` | De 1 à 3 segments minuscules commençant par une lettre, séparés par `/` ; lettres, chiffres et tirets ; 120 caractères maximum |
| `method` | `GET`, `POST`, `PATCH` ou `DELETE` ; défaut `GET` |
| `table` | `products`, `customers` ou `orders` |
| `columns` | Liste non vide et sans doublon des colonnes renvoyées ; défaut : toutes les colonnes visibles |
| `filters` | Jusqu’à 20 conditions combinées par `AND` ; vide pour `POST` |
| `orderBy` | `{ column, direction: "asc" ou "desc" }`, ou `null` ; lecture uniquement ; défaut `id` croissant |
| `limit` | De 1 à 100 lignes par page ; défaut `25` |
| `access` | `app_user`, `developer` ou `public` ; défaut `app_user` pour `GET`, `developer` pour une mutation |
| `include` | Pour `GET orders` uniquement : `product`, `customer`, ou les deux |
| `defaults` | Valeurs par défaut des champs modifiables, pour `POST` uniquement ; le corps envoyé peut les remplacer |

Les opérateurs sont `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `in` et `is_null`. `contains` s’applique aux colonnes texte et traite `%`, `_` et `\` comme des caractères littéraux. `in` accepte de 1 à 20 valeurs ; une valeur de requête peut être une liste séparée par des virgules ou un tableau JSON encodé. `is_null` attend un booléen, ou `true`/`false` dans la chaîne de requête. Les types numériques, les valeurs nulles et les noms de colonnes sont contrôlés côté serveur.

Un filtre fixe utilise `{ "column": "status", "operator": "eq", "source": "literal", "value": "active" }`. Un filtre dynamique utilise `source: "query"` et `parameter`, sans `value`. Son nom de paramètre comporte jusqu’à 64 lettres, chiffres ou traits de soulignement et commence par une lettre ou un trait de soulignement. Si `required` vaut `true`, son absence renvoie `400` ; sinon la condition est ignorée. Les paramètres internes de projet sont réservés.

Les relations de `orders` renvoient des objets imbriqués : `product` contient `id`, `name`, `price` ; `customer` contient `id`, `name`, `email`. La jointure vérifie aussi le projet de la ligne liée. Une relation absente vaut `null`.

### Accès et exécution des routes publiées

L’URL d’exécution est `/api/apps/:projectId/data` suivie du `path` publié. Un identifiant numérique peut être ajouté après ce chemin pour cibler une ligne. Un endpoint non publié ou une combinaison méthode/chemin inexistante reçoit `404`.

- `app_user` exige le JWT d’un utilisateur de l’application de ce projet, avec une session encore valide.
- `developer` exige le JWT du propriétaire Grupedia. Il doit rester dans un environnement de confiance ; ne pas l’intégrer au code distribué d’un site client.
- `public` permet un `GET` anonyme uniquement. Les mutations publiques sont refusées à la validation.

Accorder `app_user` à `POST`, `PATCH` ou `DELETE` autorise les utilisateurs connectés de l’application à effectuer cette opération sur les lignes correspondant à la définition dans leur projet. Ce prototype ne crée pas de règle de propriété par utilisateur d’application. Les filtres définis et l’isolation par projet restent appliqués côté serveur ; le client ne peut pas remplacer `project_id`.

Les origines autorisées dans Authentication → Providers s’appliquent également aux routes de données. Les prérequêtes acceptent `GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`, ainsi que `Content-Type` et `Authorization`, sans cookies ni `Access-Control-Allow-Credentials`. Une origine interdite reçoit `403`, même pour un endpoint `public`. Un appel serveur sans en-tête `Origin` est accepté.

Exemple JavaScript pour l’endpoint précédent après publication :

```js
const url = new URL('https://<grupedia-host>/api/apps/<project-id>/data/products');
url.search = new URLSearchParams({ q: 'canvas', page: '1', pageSize: '10' });
const response = await fetch(url, {
  credentials: 'omit',
  headers: { Authorization: 'Bearer <app-access-token>' }
});
if (!response.ok) throw new Error(`Request failed: ${response.status}`);
const result = await response.json();
console.log(result.data, result.pagination);
```

Équivalent cURL, avec un jeton d’application obtenu séparément :

```sh
curl 'https://<grupedia-host>/api/apps/<project-id>/data/products?q=canvas&page=1&pageSize=10' \
  -H 'Authorization: Bearer <app-access-token>'
```

`GET` accepte `page` (entier positif), `pageSize` (de 1 à la limite de la définition), `id` et les paramètres liés aux filtres. Un même paramètre répété est refusé. Il ne reçoit aucun corps. Le résultat a cette forme :

```json
{
  "data": [{ "id": 1, "name": "Canvas tote bag", "price": 18, "stock": 42, "status": "active" }],
  "pagination": { "page": 1, "pageSize": 10, "totalRows": 1, "totalPages": 1 },
  "meta": { "table": "products", "method": "GET" }
}
```

Sans résultat, `data` est vide et `totalPages` vaut `1`. Une page au-delà des résultats renvoie une liste vide. Un tri par une autre colonne ajoute `id` croissant pour départager les valeurs égales.

`POST` attend un objet JSON contenant les champs modifiables nécessaires, éventuellement complétés par `defaults`. Il alloue l’identifiant et la date serveur ; `id`, `created_at` et `project_id` ne sont pas modifiables. `PATCH` exige un identifiant positif dans le chemin ou dans `?id=`, et au moins un champ modifiable. `DELETE` exige également cet identifiant et un corps vide. Fournir deux identifiants différents est refusé. Les filtres configurés continuent de s’appliquer à `PATCH` et `DELETE` : une ligne absente ou ne correspondant pas au filtre reçoit `404`.

Les nombres doivent être finis, les entiers sûrs et les valeurs de prix, stock ou montant supérieures ou égales à zéro. Les identifiants de relation et la quantité d’une commande doivent être strictement positifs ; les relations doivent appartenir au même projet. Le texte est limité à 2 000 caractères, les champs obligatoires ne peuvent pas être vides et un e-mail client est validé. Une suppression qui laisserait une commande sans produit ou client est refusée avec `409`.

Les réponses de `POST` (`201`) et `PATCH` (`200`) contiennent `{ data: <ligne>, meta: { table, method, affectedRows: 1 } }`. `DELETE` renvoie `{ data: { id }, meta: { affectedRows: 1 } }`. Une mutation ne modifie qu’une ligne par requête.

### Tester et modifier le code

`POST /test` exécute la définition fournie directement sur les données du projet, même si son brouillon n’a pas été enregistré ou publié. Le propriétaire est l’acteur de ce test ; ce résultat ne valide donc pas à lui seul les droits d’un utilisateur d’application ou d’un client anonyme. La réponse est `{ status, body, durationMs, sql, parameters }` : `body` est la réponse réelle et `sql`/`parameters` présentent le SQL généré uniquement au propriétaire authentifié.

Les tests `POST`, `PATCH` et `DELETE` **écrivent réellement** dans la base. L’interface demande confirmation avant de les envoyer. Employer des lignes de test et les nettoyer ensuite ; aucun mode de simulation ni annulation automatique n’est fourni.

Dans Code, modifier **Endpoint definition (JSON)** puis utiliser **Apply JSON** met à jour le brouillon de l’interface. **Save draft** le conserve côté serveur et **Publish** met à jour la route active. Les exemples JavaScript et cURL correspondent à la dernière version publiée, ou au brouillon lorsque l’endpoint n’a pas encore été publié. Ils utilisent des jetons fictifs ; l’export JSON ne contient pas de secret de session.

## Interface Authentication

Ces routes d’administration exigent le JWT du développeur et vérifient que le projet lui appartient. Elles gèrent les comptes des utilisateurs de son application ; elles ne modifient ni sa connexion Grupedia ni son stockage privé.

| Méthode et route | Corps / résultat |
|---|---|
| `GET /api/projects/:projectId/auth` | Annuaire, sessions actives, fournisseurs, réglages et paramètres d’intégration |
| `POST /api/projects/:projectId/auth/users` | JSON `{ email, password, name? }` → `201`, crée un utilisateur de l’application |
| `PUT /api/projects/:projectId/auth/settings` | JSON `{ allowedOrigins, signupEnabled }` → réglages enregistrés |
| `DELETE /api/projects/:projectId/auth/sessions/:sessionId` | Révoque une session d’application du projet |

La réponse de consultation contient :

- `users` : les profils publics des utilisateurs de l’application, avec le fournisseur et la dernière connexion.
- `sessions` : les sessions actives de ces utilisateurs, avec leur identité et leurs dates ; aucune session développeur.
- `providers` : e-mail/mot de passe activé ; Google et GitHub non connectés.
- `settings` : politique de session, longueur minimale du mot de passe, `allowedOrigins` et `signupEnabled`.
- `integration` : identifiant public du projet et URL de son API d’authentification.

Les hachages de mots de passe et de renouvellement ne sont jamais exposés. Un nouveau projet a un annuaire vide. La création manuelle ou l’inscription par l’API d’application remplit cet annuaire. Une adresse e-mail est unique dans un projet, sans distinction de casse ; la même adresse peut être utilisée dans un autre projet ou pour un compte développeur, sans partager les comptes.

Toutes les sessions affichées sont révocables : il n’existe pas de session développeur « courante » dans cette liste. La révocation invalide l’accès et le renouvellement de la session d’application concernée ; le développeur reste connecté à Grupedia. Une session d’un autre projet ou introuvable n’est pas révélée.

### Origines et inscriptions

`allowedOrigins` est une liste de dix origines au maximum. Chaque entrée est une origine exacte, sans chemin, joker, identifiant ou mot de passe : HTTPS pour un site public, ou HTTP sur une adresse locale de développement. L’origine du service est toujours acceptée ; les appels serveur sans `Origin` le sont également. Une origine non autorisée, y compris `Origin: null`, reçoit `403`. Une prérequête acceptée renvoie `204`, autorise `GET`, `POST`, `OPTIONS` et les en-têtes `Content-Type` et `Authorization`, sans `Access-Control-Allow-Credentials`. Le navigateur client utilise `credentials: 'omit'` et ses jetons d’application, jamais le cookie ou le JWT développeur.

`signupEnabled: false` ferme l’inscription publique de l’application. Les utilisateurs existants peuvent toujours se connecter et le développeur peut créer un utilisateur manuellement depuis le tableau de bord. Ces réglages n’affectent pas l’inscription des développeurs sur Grupedia.

## Authentification des utilisateurs d’application

L’URL de base est `/api/apps/:projectId/auth`. `projectId` est l’identifiant public du projet, pas un secret ni une clé administrateur. Ces routes ne demandent aucun identifiant développeur. Elles ne donnent accès ni au tableau de bord, ni aux routes privées du Table Editor, ni au stockage privé. Leur JWT peut être utilisé séparément sur les endpoints de données publiés avec l’accès `app_user` dans API Builder.

| Méthode et route relative | Corps / justificatif | Résultat |
|---|---|---|
| `POST /register` | JSON `{ email, password, name? }` | `201`, `{ user }` ; ne connecte pas automatiquement |
| `POST /login` | JSON `{ email, password }` | Jetons d’application et profil |
| `POST /refresh` | JSON `{ refresh_token }` | Nouveaux jetons et profil ; l’ancien renouvellement devient invalide |
| `GET /me` | `Authorization: Bearer <app-access-token>` | `{ user }` |
| `POST /logout` | JSON `{ refresh_token }` recommandé, ou JWT d’application Bearer | Révoque la session d’application |

Le mot de passe comporte au moins huit caractères et au maximum 72 octets UTF-8 ; il est haché côté serveur et n’est jamais renvoyé. L’e-mail est normalisé et limité à 254 caractères. Le champ `name` est facultatif, nettoyé et limité à 80 caractères sans caractères de contrôle. Les profils et les sessions restent isolés par projet. Le prototype limite chaque projet à 1 000 utilisateurs d’application et chaque utilisateur à vingt sessions.

Les réponses de `login` et `refresh` utilisent ce format :

```json
{
  "access_token": "<app-access-token>",
  "refresh_token": "<opaque-app-refresh-token>",
  "expires_in": 900,
  "token_type": "bearer",
  "user": {
    "id": "<app-user-id>",
    "email": "customer@example.test",
    "name": "Customer"
  }
}
```

Le JWT d’application comporte un émetteur et une audience distincts des JWT développeurs et expire au bout de quinze minutes. Le jeton opaque de renouvellement tourne à chaque utilisation et dure au maximum sept jours à partir de la connexion. Seul son hachage est stocké côté serveur. Aucun cookie n’est créé par ces routes. L’application choisit sa propre gestion des jetons ; les exemples ci-dessous les conservent en mémoire, ce qui demande une nouvelle connexion après un rechargement.

Exemple pour une application dont l’origine a été autorisée dans les réglages du projet :

```js
const authUrl = 'https://<grupedia-host>/api/apps/<project-id>/auth';
let appSession;

async function signIn(email, password) {
  const response = await fetch(`${authUrl}/login`, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) throw new Error('Connexion refusée');
  appSession = await response.json();
  return appSession.user;
}

async function getAppUser() {
  const response = await fetch(`${authUrl}/me`, {
    credentials: 'omit',
    headers: { Authorization: `Bearer ${appSession.access_token}` }
  });
  if (!response.ok) throw new Error('Session expirée ou révoquée');
  return (await response.json()).user;
}

async function refreshAppSession() {
  const response = await fetch(`${authUrl}/refresh`, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: appSession.refresh_token })
  });
  if (!response.ok) throw new Error('Nouvelle connexion nécessaire');
  appSession = await response.json();
}

async function signOut() {
  await fetch(`${authUrl}/logout`, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: appSession.refresh_token })
  });
  appSession = undefined;
}
```

Une révocation depuis Authentication ou une déconnexion d’application rend sa session inutilisable même si son JWT n’a pas encore atteint sa date d’expiration. Les jetons d’application ne sont pas interchangeables avec les jetons développeurs, même si l’adresse e-mail est identique.

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

Les routes d’application appliquent également les limites de trois inscriptions, cinq connexions et trente renouvellements par minute, dans un espace de compteurs propre au projet. Les limites par IP et par e-mail s’appliquent indépendamment ; leurs clés utilisent des hachages, pas les adresses en clair. Ces compteurs sont distincts de la connexion des développeurs Grupedia.

Le premier compteur dépassé renvoie `429` et un en-tête `Retry-After` en secondes. En hébergement, l’IP vient de l’en-tête `CF-Connecting-IP` fourni par la plateforme ; le serveur doit rester derrière ce point d’entrée de confiance.

| Statut | Signification |
|---|---|
| `400` | Données ou paramètres invalides |
| `401` | Identifiants incorrects, JWT absent/invalide/expiré ou session révoquée |
| `403` | Origine interdite |
| `404` | Route, projet ou table absent/non accessible |
| `409` | Ressource existante, révision obsolète, relation bloquante ou limite de ressources atteinte |
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

## Démo cliente autonome

`/app-auth-demo.html?project=<project-id>` fournit un exemple de formulaire indépendant du tableau de bord : inscription, connexion, vérification, renouvellement et déconnexion. Ses requêtes utilisent `credentials: 'omit'`, et seuls les tokens d’application sont conservés en mémoire. Un rechargement efface cette session de démonstration ; le compte reste enregistré dans le projet. La page ne lit ni ne modifie la session développeur Grupedia.

Le fichier HTML peut être adapté pour une application cliente. Le champ de configuration HTML `grupedia-auth-api-origin` permet d’indiquer l’origine de l’API si la page est hébergée ailleurs ; ajouter cette origine cliente dans Authentication → Providers avant de tester les appels depuis un autre site.
