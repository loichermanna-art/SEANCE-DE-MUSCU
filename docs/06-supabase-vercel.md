# GYM OS — Déploiement et données cloud

## État réel (2026-10-19)

- **L’application fonctionne en local-first.** IndexedDB/Dexie est la source de vérité de toutes les fonctions utilisées; les séances et bilans ne nécessitent ni compte ni réseau.
- Le client Supabase optionnel présent dans `src/lib/supabase.ts` n'est pas connecté aux services métier. **Aucune synchronisation cloud n'est implémentée ou activée.** Ajouter les variables d'environnement aujourd'hui ne synchroniserait pas les données.
- Le schéma Supabase n'a pas été appliqué à un projet distant. Les migrations versionnées sont des artefacts de déploiement, pas une preuve qu'une base existe ou a été modifiée.
- Le déploiement Vercel Production n'a pas été déclenché par cette tâche. Toute mise en ligne doit passer par une Preview et une validation explicite de l'utilisateur.

## Avertissement sécurité — ne pas exposer le schéma actuel

Le schéma de démonstration contient une politique `personal_anon_access` qui accorde au rôle public `anon` un accès complet aux tables. C'est **inadapté à une app publique** et ne garantit aucune confidentialité entre visiteurs. Ne colle pas `supabase/schema.sql` dans un projet utilisé par plusieurs personnes et ne configure pas de clés dans Vercel avant d'avoir :

1. choisi et testé Supabase Auth;
2. ajouté un `owner_id` authentifié à toutes les tables personnelles;
3. activé les politiques RLS propriétaire-par-ligne, retiré les politiques anon permissives et testé qu'un compte ne peut jamais lire/écrire les données d'un autre;
4. implémenté puis testé une file de synchronisation idempotente, les conflits et les reprises hors-ligne;
5. réalisé une revue sécurité indépendante.

La clé `service_role` ne doit jamais apparaître dans le frontend ni dans Git. La clé `anon` est publique et **n'est pas** une mesure d'autorisation.

## Lancement de l'application

```bash
npm ci
npm run dev
npm test
npm run build
```

L'application peut être servie sur Vercel sans variables Supabase; les données restent locales à chaque navigateur/appareil. Utilise le JSON versionné depuis Profil → Mes données pour sauvegarder/restaurer ou transférer les données.

## Configurer Vercel quand la Preview est demandée

1. Importer le dépôt GitHub avec Vite; la configuration SPA est dans `vercel.json`.
2. Déployer en **Preview** seulement et tester chaque route, le responsive, clavier/tactile, l'installation PWA et le mode hors-ligne.
3. Ne promouvoir en Production qu'après audit indépendant et accord explicite de l'utilisateur.

## Base Supabase (travail futur, désactivé)

`supabase/schema.sql` représente le schéma courant complet; `supabase/migrations/` conserve les migrations incrémentales. Pour appliquer une future architecture sécurisée, effectuer une revue des scripts et des politiques, puis tester sur un projet de développement jetable avant toute base réelle. Les migrations de démonstrations et les snapshots `workout_exercises` ne sont pas appliqués automatiquement.
