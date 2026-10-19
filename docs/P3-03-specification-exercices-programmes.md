# P3-03 — Exercices planifiés dans les programmes

**Mandat :** autorisé dans la demande de finalisation du produit du 2026-10-19.
**Dépendance :** P3-02 (programmes et jours). **Données :** IndexedDB/Dexie, usage local sans compte.

## Objectif

Un utilisateur peut composer chaque jour d'un programme à partir de la bibliothèque, choisir l'ordre et les cibles utiles, puis retrouver cette prescription après rechargement. La modification d'un programme ne modifie jamais une séance déjà enregistrée.

## Parcours et comportements

1. Dans un jour de programme non archivé, ouvrir « Exercices » et voir la liste ordonnée ou un état vide.
2. Ajouter un exercice existant avec nombre de séries, plage de répétitions, charge cible facultative avec son unité (kg/lb), repos et note facultative.
3. Modifier, déplacer vers le haut/bas et retirer une prescription. La suppression de programme/jour existante supprime en cascade les prescriptions seulement si l'historique ne référence pas le parent.
4. Les exercices ne peuvent être ajoutés/modifiés/réordonnés dans un programme archivé. Restaurer le programme en pause avant modification.
5. Champs bornés : séries 1–20; répétitions 1–100 et minimum ≤ maximum; charge facultative 0–1000; repos 0–3600 s; notes ≤500 caractères. Les chaînes sont nettoyées et les nombres doivent être finis.
6. Les fonctions de service révalident les données et vérifient les références dans une transaction Dexie; l'interface ne constitue pas la seule barrière.

## États et accessibilité

- Chargement / erreur avec action Réessayer; jour sans prescription avec action Ajouter; succès annoncé par `role=status` et erreurs par `role=alert`.
- Boutons natifs, libellés explicites, cibles tactiles minimales de 44 px et formulaires compatibles clavier.
- La configuration planifiée est distincte des instantanés d'historique `workout_exercises`/`workout_sets`.

## Critères d'acceptation

- CRUD complet et ordre déterministe, persistés au rechargement.
- Validation testée pour les bornes, références manquantes, programmes archivés et suppression/réordonnancement.
- `npm test` et `npm run build` verts; parcours navigateur à auditer séparément.
