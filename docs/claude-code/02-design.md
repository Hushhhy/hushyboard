# 02 · Design

Direction **« Cadran & Vitrine »**: dark only, graphite surfaces, ivory text, one gold accent for Career, a calm and precise feel. Desktop first at 1280 × 800. The app must still work at 1024 px wide and be usable on a phone. Below 768 px the sidebar collapses into a top bar with a menu button.

## Tokens: already in `app/globals.css`, use only these

| Group                          | Tailwind classes                                                                                                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surfaces (darkest to lightest) | `bg-surface-sunken`, `bg-surface-base`, `bg-surface-default` (cards), `bg-surface-raised` (focal card, hover, active), `bg-surface-overlay` (palette, panels, toasts), `bg-surface-control`                             |
| Lines                          | `border-line-subtle` (decorative), `border-line-strong` (component outlines)                                                                                                                                            |
| Text                           | `text-fg-1`, `text-fg-2`, `text-fg-3`                                                                                                                                                                                   |
| Action                         | `bg-action` / `hover:bg-action-hover` / `text-on-action` (primary button), `focus` ring                                                                                                                                 |
| Domains (+ `-deep`)            | `career` (gold, the only area with XP), `habits` (turquoise), `leisure` (orchid), `finance` (lavender)                                                                                                                  |
| Semantic                       | `success`, `warning`, `danger`, `info`, `bg-scrim`                                                                                                                                                                      |
| Radius                         | `rounded-tick` 2, `rounded-pill` 6, `rounded-control` 8, `rounded-card` 14, `rounded-panel` 16                                                                                                                          |
| Text styles                    | `text-display-40/30/24/20` (with `font-display`), `text-kpi-30`, `text-title-20/18`, `text-body-16/14`, `text-caption-12`, `text-label-12` (add `uppercase`)                                                            |
| Shadows                        | `shadow-raised`, `shadow-overlay`                                                                                                                                                                                       |
| Motion                         | `--ease-out-soft`, `--ease-spring`, `--duration-tick` 110 ms / `open` 160 / `change` 240 / `max` 400 / `celebrate` 1200; `animate-toast-in`, `palette-in`, `title-up`, `medal-flip`, `level-ring`; variant `no-motion:` |
| Numbers                        | `tabular` utility on every figure                                                                                                                                                                                       |

**Spacing** uses the standard Tailwind scale. Figma `espace/16` maps to `p-4`.

**Fonts**: `--font-plex` (IBM Plex Sans, UI) and `--font-bricolage` (Bricolage Grotesque, display), loaded in `app/fonts.tsx`.

The Figma variables still have French names. Translate them as follows:

| Figma (French)                                                                  | Code (English)                                                      |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `couleur/surface/creuse`, `fond`, `defaut`, `sureleve`, `superpose`, `controle` | `surface-sunken`, `base`, `default`, `raised`, `overlay`, `control` |
| `ligne/separateur`, `contour`                                                   | `line-subtle`, `strong`                                             |
| `texte/1`, `2`, `3`                                                             | `fg-1`, `2`, `3`                                                    |
| `action/fond`, `survol`, `texte`                                                | `action`, `action-hover`, `on-action`                               |
| `domaine/carriere`, `habitudes`, `loisirs`, `finances` (`-profond`)             | `career`, `habits`, `leisure`, `finance` (`-deep`)                  |
| `semantique/succes`, `alerte`, `erreur`, `info`                                 | `success`, `warning`, `danger`, `info`                              |
| `voile`                                                                         | `scrim`                                                             |
| `rayon/cran`, `pastille`, `controle`, `carte`, `panneau`                        | `tick`, `pill`, `control`, `card`, `panel`                          |
| Text style `UI/Titre`                                                           | `title-*`                                                           |
| `UI/Texte`                                                                      | `body-*`                                                            |
| `UI/Legende`                                                                    | `caption-12`                                                        |
| `UI/Etiquette`                                                                  | `label-12`                                                          |

## Rules

- One primary button per screen (`bg-action`). Use secondary or quiet for the rest.
- A domain color always comes with an icon **and** a label.
- No emoji, no decorative gradients, no backdrop blur.
- Cards have no border and no shadow, except the single focal card, which uses `surface-raised` and `shadow-raised`.
- Skeletons are static, with no looping shimmer. Errors stay on screen until fixed and are never toasts. Every action can be undone, except deletion, which goes through the one confirmation modal.
- Respect `prefers-reduced-motion` and `<html data-animations="off">`.
- Icons are hand-made SVGs (20×20 viewBox, 1.6–1.7 stroke, `currentColor`) in `components/icons.tsx` using `createIcon`. New icons the v2 screens need: mail, label (tag), download, copy, external link, sparkle (AI), unsubscribe (mail with a slash), code, star, folder, file, pin, sync. Their paths are in `mockups/screens-v2.html` (`<symbol id="i-mail">` etc.).

## Where each screen is drawn

**Figma file**: `https://www.figma.com/design/EdNtBzx0aA0SHVfKYuksZJ`, page « Écrans ». **Primary source = the PNG exports** in `docs/claude-code/mockups/figma/` (1280 px wide). Only use the Figma MCP if a detail is unreadable on a PNG: the Starter quota is tiny, so at most one `get_design_context` per frame.

| Screen                                  | PNG (`mockups/figma/`)                   | Figma node | Notes                                                                                                                                      |
| --------------------------------------- | ---------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Accueil                                 | `v1-home.png`                            | `4:2`      | Implemented. Keep the full-height grid.                                                                                                    |
| Recherches pro · Candidatures           | `v1-job-search-applications.png`         | `11:101`   | v1, still valid                                                                                                                            |
| Recherches pro · Veille                 | `v1-job-search-watch.png`                | `13:169`   | v1 layout. Content is now full stack and the tabs include « Candidatures spontanées ».                                                     |
| Recherches pro · Analyses               | `v1-job-search-analytics.png`            | `14:310`   | v1, the job-search statistics tab                                                                                                          |
| Carrière · Progression                  | `v1-career-progress.png`                 | `13:1062`  | v1. Nav label « Progression », route `/career/progress`                                                                                    |
| Carrière · CV                           | `v1-career-resume.png`                   | `15:923`   | v1. Some card texts are clipped in Figma: fix that in code.                                                                                |
| Carrière · Certifications               | `v1-career-certifications.png`           | `15:1371`  | v1. Cards hug their content.                                                                                                               |
| **v2 · Carrière · Profil**              | `v2-career-profile.png`                  | `31:598`   | New skills grid, tools, objectives                                                                                                         |
| **v2 · Carrière · Profil · JavaScript** | `v2-career-profile-skill-javascript.png` | `32:715`   | **Superseded**: the skill page is now a roadmap + notion sheet + reference list (`screens-v2.html`). Keep only its header and level medal. |
| **v2 · Recherches pro · Offre**         | `v2-job-search-offer.png`                | `33:789`   | CV analysis and cover letter                                                                                                               |

In Figma, display-font titles (Bricolage Grotesque Bold) may look dark or struck through in exported images. That is a rendering artefact: titles are `text-fg-1`.

The v1 frames still show the old sidebar (with Comics and without Mails). The v2 frames show the correct sidebar.

**HTML mockups** (open them in a browser, 1280 × 800 each):

- `mockups/screens-v1.html`: Cours, Habitudes ×3, Jeux vidéo, Finances ×3, Connexion, Mentions légales, ⌘K palette, side panel, level-up, deletion modal, empty/error states. **Ignore Comics** (dropped) and update the sidebar to v2.
- `mockups/screens-v2.html`: Compétence (roadmap + notion sheet, reference list), Projets (list, README, code), Candidatures spontanées, Mails (recruiter reply detected, newsletter and unsubscribe, label menu, new label dialog).

**Component specs** (French, with old French class names that you must translate into English): `design/components.md`. It lists 22 components with states, tokens, accessibility and motion. Follow it for buttons, status pills, habit checkbox, rulers, bars, nav, tabs, month picker, level medal, trophies, cards, empty/skeleton/error states, undo feedback, reward toast, side panel, delete modal and ⌘K palette.
