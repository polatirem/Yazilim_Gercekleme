"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ACTION, label } from "@/lib/labels";
import { Shell } from "@/components/Shell";
import { ErrorNote, Loading, PageHead, useAuthGuard } from "@/components/ui";

type Project = { id: string; name: string };
type Condition = { metric: string; operator: string; value: number };
type Rule = { action: string; reason: string; conditions: Condition[] };
type Policy = { id: string; name: string; enabled: boolean; versions: { version: number; rules: Rule[]; created_at: string }[] };
type Row = { metric: string; value: number; action: string; reason: string };

const METRICS: Record<string, string> = { reliability: "Genel güven puanı", contradiction: "Çelişki puanı", grounding: "Kaynağa dayanma puanı", pii: "Kişisel veri puanı", citation: "Kaynak gösterme puanı", schema: "Format puanı" };
const ACTIONS = ["BLOCK", "HOLD", "REVIEW", "REPAIR", "FLAG", "PASS"];
const ACTION_HINT: Record<string, string> = { BLOCK: "Cevap kullanıcıya hiç gösterilmez", HOLD: "Cevap bir insan onaylayana kadar bekletilir", REVIEW: "Cevap incelemeye düşer", REPAIR: "Cevap kaynaklara göre düzeltilir", FLAG: "Cevap gider ama işaretlenir", PASS: "Cevap olduğu gibi geçer" };
const PRESET: Row[] = [
  { metric: "reliability", value: 30, action: "BLOCK", reason: "Güven puanı çok düşük" },
  { metric: "contradiction", value: 50, action: "HOLD", reason: "Cevap kaynakla çelişiyor" },
  { metric: "reliability", value: 70, action: "FLAG", reason: "Cevap şüpheli" },
];

export default function Policies() {
  const ready = useAuthGuard();
  const [project, setProject] = useState<Project | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");

  async function load() {
    const projects = await api<Project[]>("/projects");
    const p = projects[0] || null; setProject(p);
    if (!p) { setRows(PRESET); return; }
    const list = await api<Policy[]>(`/projects/${p.id}/policies`);
    const current = list.find(x => x.enabled) || list[0] || null;
    setPolicy(current);
    const rules = current?.versions[0]?.rules || [];
    setRows(rules.length ? rules.map(r => ({ metric: r.conditions[0]?.metric || "reliability", value: r.conditions[0]?.value ?? 70, action: r.action, reason: r.reason })) : PRESET);
  }
  useEffect(() => { if (ready) load().catch(e => setError(e.message)); }, [ready]);

  const update = (i: number, patch: Partial<Row>) => { setSaved(""); setRows(list => (list || []).map((r, j) => j === i ? { ...r, ...patch } : r)); };
  const move = (i: number, d: number) => setRows(list => { const l = [...(list || [])]; const [r] = l.splice(i, 1); l.splice(i + d, 0, r); return l; });

  async function save() {
    if (!project || !rows?.length) return;
    setSaving(true); setError(""); setSaved("");
    const body = { name: policy?.name || "Cevap kuralları", rules: rows.map(r => ({ conditions: [{ metric: r.metric, operator: "lt", value: Math.max(0, Math.min(100, Number(r.value) || 0)) }], action: r.action, reason: r.reason.trim() || `${METRICS[r.metric]} ${r.value} altında` })) };
    try {
      if (policy) await api(`/policies/${policy.id}/versions`, { method: "POST", body: JSON.stringify(body) });
      else await api(`/projects/${project.id}/policies`, { method: "POST", body: JSON.stringify(body) });
      await load(); setSaved("Kurallar kaydedildi. Bundan sonraki tüm kontroller bu kurallarla değerlendirilecek.");
    } catch (e) { setError(e instanceof Error ? e.message : "Kurallar kaydedilemedi."); }
    finally { setSaving(false); }
  }

  return (
    <Shell>
      <PageHead eyebrow="Ne yapılsın?" title="Kurallar">
        Şüpheli bir cevap yakalandığında ne olacağına siz karar verin. Kurallar yukarıdan aşağıya okunur, ilk uyan kural uygulanır. Hiçbiri uymazsa 70 altı cevaplar işaretlenir.
      </PageHead>
      {error && <ErrorNote message={error} />}
      {!rows ? <Loading /> : (
        <section className="card">
          <div className="card-h"><h2>{policy ? `${policy.name}` : "Yeni kural seti"}</h2><span>{policy ? `sürüm ${policy.versions[0]?.version} · her kayıt yeni sürüm olur` : "henüz kaydedilmedi"}</span></div>
          <div className="rule-ed">
            {rows.map((r, i) => (
              <div className="rrow" key={i}>
                <span className="rn">{i + 1}</span>
                <span className="rt">Eğer</span>
                <select className="input" value={r.metric} onChange={e => update(i, { metric: e.target.value })}>{Object.entries(METRICS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <input className="input num" type="number" min={0} max={100} value={r.value} onChange={e => update(i, { value: Number(e.target.value) })} />
                <span className="rt">altındaysa</span>
                <select className={`input act a-${r.action}`} value={r.action} onChange={e => update(i, { action: e.target.value })} title={ACTION_HINT[r.action]}>{ACTIONS.map(a => <option key={a} value={a}>{label(ACTION, a)}</option>)}</select>
                <input className="input why" placeholder="Açıklama (isteğe bağlı)" value={r.reason} onChange={e => update(i, { reason: e.target.value })} />
                <span className="rctl">
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Yukarı taşı">↑</button>
                  <button type="button" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Aşağı taşı">↓</button>
                  <button type="button" disabled={rows.length === 1} onClick={() => setRows(l => (l || []).filter((_, j) => j !== i))} aria-label="Kuralı sil">✕</button>
                </span>
                <small className="hint2">{ACTION_HINT[r.action]}</small>
              </div>
            ))}
          </div>
          <div className="split" style={{ marginTop: 16, flexWrap: "wrap" }}>
            <button className="add" type="button" disabled={rows.length >= 20} onClick={() => setRows(l => [...(l || []), { metric: "reliability", value: 50, action: "REVIEW", reason: "" }])}>+ Kural ekle</button>
            <button className="btn btn-brand btn-sm" disabled={saving || !project} onClick={save}>{saving ? "Kaydediliyor…" : "Kuralları kaydet"}</button>
          </div>
          {saved && <p className="okline" style={{ marginTop: 14 }}>✓ {saved}</p>}
        </section>
      )}
    </Shell>
  );
}
