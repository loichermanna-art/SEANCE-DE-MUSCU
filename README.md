# GYM OS

Application web progressive (PWA) de gestion de l'entraînement en musculation :
planifier ses programmes, exécuter ses séances en direct, mesurer sa progression
et adapter ses entraînements à sa récupération.

> **Principe directeur :** chaque séance produit des données utiles, et chaque
> séance suivante bénéficie de ce qui a été appris précédemment.

## État du projet

✅ **Phase 1 — Cadrage** · ✅ **Phase 2 — Socle technique** (app PWA navigable,
thème, persistance locale, profil fonctionnel, bibliothèque consultable,
règles métier testées). Prochaine étape : **Phase 3 — Programmes**.
Voir le plan complet dans [`docs/05-roadmap.md`](docs/05-roadmap.md).

## Lancer l'application

```bash
npm install
npm run dev     # développement
npm test        # tests des règles métier (domaine)
npm run build   # build de production + PWA
```

Pour brancher Supabase et déployer sur Vercel : [`docs/06-supabase-vercel.md`](docs/06-supabase-vercel.md).

## Documentation

| Document | Contenu |
|---|---|
| [`docs/01-analyse-cahier-des-charges.md`](docs/01-analyse-cahier-des-charges.md) | Compréhension du besoin, dépendances, risques |
| [`docs/02-architecture.md`](docs/02-architecture.md) | Stack, architecture, routes, décisions à valider |
| [`docs/03-modele-de-donnees.md`](docs/03-modele-de-donnees.md) | Entités, relations, intégrité |
| [`docs/04-regles-metier.md`](docs/04-regles-metier.md) | Volume, records, progression double, récupération |
| [`docs/05-roadmap.md`](docs/05-roadmap.md) | Phases de développement |

## Stack (proposition — Phase 2)

React · TypeScript · Vite · Tailwind CSS · Recharts · IndexedDB (Dexie) ·
vite-plugin-pwa — architecture local-first, synchronisation Supabase prévue en Phase 7.
