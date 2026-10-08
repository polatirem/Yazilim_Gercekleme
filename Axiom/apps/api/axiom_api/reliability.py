import json, re, time
from dataclasses import dataclass, field
from typing import Any, Protocol
from jsonschema import Draft202012Validator
from .schemas import DetectorOutput, Span, TraceInput

@dataclass
class DetectionContext:
    response: str
    prompt: str | None = None
    sources: list[dict[str, Any]] = field(default_factory=list)
    citations: list[dict[str, Any]] = field(default_factory=list)
    expected_schema: dict[str, Any] | None = None

class Detector(Protocol):
    name: str
    version: str
    requires_sources: bool
    def applies(self, context: DetectionContext) -> bool: ...
    async def detect(self, context: DetectionContext) -> DetectorOutput: ...

def severity(risk: float) -> str:
    return "critical" if risk >= .9 else "high" if risk >= .65 else "medium" if risk >= .35 else "low"

def result(name: str, start: float, risk: float, reason: str, **kwargs) -> DetectorOutput:
    return DetectorOutput(detector=name, version="1.0.0", risk=risk, severity=severity(risk), reason=reason, duration_ms=(time.perf_counter()-start)*1000, **kwargs)

class SchemaDetector:
    name, version, requires_sources = "schema", "1.0.0", False
    def applies(self, c): return c.expected_schema is not None
    async def detect(self, c):
        started = time.perf_counter()
        try:
            value = json.loads(c.response)
            errors = sorted(Draft202012Validator(c.expected_schema).iter_errors(value), key=lambda e: list(e.path))
        except json.JSONDecodeError as exc:
            return result(self.name, started, 1, f"Cevap geçerli bir JSON değil: {exc.msg}", spans=[Span(start=0, end=len(c.response), severity="critical", reason="Bozuk JSON")])
        if errors:
            reasons = [f"{'/'.join(map(str,e.path)) or '$'}: {e.message}" for e in errors]
            return result(self.name, started, min(1, .5 + .1*len(errors)), "; ".join(reasons), metadata={"errors": reasons})
        return result(self.name, started, 0, "Cevap beklenen formata uyuyor.")

class CitationDetector:
    name, version, requires_sources = "citation", "1.0.0", True
    def applies(self, c): return bool(c.citations)
    async def detect(self, c):
        started = time.perf_counter(); by_id = {s["id"]: s for s in c.sources}; invalid=[]
        for citation in c.citations:
            source = by_id.get(citation["source_id"])
            if not source or (citation.get("quote") and citation["quote"] not in source["content"]): invalid.append(citation["source_id"])
        risk = len(invalid)/len(c.citations)
        return result(self.name, started, risk, "Gösterilen tüm kaynaklar mevcut." if not invalid else f"Bulunamayan ya da yanlış alıntılanan kaynaklar: {', '.join(invalid)}", metadata={"invalid_source_ids": invalid})

STOP = {"the","a","an","is","are","was","were","to","of","and","or","in","on","for","it","this","that","recommended",
        "ve","veya","ile","bir","bu","şu","da","de","için","gibi","olarak","olan","mi","mı","mu","mü","çok","daha","en","ama","ancak","her","ise","kadar","göre",
        "ne","nedir","nasıl","neden","niçin","kaç","hangi","midir","mıdır","dır","dir","dur","dür","tır","tir","tur","tür","dı","di"}
# Common Turkish inflectional suffixes, longest first. Stripping them lets "yatar" meet "yatırılır" and
# "kartınıza" meet "karta"; both sides are reduced the same way, so occasional over-stemming is harmless.
SUFFIXES = sorted({"lerinden","larından","lerinde","larında","lerine","larına","leri","ları","ımız","imiz","umuz","ümüz","ınıza","inize","ınız","iniz","unuz","ünüz",
    "ından","inden","undan","ünden","ında","inde","unda","ünde","ndan","nden","nda","nde","dan","den","da","de","lar","ler",
    "ılır","ilir","ulur","ülür","ması","mesi","mak","mek","yor","dır","dir","dur","dür","tır","tir","tur","tür","sı","si","su","sü",
    "ın","in","un","ün","ya","ye","yı","yi","ar","er","ır","ir","ı","i","u","ü","a","e"}, key=len, reverse=True)

def stem(word: str) -> str:
    for _ in range(3):
        for suffix in SUFFIXES:
            if word.endswith(suffix) and len(word) - len(suffix) >= 3:
                word = word[:-len(suffix)]; break
        else: break
    return word[:6]

# Unicode-aware words so Turkish letters (ş, ı, ğ, ü, ö, ç) stay inside a word.
def tokens(value: str):
    words=re.findall(r"[^\W_]+", value.replace("İ","i").lower())
    return {stem(w) if len(w)>4 else w for w in words if w not in STOP and len(w)>1}
def sentences(value: str): return [(m.start(), m.end(), m.group().strip()) for m in re.finditer(r"[^.!?]+[.!?]?", value) if m.group().strip()]

class GroundingDetector:
    name, version, requires_sources = "grounding", "1.0.0", True
    def applies(self, c): return bool(c.sources)
    async def detect(self, c):
        started=time.perf_counter(); source_tokens=tokens(" ".join(s["content"] for s in c.sources)); unsupported=[]
        for begin,end,text in sentences(c.response):
            claim=tokens(text)
            if len(claim)>=2:
                overlap=len(claim & source_tokens)/len(claim)
                if overlap < .55: unsupported.append((begin,end,text,overlap))
        risk=max([1-x[3] for x in unsupported], default=0)
        spans=[Span(start=a,end=b,severity=severity(1-o),reason="Bu cümle verilen kaynaklarda yeterince desteklenmiyor") for a,b,_,o in unsupported]
        evidence=[{"claim": t, "support": round(o,3)} for _,_,t,o in unsupported]
        return result(self.name, started, risk, "Cevaptaki ifadeler kaynaklarla destekleniyor." if not unsupported else f"Cevaptaki {len(unsupported)} ifade kaynaklarda yeterince desteklenmiyor.", spans=spans, evidence=evidence, metadata={"method":"lexical_overlap","threshold":.55})

# A number with an optional unit; the unit must be a whole word so "10 business days" yields "10", not "10 ".
NUMBER=re.compile(r"\b\d+(?:[.,]\d+)?(?:\s*(?:mg|g|ml|%|times?|daily|weekly|kez|defa|kere|gün|hafta|ay|yıl|saat|dakika|tl)\b)?", re.I)
def normalize_quantity(value: str) -> str: return re.sub(r"\s+"," ",value.strip().lower())

class ContradictionDetector:
    name, version, requires_sources = "contradiction", "1.0.0", True
    def applies(self, c): return bool(c.sources)
    async def detect(self, c):
        started=time.perf_counter(); source_text=" ".join(s["content"] for s in c.sources); source_nums={normalize_quantity(x) for x in NUMBER.findall(source_text)}; spans=[]; evidence=[]
        for match in NUMBER.finditer(c.response):
            value=normalize_quantity(match.group())
            if source_nums and value not in source_nums and len(tokens(c.response)&tokens(source_text))>=2:
                spans.append(Span(start=match.start(),end=match.end(),severity="high",reason="Bu sayı kaynaktaki bilgiyle uyuşmuyor")); evidence.append({"response_value":value,"source_values":sorted(source_nums)})
        # A number can exist somewhere in the sources yet belong to a different subject ("2 yıl" is the product
        # warranty, the battery has "6 ay"). Compare each answer sentence's numbers with the source sentence
        # that talks about the same thing.
        flagged={(s.start,s.end) for s in spans}
        source_sentences=[(words-{w for w in words if w.isdigit()},{normalize_quantity(n) for n in NUMBER.findall(text)},text) for s in c.sources for _,_,text in sentences(s["content"]) for words in [tokens(text)]]
        for begin,_,text in sentences(c.response):
            matches=list(NUMBER.finditer(text))
            words={w for w in tokens(text) if not w.isdigit()}
            if not matches or len(words)<2: continue
            overlap,best_words,best_nums,best_text=max(((len(words&sw),sw,sn,st) for sw,sn,st in source_sentences if sn),key=lambda x:x[0],default=(0,set(),set(),""))
            if overlap/len(words)<.5: continue
            for m in matches:
                value=normalize_quantity(m.group()); start,end=begin+m.start(),begin+m.end()
                if value in best_nums or (start,end) in flagged: continue
                spans.append(Span(start=start,end=end,severity="high",reason=f"Kaynakta aynı konu için farklı bir değer geçiyor: “{best_text.strip()}”")); flagged.add((start,end))
                evidence.append({"response_value":value,"source_values":sorted(best_nums),"source_sentence":best_text.strip()})
        risk=.9 if spans else 0
        return result(self.name, started, risk, "Kaynakla çelişen bir sayı bulunmadı." if not spans else "Cevapta kaynakta geçmeyen ya da kaynakla çelişen sayı(lar) var.", spans=spans, evidence=evidence, metadata={"method":"numeric_consistency"})

PII_LABELS={"email":"e-posta adresi","payment_card":"kart numarası"}

class PiiDetector:
    name, version, requires_sources = "pii", "1.0.0", False
    patterns={"email":re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",re.I),"payment_card":re.compile(r"(?<!\d)(?:\d[ -]*?){13,19}(?!\d)")}
    def applies(self,c): return True
    async def detect(self,c):
        started=time.perf_counter(); spans=[]; kinds=[]
        for kind,pattern in self.patterns.items():
            for m in pattern.finditer(c.response): spans.append(Span(start=m.start(),end=m.end(),severity="high",reason=f"Olası kişisel veri: {PII_LABELS.get(kind,kind)}")); kinds.append(kind)
        return result(self.name, started, .8 if spans else 0, "Kişisel veri (e-posta, kart numarası) bulunmadı." if not spans else f"Cevapta kişisel veri olabilir: {', '.join(PII_LABELS.get(k,k) for k in sorted(set(kinds)))}", spans=spans, metadata={"types":sorted(set(kinds))})

class DetectorRegistry:
    def __init__(self): self._detectors=[]
    def register(self, detector): self._detectors.append(detector); return self
    async def run(self, context): return [await d.detect(context) for d in self._detectors if d.applies(context)]

registry=DetectorRegistry()
for detector in [SchemaDetector(),CitationDetector(),GroundingDetector(),ContradictionDetector(),PiiDetector()]: registry.register(detector)
WEIGHTS={"schema":1.0,"citation":.8,"grounding":1.0,"contradiction":2.0,"pii":1.0,"coverage":3.0,"semantic":5.0}
def fuse(results: list[DetectorOutput]):
    dimensions={r.detector:round(100*(1-r.risk)) for r in results}
    if not results: return {"overall":100,"status":"heuristic","dimensions":{}}
    denominator=sum(WEIGHTS.get(r.detector,1) for r in results)
    overall=round(sum((1-r.risk)*100*WEIGHTS.get(r.detector,1) for r in results)/denominator)
    return {"overall":max(0,min(100,overall)),"status":"heuristic","dimensions":dimensions}

def context_from_trace(trace: TraceInput):
    return DetectionContext(response=trace.response,prompt=trace.prompt,sources=[s.model_dump() for s in trace.sources],citations=[c.model_dump() for c in trace.citations],expected_schema=trace.expected_schema)
