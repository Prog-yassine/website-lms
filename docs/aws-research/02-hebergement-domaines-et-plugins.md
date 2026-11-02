# Exécution, hébergement, domaines et plugins de Grupedia

Recherche documentaire vérifiée le **1 novembre 2026**, sources AWS officielles. Région applicative de référence : **Stockholm (`eu-north-1`)** ; CloudFront est global et certains certificats doivent être créés dans une autre région. Les choix ci-dessous sont des recommandations d’architecture, pas des ressources déjà déployées.

## 1. Séparer les trois types de code

Grupedia hébergerait son propre tableau de bord et son API, les interfaces des applications clientes et, éventuellement, le code fourni par leurs développeurs. Ces trois niveaux ne doivent pas partager automatiquement les mêmes droits. Une interface statique téléchargée par le navigateur ne nécessite pas un serveur permanent par client ; un moteur SSR ou un plugin serveur, oui, demande un environnement d’exécution. L’éditeur visuel, les associations boutons/données, la validation des templates, leurs versions et la marketplace restent du **code produit à développer**. Aucun assemblage de services AWS ne les fournit automatiquement.

Pour le lancement, je recommande des templates statiques approuvés, un API backend commun et des plugins développés ou vérifiés par l’équipe. Cela permet de valider le produit avant d’exposer une plateforme d’exécution générale de code tiers.

## 2. API commune : ECS Fargate ou Lambda, pas les deux par défaut

| Option | Bon usage | Décision proposée |
| --- | --- | --- |
| **ECS Fargate + Application Load Balancer + ECR** | Conserver l’API Express, connexions persistantes et processus longs ; images de conteneur versionnées. | Choix initial cohérent avec le backend existant. Mutualiser le service API ; ajouter des tâches selon la charge. |
| **Lambda Event Functions + API Gateway HTTP** | API intermittente et petits traitements dont le volume varie fortement. | Alternative si l’équipe accepte une adaptation et maîtrise les connexions PostgreSQL. |
| **Workers Fargate ou Lambda asynchrones** | Builds, exports, imports, webhooks, tâches lentes. | Séparer ces traitements du chemin HTTP. Choisir le moteur selon durée, mémoire, dépendances et isolation. |

La facturation ECS comporte tâches actives et autres ressources comme ALB, réseau, images et logs ; Lambda ajoute invocations, durée et passerelle. Le HTTP API Gateway conserve une **limite d’intégration de 30 secondes** et une **charge utile de 10 Mo** : le timeout maximal d’une Lambda ne rend pas un appel HTTP long possible. Les gros transferts doivent aller directement vers S3 avec un accès autorisé, et les traitements longs passer par une file avec statut de progression. [Quotas HTTP API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-quotas.html).

Les Lambda Event Functions classiques ont un timeout maximum de **900 secondes** ; cela convient à des tâches bornées, pas à un serveur arbitraire permanent. Certaines autres formes d’exécution Lambda ont des limites différentes et ne doivent pas être confondues avec ce modèle. [Quotas Lambda](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html).

## 3. Interfaces et fichiers : S3 privé derrière CloudFront

Pour les applications React statiques, stocker des versions immuables sous un chemin par projet/déploiement dans S3, puis les distribuer avec CloudFront. Le catalogue doit retenir le déploiement actif pour permettre un retour à une version précédente. Séparer les artefacts publiés des uploads privés clients. L’API contrôle quel projet peut lire ou écrire ; la structure d’un préfixe S3 ne constitue pas à elle seule une autorisation.

Utiliser un **bucket S3 standard privé avec Origin Access Control (OAC)**, plutôt que rendre le bucket public. Un endpoint S3 configuré en « website hosting » ne supporte pas OAC : il ne faut pas mélanger les deux modes. Pour une SPA, prévoir la résolution des routes comme `/products/123`, sans transformer une erreur API en page HTML. La politique de cache doit distinguer assets versionnés, HTML et données privées. [OAC et origines S3](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html).

Si un template exige un rendu serveur, S3 ne l’exécute pas : ajouter un runtime Node adapté, par exemple ECS derrière ALB. CloudFront peut utiliser S3 pour les assets et ALB/API Gateway pour les requêtes dynamiques. Cette capacité est une offre supplémentaire à dimensionner, pas une propriété implicite de tous les templates. [Origines prises en charge par CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistS3AndCustomOrigins.html).

## 4. Sous-domaines et domaines des clients

**Au lancement**, fournir un sous-domaine contrôlé par Grupedia pour chaque application. Une zone Route 53 peut contenir les enregistrements du domaine et de ses sous-domaines ; il n’est pas nécessaire de créer une zone payante par projet. L’API doit associer chaque nom d’hôte à un projet autorisé. [Zones publiques Route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html).

**Pour les domaines personnalisés**, orchestrer la preuve de propriété, l’obtention du certificat, le rattachement CDN, le DNS puis la suppression propre. Le client peut conserver son fournisseur DNS : Grupedia donne les enregistrements nécessaires. Un domaine racine demande une stratégie ALIAS/équivalente ou une solution appropriée au fournisseur, pas simplement un CNAME universel. Refuser les noms déjà affectés, vérifier leur propriété avant de servir le contenu et gérer renouvellement, erreurs et domaines abandonnés.

Les certificats ACM utilisés côté visiteurs par CloudFront doivent être dans **`us-east-1`** ; les certificats d’un load balancer sont régionaux, donc à Stockholm pour un ALB à Stockholm. Cela ne déplace pas la base de données vers les États-Unis. [Régions et certificats ACM](https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html).

## 5. CloudFront SaaS Manager quand les domaines se multiplient

Une distribution multitenant sert de configuration réutilisable ; les ressources « distribution tenant » associent domaines, paramètres et certificats aux applications. Elle n’est pas directement accessible : les connexions passent par un connection group et un tenant. Ce modèle réduit les configurations répétées pour une plateforme de sites ; il ne remplace pas l’isolation des données ni les autorisations API. [Fonctionnement des distributions multitenant](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html).

Les **quotas documentés actuels** sont 1 000 000 tenants et 500 distributions multitenant par compte, 100 alias par tenant et 5 paramètres par tenant. Plusieurs résultats de recherche anciens montrent encore 10 000 tenants ou 20 distributions : vérifier la page courante et les quotas effectifs du compte avant de planifier une capacité. [Quotas CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html).

SaaS Manager ajoute un prix par ressources créées, en plus du trafic et des requêtes : 10 premiers tenants gratuits ; de 11 à 200, **20 $/mois pour cette tranche** ; au-delà de 200, **0,10 $ par tenant supplémentaire/mois**. Ainsi 1 000 tenants représentent 100 $/mois de frais SaaS Manager, avant la distribution du contenu. Ne pas confondre ces tenants CDN avec les utilisateurs finaux Cognito. [Tarifs CloudFront PAYG](https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/).

Les forfaits CloudFront fixes ne sont **pas compatibles avec les distributions multitenant** ; ils limitent aussi le compte à trois forfaits Free et chaque forfait à un domaine apex. Ils peuvent convenir au site de Grupedia, sans devenir une bande passante gratuite et indépendante pour chaque client. [Restrictions des forfaits](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html).

CloudFront peut demander des certificats ACM gérés pour un tenant et automatiser le renouvellement après validation. Ces certificats ne sont utilisables qu’avec CloudFront et leur clé privée n’est pas exportable. Les certificats ACM personnalisés restent une autre possibilité. [Certificats gérés des tenants](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/managed-cloudfront-certificates.html).

## 6. Plugins tiers : l’isolation est une fonction du produit

Ne jamais exécuter un plugin inconnu dans le processus de l’API centrale, ni lui fournir les identifiants administrateur PostgreSQL ou un rôle AWS général. Pour un plugin Stripe approuvé, garder les secrets côté serveur, limiter l’accès au projet installé et développer le contrat d’événements et de permissions. Un plugin navigateur n’obtient que les capacités publiques ou autorisées du visiteur.

Fargate fournit une frontière d’isolation **entre tâches**, pas entre deux conteneurs d’une même tâche ni entre deux plugins dans le même processus. Les droits du task role restent accessibles au code exécuté dans la tâche. Séparer donc les tâches/rôles des plugins non fiables, leurs destinations réseau, leurs artefacts et leurs budgets, éventuellement dans des comptes dédiés à l’exécution. [Task IAM roles et limites de sécurité](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html), [isolation Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/security-fargate-ec2.html).

Lambda propose désormais un **tenant isolation mode**, disponible notamment à Stockholm. Il sépare les environnements par identifiant, mais **le rôle d’exécution reste commun à tous les tenants**. Ce mode doit être choisi à la création, impose `tenant-id`, exclut les function URLs, SnapStart et la concurrence provisionnée, et ajoute des frais de création d’environnement. C’est un mécanisme utile, pas une protection suffisante si le rôle partagé peut lire les données de tous les clients. [Isolation tenant Lambda](https://docs.aws.amazon.com/lambda/latest/dg/tenant-isolation.html).

## 7. Builds et déploiements

Pour le code de Grupedia, GitHub Actions peut assumer un rôle AWS temporaire via OIDC. Restreindre `aud` et `sub` au dépôt et à la branche/environnement attendus ; éviter une clé AWS permanente dans GitHub. [Fédération GitHub OIDC](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html).

Pour construire un template tiers, le build est lui-même une exécution de code non fiable, y compris les scripts d’installation des dépendances. CodeBuild peut limiter le rôle et l’accès aux artefacts d’un projet/build. Utiliser un rôle sans secrets de production, sans accès réseau aux bases, et publier via une étape de confiance distincte. Une permissions boundary CDK existe pour interdire la lecture de Parameter Store et Secrets Manager aux builds non fiables ; elle complète, sans remplacer, l’isolation et les politiques du compte. [Restriction par build](https://docs.aws.amazon.com/codebuild/latest/userguide/permissions-conditionkeys-variables.html), [boundary pour code non fiable](https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_codebuild/UntrustedCodeBoundaryPolicy.html).

**Ordre proposé :** templates statiques approuvés et API commune au lancement ; domaines clients et builds automatisés ensuite ; SSR et plugins serveur tiers seulement après une architecture d’isolation, de permissions, de comptage et de révocation effectivement testée.
