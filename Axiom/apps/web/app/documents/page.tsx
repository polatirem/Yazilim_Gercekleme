"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { api, DocumentInfo, Passage, timeAgo } from "@/lib/api";
import { DOC_KIND, label } from "@/lib/labels";
import { Shell } from "@/components/Shell";
import { ErrorNote, Loading, PageHead, useResource } from "@/components/ui";
import { PassageCard, Uploader } from "@/components/docs";

type Detail = DocumentInfo & { chunks: { position: number; page: number | null; text: string }[] };

export default function Documents() {
  const { data: docs, error, reload, setData } = useResource<DocumentInfo[]>("/documents");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [open, setOpen] = useState<Detail | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Passage[] | null>(null);

  const add = (doc: DocumentInfo) => setData(list => [doc, ...(list || []).filter(d => d.id !== doc.id)]);

  async function run(kind: string, fn: () => Promise<void>) {
    setBusy(kind); setActionError(""); setNote("");
    try { await fn(); } catch (e) { setActionError(e instanceof Error ? e.message : "İşlem yapılamadı."); } finally { setBusy(""); }
  }
  const savePaste = (e: FormEvent) => { e.preventDefault(); run("paste", async () => {
    const doc = await api<DocumentInfo>("/documents/text", { method: "POST", body: JSON.stringify({ title: title.trim() || "Yapıştırılan metin", text }) });
    add(doc); setTitle(""); setText(""); setPasteOpen(false); setNote(`"${doc.title}" eklendi ve ${doc.chunk_count} bölüme ayrıldı.`);
  }); };
  const samples = () => run("samples", async () => {
    const added = await api<DocumentInfo[]>("/documents/samples", { method: "POST" });
    reload(); setNote(added.length ? `${added.length} örnek belge eklendi.` : "Örnek belgeler zaten ekli.");
  });
  const remove = (doc: DocumentInfo) => {
    if (!window.confirm(`"${doc.title}" silinsin mi? Bu belge artık kontrollerde kullanılmaz.`)) return;
    run(`del-${doc.id}`, async () => { await api(`/documents/${doc.id}`, { method: "DELETE" }); setData(list => (list || []).filter(d => d.id !== doc.id)); if (open?.id === doc.id) setOpen(null); });
  };
  const view = (doc: DocumentInfo) => run(`view-${doc.id}`, async () => setOpen(open?.id === doc.id ? null : await api<Detail>(`/documents/${doc.id}`)));
  const search = (e: FormEvent) => { e.preventDefault(); if (!query.trim()) return; run("search", async () => setHits((await api<{ hits: Passage[] }>("/documents/search", { method: "POST", body: JSON.stringify({ query, k: 5 }) })).hits)); };

  const totalChunks = (docs || []).reduce((n, d) => n + d.chunk_count, 0);

  return (
    <Shell>
      <PageHead eyebrow="Bilgi bankası" title="Belgeler" actions={<Link className="btn btn-brand btn-sm" href="/check">Belgelerle kontrol et →</Link>}>
        Yapay zekanın dayanması gereken doğru bilgileri buraya yükleyin: ürün kılavuzları, politikalar, prospektüsler, sözleşmeler. Her kontrolde Axiom bu belgelerde soruyla ilgili bölümleri bulur ve cevabı yalnızca o bölümlerle karşılaştırır.
      </PageHead>

      {actionError && <ErrorNote message={actionError} />}
      {note && <p className="okline" style={{ marginBottom: 14 }}>✓ {note}</p>}

      <div className="docs-top">
        <section className="card">
          <Uploader onUploaded={add} />
          <div className="docs-alt">
            <button className="add" onClick={() => setPasteOpen(o => !o)}>{pasteOpen ? "× Kapat" : "+ Metin yapıştırarak ekle"}</button>
            <button className="add" disabled={busy === "samples"} onClick={samples}>{busy === "samples" ? "Ekleniyor…" : "+ Örnek belgeleri ekle"}</button>
          </div>
          {pasteOpen && (
            <form className="paste" onSubmit={savePaste}>
              <input className="input" placeholder="Belge adı (ör. Kargo politikası)" value={title} onChange={e => setTitle(e.target.value)} />
              <textarea className="input area" rows={6} placeholder="Belgenin metnini buraya yapıştırın." value={text} onChange={e => setText(e.target.value)} />
              <button className="btn btn-ink btn-sm" disabled={!text.trim() || busy === "paste"}>{busy === "paste" ? "Kaydediliyor…" : "Belge olarak kaydet"}</button>
            </form>
          )}
        </section>
        <section className="card how-rag">
          <h2>Nasıl çalışır?</h2>
          <ol>
            <li><b>Bölümlere ayırma</b>Her belge ~700 karakterlik, birbiriyle hafif örtüşen bölümlere ayrılır.</li>
            <li><b>İlgili bölümü bulma</b>Kontrolde sorunun ve cevaptaki her cümlenin en ilgili bölümleri aranır (Türkçe eklere duyarlı).</li>
            <li><b>Sınırlı doğrulama</b>Cevap sadece bulunan bölümlerle karşılaştırılır. Hiç bölüm bulunamazsa cevap &quot;belgelere dayanmıyor&quot; sayılır.</li>
          </ol>
          <p className="muted small">{docs ? `${docs.length} belge · ${totalChunks} bölüm aranabilir durumda` : ""}</p>
        </section>
      </div>

      {error ? <ErrorNote message={error} retry={reload} /> : !docs ? <Loading /> : docs.length === 0 ? (
        <div className="card empty"><h2>Henüz belge yok</h2><p className="muted">Bir dosya yükleyin ya da denemek için <b>Örnek belgeleri ekle</b>&apos;ye tıklayın (ilaç prospektüsü, iade politikası, şirket bilgisi).</p></div>
      ) : (
        <section className="card tbl docs-list">
          <div className="tr th"><span>Belge</span><span>Tür</span><span>Bölüm</span><span>Eklendi</span><span /></div>
          {docs.map(d => (
            <div key={d.id}>
              <div className="tr">
                <span><b>{d.title}</b><small>{d.filename || "metin"} · {(d.char_count / 1000).toFixed(1)} bin karakter{d.page_count ? ` · ${d.page_count} sayfa` : ""}</small></span>
                <span><span className="chip">{label(DOC_KIND, d.content_type)}</span></span>
                <span className="mono">{d.chunk_count}</span>
                <span className="muted">{timeAgo(d.created_at)}</span>
                <span className="rowacts">
                  <button onClick={() => view(d)} title="Bölümleri göster" aria-label="Bölümleri göster">{open?.id === d.id ? "▴" : "▾"}</button>
                  <button onClick={() => remove(d)} title="Sil" aria-label="Sil" className="del">✕</button>
                </span>
              </div>
              {open?.id === d.id && (
                <div className="chunks">
                  {open.chunks.map(c => <div key={c.position} className="chunk"><small>{c.page ? `Sayfa ${c.page} · ` : ""}Bölüm {c.position + 1}</small><p>{c.text}</p></div>)}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {!!docs?.length && (
        <section className="card" style={{ marginTop: 14 }}>
          <div className="card-h"><h2>Belgelerde ara</h2><span>kontrol sırasında bulunacak bölümleri önceden görün</span></div>
          <form className="searchrow" onSubmit={search}>
            <input className="input" placeholder="Ör. İade param ne zaman yatar?" value={query} onChange={e => setQuery(e.target.value)} />
            <button className="btn btn-ink btn-sm" disabled={busy === "search"}>{busy === "search" ? "Aranıyor…" : "Ara"}</button>
          </form>
          {hits && (hits.length === 0 ? <p className="muted" style={{ marginBottom: 0 }}>Bu soruyla ilgili bir bölüm bulunamadı. Böyle bir soruya verilen cevap belgelere dayanmıyor sayılır.</p> : (
            <div className="stack" style={{ gap: 10, marginTop: 14 }}>{hits.map((h, i) => <PassageCard key={h.chunk_id} p={h} rank={i + 1} />)}</div>
          ))}
        </section>
      )}
    </Shell>
  );
}
