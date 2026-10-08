"""Knowledge base: document text extraction, chunking and passage retrieval (RAG).

Verification against documents is restricted to the passages retrieved for the question and for
each sentence of the answer, so an answer is judged only by the parts of the documents that talk
about the same thing. Retrieval is BM25 over the same Turkish-aware stems the detectors use, which
keeps it deterministic, offline and explainable (every hit lists the terms that matched).
"""
import html, io, math, re
from collections import Counter
from dataclasses import dataclass, field
from .reliability import STOP, sentences, stem

MAX_UPLOAD_BYTES = 15 * 1024 * 1024
MAX_DOCUMENT_CHARS = 2_000_000
CHUNK_CHARS = 700

class DocumentError(ValueError):
    pass

# ---------- extraction ----------
TEXT_TYPES = {".txt": "txt", ".md": "md", ".markdown": "md", ".csv": "csv", ".json": "txt", ".log": "txt"}

def _decode(data: bytes) -> str:
    for encoding in ("utf-8-sig", "cp1254", "latin-1"):
        try: return data.decode(encoding)
        except UnicodeDecodeError: continue
    return data.decode("utf-8", errors="replace")

def extract(filename: str, data: bytes) -> tuple[str, list[tuple[int | None, str]]]:
    """Returns the document kind and its text as (page, text) pairs; page is None for formats without pages."""
    if not data: raise DocumentError("Dosya boş.")
    if len(data) > MAX_UPLOAD_BYTES: raise DocumentError("Dosya 15 MB sınırından büyük.")
    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    if ext == ".pdf":
        from pypdf import PdfReader
        try: reader = PdfReader(io.BytesIO(data))
        except Exception as exc: raise DocumentError("PDF dosyası açılamadı; dosya bozuk ya da şifreli olabilir.") from exc
        pages = [(i + 1, page.extract_text() or "") for i, page in enumerate(reader.pages)]
        if not any(text.strip() for _, text in pages): raise DocumentError("Bu PDF'te okunabilir metin yok (taranmış bir görüntü olabilir).")
        return "pdf", pages
    if ext == ".docx":
        import docx
        try: document = docx.Document(io.BytesIO(data))
        except Exception as exc: raise DocumentError("Word dosyası açılamadı.") from exc
        parts = [p.text for p in document.paragraphs]
        for table in document.tables:
            for row in table.rows: parts.append(" | ".join(cell.text.strip() for cell in row.cells))
        return "docx", [(None, "\n\n".join(parts))]
    if ext == ".doc": raise DocumentError("Eski .doc biçimi desteklenmiyor; dosyayı Word'de .docx olarak kaydedip tekrar yükleyin.")
    if ext in {".html", ".htm"}:
        text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", _decode(data), flags=re.S | re.I)
        text = re.sub(r"<br\s*/?>|</p>|</h\d>|</li>|</div>", "\n\n", text, flags=re.I)
        return "html", [(None, html.unescape(re.sub(r"<[^>]+>", " ", text)))]
    if ext in TEXT_TYPES: return TEXT_TYPES[ext], [(None, _decode(data))]
    raise DocumentError("Desteklenmeyen dosya türü. PDF, Word (.docx), TXT, Markdown, CSV ya da HTML yükleyin.")

# ---------- chunking ----------
def _clean(text: str) -> str:
    text = text.replace("\r", "\n").replace("­", "")
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)          # words hyphenated across PDF lines
    text = re.sub(r"[ \t\f\v]+", " ", text)
    return re.sub(r"\n\s*\n+", "\n\n", text).strip()

def chunk_pages(pages: list[tuple[int | None, str]], size: int = CHUNK_CHARS) -> list[tuple[int | None, str]]:
    """Packs paragraphs (split further into sentences when long) into ~size-character passages.
    The last sentence of a passage is repeated at the start of the next so a fact on a boundary stays findable."""
    chunks: list[tuple[int | None, str]] = []
    for page, raw in pages:
        units: list[str] = []
        for paragraph in _clean(raw).split("\n\n"):
            paragraph = " ".join(paragraph.split())
            if not paragraph: continue
            units.extend([s for _, _, s in sentences(paragraph)] if len(paragraph) > size else [paragraph])
        current: list[str] = []
        for unit in units:
            if current and len(" ".join(current)) + len(unit) + 1 > size:
                chunks.append((page, " ".join(current)))
                current = [current[-1]] if len(current[-1]) < size // 3 else []
            current.append(unit)
        if current: chunks.append((page, " ".join(current)))
    return [(p, t) for p, t in chunks if len(t.strip()) > 1]

# ---------- retrieval ----------
def stems(value: str) -> list[str]:
    words = re.findall(r"[^\W_]+", value.replace("İ", "i").lower())
    return [stem(w) if len(w) > 4 else w for w in words if w not in STOP and len(w) > 1]

@dataclass
class Passage:
    id: str
    document_id: str
    title: str
    position: int
    page: int | None
    text: str

@dataclass
class Hit:
    passage: Passage
    score: float
    matched: list[str] = field(default_factory=list)
    relevance: float = 0

class Index:
    """In-memory BM25 index over passages."""
    def __init__(self, passages: list[Passage], k1: float = 1.4, b: float = 0.75):
        self.passages = passages
        self.terms = [Counter(stems(p.text)) for p in passages]
        self.lengths = [sum(t.values()) for t in self.terms]
        self.avg = (sum(self.lengths) / len(self.lengths)) if passages else 1
        df = Counter(term for counts in self.terms for term in counts)
        n = len(passages)
        self.idf = {term: math.log(1 + (n - f + .5) / (f + .5)) for term, f in df.items()}
        self.k1, self.b = k1, b

    def search(self, query: str, k: int = 3) -> list[Hit]:
        q = list(dict.fromkeys(stems(query)))
        if not q or not self.passages: return []
        need = 1 if len(q) <= 2 else 2                         # a single shared common word is not evidence of relevance
        hits = []
        for i, counts in enumerate(self.terms):
            matched = [t for t in q if t in counts]
            if sum(not t.isdigit() for t in matched) < need: continue   # a shared bare number alone is not topical overlap
            norm = self.k1 * (1 - self.b + self.b * self.lengths[i] / max(self.avg, 1))
            score = sum(self.idf.get(t, 0) * counts[t] * (self.k1 + 1) / (counts[t] + norm) for t in matched)
            hits.append(Hit(self.passages[i], score, matched))
        return sorted(hits, key=lambda h: h.score, reverse=True)[:k]

def retrieve(index: Index, question: str, answer: str | None, k: int = 5) -> list[Hit]:
    """Union of the best passages for the question and for every sentence of the answer, so each claim
    is checked against the passage that discusses it rather than against the whole document."""
    queries = [question] + ([s for _, _, s in sentences(answer)] if answer else [])
    best: dict[str, Hit] = {}
    for query in queries:
        for hit in index.search(query, k=2):
            known = best.get(hit.passage.id)
            if not known: best[hit.passage.id] = Hit(hit.passage, hit.score, list(hit.matched))
            else:
                known.score = max(known.score, hit.score)
                known.matched = list(dict.fromkeys(known.matched + hit.matched))
    hits = sorted(best.values(), key=lambda h: h.score, reverse=True)[:k]
    top = hits[0].score if hits else 1
    for hit in hits: hit.relevance = round(hit.score / top, 3) if top else 0
    return [h for h in hits if h.relevance >= .3]               # drop passages that only brush the topic

# ---------- sample knowledge base ----------
SAMPLE_DOCUMENTS = [
    ("Örnek · Neovit 5 mg prospektüsü", """NEOVIT 5 mg Film Tablet — Kullanma Talimatı

1. Neovit nedir ve ne için kullanılır?
Neovit, yüksek tansiyon tedavisinde kullanılan bir ilaçtır. Her tablet 5 mg etkin madde içerir. Kutuda 28 tablet bulunur.

2. Neovit nasıl kullanılır?
Önerilen doz günde 1 kez 5 mg'dır. Tablet aç ya da tok karnına, bir bardak su ile yutulur. Böbrek yetmezliği olan hastalarda doz günde 1 kez 2,5 mg'a düşürülür. Günlük doz 10 mg'ı geçmemelidir.

3. Olası yan etkiler
En sık görülen yan etkiler baş ağrısı, baş dönmesi ve yorgunluktur. Bu yan etkiler 100 hastadan 1'inden azında görülür. Yüzde ya da dudaklarda şişlik olursa ilacı bırakıp hemen doktora başvurun.

4. Neovit'in saklanması
25°C'nin altındaki oda sıcaklığında, çocukların göremeyeceği yerlerde saklayın. Son kullanma tarihinden sonra kullanmayın."""),
    ("Örnek · İade ve değişim politikası", """İade ve Değişim Politikası

İade süresi
Ürünü teslim aldığınız tarihten itibaren 30 gün içinde iade edebilirsiniz. Ürün kullanılmamış ve orijinal ambalajında olmalıdır.

İade ücretinin ödenmesi
İade tutarı, iade onaylandıktan sonra 14 gün içinde ödeme yaptığınız karta yatırılır. Kapıda ödeme ile yapılan alışverişlerde tutar banka hesabınıza havale edilir.

Kargo ücreti
Kusurlu ürünlerde kargo ücretini biz karşılarız. Fikir değişikliğinden kaynaklanan iadelerde kargo ücreti 49 TL'dir.

Değişim
Beden ya da renk değişimi bir kez ücretsizdir. Değişim talepleri 7 iş günü içinde sonuçlandırılır."""),
    ("Örnek · Şirket hakkında", """Hakkımızda

Şirketimiz 2005 yılında İstanbul'da kuruldu. Bugün Türkiye, Almanya ve Hollanda olmak üzere 3 ülkede hizmet veriyoruz.

Ekibimiz
Toplam 120 çalışanımız var. Müşteri destek ekibimiz hafta içi 09.00–18.00 saatleri arasında hizmet verir.

İletişim
Genel merkezimiz İstanbul Kadıköy'dedir. Müşteri hizmetlerine 0850 000 00 00 numaralı hattan ulaşabilirsiniz."""),
]
