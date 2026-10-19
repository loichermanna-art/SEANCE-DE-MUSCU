# Spécification — Démonstrations d’exercices en motion design

**Statut : À valider par l’utilisateur — aucune implémentation autorisée avant validation.**  
**Date : 2026-10-19**  
**Branche de travail prévue : `arena/aa006b12-seance-de-muscu` ; `main` reste intacte.**  
**Priorité : nouveau chantier prioritaire. P3-02 est mise en pause à la demande de l’utilisateur.**

## 1. Objectif et principes

Ajouter aux fiches d’exercices de GYM OS un lecteur de démonstration visuelle qui montre le mouvement sous forme de séquence animée originale, dessinée et animée par code (SVG + CSS/JavaScript/React). Il s’agit d’un motion design vectoriel dans l’application, pas d’une vidéo MP4 générée ou hébergée.

La démonstration doit aider à comprendre la trajectoire et les principales phases du mouvement. Elle ne remplace pas les consignes écrites, l’encadrement professionnel ni l’adaptation à la morphologie de la personne. Ne pas représenter une biomécanique douteuse comme une vérité universelle.

Principes :
- rendu vectoriel léger, net sur téléphone et ordinateur ;
- style cohérent avec GYM OS : fond clair, lignes propres, accent bleu, pas d’effet décoratif excessif ;
- mouvement fonctionnel, sans boucle décorative ni lecture automatique ;
- aucun réseau nécessaire pour lire les animations livrées avec l’application ;
- aucune modification des performances, des séries ou de l’historique ;
- ne pas stocker de code exécutable d’animation dans la base de données : la base référence une animation connue et autorisée par le code de l’application.

## 2. Inspection du modèle existant

Le modèle TypeScript est défini dans `src/domain/types.ts`, Dexie dans `src/services/db.ts`, et le schéma SQL dans `supabase/schema.sql`.

- `exercises` / `Exercise` : définition du mouvement (nom, matériel, type, difficulté, description, instructions, erreurs fréquentes). Pas de référence média actuellement.
- `exercise_muscles` / `ExerciseMuscle` : association plusieurs-à-plusieurs avec les groupes musculaires.
- `program_exercises` / `ProgramExercise` : exercice prévu dans un jour de programme, relié à `exercises` par `exerciseId` / `exercise_id`.
- `workout_exercises` / `WorkoutExercise` : occurrence d’un exercice dans une séance réelle, avec `exerciseId` facultatif et `exerciseNameSnapshot` pour préserver l’historique.
- Les exercices de référence actuels sont semés dans `src/services/seed.ts`. Aucun média, aucune table de démonstration et aucun lecteur n’existent dans le modèle examiné.

**Conséquence :** les démonstrations doivent être attachées à la définition de l’exercice, jamais aux occurrences de programme ou de séance. Les écrans de programme et de séance retrouvent la démonstration via leur `exerciseId`, sans recopier des métadonnées dans les lignes historiques.

## 3. Modèle de données proposé

### 3.1 Conserver les tables existantes

Aucun nouveau champ n’est nécessaire dans `program_exercises` ou `workout_exercises`. Le lecteur recherche la démonstration à partir de l’exercice associé. Si `workout_exercises.exerciseId` est nul (exercice supprimé ou occurrence historique détachée), afficher le nom historique et les consignes disponibles, sans lecteur.

### 3.2 Nouvelle table `exercise_demonstrations`

Proposition d’une table de métadonnées distincte. Les images/animations vectorielles restent dans le bundle de l’application ; la table ne contient que des références et informations descriptives.

| Champ logique (TypeScript/Dexie) | Colonne SQL Supabase | Type / règle |
|---|---|---|
| `id` | `id` | `text`, clé primaire stable |
| `exerciseId` | `exercise_id` | `text`, FK vers `exercises.id`, suppression en cascade de la métadonnée |
| `variantKey` | `variant_key` | `text`, clé stable de variante, ex. `default` ou `side` |
| `animationKey` | `animation_key` | `text`, identifiant d’un composant/animation enregistré dans le code |
| `animationVersion` | `animation_version` | entier positif, version de la composition |
| `durationMs` | `duration_ms` | entier entre 1 000 et 12 000 ms |
| `view` | `view` | `text`, parmi `side`, `front`, `three_quarter`, `static` |
| `accessibilityLabel` | `accessibility_label` | `text` non vide, résumé textuel du mouvement représenté |
| `status` | `status` | `text`, `publiee` ou `brouillon` |
| `updatedAt` | `updated_at` | date ISO en local / `timestamptz` en SQL |

Contraintes et index :
- FK `exerciseId → exercises.id` ; suppression de la définition d’exercice supprime sa métadonnée, mais pas les séances historiques, dont `exerciseId` est déjà facultatif.
- unicité composite `(exerciseId, variantKey)` / `(exercise_id, variant_key)`.
- index sur `exerciseId` et `status` pour retrouver rapidement les démonstrations publiées.
- seules les lignes `publiee` sont présentées dans l’interface ; une référence inconnue ou non publiée donne un repli sans lecteur, jamais une erreur bloquante.
- `animationKey` est résolue via une liste blanche dans le code. Une valeur venue de Supabase ne peut pas charger du JavaScript arbitraire, un SVG externe ou une URL inconnue.

### 3.3 Alignement Dexie / Supabase

Dexie conserve la convention applicative camelCase (`exerciseId`, `animationKey`…), comme les interfaces de `src/domain/types.ts`. PostgreSQL conserve la convention SQL snake_case (`exercise_id`, `animation_key`…), comme le schéma existant. L’alignement doit porter sur les mêmes concepts, contraintes, valeurs d’énumération et relations, avec un mapping explicite dans la couche de synchronisation future. La documentation actuelle disant que les noms sont identiques « sans conversion » est à comprendre comme une identité sémantique : les noms de colonnes SQL existants ne sont pas littéralement les noms camelCase de TypeScript.

La future migration Dexie doit incrémenter la version de base (actuellement version 1) et créer `exerciseDemonstrations` avec index `id`, `exerciseId`, `status` et l’index composé unique `[exerciseId+variantKey]`. La migration SQL doit être ajoutée comme nouvelle migration Supabase, et non seulement remplacer `supabase/schema.sql`. Mettre à jour le schéma miroir `supabase/schema.sql` et `docs/03-modele-de-donnees.md`.

**Alternative plus légère :** un simple champ `animationKey` facultatif sur `Exercise` suffirait si chaque exercice ne devait avoir qu’une animation à vie. La table séparée est recommandée pour permettre plusieurs vues/variantes, gérer publication et versionner la composition sans alourdir les données métier de l’exercice.

## 4. Contenu V1 : exercices couverts

La V1 couvre **14 exercices de référence existants**, identifiés par leur ID stable dans `src/services/seed.ts`. Aucun exercice personnalisé n’est animé automatiquement ; ils gardent leur fiche textuelle et un message « Démonstration non disponible ».

| ID existant | Nom | Vue proposée | Points visuels à montrer |
|---|---|---|---|
| `dev-couche-barre` | Développé couché à la barre | côté / trois-quarts | position sur banc, descente contrôlée, poussée, pieds et bassin stables |
| `dev-incline-halteres` | Développé incliné aux haltères | trois-quarts | trajectoire des haltères, coudes sous contrôle, poussée |
| `tractions-pronation` | Tractions pronation | côté | suspension, tirage vertical, descente contrôlée, pas de balancement |
| `rowing-barre` | Rowing barre buste penché | côté | charnière de hanche stable, barre vers le bas du ventre, retour contrôlé |
| `tirage-vertical` | Tirage vertical à la poulie | côté | départ bras élevés, coudes vers le bas, barre vers le haut de la poitrine |
| `dev-militaire` | Développé militaire | côté / trois-quarts | départ à hauteur d’épaules, poussée verticale, tronc stable |
| `elevations-laterales` | Élévations latérales aux haltères | face | élévation contrôlée jusqu’à hauteur d’épaules, retour lent |
| `curl-barre` | Curl à la barre | côté | coudes stables, flexion puis extension contrôlée |
| `squat-barre` | Squat à la barre | côté / trois-quarts | descente et remontée, alignement général genoux-pieds, tronc gainé |
| `presse-cuisses` | Presse à cuisses | côté | flexion contrôlée sans décollement du bassin, poussée sans verrouillage brutal |
| `sdt-roumain` | Soulevé de terre roumain | côté | hanches vers l’arrière, barre près des jambes, retour par extension de hanche |
| `hip-thrust` | Hip thrust à la barre | côté | descente, extension de hanche, arrêt en haut sans hyperextension lombaire |
| `crunch` | Crunch au sol | côté | enroulement du haut du tronc, nuque neutre, retour contrôlé |
| `planche` | Planche (gainage) | côté, pose statique | alignement tête-tronc-bassin-talons, respiration suggérée sans animation cyclique |

Les mouvements sont stylisés et didactiques, sans prétendre reproduire chaque morphologie ni une simulation anatomique. La planche est une pose statique avec repères visuels, pas une boucle de mouvement artificielle. Les équipements nécessaires sont représentés par des formes simples et reconnaissables.

## 5. Où le lecteur apparaît

### V1 — emplacement principal
- **Bibliothèque `/exercices` :** dans la fiche détaillée de l’exercice sélectionné, au-dessus des consignes d’exécution. Le lecteur est visible uniquement quand une démonstration publiée existe.
- La carte de liste ne lance pas automatiquement l’animation et n’affiche pas de miniatures animées en boucle.
- Le lecteur et son état ne doivent pas faire perdre la sélection de l’exercice lors d’une recherche ou d’un filtre.

### Points d’entrée préparés pour la suite
- **Programme/jour :** sur la ligne d’un exercice planifié, une action « Voir la démonstration » ouvre le même lecteur dans un panneau/dialogue léger. Hors périmètre de cette première intégration tant que la gestion complète des exercices planifiés n’est pas prête.
- **Séance en direct :** le lecteur peut être ouvert depuis la carte de l’exercice actif, sans bloquer la saisie des séries ni démarrer automatiquement. À réaliser avec la Phase 4.
- Il ne faut pas dupliquer le lecteur ou créer une deuxième source de vérité par écran : construire un composant réutilisable recevant `exerciseId` ou une démonstration résolue.

## 6. Lecteur : commandes et comportement

Commandes proposées :
- **Lire / Pause** (bouton explicite, état annoncé au lecteur d’écran).
- **Rejouer** pour revenir au début et relancer.
- **Vitesse** : `0,5×`, `1×` (par défaut), `1,5×`; la vitesse modifie le temps de lecture, pas les positions finales.
- **Étapes** : boutons « Départ », « Mouvement », « Retour » si la séquence possède ces phases. La planche expose une vue statique et les repères utiles, sans commandes inutiles.
- **Réduire / développer les consignes** si cela améliore la lisibilité sur mobile ; les consignes principales restent disponibles en texte hors du dessin.
- Aucun son, aucune narration automatique, aucune lecture automatique, aucun contrôle nécessitant le survol.

Règles :
- lecture déclenchée uniquement par l’utilisateur ;
- fin de séquence : pause sur une pose finale clairement identifiable, avec possibilité de rejouer ; boucle continue désactivée par défaut ;
- changement d’exercice : arrêter et réinitialiser l’animation précédente ;
- quand l’onglet/page devient masqué, mettre en pause pour éviter une animation qui tourne inutilement ;
- si l’animation ne se charge pas, afficher une illustration/pose statique de repli et conserver description et consignes ;
- les contrôles restent utilisables au tactile, à la souris et au clavier ; cibles tactiles d’au moins 44 × 44 px.

## 7. Accessibilité et mouvement réduit

Cibles : WCAG 2.2 AA pour les parcours concernés, sans revendiquer une certification complète.

- Le lecteur a un nom accessible (ex. « Démonstration : squat à la barre ») et le dessin animé est `aria-hidden="true"` si la même information est déjà fournie par le résumé textuel, pour éviter de faire lire chaque image SVG.
- Les boutons ont des noms explicites, des états `aria-pressed` ou `aria-label` pertinents, et un focus clavier visible.
- Ne pas transmettre une consigne uniquement par la couleur, le mouvement ou une flèche : fournir un texte court, notamment pour la phase montrée.
- Pas de piège clavier ; ordre Tab logique ; Espace/Entrée active les boutons ; focus conservé lors du changement d’étape.
- Contraste du texte et des contrôles conforme à WCAG AA ; ne pas afficher de texte essentiel dans une image.
- Respect de `prefers-reduced-motion: reduce` dès le premier rendu et en cas de changement de préférence système :
  - remplacer la séquence animée par une pose statique/illustration et une séquence d’étapes manuelles ; ne pas lancer de mouvement automatique ;
  - si l’utilisateur appuie explicitement sur « Lire », proposer une progression discrète contrôlée par l’utilisateur seulement si cela reste compatible avec sa préférence, sinon rester en mode étapes statiques. Recommandation V1 la plus prudente : **mouvement réduit = mode statique par défaut et lecture animée désactivée**, avec étapes consultables manuellement ;
  - annuler les transitions décoratives et les déplacements de caméra ; aucun clignotement ou effet de zoom rapide ;
  - garder toutes les instructions, commandes et informations disponibles.
- Une pause/lecture doit être disponible même si la séquence dure moins de 5 secondes ; ne pas dépendre uniquement de la règle WCAG sur le mouvement automatique, puisque l’animation est une fonction didactique.
- Tester avec le réglage système du navigateur `prefers-reduced-motion: reduce`, ainsi qu’au clavier et avec un lecteur d’écran lorsque possible.

## 8. Ressources externes, licences et propriété intellectuelle

**Recommandation : les animations originales codées suffisent pour la V1.** Aucune ressource externe libre n’est techniquement nécessaire, car le dessin vectoriel peut représenter les articulations, le matériel et la trajectoire. Cela réduit le poids, évite les dépendances réseau, facilite l’accessibilité et garde une identité visuelle homogène.

Les bibliothèques d’animations externes (Lottie, vidéos, GIF, modèles 3D, photos) ne sont pas requises pour ce périmètre. Si l’utilisateur décide ultérieurement d’en ajouter :
- vérifier explicitement la licence de chaque ressource et le droit d’usage commercial, d’adaptation et de redistribution ;
- conserver la source, la licence, l’auteur et la date de vérification dans un registre ;
- ne jamais reprendre ou incorporer une vidéo/image trouvée en ligne sans preuve de licence compatible ;
- ne pas ajouter d’URL externe ou de ressource distante à la base en l’absence d’approbation.

Les dessins originaux peuvent être créés à partir de formes SVG (segments articulés, cercles, trajectoires, banc/barre/haltères/machines) et animés avec des keyframes ou des étapes contrôlées par React. Pas besoin d’ajouter une dépendance motion dédiée dans un premier temps ; privilégier SVG et CSS natifs et n’introduire une bibliothèque que si un prototype prouve qu’elle apporte une valeur réelle.

## 9. Performance et robustesse

- Pas de fichier vidéo lourd ni de téléchargement distant ; les animations restent dans le bundle et ne se rendent que dans la fiche/panneau ouvert.
- Limiter le rendu à une démonstration active à la fois.
- Utiliser `transform`/SVG plutôt que d’animer des propriétés de mise en page ; éviter les boucles React image par image.
- Arrêter les demandes de frame/animation à la pause, à la fermeture du lecteur et au démontage du composant.
- L’animation ne doit jamais retarder l’ouverture de la fiche, les saisies ou le démarrage d’une séance.
- En mode hors ligne, les démonstrations publiées dans le bundle doivent fonctionner comme le reste de l’interface.

## 10. Hors périmètre V1

- création d’animations par l’utilisateur ou génération par IA en direct ;
- éditeur de séquences dans l’application ;
- vidéos externes, narration audio, voix, musique ;
- animations de tous les exercices personnalisés ;
- visualisation anatomique 3D ou correction automatique de posture par caméra ;
- lecteur intégré au flux de séance en direct et aux programmes (points d’entrée futurs, pas la première livraison) ;
- statistiques d’utilisation ou télémétrie du lecteur.

## 11. Critères d’acceptation

1. Les 14 exercices listés ont chacun une démonstration originale identifiée par un `animationKey` autorisé, ou un repli documenté si l’animation d’un exercice n’est pas prête.
2. La fiche d’exercice affiche le lecteur au-dessus des consignes et n’exécute rien automatiquement.
3. Lecture, pause, rejouer, vitesse et étapes fonctionnent au clavier et au tactile ; fin de séquence sans boucle continue.
4. En changeant d’exercice, la séquence précédente s’arrête et le bon exercice est affiché.
5. `prefers-reduced-motion: reduce` active le mode statique et empêche la lecture animée automatique ; aucun contenu n’est perdu.
6. Sans démonstration publiée ou en cas d’erreur, les consignes restent visibles et l’interface ne plante pas.
7. Aucune donnée historique ou prescription de programme/séance n’est modifiée.
8. Dexie et Supabase disposent d’une définition équivalente de `exercise_demonstrations`, avec contraintes et relations correspondantes, documentées et migrées sans écraser l’historique.
9. Aucune ressource externe n’est intégrée sans validation de licence.
10. Vérifications à exécuter avant livraison : `npm test`, `npm run build`, `git diff --check`, parcours responsive (1440 px, tablette, 390 px), clavier, tactile, `prefers-reduced-motion` et repli sans démonstration.

## 12. Décisions à valider avant de coder

Merci de valider ou modifier ces décisions :
1. **Modèle :** nouvelle table `exercise_demonstrations` (recommandée) plutôt qu’un seul champ sur `exercises`.
2. **Périmètre initial :** les 14 exercices du §4.
3. **Emplacement V1 :** lecteur uniquement dans la fiche de la bibliothèque ; programmes et séance en direct prévus ensuite.
4. **Contrôles :** lire/pause, rejouer, vitesse 0,5×/1×/1,5× et étapes manuelles.
5. **Mouvement réduit :** mode statique par défaut et lecture animée désactivée lorsque `prefers-reduced-motion: reduce` est actif.
6. **Ressources :** animations originales SVG/CSS codées, sans ressources externes ni nouvelle dépendance au départ.
7. **P3-02 :** reste en pause jusqu’à décision explicite de reprise.

Aucun code fonctionnel ne doit être écrit avant validation explicite de cette spécification.
