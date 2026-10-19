# GYM OS — 03 · Modèle de données

Source : §17 du cahier des charges. Le modèle métier est partagé entre IndexedDB (V1 locale) et PostgreSQL/Supabase.
Les types TypeScript et Dexie utilisent le camelCase, tandis que PostgreSQL utilise
le snake_case ; la future synchronisation doit appliquer un mapping explicite.

## 1. Principe structurant (§6.3, §17)

Trois niveaux **strictement séparés**, pour ne jamais réécrire l'histoire :

1. **Définitions** — `programs`, `program_days`, `program_exercises` : ce qui est *prévu*.
2. **Événements** — `workout_sessions`, `workout_exercises`, `workout_sets` : ce qui s'est *réellement passé*.
3. **Snapshots** — au démarrage d'une séance, le nom de l'exercice et les cibles
   sont **copiés** dans `workout_exercises`. Renommer ou supprimer un exercice
   de la bibliothèque ne modifie jamais une séance passée.

## 2. Entités (résumé — champs complets au §17.1 du CdC)

| Table | Rôle | Champs clés |
|---|---|---|
| `profiles` | Profil sportif (§3.1) | `display_name`, `height_cm`, `experience_level`, `training_preferences` (JSON) |
| `goals` | Objectifs (§3.2) | `goal_type`, `target_value`, `unit`, `priority`, `status` |
| `exercises` | Bibliothèque (§5.2) | `name`, `equipment`, `movement_type`, `difficulty`, `is_custom`, consignes |
| `muscle_groups` | Groupes musculaires (§5.3) | `name` — 12 groupes initiaux fournis par l'application |
| `exercise_muscles` | Association N-N | `exercise_id`, `muscle_group_id`, `role` (principal/secondaire) |
| `exercise_demonstrations` | Démonstration codée d’un exercice | `exercise_id`, `variant_key`, `animation_key`, `animation_version`, `duration_ms`, `view`, `status`, libellé accessible |
| `programs` | Programmes (§6.1) | `name`, `objective`, `status` (actif/pausé/archivé) |
| `program_days` | Jours/blocs d'un programme | `name`, `day_order`, `scheduled_weekday` (facultatif) |
| `program_exercises` | Exercices prévus par jour | `target_sets`, `min_reps`, `max_reps`, `target_load`, `rest_seconds` |
| `workout_sessions` | Séance réelle (§6.2) | `status` : planifiée/en_cours/terminée/interrompue/annulée ; `started_at`, `ended_at`, `overall_effort` |
| `workout_exercises` | Exercice dans une séance | `exercise_name_snapshot`, `exercise_order`, `status` |
| `workout_sets` | Série réalisée (§7.3) | `set_number`, `set_type` (échauffement/travail), `load_value`, `repetitions`, `rir` (facult.), `status` |
| `recovery_checkins` | Bilan récupération (§9.2) | `energy_level`, `sleep_duration`, `sleep_quality`, `general_fatigue` |
| `muscle_soreness` | Courbatures par muscle (§9.3) | `severity` 0–4, `pain_type` (courbature/douleur inhabituelle) |
| `body_measurements` | Physique (§11.2) | `measurement_type` (poids, taille, bras…), `value`, `unit`, `measured_at` |
| `user_preferences` | Paramètres (§17.1.O) | unités, thème, repos par défaut |
| `recommendations` | (Phase 8) | type, contexte, raisons, statut proposée/acceptée/refusée |

## 3. Règles d'intégrité

- Chaque ligne personnelle porte un `user_id` (mono-utilisateur en local :
  un profil unique ; prêt pour le multi-utilisateur Supabase avec RLS).
- Identifiants UUID générés côté client → création hors-ligne et sync idempotente (§15.4).
- Une série `validée` est distinguée d'une série `en_cours` de saisie (§17.1.K, §19.2).
- Suppressions prudentes : supprimer un programme n'efface **jamais** les
  `workout_sessions` déjà réalisées (§17.2).
- Validation (§19.1) : charges/reps/durées ≥ 0, unités explicites (jamais de
  mélange kg/lb silencieux), champs facultatifs distincts des obligatoires.

## 4. Données initiales (seed)

- Les 12 groupes musculaires du §5.3.
- Une bibliothèque de départ d'exercices courants (pectoraux, dos, jambes, bras…)
  avec consignes techniques — données **de référence**, clairement distinctes des
  données utilisateur (§16.4). L'utilisateur peut ajouter ses exercices (§5.4).
- **Aucune donnée de performance fictive** : les graphiques restent vides tant que
  l'utilisateur n'a rien enregistré (principe n°4, §8.3).


## 5. Démonstrations d’exercices (DEMO-01)

La table `exercise_demonstrations` relie une démonstration à `exercises.id` (suppression en cascade), avec une variante unique par couple `exercise_id + variant_key`. Elle contient la clé d’une animation intégrée au code, sa version, sa durée indicative, sa vue, son libellé accessible, son statut (`publiee` / `brouillon`) et sa date de mise à jour. Une clé provenant de la base est toujours validée par une liste blanche : aucune chaîne en base n’est exécutée comme du code et aucune URL distante n’est chargée.

- **Dexie :** table `exerciseDemonstrations`, index composé unique `[exerciseId+variantKey]`, migration de la version 1 à 2. Les propriétés restent en camelCase côté TypeScript.
- **Supabase :** `public.exercise_demonstrations`, colonnes snake_case. La migration initiale est suivie de `20261019130000_exercise_demonstration_metadata_alignment.sql`, qui normalise les anciennes valeurs de vue et réserve `duration_ms = 0` au mode `static`.
- **Valeurs :** `view` vaut `side`, `front`, `three_quarter` ou `static`; une démonstration animée dure 1 000–12 000 ms, la pose statique dure 0 ms.
- **Contenu de référence :** 14 exercices de la bibliothèque sont fournis avec leurs animations originales. Le seed ajoute les entrées manquantes et met à jour une entrée intégrée seulement si `animation_version` a progressé; les variantes personnalisées et le statut de publication sont préservés.
- **Historique :** `program_exercises` et `workout_exercises` ne stockent pas de copie de l’animation ; ils conservent leur relation existante via `exercise_id`. Si une séance historique n’a plus d’`exercise_id`, le snapshot textuel reste disponible sans lecteur.
- **Accessibilité :** la fiche affiche les consignes textuelles avec le lecteur. Sous `prefers-reduced-motion: reduce`, la lecture animée est désactivée et les étapes restent sélectionnables manuellement.
