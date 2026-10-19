### 2026-10-19 — DEMO-01 — Correctifs après audit indépendant

- **Branche / commit applicatif :** `arena/aa006b12-seance-de-muscu`, `aa837bbca1197405c47759dc306920fedba8b1f8`. `main` inchangée; P3-02 reste en pause.
- **Constats traités :**
  - `src/features/ExerciseDemoPlayer.tsx` remplace les rotations/translations globales par poses articulées propres aux 14 clés : genoux fléchis et pieds fixés au squat; charnière de hanche au RDL; tronc fixe/barre tirée au rowing; mains ancrées à la barre de traction; câble/poulie et barre mobiles au tirage vertical; barre et haltères rattachés aux mains au développé couché/incliné et développé militaire; haltères reliés aux poignets sur les élévations; trajectoires dédiées aux curls, presses, hip thrust et crunch. L’incliné a un banc incliné et une perspective trois-quarts; l’élévation latérale utilise une pose de face.
  - Les annonces vocales incluent maintenant le nom de l’étape. La planche reste une pose statique sans commandes de lecture/vitesse/rejeu. En mouvement réduit, les commandes de lecture sont remplacées par la sélection manuelle des poses.
  - `durationMs` pilote la durée des trois phases et le rejeu repart du départ en lecture. La lecture se met en pause à la fin, lors d’une pause utilisateur, d’un changement d’exercice ou quand la page est masquée.
  - `view` est harmonisé sur `side`, `front`, `three_quarter`, `static`; `durationMs=0` est réservé au statique, les mouvements animés durent 1–12 s. Le seed monte les définitions intégrées à `animationVersion=2` sans écraser les variantes locales ni leur statut de publication.
  - Migration Supabase additive `20261019130000_exercise_demonstration_metadata_alignment.sql`, schéma miroir et spécification clarifiés; migration Dexie v1→v2 maintenant exercée par un test de migration.
- **Tests ajoutés :** tests de rendu/commandes du lecteur (lecture, pause, fin, rejeu, vitesse, sélection d’étape, changement de préférence, visibilité, planche statique et géométrie d’articulations), tests de rafraîchissement du seed et migration Dexie.
- **Vérifications locales exactes :** `npm ci && npm test && npm run build && git diff --check` — réussi sur le code avant commit. 6 fichiers de tests, 38 tests réussis. Build TypeScript/Vite/PWA réussi; chunk JS de 733,57 kB (>500 kB). `npm ci` signale 3 vulnérabilités (1 modérée, 2 critiques) et une dépréciation `glob`; aucun correctif automatique appliqué.
- **CI après publication :** run `39271000512` réussi sur le commit de passation `a48a858` (qui contient `aa837bb`), avec installation, tests et build réussis. Annotations informatives : actions Node 20 en migration vers Node 24 et runner `ubuntu-latest` appelé à évoluer.
- **Limites restantes :** le SQL n’a pas été appliqué à un projet Supabase; aucun contrôle navigateur visuel réel, clavier/tactile, téléphone/ordinateur ou lecteur d’écran n’a été fait par l’implémenteur. Les scènes restent stylisées : la fidélité finale des 14 mouvements doit être revue à nouveau par l’auditeur indépendant; ne pas marquer DEMO-01 acceptée sur la seule base des tests.
- **Prochaine action :** demander à l’auditeur indépendant une relecture ciblée des 14 scènes et la matrice navigateur/accessibilité. DEMO-01 reste **En cours** jusqu’à cette revalidation.

---

### 2026-10-19 — DEMO-01 — Audit indépendant du commit `f5537238dd5bfba9330286ea2811b52a96d51dd1`

- **Périmètre et méthode :** revue statique indépendante de la spécification validée (`docs/specification-demonstrations-exercices-motion.md`) et des fichiers de code présents au SHA `f5537238dd5bfba9330286ea2811b52a96d51dd1`. Aucun fichier applicatif, SQL, configuration ou test n’a été modifié dans le cadre de cet audit. L’entrée présente a été ajoutée à la documentation seulement.
- **Exécution des commandes demandées :** le run CI GitHub Actions [`39249934726`](https://github.com/loichermanna-art/SEANCE-DE-MUSCU/actions/runs/39249934726) a checkout exactement le SHA `f5537238dd5bfba9330286ea2811b52a96d51dd1`, puis exécuté `npm test` et `npm run build` avec succès. Résultat des tests : **3 fichiers, 26 tests réussis** (dont seulement 2 tests dédiés au catalogue DEMO-01). Build TypeScript/Vite/PWA réussi. Avertissements observés : bundle JS de **725,42 kB** (seuil d’avertissement 500 kB), 3 vulnérabilités npm signalées (1 modérée, 2 critiques) et dépréciation `glob`. Aucun `npm audit fix` n’a été lancé. Une tentative de clone local pour rejouer les commandes dans l’environnement de l’audit a échoué avant installation, car le DNS ne résolvait pas `github.com` ; les résultats de tests/build cités proviennent donc de la CI sur le SHA exact, et non d’une exécution locale de cet auditeur.
- **Conclusion générale :** les tests et la compilation sont verts, mais cela ne démontre pas la fidélité biomécanique, le comportement responsive réel ni la conformité complète aux critères d’accessibilité. **DEMO-01 ne doit pas être considérée comme auditée/acceptée fonctionnellement à ce stade.**

#### Constats détaillés

1. **Bloquant — fidélité visuelle insuffisante pour plusieurs démonstrations.** Le code utilise un nombre très limité de poses génériques et fait souvent pivoter/déplacer le groupe SVG complet plutôt que d’articuler les segments du corps. Exemples vérifiables dans `src/features/ExerciseDemoPlayer.tsx` :
   - `lat-pulldown` n’a pas de câble/poulie dessiné et la pose calculée ne change pas entre les étapes ; il n’y a donc pas de démonstration de tirage vertical identifiable.
   - `barbell-row` et `romanian-deadlift` passent par la même rotation globale de la silhouette ; le rowing ne montre pas une traction de la barre et le soulevé de terre roumain ne montre pas clairement la charnière de hanche.
   - `barbell-squat` déplace/rotate l’ensemble de la silhouette au lieu de montrer une flexion articulée hanches-genoux.
   - `pull-up` translate tout le corps, mains comprises, alors que la barre reste fixe ; les mains ne restent donc pas accrochées à la barre.
   - `bench-press` a un décalage entre texte et dessin : l’étape « Descendre la barre » déplace les bras dans le sens opposé à une descente, et la barre illustrée reste fixe. `incline-dumbbell-press` réutilise une scène de banc plat, sans inclinaison nette ; les haltères dessinés ne suivent pas les mains.
   - `lateral-raise` fait pivoter la silhouette entière et les haltères ne suivent pas précisément les mains. La vue `front` déclarée dans le catalogue n’est pas utilisée par le composant.
   - `overhead-press` déplace les bras mais la barre reste fixe, sans trajectoire cohérente attachée aux mains. `plank` et `crunch` partagent la même géométrie corporelle de base ; l’alignement tête-tronc-bassin-talons demandé pour la planche n’est pas clairement illustré.
   - `hip-thrust` et `leg-press` ont des silhouettes spécifiques, mais les équipements/points d’appui et l’articulation restent trop schématiques pour valider la fidélité du mouvement.
   **Action recommandée :** reprendre les 14 cas un par un avec des articulations/objets reliés, des poses départ-mouvement-retour propres à chaque exercice, et une revue métier/visuelle avant acceptation. Ne pas présenter la V1 actuelle comme guide biomécanique fiable.
2. **À vérifier en navigateur — responsive mobile/desktop.** Le SVG a `w-full max-w-md`, le conteneur utilise `p-4 sm:p-5`, les commandes se replient avec `flex-wrap` et les boutons ont `min-h-11` (44 px dans Tailwind). Ces choix paraissent raisonnables à l’inspection du code, mais aucun navigateur réel n’a été exécuté pour les vues 1440 px, tablette et 390 px. La conformité visuelle et les éventuels débordements restent **non vérifiés**, pas validés.
3. **Clavier/tactile — éléments positifs, validation réelle absente.** Les commandes sont des boutons natifs et un `select` natif ; la feuille globale fournit un `:focus-visible` de 3 px, et les commandes principales/étapes ont une hauteur minimale de 44 px. Pas de piège clavier apparent à la lecture statique. Toutefois, aucun parcours Tab/Entrée/Espace ni essai tactile réel n’a été effectué. Le comportement de focus et l’ergonomie sur petit écran restent à tester.
4. **Lecteur d’écran — conformité partielle à vérifier.** La section possède un `aria-label`, le dessin SVG est `aria-hidden="true"`, les boutons exposent un libellé texte et un état `aria-pressed`, et la consigne est dans une zone `aria-live="polite"`. Point faible : la zone dynamique annonce la consigne mais pas explicitement le nom de l’étape courante ; l’efficacité des annonces et la navigation n’ont pas été testées avec NVDA/VoiceOver/TalkBack. Aucun test lecteur d’écran n’est revendiqué.
5. **`prefers-reduced-motion` — support de code présent.** La préférence est lue au premier rendu via `matchMedia`, les changements sont écoutés, la lecture est désactivée en mode réduit et les étapes restent sélectionnables manuellement. Les transitions du lecteur sont aussi désactivées dans ce mode et la CSS globale réduit les animations/transitions. La préférence n’a toutefois pas été basculée en navigateur réel. Le contrôle vitesse/rejouer et les trois étapes restent visibles pour `plank`, alors que la spécification demande une vue statique sans commandes inutiles.
6. **Écart de modèle avec la spécification.** Le SQL autorise `view in ('side', 'front', 'three-quarter')`, tandis que la spécification mentionne aussi une vue statique et le libellé `three_quarter`. Le catalogue déclare `three-quarter`, mais le lecteur n’utilise pas le champ `view`. La durée est `0` pour la planche alors que la table de spécification annonce initialement une durée de 1 000 à 12 000 ms ; ce cas statique devrait être explicité dans la spécification/le modèle. Aucun test n’exerce actuellement la migration Dexie, la migration SQL ou le comportement du lecteur.
7. **Pas de ressource externe : conforme.** Les démonstrations sont dessinées en SVG/CSS/React et ne dépendent pas de vidéo ou d’URL distante, conformément à la décision validée.

#### Décision d’audit et suite

- **Statut recommandé :** DEMO-01 = **implémentée, mais non acceptée fonctionnellement** ; ouvrir une passe de corrections sur la fidélité des animations avant d’investir dans une validation visuelle finale.
- **Priorité de correction :** (P1) corriger la fidélité et la cohérence texte/poses des 14 exercices, en priorité tirage vertical, développé couché/incliné, tractions, rowing, squat et soulevé de terre roumain ; (P1) ajouter des tests du composant, du mode réduit et des commandes ; (P2) harmoniser `view`/`durationMs` avec le modèle spécifié ; (P2) exécuter une matrice navigateur à 1440 px, tablette et 390 px, clavier/tactile, puis un test lecteur d’écran.
- **Périmètre préservé :** audit limité à la revue et à la documentation ; aucun code applicatif n’a été modifié. `main` reste hors périmètre et P3-02 reste en pause.

---

### 2026-10-19 — DEMO-01 — Synchronisation et vérifications de l’implémentation initiale

- **Branche / commit vérifié :** `arena/aa006b12-seance-de-muscu`, `f5537238dd5bfba9330286ea2811b52a96d51dd1`. Synchronisation locale effectuée en fast-forward depuis `b9d39c9`; `main` n’a pas été modifiée.
- **CI finale vérifiée :** run `39249934726` (`https://github.com/loichermanna-art/SEANCE-DE-MUSCU/actions/runs/39249934726`) sur ce SHA — terminé avec conclusion `success`.
- **Vérifications locales de pré-livraison :** `npm ci && npm test && npm run build` — réussi; 3 fichiers de tests, 26 tests réussis. Build TypeScript/Vite/PWA réussi.
- **Avertissements locaux :** npm signale 3 vulnérabilités dans l’arbre de dépendances (1 modérée, 2 critiques) et un avertissement de dépréciation `glob`; le chunk JavaScript produit pèse 725,42 kB (>500 kB). Aucun `npm audit fix` n’a été exécuté.
- **Audit visuel/accessibilité :** aucun test navigateur réel (ordinateur/téléphone), lecteur d’écran ou vérification interactive du clavier n’a été exécuté par cette passation. DEMO-01 reste **En cours** jusqu’à l’audit indépendant et aux validations requises. P3-02 reste en pause.
- **Sauvegarde workspace :** les modifications locales antérieures à la synchronisation ont été préservées dans `stash@{0}` sous le message `safety snapshot before syncing DEMO-01 remote branch`; ce stash n’a pas été réappliqué et ne doit pas l’être sans inspection, car le fast-forward inclut déjà plusieurs des mêmes fichiers.
- **Prochaine action :** transmettre le commit final à l’auditeur indépendant pour vérifier la fidélité des mouvements des 14 démonstrations, commandes tactiles/clavier, mouvement réduit et rendu responsive. Ne pas modifier `main`.

---

### 2026-10-19 — DEMO-01 — Implémentation initiale

- **Mandat :** validation finale explicite reçue le 2026-10-19. Modèle en table, 14 exercices, lecteur dans la bibliothèque seulement, contrôles complets, mouvement réduit statique, animations originales sans ressources externes. P3-02 reste en pause.
- **Branche :** `arena/aa006b12-seance-de-muscu`. Aucun changement volontaire sur `main`.
- **Spécification validée :** [`docs/specification-demonstrations-exercices-motion.md`](https://github.com/loichermanna-art/SEANCE-DE-MUSCU/blob/arena/aa006b12-seance-de-muscu/docs/specification-demonstrations-exercices-motion.md).
- **Implémentation ajoutée :** modèle `ExerciseDemonstration`, catalogue fermé de 14 clés d’animation originales, seed idempotent, migration Dexie v1→v2, lecteur SVG à étapes dans les fiches de bibliothèque, contrôles lecture/pause/rejouer/vitesse/étapes, respect de `prefers-reduced-motion`, arrêt lorsque la page est masquée, migration SQL additive et miroir du schéma Supabase.
- **Tests ajoutés :** `src/domain/exerciseDemonstrations.test.ts` vérifie les 14 entrées, l’unicité et les clés d’animation autorisées.
- **Fichiers applicatifs/documentaires :** `src/domain/types.ts`, `src/domain/exerciseDemonstrations.ts`, `src/domain/exerciseDemonstrations.test.ts`, `src/services/db.ts`, `src/services/seed.ts`, `src/features/ExerciseDemoPlayer.tsx`, `src/features/ExercisesPage.tsx`, `supabase/schema.sql`, `supabase/migrations/20261019120000_exercise_demonstrations.sql`, `docs/03-modele-de-donnees.md`, ce journal et `docs/00-coordination.md`.
- **Vérifications CI :** run GitHub Actions `39249799226` sur le commit `8ea0ec85146b8b6e2f220b67fb515b260ad3b0d4` — **réussi** pour installation, `npm test` et `npm run build`. Sur le commit suivant `0337c35ffaa572ffe0e1e55a16ef170fecbb9c5a`, les tests sont réussis et la compilation est encore en cours au moment de cette entrée. Une tentative de clone local a échoué car l’environnement ne résout pas `github.com`; aucune exécution locale n’est revendiquée.
- **Prochaine action :** confirmer la CI sur le commit final après cette mise à jour documentaire ; corriger tout échec. L’audit indépendant reste requis. P3-02 reste en pause et `main` ne doit pas être modifiée.

---

### 2026-10-19 — DEMO-01 — Spécification des démonstrations animées

- **État :** spécification déposée, validation utilisateur attendue. Aucun code fonctionnel modifié pour DEMO-01.
- **Branche :** `arena/aa006b12-seance-de-muscu` ; `main` intacte.
- **Spécification :** [`docs/specification-demonstrations-exercices-motion.md`](https://github.com/loichermanna-art/SEANCE-DE-MUSCU/blob/arena/aa006b12-seance-de-muscu/docs/specification-demonstrations-exercices-motion.md).
- **Commit de création de la spécification :** `64b04de7e5aa727d9162cce33cf23ae76fd03492`.
- **P3-02 :** mise en pause à la demande de l’utilisateur le 2026-10-19 ; ne pas reprendre sans instruction explicite.
- **Modèle examiné :** `src/domain/types.ts`, `src/services/db.ts`, `src/services/seed.ts`, `src/features/ExercisesPage.tsx`, `supabase/schema.sql`, `docs/03-modele-de-donnees.md`, `docs/07-plan-motion-interface.md`.
- **Décisions proposées :** table `exercise_demonstrations` distincte, références à des animations SVG codées et enregistrées dans une liste blanche, 14 exercices de référence pour la V1, lecteur d’abord dans la fiche de la bibliothèque, contrôles explicites, mode statique sous `prefers-reduced-motion: reduce`, pas de ressource externe nécessaire.
- **Alignement données :** Dexie garde les propriétés camelCase et SQL les colonnes snake_case, avec mapping explicite dans la future synchro ; ajouter une migration Dexie et une migration Supabase sans modifier les données historiques.
- **Tests :** aucun test exécuté pour cette tâche, car aucun code applicatif n’a été modifié. La validation de la spécification doit précéder toute implémentation.
- **Prochaine action :** l’utilisateur valide ou corrige les 7 décisions du §12 de la spécification. Après validation explicite, attribuer l’implémentation DEMO-01 ; conserver P3-02 en pause jusqu’à instruction contraire.

---

### 2026-10-19 — Nouvelle priorité — Démonstrations d’exercices en motion design

- **Demande utilisateur :** afficher dans l’application de courtes séquences animées qui montrent l’exécution des exercices; l’utilisateur a précisé vouloir des vidéos créées avec du code en motion design.
- **Priorité décidée par l’utilisateur :** suspendre les travaux P3-02 pour prioriser ce nouveau chantier. P3-02 reste inachevée/en cours; P3-03 n’est pas démarrée.
- **Inventaire du modèle existant :** `exercises` stocke déjà nom, matériel, description, consignes et erreurs fréquentes; `exercise_muscles` relie les exercices aux muscles; `program_exercises` et `workout_exercises` référencent l’exercice par `exerciseId`. Aucun champ média, table de démonstration ni fichier vidéo n’existe à ce jour. Les modèles Dexie se trouvent dans `src/domain/types.ts` et `src/services/db.ts`; le schéma Supabase correspondant est `supabase/schema.sql`.
- **Direction de contenu à intégrer à la spécification :** animations originales générées par code/motion design; l’utilisateur a également sélectionné des sources réutilisables/licenciées, donc la spécification devra clarifier si elles sont nécessaires ou si les animations originales suffisent. Ne pas intégrer d’URL externe ni de média sans validation de sa source.
- **À spécifier avant tout code :** tables/relations nécessaires, couverture initiale des exercices, emplacement du lecteur (bibliothèque, programmes et/ou séance), contrôles de lecture, règles d’accessibilité et comportement `prefers-reduced-motion`. Toute évolution du modèle Dexie devra rester alignée avec la table PostgreSQL/Supabase.
- **État de réalisation :** aucun code fonctionnel n’a été modifié pour ce nouveau chantier. La spécification doit être préparée par l’assistant conception/audit et validée par l’utilisateur avant implémentation, conformément au processus du dépôt.
- **Prochaine action :** transmettre le brief à l’assistant conception/audit; après validation de la spécification, reprendre l’implémentation sur `arena/aa006b12-seance-de-muscu`. Aucun changement sur `main`.

---

### 2026-10-19 — P3-02 — Durcissement et vérifications préalables

- **Responsable / branche :** implémentation sur `arena/aa006b12-seance-de-muscu` ; `main` inchangée.
- **Commit applicatif de référence :** `2d0bfe63d4dea2cb17be45bab273f6f9770daf94`.
- **Périmètre :** poursuite de P3-02 selon la spécification validée ; P3-03 n'a pas commencé.
- **Modifications :**
  - `src/services/programService.ts` — garde-fous service pour les programmes archivés et transitions de statut; opérations transactionnelles pour la modification des jours, ordre contigu lors de l'ajout, déplacement et suppression, refus de supprimer un programme/jour référencé par l'historique.
  - `src/services/programService.test.ts` — tests Dexie réels en mémoire avec la dépendance de test `fake-indexeddb`; couverture CRUD, ordre, statut archivé/restauration, suppression en cascade et protection de l'historique.
  - `src/features/ProgramsPage.tsx` — la création ouvre désormais le détail du programme; piège de focus et restitution au déclencheur des dialogues; erreurs de stockage affichées dans le dialogue; filtres adaptatifs avec action « Afficher tous »; cibles d'interaction des commandes de jours de 44 × 44 px.
  - `package.json` / `package-lock.json` — ajout de `fake-indexeddb` uniquement comme dépendance de développement pour tester Dexie dans Vitest.
- **Vérifications locales exactes :** `npm ci && npm test && npm run build && git diff --check` — réussi. `npm test` : 2 fichiers, 24 tests réussis (16 calculs, 8 tests programmes/jours). `npm run build` : réussi; avertissement existant de chunk JS à 710,68 kB (>500 kB). `npm ci` signale 3 vulnérabilités dans l'arbre de dépendances (1 modérée, 2 critiques), sans correction automatique appliquée.
- **CI :** run `39245857951` réussi après publication, déclenché sur `eea49e3` (contenant le commit applicatif `2d0bfe6`) : installation, tests et build réussis. GitHub signale uniquement les annotations de migration de Node 20 vers Node 24 pour les actions et le changement prochain de runner Ubuntu; aucun échec de tâche.
- **CI antérieure :** les runs `39243787461` et `39243769826` étaient également en succès sur `baff706` et `288b8c4`.
- **État :** P3-02 reste **En cours**, non clôturée. Aucun parcours interactif navigateur desktop/mobile ni vérification réelle au clavier / avec mouvement réduit n'a été exécuté.
- **Point ouvert pour l'audit indépendant :** la spécification permet de renommer un jour lié à une séance. Vérifier l'impact d'affichage historique, car le modèle ne contient pas de snapshot du nom du jour; aucune donnée de séance n'est modifiée par le service.
- **Prochaine action :** transmettre le commit applicatif `2d0bfe6` et son résultat CI à l'auditeur indépendant. Ne pas démarrer P3-03 avant validation de P3-02.

---

### 2026-10-19 — P3-02 — Poursuite du développement et CI (entrée historique)

- **Action ajoutée :** `.github/workflows/ci.yml` — pipeline GitHub Actions sur les push et pull requests de `main` et des branches `arena/**`, avec `npm ci`, `npm test` et `npm run build`.
- **Commit workflow :** `288b8c43089a83c24afcc31f03a0e2ddecf5a3b4`.
- **Correction à la note initiale :** l'affirmation « aucune exécution visible » ci-dessous était valable au moment de sa rédaction, mais les runs `39243787461` et `39243769826` ont depuis été confirmés en succès pour les commits correspondants. La CI du nouveau commit applicatif reste à vérifier après publication.
- **État :** P3-02 reste en cours; ne pas modifier `main` ni démarrer P3-03 avant audit et validation.

---

### 2026-10-18 — P3-02 — Première implémentation — Assistant ChatGPT

- **État :** Première passe déposée sur la branche ; vérifications de compilation/tests à effectuer avant l'audit indépendant. Ne pas clôturer P3-02 à ce stade.
- **Branche :** `arena/aa006b12-seance-de-muscu`. Aucun changement sur `main`.
- **Spécification :** `docs/P3-02-specification-programmes-jours.md` (validée explicitement par l'utilisateur avant le démarrage).
- **Fichiers applicatifs ajoutés/modifiés :**
  - `src/services/programService.ts` — accès Dexie, validations, CRUD programme/jour, statut, transaction de réordonnancement, protections contre suppression référencée par l'historique.
  - `src/services/programService.test.ts` — tests unitaires des validations des champs programme/jour.
  - `src/features/ProgramsPage.tsx` — interface liste/détail, filtres de statut, formulaires responsives, gestion des jours, confirmations, retours d'erreur/succès.
  - `src/features/PlaceholderPages.tsx` — branche la nouvelle page sur la route Programmes existante.
- **Documentation :** `docs/00-coordination.md` met P3-02 « En cours » avec responsable ChatGPT ; ce journal conserve les décisions et la limite de périmètre.
- **Règles implémentées :** nom programme 80 caractères, objectif 240, nom jour 60, note 500 ; trim des champs obligatoires ; jour de semaine 1–7 ; programme archivé en lecture seule et restauration en pause ; réordonnancement par boutons accessibles ; suppressions transactionnelles et refus si des séances référencent le programme/jour.
- **P3-03 hors périmètre :** aucune UI d'ajout/modification/réorganisation d'exercices planifiés.
- **Protection de l'historique :** les tables de séances/séries ne sont jamais supprimées par ces opérations. La suppression d'un programme est refusée si une séance référence le programme ou l'un de ses jours ; suppression d'un jour refusée si une séance le référence.
- **Vérifications :** non exécutées dans cet environnement — je n'ai pas de checkout local exploitable pour installer les dépendances et lancer `npm test` / `npm run build`. Les tests ajoutés ne sont donc pas déclarés réussis. Audit statique du code via fichiers GitHub uniquement ; aucune validation navigateur réelle.
- **Limites ouvertes avant clôture :** lancer `npm ci`, `npm test` et `npm run build` dans un environnement avec accès au dépôt ; corriger les éventuels échecs TypeScript/tests ; tester la création/édition/suppression/réordonnancement avec IndexedDB, protection de l'historique, clavier et responsive mobile/desktop. Vérifier également la fermeture/focus des dialogues et les erreurs de stockage.
- **Prochaine action / destinataire :** demander une vérification indépendante et transmettre les constats à l'utilisateur. P3-02 reste « En cours » jusqu'à tests, audit, corrections éventuelles et approbation utilisateur.

---

### 2026-10-18 — P3-02 — Implémentation programmes et jours — Assistant ChatGPT

- **État :** En cours — mandat explicite de l'utilisateur reçu après dépôt de la spécification.
- **Branche :** `arena/aa006b12-seance-de-muscu` ; `main` ne doit pas être modifiée.
- **Spécification approuvée pour implémentation :** `docs/P3-02-specification-programmes-jours.md`.
- **Périmètre :** CRUD des programmes et des jours, réordonnancement, statuts actif/pause/archive, états UI, validations, protection de l'historique, tests. P3-03 (gestion des exercices planifiés) reste hors périmètre.
- **Prochaine action :** implémenter en réutilisant React/TypeScript/Tailwind/Dexie et le modèle existant ; exécuter `npm test` et `npm run build` si l'environnement le permet ; noter les résultats exacts et tout blocage. Audit indépendant requis avant clôture.
- **Vérifications au démarrage :** lecture de `docs/00-coordination.md`, `docs/HANDOFF.md`, spécification P3-02, types et services DB. Aucune modification de code encore inscrite dans cette entrée au moment de sa création.

---

### 2026-10-18 — P3-02 — Spécification programmes et jours — Assistant ChatGPT

- **État :** Proposition documentaire déposée ; validation utilisateur attendue. L'implémentation P3-02 n'a pas commencé.
- **Branche :** `arena/aa006b12-seance-de-muscu`.
- **Commit de référence de la spécification :** `8b9f9b468fdc7d6563e80351286b47f29a55ee01` (ajout de `docs/P3-02-specification-programmes-jours.md`).
- **Documents consultés :** `docs/00-coordination.md`, `docs/HANDOFF.md`, `docs/03-modele-de-donnees.md`, `docs/04-regles-metier.md`, `docs/05-roadmap.md`, `docs/07-plan-motion-interface.md` et `src/domain/types.ts`.
- **Fichiers modifiés :** ajout de `docs/P3-02-specification-programmes-jours.md` ; mise à jour de ce journal uniquement. Aucun code fonctionnel modifié.
- **Contenu :** parcours de liste/détail, formulaires programme/jour, CRUD et ordre des jours, interface mobile-first, états chargement/vide/erreur/succès, validations proposées, statuts actif/pause/archive, confirmations et critères d'acceptation.
- **Décisions proposées :** réordonnancement accessible par boutons Monter/Descendre et ordre contigu ; programme archivé en lecture seule, restauration en pause ; suppression physique bloquée si le programme/jour est référencé par une séance, avec archivage proposé pour le programme parent. Les limites de longueur des champs sont identifiées comme propositions à valider.
- **Protection de l'historique :** le CRUD ne supprime ni ne modifie `workout_sessions`, `workout_exercises` ni `workout_sets`. Une suppression physique est refusée si elle risquerait de casser une référence historique. Toute stratégie future de détachement/tombstone nécessitera une décision explicite.
- **Hors périmètre :** sélection et gestion des exercices dans les jours, séries/répétitions/charges/repos — P3-03.
- **Vérifications :** lecture documentaire et statique seulement. `npm test` et `npm run build` **non exécutés**, car aucun code applicatif n'a été modifié ; aucune validation navigateur réalisée pour cette tâche.
- **Questions à valider :** les limites de longueur proposées (programme 80, objectif 240, jour 60, note 500 caractères) ; les règles de suppression protégée ; le comportement des programmes archivés et restauration en pause.
- **Prochaine action / destinataire :** l'utilisateur examine la spécification et confirme ou ajuste les décisions. Après validation explicite, attribuer l'implémentation P3-02 à un seul contributeur ; garder P3-03 distinct et ne pas modifier `main`.

---

### 2026-10-18 — Déploiement Vercel de l'aperçu UI-01

- **État :** Déploiement Preview prêt (READY), issu de la branche `arena/aa006b12-seance-de-muscu`, commit `5d822d9`.
- **URL d'aperçu :** https://gym-qrjiiaq9h-loichermanna-8394s-projects.vercel.app
- **Cible :** Preview Vercel, pas Production. La production n'a pas été modifiée ; l'audit UI-01 reste incomplet et attend les vérifications navigateur indépendantes.
- **Prochaine action :** vérifier sur cette URL le rendu desktop/mobile, `prefers-reduced-motion` et le parcours clavier ; après audit validé, décider avec l'utilisateur si une promotion en production est souhaitée.

### 2026-10-18 — Audit indépendant UI-01 / commit 3b4cb57

- **État :** Audit partiel — non validé faute d'exécution des tests et de vérification navigateur. Aucun code applicatif modifié pendant cet audit.
- **Branche cible :** `arena/aa006b12-seance-de-muscu`.
- **Commit examiné :** [`3b4cb577c6fac763dd23b04b1939449eac1b7127`](https://github.com/loichermanna-art/SEANCE-DE-MUSCU/commit/3b4cb577c6fac763dd23b04b1939449eac1b7127).
- **Périmètre statiquement inspecté :** diff du commit, `src/styles/index.css`, `src/components/Layout.tsx`, `src/components/ui.tsx`, `src/features/DashboardPage.tsx`, `src/features/ExercisesPage.tsx`, `src/features/ProfilePage.tsx`, `package.json`.
- **Rendu ordinateur/mobile :** non vérifiable visuellement dans l'environnement disponible. Le code prévoit une sidebar à partir de `sm` (640 px) et une navigation inférieure sur mobile ; les marqueurs d'itinéraire sont différenciés verticalement/ horizontalement. Il reste à vérifier dans un vrai navigateur le débordement, le chevauchement avec le contenu, la lisibilité et la navigation inférieure sur petit écran.
- **`prefers-reduced-motion` :** inspection statique favorable : les animations de titre/liste/panneau sont désactivées, les transformations hover/active annulées et la durée des transitions/animations ramenée à `0.01ms`. Le comportement réel avec l'émulation système n'a pas pu être testé.
- **Navigation clavier :** inspection statique favorable mais incomplète : `NavLink` produit des liens natifs et la feuille de style définit un indicateur `:focus-visible` global. Les champs qui utilisent `outline-none` reposent sur une bordure de focus ; il faut vérifier le parcours Tab/Shift+Tab réel et que le focus reste visible sur tous les fonds, y compris la barre mobile fixe. Aucun test interactif n'a été exécuté.
- **Constats mineurs :**
  1. `src/styles/index.css` définit `--motion-ease-in-out` et `--motion-d3`, qui ne sont pas utilisés dans le code inspecté. Nettoyage facultatif, sans impact fonctionnel apparent.
  2. Dans `src/features/ExercisesPage.tsx`, `filtersUsed` reste vrai après le premier changement de filtre. La classe `gym-list-item-enter` ne redémarre donc pas nécessairement l'animation pour les résultats déjà montés lors des changements de filtres suivants. Impact limité à la micro-interaction ; à ajuster seulement si l'animation à chaque filtrage est un critère attendu.
- **Bloquant/majeur confirmé par inspection statique :** aucun identifié dans le périmètre limité examiné. Cela ne vaut pas validation de l'interface complète.
- **Tentative d'exécution :** `git clone --branch arena/aa006b12-seance-de-muscu --depth 50 https://github.com/loichermanna-art/SEANCE-DE-MUSCU.git /tmp/gym-os-audit` — **échec avant clonage**, car l'environnement ne peut pas résoudre `github.com` (`Could not resolve host: github.com`). `node --version` → `v22.16.0`; `npm --version` → `10.9.2`.
- **`npm test` : NON EXÉCUTÉ.** Aucun checkout local du dépôt et aucune dépendance installée ; ne pas reprendre les résultats consignés par l'implémenteur comme preuve d'un test indépendant.
- **`npm run build` : NON EXÉCUTÉ** pour la même raison.
- **Résultat d'audit :** **incomplet / validation suspendue**, pas un échec démontré du code. Aucun fichier de code n'a été modifié. Pour conclure, relancer `npm ci`, `npm test` et `npm run build` dans un environnement ayant accès au dépôt et aux dépendances, puis vérifier manuellement les formats desktop/mobile, le mode mouvement réduit et le parcours clavier.
- **Prochaine action :** reprendre l'audit dès qu'un environnement local ou CI accessible permet les commandes et essais visuels ; résoudre les constats éventuels avant de clore UI-01.

### 2026-10-18 — UI-01 — Assistant ChatGPT (mandat explicite)

- **État :** En cours — thème clair et première passe motion intégrés ; audit indépendant et contrôle visuel responsive restent à faire.
- **Résumé :** thème clair premium demandé par l'utilisateur, navigation responsive et système motion fonctionnel discret adapté au guide Gmail. Aucun comportement de données ou route n'a été changé.
- **Branche :** `arena/aa006b12-seance-de-muscu`.
- **Référence / implémentation :** thème et navigation établis dans les commits précédents ; motion approuvé puis implémenté dans `3b4cb57` (`feat: add restrained motion design to GYM OS UI`). Aucun changement sur `main`.
- **Fichiers UI motion :** `src/styles/index.css`, `src/components/ui.tsx`, `src/components/Layout.tsx`, `src/features/DashboardPage.tsx`, `src/features/ExercisesPage.tsx`, `src/features/ProfilePage.tsx`; spécification `docs/07-plan-motion-interface.md`.
- **Décisions :** garder React/Tailwind, aucun paquet motion ajouté ; pas d'intro, de parallaxe, de curseur custom, de scroll lissé forcé ni de boucle décorative ; mouvement réduit pris en charge.
- **Vérifications :** `npm test` réussi (16 tests) ; `npm run build` réussi avec avertissement de bundle JS >500 kB ; `curl http://localhost:5173/` renvoie HTTP 200. `npm ci` a signalé 3 vulnérabilités de dépendances (1 modérée, 2 critiques), non corrigées dans cette tâche.
- **Limites / prochaine étape :** vérification visuelle manuelle desktop/mobile/mouvement réduit et audit indépendant requis avant clôture.

# GYM OS — Journal de passation

Ce journal conserve les informations utiles au prochain contributeur. Ajouter les entrées les plus récentes en haut. Ne pas y copier de secrets, clés API ou données personnelles.

### 2026-10-18 — UI-01 — Motion design — Assistant ChatGPT

- **État :** Première passe implémentée ; audit visuel indépendant restant.
- **Décision :** l'utilisateur a validé le plan motion `docs/07-plan-motion-interface.md` le 2026-10-18 après examen du guide Gmail.
- **Source examinée :** pièce jointe `Guide-Motion-Design-Premium.pdf` (50 pages), message « GUIDE MOTION DESIGN ».
- **Commit d'implémentation :** `3b4cb57` sur `arena/aa006b12-seance-de-muscu`.
- **Implémentation :** jetons motion centralisés ; entrée de titre légère ; marqueur d'itinéraire actif (vertical desktop/horizontal mobile, y compris la navigation Séance) ; retour tactile/hover bref des actions ; animation discrète du panneau de détail d'exercice et des nouveaux résultats après modification des filtres ; réduction de mouvement respectée. Aucun préchargeur, boucle décorative, parallaxe, scroll lissé forcé ou nouvelle dépendance.
- **Fichiers modifiés :** `src/styles/index.css`, `src/components/Layout.tsx`, `src/components/ui.tsx`, `src/features/DashboardPage.tsx`, `src/features/ExercisesPage.tsx`, `src/features/ProfilePage.tsx`, `docs/07-plan-motion-interface.md`.
- **Hors périmètre :** P3-02 (CRUD programmes/jours) n'a pas été démarrée ; le FLIP des jours sera ajouté quand cette interface existera, sous sa spécification approuvée.
- **Vérifications :** `npm test` réussi (16 tests). `npm run build` réussi ; Vite affiche l'avertissement de chunk JS >500 kB. `npm ci` réussi mais signale 3 vulnérabilités dans l'arbre de dépendances (1 modérée, 2 critiques) ; aucune correction automatique appliquée. `curl http://localhost:5173/` renvoie HTTP 200.
- **Limite :** la vérification visuelle manuelle des formats desktop/mobile et du mode mouvement réduit reste à faire par l'auditeur.
- **Prochaine action :** audit indépendant selon le protocole ; si aucun défaut bloquant/majeur, l'utilisateur décidera de clore UI-01 ou d'ajuster le motion.

### 2026-10-18 — Synchronisation inter-assistants

- **Règle commune :** GitHub est la source de vérité ; les conversations privées ne sont pas automatiquement partagées entre assistants.
- **Protocole ajouté :** `docs/00-coordination.md`, section « Protocole de synchronisation entre assistants ».
- **Référence du commit :** `ced42e6c1d4749350ae073332c16e0cb438f2939` — ajout du protocole sur `arena/aa006b12-seance-de-muscu`.
- **Avant chaque intervention :** relire le guide, ce journal, l'état des tâches et le SHA de branche courant.
- **Passation obligatoire :** consigner tâche, responsable, branche/SHA, fichiers, décisions, tests exacts, problèmes ouverts et prochaine action.
- **Limite pratique :** l'utilisateur reste le relais des informations qui doivent passer d'un chat à l'autre. Fournir un message court et les liens GitHub dans chaque passation.
- **Prochaine étape :** attendre l'attribution de P3-02 ; l'assistant conception/audit prépare d'abord une spécification, sans toucher au code fonctionnel, puis l'utilisateur la valide avant implémentation.

### 2026-10-18 — Organisation des rôles — validée par l'utilisateur

- **Chef d'orchestre :** l'utilisateur attribue les tâches, valide les spécifications et décide des étapes.
- **Assistant conception/audit :** fournit parcours, fonctionnement, design et prompts avant implémentation ; après implémentation, inspecte le diff, exécute indépendamment `npm test` et `npm run build`, réalise l'audit et consigne les résultats/constats classés dans ce journal. Il ne modifie pas silencieusement le code de l'implémenteur.
- **Assistant implémentation/finition :** réalise le code selon la spécification approuvée, ajoute les tests utiles, peaufine l'interface, exécute ses propres vérifications et corrige les problèmes retenus après audit.
- **Clôture :** pas de tâche de développement déclarée terminée avant l'audit indépendant, la résolution des problèmes bloquants/majeurs, la consignation des résultats et l'accord de l'utilisateur.
- **Détails et prompts copiables :** [`00-coordination.md`](00-coordination.md), section « Rôles et contrôle qualité ».

### 2026-10-18 — P3-01 — Assistant ChatGPT

- **État :** Terminé
- **Résumé :** Analyse de l'écran Programmes, des modèles de données et des règles métier. Aucun code applicatif modifié. Découpage proposé :
  1. **P3-02 — CRUD programmes et jours.** Créer les fonctions d'accès aux données (service dédié recommandé), puis permettre de créer, renommer et supprimer un programme et de créer, modifier, réordonner et supprimer ses jours. Réutiliser newId() et nowIso() de src/services/db.ts, et LOCAL_USER_ID pour le mode local. Définir la suppression en cascade des jours/exercices planifiés sans jamais supprimer les séances historiques réalisées. Conserver les statuts actif, pause et archive.
  2. **P3-03 — Exercices planifiés.** À partir de db.exercises, ajouter un exercice à un jour et gérer l'ordre, targetSets, minReps, maxReps, targetLoad facultatif, restSeconds et notes. Valider les nombres et minReps <= maxReps, vérifier les références jour/exercice et garantir un ordre déterministe après ajout, suppression ou déplacement.
  3. **P3-04 — Interface et tests.** Remplacer le placeholder dans src/features/PlaceholderPages.tsx par un parcours mobile-first branché sur Dexie : liste/état vide, création et édition de programme, détail des jours, gestion des exercices et retours d'erreur/succès. Extraire composants/services si nécessaire. Ajouter des tests ciblés des opérations et validations, puis vérifier le parcours principal.
  4. **Critère de sortie Phase 3.** Démontrer qu'un utilisateur peut créer de zéro un programme complet avec plusieurs jours et exercices paramétrés, le retrouver après rechargement et le modifier/supprimer sans altérer l'historique. Ensuite seulement commencer P4-01 (démarrer une séance depuis un jour de programme).
- **Fichiers examinés :** src/App.tsx, src/features/ExercisesPage.tsx, src/features/PlaceholderPages.tsx, src/domain/types.ts, src/services/db.ts, src/services/seed.ts, src/components/Layout.tsx, docs/02-architecture.md, docs/03-modele-de-donnees.md, docs/04-regles-metier.md, docs/05-roadmap.md, package.json.
- **Constats vérifiés :**
  - ProgramsPage dans src/features/PlaceholderPages.tsx est un EmptyState; la route /programme est déjà câblée dans src/App.tsx.
  - Les types Program, ProgramDay, ProgramExercise et les tables Dexie programs, programDays, programExercises existent déjà; les champs de jours et cibles d'exercices sont définis.
  - ExercisesPage fournit déjà recherche, filtre musculaire et fiches; db.exercises est la source à réutiliser pour sélectionner les exercices.
  - newId() et nowIso() existent dans src/services/db.ts. Le seed ne crée que les muscles, exercices et liens associés, pas de programme exemple.
  - La documentation précise que supprimer un programme ne doit jamais effacer les workout_sessions déjà réalisées. Garder séparés les programmes planifiés et les séances réellement exécutées.
  - La roadmap définit le livrable Phase 3 comme un programme complet créé de zéro; la Phase 4 vient ensuite.
- **Vérifications :** lecture statique des fichiers sur arena/aa006b12-seance-de-muscu. npm test et npm run build non exécutés : aucun code fonctionnel modifié.
- **Décisions ou blocages :** aucun blocage pour ce découpage. Avant l'implémentation, confirmer les règles de suppression/archivage et de validation dans le cahier des charges complet si elles sont plus précises. Préférer des transactions Dexie pour les modifications multi-tables.
- **Prochaine action / destinataire :** attribuer P3-02, puis P3-03 et P3-04 dans cet ordre; ne pas démarrer P4-01 avant le critère de sortie Phase 3.

## État de départ — 2026-10-18

- **Projet :** GYM OS, application de planification et de suivi de musculation.
- **Branche de travail actuelle :** arena/aa006b12-seance-de-muscu.
- **Phase :** Phase 3 — Bibliothèque & programmes.
- **Tâches :** voir [00-coordination.md](00-coordination.md). P3-01 a été analysée et ses conclusions sont consignées ci-dessus.
- **État du code :** les modèles Program, ProgramDay, ProgramExercise et les tables Dexie correspondantes existent ; l'écran programmes est encore un placeholder.
- **Vérifications :** non exécutées pour cette initialisation documentaire (aucun code applicatif modifié).
- **Prochaine action suggérée :** attribuer P3-02 à un contributeur pour implémenter le CRUD des programmes et des jours, conformément au découpage P3-01.

## Modèle d'entrée à recopier

### AAAA-MM-JJ — [ID de tâche] — [responsable]

- **État :** En cours / Terminé / Bloqué
- **Résumé :**
- **Fichiers concernés :**
- **Vérifications :** commandes lancées et résultat
- **Décisions ou blocages :**
- **Prochaine action / destinataire :**
