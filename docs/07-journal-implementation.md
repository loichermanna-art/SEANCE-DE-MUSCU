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

## Phase 4 — Séance en direct

(voir prochaine section — à compléter avec la phase)
