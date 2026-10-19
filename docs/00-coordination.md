# GYM OS — Coordination du projet

Ce document est le point de référence commun pour répartir le travail entre les personnes et assistants qui contribuent au dépôt.

## Présentation du projet

**GYM OS** est une application web progressive de musculation. Elle aide à planifier des programmes, suivre une séance en direct, conserver l'historique et mesurer la progression. Le principe directeur est : **Planifier → Exécuter → Mesurer → Comprendre → Adapter**.

Le projet utilise React, TypeScript et Vite. Les données locales sont gérées avec IndexedDB via Dexie. L'application doit rester pratique sur téléphone, notamment en salle, et les règles métier importantes doivent être testées.

## État actuel

- **Mandat de finalisation reçu le 2026-10-19 :** poursuivre l'implémentation sur cette branche pour rendre le produit V1 réellement utilisable, sans attendre une nouvelle attribution pour chaque sous-tâche. Le mandat lève la pause antérieure de P3-02 et autorise l'enchaînement des tâches nécessaires au parcours complet Planifier → Exécuter → Mesurer → Adapter.
- **État de départ vérifié :** bibliothèque, gestion des programmes/jours, profil, démonstrations, calculs de progression et récupération existent à des degrés divers; prescriptions d'exercices dans les jours, séance en direct, historique utilisable et suivi récupération restent incomplets ou des placeholders.
- **Séquence de finalisation :** terminer Phase 3, puis Phase 4, Phase 5 et Phase 6. Ensuite contrôler la PWA/offline et l'export. Ne pas activer de synchronisation cloud sans Auth/RLS sécurisés ni clés configurées. Coach IA, nutrition et fonctions sociales restent hors MVP V1.
- **Responsable implémentation :** Assistant ChatGPT sur `arena/aa006b12-seance-de-muscu`. L'audit indépendant et les validations réelles appareil/navigateur restent requis avant de déclarer le produit prêt à la production.

## Tâches

Les tâches marquées « À attribuer » ne sont prises par aucun assistant tant que l'utilisateur ne les assigne pas. Une seule personne/agent doit être responsable d'une tâche à la fois.

| ID | Tâche | État | Responsable | Dépend de |
|---|---|---|---|---|
| UI-01 | Déployer progressivement le thème clair premium et harmoniser les composants/navigation sans régression | En cours | Assistant ChatGPT (mandat explicite de l'utilisateur) | — |
| P3-01 | Examiner l'existant lié aux programmes et proposer un découpage précis, sans modifier le code fonctionnel | Terminé | Assistant ChatGPT | — |
| P3-02 | Finaliser la création, modification et suppression des programmes et de leurs jours; audit et validation | En cours — reprise autorisée le 2026-10-19 | Assistant ChatGPT | P3-01 |
| P3-03 | Ajouter, configurer, modifier, réordonner et retirer les exercices planifiés | En cours — implémenté, audit requis | Assistant ChatGPT | P3-02 |
| DEMO-01 | Démonstrations d’exercices en séquences animées codées (motion design) | En cours — implémenté, audit visuel/accessibilité requis | Assistant ChatGPT — implémentation | Spécification validée |
| P3-04 | Relier l'interface de programme aux données locales et couvrir les états/tests | En cours — intégration locale implémentée, audit requis | Assistant ChatGPT | P3-02, P3-03 |
| P4-01 | Démarrer, saisir, mettre en pause/reprendre et terminer une séance | En cours — implémenté, audit appareil requis | Assistant ChatGPT | Phase 3 |
| P5-01 | Historique réel, fiches d'exercice et graphiques de progression | En cours — implémenté, audit requis | Assistant ChatGPT | P4-01 |
| P6-01 | Bilans de récupération et recommandations explicables | En cours — implémenté, audit requis | Assistant ChatGPT | P4-01 |
| P7-01 | PWA hors-ligne, sauvegarde/import; synchronisation cloud sécurisée | Partiel — local terminé, cloud bloqué sur Auth/RLS/configuration | Assistant ChatGPT | P4-01 |

### États autorisés

- **À faire** : pas encore commencé.
- **En cours** : responsable explicitement désigné.
- **Bloqué** : indiquer le blocage et la décision attendue.
- **Terminé** : critères de réussite vérifiés et changements intégrés dans le dépôt.

## Rôles et contrôle qualité

L'utilisateur est le **chef d'orchestre** : il choisit les tâches, valide les spécifications et décide quand passer à l'étape suivante.

### Assistant conception et audit

- **Avant le développement :** préparer les idées de fonctionnement, les parcours utilisateurs, les propositions de design d'interface et un prompt/spécification assez précis pour l'implémentation. Décrire les états (vide, chargement, succès, erreur), les règles, les cas limites et les critères d'acceptation. Déposer la spécification dans `docs/` ou la transmettre clairement à l'utilisateur pour qu'il la partage.
- **Après le développement :** effectuer une vérification indépendante du résultat, sans se limiter au compte rendu de l'implémenteur. Lire le diff et les critères d'acceptation, exécuter `npm test` et `npm run build`, puis auditer le comportement et le code : parcours fonctionnels, erreurs et cas limites, persistance et intégrité des données, responsive/mobile, accessibilité de base, sécurité et absence de régression.
- **Rapport d'audit :** consigner dans `docs/HANDOFF.md` les commandes et résultats exacts, les éléments examinés, les problèmes classés par gravité (bloquant/majeur/mineur), les fichiers/lignes concernés et les corrections recommandées. Si tout est conforme, l'indiquer explicitement avec les limites éventuelles.
- L'auditeur ne modifie pas silencieusement le code de l'implémenteur et ne déclare pas une tâche terminée si des problèmes bloquants ou majeurs restent ouverts. Il transmet les constats à l'utilisateur, qui décide de la suite.

### Assistant implémentation et finition

- À partir d'une spécification validée par l'utilisateur, réaliser l'intégration dans l'application : code, connexion aux données réelles, tests utiles, expérience mobile et finitions.
- Avant de passer la main, exécuter lui-même `npm test` et `npm run build`, résoudre les échecs liés à son travail et documenter les résultats. Ces vérifications préalables ne remplacent pas l'audit indépendant.
- Répondre aux constats d'audit, corriger les problèmes acceptés par l'utilisateur, puis relancer les vérifications et consigner la correction.

### Critère de clôture d'une tâche développée

Une tâche n'est **Terminé** qu'après : (1) implémentation et tests préalables, (2) audit indépendant avec tests exécutés, (3) corrections des problèmes bloquants/majeurs, (4) résultats finaux consignés dans [`HANDOFF.md`](HANDOFF.md) et approbation de l'utilisateur.

## Règles de collaboration

1. Avant de commencer, lire ce document, la tâche attribuée et les documents pertinents dans `docs/`.
2. Ne prendre que la tâche indiquée par l'utilisateur. Si elle est déjà « En cours » par quelqu'un d'autre, ne pas modifier les mêmes fichiers : demander une autre tâche ou se coordonner.
3. Mettre à jour l'état et le responsable dans le tableau dès le début du travail.
4. Lorsqu'une tâche inclut du code, exécuter et noter les résultats de `npm test` et `npm run build`. L'auditeur les exécute aussi indépendamment.
5. Consigner les passations et résultats d'audit dans `docs/HANDOFF.md`. Pour des changements parallèles, utiliser des branches/PR distinctes et examiner les changements avant intégration.
6. En cas de désaccord avec le cahier des charges ou la roadmap, documenter la question et demander à l'utilisateur avant toute décision structurante.

## Protocole de synchronisation entre assistants

GitHub est la source de vérité partagée ; les conversations privées des assistants ne sont pas automatiquement accessibles l'une à l'autre.

1. **Avant chaque intervention**, chaque assistant relit ce guide, les dernières entrées de `docs/HANDOFF.md`, l'état des tâches et le commit courant de la branche. Il ne se fie pas uniquement à un résumé transmis dans le chat.
2. **Une tâche = un responsable actif.** L'assistant conception/audit ne modifie pas le code fonctionnel ; l'assistant implémentation ne clôture pas lui-même l'audit indépendant.
3. **Chaque passation** dans `docs/HANDOFF.md` doit indiquer : tâche/phase, responsable, branche, SHA du commit de référence, fichiers modifiés, décisions prises, tests exécutés avec résultats exacts, problèmes ouverts et action suivante.
4. **Chaque message de passation à l'utilisateur** doit contenir le lien vers le commit ou les fichiers concernés et un court texte prêt à transmettre à l'autre assistant si nécessaire. L'utilisateur reste le relais entre les chats lorsque le contexte n'est pas partagé automatiquement.
5. Avant de modifier un document, vérifier sa version la plus récente sur la branche ; éviter les mises à jour concurrentes et ne jamais remplacer le travail récent d'un autre contributeur par une copie obsolète.
6. Si le statut, la spécification, le SHA de référence ou le responsable sont ambigus, suspendre le travail concerné et demander une clarification plutôt que deviner.
7. Ne jamais déclarer une commande réussie si elle n'a pas été exécutée dans un environnement approprié. Distinguer clairement « réussi », « échoué », « non exécuté » et « impossible dans l'environnement disponible ».

## Messages à envoyer à un assistant

**Pour la conception :**

> Lis `docs/00-coordination.md`, `docs/HANDOFF.md` et les documents pertinents. Prépare la spécification de **[fonctionnalité]** : parcours et comportements, design responsive/mobile, états vide/chargement/erreur/succès, cas limites, critères d'acceptation et prompt concret pour l'implémentation. Ne modifie pas le code fonctionnel. Dépose la proposition dans `docs/` ou transmets-la-moi pour validation.

**Pour l'implémentation :**

> Lis la spécification approuvée et les documents de coordination. Implémente **[tâche]**, ajoute les tests nécessaires, peaufine l'interface, lance `npm test` et `npm run build`, puis consigne les fichiers modifiés, résultats et éventuels blocages dans `docs/HANDOFF.md`. L'audit indépendant sera fait ensuite.

**Pour l'audit final :**

> Audite indépendamment **[tâche/commit/PR]** par rapport à la spécification et à ses critères d'acceptation. Inspecte le diff, exécute `npm test` et `npm run build`, vérifie les parcours, cas limites, données, responsive/mobile, accessibilité de base et risques de régression. Ne modifie pas le code. Consigne dans `docs/HANDOFF.md` les commandes/résultats exacts et les constats classés bloquant/majeur/mineur, avec fichiers/lignes et corrections recommandées. Indique explicitement si l'audit est réussi ou non.

## Références

- [Analyse du besoin](01-analyse-cahier-des-charges.md)
- [Architecture](02-architecture.md)
- [Modèle de données](03-modele-de-donnees.md)
- [Règles métier](04-regles-metier.md)
- [Roadmap](05-roadmap.md)
- [Configuration Supabase/Vercel](06-supabase-vercel.md)
- [Plan motion de l'interface GYM OS — proposition à valider](07-plan-motion-interface.md)
