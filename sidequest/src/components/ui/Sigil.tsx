import type { Npc } from "@/domain/content-types";

/**
 * NPCs are not avatars. Each is a survey mark: the Cartographer's compass,
 * the Watcher's aperture, the Clockmaker's escapement.
 */
export function Sigil({ sigil, size = 40 }: { sigil: Npc["sigil"]; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth={1.25} aria-hidden>
      <rect x="0.625" y="0.625" width="38.75" height="38.75" />
      {sigil === "compass" && (
        <>
          <circle cx="20" cy="20" r="11" />
          <path d="M20 5v30M5 20h30" strokeDasharray="1.5 2.5" />
          <path d="M20 10 23 20 20 30 17 20z" fill="currentColor" />
        </>
      )}
      {sigil === "aperture" && (
        <>
          <circle cx="20" cy="20" r="13" />
          <circle cx="20" cy="20" r="7" />
          <path d="M20 7 25 14.5M33 20l-8.5 3M20 33l-5-7.5M7 20l8.5-3" />
          <circle cx="20" cy="20" r="2" fill="currentColor" stroke="none" />
        </>
      )}
      {sigil === "folio" && (
        <>
          <path d="M10 9h13l7 7v15H10z" />
          <path d="M23 9v7h7" />
          <path d="M14 21h12M14 25h12M14 29h8" />
          <circle cx="15" cy="15" r="2" fill="currentColor" stroke="none" />
        </>
      )}
      {sigil === "escapement" && (
        <>
          <path d="M20 8v4M20 28v4M8 20h4M28 20h4M11.5 11.5l2.8 2.8M25.7 25.7l2.8 2.8M28.5 11.5l-2.8 2.8M14.3 25.7l-2.8 2.8" />
          <circle cx="20" cy="20" r="7.5" />
          <path d="M20 20V14.5M20 20l4 2.5" strokeLinecap="square" strokeWidth={1.75} />
        </>
      )}
    </svg>
  );
}
