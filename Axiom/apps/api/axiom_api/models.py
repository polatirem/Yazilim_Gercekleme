from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

def uid(): return str(uuid4())
def now(): return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class OrganizationMember(Base):
    __tablename__ = "organization_members"
    __table_args__ = (UniqueConstraint("user_id", "organization_id"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"))
    role: Mapped[str] = mapped_column(String(32), default="owner")

class Project(Base):
    __tablename__ = "projects"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    environments: Mapped[list["Environment"]] = relationship(cascade="all, delete-orphan")

class Environment(Base):
    __tablename__ = "environments"
    __table_args__ = (UniqueConstraint("project_id", "name"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class ApiKey(Base):
    __tablename__ = "api_keys"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    environment_id: Mapped[str] = mapped_column(ForeignKey("environments.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    prefix: Mapped[str] = mapped_column(String(20))
    secret_hash: Mapped[str] = mapped_column(String(64), unique=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class RequestTrace(Base):
    __tablename__ = "requests"
    __table_args__ = (UniqueConstraint("environment_id", "idempotency_key", name="uq_request_idempotency"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    environment_id: Mapped[str] = mapped_column(ForeignKey("environments.id"), index=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(200))
    provider: Mapped[str] = mapped_column(String(80))
    model: Mapped[str] = mapped_column(String(120))
    prompt: Mapped[str | None] = mapped_column(Text)
    system_prompt: Mapped[str | None] = mapped_column(Text)
    response: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="analyzed", index=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    input_tokens: Mapped[int | None] = mapped_column(Integer)
    output_tokens: Mapped[int | None] = mapped_column(Integer)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    sources: Mapped[list["Source"]] = relationship(cascade="all, delete-orphan")
    detector_results: Mapped[list["DetectorResultModel"]] = relationship(cascade="all, delete-orphan")
    reliability_score: Mapped["ReliabilityScore | None"] = relationship(cascade="all, delete-orphan")
    policy_execution: Mapped["PolicyExecution | None"] = relationship(cascade="all, delete-orphan")
    claims: Mapped[list["Claim"]] = relationship(cascade="all, delete-orphan")
    reviews: Mapped[list["Review"]] = relationship(cascade="all, delete-orphan")
    repairs: Mapped[list["Repair"]] = relationship(cascade="all, delete-orphan")

class Source(Base):
    __tablename__ = "sources"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    request_id: Mapped[str] = mapped_column(ForeignKey("requests.id", ondelete="CASCADE"), index=True)
    external_id: Mapped[str] = mapped_column(String(200))
    title: Mapped[str | None] = mapped_column(String(300))
    content: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)

class DetectorResultModel(Base):
    __tablename__ = "detector_results"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    request_id: Mapped[str] = mapped_column(ForeignKey("requests.id", ondelete="CASCADE"), index=True)
    detector: Mapped[str] = mapped_column(String(80))
    version: Mapped[str] = mapped_column(String(40))
    risk: Mapped[float] = mapped_column(Float)
    severity: Mapped[str] = mapped_column(String(20))
    reason: Mapped[str] = mapped_column(Text)
    evidence_json: Mapped[list] = mapped_column(JSON, default=list)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    duration_ms: Mapped[float] = mapped_column(Float)
    spans: Mapped[list["RiskSpanModel"]] = relationship(cascade="all, delete-orphan")

class RiskSpanModel(Base):
    __tablename__ = "risk_spans"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    detector_result_id: Mapped[str] = mapped_column(ForeignKey("detector_results.id", ondelete="CASCADE"), index=True)
    start_offset: Mapped[int] = mapped_column(Integer)
    end_offset: Mapped[int] = mapped_column(Integer)
    severity: Mapped[str] = mapped_column(String(20))
    reason: Mapped[str] = mapped_column(Text)

class ReliabilityScore(Base):
    __tablename__ = "reliability_scores"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    request_id: Mapped[str] = mapped_column(ForeignKey("requests.id", ondelete="CASCADE"), unique=True)
    overall: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(30), default="heuristic")
    dimensions_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Policy(Base):
    __tablename__ = "policies"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    enabled: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    versions: Mapped[list["PolicyVersion"]] = relationship(cascade="all, delete-orphan")

class PolicyVersion(Base):
    __tablename__ = "policy_versions"
    __table_args__ = (UniqueConstraint("policy_id", "version"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    policy_id: Mapped[str] = mapped_column(ForeignKey("policies.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    rules_json: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class PolicyExecution(Base):
    __tablename__ = "policy_executions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    request_id: Mapped[str] = mapped_column(ForeignKey("requests.id", ondelete="CASCADE"), unique=True)
    policy_version_id: Mapped[str | None] = mapped_column(ForeignKey("policy_versions.id"))
    action: Mapped[str] = mapped_column(String(30))
    matched_rule_json: Mapped[dict] = mapped_column(JSON, default=dict)
    reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Claim(Base):
    __tablename__ = "claims"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    request_id: Mapped[str] = mapped_column(ForeignKey("requests.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text)
    start_offset: Mapped[int] = mapped_column(Integer)
    end_offset: Mapped[int] = mapped_column(Integer)
    classification: Mapped[str] = mapped_column(String(30))
    links: Mapped[list["ClaimEvidenceLink"]] = relationship(cascade="all, delete-orphan")

class ClaimEvidenceLink(Base):
    __tablename__ = "claim_evidence_links"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    claim_id: Mapped[str] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), index=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("sources.id", ondelete="CASCADE"), index=True)
    relation: Mapped[str] = mapped_column(String(30))
    score: Mapped[float] = mapped_column(Float)
    reason: Mapped[str] = mapped_column(Text)

class Review(Base):
    __tablename__ = "reviews"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    request_id: Mapped[str] = mapped_column(ForeignKey("requests.id", ondelete="CASCADE"), index=True)
    reviewer_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    decision: Mapped[str] = mapped_column(String(40))
    reason: Mapped[str] = mapped_column(Text)
    corrected_response: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Repair(Base):
    __tablename__ = "repairs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    request_id: Mapped[str] = mapped_column(ForeignKey("requests.id", ondelete="CASCADE"), index=True)
    strategy: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(30))
    max_attempts: Mapped[int] = mapped_column(Integer, default=2)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    attempts: Mapped[list["RepairAttempt"]] = relationship(cascade="all, delete-orphan")

class RepairAttempt(Base):
    __tablename__ = "repair_attempts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    repair_id: Mapped[str] = mapped_column(ForeignKey("repairs.id", ondelete="CASCADE"), index=True)
    attempt: Mapped[int] = mapped_column(Integer)
    provider: Mapped[str] = mapped_column(String(80))
    model: Mapped[str] = mapped_column(String(120))
    response: Mapped[str] = mapped_column(Text)
    reliability_before: Mapped[int] = mapped_column(Integer)
    reliability_after: Mapped[int] = mapped_column(Integer)
    detector_results_json: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Dataset(Base):
    __tablename__ = "datasets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    examples: Mapped[list["DatasetExample"]] = relationship(cascade="all, delete-orphan")

class DatasetExample(Base):
    __tablename__ = "dataset_examples"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"), index=True)
    request_id: Mapped[str] = mapped_column(ForeignKey("requests.id"))
    input_json: Mapped[dict] = mapped_column(JSON)
    expected_output: Mapped[str | None] = mapped_column(Text)
    label: Mapped[str] = mapped_column(String(40))
    provenance_json: Mapped[dict] = mapped_column(JSON)

class AgentRun(Base):
    __tablename__ = "agent_runs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    environment_id: Mapped[str] = mapped_column(ForeignKey("environments.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(30))
    findings_json: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    steps: Mapped[list["AgentStep"]] = relationship(cascade="all, delete-orphan")

class AgentStep(Base):
    __tablename__ = "agent_steps"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    agent_run_id: Mapped[str] = mapped_column(ForeignKey("agent_runs.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(30))
    tool_calls: Mapped[list["ToolCall"]] = relationship(cascade="all, delete-orphan")

class ToolCall(Base):
    __tablename__ = "tool_calls"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    agent_step_id: Mapped[str] = mapped_column(ForeignKey("agent_steps.id", ondelete="CASCADE"), index=True)
    tool: Mapped[str] = mapped_column(String(200))
    arguments_json: Mapped[dict] = mapped_column(JSON)
    result_json: Mapped[dict | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(30))
    confirmed: Mapped[bool] = mapped_column(default=False)
    latency_ms: Mapped[int | None] = mapped_column(Integer)

class ReplayRun(Base):
    __tablename__ = "replay_runs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    request_id: Mapped[str] = mapped_column(ForeignKey("requests.id"))
    status: Mapped[str] = mapped_column(String(30))
    configuration_json: Mapped[dict] = mapped_column(JSON)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    candidates: Mapped[list["ReplayCandidate"]] = relationship(cascade="all, delete-orphan")

class ReplayCandidate(Base):
    __tablename__ = "replay_candidates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    replay_run_id: Mapped[str] = mapped_column(ForeignKey("replay_runs.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(80))
    model: Mapped[str] = mapped_column(String(120))
    response: Mapped[str] = mapped_column(Text)
    reliability: Mapped[int] = mapped_column(Integer)
    latency_ms: Mapped[int] = mapped_column(Integer)
    estimated_cost: Mapped[float | None] = mapped_column(Float)
    is_demo: Mapped[bool] = mapped_column(default=False)
    detector_results_json: Mapped[list] = mapped_column(JSON)

class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    actor_id: Mapped[str] = mapped_column(String(36))
    action: Mapped[str] = mapped_column(String(100), index=True)
    resource_type: Mapped[str] = mapped_column(String(80))
    resource_id: Mapped[str] = mapped_column(String(36))
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Document(Base):
    """A reference document (PDF, Word, text) uploaded to the organization's knowledge base."""
    __tablename__ = "documents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    filename: Mapped[str | None] = mapped_column(String(300))
    content_type: Mapped[str] = mapped_column(String(40))
    char_count: Mapped[int] = mapped_column(Integer, default=0)
    page_count: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    chunks: Mapped[list["DocumentChunk"]] = relationship(cascade="all, delete-orphan", order_by="DocumentChunk.position")

class DocumentChunk(Base):
    """A retrievable passage of a document; verification is limited to the passages retrieved for a question."""
    __tablename__ = "document_chunks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    page: Mapped[int | None] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
