import pytest
from httpx import ASGITransport, AsyncClient
from axiom_api.main import app

@pytest.mark.asyncio
async def test_full_ingest_and_inspect_flow():
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app),base_url="http://test") as client:
            login=await client.post("/auth/login",json={"email":"demo@example.com","password":"demo-password"})
            assert login.status_code==200
            user_headers={"authorization":f"Bearer {login.json()['access_token']}"}
            response=await client.post("/v1/traces",headers={"authorization":"Bearer ax_demo_local","idempotency-key":"api-test-flow"},json={"provider":"local","model":"demo","prompt":"Dosage?","response":"The recommended dosage is 50 mg twice daily.","sources":[{"id":"guide","content":"The recommended dosage is 5 mg once daily."}]})
            assert response.status_code==201, response.text
            trace=response.json(); assert trace["reliability"]["overall"]<70; assert trace["status"] in {"flagged","hold"}
            listing=await client.get("/requests",headers=user_headers); assert any(x["id"]==trace["id"] for x in listing.json()["items"])
            detail=await client.get(f"/requests/{trace['id']}",headers=user_headers); assert detail.status_code==200; assert detail.json()["detectors"]
            duplicate=await client.post("/v1/traces",headers={"authorization":"Bearer ax_demo_local","idempotency-key":"api-test-flow"},json={"model":"ignored","response":"ignored"})
            assert duplicate.json()["id"]==trace["id"]
            outsider=await client.post("/auth/register",json={"email":"outsider@example.com","password":"safe-password","organization_name":"Other tenant"})
            outsider_headers={"authorization":f"Bearer {outsider.json()['access_token']}"}
            assert (await client.get(f"/requests/{trace['id']}",headers=outsider_headers)).status_code==404
            assert not (await client.get("/requests",headers=outsider_headers)).json()["items"]

@pytest.mark.asyncio
async def test_login_errors_are_readable_and_lan_origins_pass_preflight():
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app),base_url="http://test") as client:
            invalid=await client.post("/auth/login",json={"email":"not-an-email","password":"short"})
            assert invalid.status_code==422
            error=invalid.json()["error"]; assert error["code"]=="VALIDATION_ERROR"; assert "E-posta" in error["message"] and error["request_id"]
            wrong=await client.post("/auth/login",json={"email":"demo@example.com","password":"wrong-password"})
            assert wrong.status_code==401 and wrong.json()["error"]["code"]=="INVALID_CREDENTIALS"
            preflight=await client.options("/auth/login",headers={"origin":"http://172.20.10.2:3000","access-control-request-method":"POST","access-control-request-headers":"content-type"})
            assert preflight.status_code==200 and preflight.headers["access-control-allow-origin"]=="http://172.20.10.2:3000"
            foreign=await client.options("/auth/login",headers={"origin":"https://evil.example","access-control-request-method":"POST"})
            assert "access-control-allow-origin" not in foreign.headers
            assert (await client.get("/requests?cursor=not-a-date",headers={"authorization":f"Bearer {(await client.post('/auth/login',json={'email':'demo@example.com','password':'demo-password'})).json()['access_token']}"})).status_code==400

@pytest.mark.asyncio
async def test_console_check_flags_turkish_answer_and_review_closes_it():
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app),base_url="http://test") as client:
            token=(await client.post("/auth/login",json={"email":"demo@example.com","password":"demo-password"})).json()["access_token"]; user={"authorization":f"Bearer {token}"}
            check=await client.post("/checks",headers=user,json={"prompt":"İade ne zaman yatar?","response":"İade tutarı 30 gün içinde hesabınıza yatırılır.","sources":[{"content":"İade tutarı 14 gün içinde kartınıza yatırılır."}]})
            assert check.status_code==201, check.text
            body=check.json(); assert body["status"]!="passed"; assert any(s for d in body["detectors"] for s in d["spans"])
            assert (await client.get("/requests",headers=user)).json()["items"][0]["prompt_preview"]=="İade ne zaman yatar?"
            assert any(x["id"]==body["id"] for x in (await client.get("/reviews",headers=user)).json())
            await client.post(f"/requests/{body['id']}/reviews",headers=user,json={"decision":"confirm_failure","reason":"Yanlış süre"})
            assert not any(x["id"]==body["id"] for x in (await client.get("/reviews",headers=user)).json())
            generated=await client.post("/checks",headers=user,json={"prompt":"Önerilen doz nedir?","generate":True,"provider":"local","sources":[{"content":"Önerilen doz günde 1 kez 5 mg'dır."}]})
            assert generated.status_code==201 and generated.json()["reliability"]["overall"]<70
            missing=await client.post("/checks",headers=user,json={"prompt":"Soru"})
            assert missing.status_code==422 and "cevab" in missing.json()["error"]["message"]
