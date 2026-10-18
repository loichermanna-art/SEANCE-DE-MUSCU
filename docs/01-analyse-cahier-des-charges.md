# GYM OS — 01 · Analyse du cahier des charges (Phase 1)

> Version 1.0 — Cadrage initial. Ce document résume la compréhension du besoin
> avant tout développement (Étape 1 et 2 des consignes, §26 du cahier des charges).

## 1. Environnement existant (Étape 2)

| Élément | Constat |
|---|---|
| Dépôt | `SEANCE-DE-MUSCU`, quasi vide : seul un `README.md` d'une ligne |
| Historique git | 1 commit initial, branche de travail `arena/79b97e56-seance-de-muscu` |
| Code existant | Aucun. Aucune technologie à préserver ou migrer |
| Environnement | Node.js 22, npm 10 ( suffisant pour Vite/React ) |

**Conséquence :** on part d'une page blanche. Le socle technique du §16.1
(React + TypeScript + Vite + Tailwind) peut être adopté sans contrainte d'héritage.

## 2. Objectif essentiel

GYM OS n'est **pas** un carnet numérique. C'est un système de progression :

> **Planifier → Exécuter → Mesurer → Comprendre → Adapter**

Le principe directeur (§ Conclusion) : *chaque séance produit des données utiles,
et chaque séance suivante bénéficie de ce qui a été appris précédemment.*

La fonctionnalité centrale est donc la **continuité entre les séances** :
les performances passées doivent être retrouvées instantanément pendant la
séance en cours et alimenter les recommandations futures.

## 3. Dépendances entre fonctionnalités

L'ordre de développement n'est pas arbitraire — il suit la chaîne de données :

```
Profil/Objectifs
      │
Bibliothèque d'exercices ──► Programmes ──► Séance en direct ──► Historique
                                                              │
                    ┌───────────────────┬─────────────────────┤
                    ▼                   ▼                     ▼
              Progression/Stats   Récupération        Recommandations
              (graphiques)        (adaptations)       (progression double)
                                                              │
                                                         Coach IA (plus tard)
```

- **La séance en direct (Phase 4) est le cœur** : elle produit toutes les données.
  Sans elle, progression, récupération et coach n'ont rien à analyser.
- **Progression et récupération** dépendent de l'historique fiable.
- **Le coach IA (Phase 8) est en dernier** : il interprète des calculs
  déterministes, il ne les remplace jamais (§13.4).

## 4. Risques identifiés

| # | Risque | Mitigation prévue |
|---|---|---|
| R1 | **Perte de données pendant une séance** (fermeture navigateur, batterie, réseau) | Sauvegarde progressive à chaque série validée ; séance reprise après rechargement (§21, §22.2) |
| R2 | **Historique réécrit** par une modification de programme | Séparation stricte : définition du programme ≠ séance réalisée ; snapshots du nom d'exercice dans `workout_exercises` (§6.3, §17.1.J) |
| R3 | **Doublons à la synchronisation** | Opérations idempotentes avec identifiants uniques (§15.4) — prévu dès le modèle local |
| R4 | **Graphiques inventés** sur données insuffisantes | États vides explicites, aucun graphique sans données réelles (§8.3, principe n°4) |
| R5 | **Recommandation dangereuse** (charge augmentée malgré douleur) | Règles transparentes et prudentes (§9.4/9.5) ; jamais d'application automatique (§10.2, principe n°5) |
| R6 | **Dépendance à un service externe** (IA, cloud) pour les fonctions essentielles | Fonctions essentielles 100 % locales/déterministes ; IA désactivable (§13.6, principe n°6) |
| R7 | **Fuite de données personnelles** (mensurations, photos) | Privé par défaut, RLS côté serveur si Supabase, aucun secret côté client (§18) |
| R8 | **Interface inutilisable en salle** (petits boutons, trop d'étapes) | UX mobile-first, grosses zones tactiles, validation d'une série en 1 geste (§14.2) |

## 5. Périmètre V1 (rappel du §24)

**Indispensable :** profil, objectifs, bibliothèque, programmes, séance en direct,
saisie charges/reps, minuteur de repos, sauvegarde progressive, historique séances,
historique par exercice, stats essentielles, courbatures simples, responsive,
PWA installable, persistance fiable.

**Secondaire :** suggestions de progression, graphiques avancés, mensurations,
bilan hebdomadaire, hors-ligne renforcé, synchronisation complète.

**Plus tard :** coach IA, nutrition, notifications avancées, multi-utilisateur, social.

## 6. Décisions qui nécessitent ta validation

Ces choix affectent fortement l'architecture, la sécurité ou les coûts
(§26 Étape 7) — elles sont détaillées dans `02-architecture.md` §6 :

1. **Stratégie de données V1** : local-first (IndexedDB, sans compte, 100 % hors-ligne)
   puis synchronisation Supabase — *recommandé* — ou Supabase + comptes dès la V1 ?
2. **Authentification V1** : aucun compte (usage personnel) ou connexion dès le départ ?
3. **Déploiement** : Vercel, Cloudflare Pages, ou plus tard ?
4. **Validation du périmètre MVP** ci-dessus avant de coder le socle.
