# Contrat de développement

## 1. Objectif

Le projet doit être développé de manière progressive et contrôlée.

Le code doit refléter les règles métier validées sans inventer de procédures administratives.

## 2. Séparation des responsabilités

### Métier

Définit ce que l'organisation doit faire.

### Application

Définit comment l'utilisateur utilise le système.

### Technique

Définit comment le logiciel réalise les fonctionnalités.

Ces trois niveaux ne doivent pas être confondus.

## 3. Règle de non-invention

Lorsqu'une information métier manque :

- ne pas inventer ;
- documenter ;
- demander validation si nécessaire.

Pour ce projet universitaire, certaines conventions techniques peuvent être choisies librement lorsqu'elles n'ont pas d'impact sur une règle métier.

## 4. Qualité

Le code doit être :

- lisible ;
- typé ;
- modulaire ;
- testé ;
- documenté lorsque nécessaire.

## 5. Sécurité

Les autorisations doivent être vérifiées côté serveur.

Le frontend ne constitue jamais une frontière de sécurité.

## 6. Base de données

La base doit garantir l'intégrité des données.

Utiliser :

- clés étrangères ;
- contraintes ;
- indexes ;
- enums lorsque pertinents ;
- transactions lorsque nécessaires.

## 7. Workflow

Les transitions doivent être centralisées.

Chaque transition doit vérifier :

- statut actuel ;
- utilisateur ;
- rôle ;
- périmètre ;
- conditions métier.

## 8. Documents

Les documents sont des objets métier.

Ils doivent être traçables.

## 9. Audit

Les décisions importantes doivent être conservées.

## 10. Évolution

Toute nouvelle décision importante doit être ajoutée à :

`docs/decisions-techniques.md`