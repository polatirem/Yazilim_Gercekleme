"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { api, DocumentInfo, Passage, scoreTone, Trace } from "@/lib/api";
import { ACTION, DETECTOR, label, verdict } from "@/lib/labels";
import { Shell } from "@/components/Shell";
import { ErrorNote, Highlight, PageHead, Status, useAuthGuard } from "@/components/ui";
import { PassageCard, Uploader } from "@/components/docs";

type Source = { title: string; content: string };
type Mode = "paste" | "generate";
type SourceMode = "documents" | "manual";

// Examples pair with the sample documents ("Örnek belgeleri ekle") and also carry a hand-written source for manual mode.
const EXAMPLES: { name: string; tone: string; prompt: string; response: string; sources: Source[] }[] = [
  {
    name: "İlaç dozu", tone: "risk", prompt: "Neovit'in önerilen dozu nedir?",
    response: "Neovit'in önerilen dozu günde 2 kez 50 mg'dır ve yemekle birlikte alınmalıdır.",
    sources: [{ title: "Prospektüs", content: "Önerilen doz günde 1 kez 5 mg'dır. Aç ya da tok karnına alınabilir." }],
  },
  {
    name: "İade süresi", tone: "ok", prompt: "İade param ne zaman hesabıma geçer?",
    response: "İade tutarı, iade onaylandıktan sonra 14 gün içinde kartınıza yatırılır.",
    sources: [{ title: "İade politikası", content: "İade tutarı, iade onaylandıktan sonra 14 gün içinde kartınıza yatırılır." }],
  },
  {
    name: "Kargo ücreti", tone: "risk", prompt: "İade ederken kargo ücreti ödüyor muyum?",
    response: "Hayır, tüm iadelerde kargo ücretsizdir. Fikir değişikliğinde de kargo ücreti alınmaz.",
    sources: [{ title: "İade politikası", content: "Kusurlu ürünlerde kargo ücretini biz karşılarız. Fikir değişikliğinden kaynaklanan iadelerde kargo ücreti 49 TL'dir." }],
  },
  {
    name: "Şirket bilgisi", tone: "risk", prompt: "Şirketiniz ne zaman ve nerede kuruldu?",
    response: "Şirketimiz 1998 yılında İzmir'de kuruldu ve bugün 500 çalışanı var.",
    sources: [{ title: "Hakkımızda", content: "Şirket 2005 yılında İstanbul'da kuruldu. Bugün 3 ülkede hizmet veriyor." }],
  },
];

function passagesOf(trace: Trace): Passage[] {
  return (trace.sources || []).filter(s => s.metadata?.document_id).map(s => {
    const full = s.title || s.id, cut = full.lastIndexOf(" · ");
    const title = cut > 0 ? full.slice(0, cut) : full;
    const m = s.metadata!;
    return { chunk_id: s.id, document_id: m.document_id!, title, position: (m as { position?: number }).position ?? 0, page: m.page ?? null, text: s.content, relevance: m.relevance ?? 0, matched_terms: m.matched_terms ?? [] };
  });
}

export default function Check() {
  const ready = useAuthGuard();
  const [mode, setMode] = useState<Mode>("paste");
  const [sourceMode, setSourceMode] = useState<SourceMode>("documents");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [sources, setSources] = useState<Source[]>([{ title: "", content: "" }]);
  const [docs, setDocs] = useState<DocumentInfo[] | null>(null);
  const [selected, setSelected] = useState<string[] | null>(null); // null = all documents
  const [showUpload, setShowUpload] = useState(false);
  const [provider, setProvider] = useState<"gemini" | "local">("gemini");
  const [gemini, setGemini] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<Trace | null>(null);
  const [decided, setDecided] = useState("");
  const [deepCheck, setDeepCheck] = useState(true);

  const loadDocs = () => api<DocumentInfo[]>("/documents").then(setDocs).catch(() => setDocs([]));
  useEffect(() => {
    if (!ready) return;
    loadDocs();
    api<{ name: string; available: boolean }[]>("/integrations").then(x => {
      const ok = !!x.find(i => i.name === "Gemini")?.available;
      setGemini(ok); if (!ok) setProvider("local");
    }).catch(() => setGemini(false));
  }, [ready]);
  useEffect(() => { if (docs && docs.length === 0) setShowUpload(true); }, [docs]);

  async function applyExample(i: number) {
    const ex = EXAMPLES[i];
    setMode("paste"); setPrompt(ex.prompt); setResponse(ex.response); setSources(ex.sources.map(s => ({ ...s }))); setError(""); setNote("");
    if (sourceMode === "documents" && !docs?.some(d => d.title.startsWith("Örnek ·"))) {
      try { await api("/documents/samples", { method: "POST" }); await loadDocs(); setSelected(null); setNote("Örnek belgeler bilgi bankanıza eklendi; örnek cevap bu belgelere göre kontrol edilecek."); }
      catch (e) { setError(e instanceof Error ? e.message : "Örnek belgeler eklenemedi."); }
    }
  }
  const setSource = (i: number, patch: Partial<Source>) => setSources(list => list.map((s, j) => j === i ? { ...s, ...patch } : s));
  const toggleDoc = (id: string) => setSelected(sel => {
    const all = (docs || []).map(d => d.id);
    const current = sel ?? all;
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    return next.length === all.length ? null : next;
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(""); setDecided(""); setNote("");
    if (!prompt.trim()) return setError("Soruyu yazın.");
    if (mode === "paste" && !response.trim()) return setError("Kontrol edilecek cevabı yapıştırın.");
    const filled = sources.filter(s => s.content.trim());
    if (sourceMode === "manual" && !filled.length) return setError("En az bir kaynak metni yazın ya da \"Belgelerimden bul\" seçeneğini kullanın.");
    if (sourceMode === "documents" && !docs?.length) return setError("Önce en az bir belge yükleyin.");
    if (sourceMode === "documents" && selected?.length === 0) return setError("Aranacak en az bir belge seçin.");
    setBusy(true); setResult(null);
    try {
      const evidence = sourceMode === "documents"
        ? { source_mode: "documents", document_ids: selected ?? undefined }
        : { source_mode: "manual", sources: filled.map(s => ({ title: s.title.trim() || undefined, content: s.content.trim() })) };
      const body = { prompt: prompt.trim(), ...evidence, deep_check: deepCheck && gemini !== false, ...(mode === "paste" ? { response } : { generate: true, provider }) };
      setResult(await api<Trace>("/checks", { method: "POST", body: JSON.stringify(body) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kontrol yapılamadı.");
    } finally { setBusy(false); }
  }

  async function decide(decision: "confirm_failure" | "false_positive") {
    if (!result) return;
    try {
      await api(`/requests/${result.id}/reviews`, { method: "POST", body: JSON.stringify({ decision, reason: decision === "confirm_failure" ? "Kontrol ekranında hata onaylandı" : "Kontrol ekranında yanlış alarm olarak işaretlendi" }) });
      setDecided(decision);
    } catch (err) { setError(err instanceof Error ? err.message : "Karar kaydedilemedi."); }
  }

  const score = result?.reliability?.overall;
  const tone = scoreTone(score);
  const v = verdict(score);
  const spans = result?.detectors?.flatMap(d => d.spans) || [];
  const problems = result?.detectors?.filter(d => d.risk >= 0.3) || [];
  const retrieval = result?.metadata?.retrieval;
  const passages = result ? passagesOf(result) : [];
  const noCoverage = !!result?.detectors?.some(d => d.detector === "coverage");
  const semantic = result?.detectors?.find(d => d.detector === "semantic")?.evidence as { claim: string; verdict: string; evidence?: string; explanation?: string }[] | undefined;

  return (
    <Shell>
      <PageHead eyebrow="Yeni kontrol" title="Bir cevabı kontrol et">
        Yapay zekanın verdiği cevabı girin. Axiom belgelerinizde soruyla ilgili bölümleri bulur, cevabı yalnızca bu bölümlerle karşılaştırır ve uydurulan, çelişen ya da belgelerde olmayan kısımları işaretler.
      </PageHead>

      <div className="check">
        <form className="card check-form" onSubmit={submit}>
          <div className="examples">
            <span>Örnekle dene:</span>
            {EXAMPLES.map((ex, i) => <button type="button" key={ex.name} className={`chip ${ex.tone}`} onClick={() => applyExample(i)}><i />{ex.name}</button>)}
          </div>

          <label className="field"><span>1. Soru</span>
            <textarea className="input area" rows={2} placeholder="Örn. İade param ne zaman hesabıma geçer?" value={prompt} onChange={e => setPrompt(e.target.value)} />
          </label>

          <div className="field">
            <span>2. Yapay zekanın cevabı</span>
            <div className="seg">
              <button type="button" className={mode === "paste" ? "on" : ""} onClick={() => setMode("paste")}>Cevabı yapıştır</button>
              <button type="button" className={mode === "generate" ? "on" : ""} onClick={() => setMode("generate")}>Yapay zekaya ürettir</button>
            </div>
            {mode === "paste" ? (
              <textarea className="input area" rows={4} placeholder="Chatbot'unuzun ya da modelinizin verdiği cevabı buraya yapıştırın." value={response} onChange={e => setResponse(e.target.value)} />
            ) : (
              <div className="gen">
                <select className="input" value={provider} onChange={e => setProvider(e.target.value as "gemini" | "local")}>
                  <option value="gemini" disabled={gemini === false}>Gemini{gemini === false ? " (bağlı değil)" : ""}</option>
                  <option value="local">Demo modeli (anahtar gerekmez)</option>
                </select>
                <p className="muted">{sourceMode === "documents" ? "Model, belgelerinizden bulunan ilgili bölümlerle cevap üretir (RAG); üretilen cevap aynı bölümlerle doğrulanır." : "Soru ve kaynaklar modele gönderilir, üretilen cevap anında kontrol edilir."}{gemini === false && <> Gemini için <Link className="lnk" href="/integrations">Bağlantılar</Link> sayfasına bakın.</>}</p>
              </div>
            )}
          </div>

          <div className="field">
            <span>3. Doğru bilgi</span>
            <div className="seg">
              <button type="button" className={sourceMode === "documents" ? "on" : ""} onClick={() => setSourceMode("documents")}>Belgelerimden bul</button>
              <button type="button" className={sourceMode === "manual" ? "on" : ""} onClick={() => setSourceMode("manual")}>Elle yaz</button>
            </div>
            {sourceMode === "documents" ? (
              <div className="docpick">
                {docs === null ? <small className="muted">Belgeler yükleniyor…</small> : docs.length === 0 ? (
                  <small className="muted">Henüz belge yok. Bir belge yükleyin ya da bir örneğe tıklayın; örnek belgeler otomatik eklenir.</small>
                ) : (
                  <>
                    <small className="muted">Aranacak belgeler · {selected === null ? "tümü" : `${selected.length}/${docs.length}`} seçili</small>
                    <div className="docchips">
                      {docs.map(d => {
                        const on = selected === null || selected.includes(d.id);
                        return <button type="button" key={d.id} className={`docchip ${on ? "on" : ""}`} onClick={() => toggleDoc(d.id)} title={`${d.chunk_count} bölüm`}><i>{on ? "✓" : ""}</i>{d.title}</button>;
                      })}
                    </div>
                  </>
                )}
                {showUpload ? <Uploader compact onUploaded={doc => { setDocs(l => [doc, ...(l || [])]); setSelected(sel => sel ? [...sel, doc.id] : null); }} /> : (
                  <div className="split"><button type="button" className="add" onClick={() => setShowUpload(true)}>+ Belge yükle</button><Link className="lnk small" href="/documents">Belgeleri yönet →</Link></div>
                )}
              </div>
            ) : (
              <>
                <small className="muted">Cevabın dayanması gereken metni doğrudan yazın ya da yapıştırın.</small>
                {sources.map((s, i) => (
                  <div className="src-in" key={i}>
                    <div className="split">
                      <input className="input slim" placeholder={`Kaynak ${i + 1} adı (isteğe bağlı)`} value={s.title} onChange={e => setSource(i, { title: e.target.value })} />
                      {sources.length > 1 && <button type="button" className="x" aria-label="Kaynağı kaldır" onClick={() => setSources(l => l.filter((_, j) => j !== i))}>✕</button>}
                    </div>
                    <textarea className="input area" rows={3} placeholder="Doğru bilgiyi içeren metni buraya yapıştırın." value={s.content} onChange={e => setSource(i, { content: e.target.value })} />
                  </div>
                ))}
                {sources.length < 5 && <button type="button" className="add" onClick={() => setSources(l => [...l, { title: "", content: "" }])}>+ Kaynak ekle</button>}
              </>
            )}
          </div>

          <label className={`deep ${gemini === false ? "off" : ""}`}>
            <input type="checkbox" checked={deepCheck && gemini !== false} disabled={gemini === false} onChange={e => setDeepCheck(e.target.checked)} />
            <span><b>Anlam kontrolü (yapay zeka)</b>Sayı içermeyen çelişkileri de yakalar: Gemini, yalnızca bulunan bölümlere bakarak her ifadeyi değerlendirir.{gemini === false && " Gemini bağlı olmadığı için kapalı."}</span>
          </label>

          {note && <p className="okline">✓ {note}</p>}
          {error && <ErrorNote message={error} />}
          <button className="btn btn-brand btn-block" disabled={busy}>{busy ? <><span className="spin" /> Kontrol ediliyor…</> : <>Kontrol et <span className="ar">→</span></>}</button>
        </form>

        <section className={`card check-result ${busy ? "scanning" : ""}`} aria-live="polite">
          {busy ? (
            <div className="res-empty"><div className="scanner"><span /></div><h2>{sourceMode === "documents" ? "Belgelerde aranıyor" : "Cevap okunuyor"}</h2><p className="muted">{sourceMode === "documents" ? "İlgili bölümler bulunuyor ve her cümle bu bölümlerle karşılaştırılıyor…" : "Her cümle kaynakla karşılaştırılıyor…"}</p></div>
          ) : !result ? (
            <div className="res-empty">
              <div className="res-ill"><span className="l1" /><span className="l2" /><span className="l3" /></div>
              <h2>Sonuç burada görünecek</h2>
              <p className="muted">Formu doldurun ya da soldaki örneklerden birini seçip <b>Kontrol et</b>&apos;e basın.</p>
            </div>
          ) : (
            <div className="res">
              <div className="res-top">
                <div className={`ring ${tone}`} style={{ ["--v" as string]: score ?? 0 }}><b>{score ?? "—"}</b></div>
                <div>
                  <p className="muted small">Güven puanı / 100</p>
                  <h2 className={`tone-${tone}`}>{noCoverage ? "Belgelerde karşılığı yok" : v.title}</h2>
                  <p className="muted">{noCoverage ? "Belgelerinizde bu soruyla ilgili bir bölüm bulunamadı. Cevap doğrulanamıyor; yapay zeka bu bilgiyi uydurmuş olabilir." : v.text}</p>
                </div>
              </div>

              <p className="lbl">Cevap {spans.length > 0 && <span className="muted small">— işaretli yerlerin üzerine gelin</span>}</p>
              <div className="res-answer"><Highlight text={result.response || ""} spans={spans} /></div>

              <p className="lbl">Bulunanlar</p>
              {problems.length === 0 ? <p className="okline">✓ Sorun bulunmadı. Cevap {retrieval ? "belgelerle" : "kaynaklarla"} uyumlu.</p> : (
                <ul className="probs">
                  {problems.map(d => <li key={d.detector}><b>{DETECTOR[d.detector]?.name || d.detector}</b><span>{d.reason}</span></li>)}
                </ul>
              )}

              {semantic && (
                <>
                  <p className="lbl">İfade ifade değerlendirme <span className="muted small">— yapay zeka, yalnızca bulunan bölümlere göre</span></p>
                  <ul className="claims-ai">
                    {semantic.map((c, i) => (
                      <li key={i} className={c.verdict}>
                        <span className={`chip ${c.verdict === "supported" ? "ok" : c.verdict === "contradicted" ? "risk" : "warn"}`}><i />{c.verdict === "supported" ? "Doğru" : c.verdict === "contradicted" ? "Çelişiyor" : "Belgede yok"}</span>
                        <div><b>{c.claim}</b>{c.explanation && <span>{c.explanation}</span>}{c.evidence && <q>{c.evidence}</q>}</div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {result.metadata?.semantic_check?.status === "unavailable" && <p className="muted small" style={{ margin: 0 }}>ⓘ Anlam kontrolü bu sefer yapılamadı ({result.metadata.semantic_check.message}). Sonuç, kelime ve sayı karşılaştırmasına dayanıyor.</p>}

              {retrieval && (
                <>
                  <p className="lbl">Karşılaştırılan belge bölümleri <span className="muted small">— {retrieval.document_count} belgedeki {retrieval.passage_count} bölüm arasından</span></p>
                  {passages.length === 0 ? <p className="muted small" style={{ margin: 0 }}>İlgili bölüm bulunamadı.</p> : (
                    <div className="stack" style={{ gap: 8 }}>{passages.map((p, i) => <PassageCard key={p.chunk_id} p={p} rank={i + 1} />)}</div>
                  )}
                </>
              )}

              <div className="res-foot">
                <span>Kural kararı: <b>{label(ACTION, result.policy?.action)}</b></span>
                <Status value={decided === "confirm_failure" ? "confirmed" : decided === "false_positive" ? "cleared" : result.status} />
              </div>

              <div className="res-acts">
                {result.status !== "passed" && !decided && <>
                  <button className="btn btn-ink btn-sm" onClick={() => decide("confirm_failure")}>Evet, bu bir hata</button>
                  <button className="btn btn-line btn-sm" onClick={() => decide("false_positive")}>Yanlış alarm</button>
                </>}
                {decided && <span className="chip ok">Kararınız kaydedildi</span>}
                <Link className="btn btn-line btn-sm" href={`/requests/${result.id}`}>Ayrıntılar →</Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}
