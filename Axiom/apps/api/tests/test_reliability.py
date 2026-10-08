import pytest
from axiom_api.reliability import DetectionContext, registry, fuse

@pytest.mark.asyncio
async def test_dosage_contradiction_has_precise_risk_span():
    response="The recommended dosage is 50 mg twice daily."
    results=await registry.run(DetectionContext(response=response,sources=[{"id":"s1","content":"The recommended dosage is 5 mg once daily."}]))
    contradiction=next(x for x in results if x.detector=="contradiction")
    assert contradiction.risk==.9
    assert response[contradiction.spans[0].start:contradiction.spans[0].end]=="50 mg"
    assert fuse(results)["overall"] < 70

@pytest.mark.asyncio
async def test_number_without_unit_matching_source_is_not_a_contradiction():
    text="Refunds are issued to the original payment method within 10 business days."
    results=await registry.run(DetectionContext(response=text,sources=[{"id":"policy","content":text}]))
    assert next(x for x in results if x.detector=="contradiction").risk==0
    assert fuse(results)["overall"]>=70

@pytest.mark.asyncio
async def test_number_from_another_subject_in_the_source_is_still_a_contradiction():
    source="Ürün 2 yıl garantilidir. Pil, ilk 6 ay boyunca garanti kapsamındadır."
    response="Evet, pil 2 yıl boyunca garanti kapsamındadır."
    results=await registry.run(DetectionContext(response=response,sources=[{"id":"k","content":source}]))
    contradiction=next(x for x in results if x.detector=="contradiction")
    assert [response[s.start:s.end] for s in contradiction.spans]==["2 yıl"]
    correct=await registry.run(DetectionContext(response="Pil 6 ay boyunca garanti kapsamındadır.",sources=[{"id":"k","content":source}]))
    assert next(x for x in correct if x.detector=="contradiction").risk==0

@pytest.mark.asyncio
async def test_valid_schema_and_invalid_schema():
    valid=await registry.run(DetectionContext(response='{"name":"Axiom"}',expected_schema={"type":"object","required":["name"],"properties":{"name":{"type":"string"}}}))
    invalid=await registry.run(DetectionContext(response='{"name":7}',expected_schema={"type":"object","required":["name"],"properties":{"name":{"type":"string"}}}))
    assert next(x for x in valid if x.detector=="schema").risk==0
    assert next(x for x in invalid if x.detector=="schema").risk>0

@pytest.mark.asyncio
async def test_invalid_citation_and_pii():
    results=await registry.run(DetectionContext(response="Email me at user@example.com",sources=[{"id":"real","content":"nothing"}],citations=[{"source_id":"missing"}]))
    assert next(x for x in results if x.detector=="citation").risk==1
    assert next(x for x in results if x.detector=="pii").spans

