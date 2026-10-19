# GYM OS — 05 · Plan de développement (d'après le §23 du CdC)

Développement **incrémental, par modules vérifiables**. Chaque phase se termine
par des tests du parcours principal avant de passer à la suivante.

| Phase | Contenu | Livrable vérifiable | Statut |
|---|---|---|---|
| **1. Cadrage** | Analyse, architecture, modèle de données, règles métier | Documents `docs/01` à `05` | ✅ Fait; périmètre V1 confirmé par l'utilisateur |
| **2. Socle** | Projet Vite/React/TS, navigation, IndexedDB (Dexie), PWA de base, profil et bibliothèque | App navigable/persistante | ✅ Fait; PWA mise à jour avec prompt et code splitting |
| **3. Bibliothèque & programmes** | Filtres/alias, exercices personnalisés, programmes/jours, prescriptions séries/réps/charge/repos | Programme complet créé et modifiable hors-ligne | Implémenté localement; audit indépendant requis |
| **4. Séance en direct** ⭐ | Séance programmée/libre, préremplissage, séries, minuteur robuste, sauvegarde progressive, pause/reprise/fin | Séance réelle restaurable après rechargement | Implémenté localement; audit navigateur requis |
| **5. Historique & progression** | Historique, records, volume, courbes Recharts, recommandations de progression et plateau | Données calculées uniquement depuis les vraies séries validées | Implémenté; test/appareil requis |
| **6. Récupération** | Énergie/sommeil/fatigue, courbatures par muscle, conseil expliqué et facultatif | Check-in persistant et recommandation prudente | Implémenté; audit d’usage et conformité médicale requis |
| **7. PWA & données** | Cache app hors-ligne, IndexedDB, export/import versionné et idempotent | Sauvegarde/restauration sans réseau | Local implémenté. Synchronisation Supabase non branchée : exige variables réelles et vérification Auth/RLS; aucun secret demandé ni simulé |
| **8. Recommandations** | Progression double et détection prudente de stagnation | Suggestions explicables, jamais appliquées automatiquement | Calculs existants intégrés à l’historique; audit requis |
| **9. Modules +** | Mensurations avancées, nutrition, notifications, éventuelle IA | À prioriser séparément après le cœur V1 | Hors MVP immédiat |

⭐ La Phase 4 est prioritaire : elle produit les données de toutes les autres.

## Definition of Done d'un module (§26 Étape 4)

1. Fonctionnalité implémentée et connectée aux **vraies données** (aucun bouton décoratif).
2. États gérés : chargement, vide, erreur, succès.
3. Parcours principal testé (+ cas limites pour les règles critiques).
4. Décisions techniques documentées dans `docs/`.
