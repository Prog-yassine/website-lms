## Stockage, événements, e-mails et facturation

_Recherche vérifiée le 1 novembre 2026. Les choix ci-dessous sont des recommandations d’architecture pour Grupedia, pas des fonctionnalités déjà livrées. Référence régionale : Stockholm `eu-north-1` ; les tarifs globaux ou externes sont signalés séparément._

### Services à prévoir et ordre d’adoption

| Besoin | Choix initial | À ajouter lorsque le besoin existe |
| --- | --- | --- |
| Fichiers des applications | S3 privé, politiques IAM, URL signées | Access Points, Storage Lens/Inventory, réplication selon engagements |
| Traitements différés | SQS Standard, worker ECS ou Lambda, DLQ | FIFO pour les opérations nécessitant un ordre par groupe |
| Routage d’événements | Appels directs vers SQS au MVP | EventBridge pour plusieurs consommateurs et intégrations partenaires |
| E-mails transactionnels | SES, domaine vérifié, DKIM, suivi des rebonds | Identités/domaines clients, isolation de réputation et options de délivrabilité |
| Compteur et factures | Journal d’usage applicatif, PostgreSQL, Stripe pour les abonnements | DynamoDB à forte ingestion ; moteur d’usage Stripe selon besoin/compatibilité |
| Temps réel | Pas nécessaire pour lancer un catalogue de produits | AppSync Events ou API Gateway WebSocket, avec autorisation par canal |

### S3 : fichiers privés et séparation des projets

S3 stocke des objets, pas les lignes PostgreSQL ni un système de fichiers POSIX. Pour démarrer, je recommande des buckets distincts pour les assets publics déployés, les fichiers privés des projets et les journaux. Dans le bucket privé, des clés structurées `workspace/project/object` donnent une organisation simple ; **le préfixe seul n’est pas une frontière d’autorisation**. L’API doit déduire le projet depuis l’identité validée et appliquer la politique correspondante. Les objets S3 sont privés par défaut ; les politiques de bucket, IAM et Access Points définissent les accès. [Contrôle d’accès S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-management.html).

Un bucket par client simplifie certaines politiques, mais multiplie configurations et quotas. Le quota initial est actuellement de **10 000 buckets généralistes par compte**, ajustable. Les Access Points permettent des règles distinctes sur un bucket partagé ; le quota régional initial est **10 000 access points par compte**, ajustable. Ils deviennent intéressants quand les politiques et identités dépassent la simplicité d’un petit MVP. [Quotas des buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/BucketRestrictions.html), [création d’Access Points](https://docs.aws.amazon.com/AmazonS3/latest/userguide/creating-access-points.html).

Pour les uploads, l’API vérifie droit, taille et quota puis émet une URL pré-signée limitée à un objet et à une courte durée. Une URL signée est un droit transmissible : quiconque la possède peut l’utiliser pendant sa validité ; sa durée peut aussi être raccourcie par l’expiration des identifiants qui l’ont signée. Pour les téléchargements en cache, CloudFront peut émettre des URL ou cookies signés après contrôle applicatif. Ces mécanismes n’exonèrent pas Grupedia de vérifier à qui appartient chaque fichier. [URL pré-signées S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html), [URL signées CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-urls.html).

Le coût total comprend stockage, lectures/écritures, transfert, anciennes versions et réplication éventuelle. En mode versionné, « supprimer » peut seulement ajouter un marqueur : les versions précédentes restent stockées. Définir des règles pour les versions non courantes, les marqueurs expirés et les uploads multiparties abandonnés. Ne pas considérer Lifecycle comme une suppression immédiate commandée par l’utilisateur. [Éléments de configuration Lifecycle](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html), [coûts des multiparties incomplètes](https://repost.aws/knowledge-center/s3-incomplete-multipart-uploads).

### SQS et EventBridge : ne pas perdre ni traiter deux fois une opération

Une file **SQS Standard** convient aux emails, imports, miniatures, événements de paiement et tâches de nettoyage. La livraison est « au moins une fois » : un message peut réapparaître. Le worker doit rendre l’opération idempotente, régler la visibilité selon sa durée de traitement et supprimer le message après succès durable. Une **DLQ** conserve les échecs pour examen et reprise ; elle nécessite une alarme et une procédure, pas seulement sa création. [Livraison SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html), [DLQ](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html).

FIFO sert lorsqu’un groupe d’opérations doit garder son ordre, par exemple un flux de mutations par projet. La déduplication d’envoi couvre une fenêtre de cinq minutes : elle ne garantit pas, à elle seule, une unique écriture en base ou un unique prélèvement. Les reprises applicatives demandent toujours une clé métier persistante. Les notifications S3 directes ne ciblent pas les files FIFO ; un routage adapté est nécessaire. [Termes et limites FIFO](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-key-terms.html).

**EventBridge** est utile pour router un événement vers plusieurs services, filtrer par type ou recevoir une intégration partenaire. Il n’est pas obligatoire pour mettre une tâche dans SQS. Pour les cibles de règles EventBridge classiques, la politique par défaut réessaie pendant 24 heures, jusqu’à 185 tentatives ; configurer une DLQ pour les échecs. Ces valeurs ne doivent pas être généralisées à tous les nouveaux modes de bus et de livraison. [Politique de reprise des règles](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-retry-policy.html).

### Paiements : deux circuits distincts

**Facturer les clients de Grupedia** pour leur abonnement et leurs dépassements relève de Stripe Subscriptions/Billing et d’un moteur de tarification à l’usage. **Permettre à ces clients de vendre des produits à leurs propres acheteurs** est un autre problème : Stripe Connect modélise les comptes marchands et les flux entre parties. Connect n’est pas nécessaire pour vendre uniquement les abonnements de Grupedia. Le pays de l’entreprise, les pays des marchands et les capacités souhaitées doivent être compatibles avec Stripe. [Guide SaaS Connect](https://docs.stripe.com/connect/saas), [disponibilité Stripe](https://stripe.com/global).

La documentation de novembre 2026 recommande **Metronome** comme point de départ des nouvelles intégrations d’usage ; **Billing Meters** reste pris en charge et possède une compatibilité plus complète avec certains produits, dont Connect et Checkout. Il faut donc choisir le moteur après le schéma commercial, plutôt que supposer que l’ancienne API de compteurs est automatiquement le meilleur choix. [Choix du moteur d’usage](https://docs.stripe.com/billing/subscriptions/usage-based).

Le webhook HTTPS doit vérifier la signature sur le corps brut, enregistrer durablement l’événement, répondre rapidement puis déléguer le travail à SQS. Stripe peut envoyer des doublons et ne garantit pas l’ordre ; dédupliquer par identifiant d’événement et vérifier l’état métier avant une action irréversible. L’intégration EventBridge proposée par Stripe est une alternative de réception, pas une raison de doubler le traitement du même événement. [Webhooks Stripe](https://docs.stripe.com/webhooks).

### Compteurs et rapprochement de facture

Le journal applicatif devrait enregistrer `event_id`, espace, projet, métrique, quantité, unité, instant, période et source. PostgreSQL suffit au début avec contrainte d’unicité et transactions ; une table d’outbox peut assurer la reprise de publication. Archiver les événements bruts dans S3 facilite les rapprochements. DynamoDB n’est à ajouter que si le débit, les clés ou les opérations conditionnelles le justifient.

Les compteurs ne sont pas tous des additions : stockage moyen en octets-heures, utilisateurs distincts selon une règle explicite, requêtes cumulées et octets sortants réels. Éviter de compter à la fois le téléchargement CloudFront et la lecture d’origine comme deux sorties client. Distinguer annulations, retries et ajustements. Les logs S3 et CloudFront sont livrés au mieux : ils peuvent être retardés ou incomplets et ne constituent pas seuls un registre exact de facturation. [Logs S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html), [logs CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html).

L’envoi au moteur de facturation doit être dédupliqué et rapproché avant finalisation. Pour Billing Meters, Stripe traite les événements de façon asynchrone ; une acceptation tardive ne garantit pas l’intégration à une facture déjà finalisée. Garder un état « reçu / agrégé / transmis / rapproché », avec corrections traçables. [Enregistrement d’usage Stripe](https://docs.stripe.com/billing/subscriptions/usage-based/recording-usage-api).

### SES et temps réel

SES convient aux confirmations, invitations et réinitialisations. Une nouvelle région démarre en sandbox : destinataires vérifiés seulement, **200 messages par 24 heures et 1 message/seconde**. La sortie de sandbox est une demande examinée ; les identités expéditrices restent à vérifier en production. Mettre DKIM, suivre rebonds/plaintes et séparer les usages de plateforme de ceux des applications clientes. [Accès production](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html), [DKIM](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim.html).

Depuis juillet 2026, les nouveaux comptes/régions éligibles à cette règle démarrent par défaut en **Essentials à $0.16/1 000 e-mails** au premier palier ; l’option à la carte est **$0.10/1 000**, données et options séparées. SMS et e-mails ne deviennent pas gratuits parce que Cognito gère la connexion. [Tarification SES](https://aws.amazon.com/ses/pricing/).

Le temps réel est **optionnel au MVP**. AppSync Events gère le publish/subscribe WebSocket et plusieurs modes d’authentification ; il faut encore autoriser chaque canal et publier les changements pertinents depuis l’application. RDS ne devient pas automatiquement « Supabase Realtime ». API Gateway WebSocket permet une autre architecture ; ElastiCache sert plutôt aux caches, sessions et fan-out interne qu’à remplacer tout le service client. [AppSync Events](https://docs.aws.amazon.com/appsync/latest/eventapi/), [endpoints et quotas](https://docs.aws.amazon.com/general/latest/gr/appsync.html).

Les tarifs publics AppSync Events sont **$1/million d’opérations et $0.08/million de minutes de connexion**, transfert séparé ; messages entrants, sortants et certaines opérations WebSocket comptent, par tranches de payload de 5 KB. Un message diffusé à mille abonnés génère beaucoup plus d’usage qu’un unique appel d’API. Ce poste doit disposer de quotas propres avant de l’inclure dans les abonnements. [Prix AppSync](https://aws.amazon.com/appsync/pricing/).
