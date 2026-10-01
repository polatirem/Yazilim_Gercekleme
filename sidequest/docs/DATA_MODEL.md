# Data model

The MVP stores one `PlayerState` document per browser (localStorage, validated by zod). It is shaped so each part maps directly onto a normalised relational model for when accounts and a server arrive.

## Hierarchy

```
World ─< Season ─< Campaign ─< Quest ─< QuestVersion
World ─< WorldLocation ─< WorldPath (from, to)
Campaign >─ NPC     Quest >─ WorldLocation     Quest >─< Discovery (via triggers)
User ─1 UserPreferences
User ─< QuestProgress (attempt) ─< QuestEvent
User ─< UserDiscovery ─< DiscoveryEncounter >─ QuestProgress
User ─1 WorldState (acknowledged reveals)
User ─< WeeklyReview (snapshot, optional)      User ─< NPCInteraction (= npc_callback_shown events)
```

## Current storage → target tables

| MVP (`src/domain/player-types.ts`) | Target table |
| --- | --- |
| `playerId`, `createdAt` | `users` |
| `preferences` | `user_preferences` |
| `attempts[id]` (`QuestAttempt`) | `quest_progress` |
| `attempts[id].answers` | `quest_progress.answers jsonb` |
| `attempts[id].outcome` | `quest_progress.outcome jsonb` (rendered reveal, kept stable across content versions) |
| `events[]` (`BehaviorEvent`) | `quest_events` |
| `discoveries[id]` | `user_discoveries` + `discovery_encounters` |
| `world.seenLocations/seenPaths` | `world_state` |
| `lastContext` | `recommendation_contexts` (log per request later) |

Content (`src/content`) maps to `worlds, seasons, campaigns, npcs, world_locations, world_paths, quests, quest_versions (definition jsonb), discoveries`. `QuestAttempt.questVersion` pins which version was played.

Derived, never stored: world view, metrics, patterns, weekly review. `WeeklyReview` rows would be snapshots only if emails or notifications are added.

`SafetyRule` is code (`src/domain/safety.ts`) plus per-quest `safety` metadata; a `safety_reviews` table (quest_version, reviewer, date) is recommended once non-developers author content.

## Target PostgreSQL schema (Prisma notation)

```prisma
model User {
  id          String   @id @default(uuid())
  createdAt   DateTime @default(now())
  preferences UserPreferences?
  attempts    QuestProgress[]
  events      QuestEvent[]
  discoveries UserDiscovery[]
  worldState  WorldState?
}

model UserPreferences {
  userId         String  @id
  user           User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  onboarded      Boolean
  primaryPlace   String? // home | work | outside
  typicalMinutes Int?
  peopleComfort  String? // yes | sometimes | no
  motion         String  @default("system")
}

model Season   { id String @id; number Int; title String; campaigns Campaign[] }
model Npc      { id String @id; name String; epithet String; sigil String; campaigns Campaign[] }

model Campaign {
  id       String  @id
  seasonId String
  season   Season  @relation(fields: [seasonId], references: [id])
  npcId    String
  npc      Npc     @relation(fields: [npcId], references: [id])
  title    String
  homeLocationId String
  quests   Quest[]
}

model WorldLocation { id String @id; name String; footprint String; x Int; y Int; reveal String; definition Json }
model WorldPath     { id String @id; fromId String; toId String; d String }

model Quest {
  id         String  @id
  slug       String  @unique
  number     Int     @unique
  campaignId String
  campaign   Campaign @relation(fields: [campaignId], references: [id])
  locationId String
  versions   QuestVersion[]
}

model QuestVersion {
  questId    String
  version    Int
  definition Json     // the full validated Quest document
  createdAt  DateTime @default(now())
  @@id([questId, version])
}

model QuestProgress {
  id           String    @id
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  questId      String
  questVersion Int
  state        String    // QUEST_STATES
  stepIndex    Int
  answers      Json
  seed         Int
  mystery      Boolean
  context      Json?
  simulated    Boolean   @default(false)
  createdAt    DateTime
  actStartedAt DateTime?
  segmentMarks DateTime[]
  sealedOpenedAt DateTime?
  returnedAt   DateTime?
  completedAt  DateTime?
  endedAt      DateTime?
  history      Json      // [{from,to,at}]
  outcome      Json?
  events       QuestEvent[]
  @@index([userId, state])
  // at most one in-progress attempt per user: partial unique index in SQL
}

model QuestEvent {
  id             String   @id
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  attemptId      String?
  attempt        QuestProgress? @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  questId        String?
  type           String   // EVENT_TYPES
  at             DateTime
  phase          String?
  stepId         String?
  interaction    String?
  responseTimeMs Int?
  value          Json?
  meta           Json?
  @@index([userId, type, at])
}

model Discovery { id String @id; number Int @unique; title String; definition Json }

model UserDiscovery {
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  discoveryId String
  firstAt     DateTime
  encounters  DiscoveryEncounter[]
  @@id([userId, discoveryId])
}

model DiscoveryEncounter {
  userId      String
  discoveryId String
  attemptId   String
  questId     String
  at          DateTime
  text        String
  discovery   UserDiscovery @relation(fields: [userId, discoveryId], references: [userId, discoveryId], onDelete: Cascade)
  @@id([attemptId, discoveryId])
}

model WorldState { userId String @id; seenLocations String[]; seenPaths String[] }
```

Future social features (send a quest, prediction duels) add `quest_invitations (from_user, to_user, quest_id, status)` and `shared_attempts (invitation_id, attempt_id)`; no current table needs to change.

## Events

`BehaviorEvent { id, type, at, questId, attemptId, phase, stepId, interaction, responseTimeMs, value, meta }`.

Types: `quest_viewed, quest_accepted, quest_skipped, prime_started, prime_action, prime_completed, act_started, act_left, act_segment_completed, player_returned, recall_answered, decision_made, decision_changed, prediction_submitted, actual_result_submitted, twist_received, plan_changed, reflection_submitted, quest_completed, quest_abandoned, discovery_unlocked, world_changed, npc_callback_shown`.

Free text never enters events (only its length). The log is capped at 8,000 events locally.

## Derived metrics (`src/domain/behavior/metrics.ts`)

Quests completed/abandoned/skipped, routines interrupted, predictions made, details recalled, twists received, time-estimate pairs (under/over within ±10%, mean absolute error), median decision latency, decision changes, plan changes, mean switch cost, signal-filter hits/misses/false alarms, sequence accuracy, minutes spent in the world. These are gameplay descriptions, not cognitive measurements.

## Patterns (`patterns.ts`)

| Pattern | Minimum evidence | Confidence |
| --- | --- | --- |
| Things took longer / less time than predicted | 3 time pairs, ≥ ⅔ in one direction | consistent at ≥ 6 and ≥ 80% |
| Predictions converging | 6 time pairs, last-3 error < 75% of first-3 | consistent at ≥ 9 |
| Rebuild vs patch after twists | 2 plan revisions, ≥ ⅔ one way | consistent at ≥ 4 |
| Rule changes slow the first response | 2 rule-shift sessions, all > 60 ms | consistent at ≥ 3 |
| Quick / slow to commit | 5 timed decisions, median < 4 s or > 12 s | consistent at ≥ 10 |

Every pattern carries sample size, threshold, confidence and supporting event ids. Below threshold the Journey shows "Still gathering evidence: 2 of 3 …".

## Experiments (architecture only)

A real-world experiment is a pair (or set) of conditions compared through the same metric. The data model already supports it: attempts carry `context`, acts support timed `segments` (Q019 compares blocks vs interleaving within one attempt), and events are timestamped (morning vs evening). A future `experiments` table would group attempts by condition and report descriptive differences with sample sizes, never causal claims.
