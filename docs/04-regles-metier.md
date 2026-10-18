# GYM OS — 04 · Règles métier (fonctions pures, testables)

Source : §8, §9, §10, §19 du cahier des charges. Toutes ces règles vivent dans
`src/domain/`, sans dépendance à React ni à la base de données, et sont couvertes
par des tests unitaires (§22.5).

## 1. Volume d'entraînement (§8.2)

```
Volume(exercice) = Σ (charge × répétitions) sur les séries VALIDÉES de type "travail"
```

- Les séries d'échauffement sont exclues du volume de travail.
- Exercices au poids du corps (charge = 0 ou inconnue) : **aucun volume affiché
  comme exact** — on affiche séries × répétitions (§8.2).
- Le volume n'est comparable qu'à exercice égal (§8.4).

## 2. Records (§8.4) — critères explicites

- **Charge max** : plus grande `load_value` sur une série validée.
- **Reps max à charge donnée** : groupé par charge.
- **Meilleur volume de séance** : par exercice, entre séances comparables.
- Un record n'est annoncé que s'il dépasse strictement la meilleure valeur
  antérieure connue. En l'absence d'historique : première référence, pas de « record ».

## 3. Progression double (§10.2) — jamais automatique

Pour un exercice configuré avec une plage `[min_reps, max_reps]` :

| Situation (dernière séance comparable) | Proposition affichée |
|---|---|
| Toutes les séries de travail < `max_reps` | « Conserve X kg, vise plus de répétitions » |
| Toutes les séries de travail ≥ `max_reps`, technique OK | « Tu peux essayer X + incrément kg » (incrément selon matériel : 2,5 kg barre, 1–2 kg haltères…) |
| Séries en baisse nette vs séance précédente | Aucune hausse proposée ; suggestion de vérifier récupération/technique |

L'utilisateur **accepte, refuse ou diffère** (§10.2). Rien n'est appliqué
silencieusement (principe n°5). Le RIR (§10.3) reste facultatif et ne déclenche
jamais à lui seul une hausse.

## 4. Stagnation (§10.4)

Signalée si, sur **≥ 3 expositions comparables** d'un même exercice, ni la charge
ni les répétitions (à charge égale) ne progressent. Le message propose des pistes
(régularité, sommeil déclaré, volume, technique) **sans prétendre identifier la cause**.

## 5. Récupération et adaptation (§9.4) — règles transparentes

Échelle de courbatures 0–4 (§9.3), par groupe musculaire, + drapeau
« douleur inhabituelle » distinct des courbatures.

| Situation | Règle | Message type |
|---|---|---|
| A — Aucune gêne, pas de douleur | Séance normale | « Récupération satisfaisante » |
| B — Courbatures légères (1) sur muscles ciblés | Séance maintenue, échauffement soigné | « Courbatures légères : échauffe-toi progressivement » |
| C — Courbatures modérées (2) | Séance maintenue avec prudence : charge initiale réduite ou −1 série proposées | « Commence plus léger, ajuste selon tes sensations » |
| D — Courbatures importantes (3) sur muscles ciblés | Proposer de réduire/déplacer le travail de ces muscles, ou une activité moins exigeante | « Muscles très courbaturés : réduis ou décale ce travail » |
| E — Douleur vive/inhabituelle ou sévérité 4 | **Déconseiller** le travail intense de la zone ; recommander un avis médical si limitation importante | Message de prudence explicite (§9.4 E) |

Gardes-fous (§9.5, non négociables) : jamais de hausse de charge malgré une
douleur inhabituelle ; une courbature n'est jamais présentée comme preuve de
progression ; aucune évaluation subjective n'est présentée comme un diagnostic ;
signaux d'alerte (douleur extrême + urines foncées) → évaluation médicale urgente.

Chaque recommandation affiche **la règle et les données qui l'ont déclenchée**
(« parce que tu as déclaré des courbatures 3/4 aux quadriceps ») — §9.6, §2.3.

## 6. Validation des saisies (§19.1)

- Charge : nombre ≥ 0 (0 = poids du corps), décimales autorisées (ex. 22,5 kg).
- Répétitions : entier ≥ 0. Durées : ≥ 0.
- Unités : stockées avec la valeur (`load_unit`), conversion uniquement à l'affichage.
- Dates en ISO 8601 UTC, affichage en fuseau local (§19.3).

## 7. Critères d'acceptation du socle (extraits du §22)

- [ ] Une séance en cours survit à un rechargement de page et peut être reprise.
- [ ] Modifier un programme ne change aucune séance terminée.
- [ ] Les graphiques n'affichent que des données réelles ; état vide sinon.
- [ ] Le calcul de volume et la progression double passent leurs tests unitaires.
- [ ] L'application s'installe en PWA et fonctionne hors-ligne.
