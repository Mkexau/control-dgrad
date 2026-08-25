# Sécurité

## 1. Objectif

La sécurité doit être appliquée à plusieurs niveaux :

- authentification ;
- autorisation ;
- logique métier ;
- PostgreSQL ;
- Row Level Security ;
- Supabase Storage ;
- audit ;
- gestion des secrets.

Le frontend ne constitue jamais une frontière de sécurité.

---

## 2. Authentification

Supabase Auth est utilisé pour l'authentification.

Les utilisateurs sont créés et gérés par l'administrateur technique.

Les utilisateurs normaux peuvent :

- se connecter ;
- se déconnecter ;
- utiliser les fonctionnalités autorisées par leur rôle.

Un compte désactivé ne doit plus pouvoir accéder aux fonctionnalités protégées de l'application.

---

## 3. Autorisation

L'autorisation doit être vérifiée côté serveur.

Elle doit tenir compte :

- de l'identité de l'utilisateur ;
- du rôle ;
- du périmètre organisationnel ;
- de l'affectation ;
- de la ressource ;
- de l'action demandée ;
- du statut de la ressource ;
- des règles du workflow.

Une autorisation effectuée uniquement dans l'interface utilisateur est insuffisante.

---

## 4. Server Actions et points d'entrée serveur

Les Server Actions et autres endpoints serveur doivent être considérés comme des points d'entrée potentiellement accessibles directement.

Chaque opération sensible doit donc revérifier :

1. l'authentification ;
2. l'autorisation ;
3. le périmètre ;
4. la validité des données ;
5. les conditions du workflow.

Ne jamais supposer qu'un utilisateur arrive à une Server Action uniquement depuis une interface autorisée.

---

## 5. Administrateur technique

Le rôle technique `ADMIN` ne donne pas automatiquement accès aux pouvoirs métier.

L'administrateur peut notamment :

- créer des comptes ;
- modifier des comptes ;
- désactiver des comptes ;
- attribuer des rôles ;
- gérer certains paramètres techniques.

L'administrateur ne peut pas, uniquement grâce à son rôle technique :

- approuver une mission au nom du DG ;
- rejeter une mission au nom du DG ;
- approuver un contrôle sur pièces au nom du Chef de section ;
- modifier une décision métier ;
- contourner le workflow.

La séparation entre administration technique et pouvoir métier doit être appliquée dans le code.

---

## 6. Accès organisationnel

Les accès doivent respecter le périmètre organisationnel.

Le périmètre peut dépendre de :

- division ;
- bureau ;
- secteur ;
- mission ;
- équipe ;
- affectation.

Exemple :

Un contrôleur ne doit accéder qu'aux missions et contrôles auxquels il est autorisé ou affecté.

Un utilisateur d'un bureau ne doit pas accéder automatiquement aux données privées d'un autre bureau.

---

## 7. Accès horizontal

Un utilisateur ne doit jamais pouvoir accéder à une ressource uniquement en changeant son identifiant dans :

- une URL ;
- un formulaire ;
- une requête ;
- un paramètre ;
- une Server Action.

Exemple interdit :

Un utilisateur ayant accès à :

`/missions/123`

ne doit pas obtenir automatiquement l'accès à :

`/missions/124`

simplement parce qu'il modifie l'identifiant.

Chaque ressource doit faire l'objet d'une vérification d'autorisation.

---

## 8. PostgreSQL et RLS

PostgreSQL Row Level Security doit être utilisé pour renforcer la protection des données lorsque nécessaire.

Les politiques RLS doivent prendre en compte :

- l'utilisateur authentifié ;
- son rôle ;
- son périmètre ;
- les relations organisationnelles ;
- les affectations.

RLS doit notamment contribuer à empêcher :

- accès horizontal ;
- accès aux données d'un autre bureau ;
- accès aux missions non autorisées ;
- accès aux documents non autorisés.

RLS ne remplace pas les contrôles métier côté serveur.

---

## 9. Base de données

PostgreSQL est la source de vérité des données métier.

Les contraintes de sécurité et d'intégrité doivent être renforcées autant que possible au niveau de la base.

Utiliser lorsque nécessaire :

- clés étrangères ;
- NOT NULL ;
- UNIQUE ;
- CHECK ;
- contraintes de cohérence ;
- transactions.

Les migrations doivent être versionnées.

---

## 10. Documents

Les documents métier doivent être privés.

Ils doivent être stockés dans des buckets Supabase Storage privés.

Les utilisateurs ne doivent pas accéder directement à un fichier simplement parce qu'ils connaissent son chemin de stockage.

Avant tout téléchargement, le système doit vérifier :

- identité ;
- rôle ;
- périmètre ;
- ressource associée ;
- permission d'accès.

Utiliser des URLs signées ou un mécanisme équivalent lorsque nécessaire.

Les URLs signées doivent avoir une durée d'expiration appropriée.

---

## 11. Stockage des fichiers

Les fichiers doivent respecter des règles minimales :

- type MIME autorisé ;
- extension autorisée ;
- taille maximale ;
- nom contrôlé ;
- chemin de stockage sécurisé.

Le nom fourni par l'utilisateur ne doit pas permettre une modification arbitraire du chemin de stockage.

Les fichiers doivent être associés à leurs métadonnées dans PostgreSQL.

---

## 12. Suppression des documents

Les documents métier importants ne doivent pas être supprimés physiquement sans règle explicite.

Lorsque nécessaire, privilégier :

- archivage ;
- nouvelle version ;
- désactivation ;
- conservation de l'historique.

Toute suppression exceptionnelle doit respecter les règles métier et être auditée.

---

## 13. Audit

Les opérations sensibles doivent être enregistrées dans les logs d'audit.

Notamment :

- connexion importante lorsque nécessaire ;
- création ;
- modification ;
- soumission ;
- approbation ;
- rejet ;
- affectation ;
- changement de statut ;
- génération de document ;
- modification d'un montant ;
- création ou modification d'un PV ;
- clôture ;
- administration d'un compte.

Les logs d'audit doivent être protégés contre les modifications ordinaires.

Un utilisateur métier ne doit pas pouvoir modifier ou supprimer librement son propre historique d'audit.

---

## 14. Données financières

Les montants financiers doivent être stockés avec une précision adaptée.

Chaque montant doit posséder explicitement une devise.

Devises initiales :

- CDF ;
- USD.

Ne pas utiliser de calculs financiers flottants non maîtrisés.

Les calculs financiers doivent utiliser des types et méthodes adaptés aux montants monétaires.

Toute modification importante d'un montant doit être auditée.

---

## 15. Validation des données

Toutes les données provenant de l'utilisateur doivent être validées côté serveur.

Zod peut être utilisé pour les validations applicatives.

Les données provenant du navigateur ne doivent jamais être considérées comme fiables.

Les validations frontend servent uniquement à améliorer l'expérience utilisateur.

---

## 16. Protection contre les données sensibles

Ne jamais exposer au navigateur :

- Supabase Service Role Key ;
- secrets ;
- tokens privés ;
- credentials ;
- clés API privées ;
- variables d'environnement serveur.

Les variables publiques doivent être limitées aux valeurs pouvant réellement être exposées au navigateur.

---

## 17. Sessions

Les sessions doivent être contrôlées côté serveur.

Les pages protégées doivent vérifier l'utilisateur authentifié.

Les opérations sensibles doivent revérifier l'identité de l'utilisateur.

Un utilisateur déconnecté ou désactivé ne doit plus pouvoir exécuter les opérations protégées.

---

## 18. Permissions et workflow

Une permission ne doit jamais être considérée comme suffisante à elle seule lorsqu'une opération dépend du workflow.

Exemple :

Même si un utilisateur possède un rôle permettant d'examiner une mission, il ne doit pas pouvoir l'approuver si :

- ce n'est pas son niveau de décision ;
- le statut actuel ne permet pas l'approbation ;
- la mission n'est pas dans son périmètre.

Le workflow doit donc être contrôlé côté serveur.

---

## 19. Protection des décisions métier

Les décisions suivantes sont particulièrement sensibles :

- approbation DG ;
- rejet DG ;
- approbation Chef de section ;
- rejet Chef de section ;
- affectation des équipes ;
- modification d'un résultat ;
- modification d'un montant ;
- clôture d'une mission.

Ces opérations doivent :

- vérifier l'autorisation ;
- vérifier le statut ;
- enregistrer l'identité du décideur ;
- enregistrer la date ;
- enregistrer le résultat de la décision ;
- être auditées.

---

## 20. Protection contre les modifications concurrentes

Les opérations sensibles doivent éviter qu'une ressource soit modifiée simultanément de manière incohérente.

Lorsque nécessaire, utiliser :

- transactions PostgreSQL ;
- vérification du statut avant modification ;
- contraintes de base de données ;
- contrôle de concurrence approprié.

Une approbation ne doit pas pouvoir être effectuée deux fois par erreur.

---

## 21. Erreurs et informations exposées

Les messages d'erreur affichés à l'utilisateur ne doivent pas révéler :

- secrets ;
- tokens ;
- requêtes SQL sensibles ;
- chemins internes ;
- informations confidentielles ;
- détails inutiles de l'infrastructure.

Les détails techniques peuvent être conservés dans les logs serveur.

---

## 22. Sauvegarde

Une stratégie de sauvegarde et de restauration doit être prévue avant la production.

Le projet doit au minimum documenter :

- fréquence des sauvegardes ;
- données concernées ;
- procédure de restauration ;
- vérification de la restauration.

Pour un projet universitaire, une stratégie simple et réaliste est suffisante.

---

## 23. Dépendances

Les dépendances doivent être maintenues à jour lorsque cela est raisonnable.

Avant d'ajouter une nouvelle dépendance :

- vérifier son utilité ;
- vérifier sa maintenance ;
- éviter les dépendances inutiles ;
- privilégier les solutions déjà présentes dans le projet.

---

## 24. Journalisation

Les logs techniques ne doivent pas contenir inutilement :

- mots de passe ;
- tokens ;
- secrets ;
- données financières complètes ;
- informations personnelles sensibles.

Les logs doivent être utiles au diagnostic sans devenir une source supplémentaire de fuite de données.

---

## 25. Projet universitaire

Les mécanismes de sécurité doivent être suffisamment robustes pour démontrer les bonnes pratiques sans introduire une complexité disproportionnée au projet.

La priorité est donnée à :

1. authentification ;
2. autorisation ;
3. RLS ;
4. protection des documents ;
5. protection des données financières ;
6. audit ;
7. protection contre les accès horizontaux ;
8. protection des secrets.

Toute complexité supplémentaire doit être justifiée par un besoin réel du projet.