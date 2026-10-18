# GYM OS — 02 · Architecture technique

## 1. Stack retenue (proposition, §16.1)

| Couche | Choix | Justification |
|---|---|---|
| Frontend | **React + TypeScript + Vite** | Stack du cahier des charges, typage strict (principe §16.4) |
| Styles | **Tailwind CSS** + variables de thème CSS | Palette §14.1 centralisée, modifiable |
| Graphiques | **Recharts** | Sobres, responsive (§8.3) |
| PWA | **vite-plugin-pwa** (Workbox) | Manifeste + service worker (§15.2) |
| Données locales | **IndexedDB via Dexie** | Persistance fiable, requêtes indexées, survit au rechargement (§21). `localStorage` est insuffisant (synchrone, ~5 Mo, pas de requêtes) |
| Tests | **Vitest** (+ Testing Library) | Tests unitaires des calculs et règles (§22.5) |
| Backend (phase ultérieure) | **Supabase** (PostgreSQL + RLS) | Prévu au §16.1 ; schéma SQL fourni dans `03-modele-de-donnees.md` |
| Déploiement | Vercel *ou* Cloudflare Pages | À valider (voir §6) |

## 2. Stratégie de données : local-first (recommandation forte)

Le contexte d'usage tranche : **en salle de sport, la connexion est souvent
mauvaise ou absente** (§15.3, §21). La V1 est donc conçue **local-first** :

- Toutes les données vivent d'abord dans IndexedDB, sur l'appareil.
- L'application fonctionne à 100 % sans compte et sans réseau.
- Chaque entité possède un `id` UUID et des horodatages `created_at/updated_at`,
  ce qui rend la future synchronisation Supabase possible **sans refonte**
  (file d'opérations idempotentes, §15.4).
- L'export JSON des données est prévu dès la V1 (profil) : l'utilisateur reste
  propriétaire de ses données même avant l'arrivée du cloud.

Avantage décisif : **aucun compte, aucun secret, aucun coût** pour démarrer,
et le parcours critique (enregistrer une séance) ne dépend d'aucun serveur.

## 3. Architecture logique (§16.2)

```
src/
├── app/          # Configuration, routeur, providers
├── components/   # Composants UI réutilisables (boutons, cartes, minuteur…)
├── features/
│   ├── dashboard/    # Accueil (§4.1)
│   ├── programs/     # Programmes (§4.2)
│   ├── workouts/     # Séance en direct (§4.3)
│   ├── exercises/    # Bibliothèque (§5)
│   ├── progress/     # Statistiques (§4.4)
│   ├── recovery/     # Récupération (§4.5)
│   └── profile/      # Profil & paramètres (§4.6)
├── domain/       # RÈGLES MÉTIER PURES (testables, sans React) :
│                 #   volume, records, progression double, adaptation récupération
├── services/     # Accès données (Dexie), export, (sync Supabase plus tard)
├── lib/          # Utilitaires (dates, unités, formatage)
└── styles/       # Thème (§14.1)
```

**Règle d'or (§16.2, §13.4) :** aucun calcul sportif dans un composant visuel.
Tout calcul vit dans `domain/`, sous forme de fonctions pures testées unitairement.

## 4. Routes principales

| Route | Écran | Section du CdC |
|---|---|---|
| `/` | Accueil / tableau de bord | §4.1 |
| `/programme` | Programmes et séances planifiées | §4.2, §6 |
| `/exercices` | Bibliothèque d'exercices | §5 |
| `/exercices/:id` | Fiche exercice + historique + records | §8.5 |
| `/seance` | Séance en direct (démarrer / reprendre) | §7 |
| `/progression` | Statistiques et graphiques | §8 |
| `/recuperation` | Courbatures, fatigue, sommeil | §9 |
| `/profil` | Profil, objectifs, paramètres, export | §3, §4.6 |

Navigation mobile : barre inférieure à 5 entrées (Accueil, Programme, **Séance**
— bouton central mis en avant —, Progression, Profil) ; Récupération et
Exercices accessibles depuis l'accueil et le programme (§14.3).

## 5. Flux critiques

**Démarrer une séance :** Accueil → bouton « Commencer ma séance » → bilan
récupération rapide (ignorable, §9.2) → séance chargée avec dernières
performances → saisie série par série (valeurs pré-remplies, §7.3) → minuteur
de repos (§7.4) → bilan de fin (§7.6) → historique.

**Reprendre une séance interrompue :** au lancement, si une séance est en statut
`en_cours`, l'accueil propose « Reprendre » (§4.1, §7.5). Aucune donnée perdue
car chaque série validée est déjà persistée.

## 6. Décisions à valider

| # | Décision | Recommandation | Impact si autre choix |
|---|---|---|---|
| D1 | Données V1 | **Supabase dès la V1 (validé)** | Schéma `supabase/schema.sql` + variables d'env. Garde-fou conservé : IndexedDB = écriture immédiate, synchro Phase 7 (voir `docs/06-supabase-vercel.md`) |
| D2 | Authentification V1 | **Aucune (validé)** | Mode Supabase « anon » temporaire, avertissement documenté ; Auth + politiques owner avant ouverture multi-utilisateur |
| D3 | Déploiement | **Vercel (validé)** | `vercel.json` prêt (build Vite, réécritures SPA) |
| D4 | Périmètre | **Roadmap validée** | Développement phase par phase (`docs/05-roadmap.md`) |

## 7. Sécurité (§18) — dès la V1

- Aucun secret dans le code client (il n'y en a aucun en local-first).
- Données privées par défaut ; export sous contrôle de l'utilisateur.
- Quand Supabase arrivera : RLS activée sur toutes les tables, clés publiques
  uniquement côté client, clés privilégiées côté serveur uniquement.
