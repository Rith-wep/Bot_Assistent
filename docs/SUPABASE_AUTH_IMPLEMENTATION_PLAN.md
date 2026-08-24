# Supabase Authentication Implementation Plan

This document describes how to migrate both authentication and the complete application database to Supabase without changing the current frontend/backend structure. Supabase Auth will replace password and session management, and Supabase PostgreSQL will host all application tables. FastAPI, SQLAlchemy, Alembic, the repository layer, and the current frontend API boundary will remain responsible for application logic, business membership, roles, tenant isolation, onboarding, and authorization.

---

## English version

### 1. Current implementation

The application currently uses:

- React and Vite on the frontend.
- FastAPI and SQLAlchemy on the backend.
- Custom `/api/auth/signup` and `/api/auth/signin` endpoints.
- Locally generated HS256 JWT access tokens with a one-week expiration.
- Passwords hashed with bcrypt in the local `users` table.
- A manually stored access token in browser `localStorage`.
- A local user record connected to a `business_id` and role.
- `get_current_user()` as the authentication boundary for protected API routes.
- `CurrentUser.user_id` and `CurrentUser.business_id` for tenant isolation.

The protected backend routes do not need to understand how authentication is implemented. They only depend on a resolved `CurrentUser`. This makes it possible to introduce Supabase at the authentication boundary without reorganizing routers, services, repositories, pages, or application routes.

### 2. Target architecture

```text
Sign-in and sign-up pages
          |
          v
Supabase JavaScript Auth client
  - creates and restores sessions
  - refreshes access tokens
  - signs users out
          |
          v
Existing apiFetch() helper
Authorization: Bearer <Supabase access token>
          |
          v
Existing FastAPI API
          |
          v
Updated get_current_user()
  - validates the Supabase JWT
  - reads the Supabase user UUID from `sub`
  - resolves the local user and business
          |
          v
Existing routers, services, and tenant repositories
          |
          v
SQLAlchemy and Alembic
          |
          v
Supabase PostgreSQL
  - auth schema managed by Supabase
  - public application tables managed by Alembic
```

Supabase will own:

- Password storage and verification.
- Email/password sign-in.
- Email confirmation.
- Password reset.
- Access-token issuance.
- Refresh-token rotation and browser session persistence.

The existing backend will continue to own:

- Businesses.
- User-to-business membership.
- Owner and staff roles.
- Tenant authorization.
- Onboarding and application data.
- Administrative access rules.
- All reads and writes to application tables through SQLAlchemy repositories.

Supabase PostgreSQL will replace the current database host for the whole system. This does not require replacing SQLAlchemy with the Supabase JavaScript Data API. The React frontend should continue calling FastAPI, and FastAPI should continue using the existing repository layer. This preserves the current security and application structure.

The backend must never trust a `business_id` supplied by the frontend or stored in editable Supabase user metadata. It must resolve the business from the local database after validating the Supabase identity.

### 3. Database changes

Keep the existing `users` table as the application profile and membership table. Add a column connecting it to Supabase Auth:

```text
users
|- id                 INTEGER, existing internal identifier
|- supabase_user_id   UUID, unique Supabase identity
|- business_id        INTEGER, existing tenant identifier
|- email              VARCHAR, existing email
|- role               ENUM, existing application role
|- password_hash      VARCHAR, temporary/deprecated
`- created_at         DATETIME, existing creation date
```

Migration stages:

1. Add `supabase_user_id` as nullable and unique.
2. Link existing users to their corresponding Supabase UUIDs.
3. Make `supabase_user_id` non-null after migration.
4. Stop creating and reading `password_hash` values.
5. Remove `password_hash` only after the rollback period ends.

Keep the current integer `users.id`. This prevents changes to `CurrentUser`, admin authorization, and any current or future internal relationships.

#### 3.1 Complete database migration to Supabase

All existing application tables will move to the Supabase-hosted PostgreSQL database, including:

- `businesses`
- `users`
- `bot_configs`
- `knowledge_items`
- `conversations`
- `messages`
- `leads`
- `admins`
- `admin_invites`
- `unanswered_questions`
- `question_clusters`
- Alembic's version table

Supabase Auth manages its own tables inside the protected `auth` schema. Application tables should remain in the `public` schema and continue to be created and changed through the project's existing Alembic migrations.

The migration should use this approach:

1. Create a dedicated Supabase project for each environment that needs isolated data.
2. Obtain the direct and pooled PostgreSQL connection strings from Supabase.
3. Back up the current database before migration.
4. Apply the existing Alembic migrations to an empty Supabase database.
5. Export application data from the current database without Supabase-managed schemas.
6. Import data in foreign-key order.
7. Reset PostgreSQL sequences after importing integer primary keys.
8. Validate row counts, foreign keys, enum types, indexes, and unique constraints.
9. Link local `users` rows to `auth.users` through `supabase_user_id`.
10. Run the application against Supabase in a staging environment.
11. Perform a controlled final data sync and production cutover.

Recommended connection usage:

- Use the Supabase transaction pooler for serverless or highly elastic deployments.
- Use a direct connection or session pooler for long-running FastAPI processes when supported by the deployment network.
- Use a direct database connection for Alembic migrations because migrations require stable session behavior.
- Keep separate runtime and migration connection variables if the deployment uses the transaction pooler.

Example configuration names:

```env
DATABASE_URL=<pooled-runtime-connection>
MIGRATION_DATABASE_URL=<direct-connection>
```

Do not commit either connection string. Both contain database credentials.

#### 3.2 Data-access and RLS decision

The recommended first migration keeps all application access behind FastAPI:

```text
React -> FastAPI -> SQLAlchemy -> Supabase PostgreSQL
```

Under this model:

- Existing tenant-aware repositories remain in place.
- The frontend does not query application tables through `supabase-js`.
- Database credentials remain backend-only.
- Supabase Row Level Security is not treated as the primary authorization layer.
- FastAPI continues deriving `business_id` from the verified user mapping.

If application tables are exposed through the Supabase Data API, enable RLS and deny direct access until complete tenant policies have been designed and tested. Do not create permissive policies merely to make the migration work. Direct browser database access would be a separate architecture change and is outside this structure-preserving plan.

#### 3.3 Database compatibility checks

Before migration, verify:

- All PostgreSQL enum definitions match the Alembic history.
- Every foreign key is recreated and validated.
- Integer sequences are advanced beyond the largest imported ID.
- Timestamp values preserve their intended UTC semantics.
- Nullable columns match the latest migrations rather than only the initial schema.
- The required PostgreSQL extensions are available in Supabase.
- SQLAlchemy connection pooling is compatible with the selected Supabase connection mode.
- Background jobs and the Telegram bot use the new database URL.
- Backup restoration has been tested, not only backup creation.

### 4. Backend implementation

#### 4.1 Configuration

Add backend configuration variables:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
```

Only add a Supabase secret/service-role key if the backend must perform administrative Auth operations. That key must never be exposed to the frontend or placed in a variable prefixed with `VITE_`.

Use asymmetric Supabase signing keys so FastAPI can validate access tokens using the public JWKS endpoint.

#### 4.2 JWT validation

Change only the authentication internals in `app/core/security.py` and `app/core/deps.py`:

1. Continue extracting the bearer token with `OAuth2PasswordBearer`.
2. Validate the JWT signature using the Supabase JWKS endpoint.
3. Validate the token issuer (`iss`).
4. Validate the audience (`aud`) as `authenticated`.
5. Validate token expiration (`exp`).
6. Read the Supabase user UUID from `sub`.
7. Find the local user by `supabase_user_id`.
8. Confirm that the local user and business still exist.
9. Return the existing `CurrentUser(user_id, business_id)` object.

A valid Supabase account without a local application profile must not receive access to protected application endpoints.

All existing protected routers can continue using:

```python
current_user: CurrentUser = Depends(get_current_user)
```

#### 4.3 Account provisioning

Add an authenticated, idempotent operation inside the existing auth router:

```text
POST /api/auth/bootstrap
```

Example request:

```json
{
  "business_name": "Example Clinic",
  "business_type": "clinic"
}
```

Operation:

1. Validate the Supabase access token.
2. Extract the verified Supabase UUID and email.
3. Return the existing profile if that Supabase user has already been provisioned.
4. Otherwise create the business and its owner user in one local database transaction.
5. Store the Supabase UUID on the local user.
6. Return `business_id` and `business_name`.

The endpoint must have a unique database constraint and retry-safe behavior so repeated requests cannot create duplicate businesses.

#### 4.4 Existing authentication endpoints

During migration, `/api/auth/signup` and `/api/auth/signin` may remain temporarily available for existing clients. After the frontend migration:

- Stop generating custom access tokens.
- Stop verifying passwords locally.
- Deprecate and then remove the old endpoints when safe.
- Keep the encryption functions used for Telegram secrets; they are unrelated to authentication.

### 5. Frontend implementation

#### 5.1 Supabase client

Install `@supabase/supabase-js` and add:

```env
VITE_ 
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Create one isolated client module, for example:

```text
frontend/src/lib/supabase.js
```

No secret/service-role key may be added to the frontend.

#### 5.2 Authentication context

Keep the existing `AuthProvider` and `useAuth()` structure, but replace their internal token management:

- Restore the Supabase session when the application starts.
- Subscribe to `supabase.auth.onAuthStateChange()`.
- Add an initial loading state to prevent premature redirects.
- Derive `isAuthenticated` from the active Supabase session.
- Use `supabase.auth.signOut()` for logout.
- Remove manual access-token storage.
- Load the business name from the backend profile rather than treating a localStorage value as authoritative.

#### 5.3 API client

Preserve the existing `apiFetch()` and `downloadFile()` interfaces. Internally they should:

1. Read the current Supabase session.
2. Attach `session.access_token` as the bearer token.
3. Allow Supabase to refresh expired access tokens.
4. Clear invalid authentication state after a definitive `401` response.
5. Use the same active token for file downloads.

Existing dashboard pages should not require changes to their API calls.

#### 5.4 Sign-in page

Keep the current route, form, layout, and navigation behavior. Replace the backend password request with:

```javascript
supabase.auth.signInWithPassword({ email, password })
```

After authentication:

1. Confirm that a session exists.
2. Load the local application profile/business.
3. Navigate to `/app` and let the existing routing logic select onboarding or dashboard.

#### 5.5 Sign-up page

Keep the current fields and layout. The new flow is:

1. Call `supabase.auth.signUp()` with the email and password.
2. If a session is immediately available, call `/api/auth/bootstrap` with the business name and type.
3. Continue to the existing onboarding flow.
4. If email confirmation is enabled, display a “Check your email” state.
5. After confirmation restores the session, call the same idempotent bootstrap operation.

Business information may be included temporarily in signup metadata to restore an interrupted confirmation flow, but backend authorization must always use the local database.

### 6. Email confirmation

Recommended production behavior:

- Enable email confirmation in Supabase.
- Configure development and production redirect URLs.
- Add a confirmation-pending state to the existing signup page.
- Provision the local business only after the email is confirmed.

For an initial development iteration, email confirmation can be disabled to preserve the current immediate signup-and-login behavior.

### 7. Existing-user migration

Existing bcrypt hashes should not be copied directly into Supabase.

Recommended migration:

1. Export the existing email and local-user mappings.
2. Create corresponding Supabase users.
3. Save each Supabase UUID on the correct local user record.
4. Require existing users to set a new password through Supabase password reset.
5. Keep legacy sign-in available only during a controlled transition if necessary.
6. Remove local password authentication after all active accounts have migrated.

If the database contains only seed or demo accounts, recreating those accounts in Supabase is simpler and safer than implementing dual authentication.

### 8. Security requirements

- Never expose a Supabase secret/service-role key in the frontend.
- Never authorize access from a frontend-supplied `business_id`.
- Never trust editable user metadata for tenant membership or roles.
- Validate signature, issuer, audience, and expiration for every JWT.
- Resolve tenant membership from the local database on every request.
- Make account bootstrap idempotent.
- Normalize emails, but use the Supabase UUID as the canonical identity.
- Rate-limit signup, sign-in, password reset, and bootstrap operations.
- Configure the exact permitted authentication redirect URLs.
- Preserve the existing database check so deleted or reassigned users lose access.
- Keep admin email checks attached to the database-linked local user.

### 9. Testing plan

Backend tests:

- A valid Supabase JWT resolves the correct local user and business.
- Expired or malformed tokens return `401`.
- Tokens with the wrong issuer or audience return `401`.
- A Supabase user without a local profile cannot access tenant endpoints.
- JWT metadata cannot be used to access another business.
- Repeated or concurrent bootstrap requests create one business only.
- A deleted or reassigned local user loses access immediately.
- Existing admin allowlisting continues to work.

Frontend tests:

- Sign-in persists after a browser refresh.
- Access tokens refresh without an unexpected logout.
- Logout clears the complete Supabase session.
- Protected routes wait for initial session restoration.
- Confirmed signup creates exactly one local business.
- Unconfirmed signup displays the correct confirmation state.
- API requests and file downloads use the active access token.
- A definitive backend `401` returns the user cleanly to sign-in.

Regression tests:

- Onboarding.
- Dashboard.
- Knowledge editor.
- Leads.
- Conversations.
- Settings.
- Telegram connection.
- Admin console access.

### 10. Implementation order

1. Create separate Supabase projects for the required environments.
2. Configure authentication URLs, signing keys, and the email-confirmation policy.
3. Record pooled runtime and direct migration database connections securely.
4. Back up and inventory the current database.
5. Apply the existing Alembic history to the empty Supabase database.
6. Add the `supabase_user_id` database migration.
7. Import application data and reset integer sequences.
8. Validate constraints, indexes, enums, row counts, and relationships.
9. Add repository lookup by Supabase UUID.
10. Implement backend Supabase JWT validation.
11. Add the idempotent account-bootstrap operation.
12. Add the frontend Supabase client.
13. Refactor `AuthContext` while preserving its public responsibility.
14. Refactor `apiFetch()` and file downloads.
15. Update sign-in and signup handlers without redesigning their pages.
16. Add confirmation and password-reset screens/states.
17. Migrate or recreate existing Auth accounts and link their UUIDs.
18. Test the complete system against a Supabase staging project.
19. Pause writes briefly, perform the final production data sync, and switch `DATABASE_URL`.
20. Run authentication, tenancy, data-integrity, background-job, and regression checks.
21. Monitor the transition and keep the old database read-only during the rollback window.
22. Remove custom JWT and bcrypt authentication after successful stabilization.

### 11. Expected result

The identity boundary changes, but the application architecture remains stable:

- Supabase manages identity, passwords, sessions, and token refresh.
- Supabase PostgreSQL hosts all application data.
- FastAPI validates the Supabase identity and maps it to a local user.
- The application tables hosted in Supabase PostgreSQL remain authoritative for businesses, roles, and tenant access.
- Existing routers, services, repositories, pages, and application URLs remain in their current structure.

---

## Version française

### 1. Implémentation actuelle

L’application utilise actuellement :

- React et Vite pour le frontend.
- FastAPI et SQLAlchemy pour le backend.
- Les endpoints personnalisés `/api/auth/signup` et `/api/auth/signin`.
- Des jetons JWT HS256 générés localement et valables pendant une semaine.
- Des mots de passe hachés avec bcrypt dans la table locale `users`.
- Un jeton d’accès enregistré manuellement dans le `localStorage` du navigateur.
- Un utilisateur local associé à un `business_id` et à un rôle.
- `get_current_user()` comme frontière d’authentification des routes protégées.
- `CurrentUser.user_id` et `CurrentUser.business_id` pour l’isolation des entreprises.

Les routes protégées du backend n’ont pas besoin de connaître le mécanisme d’authentification. Elles dépendent uniquement d’un objet `CurrentUser` résolu. Supabase peut donc être intégré au niveau de cette frontière sans réorganiser les routers, services, repositories, pages ou routes de l’application.

### 2. Architecture cible

```text
Pages de connexion et d’inscription
          |
          v
Client Supabase Auth JavaScript
  - crée et restaure les sessions
  - renouvelle les jetons d’accès
  - déconnecte les utilisateurs
          |
          v
Helper apiFetch() existant
Authorization: Bearer <jeton d’accès Supabase>
          |
          v
API FastAPI existante
          |
          v
get_current_user() mis à jour
  - valide le JWT Supabase
  - lit l’UUID Supabase depuis `sub`
  - retrouve l’utilisateur local et son entreprise
          |
          v
Routers, services et repositories multi-tenant existants
          |
          v
SQLAlchemy et Alembic
          |
          v
PostgreSQL Supabase
  - schéma auth géré par Supabase
  - tables applicatives publiques gérées par Alembic
```

Supabase prendra en charge :

- Le stockage et la vérification des mots de passe.
- La connexion par email et mot de passe.
- La confirmation de l’adresse email.
- La réinitialisation du mot de passe.
- La génération des jetons d’accès.
- La rotation des jetons de rafraîchissement et la persistance de session.

Le backend actuel continuera à gérer :

- Les entreprises.
- L’association entre utilisateurs et entreprises.
- Les rôles propriétaire et employé.
- L’autorisation multi-tenant.
- L’onboarding et les données de l’application.
- Les règles d’accès administrateur.
- Toutes les lectures et écritures applicatives via les repositories SQLAlchemy.

PostgreSQL Supabase remplacera l’hébergement actuel de la base pour l’ensemble du système. Cela n’impose pas de remplacer SQLAlchemy par la Data API JavaScript de Supabase. Le frontend React doit continuer à appeler FastAPI, et FastAPI doit continuer à utiliser la couche repository existante. Cette approche conserve la structure et le modèle de sécurité actuels.

Le backend ne doit jamais faire confiance à un `business_id` envoyé par le frontend ou stocké dans des métadonnées Supabase modifiables. L’entreprise doit être retrouvée dans la base locale après validation de l’identité Supabase.

### 3. Modifications de la base de données

Conserver la table `users` comme table de profil applicatif et d’appartenance à une entreprise. Ajouter une colonne qui la relie à Supabase Auth :

```text
users
|- id                 INTEGER, identifiant interne existant
|- supabase_user_id   UUID, identité Supabase unique
|- business_id        INTEGER, identifiant d’entreprise existant
|- email              VARCHAR, adresse email existante
|- role               ENUM, rôle applicatif existant
|- password_hash      VARCHAR, temporaire/déprécié
`- created_at         DATETIME, date de création existante
```

Étapes de migration :

1. Ajouter `supabase_user_id` comme colonne nullable et unique.
2. Relier les utilisateurs existants à leurs UUID Supabase.
3. Rendre `supabase_user_id` obligatoire après la migration.
4. Arrêter de créer et de lire les valeurs `password_hash`.
5. Supprimer `password_hash` uniquement après la période de retour arrière.

Conserver l’identifiant entier `users.id` évite de modifier `CurrentUser`, l’autorisation administrateur et les relations internes présentes ou futures.

#### 3.1 Migration complète de la base vers Supabase

Toutes les tables applicatives existantes seront déplacées vers PostgreSQL Supabase, notamment :

- `businesses`
- `users`
- `bot_configs`
- `knowledge_items`
- `conversations`
- `messages`
- `leads`
- `admins`
- `admin_invites`
- `unanswered_questions`
- `question_clusters`
- La table de version d’Alembic

Supabase Auth gère ses propres tables dans le schéma protégé `auth`. Les tables applicatives doivent rester dans le schéma `public` et continuer à être créées et modifiées avec les migrations Alembic existantes du projet.

Méthode de migration :

1. Créer un projet Supabase dédié pour chaque environnement nécessitant des données isolées.
2. Récupérer les chaînes de connexion PostgreSQL directe et poolée.
3. Sauvegarder la base actuelle avant toute migration.
4. Appliquer les migrations Alembic existantes à une base Supabase vide.
5. Exporter les données applicatives sans les schémas gérés par Supabase.
6. Importer les données dans l’ordre des clés étrangères.
7. Réinitialiser les séquences PostgreSQL après l’import des identifiants entiers.
8. Vérifier les volumes, clés étrangères, enums, index et contraintes uniques.
9. Relier les lignes locales `users` à `auth.users` avec `supabase_user_id`.
10. Tester l’application sur un environnement Supabase de staging.
11. Effectuer une dernière synchronisation contrôlée et basculer la production.

Utilisation recommandée des connexions :

- Utiliser le pooler transactionnel Supabase pour un déploiement serverless ou fortement élastique.
- Utiliser une connexion directe ou un pooler de session pour un processus FastAPI durable lorsque le réseau de déploiement le permet.
- Utiliser une connexion directe pour Alembic, car les migrations ont besoin d’un comportement de session stable.
- Séparer les variables de connexion d’exécution et de migration si l’application utilise le pooler transactionnel.

Exemple :

```env
DATABASE_URL=<connexion-runtime-poolée>
MIGRATION_DATABASE_URL=<connexion-directe>
```

Ces chaînes contiennent des identifiants de base et ne doivent jamais être commitées.

#### 3.2 Accès aux données et décision RLS

La première migration recommandée conserve tous les accès applicatifs derrière FastAPI :

```text
React -> FastAPI -> SQLAlchemy -> PostgreSQL Supabase
```

Avec ce modèle :

- Les repositories multi-tenant existants sont conservés.
- Le frontend n’interroge pas les tables applicatives avec `supabase-js`.
- Les identifiants de base restent uniquement dans le backend.
- La Row Level Security Supabase n’est pas la couche principale d’autorisation.
- FastAPI continue à déterminer le `business_id` depuis l’utilisateur vérifié.

Si les tables sont exposées par la Data API Supabase, activer RLS et refuser l’accès direct jusqu’à ce que des politiques multi-tenant complètes aient été conçues et testées. Il ne faut pas créer de politiques permissives uniquement pour faciliter la migration. L’accès direct du navigateur à la base constituerait un changement d’architecture séparé et ne fait pas partie de ce plan conservant la structure actuelle.

#### 3.3 Vérifications de compatibilité

Avant la migration, vérifier :

- La conformité des enums PostgreSQL avec l’historique Alembic.
- La recréation et la validation de toutes les clés étrangères.
- L’avancement des séquences au-delà du plus grand ID importé.
- La conservation de la sémantique UTC des timestamps.
- La conformité des colonnes nullables avec les dernières migrations.
- La disponibilité des extensions PostgreSQL requises dans Supabase.
- La compatibilité du pooling SQLAlchemy avec le mode de connexion choisi.
- L’utilisation de la nouvelle URL par les tâches de fond et le bot Telegram.
- La restauration effective des sauvegardes, et pas uniquement leur création.

### 4. Implémentation backend

#### 4.1 Configuration

Ajouter les variables backend suivantes :

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
```

Ajouter une clé secrète/service-role uniquement si le backend doit effectuer des opérations administratives Supabase Auth. Cette clé ne doit jamais être exposée au frontend ni placée dans une variable préfixée par `VITE_`.

Utiliser les clés de signature asymétriques Supabase afin que FastAPI puisse vérifier les jetons via l’endpoint public JWKS.

#### 4.2 Validation des JWT

Modifier uniquement la logique interne d’authentification dans `app/core/security.py` et `app/core/deps.py` :

1. Continuer à extraire le bearer token avec `OAuth2PasswordBearer`.
2. Vérifier la signature du JWT avec l’endpoint JWKS de Supabase.
3. Vérifier l’émetteur du jeton (`iss`).
4. Vérifier que l’audience (`aud`) vaut `authenticated`.
5. Vérifier l’expiration (`exp`).
6. Lire l’UUID Supabase dans `sub`.
7. Rechercher l’utilisateur local avec `supabase_user_id`.
8. Vérifier que l’utilisateur local et l’entreprise existent toujours.
9. Retourner l’objet existant `CurrentUser(user_id, business_id)`.

Un compte Supabase valide sans profil applicatif local ne doit pas pouvoir accéder aux endpoints protégés.

Toutes les routes protégées existantes peuvent continuer à utiliser :

```python
current_user: CurrentUser = Depends(get_current_user)
```

#### 4.3 Création du profil et de l’entreprise

Ajouter une opération authentifiée et idempotente dans le router d’authentification existant :

```text
POST /api/auth/bootstrap
```

Exemple de requête :

```json
{
  "business_name": "Clinique Exemple",
  "business_type": "clinic"
}
```

Fonctionnement :

1. Valider le jeton d’accès Supabase.
2. Extraire l’UUID Supabase et l’email vérifiés.
3. Retourner le profil existant si l’utilisateur a déjà été créé localement.
4. Sinon, créer l’entreprise et son utilisateur propriétaire dans une seule transaction locale.
5. Enregistrer l’UUID Supabase sur l’utilisateur local.
6. Retourner `business_id` et `business_name`.

L’endpoint doit utiliser une contrainte unique et être sûr en cas de répétition afin d’éviter la création de plusieurs entreprises.

#### 4.4 Endpoints d’authentification existants

Pendant la migration, `/api/auth/signup` et `/api/auth/signin` peuvent rester temporairement disponibles pour les anciens clients. Après la migration du frontend :

- Arrêter de générer les jetons d’accès personnalisés.
- Arrêter de vérifier les mots de passe localement.
- Déprécier puis supprimer les anciens endpoints lorsque cela est sûr.
- Conserver les fonctions de chiffrement utilisées pour les secrets Telegram, car elles ne concernent pas l’authentification.

### 5. Implémentation frontend

#### 5.1 Client Supabase

Installer `@supabase/supabase-js` et ajouter :

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Créer un module client isolé, par exemple :

```text
frontend/src/lib/supabase.js
```

Aucune clé secrète/service-role ne doit être ajoutée au frontend.

#### 5.2 Contexte d’authentification

Conserver la structure actuelle `AuthProvider` et `useAuth()`, mais remplacer la gestion interne des jetons :

- Restaurer la session Supabase au démarrage de l’application.
- S’abonner à `supabase.auth.onAuthStateChange()`.
- Ajouter un état de chargement initial afin d’éviter les redirections prématurées.
- Déduire `isAuthenticated` de la session Supabase active.
- Utiliser `supabase.auth.signOut()` pour la déconnexion.
- Supprimer le stockage manuel du jeton d’accès.
- Charger le nom de l’entreprise depuis le backend au lieu de considérer le `localStorage` comme source fiable.

#### 5.3 Client API

Conserver les interfaces existantes `apiFetch()` et `downloadFile()`. Leur logique interne devra :

1. Lire la session Supabase courante.
2. Ajouter `session.access_token` comme bearer token.
3. Laisser Supabase renouveler les jetons expirés.
4. Nettoyer l’état d’authentification après une réponse `401` définitive.
5. Utiliser le même jeton actif pour les téléchargements de fichiers.

Les pages du dashboard ne devraient nécessiter aucune modification de leurs appels API.

#### 5.4 Page de connexion

Conserver la route, le formulaire, la mise en page et la navigation actuels. Remplacer la requête backend de connexion par :

```javascript
supabase.auth.signInWithPassword({ email, password })
```

Après l’authentification :

1. Confirmer qu’une session existe.
2. Charger le profil applicatif et l’entreprise locale.
3. Naviguer vers `/app` et laisser la logique actuelle choisir l’onboarding ou le dashboard.

#### 5.5 Page d’inscription

Conserver les champs et la mise en page actuels. Le nouveau flux sera :

1. Appeler `supabase.auth.signUp()` avec l’email et le mot de passe.
2. Si une session est immédiatement disponible, appeler `/api/auth/bootstrap` avec le nom et le type d’entreprise.
3. Continuer vers l’onboarding existant.
4. Si la confirmation email est activée, afficher un état « Vérifiez votre email ».
5. Après la confirmation et la restauration de session, appeler la même opération idempotente de bootstrap.

Les informations de l’entreprise peuvent être placées temporairement dans les métadonnées d’inscription pour reprendre un flux interrompu, mais l’autorisation backend doit toujours utiliser la base locale.

### 6. Confirmation de l’adresse email

Comportement recommandé en production :

- Activer la confirmation email dans Supabase.
- Configurer les URLs de redirection de développement et de production.
- Ajouter un état d’attente de confirmation à la page d’inscription existante.
- Créer l’entreprise locale uniquement après la confirmation de l’email.

Pour une première version de développement, la confirmation peut être désactivée afin de conserver le comportement actuel d’inscription et de connexion immédiates.

### 7. Migration des utilisateurs existants

Les hash bcrypt existants ne doivent pas être copiés directement dans Supabase.

Migration recommandée :

1. Exporter les correspondances entre emails et utilisateurs locaux.
2. Créer les utilisateurs correspondants dans Supabase.
3. Enregistrer chaque UUID Supabase sur le bon utilisateur local.
4. Demander aux utilisateurs existants de définir un nouveau mot de passe via la réinitialisation Supabase.
5. Conserver temporairement l’ancienne connexion uniquement pendant une transition contrôlée si nécessaire.
6. Supprimer l’authentification locale après la migration de tous les comptes actifs.

Si la base contient uniquement des comptes de démonstration ou de test, il est plus simple et plus sûr de les recréer dans Supabase que de maintenir deux systèmes d’authentification.

### 8. Exigences de sécurité

- Ne jamais exposer une clé Supabase secrète/service-role dans le frontend.
- Ne jamais autoriser un accès à partir d’un `business_id` envoyé par le frontend.
- Ne jamais utiliser les métadonnées utilisateur modifiables pour déterminer l’entreprise ou le rôle.
- Vérifier la signature, l’émetteur, l’audience et l’expiration de chaque JWT.
- Retrouver l’appartenance à l’entreprise dans la base locale à chaque requête.
- Rendre le bootstrap de compte idempotent.
- Normaliser les emails, mais utiliser l’UUID Supabase comme identité principale.
- Limiter le débit des opérations d’inscription, connexion, réinitialisation et bootstrap.
- Configurer précisément les URLs de redirection autorisées.
- Conserver la vérification en base afin qu’un utilisateur supprimé ou réaffecté perde immédiatement son accès.
- Conserver la vérification des emails administrateurs sur l’utilisateur local lié à Supabase.

### 9. Plan de tests

Tests backend :

- Un JWT Supabase valide retrouve le bon utilisateur et la bonne entreprise.
- Un jeton expiré ou malformé retourne `401`.
- Un jeton avec un mauvais émetteur ou une mauvaise audience retourne `401`.
- Un utilisateur Supabase sans profil local ne peut pas accéder aux endpoints multi-tenant.
- Les métadonnées JWT ne permettent pas d’accéder à une autre entreprise.
- Des requêtes bootstrap répétées ou simultanées ne créent qu’une seule entreprise.
- Un utilisateur local supprimé ou réaffecté perd immédiatement son accès.
- La liste blanche administrateur existante continue de fonctionner.

Tests frontend :

- La connexion persiste après le rafraîchissement du navigateur.
- Les jetons sont renouvelés sans déconnexion inattendue.
- La déconnexion supprime toute la session Supabase.
- Les routes protégées attendent la restauration initiale de la session.
- Une inscription confirmée crée exactement une entreprise locale.
- Une inscription non confirmée affiche le bon état d’attente.
- Les requêtes API et téléchargements utilisent le jeton actif.
- Une réponse backend `401` définitive renvoie proprement vers la connexion.

Tests de régression :

- Onboarding.
- Dashboard.
- Éditeur de connaissances.
- Prospects.
- Conversations.
- Paramètres.
- Connexion Telegram.
- Accès à la console administrateur.

### 10. Ordre d’implémentation

1. Créer des projets Supabase séparés pour les environnements nécessaires.
2. Configurer les URLs d’authentification, les clés de signature et la confirmation email.
3. Enregistrer de manière sécurisée les connexions poolée et directe.
4. Sauvegarder et inventorier la base actuelle.
5. Appliquer l’historique Alembic à la base Supabase vide.
6. Ajouter la migration `supabase_user_id`.
7. Importer les données applicatives et réinitialiser les séquences.
8. Vérifier les contraintes, index, enums, volumes et relations.
9. Ajouter la recherche repository par UUID Supabase.
10. Implémenter la validation des JWT Supabase dans le backend.
11. Ajouter l’opération idempotente de bootstrap du compte.
12. Ajouter le client Supabase dans le frontend.
13. Refactoriser `AuthContext` sans changer sa responsabilité publique.
14. Refactoriser `apiFetch()` et les téléchargements.
15. Mettre à jour les handlers de connexion et d’inscription sans redessiner leurs pages.
16. Ajouter les écrans ou états de confirmation et de réinitialisation du mot de passe.
17. Migrer ou recréer les comptes Auth existants et relier leurs UUID.
18. Tester tout le système avec un projet Supabase de staging.
19. Suspendre brièvement les écritures, effectuer la dernière synchronisation et modifier `DATABASE_URL`.
20. Exécuter les tests d’authentification, d’isolation, d’intégrité, de tâches de fond et de régression.
21. Surveiller la transition et conserver l’ancienne base en lecture seule pendant la période de retour arrière.
22. Supprimer l’authentification JWT et bcrypt personnalisée après stabilisation.

### 11. Résultat attendu

La frontière d’identité change, mais l’architecture de l’application reste stable :

- Supabase gère l’identité, les mots de passe, les sessions et le renouvellement des jetons.
- PostgreSQL Supabase héberge toutes les données applicatives.
- FastAPI valide l’identité Supabase et la relie à un utilisateur local.
- Les tables applicatives hébergées dans PostgreSQL Supabase restent la source de vérité pour les entreprises, les rôles et l’accès multi-tenant.
- Les routers, services, repositories, pages et URLs de l’application conservent leur structure actuelle.
