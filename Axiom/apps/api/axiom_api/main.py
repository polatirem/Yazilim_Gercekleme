from contextlib import asynccontextmanager
from collections import defaultdict, deque
import time
from datetime import datetime, timezone
from uuid import uuid4
import jwt
from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, Header, HTTPException, Request, Response, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from .config import settings
from .db import Base, SessionLocal, engine, get_db
from .models import AgentRun, AgentStep, ApiKey, AuditEvent, Claim, ClaimEvidenceLink, Dataset, DatasetExample, DetectorResultModel, Document, DocumentChunk, Environment, Organization, OrganizationMember, Policy, PolicyExecution, PolicyVersion, Project, ReliabilityScore, Repair, RepairAttempt, ReplayCandidate, ReplayRun, RequestTrace, Review, RiskSpanModel, Source, ToolCall, User
from .reliability import context_from_trace, fuse, registry
from .schemas import AgentRunInput, AuthInput, CheckInput, DetectorOutput, DocumentSearchInput, DocumentTextInput, SourceInput, DatasetInput, GenerateInput, LoginInput, NameInput, PolicyInput, RepairInput, ReplayInput, ReviewInput, TraceInput
from .providers import ProviderError, get_provider
from .policy_engine import evaluate
from .evidence import build_evidence_graph
from .agent_reliability import inspect_tool_calls
from .knowledge import MAX_DOCUMENT_CHARS, MAX_UPLOAD_BYTES, SAMPLE_DOCUMENTS, DocumentError, Hit, Index, Passage, chunk_pages, extract, retrieve
from .semantic import semantic_check
from .security import create_token, decode_token, hash_api_key, hash_password, new_api_key, verify_password

def api_error(code: str, message: str, http_status: int = 400):
    raise HTTPException(status_code=http_status, detail={"code": code, "message": message})

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_demo()
    yield

# Browsers normally reach the API through the Next.js /api proxy (same origin, no CORS).
# Direct calls are still allowed from loopback and private-network dev hosts, e.g. a phone on the LAN.
LOCAL_ORIGINS=r"^https?://(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$"
app = FastAPI(title="Axiom API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in settings.cors_origins.split(",")], allow_origin_regex=LOCAL_ORIGINS, allow_credentials=False, allow_methods=["*"], allow_headers=["*"])
rate_windows: dict[str, deque] = defaultdict(deque)

@app.middleware("http")
async def basic_rate_limit(request: Request, call_next):
    if request.url.path.startswith(("/auth/","/v1/")):
        key=f"{request.client.host if request.client else 'unknown'}:{request.url.path}"; now_value=time.monotonic(); window=rate_windows[key]
        while window and window[0]<now_value-60: window.popleft()
        limit=20 if request.url.path.startswith("/auth/") else 120
        if len(window)>=limit: return JSONResponse(status_code=429,content={"error":{"code":"RATE_LIMITED","message":"Çok fazla istek gönderildi, biraz sonra tekrar deneyin.","request_id":getattr(request.state,"request_id",str(uuid4()))}})
        window.append(now_value)
    return await call_next(request)

@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    body = exc.detail if isinstance(exc.detail, dict) else {"code":"HTTP_ERROR","message":str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content={"error":{**body,"request_id":getattr(request.state,"request_id",str(uuid4()))}})

FIELD_LABELS={"email":"E-posta","password":"Şifre","prompt":"Soru","response":"Cevap","content":"Kaynak metin","name":"Ad","reason":"Açıklama","sources":"Kaynaklar","rules":"Kurallar","value":"Değer"}
def turkish_validation(error: dict) -> str:
    kind, ctx = error.get("type",""), error.get("ctx") or {}
    if kind=="missing": return "zorunlu alan"
    if kind=="string_too_short": return "boş bırakılamaz" if ctx.get("min_length")==1 else f"en az {ctx.get('min_length')} karakter olmalı"
    if kind=="string_too_long": return f"en fazla {ctx.get('max_length')} karakter olabilir"
    if kind=="value_error" and "email" in error.get("msg","").lower(): return "geçerli bir e-posta adresi değil"
    if kind in {"too_short","too_long"}: return "öğe sayısı uygun değil"
    if kind in {"greater_than_equal","less_than_equal"}: return "izin verilen aralığın dışında"
    if kind in {"literal_error","enum"}: return "geçersiz seçim"
    return error.get("msg","geçersiz değer")

@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    fields=[{"field":".".join(str(x) for x in e["loc"] if x!="body"),"message":turkish_validation(e)} for e in exc.errors()]
    message="; ".join(f"{FIELD_LABELS.get(f['field'].split('.')[-1],f['field'])}: {f['message']}" if f["field"] else f["message"] for f in fields) or "Gönderilen bilgiler geçersiz."
    return JSONResponse(status_code=422, content={"error":{"code":"VALIDATION_ERROR","message":message,"fields":fields,"request_id":getattr(request.state,"request_id",str(uuid4()))}})

@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error":{"code":"INTERNAL_ERROR","message":"Beklenmeyen bir sunucu hatası oluştu.","request_id":getattr(request.state,"request_id",str(uuid4()))}})

@app.middleware("http")
async def request_id(request: Request, call_next):
    request.state.request_id = request.headers.get("x-request-id", str(uuid4()))
    response = await call_next(request)
    response.headers["x-request-id"] = request.state.request_id
    return response

async def seed_demo():
    async with SessionLocal() as db:
        if (await db.scalar(select(User).where(User.email == "demo@example.com"))): return
        user=User(email="demo@example.com",password_hash=hash_password("demo-password")); org=Organization(name="Axiom Demo")
        db.add_all([user,org]); await db.flush(); db.add(OrganizationMember(user_id=user.id,organization_id=org.id,role="owner"))
        project=Project(organization_id=org.id,name="Demo proje"); db.add(project); await db.flush()
        env=Environment(project_id=project.id,name="development"); db.add(env); await db.flush()
        if not await db.scalar(select(ApiKey).where(ApiKey.secret_hash==hash_api_key(settings.axiom_demo_api_key))):
            db.add(ApiKey(environment_id=env.id,name="Local demo",prefix=settings.axiom_demo_api_key[:12],secret_hash=hash_api_key(settings.axiom_demo_api_key)))
        await db.commit()

async def current_user(authorization: str | None = Header(default=None), db: AsyncSession = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "): api_error("AUTH_REQUIRED","Oturum açmanız gerekiyor.",401)
    try: user_id=decode_token(authorization[7:])
    except jwt.PyJWTError: api_error("INVALID_TOKEN","Oturumunuzun süresi doldu, lütfen tekrar giriş yapın.",401)
    user=await db.get(User,user_id)
    if not user: api_error("INVALID_TOKEN","Oturumdaki kullanıcı bulunamadı, lütfen tekrar giriş yapın.",401)
    return user

async def user_org(user: User, db: AsyncSession):
    row=await db.scalar(select(Organization).join(OrganizationMember).where(OrganizationMember.user_id==user.id))
    if not row: api_error("TENANT_NOT_FOUND","Bu hesap bir organizasyona bağlı değil.",403)
    return row

def audit(db: AsyncSession, org_id: str, actor_id: str, action: str, resource_type: str, resource_id: str, metadata: dict | None=None):
    db.add(AuditEvent(organization_id=org_id,actor_id=actor_id,action=action,resource_type=resource_type,resource_id=resource_id,metadata_json=metadata or {}))

async def runtime_scope(authorization: str | None, db: AsyncSession):
    if not authorization or not authorization.startswith("Bearer "): api_error("API_KEY_REQUIRED","Çalışma zamanı API anahtarı gerekli.",401)
    key=await db.scalar(select(ApiKey).where(ApiKey.secret_hash==hash_api_key(authorization[7:]),ApiKey.revoked_at.is_(None)))
    if not key: api_error("INVALID_API_KEY","API anahtarı geçersiz ya da iptal edilmiş.",401)
    env=await db.get(Environment,key.environment_id); project=await db.get(Project,env.project_id)
    key.last_used_at=datetime.now(timezone.utc)
    return key,env,project

@app.get("/health")
async def health(db: AsyncSession=Depends(get_db)):
    await db.execute(select(1)); return {"status":"ok"}

@app.post("/auth/register", status_code=201)
async def register(body: AuthInput, db: AsyncSession=Depends(get_db)):
    if await db.scalar(select(User).where(User.email==body.email.lower())): api_error("EMAIL_EXISTS","Bu e-posta adresiyle zaten bir hesap var.",409)
    user=User(email=body.email.lower(),password_hash=hash_password(body.password)); org=Organization(name=body.organization_name or "My organization")
    db.add_all([user,org]); await db.flush(); db.add(OrganizationMember(user_id=user.id,organization_id=org.id,role="owner")); await db.commit()
    return {"access_token":create_token(user.id),"token_type":"bearer"}

@app.post("/auth/login")
async def login(body: LoginInput, db: AsyncSession=Depends(get_db)):
    user=await db.scalar(select(User).where(User.email==body.email.lower()))
    if not user or not verify_password(body.password,user.password_hash): api_error("INVALID_CREDENTIALS","E-posta veya şifre hatalı.",401)
    return {"access_token":create_token(user.id),"token_type":"bearer"}

@app.get("/me")
async def me(user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); return {"id":user.id,"email":user.email,"organization":{"id":org.id,"name":org.name}}

@app.get("/integrations")
async def integrations(user: User=Depends(current_user)):
    return [{"name":"Gemini","available":bool(settings.gemini_api_key),"model":settings.gemini_model,"description":"Cevap üretme ve hatalı cevapları kaynaklara göre düzeltme."},{"name":"Demo modeli","available":True,"model":"deterministic-rag","description":"Anahtar gerektirmeyen, her seferinde aynı cevabı veren deneme modeli."},{"name":"HTTP API","available":True,"description":"Kendi uygulamanızdan cevapları otomatik kontrole göndermek için."},{"name":"JavaScript SDK","available":True,"description":"Node.js ve tarayıcı uygulamaları için hazır istemci."},{"name":"Python SDK","available":True,"description":"Python uygulamaları için hazır istemci."}]

@app.get("/projects")
async def list_projects(user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); rows=(await db.scalars(select(Project).where(Project.organization_id==org.id).options(selectinload(Project.environments)).order_by(Project.created_at))).all()
    return [{"id":p.id,"name":p.name,"environments":[{"id":e.id,"name":e.name} for e in p.environments]} for p in rows]

@app.post("/projects", status_code=201)
async def create_project(body: NameInput, user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); project=Project(organization_id=org.id,name=body.name); db.add(project); await db.flush(); env=Environment(project_id=project.id,name="development"); db.add(env); await db.commit()
    return {"id":project.id,"name":project.name,"environments":[{"id":env.id,"name":env.name}]}

@app.post("/projects/{project_id}/environments", status_code=201)
async def create_environment(project_id: str, body: NameInput, user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); project=await db.scalar(select(Project).where(Project.id==project_id,Project.organization_id==org.id))
    if not project: api_error("PROJECT_NOT_FOUND","Proje bulunamadı.",404)
    env=Environment(project_id=project.id,name=body.name); db.add(env)
    try: await db.commit()
    except IntegrityError: await db.rollback(); api_error("ENVIRONMENT_EXISTS","Bu ortam adı zaten kullanılıyor.",409)
    return {"id":env.id,"name":env.name}

@app.post("/environments/{environment_id}/api-keys", status_code=201)
async def create_key(environment_id: str, body: NameInput, user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); env=await db.scalar(select(Environment).join(Project).where(Environment.id==environment_id,Project.organization_id==org.id))
    if not env: api_error("ENVIRONMENT_NOT_FOUND","Ortam bulunamadı.",404)
    secret=new_api_key(); key=ApiKey(environment_id=env.id,name=body.name,prefix=secret[:12],secret_hash=hash_api_key(secret)); db.add(key); await db.commit()
    audit(db,org.id,user.id,"api_key.created","api_key",key.id,{"environment_id":env.id,"prefix":key.prefix}); await db.commit(); return {"id":key.id,"name":key.name,"prefix":key.prefix,"secret":secret,"warning":"This secret will not be shown again."}

@app.get("/projects/{project_id}/policies")
async def list_policies(project_id: str, user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); project=await db.scalar(select(Project).where(Project.id==project_id,Project.organization_id==org.id))
    if not project: api_error("PROJECT_NOT_FOUND","Proje bulunamadı.",404)
    rows=(await db.scalars(select(Policy).where(Policy.project_id==project_id).options(selectinload(Policy.versions)))).all()
    return [{"id":p.id,"name":p.name,"enabled":p.enabled,"versions":[{"id":v.id,"version":v.version,"rules":v.rules_json,"created_at":iso(v.created_at)} for v in sorted(p.versions,key=lambda x:x.version,reverse=True)]} for p in rows]

@app.post("/projects/{project_id}/policies", status_code=201)
async def create_policy(project_id: str, body: PolicyInput, user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); project=await db.scalar(select(Project).where(Project.id==project_id,Project.organization_id==org.id))
    if not project: api_error("PROJECT_NOT_FOUND","Proje bulunamadı.",404)
    policy=Policy(project_id=project.id,name=body.name); db.add(policy); await db.flush(); version=PolicyVersion(policy_id=policy.id,version=1,rules_json=[r.model_dump() for r in body.rules]); db.add(version); audit(db,org.id,user.id,"policy.created","policy",policy.id); await db.commit()
    return {"id":policy.id,"name":policy.name,"enabled":True,"version":{"id":version.id,"version":1,"rules":version.rules_json}}

@app.post("/policies/{policy_id}/versions", status_code=201)
async def version_policy(policy_id: str, body: PolicyInput, user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); policy=await db.scalar(select(Policy).join(Project).where(Policy.id==policy_id,Project.organization_id==org.id))
    if not policy: api_error("POLICY_NOT_FOUND","Kural seti bulunamadı.",404)
    latest=await db.scalar(select(PolicyVersion).where(PolicyVersion.policy_id==policy.id).order_by(PolicyVersion.version.desc()))
    policy.name=body.name; version=PolicyVersion(policy_id=policy.id,version=(latest.version+1 if latest else 1),rules_json=[r.model_dump() for r in body.rules]); db.add(version); await db.commit()
    return {"id":version.id,"version":version.version,"rules":version.rules_json}

@app.post("/v1/traces", status_code=201)
async def ingest_trace(body: TraceInput, authorization: str | None=Header(default=None), idempotency_key: str | None=Header(default=None,alias="Idempotency-Key"), db: AsyncSession=Depends(get_db)):
    _,env,project=await runtime_scope(authorization,db)
    return await analyze_and_store(body,env,project,idempotency_key,db)

async def analyze_and_store(body: TraceInput, env: Environment, project: Project, idempotency_key: str | None, db: AsyncSession, extra_outputs: list[DetectorOutput] | None=None):
    """Runs detectors, the active policy and the evidence graph, then persists the trace. Shared by the runtime API and console checks."""
    if idempotency_key:
        existing=await db.scalar(select(RequestTrace).where(RequestTrace.environment_id==env.id,RequestTrace.idempotency_key==idempotency_key))
        if existing: return serialize_trace(await load_trace(db,existing.id), detail=True)
    outputs=await registry.run(context_from_trace(body))+(extra_outputs or []); score=fuse(outputs)
    policy_version=await db.scalar(select(PolicyVersion).join(Policy).where(Policy.project_id==project.id,Policy.enabled.is_(True)).order_by(PolicyVersion.created_at.desc()))
    decision=evaluate(policy_version.rules_json,score["overall"],score["dimensions"],"FLAG" if score["overall"]<70 else "PASS") if policy_version else evaluate([],score["overall"],score["dimensions"],"FLAG" if score["overall"]<70 else "PASS")
    trace_status={"PASS":"passed","FLAG":"flagged"}.get(decision.action,decision.action.lower())
    trace=RequestTrace(organization_id=project.organization_id,project_id=project.id,environment_id=env.id,idempotency_key=idempotency_key,provider=body.provider,model=body.model,prompt=body.prompt,system_prompt=body.system_prompt,response=body.response,status=trace_status,latency_ms=body.latency_ms,input_tokens=body.input_tokens,output_tokens=body.output_tokens,metadata_json=body.metadata)
    db.add(trace); await db.flush()
    stored_sources={}
    for source in body.sources:
        stored_source=Source(request_id=trace.id,external_id=source.id,title=source.title,content=source.content,metadata_json=source.metadata); db.add(stored_source); await db.flush(); stored_sources[source.id]=stored_source
    for extracted in build_evidence_graph(body.response,[s.model_dump() for s in body.sources]):
        claim=Claim(request_id=trace.id,text=extracted.text,start_offset=extracted.start,end_offset=extracted.end,classification=extracted.classification); db.add(claim); await db.flush()
        for relation in extracted.relations:
            source=stored_sources.get(relation.source_external_id)
            if source: db.add(ClaimEvidenceLink(claim_id=claim.id,source_id=source.id,relation=relation.relation,score=relation.score,reason=relation.reason))
    for output in outputs:
        stored=DetectorResultModel(request_id=trace.id,detector=output.detector,version=output.version,risk=output.risk,severity=output.severity,reason=output.reason,evidence_json=output.evidence,metadata_json=output.metadata,duration_ms=output.duration_ms); db.add(stored); await db.flush()
        for span in output.spans: db.add(RiskSpanModel(detector_result_id=stored.id,start_offset=span.start,end_offset=span.end,severity=span.severity,reason=span.reason))
    stored_score=ReliabilityScore(request_id=trace.id,overall=score["overall"],status=score["status"],dimensions_json=score["dimensions"]); db.add(stored_score)
    execution=PolicyExecution(request_id=trace.id,policy_version_id=policy_version.id if policy_version else None,action=decision.action,matched_rule_json=decision.matched_rule,reason=decision.reason); db.add(execution); await db.commit()
    loaded=await load_trace(db,trace.id)
    return serialize_trace(loaded,detail=True)

async def default_scope(user: User, db: AsyncSession):
    """The console works inside the organization's first project and its first environment, creating them on first use."""
    org=await user_org(user,db)
    project=await db.scalar(select(Project).where(Project.organization_id==org.id).order_by(Project.created_at))
    if not project:
        project=Project(organization_id=org.id,name="İlk proje"); db.add(project); await db.flush()
    env=await db.scalar(select(Environment).where(Environment.project_id==project.id).order_by(Environment.created_at))
    if not env:
        env=Environment(project_id=project.id,name="development"); db.add(env); await db.flush()
    return org,project,env

# ---------- knowledge base (RAG) ----------
def document_summary(doc: Document, chunk_count: int) -> dict:
    return {"id":doc.id,"title":doc.title,"filename":doc.filename,"content_type":doc.content_type,"char_count":doc.char_count,"page_count":doc.page_count,"chunk_count":chunk_count,"created_at":iso(doc.created_at)}

async def store_document(org: Organization, project: Project, title: str, filename: str | None, kind: str, pages: list, db: AsyncSession) -> dict:
    chunks=chunk_pages(pages)
    if not chunks: api_error("DOCUMENT_EMPTY","Belgede okunabilir metin bulunamadı.",422)
    total=0; kept=[]
    for page,text in chunks:
        if total+len(text)>MAX_DOCUMENT_CHARS: break
        kept.append((page,text)); total+=len(text)
    pages_with_numbers=[p for p,_ in pages if p is not None]
    doc=Document(organization_id=org.id,project_id=project.id,title=title.strip()[:300] or "Adsız belge",filename=filename,content_type=kind,char_count=total,page_count=max(pages_with_numbers) if pages_with_numbers else None)
    db.add(doc); await db.flush()
    for position,(page,text) in enumerate(kept): db.add(DocumentChunk(document_id=doc.id,position=position,page=page,text=text))
    return document_summary(doc,len(kept))

async def load_index(org_id: str, document_ids: list[str] | None, db: AsyncSession) -> tuple[Index,int]:
    query=select(DocumentChunk,Document.title).join(Document).where(Document.organization_id==org_id)
    if document_ids: query=query.where(Document.id.in_(document_ids))
    rows=(await db.execute(query.order_by(Document.created_at,DocumentChunk.position))).all()
    passages=[Passage(id=c.id,document_id=c.document_id,title=title,position=c.position,page=c.page,text=c.text) for c,title in rows]
    return Index(passages),len({p.document_id for p in passages})

def hit_json(hit: Hit) -> dict:
    p=hit.passage
    return {"chunk_id":p.id,"document_id":p.document_id,"title":p.title,"position":p.position,"page":p.page,"text":p.text,"relevance":hit.relevance,"matched_terms":hit.matched}

def hit_source(hit: Hit) -> SourceInput:
    p=hit.passage; where=f"sayfa {p.page}" if p.page else f"bölüm {p.position+1}"
    return SourceInput(id=f"{p.document_id[:8]}-{p.position}",title=f"{p.title} · {where}",content=p.text,metadata={"document_id":p.document_id,"chunk_id":p.id,"position":p.position,"page":p.page,"relevance":hit.relevance,"matched_terms":hit.matched})

@app.get("/documents")
async def list_documents(user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db)
    counts=dict((await db.execute(select(DocumentChunk.document_id,func.count()).join(Document).where(Document.organization_id==org.id).group_by(DocumentChunk.document_id))).all())
    docs=(await db.scalars(select(Document).where(Document.organization_id==org.id).order_by(Document.created_at.desc()))).all()
    return [document_summary(d,counts.get(d.id,0)) for d in docs]

@app.post("/documents", status_code=201)
async def upload_document(file: UploadFile=File(...), title: str | None=Form(default=None), user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org,project,_=await default_scope(user,db)
    data=await file.read(MAX_UPLOAD_BYTES+1)
    name=file.filename or "belge.txt"
    try: kind,pages=extract(name,data)
    except DocumentError as exc: api_error("DOCUMENT_INVALID",str(exc),422)
    summary=await store_document(org,project,title or name.rsplit(".",1)[0],name,kind,pages,db)
    audit(db,org.id,user.id,"document.uploaded","document",summary["id"],{"filename":name}); await db.commit()
    return summary

@app.post("/documents/text", status_code=201)
async def create_text_document(body: DocumentTextInput, user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org,project,_=await default_scope(user,db)
    summary=await store_document(org,project,body.title,None,"text",[(None,body.text)],db)
    audit(db,org.id,user.id,"document.created","document",summary["id"]); await db.commit()
    return summary

@app.post("/documents/samples", status_code=201)
async def add_sample_documents(user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org,project,_=await default_scope(user,db)
    existing=set((await db.scalars(select(Document.title).where(Document.organization_id==org.id))).all())
    added=[await store_document(org,project,title,None,"text",[(None,text)],db) for title,text in SAMPLE_DOCUMENTS if title not in existing]
    await db.commit(); return added

@app.get("/documents/{document_id}")
async def get_document(document_id: str, user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db)
    doc=await db.scalar(select(Document).where(Document.id==document_id,Document.organization_id==org.id).options(selectinload(Document.chunks)))
    if not doc: api_error("DOCUMENT_NOT_FOUND","Belge bulunamadı.",404)
    return {**document_summary(doc,len(doc.chunks)),"chunks":[{"position":c.position,"page":c.page,"text":c.text} for c in doc.chunks]}

@app.delete("/documents/{document_id}", status_code=204)
async def delete_document(document_id: str, user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db)
    doc=await db.scalar(select(Document).where(Document.id==document_id,Document.organization_id==org.id))
    if not doc: api_error("DOCUMENT_NOT_FOUND","Belge bulunamadı.",404)
    await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id==doc.id)); await db.delete(doc)
    audit(db,org.id,user.id,"document.deleted","document",document_id); await db.commit()
    return Response(status_code=204)

@app.post("/documents/search")
async def search_documents(body: DocumentSearchInput, user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); index,_=await load_index(org.id,body.document_ids,db)
    return {"passage_count":len(index.passages),"hits":[hit_json(h) for h in retrieve(index,body.query,body.answer,k=body.k)]}

NO_EVIDENCE=DetectorOutput(detector="coverage",version="1.0.0",risk=.9,severity="critical",reason="Yüklenen belgelerde bu soru ve cevapla ilgili bir bölüm bulunamadı; cevap belgelere dayanmıyor.")

@app.post("/checks", status_code=201)
async def create_check(body: CheckInput, user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    """Checks an answer from the console: a pasted answer or one generated now. Evidence is either typed in by hand,
    or retrieved from the knowledge base, in which case verification is limited to the retrieved passages."""
    org,project,env=await default_scope(user,db)
    use_documents=body.source_mode=="documents"
    sources=[SourceInput(id=f"kaynak-{i+1}",title=s.title or f"Kaynak {i+1}",content=s.content) for i,s in enumerate(body.sources)]
    index=None; document_count=0
    if use_documents:
        index,document_count=await load_index(org.id,body.document_ids,db)
        if not index.passages: api_error("NO_DOCUMENTS","Henüz belge yüklenmemiş. Önce Belgeler sayfasından doküman ekleyin.",422)
    if body.generate:
        context_sources=[hit_source(h) for h in retrieve(index,body.prompt,None,k=4)] if use_documents else sources
        context="\n\n".join(f"[{s.title or s.id}]\n{s.content}" for s in context_sources)
        prompt=body.prompt if not context else f"Answer the question in the same language it is asked, using only the context below. If the context does not contain the answer, say that the documents do not cover it.\n\nContext:\n{context}\n\nQuestion: {body.prompt}"
        try: generated=await get_provider(body.provider).generate(prompt)
        except ProviderError as exc: api_error(exc.code,str(exc),exc.status_code)
        answer=generated.text; meta={"origin":"console",**generated.metadata}; provider,model=generated.provider,generated.model
        usage=dict(latency_ms=generated.latency_ms,input_tokens=generated.input_tokens,output_tokens=generated.output_tokens)
    else:
        if not (body.response or "").strip(): api_error("RESPONSE_REQUIRED","Kontrol edilecek cevabı yazın ya da cevabı yapay zekaya ürettirin.",422)
        answer=body.response.strip(); meta={"origin":"console"}; provider,model="manual",body.label or "Elle girilen cevap"; usage={}
    extra=[]
    if use_documents:
        hits=retrieve(index,body.prompt,answer,k=body.max_passages)
        sources=[hit_source(h) for h in hits]
        meta["retrieval"]={"mode":"documents","document_count":document_count,"passage_count":len(index.passages),"hits":[{k:v for k,v in hit_json(h).items() if k!="text"} for h in hits]}
        if not hits: extra=[NO_EVIDENCE]
    # Meaning-level check by the model, limited to the same passages; optional and never blocks the lexical result.
    if body.deep_check and sources:
        if not settings.gemini_api_key: meta["semantic_check"]={"status":"unavailable","message":"Anlam kontrolü için Gemini bağlı değil."}
        else:
            try: extra.append(await semantic_check(body.prompt,answer,sources)); meta["semantic_check"]={"status":"done"}
            except ProviderError as exc: meta["semantic_check"]={"status":"unavailable","message":str(exc)}
    trace=TraceInput(provider=provider,model=model,prompt=body.prompt,response=answer,sources=sources,metadata=meta,**usage)
    result=await analyze_and_store(trace,env,project,None,db,extra)
    audit(db,org.id,user.id,"check.created","request",result["id"]); await db.commit()
    return result

@app.post("/v1/generate", status_code=201)
async def generate_and_analyze(body: GenerateInput, authorization: str | None=Header(default=None), idempotency_key: str | None=Header(default=None,alias="Idempotency-Key"), db: AsyncSession=Depends(get_db)):
    await runtime_scope(authorization, db)
    try:
        generated = await get_provider(body.provider).generate(body.prompt, system_prompt=body.system_prompt, model=body.model, response_schema=body.expected_schema)
    except ProviderError as exc:
        api_error(exc.code, str(exc), exc.status_code)
    trace = TraceInput(provider=generated.provider, model=generated.model, prompt=body.prompt, system_prompt=body.system_prompt, response=generated.text, sources=body.sources, citations=body.citations, expected_schema=body.expected_schema, latency_ms=generated.latency_ms, input_tokens=generated.input_tokens, output_tokens=generated.output_tokens, metadata={**body.metadata, **generated.metadata})
    return await ingest_trace(trace, authorization, idempotency_key, db)

async def load_trace(db, trace_id):
    return await db.scalar(select(RequestTrace).where(RequestTrace.id==trace_id).options(selectinload(RequestTrace.sources),selectinload(RequestTrace.detector_results).selectinload(DetectorResultModel.spans),selectinload(RequestTrace.reliability_score),selectinload(RequestTrace.policy_execution),selectinload(RequestTrace.claims).selectinload(Claim.links),selectinload(RequestTrace.reviews),selectinload(RequestTrace.repairs).selectinload(Repair.attempts)))

def iso(value: datetime | None) -> str | None:
    if value is None: return None
    return (value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value).isoformat()

def serialize_trace(trace: RequestTrace, detail=False):
    score=trace.reliability_score
    data={"id":trace.id,"provider":trace.provider,"model":trace.model,"status":trace.status,"created_at":iso(trace.created_at),"prompt_preview":(trace.prompt or trace.response or "")[:160],"reliability":{"overall":score.overall,"status":score.status,"dimensions":score.dimensions_json} if score else None}
    if detail:
        execution=trace.policy_execution
        data.update({"prompt":trace.prompt,"system_prompt":trace.system_prompt,"response":trace.response,"latency_ms":trace.latency_ms,"usage":{"input_tokens":trace.input_tokens,"output_tokens":trace.output_tokens},"metadata":trace.metadata_json,"sources":[{"id":s.external_id,"title":s.title,"content":s.content,"metadata":s.metadata_json} for s in trace.sources],"detectors":[{"detector":r.detector,"version":r.version,"risk":r.risk,"severity":r.severity,"reason":r.reason,"evidence":r.evidence_json,"metadata":r.metadata_json,"duration_ms":r.duration_ms,"spans":[{"start":s.start_offset,"end":s.end_offset,"severity":s.severity,"reason":s.reason} for s in r.spans]} for r in trace.detector_results],"policy":{"action":execution.action,"reason":execution.reason,"matched_rule":execution.matched_rule_json,"policy_version_id":execution.policy_version_id} if execution else None,"claims":[{"id":c.id,"text":c.text,"start":c.start_offset,"end":c.end_offset,"classification":c.classification,"relations":[{"source_id":l.source_id,"relation":l.relation,"score":l.score,"reason":l.reason} for l in c.links]} for c in trace.claims],"reviews":[{"id":r.id,"decision":r.decision,"reason":r.reason,"corrected_response":r.corrected_response,"created_at":iso(r.created_at)} for r in trace.reviews],"repairs":[{"id":r.id,"strategy":r.strategy,"status":r.status,"attempts":[{"attempt":a.attempt,"response":a.response,"reliability_before":a.reliability_before,"reliability_after":a.reliability_after,"provider":a.provider,"model":a.model} for a in r.attempts]} for r in trace.repairs]})
    return data

@app.get("/requests")
async def requests_list(cursor: str | None=None, limit: int=20, user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); query=select(RequestTrace).where(RequestTrace.organization_id==org.id).options(selectinload(RequestTrace.reliability_score)).order_by(RequestTrace.created_at.desc()).limit(min(max(limit,1),100)+1)
    limit=min(max(limit,1),100)
    if cursor:
        try: query=query.where(RequestTrace.created_at < datetime.fromisoformat(cursor))
        except ValueError: api_error("INVALID_CURSOR","Sayfalama değeri geçersiz.",400)
    rows=list((await db.scalars(query)).all()); has_more=len(rows)>limit; rows=rows[:limit]
    return {"items":[serialize_trace(x) for x in rows],"next_cursor":rows[-1].created_at.isoformat() if has_more and rows else None}

@app.get("/requests/{trace_id}")
async def request_detail(trace_id: str, user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); trace=await load_trace(db,trace_id)
    if not trace or trace.organization_id!=org.id: api_error("REQUEST_NOT_FOUND","Kontrol bulunamadı.",404)
    return serialize_trace(trace,detail=True)

@app.get("/reviews")
async def review_queue(user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); rows=(await db.scalars(select(RequestTrace).where(RequestTrace.organization_id==org.id,RequestTrace.status.in_(["flagged","review","hold","block","repair","retry","route","abstain"])).options(selectinload(RequestTrace.reliability_score)).order_by(RequestTrace.created_at.desc()).limit(100))).all()
    return [serialize_trace(row) for row in rows]

REVIEW_OUTCOME={"confirm_failure":"confirmed","reject":"confirmed","correct":"confirmed","false_positive":"cleared","approve":"cleared"}

@app.post("/requests/{trace_id}/reviews", status_code=201)
async def create_review(trace_id: str, body: ReviewInput, user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); trace=await db.scalar(select(RequestTrace).where(RequestTrace.id==trace_id,RequestTrace.organization_id==org.id))
    if not trace: api_error("REQUEST_NOT_FOUND","Kontrol bulunamadı.",404)
    review=Review(request_id=trace.id,reviewer_id=user.id,decision=body.decision,reason=body.reason,corrected_response=body.corrected_response); db.add(review)
    # A human decision closes the item: it leaves the review queue with the outcome recorded.
    if body.decision in REVIEW_OUTCOME: trace.status=REVIEW_OUTCOME[body.decision]
    await db.flush(); audit(db,org.id,user.id,"review.completed","review",review.id,{"decision":body.decision,"request_id":trace.id}); await db.commit()
    return {"id":review.id,"decision":review.decision,"created_at":iso(review.created_at)}

@app.get("/audit-events")
async def list_audit_events(user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); rows=(await db.scalars(select(AuditEvent).where(AuditEvent.organization_id==org.id).order_by(AuditEvent.created_at.desc()).limit(200))).all()
    return [{"id":x.id,"actor_id":x.actor_id,"action":x.action,"resource_type":x.resource_type,"resource_id":x.resource_id,"metadata":x.metadata_json,"created_at":iso(x.created_at)} for x in rows]

@app.post("/projects/{project_id}/datasets/from-reviews", status_code=201)
async def dataset_from_reviews(project_id: str, body: DatasetInput, user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); project=await db.scalar(select(Project).where(Project.id==project_id,Project.organization_id==org.id))
    if not project: api_error("PROJECT_NOT_FOUND","Proje bulunamadı.",404)
    reviews=list((await db.scalars(select(Review).join(RequestTrace).where(Review.id.in_(body.review_ids),RequestTrace.project_id==project_id))).all())
    if len(reviews)!=len(set(body.review_ids)): api_error("REVIEW_NOT_FOUND","Bazı incelemeler bu projeye ait değil.",404)
    dataset=Dataset(project_id=project.id,name=body.name); db.add(dataset); await db.flush()
    for review in reviews:
        trace=await db.get(RequestTrace,review.request_id); db.add(DatasetExample(dataset_id=dataset.id,request_id=trace.id,input_json={"prompt":trace.prompt,"response":trace.response},expected_output=review.corrected_response,label=review.decision,provenance_json={"review_id":review.id,"reviewer_id":review.reviewer_id}))
    await db.commit(); return {"id":dataset.id,"name":dataset.name,"example_count":len(reviews)}

@app.post("/requests/{trace_id}/repair", status_code=201)
async def repair_request(trace_id: str, body: RepairInput, user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); trace=await load_trace(db,trace_id)
    if not trace or trace.organization_id!=org.id: api_error("REQUEST_NOT_FOUND","Kontrol bulunamadı.",404)
    repair=Repair(request_id=trace.id,strategy=body.strategy,status="running",max_attempts=body.max_attempts); db.add(repair); await db.flush(); before=trace.reliability_score.overall; best=before
    evidence="\n".join(f"[{s.external_id}] {s.content}" for s in trace.sources)
    for attempt_number in range(1,body.max_attempts+1):
        prompt=f"Repair the answer using only the supplied evidence. Remove or qualify unsupported claims. Reply in the same language as the question. Return only the repaired answer.\n\nQuestion: {trace.prompt or ''}\nEvidence:\n{evidence}\nOriginal answer:\n{trace.response}"
        try: generated=await get_provider(body.provider).generate(prompt,model=body.model)
        except ProviderError as exc: repair.status="failed"; await db.commit(); api_error(exc.code,str(exc),exc.status_code)
        candidate=TraceInput(provider=generated.provider,model=generated.model,prompt=trace.prompt,response=generated.text,sources=[{"id":s.external_id,"title":s.title,"content":s.content,"metadata":s.metadata_json} for s in trace.sources])
        results=await registry.run(context_from_trace(candidate)); score=fuse(results); best=max(best,score["overall"])
        db.add(RepairAttempt(repair_id=repair.id,attempt=attempt_number,provider=generated.provider,model=generated.model,response=generated.text,reliability_before=before,reliability_after=score["overall"],detector_results_json=[r.model_dump() for r in results]))
        if score["overall"]>=70: repair.status="passed"; break
    if repair.status=="running": repair.status="review"
    await db.commit(); return {"id":repair.id,"status":repair.status,"reliability_before":before,"best_reliability":best,"original_preserved":True}

@app.post("/v1/agent-runs", status_code=201)
async def ingest_agent_run(body: AgentRunInput, authorization: str | None=Header(default=None), db: AsyncSession=Depends(get_db)):
    _,env,project=await runtime_scope(authorization,db); raw_steps=[s.model_dump() for s in body.steps]; findings=inspect_tool_calls(raw_steps,body.allowed_tools,body.confirmation_required)
    run=AgentRun(organization_id=project.organization_id,project_id=project.id,environment_id=env.id,name=body.name,status="failed" if any(x["severity"]=="critical" for x in findings) else "flagged" if findings else "passed",findings_json=findings); db.add(run); await db.flush()
    for position,input_step in enumerate(body.steps):
        step=AgentStep(agent_run_id=run.id,position=position,name=input_step.name,status=input_step.status); db.add(step); await db.flush()
        for call in input_step.tool_calls: db.add(ToolCall(agent_step_id=step.id,tool=call.tool,arguments_json=call.arguments,result_json=call.result,status=call.status,confirmed=call.confirmed,latency_ms=call.latency_ms))
    await db.commit(); return {"id":run.id,"name":run.name,"status":run.status,"findings":findings,"step_count":len(body.steps)}

@app.get("/agent-runs")
async def list_agent_runs(user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); rows=(await db.scalars(select(AgentRun).where(AgentRun.organization_id==org.id).options(selectinload(AgentRun.steps).selectinload(AgentStep.tool_calls)).order_by(AgentRun.created_at.desc()).limit(100))).all()
    return [{"id":r.id,"name":r.name,"status":r.status,"findings":r.findings_json,"created_at":iso(r.created_at),"steps":[{"position":s.position,"name":s.name,"status":s.status,"tool_calls":[{"tool":c.tool,"arguments":c.arguments_json,"result":c.result_json,"status":c.status,"confirmed":c.confirmed,"latency_ms":c.latency_ms} for c in s.tool_calls]} for s in sorted(r.steps,key=lambda x:x.position)]} for r in rows]

async def execute_replay(replay_id: str):
    async with SessionLocal() as db:
        replay=await db.get(ReplayRun,replay_id); trace=await load_trace(db,replay.request_id); errors=[]
        for config in replay.configuration_json["candidates"]:
            try:
                generated=await get_provider(config["provider"]).generate(trace.prompt or "",model=config.get("model"))
                candidate_input=TraceInput(provider=generated.provider,model=generated.model,prompt=trace.prompt,response=generated.text,sources=[{"id":s.external_id,"title":s.title,"content":s.content,"metadata":s.metadata_json} for s in trace.sources]); results=await registry.run(context_from_trace(candidate_input)); score=fuse(results)
                db.add(ReplayCandidate(replay_run_id=replay.id,provider=generated.provider,model=generated.model,response=generated.text,reliability=score["overall"],latency_ms=generated.latency_ms,estimated_cost=None,is_demo=generated.provider=="local",detector_results_json=[r.model_dump() for r in results]))
            except ProviderError as exc: errors.append(f"{config['provider']}: {exc.code}")
        replay.completed_at=datetime.now(timezone.utc); replay.status="completed" if len(errors)<len(replay.configuration_json["candidates"]) else "failed"; replay.error="; ".join(errors) or None; await db.commit()

@app.post("/projects/{project_id}/replays", status_code=202)
async def create_replay(project_id: str, body: ReplayInput, tasks: BackgroundTasks, user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); trace=await db.scalar(select(RequestTrace).where(RequestTrace.id==body.request_id,RequestTrace.project_id==project_id,RequestTrace.organization_id==org.id))
    if not trace: api_error("REQUEST_NOT_FOUND","Bu projede böyle bir kontrol yok.",404)
    replay=ReplayRun(project_id=project_id,request_id=trace.id,status="queued",configuration_json={"candidates":[c.model_dump() for c in body.candidates]}); db.add(replay); await db.commit(); tasks.add_task(execute_replay,replay.id)
    return {"id":replay.id,"status":replay.status}

@app.get("/projects/{project_id}/replays")
async def list_replays(project_id: str, user: User=Depends(current_user), db: AsyncSession=Depends(get_db)):
    org=await user_org(user,db); project=await db.scalar(select(Project).where(Project.id==project_id,Project.organization_id==org.id))
    if not project: api_error("PROJECT_NOT_FOUND","Proje bulunamadı.",404)
    rows=(await db.scalars(select(ReplayRun).where(ReplayRun.project_id==project_id).options(selectinload(ReplayRun.candidates)).order_by(ReplayRun.created_at.desc()))).all()
    return [{"id":r.id,"request_id":r.request_id,"status":r.status,"error":r.error,"created_at":iso(r.created_at),"candidates":[{"provider":c.provider,"model":c.model,"reliability":c.reliability,"latency_ms":c.latency_ms,"estimated_cost":c.estimated_cost,"is_demo":c.is_demo} for c in r.candidates]} for r in rows]
