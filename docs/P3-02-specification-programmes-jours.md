# P3-02 — Spécification fonctionnelle et interface : programmes et jours

**Statut : proposition à valider par l'utilisateur — aucune implémentation commencée.**  
**Branche de référence :** `arena/aa006b12-seance-de-muscu`  
**Dépendance :** P3-01 (analyse de l'existant).  
**Hors périmètre explicite :** ajout, modification, réorganisation et suppression des exercices d'un jour, ainsi que la configuration des séries/répétitions/charges/repos. Ces fonctions relèvent de **P3-03**.

## 1. Objectif et principes

Permettre à l'utilisateur de construire et organiser ses programmes de musculation, puis de les retrouver après rechargement. P3-02 couvre uniquement :
- créer, consulter, modifier et supprimer un programme ;
- gérer le statut d'un programme : **Actif**, **En pause**, **Archivé** ;
- créer, modifier, réordonner et supprimer les jours d'un programme ;
- gérer les états de chargement, vide, erreur et succès ;
- préserver sans altération l'historique des séances réelles.

Conserver React, TypeScript, Tailwind, les composants partagés et Dexie/IndexedDB existants. Réutiliser les types `Program` et `ProgramDay`, `LOCAL_USER_ID`, `newId()` et `nowIso()`. Pas de nouvelle dépendance ni de refonte globale.

## 2. Parcours utilisateur

1. L'utilisateur ouvre **Programmes** depuis la navigation existante.
2. L'application lit les programmes locaux et affiche une liste ou un état vide.
3. L'utilisateur crée un programme en saisissant son nom, son objectif et son statut initial.
4. Il ouvre le programme pour voir ses jours, les créer et les organiser.
5. Il peut modifier les informations du programme ou d'un jour, déplacer un jour vers le haut/bas et supprimer un élément lorsque l'intégrité de l'historique le permet.
6. Chaque mutation n'est confirmée comme réussie qu'après la confirmation réelle de la transaction locale. Les données restent disponibles après rechargement.

## 3. Interface proposée

### 3.1 Liste des programmes

- Titre de page **Programmes** et action primaire **Nouveau programme**.
- Chaque carte affiche : nom, objectif si renseigné, badge de statut, nombre de jours et menu d'actions.
- Actions : **Ouvrir**, **Modifier**, **Mettre en pause / Reprendre**, **Archiver / Restaurer**, **Supprimer** (si autorisé).
- Filtres simples : **Tous**, **Actifs**, **En pause**, **Archivés**. « Tous » est sélectionné par défaut. Un filtre vide affiche un message adapté et un moyen de revenir à « Tous ».
- Ne pas afficher de statistiques ou de données de performance fictives.

### 3.2 Formulaire de création / modification d'un programme

Utiliser le même formulaire pour créer et modifier, avec un titre et un bouton adaptés :
- **Nom du programme** — obligatoire ;
- **Objectif** — facultatif, texte libre ;
- **Statut** — sélection parmi Actif, En pause, Archivé ; par défaut **Actif** à la création.
- Actions **Annuler** et **Créer le programme** / **Enregistrer les modifications**.

La création réussie ouvre le détail du programme, où l'utilisateur peut ajouter ses jours. L'édition préremplit les valeurs existantes. En cas d'erreur, conserver la saisie et permettre de réessayer.

### 3.3 Détail d'un programme et gestion des jours

En-tête : retour à la liste, nom du programme, objectif, badge de statut et menu de gestion du programme.

Section **Jours du programme** :
- Liste ordonnée de cartes : numéro d'ordre, nom du jour, jour de semaine facultatif s'il est renseigné, note facultative si renseignée.
- Bouton **Ajouter un jour**.
- Chaque carte offre **Modifier**, **Monter**, **Descendre**, **Supprimer**.
- Désactiver **Monter** pour le premier jour et **Descendre** pour le dernier. Les boutons doivent garder des libellés accessibles explicites, par exemple « Monter Jour Haut » plutôt qu'une icône seule.
- Le déplacement échange l'ordre avec le voisin immédiat. Il ne change ni le contenu du jour ni les autres jours. Après déplacement, les valeurs `dayOrder` sont renormalisées en ordre contigu (1…N) dans une seule transaction.
- Un indicateur de mouvement discret peut accompagner le déplacement réel conformément à `docs/07-plan-motion-interface.md`; aucun contenu ne doit dépendre de l'animation.

### 3.4 Formulaire de création / modification d'un jour

- **Nom du jour** — obligatoire (ex. « Haut du corps », « Jambes ») ;
- **Jour de la semaine** — facultatif : Aucun, Lundi…Dimanche ; stocker lundi=1 à dimanche=7 ;
- **Note** — facultative, texte libre.
- Actions **Annuler** et **Ajouter le jour** / **Enregistrer**.

Le jour est créé en dernière position, avec `dayOrder = nombre de jours + 1`. Modifier un jour ne modifie pas son ordre. Si l'utilisateur annule, aucune donnée ne change.

### 3.5 Suppression et confirmations

- Toute suppression demande une confirmation explicite nommant l'élément et expliquant ce qui sera supprimé.
- **Programme sans historique lié :** confirmation indiquant que le programme et ses jours/définitions planifiées seront supprimés. L'opération sur plusieurs tables est atomique.
- **Jour sans séance historique liée :** confirmation indiquant que le jour et sa configuration planifiée seront supprimés. Dans P3-02, la configuration d'exercices éventuellement présente est supprimée avec le jour, mais l'interface ne permet pas de gérer ces exercices : cette gestion appartient à P3-03.
- **Programme ou jour référencé par une séance historique :** ne pas effectuer de suppression physique. Expliquer que l'élément est utilisé par l'historique et proposer l'action sûre disponible : archiver le programme, ou annuler. Pour un jour lié à une séance, conserver le jour et permettre à l'utilisateur de renommer la définition ou d'archiver le programme parent ; ne pas inventer un statut d'archive de jour qui n'existe pas dans le modèle actuel.
- La détection doit inclure les séances à tous les statuts dès lors qu'elles représentent un événement enregistré, et en particulier les séances terminées/interrompues. Ne jamais supprimer ou réécrire `workout_sessions`, `workout_exercises` ou `workout_sets` depuis le CRUD des programmes/jours.
- Si la règle de suppression doit plus tard autoriser le retrait des définitions référencées, cela nécessitera une décision de modèle explicite (par exemple snapshots/tombstones ou détachement des références) et des tests dédiés ; ce n'est pas implicite dans P3-02.

## 4. Statuts des programmes

| Statut | Signification | Comportement attendu |
|---|---|---|
| **Actif** (`actif`) | Programme actuellement utilisable | Visible dans « Actifs » et « Tous » ; modifiable ; éligible à la sélection pour une future séance. |
| **En pause** (`pause`) | Programme conservé mais momentanément suspendu | Visible dans « En pause » et « Tous » ; modifiable ; pas proposé comme choix par défaut pour démarrer une séance. |
| **Archivé** (`archive`) | Programme conservé pour référence, non utilisé au quotidien | Visible dans « Archivés » et « Tous » ; exclu des choix actifs de séance ; lecture seule tant qu'il n'est pas restauré. |

- Passer en pause ne supprime rien. **Reprendre** remet le programme à Actif.
- Archiver conserve le programme et ses jours ; l'interface demande confirmation et explique que le contenu restera consultable.
- **Restaurer** un programme archivé le remet en pause, pour éviter de le rendre actif sans action explicite supplémentaire.
- La suppression physique n'est proposée que si aucune séance enregistrée ne référence le programme ni ses jours. Sinon, l'action sûre est l'archivage.
- Le modèle actuel ne précise pas qu'un seul programme peut être actif : ne pas imposer d'exclusivité sans décision métier supplémentaire.

## 5. Validations et règles métier

### Programme
- Nom obligatoire après suppression des espaces en début/fin ; ne pas accepter une chaîne vide ou composée uniquement d'espaces.
- Limite proposée : 80 caractères pour le nom ; 240 caractères pour l'objectif. Afficher le compteur/maximum si utile et bloquer au-delà. **Ces limites sont des propositions à valider**, pas des contraintes déjà présentes dans le modèle.
- Objectif facultatif ; une valeur vide est enregistrée comme chaîne vide pour rester compatible avec le type actuel `objective: string`.
- Statut limité aux trois valeurs du modèle : `actif`, `pause`, `archive`.

### Jour
- Nom obligatoire après trim ; maximum proposé de 60 caractères (à valider).
- Jour de semaine facultatif, valeur entière de 1 à 7, ou absent.
- Note facultative ; maximum proposé de 500 caractères (à valider).
- L'ordre est géré par l'application et non saisi manuellement.
- Un jour doit toujours appartenir à un programme existant et ne peut être réordonné qu'au sein de ce programme.

### Cohérence et erreurs concurrentes
- Générer les identifiants avec `newId()` et les dates avec `nowIso()` selon les conventions existantes.
- Assurer les opérations multi-tables par transaction Dexie : créer/supprimer un programme avec ses jours et réordonner les jours sans laisser d'ordre partiel.
- Si le programme/jour a été supprimé ou modifié entre lecture et sauvegarde, afficher une erreur explicite, recharger les données et ne pas annoncer de succès.
- Ne pas effacer un formulaire après un échec. Éviter les doubles soumissions : désactiver l'action en cours et afficher son état.
- Les erreurs ne doivent pas être exposées uniquement par la couleur ou une animation ; texte clair et associé au champ lorsque pertinent.

## 6. États de l'interface

| État | Affichage et comportement |
|---|---|
| **Chargement initial** | Squelettes ou indicateur sobre « Chargement des programmes… » / « Chargement des jours… ». Pas de fausse liste ; ne pas bloquer toute la navigation. |
| **Vide global** | Message « Aucun programme pour le moment », explication courte et bouton **Créer mon premier programme**. |
| **Vide filtré** | « Aucun programme dans cette catégorie » et action **Voir tous les programmes**. |
| **Programme sans jour** | « Aucun jour dans ce programme » et action **Ajouter un jour**. |
| **Enregistrement** | Bouton concerné désactivé, libellé « Enregistrement… » ou « Suppression… » ; prévenir les doubles soumissions. |
| **Succès** | Fermer le formulaire ou mettre à jour la liste après la transaction ; annonce textuelle « Programme créé », « Modifications enregistrées », « Jour déplacé », etc. |
| **Erreur de lecture** | Message non bloquant « Impossible de charger les programmes/jours », action **Réessayer**. |
| **Erreur d'écriture** | Message précis, saisie conservée, action de réessai ; aucune confirmation optimiste. |
| **Suppression protégée** | Explication de la référence à l'historique et alternative **Archiver le programme** ou **Annuler**. |
| **Aucun résultat de filtre** | Distinguer l'absence de données de l'absence de résultat dans le filtre courant. |

## 7. Responsive, accessibilité et motion

- Approche mobile-first, thème clair premium existant : fond clair, cartes blanches, bordures discrètes, accent bleu, typographie lisible.
- À 390 px : cartes en une colonne, formulaire pleine largeur, actions de carte accessibles sans débordement horizontal ; menu d'actions peut devenir une liste verticale ou un menu accessible.
- Sur desktop : liste et détail peuvent exploiter l'espace disponible sans ajouter de panneau complexe non nécessaire.
- Zones tactiles d'au moins 44×44 px. Ne pas dépendre du survol pour découvrir une action.
- Tous les champs ont un label visible ; erreurs reliées au champ ; statut et erreurs annoncés aux technologies d'assistance (région live si approprié).
- Ordre de tabulation logique ; focus visible ; Entrée soumet le formulaire selon le comportement standard ; Échap ferme une modale sans enregistrer et restitue le focus au déclencheur.
- Pour les confirmations, préférer un dialogue accessible avec titre clair, actions **Annuler** et action destructive explicite ; ne pas utiliser `window.confirm` comme solution finale.
- Respecter `prefers-reduced-motion: reduce` : déplacement instantané, aucun contenu dépendant du mouvement. Le réordonnancement reste disponible par boutons **Monter/Descendre**, pas seulement par glisser-déposer.
- Garder les animations courtes, fonctionnelles et cohérentes avec `docs/07-plan-motion-interface.md`.

## 8. Critères d'acceptation

- [ ] La liste se charge depuis les données locales et distingue chargement, vide, erreur et succès.
- [ ] Un utilisateur peut créer un programme valide, le voir dans la liste et le retrouver après rechargement.
- [ ] Il peut modifier nom, objectif et statut ; les valeurs sont validées et conservées.
- [ ] Les trois statuts ont les comportements décrits ; archiver/restaurer ne supprime aucune donnée.
- [ ] Il peut ajouter plusieurs jours, les modifier, les monter/descendre et les supprimer quand c'est sûr.
- [ ] L'ordre des jours reste contigu et stable après déplacement, rechargement, création ou suppression.
- [ ] Les suppressions sont confirmées ; les éléments référencés par l'historique ne sont pas physiquement supprimés.
- [ ] Aucune séance ni série historique n'est supprimée ou modifiée par ces actions.
- [ ] Les erreurs de stockage sont visibles, réessayables et ne font pas perdre les saisies.
- [ ] Les parcours fonctionnent au clavier et à 390 px, sans débordement horizontal.
- [ ] Le mode `prefers-reduced-motion` supprime les déplacements animés sans supprimer la fonctionnalité.
- [ ] Tests ciblés couvrent validation, CRUD, réordonnancement, transaction/échec et protection de l'historique.
- [ ] `npm test` et `npm run build` sont exécutés par l'implémenteur avant passation ; audit indépendant ensuite.

## 9. Hors périmètre — P3-03

Ne pas implémenter dans P3-02 :
- choisir un exercice depuis la bibliothèque ;
- ajouter, modifier, supprimer ou réordonner les exercices d'un jour depuis l'interface ;
- saisir séries cibles, répétitions min/max, charge cible, repos ou notes propres à un exercice ;
- recherche/filtre d'exercices dans un jour.

P3-02 peut supprimer en cascade les lignes de planification appartenant à un jour supprimable, si le modèle existant l'exige, mais ne doit pas fournir d'interface pour les éditer. P3-03 prendra en charge ces interactions.

## 10. Prompt de passation pour l'implémentation

> Lis `docs/00-coordination.md`, `docs/HANDOFF.md`, cette spécification `docs/P3-02-specification-programmes-jours.md` et les documents de modèle/règles. Implémente uniquement P3-02 sur `arena/aa006b12-seance-de-muscu), après validation explicite de l'utilisateur. Crée/modifie/supprime les programmes et jours selon les règles ci-dessus, en conservant l'historique. N'ajoute aucune interface de gestion des exercices (P3-03). Réutilise React/Tailwind/Dexie et les composants existants. Ajoute les tests ciblés, lance `npm test` et `npm run build`, puis consigne commit, fichiers, résultats exacts et blocages dans `docs/HANDOFF.md`. Ne modifie pas `main` et ne déclare pas la tâche terminée avant l'audit indépendant.
