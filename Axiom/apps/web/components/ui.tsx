"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, scoreTone, Span, token } from "@/lib/api";
import { label, STATUS } from "@/lib/labels";

/** Redirects to /login when no session exists; returns true once the page may load data. */
export function useAuthGuard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => { if (!token()) router.replace("/login"); else setReady(true); }, [router]);
  return ready;
}

/** Loads one API resource behind the auth guard with loading/error state and a reload handle. */
export function useResource<T>(path: string | null) {
  const ready = useAuthGuard();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!ready || !path) return;
    let live = true;
    setError("");
    api<T>(path).then(x => { if (live) setData(x); }).catch(e => { if (live) setError(e instanceof Error ? e.message : "İstek başarısız oldu."); });
    return () => { live = false; };
  }, [ready, path, tick]);
  return { data, error, reload: () => setTick(t => t + 1), setData };
}

export function PageHead({ eyebrow, title, children, actions }: { eyebrow: string; title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="ph">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children && <p>{children}</p>}</div>
      {actions && <div className="acts">{actions}</div>}
    </header>
  );
}

export function ErrorNote({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="alert" role="alert"><div>{message}{retry && <> <button className="linkish" onClick={retry}>Tekrar dene</button></>}</div></div>;
}

export function Loading({ rows = 3, height = 64 }: { rows?: number; height?: number }) {
  return <div className="stack" aria-busy="true">{Array.from({ length: rows }, (_, i) => <div key={i} className="skel" style={{ height }} />)}</div>;
}

export function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card empty"><h2>{title}</h2>{children}</div>;
}

const STATUS_TONE: Record<string, string> = { passed: "ok", pass: "ok", cleared: "ok", completed: "ok", flagged: "warn", review: "warn", repair: "warn", retry: "warn", route: "warn", abstain: "warn", queued: "brand", running: "brand", hold: "brand", block: "risk", confirmed: "risk", failed: "risk" };
export function Status({ value }: { value: string }) {
  return <span className={`chip ${STATUS_TONE[value.toLowerCase()] || ""}`}><i />{label(STATUS, value)}</span>;
}

export function ScoreCell({ value }: { value: number | null | undefined }) {
  const tone = scoreTone(value);
  return (
    <span className="scorecell">
      <span className={`tone-${tone}`}>{value ?? "—"}</span>
      <span className="meter"><i className={tone === "risk" ? "risk" : tone === "warn" ? "warn" : ""} style={{ width: `${value ?? 0}%` }} /></span>
    </span>
  );
}

/**
 * Renders text with the risky spans marked; hovering a span explains why it was flagged.
 * Spans nest: a weakly supported sentence is shaded and the conflicting numbers inside it are underlined.
 */
export function Highlight({ text, spans, offset = 0 }: { text: string; spans: Span[]; offset?: number }) {
  const safe = spans.filter(x => x.start >= offset && x.end <= offset + text.length && x.end > x.start)
    .sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const parts: React.ReactNode[] = [];
  let cursor = offset;
  for (let i = 0; i < safe.length; i++) {
    const span = safe[i];
    if (span.start < cursor) continue;
    const inner = safe.filter((x, j) => j !== i && x.start >= span.start && x.end <= span.end && !(x.start === span.start && x.end === span.end));
    parts.push(text.slice(cursor - offset, span.start - offset));
    const body = text.slice(span.start - offset, span.end - offset);
    parts.push(inner.length
      ? <mark className="riskline" title={span.reason} key={`${span.start}-${span.end}`}><Highlight text={body} spans={inner} offset={span.start} /></mark>
      : <mark className="riskword" data-tip={span.reason} title={span.reason} key={`${span.start}-${span.end}`}>{body}</mark>);
    cursor = span.end;
  }
  parts.push(text.slice(cursor - offset));
  return <>{parts}</>;
}
