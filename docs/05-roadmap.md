# GYM OS — 05 · Plan de développement (d'après le §23 du CdC)

Développement **incrémental, par modules vérifiables**. Chaque phase se termine
par des tests du parcours principal avant de passer à la suivante.

| Phase | Contenu | Livrable vérifiable | Statut |
|---|---|---|---|
| **1. Cadrage** | Analyse, architecture, modèle de données, règles métier | Ces documents `docs/01` à `05` | ✅ En cours (en attente validation décisions D1–D4) |
| **2. Socle** | Projet Vite/React/TS, navigation, thème §14.1, IndexedDB (Dexie), PWA de base | App installable, vide mais navigable, données persistées | ✅ Fait (profil + bibliothèque consultable inclus, 16 tests domaine verts) |
| **3. Bibliothèque & programmes** | Exercices + filtres + exercices perso, création de programmes/jours, séries/reps/repos cibles | Un programme complet créé de zéro | ✅ Fait (CRUD programmes/jours/exercices, cibles validées, exercices perso §5.4, 8 tests domaine en plus) |
| **4. Séance en direct** ⭐ | Démarrage/reprise, saisie des séries pré-remplie, minuteur de repos (robuste en arrière-plan, §7.4), sauvegarde progressive, bilan de fin | Une vraie séance enregistrée du début à la fin | ✅ Fait (démarrage par jour/serie libre, pré-remplissage §7.3, minuteur absolu §7.4, sauvegarde par série, reprise, bilan RPE) |
| **5. Historique & progression** | Historique des séances, fiche exercice (records, dernières perfs), volume, graphiques Recharts, bilan hebdomadaire | Graphiques alimentés uniquement par les vraies séances | ⬜ |
| **6. Récupération** | Bilan pré-séance rapide, courbatures par muscle (0–4), règles d'adaptation §9.4 expliquées | Recommandation d'adaptation cohérente et justifiée | ⬜ |
| **7. PWA & synchro** | Hors-ligne renforcé, file de sync idempotente, Supabase + RLS (si validé), export/import | Aucun doublon après re-synchronisation (§22.2) | ⬜ |
| **8. Recommandations** | Progression double §10, détection de stagnation, (coach IA ensuite, clés côté serveur uniquement) | Suggestions acceptables/refusables, jamais automatiques | ⬜ |
| **9. Modules +** | Mensurations avancées, nutrition, notifications | Selon priorités du moment | ⬜ |

⭐ La Phase 4 est prioritaire : elle produit les données de toutes les autres.

## Definition of Done d'un module (§26 Étape 4)

1. Fonctionnalité implémentée et connectée aux **vraies données** (aucun bouton décoratif).
2. États gérés : chargement, vide, erreur, succès.
3. Parcours principal testé (+ cas limites pour les règles critiques).
4. Décisions techniques documentées dans `docs/`.
