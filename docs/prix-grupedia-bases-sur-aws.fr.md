# Grupedia — coûts AWS et prix de vente proposés

Référence : Stockholm `eu-north-1`, tarifs vérifiés le 1 novembre 2026, USD HT, sans gratuités ni remises. Le prix Grupedia finance aussi calcul mutualisé, capacité inutilisée, sauvegardes, exploitation, frais de paiement et marge. **Coût marginal AWS, facture AWS totale et prix client sont trois valeurs différentes.**

## Grille par type de consommation

| Élément | Référence de coût AWS | Prix de vente proposé Grupedia |
| --- | ---: | ---: |
| Stockage PostgreSQL gp3 Single-AZ | 0,12 $/GB-mois, calcul DB séparé | 0,25 $/GB-mois au-delà du quota |
| Authentification de base Cognito Lite | 0,0055 $/MAU au premier palier payant | 0,02 $/MAU supplémentaire/mois |
| Authentification Cognito Essentials, option distincte | 0,015 $/MAU | 0,03 $/MAU supplémentaire/mois à proposer séparément |
| Fichiers S3 Standard, première tranche | 0,023 $/GB-mois, requêtes séparées | 0,05 $/GB-mois au-delà du quota |
| Transfert CloudFront vers l’Europe, première tranche payante | 0,085 $/GB ; requêtes séparées | 0,15 $/GB au-delà du quota, référence Europe |
| API sur ECS | Part du calcul/ALB et de la capacité réelle ; pas un prix AWS universel par appel | 5 $/million d’appels supplémentaires, à contrôler par mesures de charge |
| API alternative HTTP API Gateway + Lambda | Environ 2,09 $/million pour 512 MiB et 100 ms/appel, hors DB/réseau/logs | Référence de comparaison seulement, pas un coût mesuré du backend ECS |
| Lectures de fichiers S3 GET | 0,0004 $/1 000 requêtes | 0,001 $/1 000 lectures, proposition d’option |
| Écritures S3 PUT/COPY/POST/LIST | 0,005 $/1 000 requêtes | 0,01 $/1 000 opérations, proposition d’option |
| E-mails SES Essentials, premier palier | 0,16 $/1 000 e-mails, données/options séparées | 0,40 $/1 000 e-mails, proposition d’option |

Les appels API et les opérations S3 sont des compteurs distincts. Une API qui autorise un upload puis une écriture S3 consomme deux services ; le contrat commercial doit le rendre explicite sans présenter deux sorties réseau pour une seule livraison. Les nombres de requêtes et d’e-mails sont proratisés, pas facturés en blocs complets de 1 000.

Les propositions de prix fichiers/e-mails complètent la recherche. **Le simulateur actuel du site calcule cinq compteurs de base seulement** et exclut encore ces options ; aucun prélèvement n’est activé. Ne pas présenter les nouveaux prix d’options comme un système de facturation déjà implémenté.

## Abonnements et calcul mutualisé

Les offres proposées restent **Free 0 $, Pro 25 $/mois et Team 99 $/mois**, avec les quotas partagés décrits dans le [modèle tarifaire](aws-architecture-and-pricing.fr.md#proposition-commerciale-grupedia). Pro inclut notamment 8 GB de base, 1 000 MAU, 10 GB de fichiers, 25 GB sortants et 1 million d’appels API. Le tarif d’usage s’applique seulement à l’excédent.

Un abonnement ne donne pas automatiquement une instance RDS dédiée, une tâche ECS permanente ou un accès SQL administrateur sans limite. Les charges coûteuses, ressources dédiées, SSR et plugins serveur nécessitent un dimensionnement et une offre propre.

Le coût marginal de stockage ne suffit pas à garantir une marge. Un forfait à 25 $ ne peut pas absorber sans limite les connexions DB, processeur, fichiers gratuits, trafic, tentatives d’authentification, requêtes et support. Utiliser les [budgets d’infrastructure](architecture-aws-complete.fr.md#8-deux-budgets-explicites-pour-le-socle) et mesurer l’usage avant de confirmer une offre commerciale.

## Postes qui n’ont pas un prix unique raisonnable

- **SMS** : pays de destination, type de message, opérateur et exigences d’envoi ; chiffrer avant activation.
- **SSO entreprise et fonctions d’authentification avancées** : offre et compteurs distincts ; ne pas les inclure silencieusement dans Lite.
- **Paiements Stripe** : frais du pays, du moyen de paiement, de Connect et du modèle commercial ; Stripe est externe à AWS.
- **Plugins payants, IA, temps réel et calcul tiers** : contrat, unités et limites spécifiques.
- **Domaines clients** : DNS, certificats et frais CloudFront SaaS Manager selon le modèle choisi.

Les taxes et variations de région ne sont pas intégrées aux montants. Les 10 000 MAU gratuits AWS éventuels ne sont pas garantis indépendamment pour chaque projet Grupedia.

## Sources officielles

Catalogues régionaux : [RDS](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRDS/current/eu-north-1/index.json), [Cognito](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonCognito/current/eu-north-1/index.json), [S3](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/eu-north-1/index.json), [Lambda](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSLambda/current/eu-north-1/index.json) et [API Gateway](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonApiGateway/current/eu-north-1/index.json). [CloudFront PAYG](https://aws.amazon.com/cloudfront/pricing/pay-as-you-go/), [Cognito](https://aws.amazon.com/cognito/pricing/) et [SES](https://aws.amazon.com/ses/pricing/) expliquent paliers, gratuités et postes séparés. Ces coûts sont des références fournisseur ; les prix de vente sont des recommandations Grupedia.
