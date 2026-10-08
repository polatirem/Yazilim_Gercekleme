"use client";
import { timeAgo } from "@/lib/api";
import { AGENT_FINDING, label } from "@/lib/labels";
import { Shell } from "@/components/Shell";
import { Empty, ErrorNote, Loading, PageHead, Status, useResource } from "@/components/ui";

type Run = { id: string; name: string; status: string; created_at: string; findings: { type: string; severity: string; reason: string; step: number; call: number; tool: string }[]; steps: { position: number; name: string; tool_calls: { tool: string; status: string; confirmed: boolean }[] }[] };

export default function Agents() {
  const { data: runs, error, reload } = useResource<Run[]>("/agent-runs");
  return (
    <Shell>
      <PageHead eyebrow="Yapay zeka ajanları" title="Ajan işlemleri" actions={<button className="btn btn-line btn-sm" onClick={reload}>↻ Yenile</button>}>
        Kendi başına işlem yapan yapay zeka ajanlarının attığı adımlar. İzinsiz ya da onaysız yapılan işlemler kırmızıyla gösterilir.
      </PageHead>
      {error ? <ErrorNote message={error} retry={reload} /> : !runs ? <Loading /> : runs.length === 0 ? (
        <Empty title="Henüz ajan işlemi yok"><p className="muted">Ajanınızın adımları uygulamanızdan otomatik olarak gönderildiğinde burada görünür. Denemek için: <code>python examples/agent-demo/demo.py</code></p></Empty>
      ) : (
        <div className="stack">
          {runs.map(r => (
            <section className="card" key={r.id}>
              <div className="card-h"><h2>{r.name}</h2><span className="split" style={{ gap: 10 }}><small className="muted">{timeAgo(r.created_at)}</small><Status value={r.status} /></span></div>
              <div className="traj">
                {r.steps.flatMap(s => s.tool_calls.map((c, i) => {
                  const bad = r.findings.find(f => f.step === s.position && f.call === i);
                  return <span key={`${s.position}-${i}`} className={`tcall ${bad ? "bad" : ""}`} title={bad?.reason}><code>{c.tool}</code></span>;
                }))}
                {!r.steps.some(s => s.tool_calls.length) && <span className="muted">Araç kullanılmamış</span>}
              </div>
              {r.findings.map((f, i) => <div className="alert" key={i} style={{ marginTop: 10 }}><div><b>{label(AGENT_FINDING, f.type)}</b> · <code>{f.tool}</code> — {f.reason}</div></div>)}
            </section>
          ))}
        </div>
      )}
    </Shell>
  );
}
