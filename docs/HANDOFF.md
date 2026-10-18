# GYM OS — Journal de passation

Ce journal conserve les informations utiles au prochain contributeur. Ajouter les entrées les plus récentes en haut. Ne pas y copier de secrets, clés API ou données personnelles.

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
