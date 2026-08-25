<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DGRAD Controle — Instructions de développement

## 1. Objectif

Cette application est destinée à gérer le processus de contrôle non fiscal.

Elle couvre notamment :

- assujettis ;
- recoupement ;
- analyse ;
- demandes de contrôle ;
- validations ;
- contrôle sur place ;
- contrôle sur pièces ;
- équipes ;
- agents ;
- résultats ;
- procès-verbaux ;
- observations ;
- rapports ;
- documents ;
- audit ;
- statistiques.

---

## 2. Source de vérité

Les documents métier sont situés dans :

- `docs/processus-metier.md`
- `docs/regles-metier.md`
- `docs/workflow-missions.md`
- `docs/modele-donnees.md`
- `docs/roles-permissions.md`
- `docs/securite.md`

Les questions métier encore ouvertes sont dans :

- `docs/questions-metier.md`

Les décisions techniques sont dans :

- `docs/decisions-techniques.md`

Le contrat de développement est dans :

- `docs/development-contract.md`

Ne jamais inventer une règle métier officielle.

Lorsqu'une information n'est pas définie :

1. identifier le manque ;
2. consulter `docs/questions-metier.md` ;
3. si une décision existe déjà, l'appliquer ;
4. sinon signaler le point ;
5. ne pas créer silencieusement une nouvelle règle métier.

Une convention purement technique qui n'affecte pas le métier peut être choisie par le développeur et documentée dans `docs/decisions-techniques.md`.

---

## 3. Stack

Le projet utilise :

- Next.js ;
- TypeScript ;
- Supabase ;
- PostgreSQL ;
- Supabase Auth ;
- Supabase Storage ;
- Tailwind CSS ;
- Zod ;
- tests automatisés.

La version exacte de Next.js installée dans le projet fait foi.

Avant d'utiliser une API Next.js susceptible d'avoir changé :

1. consulter la documentation locale ;
2. vérifier le code existant ;
3. respecter les recommandations de la version installée.

La documentation locale de Next.js est disponible dans :

`node_modules/next/dist/docs/`

---

## 4. Principes Next.js

- Server Components par défaut.
- Client Components uniquement lorsque nécessaire.
- Les opérations métier sensibles sont exécutées côté serveur.
- Les Server Actions doivent être considérées comme des points d'entrée HTTP.
- Chaque mutation vérifie l'authentification.
- Chaque mutation vérifie l'autorisation.
- Chaque mutation valide les données côté serveur.
- Ne jamais faire confiance à une vérification effectuée uniquement dans l'interface.
- Ne pas exposer inutilement les données sensibles au navigateur.

---

## 5. Architecture

Séparer clairement :

- interface ;
- composants ;
- logique métier ;
- validations ;
- accès aux données ;
- authentification ;
- autorisation ;
- stockage ;
- audit ;
- workflows.

Ne pas mettre toute la logique métier dans les composants React.

Les opérations sensibles doivent passer par une couche serveur appropriée.

---

## 6. Accès aux données

L'accès aux données métier doit être centralisé autant que raisonnable.

Privilégier une organisation permettant de séparer :

- validation ;
- autorisation ;
- logique métier ;
- accès PostgreSQL/Supabase.

Ne pas disperser les règles métier dans plusieurs composants d'interface.

Toute lecture de donnée sensible doit vérifier le périmètre de l'utilisateur.

---

## 7. Base de données

PostgreSQL est la source de vérité des données métier.

Toute modification de schéma doit être réalisée avec une migration versionnée.

Ne pas modifier manuellement le schéma sans migration correspondante.

Avant toute migration, vérifier :

- `docs/modele-donnees.md`
- `docs/roles-permissions.md`
- `docs/workflow-missions.md`
- `docs/securite.md`
- `docs/questions-metier.md`

Les migrations doivent préserver :

- intégrité référentielle ;
- contraintes ;
- unicités ;
- cohérence des statuts ;
- cohérence des montants ;
- règles de suppression.

---

## 8. Sécurité

Les contrôles de sécurité doivent être effectués à plusieurs niveaux :

- serveur ;
- logique métier ;
- PostgreSQL ;
- RLS ;
- Supabase Storage.

Ne jamais exposer :

- secrets ;
- Service Role Key ;
- tokens privés ;
- credentials.

Empêcher les accès horizontaux.

Un utilisateur ne doit jamais obtenir une ressource simplement en modifiant son identifiant.

---

## 9. Administration technique

Le rôle `ADMIN` est technique.

Il peut notamment :

- créer les comptes ;
- modifier les comptes ;
- désactiver les comptes ;
- attribuer les rôles ;
- gérer certains paramètres ;
- gérer certains référentiels.

Le rôle `ADMIN` ne donne jamais automatiquement le pouvoir de :

- approuver une mission au nom du DG ;
- rejeter une mission au nom du DG ;
- approuver un contrôle au nom du Chef de section ;
- rejeter un contrôle au nom du Chef de section ;
- modifier une décision métier ;
- contourner le workflow.

La séparation entre administration technique et pouvoir métier doit être appliquée techniquement.

---

## 10. Organisation

L'organisation du Bureau de contrôle et recoupement comprend :

### Division Recoupement

- Bureau Analyse et Recoupement ;
- Bureau Documentation.

### Division Contrôle

- Bureau Contrôle Sol ;
- Bureau Contrôle Sous-sol ;
- Bureau Recettes judiciaires et de participation ;
- Bureau Contrôle Administratif 1 ;
- Bureau Contrôle Administratif 2 ;
- Bureau Contrôle Administratif 3.

Chaque bureau de contrôle possède des secteurs d'activité sous sa responsabilité.

Un secteur appartient à un bureau de contrôle compétent.

Le périmètre organisationnel doit être respecté dans les accès aux données.

---

## 11. Contrôle sur place

Le contrôle sur place suit le parcours :

Bureau de contrôle

→ Chef de Division Contrôle

→ Directeur des contrôles et recoupement

→ Directeur Général

Le Directeur Général peut :

- approuver ;
- rejeter.

Après approbation DG :

- le système génère automatiquement l'ordre de mission ;
- les équipes sont affectées ;
- les agents peuvent accéder à leur mission.

Une mission sur place peut contenir :

- plusieurs entreprises ;
- plusieurs équipes ;
- un chef d'équipe par équipe ;
- plusieurs agents de terrain.

Chaque équipe est associée aux entreprises qu'elle doit contrôler.

---

## 12. Contrôle sur pièces

Le contrôle sur pièces est une mission fonctionnelle avec un workflow spécifique.

Il :

- ne nécessite pas de déplacement ;
- ne nécessite pas d'ordre de mission ;
- ne nécessite pas d'équipe de terrain ;
- est initié par le Bureau de contrôle compétent ;
- est soumis au Chef de section.

Après approbation du Chef de section :

- le système génère automatiquement une autorisation de contrôle sur pièces ;
- le contrôleur est désigné ;
- le contrôle peut commencer.

---

## 13. Interface chef d'équipe

Le chef d'équipe doit disposer d'une interface permettant notamment :

- consulter sa mission ;
- consulter les entreprises affectées ;
- consulter les membres de son équipe ;
- consulter l'ordre de mission ;
- saisir les informations du contrôle ;
- saisir les observations ;
- saisir les irrégularités ;
- enregistrer les montants ;
- préparer le procès-verbal ;
- joindre des documents.

Le chef d'équipe ne peut pas :

- approuver une mission ;
- rejeter une mission ;
- modifier une décision du DG ;
- modifier une décision du Chef de section.

---

## 14. Workflow

Les transitions de statut sont définies dans :

`docs/workflow-missions.md`

Les transitions doivent être contrôlées côté serveur.

Une transition doit vérifier :

- statut actuel ;
- utilisateur authentifié ;
- rôle ;
- périmètre ;
- affectation ;
- conditions métier.

Une transition invalide doit être refusée.

Le frontend ne doit jamais pouvoir forcer un statut.

Les deux workflows doivent rester distincts :

### SUR_PLACE

Utilise notamment :

- Chef de Division Contrôle ;
- Directeur des contrôles et recoupement ;
- Directeur Général ;
- ordre de mission ;
- équipes ;
- agents de terrain.

### SUR_PIECES

Utilise notamment :

- Bureau de contrôle ;
- Chef de section ;
- autorisation de contrôle sur pièces ;
- contrôleur désigné.

---

## 15. Observations

Une feuille d'observations n'est pas créée automatiquement pour chaque contrôle.

Elle est créée uniquement lorsqu'une irrégularité est constatée.

Donc :

`irrégularité = oui`

→ feuille d'observations possible.

`irrégularité = non`

→ pas de feuille d'observations.

---

## 16. Documents

Les documents métier importants doivent être stockés avec :

- type ;
- nom ;
- version ;
- auteur ;
- date ;
- objet associé ;
- emplacement de stockage.

Les documents doivent être stockés dans un espace privé.

Les téléchargements doivent être soumis à une vérification d'autorisation.

Utiliser des URLs signées ou un mécanisme équivalent lorsque nécessaire.

Les documents critiques ne doivent pas être supprimés physiquement sans règle explicite.

---

## 17. Finances

Les montants doivent être saisis avec une devise.

Les devises initialement supportées sont :

- CDF ;
- USD.

La devise doit être explicitement enregistrée avec chaque montant financier concerné.

Ne jamais utiliser des calculs financiers flottants non contrôlés.

Les modifications importantes de montants doivent être auditées.

---

## 18. Audit

Les opérations importantes doivent être enregistrées dans l'audit.

Exemples :

- création ;
- modification ;
- soumission ;
- transmission ;
- approbation ;
- rejet ;
- affectation ;
- changement de statut ;
- génération de document ;
- création de PV ;
- clôture ;
- modification d'un montant ;
- modification d'un résultat ;
- administration d'un compte.

Les logs d'audit doivent être protégés contre les modifications ordinaires.

---

## 19. Tests

Les fonctionnalités critiques doivent être testées.

Priorité :

1. authentification ;
2. permissions ;
3. RLS ;
4. workflow ;
5. accès horizontal ;
6. calculs financiers ;
7. documents ;
8. audit.

Les tests de permissions doivent notamment vérifier qu'un utilisateur ne peut pas :

- accéder aux données d'un autre périmètre ;
- modifier une ressource non autorisée ;
- approuver à la place d'un autre rôle ;
- contourner une transition ;
- télécharger un document non autorisé.

---

## 20. Méthode de travail

Pour chaque tâche :

1. lire les documents concernés ;
2. inspecter le code existant ;
3. inspecter la documentation locale de Next.js si nécessaire ;
4. identifier les règles métier concernées ;
5. vérifier les questions métier ouvertes ;
6. proposer un plan court ;
7. implémenter uniquement le périmètre demandé ;
8. tester ;
9. vérifier sécurité et permissions ;
10. vérifier les régressions ;
11. résumer les modifications.

Ne pas faire de refonte inutile.

Ne pas modifier plusieurs modules sans nécessité.

---

## 21. Avant toute migration

Avant de créer une migration PostgreSQL :

1. vérifier `docs/modele-donnees.md` ;
2. vérifier `docs/roles-permissions.md` ;
3. vérifier `docs/workflow-missions.md` ;
4. vérifier `docs/securite.md` ;
5. vérifier `docs/regles-metier.md` ;
6. vérifier `docs/questions-metier.md`.

La migration doit ensuite être testée avant d'être considérée comme terminée.

---

## 22. Avant toute fonctionnalité métier

Avant d'implémenter une fonctionnalité métier :

1. identifier le rôle utilisateur concerné ;
2. identifier le périmètre organisationnel ;
3. identifier les données concernées ;
4. identifier le workflow concerné ;
5. identifier les permissions ;
6. identifier les règles d'audit ;
7. identifier les documents éventuels ;
8. vérifier les questions métier ouvertes.

Si une règle métier nécessaire n'est pas définie :

- ne pas l'inventer ;
- signaler le manque ;
- consulter `docs/questions-metier.md`.

---

## 23. Règles de code

Le code doit être :

- lisible ;
- typé ;
- modulaire ;
- testable ;
- maintenable.

Éviter :

- duplication inutile ;
- logique métier dans les composants UI ;
- accès directs aux données sans contrôle ;
- `any` injustifiés ;
- fonctions excessivement longues ;
- dépendances inutiles.

Utiliser TypeScript strictement.

---

## 24. Validation

Les données provenant du navigateur doivent être considérées comme non fiables.

Utiliser Zod ou une solution équivalente pour valider les entrées côté serveur.

Une validation frontend ne remplace jamais une validation serveur.

---

## 25. RLS

Les tables contenant des données métier sensibles doivent être étudiées pour déterminer les politiques RLS nécessaires.

Les politiques doivent empêcher les accès non autorisés selon :

- utilisateur ;
- rôle ;
- bureau ;
- division ;
- secteur ;
- mission ;
- équipe ;
- affectation.

RLS ne remplace pas les contrôles métier côté serveur.

---

## 26. Stockage documentaire

Supabase Storage est utilisé pour les documents.

Les buckets contenant des documents métier doivent être privés.

Le chemin de stockage ne doit pas être considéré comme une permission.

Avant de générer une URL de téléchargement, vérifier l'autorisation.

Les métadonnées du document doivent être conservées dans PostgreSQL.

---

## 27. Pas de contournement métier

Aucune fonctionnalité technique ne doit permettre de contourner une décision métier.

En particulier :

- l'administrateur technique ne contourne pas le DG ;
- l'administrateur technique ne contourne pas le Chef de section ;
- une modification directe de statut n'est pas autorisée ;
- une modification directe de données sensibles doit être contrôlée ;
- les opérations critiques doivent passer par la logique métier prévue.

---

## 28. Gestion des questions ouvertes

Si Codex rencontre une question présente dans :

`docs/questions-metier.md`

et que cette question est nécessaire pour continuer :

1. ne pas inventer une réponse ;
2. signaler précisément la question ;
3. proposer les options techniques uniquement si elles n'impliquent pas de décision métier ;
4. attendre une décision lorsque nécessaire.

Une question métier ouverte ne doit pas être transformée silencieusement en règle dans le code.

---

## 29. Décisions techniques

Les décisions purement techniques doivent être documentées dans :

`docs/decisions-techniques.md`

Exemples :

- choix d'une librairie ;
- organisation d'un service ;
- stratégie de cache ;
- organisation des tests ;
- convention de nommage ;
- choix d'une méthode technique de génération documentaire.

Une décision technique ne doit pas modifier une règle métier sans validation.

---

## 30. Principe général

Construire une application :

- fidèle au processus ;
- sécurisée ;
- traçable ;
- maintenable ;
- testable ;
- évolutive.

La simplicité est privilégiée lorsque cela ne compromet pas :

- la sécurité ;
- l'intégrité des données ;
- les permissions ;
- le workflow ;
- les règles métier.

Ne pas sur-ingénieriser le projet.

Le projet est universitaire : les solutions doivent être suffisamment robustes pour démontrer les bonnes pratiques sans introduire inutilement des mécanismes industriels disproportionnés.