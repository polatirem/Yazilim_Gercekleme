import pytest
from httpx import ASGITransport, AsyncClient
from axiom_api.main import app

@pytest.mark.asyncio
async def test_policy_evidence_review_dataset_agent_and_replay_flow():
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app),base_url="http://test") as client:
            login=await client.post("/auth/login",json={"email":"demo@example.com","password":"demo-password"}); user={"authorization":f"Bearer {login.json()['access_token']}"}; runtime={"authorization":"Bearer ax_demo_local"}
            project=(await client.get("/projects",headers=user)).json()[0]
            policy=await client.post(f"/projects/{project['id']}/policies",headers=user,json={"name":"RAG guard","rules":[{"conditions":[{"metric":"contradiction","operator":"lt","value":50}],"action":"HOLD","reason":"Numeric contradiction"}]}); assert policy.status_code==201
            trace=(await client.post("/v1/traces",headers={**runtime,"idempotency-key":"advanced-flow"},json={"model":"demo","response":"The dosage is 50 mg.","sources":[{"id":"guide","content":"The dosage is 5 mg."}]})).json()
            assert trace["policy"]["action"]=="HOLD" and trace["claims"][0]["classification"]=="contradicted"
            review=(await client.post(f"/requests/{trace['id']}/reviews",headers=user,json={"decision":"correct","reason":"Wrong dose","corrected_response":"The dosage is 5 mg."})).json()
            dataset=await client.post(f"/projects/{project['id']}/datasets/from-reviews",headers=user,json={"name":"Reviewed failures","review_ids":[review["id"]]}); assert dataset.json()["example_count"]==1
            agent=await client.post("/v1/agent-runs",headers=runtime,json={"name":"unsafe","allowed_tools":{"cancel":{"type":"object"}},"confirmation_required":["cancel"],"steps":[{"name":"cancel","tool_calls":[{"tool":"cancel","arguments":{},"confirmed":False}]}]}); assert agent.json()["status"]=="failed"
            replay=await client.post(f"/projects/{project['id']}/replays",headers=user,json={"request_id":trace["id"],"candidates":[{"provider":"local"}]}); assert replay.status_code==202
            replays=(await client.get(f"/projects/{project['id']}/replays",headers=user)).json(); assert replays[0]["status"]=="completed" and replays[0]["candidates"][0]["is_demo"] is True
