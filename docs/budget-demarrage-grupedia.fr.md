# Grupedia — trésorerie nécessaire pour démarrer

Montants en **USD hors taxes**. Prix AWS de référence vérifiés le 1 novembre 2026, région Stockholm `eu-north-1`, 730 heures/mois. Il s’agit d’un **budget de décision**, pas d’un devis, d’une facture AWS ou d’une promesse de délai. Aucun revenu, crédit gratuit ou remise AWS n’est supposé.

## Réponse pratique

Si le fondateur développe lui-même, prévoir environ **1 700 $ pour six mois de pilote limité**, ou **3 800 $ pour six mois de bêta publique**. Ces montants n’incluent pas sa rémunération. Avec un développement sous-traité, l’exemple explicite de **300 heures à 50 $/heure** porte le budget de bêta autour de **22 000 $**, sans constituer un devis de marché ni une estimation suffisante pour reproduire tout Supabase.

Ce sont des réserves de trésorerie : AWS ne demande pas de prépayer les six mois. Le fondateur doit néanmoins pouvoir financer les mois sans recettes.

## Périmètre du MVP

Le modèle vise un produit réduit : création de projets, API CRUD PostgreSQL autorisée, authentification, stockage de fichiers, un template de catalogue de produits et publication statique. La marketplace ouverte, l’éditeur visuel généraliste, le SSR, le temps réel, l’exécution de plugins serveur tiers et une facturation commerciale entièrement automatisée demandent des lots et budgets distincts.

L’aperçu actuel valide surtout la présentation. Il ne signifie pas que ces services backend sont déjà développés, déployés ou exploités.

## Deux scénarios développés par le fondateur

| Poste | Pilote limité | Bêta publique |
| --- | ---: | ---: |
| Socle AWS mensuel modélisé | 117,45 $ | 286,82 $ |
| Réserve mensuelle pour usage variable | 50,00 $ | 100,00 $ |
| Réserve mensuelle pour outils | 30,00 $ | 50,00 $ |
| **Trésorerie mensuelle prévue** | **197,45 $** | **436,82 $** |
| Enveloppe initiale : domaine, licences et petits frais de lancement | 200,00 $ | 500,00 $ |
| Six mois + enveloppe initiale | 1 384,70 $ | 3 120,92 $ |
| Réserve supplémentaire d’imprévus : 20 % | 276,94 $ | 624,18 $ |
| **Besoin calculé sur six mois** | **1 661,64 $** | **3 745,10 $** |
| **Budget arrondi conseillé** | **1 700 $** | **3 800 $** |

Formules :

- Pilote : `[200 + 6 × (117,45 + 50 + 30)] × 1,20 = 1 661,64 $`.
- Bêta : `[500 + 6 × (286,82 + 100 + 50)] × 1,20 = 3 745,10 $`.

Les [scénarios de trésorerie au format CSV](aws-research/06-budget-demarrage.csv) exposent les mêmes hypothèses et résultats.

Les réserves de 50/100 $, les outils, les enveloppes initiales et les 20 % sont **des hypothèses choisies**, pas des tarifs AWS ni des dépenses obligatoires. Ils doivent être ajustés aux outils déjà payés, au domaine choisi, aux licences et au nombre de testeurs. Les réserves d’usage ne sont pas des plafonds imposés au fournisseur et peuvent être dépassées.

Pour ne financer que le départ et le premier mois, les mêmes hypothèses donnent **397,45 $ en pilote** ou **936,82 $ en bêta**, avant les 20 % d’imprévus et sans sous-traitance. Ce montant plus faible ne finance pas les mois suivants.

## Ce que recouvre le socle AWS

Le pilote utilise une API ECS Fargate, RDS PostgreSQL Single-AZ et un réseau privé avec ALB et NAT. La bêta utilise deux tâches API, RDS Multi-AZ et deux NAT. Les détails, taux et hypothèses d’IPv4/LCU sont dans le [rapport d’architecture](architecture-aws-complete.fr.md#8-deux-budgets-explicites-pour-le-socle) et le [CSV reproductible](aws-research/05-hypotheses-budget.csv).

Ces configurations sont des exemples comptables, pas des dimensions garanties pour un nombre de clients. La réserve d’usage finance les compléments non fixés : Cognito, e-mails, fichiers, requêtes, transfert, traitement NAT, images/builds, WAF et autres consommations. Les frais de paiement et le support doivent également être suivis. Des crédits CPU RDS T4g peuvent s’ajouter si le processeur dépasse durablement sa référence.

Un prototype plus simple peut coûter moins, notamment en réduisant les composants ou avec une autre architecture. Il ne faut pas présenter cette économie comme une équivalence automatique de disponibilité, d’isolation ou de capacité. Les offres gratuites AWS n’ont pas été multipliées par projet.

## Si le développement est confié à quelqu’un

Le développement est distinct de l’hébergement. Voici des **hypothèses de calcul**, pas des prix de marché vérifiés :

| Travail acheté | Développement | Avec six mois de bêta et 20 % d’imprévus sur l’ensemble |
| --- | ---: | ---: |
| 150 h × 30 $/h, périmètre très réduit | 4 500 $ | 9 145,10 $, soit environ 9 200 $ |
| 300 h × 50 $/h, exemple de travail MVP | 15 000 $ | 21 745,10 $, soit environ 22 000 $ |
| 600 h × 50 $/h, périmètre plus conséquent | 30 000 $ | 39 745,10 $, soit environ 40 000 $ |

Calcul commun : `(coût du développement + 3 120,92 $) × 1,20`. Les heures ne garantissent pas la livraison des fonctions listées. Il faut obtenir un devis avec livrables, tests d’isolation, restauration, documentation, transfert du code et maintenance. Un équivalent complet de Supabase ne peut pas être budgété en assimilant un simple site vitrine au produit opérationnel.

## Dépenses à ajouter selon la situation

Le budget suppose déjà disponibles ordinateur et connexion Internet. Il exclut rémunération et dépenses personnelles du fondateur, constitution de société, comptabilité/fiscalité, publicité/acquisition, audit de sécurité externe, support sous-traité et garanties de service particulières. Aucun montant légal ou fiscal n’est inventé : il dépend du pays et du statut de l’entreprise.

Des SMS, de l’IA, des uploads lourds, du streaming, beaucoup d’utilisateurs gratuits ou des fonctions serveur tiers peuvent modifier fortement l’usage. Prévoir des quotas et des alertes ; un budget AWS n’arrête pas instantanément une facture.

## Relier le budget aux revenus

Le forfait Pro à 25 $ n’est pas une marge de 25 $. Il finance l’usage de ce client, une part de l’infrastructure, les frais de paiement et les opérations. La formule de seuil d’exploitation est :

`clients payants ≈ coûts fixes / (prix HT moyen − coût variable moyen par client − frais variables)`.

Les coûts variables doivent être mesurés dans l’architecture retenue. Ne pas ajouter un coût Lambda au calcul ECS pour le même traitement, ni compter deux fois le stockage déjà provisionné. La réserve de trésorerie ci-dessus reste volontairement calculée **sans recettes supposées**.

Le [tableau de coûts AWS et prix de vente proposés](prix-grupedia-bases-sur-aws.fr.md) explique la grille commerciale ; les services AWS mutualisés ne se revendent pas tous comme des ressources dédiées.

## Sources

Les taux régionaux du socle proviennent des catalogues officiels [RDS](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRDS/current/eu-north-1/index.json), [ECS](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonECS/current/eu-north-1/index.json), [ALB](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSELB/current/eu-north-1/index.json), [VPC/IPv4](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonVPC/current/eu-north-1/index.json) et [NAT](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/eu-north-1/index.csv). Le supplément de CPU est décrit sur la [page RDS PostgreSQL](https://aws.amazon.com/rds/postgresql/pricing/).

Les postes restant variables et limites sont documentés dans les [quatre dossiers techniques](architecture-aws-complete.fr.md#10-dossiers-techniques-et-sources). Les réserves de lancement et le travail humain sont des hypothèses propres à ce budget, sans prétendre être des cotations AWS ou des devis de prestataires.
