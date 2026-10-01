# Design system

## Philosophy

Interactive editorial design + architectural wayfinding + museum catalogue + a quiet game interface.
Mysterious, editorial, architectural, tactile, intelligent, premium, quietly futuristic, human, exploratory.

Three surfaces carry the THINK → ACT → DISCOVER rhythm:

- **Paper** (light, warm, faint grain) for thinking and discovering.
- **Night** (charcoal) for the City plate and the ACT screen. The one dark cartographic mode.
- **Brass wash** only for discoveries (the Codex unlocking).

One signal colour (a wayfinding vermilion) marks what is live: the primary button's square, routes on the map, the active quest, deltas, focus rings. Campaign tones (olive, teal, brass) appear only as small markers: progress ticks and timeline rules.

All values live in `src/styles/tokens.css`. **Raw hex values appear only there.**

## Colour tokens

| Token | Use |
| --- | --- |
| `--color-background` / `--color-surface` / `--color-surface-elevated` / `--color-surface-sunken` | Paper layers |
| `--color-text-primary` / `-secondary` / `-muted` / `-inverse` | Ink (muted ≥ 4.9:1 on paper) |
| `--color-border` / `--color-border-strong` | Hairlines / architectural rules (ink) |
| `--color-accent`, `--color-accent-hover`, `--color-accent-text`, `--color-accent-wash` | Signal. `accent-text` (≥ 5:1) whenever the signal is used as text |
| `--color-success`, `--color-warning`, `--color-danger` | Constraint met, storage warning, errors / destructive |
| `--color-quest-active` | Active quest surfaces |
| `--color-discovery`, `--color-discovery-wash` | Codex and reveal discoveries (brass, ≥ 4.7:1 on its wash) |
| `--color-locked` | Disabled / not yet open |
| `--night-*`, `--map-*` | Night surface and map layers |
| `--tone-olive`, `--tone-teal`, `--tone-brass` | Campaign markers |

## Typography

| Role | Family | Token / class |
| --- | --- | --- |
| Display, Hero, H1, H2 | Instrument Serif (one weight, plus italic) | `t-display`, `t-hero`, `t-h1`, `t-h2` (fluid `clamp`) |
| H3, body, labels | IBM Plex Sans 400/500/600 | `t-h3`, `t-body-lg`, body, `t-body-sm`, `t-label` (uppercase, tracked), `t-caption` |
| Data, codes, figures | IBM Plex Mono | `t-data` (tabular numbers) |

Quest titles are display serif ("Three Minutes"); the quest code is mono ("QUEST 015 / TIME BENDER / THE STATION"); subtitles are italic serif. Numbers in reveals are set large in mono, like a departure board.

## Spacing, radius, layers

- Space: `--space-1…9` = 4, 8, 12, 16, 24, 32, 48, 64, 96 px. Page gutter `--gutter` = clamp(16px, 4vw, 48px). Text measure 38rem.
- Radius: `--radius-s` 2px (controls), `--radius-m` 4px (surfaces), `--radius-l` 10px (narrative panels: twist, discovery, Codex sheet). Nothing is a pill.
- Z-index tokens `--z-map … --z-toast`. Breakpoints: 40em, 60em, 80em.

## Motion

Tokens: `--dur-fast` 120ms, `--dur-standard` 220ms, `--dur-slow` 420ms, `--dur-reveal` 700ms, `--dur-world` 1400ms; easing `--ease-out`, `--ease-in-out`, `--ease-draw`; `--stagger` 110ms.

Every animation marks a state change and runs once:

| Moment | Motion |
| --- | --- |
| Map reveal | lit area grows around a new place (`sq-grow`), footprint fades in, label follows |
| New path | route draws itself (`sq-draw` on `pathLength=1`) |
| Quest accept / mystery unseal | title unfolds (`unfold`) |
| Phase / step change | content enters (`enter`) |
| Twist | ink panel unfolds with a signal edge |
| Return from ACT | night fades to paper while a route draws: "Re-entering the City" |
| Reveal | blocks stagger in; discovery unfolds on a brass wash |
| Rule change | rule banner inverts and nudges |
| Selection | signal corner grows on the chosen tile |

`prefers-reduced-motion` and the in-app "Reduce motion" setting (`data-motion="reduce"`) collapse all durations to 1ms; the return transition proceeds immediately. The only running indicators are drain bars that show remaining time in timed micro-games; each runs once and stops.

## Components (`src/components/ui`)

- **Button**: `primary` (ink block + signal square; hover turns signal), `secondary` (ink outline), `quiet` (underlined text), `danger`, `inverse` (night surfaces). Sizes `md` 44px, `lg` 56px. Also `ButtonLink`.
- **OptionGroup**: native radios as a ruled grid of tiles; selection = ink tile + signal corner. `legendAs="prompt"` for questions; `columns="row"` for scales.
- **Stepper**: large mono number input with −/+.
- **Icon**: one custom set, 20px grid, 1.5 stroke, square caps. Icons always accompany text.
- **Glyph**: the architectural marks used by micro-games. **Sigil**: NPC survey marks.
- **Ticks**: campaign progress. **Requirements**: the quest requirement strip.
- **States**: `Surveying` (route-drawing loader), `ErrorPanel`, `Notice`, `EmptyState`.

Layouts favour ruled lists, hairlines and whitespace over cards. Panels are used only for narrative moments (twist, discovery, Codex sheet, location detail).

## Responsive

Desktop: map and editorial column side by side (map sticky). Tablet: same with a narrower column. Phone: intro and primary action first, then a full-width map (labels scale down, hotspots stay ≥ 44px), then details. The quest runner is single-column everywhere. No horizontal page overflow (checked by `e2e/tour.mjs`). Wide tables in `/dev` scroll within their own container.

## Accessibility

- Semantic landmarks, skip link, one `h1` per screen, `aria-current` in navigation.
- The map is decorative SVG plus **real buttons** at each location with descriptive labels ("The Station. 3 quests completed here."). Selecting a place moves focus to its panel heading.
- All choices are native radio/checkbox inputs; list and number inputs are labelled; free-text inputs note that data stays on the device.
- Visible focus everywhere (2px signal ring; inverted on night surfaces). Touch targets ≥ 44px.
- Rule shift works with ← → / F J keys; stimuli are announced to screen readers; signal-filter cells are labelled buttons with `aria-pressed`.
- Live regions announce City changes, twists and rule changes. Contrast pairs meet WCAG AA.

## Do not do this

- Purple-blue "AI" gradients, glowing orbs, glassmorphism, giant gradient heroes
- Random glass or drop-shadow cards; card grids for everything
- Pills everywhere; fully rounded buttons
- Emoji as UI; cartoon mascots; confetti; "Great job! 🎉"
- XP, coins, streaks, levels, badges, leaderboards, daily chests
- Dashboard overload; meaningless charts; KPI tiles
- Fake AI insights; "our AI noticed…"
- Fake cognitive scores, brain ages, percentiles, "your memory is 87"
- Perpetual decorative animation
- Raw hex values in components
- Lumosity- or Duolingo-like visuals, layouts, categories or mechanics
