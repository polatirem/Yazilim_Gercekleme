"use client";
/**
 * Persistent player state for the client. A tiny external store (no library):
 * commands from `@/domain/game` are applied, the result is validated-by-type,
 * saved through the repository and broadcast to subscribers.
 *
 * UI state (open panels, form drafts) stays in components; derived game state
 * (world, metrics) is computed from this with pure functions.
 */
import { useSyncExternalStore } from "react";
import type { Ctx } from "@/domain/behavior/events";
import { createPlayer } from "@/domain/game";
import type { PlayerState } from "@/domain/player-types";
import { LocalStorageRepository, STORAGE_KEY, type PlayerRepository } from "./repository";

export type StoreSnapshot =
  | { status: "loading" }
  | { status: "ready"; player: PlayerState; saveError: string | null }
  | { status: "corrupt"; error: string; raw: string };

const LOADING: StoreSnapshot = { status: "loading" };

let snapshot: StoreSnapshot = LOADING;
let repository: PlayerRepository | null = null;
const listeners = new Set<() => void>();

function emit(next: StoreSnapshot) {
  snapshot = next;
  for (const l of listeners) l();
}

export function makeCtx(): Ctx {
  return { now: new Date(), id: () => crypto.randomUUID() };
}

function repo(): PlayerRepository {
  repository ??= new LocalStorageRepository(window.localStorage);
  return repository;
}

function load() {
  let result;
  try {
    result = repo().load();
  } catch (e) {
    emit({ status: "ready", player: createPlayer(makeCtx()), saveError: `Bu tarayıcı yerel depolamayı engelledi (${(e as Error).message}). Sekme kapanınca ilerleme kaybolacak.` });
    return;
  }
  if (result.status === "ok") emit({ status: "ready", player: result.state, saveError: null });
  else if (result.status === "empty") commit(createPlayer(makeCtx()));
  else emit({ status: "corrupt", error: result.error, raw: result.raw });
}

function commit(player: PlayerState) {
  let saveError: string | null = null;
  try {
    repo().save(player);
  } catch (e) {
    saveError = `İlerleme bu cihaza kaydedilemedi (${(e as Error).message}).`;
  }
  emit({ status: "ready", player, saveError });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (snapshot === LOADING && listeners.size === 1) {
    queueMicrotask(load);
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/** Another tab changed the save: reload so tabs never overwrite each other with stale state. */
function onStorage(e: StorageEvent) {
  if (e.key === STORAGE_KEY) load();
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
  try {
    repo().clear();
  } catch {
    /* storage unavailable — the fresh player below is still in memory */
  }
  commit(createPlayer(makeCtx()));
}

export function replacePlayer(player: PlayerState) {
  commit(player);
}
