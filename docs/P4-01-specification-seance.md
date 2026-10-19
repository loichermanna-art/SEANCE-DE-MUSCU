# P4-01 — Séance en direct, reprise et sauvegarde locale

**Mandat :** inclus dans la demande utilisateur de finalisation V1 du 2026-10-19.
**Prérequis :** Phase 3; exécution locale d'abord. Aucune dépendance au réseau ni à Supabase.

## Parcours

- Démarrer un jour actif avec au moins un exercice planifié, ou commencer une séance libre et ajouter des exercices de la bibliothèque.
- Pour un jour planifié, créer des instantanés du nom, de l'ordre, des séries/répétitions/charge et du repos. Préremplir prudemment avec la charge cible dans son unité enregistrée puis, si disponible, les dernières séries validées comparables.
- Saisir charge, unité, répétitions et RIR facultatif; valider une série en un geste. Les brouillons et séries validées sont enregistrés localement.
- Ajouter une série de travail ou d'échauffement, ignorer une série non validée, déplacer un exercice, mettre en pause/reprendre ou annuler.
- Terminer après au moins une série validée; ignorer les brouillons restants, conserver l'historique, effort global et note facultatifs.

## Règles essentielles

- Une seule séance active/interrompue par utilisateur local.
- La validation suit `validateSetInput`; une série terminée exige au moins une répétition. Une série validée devient immuable.
- Les données validées sont la source de l'historique. Les séances vides ne peuvent pas être marquées terminées.
- Le minuteur repose sur une échéance absolue (pas sur le nombre d'itérations d'un intervalle), survit au changement d'onglet/rechargement via stockage local et peut être ignoré.
- Si le programme est édité ultérieurement, l'instantané de la séance ne change pas.

## Accessibilité et résilience

- Champs/boutons natifs à zones tactiles d'au moins 44 px, libellés explicites et retours d'erreur annoncés.
- Mise en page mobile-first; affichage utilisable d'une seule main autant que possible. Aucun secret ou compte requis.
- Si la base est indisponible, présenter une erreur récupérable sans prétendre avoir sauvegardé.

## Critères de sortie

- Tests service couvrant démarrage programmé/libre, snapshot, séries, validation, pause/reprise, annulation et fin.
- Interface de séance branchée sur la base locale, et parcours navigateur réel à auditer séparément.
