# Content guide

## Voice

Short. Specific. Slightly mysterious. Action-oriented. Calm. Adult.

| Write | Don't write |
| --- | --- |
| "Done. Here's what it showed." | "Great job! 🎉" |
| "Something changed." | "You're crushing it!" |
| "A new path is available." | "Supercharge your brain!" |
| "Return when you're ready." | "Become a genius!" |
| "You noticed more than you expected." | "Level up your focus" |

NPCs speak in one or two sentences, never cheer, and never invent history: callbacks come from stored events.

## Anatomy of a quest

- **Title**: two or three words, a thing or a place ("The Detour", "Three Minutes", "Departure Board").
- **Subtitle**: the move in one line ("Take another way.").
- **Description**: one or two sentences of atmosphere that also tell you what happens.
- **NPC line**: the reason this quest exists, in character.
- **Prime**: under 90 seconds, connected to the act. Warm up exactly the attention the act needs.
- **Act**: one imperative instruction; details only for how to do it safely and well; a short `reminder` for the night screen.
- **Recall / reflection**: one question per screen, specific ("Which turns did you take, in order?"), never a form.
- **Reveal**: lead with what happened, compare prediction to reality when there is one, then one sentence of interpretation.
- **Discovery**: say how the phenomenon appeared *in this quest*, with numbers from the answers.
- **Fragment**: one line about the City changing, true whether or not this is the first completion.
- **Journey line**: a single factual sentence ("Tidy a room or desk: estimated 10 min, took 12 min.").

## Every quest must have

- A clear interaction idea, not a variant of another quest (no "find three red things / three blue things").
- A reason to leave the screen.
- A return experience that uses what happened out there.
- A discovery, or an honest reveal when there isn't one ("Nothing new entered the Codex this time").
- Safety notes that pass the safety engine ([SAFETY.md](SAFETY.md)).

Review checklist for each quest: novelty · safety · clarity · real-world feasibility · duration honesty · cognitive purpose · return experience · discovery potential.

## Scientific language

Be conservative. Phenomena are **demonstrated by a quest**, not attributed to the player.

- ✓ "This quest demonstrated a phenomenon commonly called anchoring."
- ✗ "You have confirmation bias." ✗ "Your memory is below average."
- Never claim to raise IQ, prevent dementia, treat ADHD, improve clinical memory or "rewire the brain".
- State limits where they matter: the Anchor reveal says one walk can't show anchoring. Every Codex entry has a "note on evidence". Choice overload is flagged as mixed evidence.
- Patterns use "tended to", report the sample size, and appear only above their evidence threshold.

## Templates

`{stepId.field|format}` inside any act, reveal, discovery or journey text.
Formats: `min`, `signed-min`, `duration` (seconds), `signed-duration`, `count`, `signed-count`, `ms`, `signed-ms`, `percent`, `text`, `phrase` (an option label placed mid-sentence: lowercases the first letter).
Tests fail if a template refers to a step that doesn't exist, or if any rendered value comes out missing.

## Empty, loading and error copy

- Empty Codex: "Nothing discovered yet. Your first discovery appears after a quest reveals something worth keeping."
- Empty Journey: "No journey yet. Accept your first quest."
- Nothing fits: "Nothing fits 5 minutes at home yet." plus the actual reasons and a concrete next step ("Try 15 minutes").
- Loading: "Surveying the City…", "Retracing your steps…", "Opening the Codex…"
- Errors: a narrative headline and a plain explanation ("That path didn't open. Another quest is already in progress."). Serious failures show the technical detail.
