# GYM OS — Coordination du projet

Ce document est le point de référence commun pour répartir le travail entre les personnes et assistants qui contribuent au dépôt.

## Présentation du projet

**GYM OS** est une application web progressive de musculation. Elle aide à planifier des programmes, suivre une séance en direct, conserver l'historique et mesurer la progression. Le principe directeur est : **Planifier → Exécuter → Mesurer → Comprendre → Adapter**.

Le projet utilise React, TypeScript et Vite. Les données locales sont gérées avec IndexedDB via Dexie. L'application doit rester pratique sur téléphone, notamment en salle, et les règles métier importantes doivent être testées.

## État actuel

- Phases 1 et 2 : terminées (cadrage et socle de l'application).
- Phase en cours : **Phase 3 — Bibliothèque & programmes**.
- La bibliothèque d'exercices et les tables de données des programmes existent déjà. La création et la gestion complète des programmes restent à réaliser.
- La séance en direct (Phase 4) est le prochain grand jalon après les programmes.

Voir [`05-roadmap.md`](05-roadmap.md) pour la roadmap détaillée et les critères de fin.

## Tâches

Les tâches marquées « À attribuer » ne sont prises par aucun assistant tant que l'utilisateur ne les assigne pas. Une seule personne/agent doit être responsable d'une tâche à la fois.

| ID | Tâche | État | Responsable | Dépend de |
|---|---|---|---|---|
| P3-01 | Examiner l'existant lié aux programmes et proposer un découpage précis, sans modifier le code fonctionnel | Terminé | Assistant ChatGPT | — |
| P3-02 | Implémenter la création, modification et suppression des programmes et de leurs jours | À faire | À attribuer | P3-01 |
| P3-03 | Permettre d'ajouter/réordonner des exercices dans les jours, avec séries, répétitions, charge cible et repos | À faire | À attribuer | P3-02 |
| P3-04 | Relier l'interface de programme aux vraies données locales, gérer les états vide/erreur/succès et ajouter des tests | À faire | À attribuer | P3-02, P3-03 |
| P4-01 | Commencer la séance en direct à partir d'un jour de programme | À faire | À attribuer | Phase 3 terminée |

### États autorisés

- **À faire** : pas encore commencé.
- **En cours** : responsable explicitement désigné.
- **Bloqué** : indiquer le blocage et la décision attendue.
- **Terminé** : critères de réussite vérifiés et changements intégrés dans le dépôt.

## Règles de collaboration

1. Avant de commencer, lire ce document, la tâche attribuée et les documents pertinents dans `docs/`.
2. Ne prendre que la tâche indiquée par l'utilisateur. Si elle est déjà « En cours » par quelqu'un d'autre, ne pas modifier les mêmes fichiers : demander une autre tâche ou se coordonner.
3. Mettre à jour l'état et le responsable dans le tableau dès le début du travail.
4. Pour terminer, lancer les vérifications pertinentes (`npm test`, `npm run build`), noter leurs résultats et mettre à jour le journal [`HANDOFF.md`](HANDOFF.md).
5. Proposer les changements par commit/branche et pull request lorsque plusieurs contributeurs travaillent en parallèle. Ne pas intégrer des changements concurrents sans les examiner.
6. En cas de désaccord avec le cahier des charges ou la roadmap, documenter la question et demander à l'utilisateur avant de prendre une décision structurante.

## Message à envoyer à un assistant

> Lis `docs/00-coordination.md` et `docs/HANDOFF.md`. Prends uniquement la tâche **[ID]**. Vérifie qu'elle n'est pas déjà en cours par un autre contributeur, mets son état à jour, réalise le travail, lance les tests pertinents et consigne le résultat ainsi que la prochaine étape dans `docs/HANDOFF.md`.

## Références

- [Analyse du besoin](01-analyse-cahier-des-charges.md)
- [Architecture](02-architecture.md)
- [Modèle de données](03-modele-de-donnees.md)
- [Règles métier](04-regles-metier.md)
- [Roadmap](05-roadmap.md)
- [Configuration Supabase/Vercel](06-supabase-vercel.md)
