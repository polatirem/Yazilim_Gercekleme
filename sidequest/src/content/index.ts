/**
 * Content bundle. Authored data is parsed through the zod schemas once, so
 * defaults are applied and a malformed quest fails loudly at startup (and in
 * tests) instead of misbehaving mid-quest.
 *
 * Domain functions receive a `Content` value rather than importing this
 * module, so content can later come from a database or CMS.
 */
import { z } from "zod";
import { Campaign, Discovery, Npc, Quest, Season, WorldLocation, WorldPath } from "@/domain/content-types";
import { CAMPAIGNS, NPCS, SEASONS } from "./campaigns";
import { DISCOVERIES } from "./discoveries";
import { AUTOPILOT_QUESTS } from "./quests/autopilot";
import { MEMORY_QUESTS } from "./quests/memory";
import { OBSERVER_QUESTS } from "./quests/observer";
import { TIME_BENDER_QUESTS } from "./quests/time-bender";
import { LOCATIONS, PATHS } from "./world";

export interface Content {
  quests: Quest[];
  campaigns: Campaign[];
  seasons: Season[];
  npcs: Npc[];
  discoveries: Discovery[];
  locations: WorldLocation[];
  paths: WorldPath[];
  questById: Map<string, Quest>;
  questBySlug: Map<string, Quest>;
  campaignById: Map<string, Campaign>;
  npcById: Map<string, Npc>;
  discoveryById: Map<string, Discovery>;
  locationById: Map<string, WorldLocation>;
  pathById: Map<string, WorldPath>;
}

function parseAll<T>(schema: z.ZodType<T>, items: unknown[], label: string): T[] {
  return items.map((item, i) => {
    const result = schema.safeParse(item);
    if (!result.success) {
      const id = (item as { id?: string }).id ?? `#${i}`;
      throw new Error(`Invalid ${label} ${id}: ${z.prettifyError(result.error)}`);
    }
    return result.data;
  });
}

export function buildContent(raw: {
  quests: unknown[];
  campaigns: unknown[];
  seasons: unknown[];
  npcs: unknown[];
  discoveries: unknown[];
  locations: unknown[];
  paths: unknown[];
}): Content {
  const quests = parseAll(Quest, raw.quests, "quest").sort((a, b) => a.number - b.number);
  const campaigns = parseAll(Campaign, raw.campaigns, "campaign");
  const seasons = parseAll(Season, raw.seasons, "season");
  const npcs = parseAll(Npc, raw.npcs, "npc");
  const discoveries = parseAll(Discovery, raw.discoveries, "discovery").sort((a, b) => a.number - b.number);
  const locations = parseAll(WorldLocation, raw.locations, "location");
  const paths = parseAll(WorldPath, raw.paths, "path");
  return {
    quests,
    campaigns,
    seasons,
    npcs,
    discoveries,
    locations,
    paths,
    questById: new Map(quests.map((q) => [q.id, q])),
    questBySlug: new Map(quests.map((q) => [q.slug, q])),
    campaignById: new Map(campaigns.map((c) => [c.id, c])),
    npcById: new Map(npcs.map((n) => [n.id, n])),
    discoveryById: new Map(discoveries.map((d) => [d.id, d])),
    locationById: new Map(locations.map((l) => [l.id, l])),
    pathById: new Map(paths.map((p) => [p.id, p])),
  };
}

export const CONTENT: Content = buildContent({
  quests: [...AUTOPILOT_QUESTS, ...OBSERVER_QUESTS, ...TIME_BENDER_QUESTS, ...MEMORY_QUESTS],
  campaigns: CAMPAIGNS,
  seasons: SEASONS,
  npcs: NPCS,
  discoveries: DISCOVERIES,
  locations: LOCATIONS,
  paths: PATHS,
});

export function questCode(quest: Quest): string {
  return `Görev ${String(quest.number).padStart(3, "0")}`;
}
