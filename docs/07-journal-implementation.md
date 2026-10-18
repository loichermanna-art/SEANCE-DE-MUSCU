# GYM OS — 07 · Journal d’implémentation (§26 Étape 4)

Décisions techniques et livrables vérifiables, phase par phase.

## Phase 3 — Bibliothèque & programmes

**Livrable vérifiable :** un programme complet créé de zéro (jours, exercices
avec séries/reps/charge/repos cibles).

Décisions :

1. **Sous-route `/programme/:id`** pour le détail d’un programme (jours +
   exercices planifiés), liste sur `/programme`. Routes imbriquées sous le
   `Layout` existant.
2. **Suppression prudente (§17.2)** : `deleteProgram`/`deleteDay` cascadent
   uniquement `program_days` et `program_exercises` en **transaction Dexie** ;
   les `workout_sessions` déjà réalisées ne sont jamais touchées.
3. **Exercices personnalisés (§5.4)** : création côté client avec liens
   groupes musculaires (principal/secondaire) ; la bibliothèque de référence
   (seed) reste en lecture seule — seuls les exercices `is_custom` sont
   supprimables.
4. **Validation pure** (`src/domain/programs.ts`) : noms 2–60 caractères,
   séries 1–20, plage de reps cohérente (min ≤ max), charge 0–1000 kg,
   repos 0–3600 s (§19.1). Testée unitairement (8 tests).
5. **Recherche unifiée** (`searchExercises`) partagée entre la bibliothèque
   et le sélecteur du programme : texte libre + filtre muscle + filtre matériel.

Tests : `src/domain/programs.test.ts` (8 tests, suite totale : 24 verts).

## Phase 4 — Séance en direct ⭐

**Livrable vérifiable :** une vraie séance enregistrée du début à la fin ✅

Décisions :

1. **Snapshots doubles (§6.3)** : au démarrage, le nom de l’exercice
   **et ses cibles** (séries, reps, charge, repos) sont copiés dans
   `workout_exercises` — modifier le programme pendant (ou après)
   une séance ne change jamais celle-ci.
2. **Sauvegarde progressive (§7.2)** : chaque série validée est écrite
   immédiatement dans IndexedDB ; la validation est idempotente.
3. **Pré-remplissage en cascade (§7.3)** : cibles du programme →
   dernière performance historique → dernière série validée de la
   séance en cours. La série suivante **hérite** de la série qu’on
   vient de valider (charge + reps).
4. **Minuteur de repos robuste (§7.4)** : la fin est un horodatage
   ABSOLU persisté dans IndexedDB (table `rest_timers`, Dexie v2) ;
   le décompte est recalculé sur l’horloge à chaque tick — la
   suspension d’onglet ne peut pas le faire dériver. Il survit au
   rechargement, alerte via WebAudio + vibration + Notification,
   et affiche le décompte dans le titre de l’onglet.
5. **Reprise (§7.5)** : une séance `en_cours` ou `interrompue` est
   reprise partout (accueil + écran Séance) ; l’écoulement du temps
   continue d’être calculé sur `started_at`.
6. **Bilan de fin (§7.6)** : durée, séries, répétitions, volume
   (null au poids du corps — rien d’inventé, §8.2), effort RPE 1–10
   et notes. Les séries non validées sont retirées à la clôture.
7. **Le service déclenche le minuteur** à la validation d’une série
   de travail (règle métier, pas UI) — testé au niveau service.

Tests : `src/domain/session.test.ts` (10) +
`src/services/workoutService.test.ts` (10, parcours principal sur
vraie base IndexedDB simulée) — suite totale : **44 verts**.
