# Hushyboard : inventaire des composants

> **Code en anglais (décision d'Alex)** : tokens, classes, fichiers, composants et commentaires sont en anglais ; seuls les textes affichés restent en français.
> Correspondance avec les variables Figma (encore en français, à renommer quand le quota MCP revient) :
> `couleur/surface/creuse|fond|defaut|sureleve|superpose|controle` → `surface-sunken|base|default|raised|overlay|control` ·
> `couleur/ligne/separateur|contour` → `line-subtle|strong` · `couleur/texte/1|2|3` → `fg-1|2|3` ·
> `couleur/action/fond|survol|texte` → `action|action-hover|on-action` · `couleur/domaine/carriere|habitudes|loisirs|finances` → `career|habits|leisure|finance` (`-profond` → `-deep`) ·
> `couleur/semantique/succes|alerte|erreur|info` → `success|warning|danger|info` · `couleur/voile` → `scrim` ·
> `rayon/cran|pastille|controle|carte|panneau` → `radius-tick|pill|control|card|panel` ·
> styles `UI/Titre` → `title-*`, `UI/Texte` → `body-*`, `UI/Legende` → `caption-12`, `UI/Etiquette` → `label-12`.

Direction « Cadran & Vitrine » (D2). Tous les tokens viennent de `globals.css` et portent le même nom que dans Figma (`couleur/surface/defaut` = `--color-surface-default` = classe `bg-surface-default`).

## Comment lire ce document

- **Ordre** : du plus fondamental (bouton, icône) au plus composé (palette ⌘K). Chaque composant n'utilise que des composants déjà décrits au-dessus.
- **Espacements** : échelle standard de Tailwind (1 unité = 4 px). `h-9` = 36 px, `p-4` = 16 px, `gap-2` = 8 px. Dans Figma, `espace/16` correspond à `p-4` : on divise la valeur Figma par 4. Échelle autorisée (en px) : 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96 → classes 0.5, 1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24. Hauteurs de contrôle autorisées : 24, 32, 36.
- **Difficulté pour Alex** (en supposant React + Tailwind de base, pas les patterns ARIA avancés) :
  - **Acquis** : HTML sémantique + classes Tailwind, rien de nouveau.
  - **Partiel** : une notion nouvelle (variante `peer`, région `aria-live`, gestion du focus, `loading.tsx`).
  - **À apprendre** : pattern ARIA complet avec clavier (roving tabindex, `aria-activedescendant`), ou orchestration d'animations.
- **Règles transversales** (valables pour tous les composants) :
  - Focus : géré globalement par `:focus-visible` (anneau `--color-focus` 2 px, décalé de 2 px). Ne jamais le supprimer, ne jamais le colorer avec une couleur de domaine.
  - Cible cliquable ≥ 24 × 24 px, idéalement 32 × 32.
  - Couleur de domaine = toujours doublée d'une icône **et** d'un libellé.
  - Libellés fonctionnels clairs (« Postulé », « Ajouter une dépense ») ; la mythologie n'apparaît que dans les titres de niveaux et les noms de trophées.
  - Aucun emoji, aucun dégradé décoratif, aucun flou d'arrière-plan.
  - Toute action est annulable (sauf suppression, qui passe par la modale).
  - Mouvement : `duree-coche` 110 ms, `duree-changement` 240 ms, jamais plus de 400 ms hors célébration de niveau. Tout s'arrête sous `prefers-reduced-motion` ou `<html data-animations="off">` (déjà géré par `globals.css`). Côté JS, lire les deux avant de lancer une célébration :

```ts
// lib/animations.ts : à utiliser avant toute animation pilotée en JS
export function animationsActives(): boolean {
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coupe = document.documentElement.dataset.animations === 'off';
  return !reduit && !coupe;
}
```

---

## 1. Icône et emblème

- **Rôle** : pictogrammes SVG maison (trait 1,6 px, viewBox 20 × 20) et emblèmes de domaine (hexagone ascendant Carrière, calendrier coché Habitudes, étoile éclatée Loisirs, pièces Finances).
- **Variantes** : 12, 14, 16, 18, 20 px ; couleur héritée (`currentColor`).
- **Tokens** : `text-domaine-*` pour un emblème de domaine, `text-fg-3` pour une icône de navigation au repos, `text-fg-1` à l'état actif.
- **Accessibilité** : toujours `aria-hidden="true"` ; le sens vient du libellé texte à côté. Si une icône est seule dans un bouton, le nom va sur le bouton (`aria-label`), pas sur le SVG.
- **Mouvement** : aucun.
- **Difficulté** : Acquis. Conseil : un composant `<Icone nom="cv" className="size-4.5" />` qui lit un objet `{ cv: <path …/> }`.

## 2. Bouton (principal / secondaire / discret / icône)

- **Rôle** : déclencher une action. **Un seul bouton principal par écran** ; sur la carte « Nouvelle offre », Postulé et Refusé sont secondaires.
- **Variantes** :
  - _Principal_ : fond ivoire `bg-action`, texte `text-on-action`, survol `bg-action-hover`, appui : descend de 1 px.
  - _Secondaire_ : `bg-surface-overlay`, contour `border-line-subtle`, survol `border-line-strong`. Posé sur une surface superposée (toast, panneau) : `bg-surface-control`.
  - _Discret_ : sans fond, `text-fg-2`, soulignement qui apparaît au survol.
  - _Icône_ (fermer, mois précédent) : carré 32 × 32, `aria-label` obligatoire.
- **États** : repos, survol, focus (anneau global), actif (appui), désactivé (`opacity-55`, curseur par défaut), chargement (libellé conservé + « … », `aria-busy="true"`, bouton désactivé pendant l'envoi).
- **Tokens** : `h-9`, `px-4`, `gap-2`, `rounded-control`, `text-fg-14 font-semibold`, `duree-coche`, `ease-out-soft`.
- **Accessibilité** : `<button type="button">` (jamais un `<div>`). Libellé = verbe du domaine. Contraste texte principal 15,3:1. Hauteur 36 px (≥ 24). Pour un bouton désactivé qui doit rester focusable (expliquer pourquoi), utiliser `aria-disabled="true"` au lieu de `disabled`.
- **Mouvement** : couleur de fond 110 ms linéaire, translation d'appui 110 ms `ease-out-soft`.
- **Difficulté** : Acquis.

```tsx
// Classes de base, à factoriser dans un composant <Bouton variante="principal">
const base =
  'inline-flex h-9 items-center justify-center gap-2 rounded-control px-4 ' +
  'text-fg-14 font-semibold whitespace-nowrap ' +
  'transition-[background-color,border-color,translate] duration-(--duration-tick) ease-out-soft ' +
  'disabled:opacity-55 disabled:cursor-default';
const variantes = {
  principal: 'bg-action text-on-action hover:bg-action-hover active:translate-y-px',
  secondaire: 'border border-line-subtle bg-surface-overlay text-fg-1 hover:border-line-strong',
  discret:
    'px-2 text-fg-2 underline decoration-transparent underline-offset-3 hover:text-fg-1 hover:decoration-current',
};
```

## 3. Pastille de statut de candidature

- **Rôle** : afficher l'un des 7 statuts. La couleur ne porte que la forme et le contour ; le libellé reste ivoire.
- **Variantes (forme + libellé)** :

| Statut              | Forme                                | Couleur (contour + forme) |
| ------------------- | ------------------------------------ | ------------------------- |
| Envoyée             | flèche                               | `fg-2`                    |
| En attente          | sablier                              | `fg-3`                    |
| Entretien RH        | disque plein                         | `info`                    |
| Entretien technique | chevrons `< >`                       | `info`                    |
| Offre               | hexagone plein                       | `career`                  |
| Refusée             | croix                                | `danger`                  |
| Sans réponse        | cercle pointillé + contour pointillé | `fg-3`                    |

- **États** : statique. Si la pastille sert de filtre, elle devient un `<button aria-pressed>` avec survol `bg-surface-raised`.
- **Tokens** : `h-6`, `px-2`, `gap-1`, `rounded-pill`, `border`, `bg-surface-default`, `text-caption-12 font-semibold`, libellé `text-fg-1`.
- **Accessibilité** : forme `aria-hidden`, le texte suffit. Contours ≥ 3:1 sur toutes les surfaces. Deux statuts partagent la couleur info (RH et technique) : la forme et le libellé les distinguent.
- **Mouvement** : changement de statut = couleur en 240 ms, rien d'autre.
- **Difficulté** : Acquis. Conseil : un objet `STATUTS` typé (`as const`) qui associe statut, libellé, forme et classe de couleur.

## 4. Case d'habitude (à faire / faite / pause)

- **Rôle** : cocher une habitude du jour. Pas d'XP pour les habitudes.
- **Variantes** :
  - _À faire_ : carré 24 × 24, contour 1,5 px `border-line-strong`, fond transparent.
  - _Faite_ : aplat `bg-habits`, coche tracée en `text-surface-sunken`.
  - _Pause_ (congés) : pas de case cochable ; contour pointillé `fg-3`, icône pause, série affichée gelée en `fg-3`.
  - _Jour non actif_ (ex. samedi pour une habitude lun–ven) : l'habitude n'apparaît pas dans « Aujourd'hui ».
- **États** : repos, survol (la ligne entière prend `bg-surface-raised`), focus, appui (échelle 0,92), désactivé (pause).
- **Tokens** : `size-6`, `rounded-pill`, `border-[1.5px]`, `habits`, `line-strong`, `fg-3`, `ease-spring`.
- **Accessibilité** : préférer une vraie case `<input type="checkbox">` dans un `<label>` qui contient le nom de l'habitude : Espace coche, le nom est lu, et toute la ligne devient cliquable (cible bien plus grande que 24 px). En pause : `<span role="img" aria-label="Lecture : en pause jusqu'au 19 octobre">`. Contour 4,18:1, coche 12:1.
- **Mouvement** : coche tracée en 110 ms (`stroke-dashoffset`, retard 40 ms), appui en ressort ; compteur de série qui roule en 240 ms.
- **Difficulté** : Partiel (variante `peer-checked:` de Tailwind, `appearance-none`).

```tsx
<label className="grid grid-cols-[24px_1fr_auto_44px] items-center gap-3 rounded-control px-2 py-1 hover:bg-surface-raised">
  <span className="relative grid size-6 place-items-center">
    <input
      type="checkbox"
      checked={faite}
      onChange={() => basculer(id)}
      className="peer size-6 appearance-none rounded-pill border-[1.5px] border-line-strong
                 transition-[background-color,border-color,scale] duration-(--duration-tick) ease-spring
                 checked:border-habits checked:bg-habits active:scale-92"
    />
    {/* La coche se « dessine » quand la case est cochée */}
    <svg
      viewBox="0 0 14 14"
      aria-hidden="true"
      className="pointer-events-none absolute size-3.5 fill-none stroke-surface-sunken stroke-[2.4]
                    [stroke-dasharray:16] [stroke-dashoffset:16] peer-checked:[stroke-dashoffset:0]
                    transition-[stroke-dashoffset] delay-40 duration-(--duration-tick) ease-out-soft"
    >
      <path d="M3 7.4 5.8 10 11 4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
  <span className="text-fg-14 font-medium">{nom}</span>
  {/* … semaine (composant 5) et série (chiffres) */}
</label>
```

## 5. Semaine d'habitude (7 crans)

- **Rôle** : les 7 derniers jours d'une habitude, sur la ligne.
- **Variantes par jour** : fait (barre pleine `habits`), non fait (barre creuse, contour `line-strong` : correction de d2, voir `controle.md`), repos (point bas `line-strong`), pause (tiret `fg-3`), aujourd'hui (contour 1 px `fg-3` décalé).
- **Tokens** : barres 5 × 12 px, `gap-0.5`, `rounded-tick`.
- **Accessibilité** : `aria-hidden` ; l'info est portée par le texte de série (« Série : 12 jours ») et par l'onglet Historique (heatmap = un seul arrêt de tabulation + tableau équivalent).
- **Mouvement** : le cran du jour se remplit en 240 ms.
- **Difficulté** : Acquis.

## 6. Réglette graduée (XP / avancée du jour / lecture)

- **Rôle** : progression linéaire lue « comme un pied à coulisse » : des crans qui se remplissent.
- **Variantes** :
  - _XP Carrière_ : 10 crans, 10 px de haut, remplissage `career`, échelle 0 / milieu / max dessous. Réservée à la Carrière.
  - _XP du jour (plafond)_ : petite réglette 6 px sous la principale, « 60 / 80 XP aujourd'hui » ; plafond atteint : texte « Plafond du jour atteint : les prochaines actions comptent demain. » en `fg-2`, sans couleur d'alerte (P4 : l'XP informe, il ne punit pas). _Non dessinée dans d2, à valider._
  - _Avancée du jour_ (habitudes) : un cran par habitude active du jour, 6 px, `habits`.
  - _Lecture_ (comics) : 12 crans, 6 px, `leisure`.
- **États** : repos, en progression, complet, chargement (piste seule), vide (0, piste seule + valeur « 0 »).
- **Tokens** : piste `bg-surface-sunken`, `gap-0.5` (6 px) ou `gap-1` (10 px), `rounded-tick`.
- **Accessibilité** : `role="progressbar"` + `aria-valuemin`, `aria-valuemax`, `aria-valuenow` et `aria-valuetext="340 XP sur 500, niveau 4, Timonier"` ; la valeur est aussi écrite en clair à côté (`tabular`). Crans `aria-hidden`. Remplissage sur piste 12:1.
- **Mouvement** : un cran se remplit en 240 ms ; montée de niveau : crans allumés un à un (90 ms chacun, 30 ms d'écart).
- **Difficulté** : Partiel (calcul du remplissage par cran ; voir `setRuler` dans d2).

## 7. Barre horizontale de répartition

- **Rôle** : comparer quelques catégories (candidatures par statut, revenus/dépenses).
- **Variantes** : statuts (icône de statut + libellé + barre + valeur), finances (libellé + barre + montant).
- **États** : normal, vide (« Aucune candidature ce mois. » + action), chargement (barres à 0).
- **Tokens** : grille `grid-cols-[96px_1fr_24px]`, piste 8 px `bg-surface-sunken`, `rounded-tick`, couleurs de série constantes dans toute l'app (Sans réponse `fg-3`, Refus `danger`, Entretiens `info`, Revenus `finance`, Dépenses `fg-3`).
- **Accessibilité** : `<figure>` + `<figcaption>` (résumé phrase) + tableau `sr-only` équivalent. Barres triées décroissantes, axe à zéro, étiquettes directes, tabular tabulaires. Barres ≥ 3:1 sur la piste.
- **Mouvement** : largeur en 240 ms `ease-out-soft` quand la donnée change.
- **Difficulté** : Acquis.

## 8. Élément de navigation + barre latérale

- **Rôle** : navigation principale, toujours visible (244 px), icône + libellé.
- **Variantes** : élément (lien), titre de groupe de domaine (emblème coloré + libellé en capitales, non cliquable), compteur (« 1 »), bloc profil en bas.
- **États** : repos `text-fg-2`, survol `bg-surface-default text-fg-1`, page courante `bg-surface-raised text-fg-1` + trait 3 px `fg-1` à gauche (jamais une couleur de domaine), focus. Version réduite (64 px) : icônes seules, libellé en infobulle au survol **et** au focus.
- **Tokens** : barre `bg-surface-sunken` + `border-r border-line-subtle`, élément `h-9 px-2 gap-2 rounded-control text-fg-14 font-medium`, titre de groupe `text-label-12 uppercase text-fg-3`.
- **Accessibilité** : `<nav aria-label="Navigation principale">` + `<ul>`, `<Link aria-current="page">` (calculé avec `usePathname()`). Compteur : texte `sr-only` (« 1 offre à trier »), pas d'`aria-label` sur un `<span>` (ignoré par les lecteurs d'écran). Bouton de réduction : `aria-expanded` + `aria-controls`. Lien « Aller au contenu » avant la barre.
- **Mouvement** : fond et couleur en 110 ms ; réduction de la barre en 240 ms.
- **Difficulté** : Acquis (liens), Partiel (version réduite avec infobulles).

## 9. Onglets

- **Rôle** : sous-pages d'une rubrique, 1 à 2 mots (Habitudes : Aujourd'hui / Historique / Objectifs ; Recherches pro : Candidatures / Veille / Analyses ; Finances : Mois / Transactions / Import).
- **Variantes** : _onglets-liens_ uniquement (décision d'Alex, porte 3) : chaque onglet a son URL, ex. `/habitudes/historique`. Les onglets ARIA sans URL ne sont pas utilisés.
- **États** : repos `text-fg-2 font-medium`, survol `text-fg-1`, actif `text-fg-1 font-semibold` + soulignement 2 px `fg-1`, focus.
- **Tokens** : `border-b border-line-subtle`, `gap-1`, `px-2 pt-2 pb-3`, `text-fg-14`.
- **Accessibilité** : avec l'App Router, préférer les **onglets-liens** : `<nav aria-label="Habitudes">` + liens avec `aria-current="page"` (retour arrière, partage d'URL, aucun ARIA complexe). Onglets ARIA seulement sans URL : `role="tablist"` / `tab` / `tabpanel`, `aria-selected`, `aria-controls`, tabindex itinérant (seul l'onglet actif a `tabIndex=0`), flèches gauche/droite, Début/Fin.
- **Mouvement** : le soulignement change instantanément (ou glisse en 240 ms).
- **Difficulté** : Acquis (liens), À apprendre (onglets ARIA).

## 10. Sélecteur de mois

- **Rôle** : changer le mois affiché (Finances, Historique).
- **États** : mois courant (suivant désactivé), mois passé, premier mois disponible (précédent désactivé), chargement des données du mois.
- **Tokens** : boutons icône 32 × 32 (d2 : 24, au minimum légal), `rounded-control`, survol `bg-surface-overlay text-fg-1`, libellé `text-caption-12 font-semibold min-w-21 text-center`.
- **Accessibilité** : `role="group" aria-label="Mois affiché"` ; boutons `aria-label="Mois précédent : septembre"` ; libellé du mois dans `aria-live="polite"`. Désactivé : attribut `disabled` + `opacity-55`.
- **Mouvement** : tabular remplacés instantanément ; barres en 240 ms.
- **Difficulté** : Acquis.

## 11. Médaille de niveau

- **Rôle** : emblème du niveau Carrière (hexagone), numéro au centre, titre mythologique à côté (route des Argonautes : Mousse, Rameur, Vigie, Timonier, Argonaute, Héros, Demi-dieu, Olympien).
- **Variantes** : grande (80 × 88, point focal), petite (52, toast et historique).
- **États** : repos, montée de niveau (célébration), prochain niveau (pointillé, dans l'écran Progression).
- **Tokens** : fond `career-deep`, contour 2,5 px `career`, filet intérieur `career/35`, numéro `font-display text-display-30` (d2 : 36 px hors échelle), titre `font-display text-display-40`.
- **Accessibilité** : SVG `aria-hidden` ; le texte « Niveau 4 · Timonier » et « Encore 160 XP pour devenir Argonaute. » est du vrai texte. Numéro 7,7:1 sur fond profond.
- **Mouvement** : seule célébration forte (≈ 1,2 s, au plus une par session) : crans allumés un à un, `animate-medal-flip` (420 ms), 12 éclats d'or une seule fois, `animate-level-ring` (640 ms), titre qui monte (`animate-title-up`), puis toast. Jamais bloquante ; sans animation : l'état change directement et le toast apparaît.
- **Difficulté** : À apprendre (enchaînement temporisé + nettoyage des timers dans `useEffect`).

## 12. Trophée (obtenu / verrouillé) + Vitrine

- **Rôle** : récompenses de collection dans **tous** les domaines, sans XP. La Vitrine les expose comme une étagère.
- **Variantes** :
  - _Obtenu_ : emblème hexagonal (fond `domaine-*-profond`, contour et pictogramme `domaine-*`), nom en `fg-1` (14 fort), date ou exploit en `fg-2` (12).
  - _Verrouillé_ : contour pointillé `line-strong`, cadenas `fg-3`, nom `fg-2`, condition lisible en `fg-3` (« Décroche une première offre »). Pas de rareté artificielle, pas de compte à rebours.
  - _Vitrine (module)_ : 3 derniers trophées sur une étagère (trait 2 px `surface-overlay`), compteur « 7 / 32 trophées ».
  - _Vitrine (page)_ : grille par domaine + **historique des récompenses** (liste chronologique de tous les toasts reçus).
- **États** : repos, survol (fond `surface-raised`, emblème qui monte de 3 px), focus, vide (« Aucun trophée pour l'instant. Le premier arrive avec ta première candidature suivie. »).
- **Tokens** : emblème 40 × 44, `gap-2`, `rounded-t-controle` (d2 : 10 px hors échelle), `text-fg-14 font-semibold`, `text-caption-12`.
- **Accessibilité** : chaque trophée est un `<button>` qui ouvre le panneau de détail ; nom accessible = contenu (« Fil d'Ariane, 10 candidatures »). Verrouillé : ajouter « Verrouillé : » en `sr-only`. Étagère = `<ul>`. Texte verrouillé 6,7:1.
- **Mouvement** : survol en ressort 240 ms ; nouveau trophée : apparition dans l'étagère en 240 ms après le toast.
- **Difficulté** : Acquis.

## 13. Carte de module (défaut / point focal)

- **Rôle** : bloc de l'accueil (6 à 8 par écran, sans défilement à 1280 px).
- **Variantes** :
  - _Défaut_ : `bg-surface-default rounded-card p-4`, ni bordure ni ombre.
  - _Point focal_ (un seul par écran, Carrière sur l'accueil) : `bg-surface-raised shadow-raised p-6`.
  - En-tête commun : emblème du domaine + libellé `text-label-12 uppercase text-fg-3` + méta à droite (`normal-case tracking-normal font-medium`).
- **États** : chargement (spinner ou contenu squelette **dans** la carte, `aria-busy="true"`), vide (composant 14), erreur (composant 16 dans la carte), normal. Pas de survol sur la carte entière.
- **Tokens** : `surface-default`, `surface-raised`, `shadow-raised`, `rounded-card`, `gap-3` entre cartes.
- **Accessibilité** : `<section aria-labelledby="id-du-titre">`, titre en `<h2>`. La carte n'est jamais un grand lien (pas d'éléments interactifs imbriqués) ; un bouton « Détail » ouvre le panneau.
- **Mouvement** : aucun au repos ; au chargement de page, apparition orchestrée unique (fondu 240 ms, décalage 30 ms entre cartes), pas de fondu au défilement.
- **Difficulté** : Acquis.

## 14. État vide

- **Rôle** : expliquer quoi faire quand il n'y a pas de donnée, avec une action.
- **Variantes** : page entière (Finances de novembre), carte (module sans donnée), liste filtrée sans résultat (pas d'action principale, juste « Effacer les filtres »).
- **Tokens** : `border border-dashed border-line-strong rounded-card p-6`, emblème du domaine 28 px, titre `text-title-18` concret (« Novembre est vide. »), texte `text-fg-14 text-fg-2 max-w-[70ch]`.
- **Accessibilité** : simple texte + boutons, pas de région live. Le bouton principal de l'état vide n'existe que s'il n'y en a pas d'autre à l'écran.
- **Mouvement** : aucun.
- **Difficulté** : Acquis.

## 15. Squelette de chargement (+ indicateur par carte)

- **Rôle** : chargement de page (squelette) ; rechargement d'une carte (indicateur dans la carte) ; import CSV (réglette de progression déterminée).
- **Variantes** : squelette de page (`app/…/loading.tsx`), indicateur de carte, barre de progression d'import.
- **Tokens** : blocs `bg-surface-raised rounded-tick` aux dimensions du vrai contenu, posés sur `surface-default`.
- **Accessibilité** : zone `aria-busy="true"` + texte `sr-only` « Chargement des finances… ». Import : `role="progressbar"` avec valeur.
- **Mouvement** : **squelette statique** (pas de reflet qui boucle, voir `controle.md`). L'indicateur de carte peut tourner tant que le chargement dure ; s'il dépasse 5 s, il est remplacé par le texte « Toujours en chargement… » + « Réessayer ». Sous mouvement réduit : texte seul.
- **Difficulté** : Partiel (`loading.tsx` et `<Suspense>` de Next).

## 16. Message d'erreur persistant

- **Rôle** : signaler un échec ; **jamais en toast**, jamais d'auto-disparition. Il reste jusqu'à ce que le problème soit réglé ou qu'Alex le ferme.
- **Variantes** : dans une carte (le module ne charge pas), en tête de formulaire (résumé), sous un champ (erreur de saisie), en tête de page (connexion perdue).
- **Tokens** : `bg-surface-default`, bordure gauche 3 px `border-danger` (bordure colorée = état, autorisé), icône croix `text-danger`, titre `text-fg-14 font-semibold text-fg-1` (« Import impossible. »), cause et solution en `text-fg-2`, action secondaire « Réessayer ».
- **Accessibilité** : `role="alert"` seulement quand l'erreur apparaît après une action d'Alex (pas au chargement de page). Champ : `aria-invalid="true"` + `aria-describedby` vers le message. Le texte du message est ivoire ; le rouge ne porte que l'icône et la bordure (`danger` interdit sur `surface-control` : 4,42:1).
- **Mouvement** : apparition sans animation (une erreur ne se « célèbre » pas).
- **Difficulté** : Partiel.

## 17. Bannière « Données d'exemple »

- **Rôle** : signaler que l'app affiche des données de démonstration (premier lancement, captures).
- **Variantes** : étiquette dans la barre du haut (d2) ; bannière pleine largeur avec action « Remplacer par mes données ».
- **Tokens** : `text-caption-12 text-fg-3`, `border border-dashed border-line-strong rounded-pill px-2 py-0.5`.
- **Accessibilité** : texte simple, visible tant que les exemples existent. « Effacer les données d'exemple » passe par la modale de suppression.
- **Mouvement** : aucun.
- **Difficulté** : Acquis.

## 18. Retour d'action annulable

- **Rôle** : confirmer chaque action et proposer « Annuler » (Postulé/Refusé, ajout de dépense, cocher depuis la palette, déplacement de statut).
- **Variantes** : sur place (la carte remplace ses boutons par « Pastille Envoyée · Ajoutée au suivi. Annuler », comme d2) ; ligne de statut globale quand l'action vient de la palette.
- **Tokens** : `text-fg-14 text-fg-2`, bouton discret « Annuler ».
- **Accessibilité** : une région `role="status"` unique (présente dès le chargement, vide) annonce « Candidature ajoutée au suivi. » ; le focus va sur « Annuler » quand l'action a fait disparaître le bouton cliqué (sinon le focus serait perdu). Annuler reste disponible jusqu'à la prochaine action dans la même carte, sans minuterie.
- **Mouvement** : échange instantané ou fondu 110 ms. Mise à jour optimiste < 400 ms.
- **Difficulté** : Partiel (gestion du focus avec `useRef`, état précédent conservé pour annuler).

## 19. Toast de récompense

- **Rôle** : annoncer un niveau ou un trophée. Réservé aux récompenses (les erreurs n'y vont jamais).
- **Variantes** : niveau atteint, nouveau trophée, groupé (« 2 récompenses » quand elles arrivent ensemble).
- **États** : entrée, affiché (persistant), fermé (archivé dans l'historique de la Vitrine).
- **Tokens** : `bg-surface-overlay shadow-overlay rounded-panel p-4`, largeur 340 px, emblème 52 px, étiquette `text-label-12 uppercase text-career`, titre `font-display text-display-20`, texte `text-fg-14 text-fg-2`, boutons secondaire (`bg-surface-control`) « Voir la vitrine » + discret « Fermer », hauteur 32 (d2 : 30 px / 12 px).
- **Accessibilité** : le conteneur `role="status" aria-live="polite"` est rendu **vide dès le chargement** (sinon l'annonce est perdue) ; ne prend jamais le focus ; pas d'auto-disparition. Placé dans le DOM juste après l'en-tête pour être atteint au clavier ; Échap le ferme si le focus est dedans ; après « Fermer », le focus revient à un élément stable (titre de page).
- **Mouvement** : `animate-toast-in` (240 ms, 8 px vers le bas).
- **Difficulté** : Partiel (région live, contexte React global `useRecompenses()` pour empiler et archiver).

## 20. Panneau latéral de détail

- **Rôle** : détail d'un élément (candidature, trophée, dépense, cours) sans quitter la page. **Non modal**.
- **Variantes** : lecture (en-tête, pastille, `<dl>` clé/valeur, frise chronologique, actions) ; édition (formulaire dans le panneau).
- **États** : fermé, ouverture, ouvert, chargement (squelette interne), erreur (composant 16 interne).
- **Tokens** : largeur 400 px, `bg-surface-overlay shadow-overlay rounded-panel p-4`, titre `text-title-18`, bouton fermer icône 32 × 32 `bg-surface-raised`, boutons secondaires en `bg-surface-control`, contours sur `surface-control` en `fg-3`.
- **Accessibilité** : `<aside aria-labelledby="titre-panneau">` ; pas de piège à focus, pas de voile, le reste de la page reste utilisable. À l'ouverture, focus sur le titre (`tabIndex={-1}`) ; Échap ferme quand le focus est dans le panneau ; à la fermeture, focus rendu à l'élément qui l'a ouvert. Conseil Next : état dans l'URL (`?detail=bel-2026`) pour que Retour ferme le panneau.
- **Mouvement** : glisse de 16 px + fondu en 240 ms `ease-out-soft` ; fermeture 160 ms.
- **Difficulté** : Partiel (focus) à À apprendre (état d'URL avec `useSearchParams`).

## 21. Modale de suppression

- **Rôle** : seule modale de l'app : confirmer une suppression (irréversible, donc sans « Annuler » après coup).
- **Tokens** : voile `bg-scrim`, boîte `bg-surface-overlay shadow-overlay rounded-panel p-6`, titre `text-title-18` (« Supprimer la candidature Groupe Bel ? »), conséquence en `text-fg-2`, boutons « Annuler » (secondaire) + « Supprimer » (principal).
- **Accessibilité** : `<dialog>` natif ouvert avec `showModal()` : piège à focus, Échap et arrière-plan inerte sont fournis par le navigateur. Focus initial sur « Annuler » (le choix sûr). `aria-labelledby` + `aria-describedby`.
- **Mouvement** : `animate-palette-in` (160 ms).
- **Difficulté** : Partiel.

## 22. Palette ⌘K / Ctrl+K

- **Rôle** : cocher, ajouter, aller à, sans souris. Recherche insensible aux accents (« depense » trouve « dépense »).
- **Variantes** : déclencheur (faux champ dans la barre du haut, 300 × 36, `kbd ⌘K` ou `Ctrl K` selon l'OS) ; palette ouverte (champ 52 px, groupes, pied d'aide « ↑ ↓ choisir · ↵ valider · Échap fermer ») ; aucun résultat (« Aucune commande. Essaie « cocher » ou « dépense ». »).
- **États** : fermée, ouverte, option active (`bg-surface-control text-fg-1`), aucun résultat, action exécutée (palette fermée + retour annulable, composant 18).
- **Tokens** : boîte `w-140 bg-surface-overlay shadow-overlay rounded-panel`, option `h-9 px-3 gap-2 rounded-control text-fg-14 text-fg-2`, titre de groupe `text-label-12 uppercase text-fg-3`, raccourci sur option active en `text-fg-2` (pas `fg-3` : 4,40:1 sur `surface-control`), `kbd` en `bg-surface-overlay border-line-subtle rounded-pill`.
- **Accessibilité** : modale (décision d'Alex, porte 3) : voile `bg-scrim` derrière, `role="dialog"` + `aria-modal="true"` + `aria-label="Palette de commandes"`, focus piégé dans la palette, clic sur le voile ou Échap = fermer et rendre le focus au déclencheur ; champ `role="combobox"` avec `aria-expanded="true"`, `aria-controls` vers la liste, `aria-autocomplete="list"`, `aria-activedescendant` = id de l'option active ; liste `role="listbox"`, groupes `role="group" aria-labelledby`, options `role="option" aria-selected`. Le focus reste dans le champ. ↑/↓ (en boucle), Entrée exécute, Échap ferme et rend le focus au déclencheur. Raccourci global `metaKey || ctrlKey` + `k`, déclaré sur le bouton avec `aria-keyshortcuts="Meta+K Control+K"`. Nombre de résultats annoncé dans une région `role="status"` (« 3 commandes »).
- **Mouvement** : `animate-palette-in` (160 ms).
- **Difficulté** : À apprendre. Alternative gratuite : la bibliothèque `cmdk` gère l'ARIA et le clavier ; la coder soi-même est le meilleur exercice ARIA du projet.

---

## Ordre de construction recommandé pour `/styleguide`

Chaque étape s'appuie sur la précédente et se vérifie à l'écran avant de passer à la suite.

1. **Fondations** : coller `globals.css` et `fonts.ts`, puis une section « Tokens » qui affiche les surfaces, textes, domaines et sémantique (pastilles de couleur + nom du token), l'échelle typographique (Display 40 → Étiquette 12) et la démo `tabular`. Vérifier le zéro barré et les accents.
2. **Icône** (1) et **Bouton** (2) : les 4 variantes × tous les états, dont focus au clavier (Tab) et désactivé.
3. **Pastille de statut** (3) : les 7 statuts.
4. **Case d'habitude** (4) + **Semaine** (5) : les 3 états, cocher au clavier avec Espace.
5. **Réglette** (6) et **Barre de répartition** (7) : avec un curseur de démo pour changer la valeur.
6. **Carte de module** (13) : défaut et point focal, en y posant les composants 2 à 7.
7. **États** : **vide** (14), **squelette** (15), **erreur** (16), **Données d'exemple** (17), chacun dans une carte.
8. **Navigation** (8), **Onglets** (9, version liens), **Sélecteur de mois** (10).
9. **Médaille** (11) sans animation, puis **Trophée + Vitrine** (12).
10. **Retour d'action annulable** (18) puis **Toast de récompense** (19) avec un bouton de démo « Simuler un trophée ».
11. **Panneau latéral** (20) et **Modale de suppression** (21).
12. **Palette ⌘K** (22).
13. **Célébration de niveau** (11, partie animation) en dernier, avec l'interrupteur « Animations » (`data-animations`) affiché dans la page pour tester les deux modes.
