# Architecture

## Stack

| Choice | Why |
| --- | --- |
| Next.js 16 (App Router, Turbopack), React 19, TypeScript strict | Repository was empty apart from an unrelated ASP.NET project, so a modern maintainable stack was chosen |
| CSS Modules + a single token layer (`src/styles/tokens.css`) | The identity depends on bespoke editorial compositions; tokens as CSS custom properties give one source of truth without utility-class sprawl or another dependency. Tailwind was considered and not needed |
| zod | Validates authored content at startup and in tests, and validates saved player state on load |
| vitest | Fast unit tests for the pure domain layer |
| playwright-core (dev only) | End-to-end loop check and screenshot tour against an installed browser; no browser downloads |
| next/font (Instrument Serif, IBM Plex Sans, IBM Plex Mono) | Self-hosted at build, no runtime font requests |

No other runtime dependencies: runtime deps are `next`, `react`, `react-dom` and `zod`.

**Persistence:** local-first. PostgreSQL/Prisma were deliberately *not* wired up in the MVP. No account system exists yet, and a server database would add infrastructure without adding to the loop. Persistence sits behind `PlayerRepository` (`src/state/repository.ts`), and the relational target schema is designed in [DATA_MODEL.md](DATA_MODEL.md).

## Layers

```
src/
  content/          Authored data: quests (per campaign), campaigns, NPCs, season, discoveries, world
  domain/           Pure TypeScript: no React, no browser APIs. Fully unit tested.
    content-types.ts    zod schemas for all content (Quest, Step, RevealBlock, Condition…)
    player-types.ts     zod schemas for persisted state (PlayerState, QuestAttempt, BehaviorEvent…)
    quest-machine.ts    explicit state machine; invalid transitions throw
    game.ts             commands (accept, begin, submitStep, startAct, returnFromAct, …) — the only writer of progress and events
    refs.ts             interpreter for refs, conditions and {ref|format} templates
    reveal.ts           builds the stored Outcome (blocks, discoveries, world diff, fragment, NPC line)
    world.ts            derives the City from resolved attempts
    context-engine.ts   filtering + deterministic ranking (Recommender interface)
    safety.ts           quest safety validation
    npc.ts              NPC callbacks derived from events
    behavior/           events.ts (trackQuestEvent), metrics.ts, patterns.ts, weekly.ts
    engines/            generation + scoring for the five micro-mechanics
    simulate.ts         demo-mode simulation through the real commands
  state/            repository.ts (PlayerRepository, LocalStorageRepository), store.ts (external store)
  components/       ui/ (primitives), world/, quest/, play/, steps/, microgames/, journey/, codex/, onboarding/, settings/, dev/, shell/
  app/              Routes: server page files (metadata, params) render client route components
  styles/           tokens.css, base.css (reset, type roles, motion primitives)
e2e/                loop.mjs (required loop), tour.mjs (visual review)
```

## State separation

| Kind | Where | Notes |
| --- | --- | --- |
| Content ("server state") | `src/content`, parsed once into `CONTENT` | Read-only. Domain functions receive a `Content` value, so content could come from a DB/CMS |
| Persistent player state | `PlayerState` via `PlayerRepository` | Preferences, attempts, events, discoveries, acknowledged world reveals, last context |
| Quest state | `QuestAttempt.state` + `stepIndex` + `answers` | Changed only through `quest-machine.transition` inside `game.ts` commands |
| Derived game state | `deriveWorld`, `computeMetrics`, `detectPatterns`, `weeklyReview`, `recommend` | Pure functions of the above; never stored, so they can't drift |
| UI state | React component state | Selections, drafts, open panels, micro-game progress |

The store (`src/state/store.ts`) is ~100 lines around `useSyncExternalStore`: `dispatch(command)` applies a pure command `(state, ctx) → state`, saves through the repository and notifies subscribers. There is no giant global store and no reducer switch. Commands are ordinary functions.

`ctx = { now, id }` is injected into every command, which makes tests deterministic and lets demo tools simulate time ("return after 12 minutes").

## Event architecture

All behaviour events are created by `createEvent`/`trackQuestEvent` in `domain/behavior/events.ts`. UI components never build event payloads: they report step results (`submit`) or intermediate interactions (`track`, e.g. a changed decision), and `game.ts` maps them to typed events (`stepEvents`). Metrics, patterns, weekly reviews and NPC callbacks read only the event log.

## Server/client boundary

Page files are server components (metadata, `generateStaticParams`, awaited `params`/`searchParams`, the `/dev` production guard). Stateful screens are client components behind `GameGate`, which handles loading ("Surveying the City…"), corrupt saves, storage failures and the onboarding redirect in one place. All quest pages are statically prerendered.

## Error handling

- `GameError` / `InvalidTransitionError` are caught by the runner and shown as specific messages. Nothing fails silently.
- A save that fails validation is **not** discarded. The player sees "Your saved journey couldn't be read", can copy the raw save and choose to start over.
- Blocked or full storage shows a persistent warning that progress won't survive the tab.
- Multiple tabs: the store reloads on the `storage` event so tabs never overwrite each other with stale state.

## Replacing pieces later

- **Database:** implement `PlayerRepository` against an API; attempts, events and discoveries map 1:1 to tables in DATA_MODEL.md.
- **Recommender:** implement the `Recommender` type; the UI consumes `{ ranked, excluded }`.
- **Content:** build `Content` with `buildContent()` from any source; the zod schemas validate it.
