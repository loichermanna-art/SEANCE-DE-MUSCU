# Plan motion — Interface GYM OS

**Statut : proposition à valider par l'utilisateur avant toute implémentation motion.**

## Source et contexte

Ce plan exploite la pièce jointe Gmail `Guide-Motion-Design-Premium.pdf` (message « GUIDE MOTION DESIGN », version octobre 2026), en particulier les principes des sections 0–3, 7–8 et 10–13. Il les adapte à GYM OS plutôt que de reprendre les effets prévus pour un site vitrine.

Le dernier état visuel du dépôt est un **thème clair premium** : fond gris très léger, surfaces blanches, accent bleu, composants sobres et navigation responsive. La page Programmes, elle, reste encore un écran d'attente ; son CRUD ne fait pas partie de cette passe.

## 1. Plan motion

### Sujet

- **Activité :** application de musculation pour organiser des programmes, réaliser des séances et suivre la progression.
- **Public :** personnes qui viennent accomplir une tâche rapidement, souvent sur téléphone ou en salle.
- **Mission de l'interface :** rendre l'information claire et permettre une action immédiate, sans spectacle ni attente.
- **Type / intensité :** application / tableau de bord — intensité **fonctionnelle**, selon le guide (§10).

### Métaphore

- **Objet / geste :** carnet de séance, séries et répétitions, jours qui s'ordonnent dans un programme.
- **Matière / rythme :** repères nets et précis, comme une série validée dans un carnet ; rythme court, stable, sans rebond décoratif. La palette claire et le bleu de GYM OS restent inchangés.
- **Signature :** un repère bleu actif se déplace vers le bon élément (navigation, onglet, jour sélectionné). Lorsqu'un jour de programme est réellement réordonné, sa carte se déplace vers sa nouvelle place par FLIP. Le mouvement rend visible une vraie sélection ou un vrai changement d'ordre : il n'invente aucune statistique.
- **Geste récurrent :** indicateur bleu de sélection, discret et cohérent entre navigation et sélection d'un jour.
- **Vie ambiante :** aucune animation en boucle. L'interface est immobile lorsqu'aucune action n'est en cours.

### Jetons

| Nom | Valeur | Usage limité |
|---|---|---|
| Courbe signature `out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrées très courtes et franches |
| `inOut` | `cubic-bezier(0.76, 0, 0.24, 1)` | Réorganisation FLIP d'éléments |
| `d1` | 150 ms | Survol, pression, focus/selection |
| `d2` | 250 ms | Navigation, filtre, confirmation, apparition d'un résultat |
| `d3` | 400 ms maximum | Ouverture d'un panneau non bloquant, si nécessaire |
| Distance | 8 px par défaut, 16 px maximum | Micro-déplacement, jamais un grand glissement |
| Stagger | absent par défaut ; 30–60 ms si une courte liste le justifie | Ne jamais retarder un parcours ou faire défiler les cartes une à une longtemps |

Les animations portent seulement sur `transform`, `opacity`, `clip-path` et les tracés SVG. Pas de transition animée de `height`, `width`, `top`, `left`, `margin` ou des ombres. Pour des éléments qui changent de place, employer FLIP/layout, sans boucle de rendu React par image. Garder une seule source de jetons motion.

### Storyboard

| Écran/élément | Animation | Déclencheur | Durée | Ce que cela signifie |
|---|---|---|---:|---|
| Chargement de l'application | Aucune intro ni préchargeur ; afficher immédiatement le contenu ou des squelettes non bloquants si une lecture locale est en cours | Démarrage | 0 ms de blocage | GYM OS est un outil, la vitesse prime |
| Navigation desktop/mobile | Le repère actif glisse brièvement vers la route sélectionnée ; couleur/fond répond immédiatement | Navigation clavier, clic ou tactile | 150–250 ms | Situe la page active |
| Dashboard et données | Squelettes discrets puis remplacement sans décalage excessif ; pas d'apparition spectaculaire des cartes | Chargement Dexie/Supabase | 150–250 ms | Distingue chargement et données disponibles sans inventer de chiffres |
| Bibliothèque d'exercices | Résultats filtrés se réorganisent brièvement ; le focus reste sur le filtre | Recherche/filtre | 150–250 ms | Montre le changement de contenu sans interrompre la recherche |
| Programme/jour sélectionné | Repère bleu se déplace ; panneau sélectionné apparaît sans grand déplacement | Sélection | 150–250 ms | Signale l'élément actif |
| Jour ajouté/réordonné | FLIP de la carte dans la liste réelle ; commandes « monter/descendre » restent utilisables au clavier | Action utilisateur | 250–400 ms | Rend lisible le nouvel ordre du plan |
| Enregistrement | Petit état « Enregistrement… » puis « Enregistré » ou erreur en texte ; coche SVG tracée une fois si succès | Réponse réelle du stockage | 150–250 ms | Confirme le résultat réel, jamais une animation de succès anticipée |
| Dialogue/modal | Opacité + échelle discrète `0.98 → 1`; fermeture plus rapide, focus clavier géré | Ouvrir/fermer | 150–250 ms | Garde l'attention sur l'action sans effet théâtral |

## 2. Principes d'interface pour rester fidèle au site

- Conserver le thème clair et les composants visuels existants ; le motion doit les compléter, pas provoquer une refonte supplémentaire.
- Garder les interactions principales disponibles immédiatement. Les transitions accompagnent une action, elles ne la retardent jamais.
- Ne jamais inventer des poids, records, pourcentages ou séries pour animer un écran vide.
- Les messages d'erreur et de succès restent lisibles en texte et ne reposent pas uniquement sur une couleur ou un mouvement.
- Aucun mouvement permanent, défilement lissé imposé, curseur personnalisé, parallaxe, préchargeur, animation 3D ou bouton qui pulse.

## 3. Adaptations et qualité

- **Réduction des animations :** respecter `prefers-reduced-motion: reduce` ; annuler déplacements/échelles et rendre les changements d'état instantanés. Aucun contenu ne doit dépendre de l'animation.
- **Téléphone / tactile :** pas de curseur ou magnétisme ; zones de commande d'au moins 44 px ; pas de scroll horizontal ajouté ; raccourcir les transitions autour de 150–200 ms.
- **Clavier :** ordre de tabulation logique, focus visible, Entrée/Espace pour les actions, Échap pour fermer les dialogues et restitution du focus au déclencheur.
- **Contenu sans JavaScript :** ne pas cacher du texte en attente d'un observateur. Dans la PWA React, le contenu reste visible dès son rendu.
- **Tests de validation avant livraison :** desktop 1440 px, tablette, mobile 390 px, `prefers-reduced-motion`, parcours clavier, aucun débordement horizontal, aucun contenu caché et commandes réactives ; lancer `npm test` et `npm run build`.

## 4. Périmètre proposé et étape suivante

Cette proposition concerne uniquement un **système de motion discret pour l'interface existante**, avec un exemple précis pour l'organisation des jours de programme. Elle ne commence pas P3-02 (CRUD) ni P3-04 (écran fonctionnel complet).

Après validation par l'utilisateur, les jetons et les micro-interactions pourront être implémentés sur les composants/navigation existants. Les animations du futur écran Programmes seront ajoutées avec son implémentation, conformément à cette spécification. Aucun nouveau paquet motion ne sera ajouté sans justification et accord.
