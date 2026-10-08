"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, scoreTone, timeAgo } from "@/lib/api";
import { label, PROVIDER } from "@/lib/labels";
import { Shell } from "@/components/Shell";
import { Empty, ErrorNote, Loading, PageHead, ScoreCell, Status, useAuthGuard } from "@/components/ui";

type Project = { id: string };
type Replay = { id: string; request_id: string; status: string; created_at: string; error?: string | null; candidates: { provider: string; model: string; reliability: number; latency_ms: number; is_demo: boolean }[] };

export default function Replays() {
  const ready = useAuthGuard();
  const [runs, setRuns] = useState<Replay[] | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!ready) return;
    api<Project[]>("/projects").then(async ps => (await Promise.all(ps.map(p => api<Replay[]>(`/projects/${p.id}/replays`)))).flat().sort((a, b) => b.created_at.localeCompare(a.created_at))).then(setRuns).catch(e => setError(e.message));
  }, [ready, tick]);
  return (
    <Shell>
      <PageHead eyebrow="Hangi model daha iyi?" title="Model karşılaştırma" actions={<button className="btn btn-line btn-sm" onClick={() => setTick(t => t + 1)}>↻ Yenile</button>}>
        Daha önce kontrol edilen bir soruyu başka bir modele tekrar sorup cevaplarının güven puanlarını karşılaştırın.
      </PageHead>
      {error ? <ErrorNote message={error} /> : !runs ? <Loading /> : runs.length === 0 ? (
        <Empty title="Henüz karşılaştırma yok"><p className="muted">Bir kontrolün ayrıntı sayfasını açın ve <b>Bu modelle dene</b> butonuna basın. <Link className="lnk" href="/dashboard">Kontrollere git →</Link></p></Empty>
      ) : (
        <div className="stack">
          {runs.map(r => (
            <section className="card" key={r.id}>
              <div className="card-h"><h2><Link className="lnk" href={`/requests/${r.request_id}`}>Orijinal kontrolü aç →</Link></h2><span className="split" style={{ gap: 10 }}><small className="muted">{timeAgo(r.created_at)}</small><Status value={r.status} /></span></div>
              {r.candidates.map((c, i) => (
                <div className="cand" key={i}>
                  <span><b>{label(PROVIDER, c.provider)}</b> <small className="muted">{c.model}</small></span>
                  <ScoreCell value={c.reliability} />
                  <span className={`mono tone-${scoreTone(c.reliability)}`}>{c.latency_ms} ms</span>
                </div>
              ))}
              {r.error && <ErrorNote message={r.error} />}
            </section>
          ))}
        </div>
      )}
    </Shell>
  );
}
