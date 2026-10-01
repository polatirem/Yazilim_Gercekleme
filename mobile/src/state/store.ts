/**
 * Persistent player state on the device. The same tiny external store as the
 * web app, backed by AsyncStorage instead of localStorage: commands from
 * `@/domain/game` are applied synchronously in memory, broadcast, and written
 * to storage in order (writes are queued so a slow write never overtakes a
 * newer one).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import type { Ctx } from "@/domain/behavior/events";
import { createPlayer } from "@/domain/game";
import type { PlayerState } from "@/domain/player-types";
import { STORAGE_KEY, parsePlayer } from "./repository";

export type StoreSnapshot =
  | { status: "loading" }
  | { status: "ready"; player: PlayerState; saveError: string | null }
  | { status: "corrupt"; error: string; raw: string };

const LOADING: StoreSnapshot = { status: "loading" };

let snapshot: StoreSnapshot = LOADING;
let started = false;
let writes: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

function emit(next: StoreSnapshot) {
  snapshot = next;
  for (const l of listeners) l();
}

/** RFC 4122 v4 identifier. Ids only need to be unique on this device. */
export function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function makeCtx(): Ctx {
  return { now: new Date(), id: uuid };
}

async function load() {
  let json: string | null;
  try {
    json = await AsyncStorage.getItem(STORAGE_KEY);
  } catch (e) {
    emit({ status: "ready", player: createPlayer(makeCtx()), saveError: `Bu cihaz depolamaya erişimi engelledi (${(e as Error).message}). Uygulama kapanınca ilerleme kaybolacak.` });
    return;
  }
  if (json === null) {
    commit(createPlayer(makeCtx()));
    return;
  }
  const result = parsePlayer(json);
  if (result.status === "ok") emit({ status: "ready", player: result.state, saveError: null });
  else if (result.status === "corrupt") emit({ status: "corrupt", error: result.error, raw: result.raw });
}

function persist(player: PlayerState) {
  const json = JSON.stringify(player);
  writes = writes
    .then(() => AsyncStorage.setItem(STORAGE_KEY, json))
    .then(
      () => {
        if (snapshot.status === "ready" && snapshot.saveError && snapshot.player === player) emit({ ...snapshot, saveError: null });
      },
      (e: Error) => {
        if (snapshot.status === "ready") emit({ ...snapshot, saveError: `İlerleme bu cihaza kaydedilemedi (${e.message}).` });
      },
    );
}

function commit(player: PlayerState) {
  const previousError = snapshot.status === "ready" ? snapshot.saveError : null;
  emit({ status: "ready", player, saveError: previousError });
  persist(player);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    void load();
  }
  return () => {
    listeners.delete(listener);
  };
}

export function usePlayerStore(): StoreSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => LOADING);
}

/**
 * Applies a command. Throws whatever the command throws (e.g. GameError) so
 * the calling component can show a specific, honest message.
 */
export function dispatch(command: (player: PlayerState, ctx: Ctx) => PlayerState): PlayerState {
  if (snapshot.status !== "ready") throw new Error("Oyuncu durumu henüz hazır değil.");
  const next = command(snapshot.player, makeCtx());
  if (next !== snapshot.player) commit(next);
  return next;
}

export function getPlayer(): PlayerState | null {
  return snapshot.status === "ready" ? snapshot.player : null;
}

export function resetProgress() {
  writes = writes.then(() => AsyncStorage.removeItem(STORAGE_KEY)).catch(() => undefined);
  snapshot = LOADING;
  commit(createPlayer(makeCtx()));
}

export function replacePlayer(player: PlayerState) {
  commit(player);
}
