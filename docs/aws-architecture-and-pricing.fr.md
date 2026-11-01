# Grupedia : architecture AWS et proposition tarifaire

**Vérification : 1 novembre 2026.** Région de référence : **Europe (Stockholm), `eu-north-1`**. Montants en USD hors taxes, sans remises ni crédits ; calculs mensuels sur **730 heures**. Les tarifs AWS et les prix de vente Grupedia sont distincts. Le site présente une proposition et un estimateur : **aucun paiement, déploiement AWS ou prélèvement n’est déclenché**.

## Architecture proposée

Grupedia permettrait aux développeurs de publier des templates et des plugins réutilisables. Un utilisateur choisirait un template, connecterait ses tables aux listes, boutons et formulaires, puis ajouterait authentification, fichiers et plugins. **Ces fonctions demandent du code produit** : AWS ne fournit pas automatiquement l’éditeur, les liaisons de données, la marketplace, les permissions ou la facturation.

| Besoin | Services et choix initial |
| --- | --- |
| Interface, templates et fichiers | **S3 + CloudFront** : interface statique, assets et fichiers ; objets privés et accès contrôlés pour les données utilisateur. |
| API Node.js existante | **ECS Fargate + ALB + ECR**, avec une API mutualisée et des images versionnées ; autoscaling selon des mesures réelles. |
| Données relationnelles | **RDS PostgreSQL mutualisé** : base logique et rôle distincts par projet, sur une instance partagée. |
| Authentification et e-mails | **Cognito Lite**, choisi explicitement pour l’authentification de base, et **SES** pour les e-mails ; Essentials est le niveau par défaut des nouveaux pools et coûte davantage. |
| Secrets et accès | **IAM**, **KMS**, **Secrets Manager** ; rôles minimaux, secrets hors Git et séparation entre contrôle de la plateforme et données des projets. |
| Exploitation | **CloudWatch + AWS Budgets** : métriques, logs avec rétention, alertes de dépenses ; Budgets ne remplace pas les plafonds applicatifs. |
| Domaines et HTTPS | **Route 53 + ACM** ; chiffrer aussi les domaines et la gestion de domaines clients. |
| Webhooks et comptage | **SQS + EventBridge** pour traitements asynchrones, reprises et événements d’usage idempotents. |

**Alternative API : Lambda + API Gateway HTTP**, intéressante pour un trafic intermittent ; elle remplace l’architecture API Fargate/ALB dans le chiffrage. Ne pas additionner les deux comme des coûts obligatoires. Les limites de connexions PostgreSQL et l’éventuel coût d’un proxy restent à traiter.

**Stripe reste externe à AWS** : plugin, comptes marchands, commissions et traitement des webhooks sont des intégrations à développer. Aucun checkout ni paiement réel n’est actuellement activé.

## Mutualisation et isolation

Le modèle [bridge AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/bridge.html) sépare les projets par bases ou schémas PostgreSQL, sans créer une instance RDS par projet. C’est adapté aux tables personnalisables de Grupedia. Il exige des rôles isolés, une résolution fiable du projet, des limites de connexions et une surveillance des ressources partagées. Des tables communes constituent plutôt un [modèle pool avec RLS](https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-managed-postgresql/pool.html).

RDS sauvegarde **l’instance entière**. Restaurer une seule base logique cliente demande une procédure complémentaire d’export/restauration ou de récupération intermédiaire. Ne pas promettre de restauration autonome par projet avant son implémentation. [Documentation des sauvegardes](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html).

## Coûts AWS vérifiés

| Poste | Prix de référence |
| --- | ---: |
| RDS PostgreSQL Single-AZ `db.t4g.micro` | $0.016/h, soit $11.68/mois |
| RDS PostgreSQL Single-AZ `db.t4g.small` | $0.033/h, soit $24.09/mois |
| RDS PostgreSQL Single-AZ `db.t4g.medium` | $0.065/h, soit $47.45/mois |
| RDS gp3 Single-AZ / Multi-AZ | $0.12 / $0.24 par GB-mois |
| Sauvegardes RDS excédant l’allocation gratuite | $0.09/GB-mois |
| Fargate Linux x86 | $0.0445/vCPU-h + $0.0049/GB-h |
| Fargate Linux ARM | $0.0356/vCPU-h + $0.00392/GB-h |
| S3 Standard, première tranche | $0.023/GB-mois |
| S3 PUT/COPY/POST/LIST ; GET/autres lectures | $0.005/1 000 ; $0.0004/1 000 |
| Cognito Lite, première tranche payante ; Essentials | $0.0055 ; $0.015 par MAU |
| CloudFront PAYG, sortie Europe, première tranche payante | $0.085/GB |
| CloudFront PAYG, requêtes HTTPS Europe | $0.012/10 000, après gratuité |
| SES Essentials ; à la carte | $0.16 ; $0.10/1 000 e-mails, données en supplément |

Sources : catalogues publics régionaux [RDS](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRDS/current/eu-north-1/index.json), [ECS/Fargate](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonECS/current/eu-north-1/index.json), [S3](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/eu-north-1/index.json), [Cognito](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonCognito/current/eu-north-1/index.json), [CloudFront PAYG](https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/) et [SES](https://aws.amazon.com/ses/pricing/). Publications RDS du 29 octobre et ECS du 19 octobre 2026.

Le [minimum gp3 PostgreSQL est 20 GiB](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html). Ainsi, RDS micro + 20 GiB coûte **$14.08/mois**. Une tâche x86 minimale 0.25 vCPU/0.5 GB coûte **$9.91/mois**. Un déploiement dédié commence donc vers **$23.99/mois**, avant ALB, réseau, IPv4, authentification, fichiers, logs et crédits CPU supplémentaires éventuels. Une offre complète dédiée à $25 n’a pas de marge suffisante.

À titre alternatif, [Lambda Stockholm](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSLambda/current/eu-north-1/index.json) facture $0.0000166667/GB-seconde x86 et $0.20/million d’invocations ; [HTTP API Gateway Stockholm](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonApiGateway/current/eu-north-1/index.json), $1.06/million dans la première tranche. Un million d’appels de 100 ms à 512 MiB donne environ **$2.09**, hors DB, réseau et logs, sans gratuité.

Les gratuités sont mutualisées : [Cognito](https://aws.amazon.com/cognito/pricing/) prévoit 10 000 MAU pour Lite/Essentials selon les conditions du compte, pas par client Grupedia. Les [sauvegardes RDS](https://docs.aws.amazon.com/aws-backup/latest/devguide/rds-backup.html) disposent d’une allocation équivalente au stockage provisionné. CloudFront PAYG inclut 1 TB sortant et 10 millions de requêtes mensuelles partagés ; ne pas les multiplier par projet.

Les [forfaits CloudFront](https://aws.amazon.com/cloudfront/pricing/) peuvent optimiser certains sites, mais [leurs limites](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html) — notamment absence de distributions multitenant, un domaine apex par forfait et plafonds du compte — interdisent de supposer un forfait gratuit indépendant pour chaque client.

## Proposition commerciale Grupedia

Les quotas sont **par espace de travail**, partagés entre ses projets, avec calcul mutualisé. Ce ne sont pas des ressources AWS dédiées.

| Abonnement mensuel | Free : $0 | Pro : $25 | Team : $99 |
| --- | ---: | ---: | ---: |
| Projets | 1 | 1 | 5 |
| Base de données | 0.5 GB | 8 GB | 20 GB |
| Utilisateurs authentifiés actifs/mois | 100 | 1 000 | 5 000 |
| Fichiers | 1 GB | 10 GB | 50 GB |
| Trafic sortant/mois | 1 GB | 25 GB | 100 GB |
| Requêtes API/mois | 10 000 | 1 million | 5 millions |
| Dépassements | Plafonds stricts, aucun supplément | À l’usage | À l’usage |

| Dépassement payant | Prix de vente proposé |
| --- | ---: |
| Base de données | $0.25/GB-mois |
| Authentification | $0.02/MAU supplémentaire/mois |
| Fichiers | $0.05/GB-mois |
| Trafic sortant | $0.15/GB |
| API | $5/million de requêtes supplémentaires |

**$0.05/GB-mois convient à une proposition de stockage de fichiers, pas de base RDS** : le gp3 brut coûte déjà $0.12, avant calcul, sauvegardes et exploitation. Les prix ci-dessus ne sont pas des tarifs AWS.

SSO entreprise, SMS, plugins payants, commissions de paiement et calcul dédié sont exclus. Les e-mails, requêtes de stockage, extensions et protections anti-abus nécessitent des limites explicites avant lancement. Pour SES, choisir le plan : les nouveaux comptes/régions utilisent Essentials par défaut depuis le 21 juillet 2026.

Un MAU est une identité active au cours du mois, pas un compte simplement enregistré ; Cognito compte plusieurs opérations d’identité. La règle commerciale proposée compte une identité une fois par projet et par mois civil, puis additionne ces comptes dans le quota de l’espace. La même personne active sur deux projets compte donc deux fois. Ce compteur commercial doit être rapproché de celui du fournisseur, qui peut appliquer une autre déduplication. Le stockage utilise la moyenne mensuelle, le trafic un volume réel et les requêtes un compteur fiable. Préciser les unités et la conversion GB/GiB avant commercialisation.

**Exemple Pro :** 12 GB DB, 1 500 MAU, 20 GB de fichiers, 30 GB sortants et 1.2 million d’appels donnent **$38.25** : abonnement $25 + DB $1 + auth $10 + fichiers $0.50 + trafic $0.75 + API $1.

## Vérifier l’économie avant lancement

Au plein quota, sans gratuités, les seuls postes DB brute + Cognito Lite + S3 + sortie CloudFront Europe donnent environ **Free $0.72, Pro $8.82 et Team $39.55**. Ce sont des **planchers variables**, pas des coûts complets : manque la quote-part des instances, stockage physique supplémentaire, API, ALB, requêtes, backups, logs, e-mails, réseau, support et frais de paiement. Une instance physique respecte toujours son minimum de stockage ; les données, index et marges de capacité augmentent l’espace nécessaire.

Cognito Essentials ferait passer le seul poste auth Pro à $15 et Team à $75 : choisir Lite explicitement est déterminant. Le nombre de projets gratuits, les uploads, les requêtes et les tâches coûteuses doivent être plafonnés. La rentabilité et les performances ne sont pas garanties par cette estimation : mesurer des scénarios réels et utiliser [AWS Pricing Calculator](https://calculator.aws/) avant engagement.

Avant toute facturation réelle : journal d’usage idempotent, agrégation mensuelle par espace, alertes, plafonds Free, autorisation explicite des dépassements et rapprochement Stripe. **L’interface actuelle reste un estimateur sans facturation.**
