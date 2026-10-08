import io
import pytest
from httpx import ASGITransport, AsyncClient
from axiom_api.knowledge import Index, Passage, chunk_pages, extract, retrieve, SAMPLE_DOCUMENTS
from axiom_api.main import app

def sample_index():
    passages = []
    for d, (title, text) in enumerate(SAMPLE_DOCUMENTS):
        for position, (page, chunk) in enumerate(chunk_pages([(None, text)], size=260)):
            passages.append(Passage(id=f"{d}-{position}", document_id=str(d), title=title, position=position, page=page, text=chunk))
    return Index(passages)

def test_retrieval_finds_the_passage_each_claim_is_about():
    hits = retrieve(sample_index(), "Neovit'in önerilen dozu nedir?", "Önerilen doz günde 2 kez 50 mg'dır.")
    assert hits and "günde 1 kez 5 mg" in hits[0].passage.text
    assert all(h.passage.document_id == "0" for h in hits[:2])
    refund = retrieve(sample_index(), "İade param ne zaman yatar?", None)
    assert "14 gün" in refund[0].passage.text

def test_unrelated_question_retrieves_nothing():
    assert retrieve(sample_index(), "Mars'a ilk insanlı uçuş ne zaman yapıldı?", None) == []

def test_extract_docx_and_rejects_unknown_types():
    import docx
    buffer = io.BytesIO(); document = docx.Document(); document.add_paragraph("İade süresi 30 gündür."); document.save(buffer)
    kind, pages = extract("politika.docx", buffer.getvalue())
    assert kind == "docx" and "30 gündür" in pages[0][1]
    with pytest.raises(ValueError): extract("resim.png", b"\x89PNG")

def test_chunks_carry_overlap_and_respect_size():
    text = " ".join(f"Cümle numarası {i} burada yer alıyor." for i in range(60))
    chunks = chunk_pages([(3, text)], size=200)
    assert len(chunks) > 3 and all(page == 3 for page, _ in chunks) and all(len(c) <= 260 for _, c in chunks)

@pytest.mark.asyncio
async def test_document_grounded_check_end_to_end():
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            token = (await client.post("/auth/login", json={"email": "demo@example.com", "password": "demo-password"})).json()["access_token"]
            user = {"authorization": f"Bearer {token}"}
            no_docs = await client.post("/checks", headers=user, json={"prompt": "Doz?", "response": "5 mg.", "source_mode": "documents"})
            assert no_docs.status_code == 422
            samples = await client.post("/documents/samples", headers=user); assert samples.status_code == 201 and len(samples.json()) == 3
            upload = await client.post("/documents", headers=user, files={"file": ("garanti.txt", "Garanti süresi 2 yıldır. Pil garanti kapsamında değildir.".encode("utf-8"), "text/plain")})
            assert upload.status_code == 201 and upload.json()["chunk_count"] >= 1
            listing = (await client.get("/documents", headers=user)).json(); assert len(listing) == 4

            wrong = (await client.post("/checks", headers=user, json={"prompt": "Neovit'in önerilen dozu nedir?", "response": "Önerilen doz günde 2 kez 50 mg'dır.", "source_mode": "documents"})).json()
            assert wrong["reliability"]["overall"] < 70
            assert wrong["sources"] and all("Neovit" in s["title"] for s in wrong["sources"][:1])
            assert any(d["spans"] for d in wrong["detectors"] if d["detector"] == "contradiction")

            right = (await client.post("/checks", headers=user, json={"prompt": "Garanti süresi ne kadar?", "response": "Garanti süresi 2 yıldır.", "source_mode": "documents"})).json()
            assert right["reliability"]["overall"] >= 70 and right["sources"][0]["title"].startswith("garanti")

            unknown = (await client.post("/checks", headers=user, json={"prompt": "Mars'a insanlı uçuş ne zaman yapıldı?", "response": "2031 yılında yapıldı.", "source_mode": "documents"})).json()
            assert unknown["reliability"]["overall"] < 50 and any(d["detector"] == "coverage" for d in unknown["detectors"])

            search = (await client.post("/documents/search", headers=user, json={"query": "kargo ücreti"})).json()
            assert "49 TL" in search["hits"][0]["text"]
            removed = await client.delete(f"/documents/{upload.json()['id']}", headers=user); assert removed.status_code == 204
            assert len((await client.get("/documents", headers=user)).json()) == 3

@pytest.mark.asyncio
async def test_semantic_check_marks_contradicted_claim(monkeypatch):
    import json
    from axiom_api import semantic
    from axiom_api.providers import Generation
    from axiom_api.schemas import SourceInput
    class Judge:
        async def generate(self, prompt, **kwargs):
            assert "49 TL" in prompt and kwargs.get("response_schema")
            return Generation(text=json.dumps({"claims": [{"claim": "tüm iadelerde kargo ücretsizdir", "verdict": "contradicted", "evidence": "kargo ücreti 49 TL'dir", "explanation": "Fikir değişikliğinde kargo ücretlidir."}]}), provider="gemini", model="judge", latency_ms=1)
    monkeypatch.setattr(semantic, "get_provider", lambda name: Judge())
    answer = "Hayır, tüm iadelerde kargo ücretsizdir."
    out = await semantic.semantic_check("Kargo ücreti var mı?", answer, [SourceInput(id="k", title="İade", content="Fikir değişikliğinden kaynaklanan iadelerde kargo ücreti 49 TL'dir.")])
    assert out.risk >= .9 and answer[out.spans[0].start:out.spans[0].end].lower() == "tüm iadelerde kargo ücretsizdir"
