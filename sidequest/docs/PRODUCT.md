# Product

## Vision

Sidequest is a real-world cognitive adventure. It combines short digital interactions with small missions performed in the physical world, and turns what happens into discoveries about attention, memory, time and decisions.

> The world is the game board. Your actions are the gameplay. Your mind is what you discover.

**Success ≠ screen time.** The north-star metric is *meaningful actions completed*: quests whose act happened out there. The app is designed to be put down: the ACT screen hides navigation and says "Put the device away."

## Positioning

It is **not** an IQ test, a diagnostic or clinical assessment, a habit tracker, a to-do app, a brain-training site, an educational quiz, a chatbot, a fantasy RPG or a wellness dashboard. It makes no claims about improving cognition. Language is "cognitive exploration", "behavioural discovery", "real-world challenges", "interactive reflection".

The player should feel *"I wonder what my next mission is"*, not *"I need to do today's exercises."* There are no streaks, points, XP, coins, levels or leaderboards.

## Core loop

```
WORLD → QUEST DISCOVERY → PRIME → ACT → RETURN → RECALL → REFLECT → REVEAL
      → BEHAVIOUR SIGNALS → WORLD EVOLUTION → NEXT QUEST
```

Mapped to the principle **THINK → ACT → DISCOVER**, shown in the runner's phase indicator.

## Information architecture

Primary areas (top navigation): **World · Quest · Journey · Codex**. Settings is secondary (right edge). Primary action everywhere: **Give me a quest**.

| Route | Purpose |
| --- | --- |
| `/begin` | Five-screen onboarding, then the first quest immediately |
| `/` | The City: map, current quest, campaigns, latest narrative fragment |
| `/quest` | Context Engine: where are you, how much time, energy, mystery → recommendation dossier |
| `/quest/[slug]` | A specific quest's dossier (from map, reveal, Journey, Codex) |
| `/play` | The runner: briefing → prime → mission → act → return → recall → reflection → reveal |
| `/journey` | Narrative summary, this week, patterns, timeline |
| `/codex` | Catalogue of discovered phenomena |
| `/settings` | Preferences, motion, data export/erase, privacy |
| `/dev` | Demo tools (development only) |

Navigation disappears during onboarding and the quest runner, which has its own minimal header (back to City, quest code, THINK/ACT/DISCOVER, set aside). During ACT there is no navigation at all.

## The City

An abstract night survey plate. It starts almost blank: only the Crossroads is surveyed. Places appear when you complete a quest located there; routes open through quest effects and campaign completion (some lead into unmapped ground); each completion adds a survey mark and widens the lit area around its place. The Unknown, across the river, appears only after a Mystery Quest. Locations are *modes of interaction* (the Station = time, sequencing, movement; the Market = trade-offs, value, too many options), not one-to-one skill labels.

## Content in this MVP

- Season 01, *Wake Up*: three campaigns of seven authored quests (21 total): **Break the Autopilot** (the Cartographer), **The Observer** (the Watcher), **Time Bender** (the Clockmaker).
- 13 Codex phenomena, each reachable from at least one quest.
- 5 reusable micro-mechanic engines plus 10 prompt step types.

## Tone

Calm, specific, slightly mysterious. "Done." "Something changed." "A new path is available." Never "Great job! 🎉". See [CONTENT_GUIDE.md](CONTENT_GUIDE.md).
