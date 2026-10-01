# Quest system

The quest is the atomic unit. Every quest is structured data (`src/content/quests/*.ts`) validated by the `Quest` schema in `src/domain/content-types.ts`. No quest has its own component or special-case code.

## Grammar

`CONTEXT + OBJECTIVE + CONSTRAINT + ACTION (+ TWIST) + RETURN + RECALL + REFLECTION + DISCOVERY`, all optional except the act and the reveal.

## Schema (abridged)

```ts
Quest {
  id, version, number, slug, title, subtitle, description,
  campaignId, locationId, npcId, npcLine,
  family: explore|notice|remember|decide|break|connect|create|predict,   // player-facing
  dimensions: attention|recall|planning|adaptation|estimation|…         // internal only
  difficulty: 1|2|3, estimatedMinutes {min,max},
  contexts: home|outside|work|commuting|with-people[], energy, people: solo|optional|required,
  requiresOutside, requiresPurchase: false (literal), requiresLocation?: string (kind of place, never coordinates),
  mysteryEligible, safety { level, movement, notes[], requiresPurchase/contactsStrangers/photographsPeople/sharesLocation: false },
  availability { requiresQuests[], requiresCampaignProgress },
  prime: Step[], act: Act, recall: Step[], reflection: Step[],
  reveal: RevealBlock[], discoveries: DiscoveryTrigger[],
  behaviorSignals[], completionRules { interruptsRoutine }, worldEffects[], fragment,
  nextQuestRules { suggests[] }, journey: Variant[]
}
Act { instruction, details[], reminder, segments[], targetSeconds?, sealed? {trigger, body} }
```

`instruction`, `details`, `reminder` and all reveal/journey text are **templates**: `{step.field|format}`, e.g. `"Walk to {destination.label|phrase} and back."`.

## State machine

```
AVAILABLE ─accept→ ACCEPTED ─begin→ PRIMING ─prime-done→ READY_TO_ACT ─start-act→ ACTING
ACTING ─leave (tab hidden)→ WAITING_FOR_RETURN ─return→ RETURNED
ACTING ─return→ RETURNED ─proceed→ RECALL ─recall-done→ REFLECTION ─reflection-done→ REVEAL ─complete→ COMPLETED
any state before REVEAL ─abandon→ ABANDONED
```

Phases a quest doesn't author are skipped (no prime: ACCEPTED → READY_TO_ACT; no recall: RETURNED → REFLECTION or REVEAL). Anything not in the table throws `InvalidTransitionError`. `COMPLETED`/`ABANDONED` are terminal; replaying creates a new attempt. Results are committed on entering `REVEAL` (so a refresh on the reveal shows the same outcome); leaving the reveal moves to `COMPLETED`.

The active attempt (state, step index, answers, act timestamps, segment marks, sealed-note time) is persisted after every command, so a quest resumes exactly where it was after a refresh or on another visit. Micro-games restart from the beginning of the current step.

## Steps

Rendered by `StepRenderer` by `kind`.

| Kind | Purpose | Result | Event |
| --- | --- | --- | --- |
| narrative | NPC or framing lines | — | — |
| estimate | Prediction, optional **anchor** question first (value chosen per attempt) | value, anchor, latency | prediction_submitted (+ decision_made for the anchor) |
| actual | Actual value, **pre-filled from the act timer** (`source: act` / `segment:x`) or reported | value, measured, corrected, predicted, error, errorPct | actual_result_submitted |
| choice | decision / recall / reflection | optionId, label, latency, changes | decision_made / recall_answered / reflection_submitted; live decision_changed |
| count, scale, list, item-check, text | Recall and reflection inputs | … | recall_answered / reflection_submitted (text events record length only) |
| twist | Structured twist event before a revision | — | twist_received |
| **sequence-encode / sequence-recall** | Engine 1 | order: positional hits, primacy/recency flags; scene: changed/selected cells | prime_action / recall_answered |
| **signal-filter** | Engine 2 | targets, hits, misses, false alarms | prime_action |
| **estimate / actual** | Engine 3 (estimation, compared across the act) | see above | see above |
| **rule-shift** | Engine 4 | accuracy, repeat vs switch RT, switch cost | prime_action |
| **priority-board** | Engine 5 (order, set aside, budget, constraints, revisions) | order, dropped, total, violations, moves, positionsChanged | decision_made, plan_changed on revisions |

Engine logic (generation, seeding, scoring) lives in `src/domain/engines/` and is unit tested. All randomness is seeded from the attempt, so a refresh regenerates the same puzzle.

## Twists

Structured, not random noise:

- **Planning twist:** a `twist` step followed by a `priority-board` with `revises: <board>`, new constraints (`first`, `keep`), a changed budget and optional `addItems`. The revision starts from the previous plan and records `plan_changed` with `positionsChanged`. (Q018 The Errand Plan: "The message can't wait. It goes first — and you now have 15 minutes, not 20.")
- **Sealed act twist:** `act.sealed` shows a sealed note the player opens when a real-world condition is met (Q021: "Open when you reach your second stop"). Recorded as `twist_received` with interaction `sealed`.
- **Rule twist:** inside the rule-shift engine, where rules change mid-run.

## Act

The minimal night screen: campaign, "Quest active", "Put the device away.", the instruction, the reminder, one button: **I'm back**. No clock is ever shown. The app measures the time between *Start* and *I'm back* and later offers it for confirmation or correction. Optional `segments` time several parts separately (Q019 The Split: blocks vs interleaved). `targetSeconds` turns the act into a timing task (Q015: return at three minutes). Leaving the tab moves the quest to WAITING_FOR_RETURN.

## Reveal

`buildOutcome` (`src/domain/reveal.ts`) renders the quest's `reveal` blocks against the answers and stores them on the attempt:

- `figures`: departure-board numbers with an optional signed delta ("Your estimate 12 min · Actual 18 min · Difference +6 min")
- `text`: first matching variant (conditions over answers)
- `sequence`, `scene`, `filter`, `switch`, `plan`, `list`: engine-specific visualisations

Plus discoveries, world changes (diff of the City before/after), the fragment (and campaign completion text), an NPC callback about *earlier* attempts, a suggested next quest and the Journey line.

## Discoveries

Each quest lists `DiscoveryTrigger { discovery, when?, encounter: Variant[] }`. A discovery unlocks only if its condition holds; the encounter text describes how it actually appeared ("You estimated 10 min for a task you do often. It took 18 min."). When a quest tests a phenomenon that *didn't* show, some triggers still fire with honest text ("…the usual tendency to underestimate didn't show up this time"). Repeat encounters append to the Codex entry. Phenomena are always framed as "demonstrated by this quest", never as traits.

## Progression

- **Quest availability:** `requiresCampaignProgress` (first three of each campaign open; later ones unlock with progress; finales need 5) and optional `requiresQuests`.
- **Locations:** revealed by completing any quest located there; the Unknown by a Mystery Quest.
- **Paths:** each location's arrival path opens with it; quests open extra paths (sometimes into unmapped ground); finishing a campaign opens two connecting streets.
- **Visual evolution:** survey marks per completion, larger lit radius around busy places, fragments quoted on the World screen.
- **Campaign completion** adds a closing fragment and effects.

Everything is derived from resolved attempts (`deriveWorld`). New reveals animate once on the World screen and are then acknowledged.

## Context Engine

`recommend(content, state, context, {now, mystery})` in `src/domain/context-engine.ts`.

Hard filters, each with a stated reason: unsafe, locked, not mystery-eligible, place, time (`minutes: 30` means 30+), energy (low excludes high), people (comfort "no" excludes social quests), already in progress.

Deterministic score = Σ weight × component:

| Component | Weight | Rule |
| --- | --- | --- |
| contextCompatibility | 1.0 | 1 if your place is the quest's primary context, else 0.75 |
| durationCompatibility | 1.2 | how well the quest uses the time you have |
| questNovelty | 1.5 | 1 if never completed, 0.2/n after |
| campaignProgress | 1.0 | continue started campaigns; +0.5 if the last reveal suggested it |
| difficultyFit | 0.8 | target 1 for the first 3 quests, 2 until 10, then 3 |
| behaviorBalance | 0.6 | favour families you've done less |
| energyFit | 0.4 | match stated energy |
| weeklyFocus | 1.0 | +0.3 for the family in "Next thing to explore" |
| recentQuestPenalty | 1.0 | −0.6 per skip in 3 days, −0.3 abandon in 2 days, −0.5 completed today |

Ties break by quest number. The full breakdown is visible in `/dev`. Skip records `quest_skipped` and shows the next candidate; Not now returns to the City with no penalty.

## Mystery Quest

The recommender is restricted to `mysteryEligible` quests. The dossier shows only requirements (time, place, people, "No purchase") and **the full safety notes**. The mission is revealed on the briefing after accepting. Completing one reveals the Unknown.

## NPCs

The Cartographer, the Watcher and the Clockmaker are drawn as survey sigils, not avatars. Each speaks an authored line per quest plus a callback computed from stored events only (`npc.ts`), e.g. "Last time, your estimate was 3 min over." With no evidence they say nothing about the past.

## Adding a quest

1. Add a `QuestInput` to the campaign file and its id to the campaign's `questIds`.
2. Use only existing step kinds; reference answers as `stepId.field`.
3. `npm test`: content tests check references, refs used in templates and conditions, step wiring, safety, and play the quest end to end through the real pipeline, asserting no missing values render.
