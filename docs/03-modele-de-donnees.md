# GYM OS — 03 · Modèle de données

Source : §17 du cahier des charges. Le même modèle sert pour IndexedDB (V1 locale)
et pour PostgreSQL/Supabase (synchronisation ultérieure) : les noms de tables et
de champs sont identiques des deux côtés pour éviter toute conversion.

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
