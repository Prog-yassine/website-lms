# Données et identités : choix AWS pour Grupedia

Recherche vérifiée le **1 novembre 2026** ; région de référence **Europe (Stockholm), eu-north-1**. Les recommandations ci-dessous sont une conception pour Grupedia, pas un audit d’un compte AWS déployé.

## Décision initiale

Pour des applications dont chaque créateur personnalise ses tables, partir sur **RDS PostgreSQL mutualisé avec une base logique et un rôle par projet**. Conserver les métadonnées de la plateforme dans une base de contrôle distincte : organisations, membres, projets, versions de templates, plugins autorisés et mesure d’usage. Séparer également l’authentification des propriétaires Grupedia de celle des utilisateurs finaux des applications clientes.

| Élément | Priorité | Pourquoi |
| --- | --- | --- |
| RDS PostgreSQL | MVP | SQL, transactions et schémas personnalisables ; coût plus prévisible pour une première flotte. |
| Cognito User Pools | MVP si authentification gérée | Annuaire, tokens et récupération de compte ; autorisations de données toujours développées par Grupedia. |
| Pool de connexions du serveur | MVP | Limiter la consommation collective de connexions et les voisins bruyants. |
| RDS Proxy | Selon mesures | Utile pour concurrence/bursts/failover ; coût et compatibilité de sessions à vérifier. |
| Aurora Serverless v2 | Après validation du trafic | Alternative pour croissance variable ; ce n’est pas un complément obligatoire à RDS. |
| Réplicas, multirégion et restauration autonome client | Plus tard ou offre premium | La disponibilité, le RTO/RPO et le prix doivent être contractualisés et testés. |

Cette recommandation s’appuie sur la [matrice des modèles SaaS PostgreSQL AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/matrix.html), puis sur les contraintes produit propres à Grupedia.

## RDS ou Aurora : différence opérationnelle

RDS PostgreSQL provisionné facture notamment classe d’instance, stockage et sauvegardes excédentaires. Une instance Single-AZ convient au développement ou à un service acceptant cette disponibilité ; ce n’est pas un service haute disponibilité. Pour une production sensible, chiffrer Multi-AZ et tester le basculement, en plus de dimensionner CPU, RAM et I/O. Ne pas confondre « 8 Go de base » commercial avec 8 Go de RAM ou une instance dédiée.

Aurora découple calcul et volume distribué sur trois zones de disponibilité. Son option **Standard** facture aussi les opérations d’I/O ; **I/O-Optimized** les intègre avec une autre structure de prix. AWS recommande de comparer I/O-Optimized lorsque les I/O représentent au moins 25 % de la dépense Aurora. Une architecture durable de stockage ne garantit pas à elle seule un basculement applicatif immédiat : nombre de readers, promotion et comportement du client comptent. [Stockage Aurora](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.StorageReliability.html).

Aurora Serverless v2 est disponible à Stockholm, sous réserve du moteur et de sa version. Les bornes de capacité changent selon version du moteur et plateforme ; ne pas annoncer un plafond universel valable pour toutes les versions. Le bon critère est la capacité réellement supportée par les options commandables du déploiement. [Régions et moteurs](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.ServerlessV2.html), [gestion de capacité](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-administration.html).

**La mise en pause à zéro n’est pas automatique pour toute configuration.** Il faut une version compatible, un minimum configuré à zéro ACU et une période d’inactivité. L’API documente un délai réglable de 300 à 86 400 secondes ; les versions sans auto-pause ont un plancher de 0,5 ACU. [Configuration ServerlessV2](https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_ServerlessV2ScalingConfigurationInfo.html).

Pendant la pause, le stockage reste payant. Le réveil typique peut prendre environ 15 secondes, davantage après un long sommeil. Des connexions persistantes, certaines fonctions de réplication, et **RDS Proxy** peuvent empêcher la pause. Pour une base partagée recevant des clients toute la journée, la pause pourrait donc ne jamais se produire. Le choix Aurora doit reposer sur la consommation mesurée, sans promettre une base gratuite ou un premier accès instantané. [Conditions d’auto-pause](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-auto-pause.html).

## Isolation des bases et migrations

Trois options sont pertinentes :

- **Bridge / bases séparées** : chaque projet a sa base, son rôle et ses migrations. Bon alignement avec des tables librement personnalisables ; supervision et connexions restent communes.
- **Bridge / schémas séparés** : moins de bases, mais davantage de discipline sur droits et résolution du schéma. Un simple `search_path` n’est pas une frontière d’autorisation.
- **Pool / tables partagées** : adapté aux données uniformes de contrôle ; chaque ligne porte un tenant et des politiques RLS appliquent l’isolation. Il est moins naturel pour des structures totalement différentes par application.

[Modèles bridge](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/bridge.html), [pool](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/pool.html).

Le rôle de l’API ne doit pas être un superutilisateur général. Le contexte projet vient d’une identité et d’une appartenance vérifiées côté serveur, pas d’un simple paramètre fourni par le navigateur. Pour RLS, fixer ce contexte pendant l’opération et tester la réutilisation des connexions entre deux tenants. Les droits de migration et de lecture/écriture courante doivent être distincts. [Recommandations RLS AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/rls.html).

Grupedia doit construire un moteur de migrations versionnées : appliquer une évolution à un projet, garder son historique, refuser une extension non approuvée et traiter l’échec sans modifier d’autres projets. RDS ne donne pas un PostgreSQL administrable sans restrictions : versions et extensions supportées dépendent du service et du moteur. [Extensions RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.FeatureSupport.Extensions.html).

## Connexions : petit nombre par projet, capacité globale bornée

Créer une connexion par visiteur ou un grand pool par projet épuiserait rapidement la base partagée. Utiliser des pools bornés, des délais de requête et de transaction, un budget global de connexions et l’éviction des pools inactifs. Mesurer les limites selon la classe de DB ; `max_connections` n’est pas une promesse de débit utile. [Limites RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html).

RDS Proxy est une option gérée, particulièrement intéressante avec Lambda et des pics de connexions. Certaines modifications d’état de session provoquent le **pinning**, ce qui réduit la réutilisation. PostgreSQL ne dispose pas des mêmes filtres de pinning que MySQL. Un proxy ne remplace ni les limites SQL par client ni les tests de contexte tenant. [Pinning RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-pinning.html). Commencer par un pool applicatif limité ; ajouter RDS Proxy ou un pooler exploité par l’équipe lorsqu’un besoin est mesuré, plutôt que financer les deux par défaut.

Autre limite importante : un proxy accepte au plus **200 secrets Secrets Manager**, donc 200 comptes DB avec cette méthode. Un rôle distinct par projet impose de prévoir ce plafond ; l’authentification IAM de bout en bout et le partitionnement des proxies sont des choix à évaluer, pas une capacité illimitée implicite. [Limites RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html).

## Sauvegardes et restauration d’un seul client

RDS permet une rétention automatisée de **0 à 35 jours** pour une instance ; zéro désactive les backups. Le défaut varie entre API/CLI et console : définir la valeur explicitement dans l’infrastructure. [Rétention](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html).

Une restauration à un instant donné crée une **nouvelle instance**. Pour restaurer uniquement le projet A sans revenir en arrière sur B, restaurer temporairement l’instance, exporter la base A, puis réimporter dans une destination contrôlée. Prévoir temps, espace temporaire, cohérence avec les fichiers, coupure éventuelle et contrôle du propriétaire. Un export logique régulier par projet complète les backups physiques ; il ne les remplace pas. [Restauration PITR](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html).

L’export de snapshot RDS vers S3 produit des données **Parquet** pour analyse : ce n’est pas un backup directement réimportable par la fonction de restauration RDS. Le service exige notamment un rôle IAM, un bucket dans la région du snapshot et une clé KMS pour chiffrer l’export. [Export de snapshot](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ExportSnapshot.html). Tester régulièrement une restauration complète et une restauration tenant avant d’annoncer un RPO/RTO commercial.

## Cognito : séparer connexion et droit d’accès

Un **User Pool** gère les identités et tokens ; un **Identity Pool** échange des identités contre des identifiants AWS temporaires. Ce dernier n’est pas requis si toute opération S3/DB passe par une API ou des URL signées ; il devient utile pour un accès SDK direct et strictement borné. [Fonctionnement de l’authentification](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-how-to-authenticate.html).

Recommandation : un annuaire de contrôle pour les propriétaires et membres Grupedia, séparé des annuaires des utilisateurs des applications. Pour les apps clientes :

- **Pool par projet** : politiques et annuaires indépendants, identifiants identiques possibles dans deux projets, administration plus simple à cloisonner ; orchestration et quotas à gérer.
- **Pool partagé** : réduit le nombre de ressources, mais impose une convention d’identité et une autorisation tenant rigoureuse ; les utilisateurs peuvent traverser plusieurs app clients.

Un app client par projet ne constitue pas, seul, une isolation des utilisateurs. La documentation AWS indique que les utilisateurs d’un pool partagé peuvent s’authentifier auprès de ses app clients ; Grupedia doit contrôler leurs droits avant d’ouvrir les données. [App clients et multitenancy](https://docs.aws.amazon.com/cognito/latest/developerguide/application-client-based-multi-tenancy.html), [recommandations de sécurité](https://docs.aws.amazon.com/cognito/latest/developerguide/multi-tenancy-security-recommendations.html).

Valider signature, expiration, issuer/pool, usage du token et client/audience attendus, puis contrôler organisation, projet et permission de l’opération. Un token valide du projet A ne doit pas ouvrir B. Une clé API publique ou un identifiant de projet n’est pas un secret d’administration. [Vérification JWT](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html).

## Marque blanche, quotas et coûts auth

La page actuelle des quotas indique **1 000 user pools par région**, ajustables, **1 000 app clients par pool**, ajustables, **20 styles managed-login par pool** et seulement **4 domaines personnalisés par région**, non ajustables. Les quotas d’opérations s’agrègent également au niveau compte/région. Il faut donc choisir un modèle de connexion avant de promettre un domaine d’authentification personnalisé pour chaque application. [Quotas Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/quotas.html).

Pour le MVP, privilégier une interface de connexion propre au template et des endpoints Cognito configurés par projet, avec domaine OIDC central ou préfixes Cognito lorsque nécessaires. Pour un domaine managed-login personnalisé, le certificat ACM doit être en **us-east-1**, même si le pool est à Stockholm. [Domaines Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-add-custom-domain.html).

Lite convient à l’authentification de base ; Essentials ajoute notamment des fonctions comme passkeys et rotation des refresh tokens. Au premier palier payant, Lite coûte **$0.0055/MAU** et Essentials **$0.015/MAU**. Les 10 000 MAU gratuits applicables sont partagés par compte/organisation, pas accordés à chaque projet ; SMS, e-mails et certains usages fédérés ou machine-à-machine ont leur propre coût. Le coût fournisseur doit être rapproché du compteur commercial de Grupedia. [Tarifs Cognito](https://aws.amazon.com/cognito/pricing/).

Les nouveaux pools Lite ne permettent pas la personnalisation complète des claims d’access token. Si l’architecture exige d’y injecter un `tenant_id` personnalisé, prévoir Essentials/Plus, ou dériver l’appartenance côté serveur d’informations vérifiées. [Pre-token triggers](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html).

## Ordre de réalisation recommandé

1. Définir l’identité projet, séparer annuaire de contrôle et utilisateurs clients, et créer les rôles/DB via une tâche de provisionnement idempotente.
2. Livrer le CRUD autorisé, les migrations, un pool de connexions borné et des métriques par projet.
3. Tester fuite interprojet, saturation et restauration d’un tenant ; fixer les quotas commerciaux après ces mesures.
4. Ajouter ensuite Aurora, proxy, réplicas et offres dédiées lorsque les usages, objectifs de disponibilité ou marges le justifient.

Les composants à construire restent l’éditeur de données, les liaisons template→API, la gestion des autorisations, le cycle des migrations, la restauration autonome et la mesure d’usage. Acheter les services AWS ne livre pas ces fonctions produit.
