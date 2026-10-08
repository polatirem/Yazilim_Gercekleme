"use client";
import { useRef, useState } from "react";
import { api, DocumentInfo, Passage } from "@/lib/api";

export const ACCEPT = ".pdf,.docx,.txt,.md,.markdown,.csv,.html,.htm";

/** Drag-and-drop uploader; uploads files one by one and reports each result. */
export function Uploader({ onUploaded, compact = false }: { onUploaded: (doc: DocumentInfo) => void; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [queue, setQueue] = useState<{ name: string; state: "busy" | "ok" | "error"; note?: string }[]>([]);

  async function upload(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      setQueue(q => [{ name: file.name, state: "busy" as const }, ...q.filter(x => x.name !== file.name)].slice(0, 6));
      const form = new FormData(); form.append("file", file);
      try {
        const doc = await api<DocumentInfo>("/documents", { method: "POST", body: form });
        setQueue(q => q.map(x => x.name === file.name ? { ...x, state: "ok" as const, note: `${doc.chunk_count} bölüme ayrıldı` } : x));
        onUploaded(doc);
      } catch (e) {
        setQueue(q => q.map(x => x.name === file.name ? { ...x, state: "error" as const, note: e instanceof Error ? e.message : "Yüklenemedi" } : x));
      }
    }
  }

  return (
    <div className="upl">
      <div className={`drop ${over ? "over" : ""} ${compact ? "compact" : ""}`} role="button" tabIndex={0}
        onClick={() => input.current?.click()} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") input.current?.click(); }}
        onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) upload(e.dataTransfer.files); }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
        <div><b>Belge yükle</b><span>{compact ? "PDF, Word ya da metin dosyası" : "Dosyaları buraya sürükleyin ya da tıklayıp seçin · PDF, Word (.docx), TXT, Markdown, CSV, HTML · en fazla 15 MB"}</span></div>
        <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={e => { if (e.target.files?.length) upload(e.target.files); e.target.value = ""; }} />
      </div>
      {queue.length > 0 && (
        <ul className="uplq">
          {queue.map(x => <li key={x.name} className={x.state}><span className="dot" /><b>{x.name}</b><small>{x.state === "busy" ? "Okunuyor ve bölümlere ayrılıyor…" : x.note}</small></li>)}
        </ul>
      )}
    </div>
  );
}

/** Marks the words of a passage that matched the query (terms are word stems, i.e. prefixes). */
export function MatchedText({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const parts = text.split(/([^\p{L}\p{N}]+)/u);
  return <>{parts.map((part, i) => {
    const lower = part.replace(/İ/g, "i").toLowerCase();
    return terms.some(t => t.length > 1 && lower.startsWith(t)) ? <mark key={i} className="hitword">{part}</mark> : part;
  })}</>;
}

export function PassageCard({ p, rank }: { p: Passage; rank?: number }) {
  return (
    <div className="passage">
      <div className="psg-h">
        {rank != null && <span className="rank">{rank}</span>}
        <b>{p.title}</b>
        <small>{p.page ? `sayfa ${p.page}` : `bölüm ${p.position + 1}`}</small>
        <span className="rel" title="Soruyla ilgililik"><i style={{ width: `${Math.round(p.relevance * 100)}%` }} /></span>
      </div>
      <p><MatchedText text={p.text} terms={p.matched_terms} /></p>
    </div>
  );
}
