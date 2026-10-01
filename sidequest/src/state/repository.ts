/**
 * Persistence boundary. The game only talks to `PlayerRepository`; today it is
 * backed by localStorage, later by an API + PostgreSQL (see docs/DATA_MODEL.md)
 * without touching game logic.
 */
import { z } from "zod";
import { PlayerState } from "@/domain/player-types";

export type LoadResult =
  | { status: "empty" }
  | { status: "ok"; state: PlayerState }
  | { status: "corrupt"; error: string; raw: string };

export interface PlayerRepository {
  load(): LoadResult;
  save(state: PlayerState): void;
  clear(): void;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

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
    return { status: "corrupt", error: "Saved data is not valid JSON.", raw: json };
  }
  const result = PlayerState.safeParse(migrate(data));
  if (!result.success) return { status: "corrupt", error: z.prettifyError(result.error), raw: json };
  return { status: "ok", state: result.data };
}

export class LocalStorageRepository implements PlayerRepository {
  constructor(
    private readonly storage: StorageLike,
    private readonly key = STORAGE_KEY,
  ) {}

  load(): LoadResult {
    const json = this.storage.getItem(this.key);
    return json === null ? { status: "empty" } : parsePlayer(json);
  }

  save(state: PlayerState): void {
    this.storage.setItem(this.key, JSON.stringify(state));
  }

  clear(): void {
    this.storage.removeItem(this.key);
  }
}

export class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}
