"""Meaning-level verification restricted to the retrieved passages.

The lexical detectors catch invented numbers and unsupported sentences but cannot see that
"kargo her zaman ücretsiz" contradicts "fikir değişikliğinde kargo 49 TL". This check asks the
model to judge each claim of the answer using only the passages Axiom retrieved, and to quote the
passage it relied on. It never sees the whole knowledge base and is told not to use outside knowledge.
"""
import json, re
from .providers import get_provider
from .schemas import DetectorOutput, SourceInput, Span

SCHEMA = {
    "type": "object",
    "properties": {"claims": {"type": "array", "items": {"type": "object", "properties": {
        "claim": {"type": "string"},
        "verdict": {"type": "string", "enum": ["supported", "contradicted", "not_found"]},
        "evidence": {"type": "string"},
        "explanation": {"type": "string"},
    }, "required": ["claim", "verdict", "explanation"]}}},
    "required": ["claims"],
}

PROMPT = """You are a strict fact-checker. Use ONLY the numbered passages below; never use outside knowledge.
Split the ANSWER into its factual claims. For each claim return:
- claim: the exact words copied from the answer
- verdict: "supported" if the passages state it, "contradicted" if the passages state something incompatible
  (a different number, the opposite statement, a different condition or exception), "not_found" if the passages do not cover it
- evidence: an exact quote from the passage you relied on (empty if not_found)
- explanation: one short sentence in Turkish explaining the verdict

QUESTION: {question}

PASSAGES:
{passages}

ANSWER: {answer}"""

VERDICT_RISK = {"contradicted": .95, "not_found": .6, "supported": 0}

def _locate(answer: str, claim: str) -> tuple[int, int] | None:
    claim = claim.strip().strip('"“”.')
    if not claim: return None
    at = answer.lower().find(claim.lower())
    if at >= 0: return at, at + len(claim)
    words = [w for w in re.findall(r"[^\W_]+", claim) if len(w) > 2]
    if len(words) >= 2:                                       # tolerate small rewording by anchoring on first/last word
        first, last = answer.lower().find(words[0].lower()), answer.lower().rfind(words[-1].lower())
        if 0 <= first < last: return first, last + len(words[-1])
    return None

async def semantic_check(question: str, answer: str, sources: list[SourceInput]) -> DetectorOutput:
    passages = "\n\n".join(f"[{i + 1}] {s.title or s.id}\n{s.content}" for i, s in enumerate(sources))
    generated = await get_provider("gemini").generate(PROMPT.format(question=question, passages=passages, answer=answer), response_schema=SCHEMA)
    try:
        claims = json.loads(re.sub(r"^```(?:json)?|```$", "", generated.text.strip()).strip())["claims"]
    except (ValueError, KeyError, TypeError):
        claims = []
    findings, spans = [], []
    for item in claims:
        verdict = item.get("verdict") if item.get("verdict") in VERDICT_RISK else "not_found"
        findings.append({"claim": item.get("claim", ""), "verdict": verdict, "evidence": item.get("evidence", ""), "explanation": item.get("explanation", "")})
        where = _locate(answer, item.get("claim", ""))
        if verdict != "supported" and where:
            spans.append(Span(start=where[0], end=where[1], severity="critical" if verdict == "contradicted" else "medium", reason=item.get("explanation") or ("Belgelerle çelişiyor" if verdict == "contradicted" else "Belgelerde geçmiyor")))
    contradicted = sum(f["verdict"] == "contradicted" for f in findings)
    missing = sum(f["verdict"] == "not_found" for f in findings)
    risk = max((VERDICT_RISK[f["verdict"]] for f in findings), default=0)
    if not findings: reason = "Anlam kontrolü bir sonuç döndürmedi."
    elif not contradicted and not missing: reason = f"Cevaptaki {len(findings)} ifadenin tamamı belgelerle destekleniyor."
    else: reason = "Anlam kontrolü: " + ", ".join(x for x in [f"{contradicted} ifade belgelerle çelişiyor" if contradicted else "", f"{missing} ifade belgelerde geçmiyor" if missing else ""] if x) + "."
    severity = "critical" if risk >= .9 else "high" if risk >= .65 else "medium" if risk >= .35 else "low"
    return DetectorOutput(detector="semantic", version="1.0.0", risk=risk, severity=severity, reason=reason, evidence=findings, spans=spans, metadata={"model": generated.model, "method": "llm_restricted_to_retrieved_passages"})
