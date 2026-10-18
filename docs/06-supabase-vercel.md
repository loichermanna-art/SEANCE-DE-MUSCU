# GYM OS — 06 · Mise en route Supabase + Vercel

## Décisions validées (Phase 1)

| Décision | Choix retenu |
|---|---|
| D1 Données | **Supabase dès la V1**, avec repli local IndexedDB (aucune perte hors-ligne en salle) |
| D2 Auth | **Sans compte en V1** (usage personnel) — voir l'avertissement sécurité ci-dessous |
| D3 Déploiement | **Vercel** |
| D4 Périmètre | MVP du `docs/05-roadmap.md` validé |

### ⚠️ Conséquence de « Supabase sans compte »

Sans authentification, l'application utilise la clé publique Supabase (`anon`).
Les politiques RLS du fichier `supabase/schema.sql` autorisent donc ce rôle.
C'est acceptable pour **ton usage personnel temporaire**, mais **avant toute
ouverture à d'autres personnes**, il faudra activer Supabase Auth et basculer
sur les politiques « owner » commentées en bas du schéma (§18.2 du cahier des
charges : un utilisateur ne doit jamais pouvoir lire les données d'un autre).

**La base locale IndexedDB reste la source d'écriture immédiate** : chaque série
validée est d'abord sauvée sur l'appareil (jamais d'attente réseau en salle).
La synchronisation vers Supabase sera branchée en Phase 7 avec une file
d'opérations idempotentes (§15.4).

## Étape A — Créer ton projet Supabase (5 minutes, gratuit)

1. Va sur [supabase.com](https://supabase.com) → **New project** (nom : `gym-os`).
2. Choisis un mot de passe de base de données (garde-le pour toi, l'app n'en a pas besoin).
3. Une fois le projet créé : **SQL Editor** → colle tout le contenu de
   [`supabase/schema.sql`](../supabase/schema.sql) → **Run**.
4. **Project Settings → API** : récupère `Project URL` et la clé `anon public`.

## Étape B — Brancher les clés

- **En local** : copie `.env.example` en `.env.local` et remplis les 2 valeurs.
- **Sur Vercel** : Project → Settings → Environment Variables :
  `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (environnements Production + Preview), puis redéploie.

Ne mets **jamais** la clé `service_role` dans le frontend (§18.3).

## Étape C — Déploiement Vercel

Le fichier `vercel.json` est déjà configuré (build Vite, réécritures SPA).

- Importe le dépôt GitHub dans Vercel (**Add New → Project**), framework **Vite** détecté automatiquement.
- Ou demande-moi de créer le projet et le déploiement via le connecteur Vercel de cette conversation.
