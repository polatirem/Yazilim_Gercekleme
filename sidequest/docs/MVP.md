# MVP status

## Working, end to end

New user → onboarding (5 screens) → first quest offered immediately → accept → prime → act (device away) → I'm back → recall → reflection → reveal → discovery into the Codex → the City changes → Journey updated → Codex updated → next quest. Verified in a real browser by `e2e/loop.mjs`, which also checks persistence across reload and zero console errors.

| Area | Status |
| --- | --- |
| Design system (tokens, type, motion, primitives, docs) | Done |
| The City: progressive reveal, paths into unmapped ground, survey marks, keyboard-accessible locations, location panel, campaign entry | Done |
| Quest engine: schema, state machine, persistence, resume, skip, set aside, replay | Done |
| Five micro-mechanic engines + ten prompt step types, all data-driven | Done |
| Twist engine: planning twist with revision, sealed act note, rule changes | Done |
| 3 campaigns × 7 quests, 13 discoveries, 3 NPCs, 8 locations, Season 01 | Done |
| Context Engine with transparent deterministic scoring | Done |
| Mystery Quest | Done |
| Behaviour events, metrics, evidence-gated patterns, weekly review | Done |
| NPC callbacks derived from events | Done |
| Journey (narrative summary, timeline, filter, week, patterns) | Done |
| Codex (catalogue, per-player encounters, related quests, caveats) | Done |
| Safety engine + privacy controls (export, erase) | Done |
| Demo tools (`/dev`) | Done, development only |
| Tests: 152 unit/integration + e2e loop + screenshot tour | Done |

## Deliberately deferred

| Deferred | Why / how it's prepared |
| --- | --- |
| Accounts, server persistence, PostgreSQL | No login is needed before the product is understood. `PlayerRepository` isolates storage; the target schema is in DATA_MODEL.md |
| Seasons beyond 01 | The data model has World → Season → Campaign → Quest; only one season is authored |
| Real-world experiments UI | Architecture only: attempts carry context, acts support timed segments (Q019 is a two-condition experiment), events are timestamped. See DATA_MODEL.md |
| Social (send a quest, duels, shared walks) | Would add invitation tables only; not built, to keep the MVP focused |
| Weekly review as a separate ritual/notification | Computed live and shown on the Journey; no notifications by design |
| Learned recommendations | The deterministic engine implements the `Recommender` interface; a model can replace it |
| Content authoring tool | Quests are TypeScript data validated by zod and tests |
| i18n | UI is English; dates are formatted in English to match |

## Known limitations

- Progress lives in one browser; clearing site data erases it (Settings offers export).
- Timings are honour-system: if the player forgets to press *I'm back*, the measured time is wrong. The `actual` step lets them correct it, and corrections are flagged in events.
- Rule-shift response times include touch/pointer latency and vary by device; they're presented as this session's gameplay, not a measurement.
- The simulator used by demo tools produces plausible but fixed answers; simulated attempts are labelled and they do count toward metrics.
- There is no undo for a submitted step.
- The map's fabric is generated once for everyone; location positions are authored.

## Recommended next phase

1. **Playtest the 21 quests outdoors** with ~10 people. Tune durations, wording and the discovery trigger thresholds (e.g. 1.15× planning ratio) against what actually happens.
2. **Accounts + sync**: an API-backed `PlayerRepository` on PostgreSQL (schema ready), with import from the local save.
3. **Season 01 completion**: "Memory in the Wild" and "The Unknown" campaigns (Archivist, Trickster), using the Archive and the Unknown locations already on the map.
4. **Experiments v1**: let the player run a quest under two conditions (morning/evening, music/silence) and compare descriptively with sample sizes.
5. **Send a quest**: share a quest link so a friend can play the same mission; compare predictions side by side.
