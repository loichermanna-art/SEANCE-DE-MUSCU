# GYM OS

Application web progressive de musculation pour **planifier → exécuter → mesurer → adapter**. La version actuelle est local-first : les programmes, séances, performances, bilans, profil et réglages sont enregistrés sur l'appareil avec IndexedDB/Dexie. Les fonctions essentielles marchent sans compte et sans réseau après chargement/cache PWA.

## Fonctionnalités V1 présentes

- Bibliothèque filtrable par nom/alias et muscle, fiches d'exercice, démonstrations SVG et exercices personnalisés.
- Programmes, jours et prescriptions d'exercices : ordre, séries, plage de répétitions, charge/unité, repos et notes.
- Séance programmée ou libre, saisie par série, sauvegarde locale immédiate, minuteur de repos qui reste cohérent en arrière-plan, pause/reprise, annulation et bilan final.
- Historique, records, volume et courbes basés sur les séries réellement validées; suggestions de progression explicables et jamais automatiques.
- Bilans de récupération et conseils prudents par groupes musculaires.
- Export JSON versionné, fusion/restauration et invite contrôlée pour les mises à jour PWA.

**La synchronisation Supabase n'est pas activée.** Il faut configurer un projet et valider Auth/RLS avant de synchroniser ou d'ouvrir l'application à d'autres utilisateurs. Aucun secret ni projet Supabase n'est fourni par ce dépôt.

## Démarrage local

```bash
npm ci
npm run dev
```

Ouvre l'adresse indiquée par Vite. Pour construire et vérifier :

```bash
npm test
npm run build
```

Les données d'entraînement restent dans le navigateur courant. Depuis **Profil et paramètres → Mes données**, exporte régulièrement un fichier JSON; importe-le sur l'appareil cible pour migrer ou restaurer. L'option « remplacer » efface d'abord les données locales, demande confirmation et ne s'exécute que si la sauvegarde est valide.

## Déploiement

- Vercel : voir [`docs/06-supabase-vercel.md`](docs/06-supabase-vercel.md). Déployer une Preview avant toute décision de production.
- Schéma Supabase et migrations : `supabase/`. Elles ne sont pas appliquées automatiquement à un projet sans configuration.

## Documentation

Commencer par [`docs/00-coordination.md`](docs/00-coordination.md), la feuille de route [`docs/05-roadmap.md`](docs/05-roadmap.md) et le journal de passation [`docs/HANDOFF.md`](docs/HANDOFF.md).
