import re
from dataclasses import dataclass
from .reliability import sentences, tokens

@dataclass
class EvidenceRelation:
    source_external_id: str
    relation: str
    score: float
    reason: str

@dataclass
class ExtractedClaim:
    text: str
    start: int
    end: int
    classification: str
    relations: list[EvidenceRelation]

def build_evidence_graph(response: str, sources: list[dict]) -> list[ExtractedClaim]:
    claims=[]
    for start,end,text in sentences(response):
        claim_tokens=tokens(text)
        if len(claim_tokens)<2: continue
        relations=[]
        claim_numbers=set(re.findall(r"\b\d+(?:\.\d+)?",text))
        for source in sources:
            overlap=len(claim_tokens & tokens(source["content"]))/max(1,len(claim_tokens))
            source_numbers=set(re.findall(r"\b\d+(?:\.\d+)?",source["content"]))
            if overlap>=.4 and claim_numbers and source_numbers and claim_numbers!=source_numbers:
                relation,reason="contradicts","İlgili kaynakta farklı bir sayı geçiyor."
            elif overlap>=.65: relation,reason="supports","Kaynak bu ifadeyi açıkça destekliyor."
            elif overlap>=.35: relation,reason="weak_support","Kaynak bu ifadeyi kısmen destekliyor."
            else: relation,reason="unrelated","Kaynakla belirgin bir ilişkisi yok."
            relations.append(EvidenceRelation(source["id"],relation,round(overlap,3),reason))
        best="unsupported"
        if any(x.relation=="contradicts" for x in relations): best="contradicted"
        elif any(x.relation=="supports" for x in relations): best="supported"
        elif any(x.relation=="weak_support" for x in relations): best="uncertain"
        claims.append(ExtractedClaim(text,start,end,best,relations))
    return claims
