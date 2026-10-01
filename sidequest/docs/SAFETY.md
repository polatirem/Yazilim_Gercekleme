# Safety & privacy

Quests change real-world behaviour, so safety is enforced in data, in code and in tests.

## Rules

A quest must never require:

- dangerous physical activity, running, climbing, anything in the dark
- trespassing or entering unsafe or private places
- interacting with the device while driving or cycling
- sharing a precise location
- photographing or recording people
- buying anything
- contacting strangers (social quests involve only people the player already knows)
- revealing sensitive personal information
- breaking any law

The player can **always** skip, set aside or abandon a quest, before or during it, at no cost. There are no streaks, no loss mechanics and no penalty beyond the skipped quest being offered a little less often for a few days.

## How it's enforced

1. **Schema** (`content-types.ts`): `requiresPurchase`, `contactsStrangers`, `photographsPeople` and `sharesLocation` are the literal `false`. A quest that sets them to `true` does not parse.
2. **Safety engine** (`src/domain/safety.ts`, `validateQuestSafety`):
   - notes must tell the player they can stop at any time;
   - commuting quests must say "never while driving or cycling";
   - outdoor or walking quests must keep the player in public places;
   - social quests must say "people you already know";
   - walking quests can't be rated minimal;
   - every player-facing action text is scanned for forbidden wording (purchase, trespass, strangers, photographing people, location sharing, dangerous activity, driving, sensitive information), with explicit allow-phrases such as "nothing to buy".
3. **Tests**: every authored quest must pass with zero issues; negative tests prove each rule fires.
4. **Runtime**: the Context Engine excludes any quest that fails validation ("held back by a safety check"), and `acceptQuest` refuses it.
5. **UI**: safety notes appear on every dossier ("Before you go"), in full on Mystery Quests (only the mission is sealed, never its requirements), on the mission screen, and the first note stays on the ACT screen next to "Set this quest aside".

During development the engine caught two real gaps (Q001 and Q015 allowed commuting without a driving warning); both were fixed in content.

## Verification philosophy

Honour system. No GPS, camera, photo proof, microphone or continuous location. The app measures only the time between *Start* and *I'm back*, and the player can correct it.

## Privacy

- No account. All data lives in this browser's localStorage under `sidequest.player.v1`.
- Nothing is sent to any server; no analytics SDKs; fonts are self-hosted at build time.
- Free-text answers stay inside the attempt record; behaviour events record only that text was written (its length).
- Social quests ask for counts and categories, never what another person said.
- Settings → *Download my data* exports everything as JSON; *Erase all progress* deletes it (with confirmation).
- Any future privacy-sensitive feature (location, photos, sharing) must be opt-in, off by default, and documented here first.
