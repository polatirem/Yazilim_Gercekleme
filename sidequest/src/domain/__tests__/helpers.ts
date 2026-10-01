import type { Ctx } from "../behavior/events";
import { createPlayer, setPreferences } from "../game";
import type { PlayerState } from "../player-types";

/** Deterministic clock + id source for tests. */
export function testCtx(start = "2026-09-20T09:00:00.000Z") {
  let t = Date.parse(start);
  let n = 0;
  const ctx = (): Ctx => ({ now: new Date(t), id: () => `id-${++n}` });
  return {
    ctx,
    advance(ms: number) {
      t += ms;
      return ctx();
    },
  };
}

export function freshPlayer(c = testCtx()): PlayerState {
  return setPreferences(createPlayer(c.ctx()), { onboarded: true, primaryPlace: "home", typicalMinutes: 15, peopleComfort: "yes" });
}
