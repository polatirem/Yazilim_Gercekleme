"use client";
import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { api, scoreTone, Trace } from "@/lib/api";
import { ACTION, CLAIM, DECISION, DETECTOR, label, PROVIDER, RELATION, verdict } from "@/lib/labels";
import { Shell } from "@/components/Shell";
import { ErrorNote, Highlight, Loading, PageHead, Status, useResource } from "@/components/ui";
import { PassageCard } from "@/components/docs";

const CLAIM_TONE: Record<string, string> = { supported: "ok", uncertain: "warn", contradicted: "risk", unsupported: "risk" };
type Provider = "gemini" | "local";

export default function Inspector() {
  const { id } = useParams<{ id: string }>();
  const { data: trace, error, reload } = useResource<Trace>(`/requests/${id}`);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [provider, setProvider] = useState<Provider>("local");

  async function act(kind: string, run: () => Promise<unknown>, done: string) {
    setBusy(kind); setActionError(""); setNote("");
    try { await run(); setNote(done); reload(); } catch (e) { setActionError(e instanceof Error ? e.message : "İşlem yapılamadı."); } finally { setBusy(""); }
  }
  const review = (decision: string) => act(decision, () => api(`/requests/${id}/reviews`, { method: "POST", body: JSON.stringify({ decision, reason: `Konsol kararı: ${label(DECISION, decision)}` }) }), "Kararınız kaydedildi.");
  const repair = () => act("repair", () => api(`/requests/${id}/repair`, { method: "POST", body: JSON.stringify({ strategy: "low_reliability", provider, max_attempts: 2 }) }), "Düzeltme denendi. Sonuç aşağıda; orijinal cevap korunur.");
  const compare = () => act("replay", async () => {
    const projects = await api<{ id: string }[]>("/projects");
    for (const p of projects) {
      try { return await api(`/projects/${p.id}/replays`, { method: "POST", body: JSON.stringify({ request_id: id, candidates: [{ provider }] }) }); }
      catch (e) { if (!(e instanceof Error) || !e.message.includes("projede")) throw e; }
    }
    throw new Error("Bu kontrolün projesi bulunamadı.");
  }, "Karşılaştırma başlatıldı. Sonucu Model karşılaştırma sayfasında görebilirsiniz.");

  if (error && !trace) return <Shell><Link className="back" href="/dashboard">← Tüm kontroller</Link><ErrorNote message={error} retry={reload} /></Shell>;
  if (!trace) return <Shell><Loading rows={3} height={140} /></Shell>;

  const spans = trace.detectors?.flatMap(x => x.spans) || [];
  const score = trace.reliability?.overall;
  const tone = scoreTone(score);
  const v = verdict(score);
  const lastReview = trace.reviews?.[trace.reviews.length - 1];
  const closed = trace.status === "confirmed" || trace.status === "cleared";

  return (
    <Shell>
      <Link className="back" href="/dashboard">← Tüm kontroller</Link>
      <PageHead eyebrow="Kontrol ayrıntısı" title={v.title} actions={<Status value={trace.status} />}>
        {trace.model} · {label(PROVIDER, trace.provider)} · {new Date(trace.created_at).toLocaleString("tr-TR")}
      </PageHead>

      <div className="insp">
        <div className="stack">
          <section className="card">
            <p className="lbl">Soru</p>
            <p className="prompt">{trace.prompt || <span className="muted">Soru kaydedilmemiş</span>}</p>
            <p className="lbl">Yapay zekanın cevabı {spans.length > 0 && <span className="chip risk">{spans.length} şüpheli yer</span>}</p>
            <div className="response"><Highlight text={trace.response || ""} spans={spans} /></div>
            {spans.length > 0 && <p className="muted small" style={{ marginTop: 12 }}>Kırmızı altı çizili yerler kaynakla çelişiyor, sarı gölgeli cümleler kaynakta yeterince desteklenmiyor. Açıklama için üzerine gelin.</p>}
          </section>

          <section className="card">
            <div className="card-h"><h2>Cümle cümle karşılaştırma</h2><span>{trace.claims?.length || 0} ifade</span></div>
            {trace.claims?.length ? (
              <div className="claims">
                {trace.claims.map(c => (
                  <div className={`claim ${CLAIM_TONE[c.classification] || ""}`} key={c.id}>
                    <span className={`chip ${CLAIM_TONE[c.classification] || ""}`}>{label(CLAIM, c.classification)}</span>
                    <p>{c.text}</p>
                    {c.relations.map((r, i) => <small key={i}>Kaynak bu ifadeyle {label(RELATION, r.relation)} · %{Math.round(r.score * 100)} örtüşme</small>)}
                  </div>
                ))}
              </div>
            ) : <p className="muted">Karşılaştırılacak ifade bulunamadı.</p>}
          </section>

          <section className="card">
            <div className="card-h"><h2>{trace.metadata?.retrieval ? "Karşılaştırılan belge bölümleri" : "Doğru bilgi (kaynaklar)"}</h2><span>{trace.sources?.length || 0} {trace.metadata?.retrieval ? "bölüm" : "kaynak"}</span></div>
            {trace.metadata?.retrieval && <p className="muted small" style={{ marginTop: 0 }}>Bu bölümler {trace.metadata.retrieval.document_count} belgedeki {trace.metadata.retrieval.passage_count} bölüm arasından soruya ve cevaba göre bulundu; cevap yalnızca bunlarla karşılaştırıldı.</p>}
            {trace.sources?.length ? trace.sources.map((x, i) => x.metadata?.document_id
              ? <PassageCard key={x.id} rank={i + 1} p={{ chunk_id: x.id, document_id: x.metadata.document_id, title: (x.title || x.id).replace(/ · (sayfa|bölüm) \d+$/, ""), position: (x.metadata as { position?: number }).position ?? 0, page: x.metadata.page ?? null, text: x.content, relevance: x.metadata.relevance ?? 0, matched_terms: x.metadata.matched_terms ?? [] }} />
              : <div key={x.id} className="source"><b>{x.title || x.id}</b><p>{x.content}</p></div>)
              : <p className="muted">{trace.metadata?.retrieval ? "Belgelerde bu soruyla ilgili bir bölüm bulunamadı; cevap belgelere dayanmıyor." : "Bu kontrole kaynak eklenmemiş, bu yüzden cevap doğruluğu karşılaştırılamadı."}</p>}
          </section>

          {!!trace.repairs?.length && (
            <section className="card">
              <div className="card-h"><h2>Düzeltme denemeleri</h2><span>orijinal cevap korunur</span></div>
              {trace.repairs.map(r => (
                <div key={r.id} className="repair">
                  <div className="split"><Status value={r.status === "passed" ? "passed" : r.status} /></div>
                  {r.attempts.map(a => <div key={a.attempt} className="attempt"><span className={`sc tone-${scoreTone(a.reliability_after)}`}>{a.reliability_after}</span><p>{a.response}</p></div>)}
                </div>
              ))}
            </section>
          )}
        </div>

        <aside className="stack">
          <section className="card scorecard">
            <div className={`ring ${tone}`} style={{ ["--v" as string]: score ?? 0 }}><b>{score ?? "—"}</b></div>
            <div><h2>Güven puanı</h2><p className="muted">{v.text}</p></div>
          </section>

          <section className="card">
            <div className="card-h"><h2>Ne yapıldı?</h2></div>
            <span className={`chip ${trace.policy?.action === "PASS" ? "ok" : trace.policy?.action === "BLOCK" ? "risk" : "brand"}`}>{label(ACTION, trace.policy?.action)}</span>
            <p className="muted" style={{ marginBottom: 0 }}>{trace.policy?.reason || "Karar kaydı yok."}</p>
            <Link className="lnk" href="/policies" style={{ display: "inline-block", marginTop: 10 }}>Kuralları düzenle →</Link>
          </section>

          <section className="card">
            <div className="card-h"><h2>Kontrol sonuçları</h2></div>
            {trace.detectors?.map(x => {
              const val = Math.round((1 - x.risk) * 100), t = scoreTone(val);
              return (
                <div className="finding" key={x.detector}>
                  <div className="split"><b title={DETECTOR[x.detector]?.about}>{DETECTOR[x.detector]?.name || x.detector}</b><span className={`mono tone-${t}`}>{val}</span></div>
                  <div className="meter"><i className={t === "risk" ? "risk" : t === "warn" ? "warn" : ""} style={{ width: `${val}%` }} /></div>
                  <p>{x.reason}</p>
                </div>
              );
            })}
          </section>

          <section className="card">
            <div className="card-h"><h2>Karar ver</h2><span>{trace.reviews?.length || 0} karar · {trace.repairs?.length || 0} düzeltme</span></div>
            {lastReview && <p className="last">Son karar: <b>{label(DECISION, lastReview.decision)}</b></p>}
            {actionError && <ErrorNote message={actionError} />}
            {note && <p className="okline">✓ {note}</p>}
            <div className="stack" style={{ gap: 8, marginTop: 12 }}>
              {!closed && <>
                <button className="btn btn-ink btn-sm" disabled={!!busy} onClick={() => review("confirm_failure")}>{busy === "confirm_failure" ? "Kaydediliyor…" : "Evet, bu bir hata"}</button>
                <button className="btn btn-line btn-sm" disabled={!!busy} onClick={() => review("false_positive")}>{busy === "false_positive" ? "Kaydediliyor…" : "Yanlış alarm, sorun yok"}</button>
              </>}
              <p className="muted small" style={{ margin: "8px 0 0" }}>Yapay zeka ile:</p>
              <select className="input" value={provider} onChange={e => setProvider(e.target.value as Provider)} aria-label="Kullanılacak model" style={{ height: 38 }}>
                <option value="local">Demo modeli</option><option value="gemini">Gemini</option>
              </select>
              <div className="repair-row">
                <button className="btn btn-brand btn-sm" disabled={!!busy} onClick={repair}>{busy === "repair" ? "Düzeltiliyor…" : "Kaynağa göre düzelt"}</button>
                <button className="btn btn-line btn-sm" disabled={!!busy} onClick={compare}>{busy === "replay" ? "Başlatılıyor…" : "Bu modelle dene"}</button>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </Shell>
  );
}
