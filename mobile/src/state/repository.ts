/**
 * Persistence boundary. Parsing and validation of a saved player; the store
 * decides where the JSON lives (AsyncStorage on the device).
 */
import { z } from "zod";
import { PlayerState } from "@/domain/player-types";

export type LoadResult =
  | { status: "empty" }
  | { status: "ok"; state: PlayerState }
  | { status: "corrupt"; error: string; raw: string };

export const STORAGE_KEY = "sidequest.player.v1";

/** Upgrades older saves. Only one version exists so far. */
function migrate(raw: unknown): unknown {
  return raw;
}

export function parsePlayer(json: string): LoadResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { status: "corrupt", error: "Kayıtlı veri geçerli JSON değil.", raw: json };
  }
  const result = PlayerState.safeParse(migrate(data));
  if (!result.success) return { status: "corrupt", error: z.prettifyError(result.error), raw: json };
  return { status: "ok", state: result.data };
}
