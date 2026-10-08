from typing import Any, Literal
from pydantic import BaseModel, EmailStr, Field
from .policy_engine import PolicyRule

class LoginInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)

class AuthInput(LoginInput):
    organization_name: str | None = Field(default=None, min_length=2, max_length=200)

class NameInput(BaseModel):
    name: str = Field(min_length=1, max_length=200)

class SourceInput(BaseModel):
    id: str = Field(min_length=1, max_length=200)
    title: str | None = None
    content: str = Field(min_length=1, max_length=100_000)
    metadata: dict[str, Any] = Field(default_factory=dict)

class CitationInput(BaseModel):
    source_id: str
    quote: str | None = None

class TraceInput(BaseModel):
    provider: str = Field(default="unknown", max_length=80)
    model: str = Field(max_length=120)
    prompt: str | None = Field(default=None, max_length=100_000)
    system_prompt: str | None = Field(default=None, max_length=100_000)
    response: str = Field(min_length=1, max_length=200_000)
    sources: list[SourceInput] = Field(default_factory=list, max_length=100)
    citations: list[CitationInput] = Field(default_factory=list, max_length=100)
    expected_schema: dict[str, Any] | None = None
    latency_ms: int | None = Field(default=None, ge=0)
    input_tokens: int | None = Field(default=None, ge=0)
    output_tokens: int | None = Field(default=None, ge=0)
    metadata: dict[str, Any] = Field(default_factory=dict)

class CheckSourceInput(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    content: str = Field(min_length=1, max_length=100_000)

class CheckInput(BaseModel):
    prompt: str = Field(min_length=1, max_length=20_000)
    response: str | None = Field(default=None, max_length=50_000)
    sources: list[CheckSourceInput] = Field(default_factory=list, max_length=20)
    generate: bool = False
    provider: Literal["gemini", "local"] = "gemini"
    label: str | None = Field(default=None, max_length=120)
    source_mode: Literal["manual", "documents"] = "manual"
    document_ids: list[str] | None = Field(default=None, max_length=200)
    max_passages: int = Field(default=5, ge=1, le=12)
    deep_check: bool = True

class DocumentTextInput(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    text: str = Field(min_length=1, max_length=2_000_000)

class DocumentSearchInput(BaseModel):
    query: str = Field(min_length=1, max_length=20_000)
    answer: str | None = Field(default=None, max_length=50_000)
    document_ids: list[str] | None = Field(default=None, max_length=200)
    k: int = Field(default=5, ge=1, le=20)

class GenerateInput(BaseModel):
    prompt: str = Field(min_length=1, max_length=100_000)
    system_prompt: str | None = Field(default=None, max_length=100_000)
    provider: Literal["gemini", "local"] = "gemini"
    model: str | None = Field(default=None, max_length=120)
    sources: list[SourceInput] = Field(default_factory=list, max_length=100)
    citations: list[CitationInput] = Field(default_factory=list, max_length=100)
    expected_schema: dict[str, Any] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

class PolicyInput(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    rules: list[PolicyRule] = Field(min_length=1, max_length=50)

class ReviewInput(BaseModel):
    decision: Literal["confirm_failure","false_positive","approve","reject","correct","escalate"]
    reason: str = Field(min_length=1, max_length=2000)
    corrected_response: str | None = Field(default=None, max_length=200_000)

class DatasetInput(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    review_ids: list[str] = Field(min_length=1, max_length=1000)

class RepairInput(BaseModel):
    strategy: Literal["unsupported_claim","citation_failure","schema_failure","weak_grounding","low_reliability"] = "low_reliability"
    provider: Literal["gemini","local"] = "gemini"
    model: str | None = None
    max_attempts: int = Field(default=2, ge=1, le=2)

class ToolCallInput(BaseModel):
    tool: str = Field(min_length=1,max_length=200)
    arguments: dict[str,Any] = Field(default_factory=dict)
    result: dict[str,Any] | None = None
    status: Literal["succeeded","failed","pending"] = "succeeded"
    confirmed: bool = False
    latency_ms: int | None = Field(default=None,ge=0)

class AgentStepInput(BaseModel):
    name: str = Field(min_length=1,max_length=200)
    status: Literal["succeeded","failed","pending"] = "succeeded"
    tool_calls: list[ToolCallInput] = Field(default_factory=list,max_length=100)

class AgentRunInput(BaseModel):
    name: str = Field(min_length=1,max_length=200)
    steps: list[AgentStepInput] = Field(min_length=1,max_length=500)
    allowed_tools: dict[str,dict[str,Any]] = Field(default_factory=dict)
    confirmation_required: list[str] = Field(default_factory=list)

class ReplayCandidateInput(BaseModel):
    provider: Literal["gemini","local"]
    model: str | None = None

class ReplayInput(BaseModel):
    request_id: str
    candidates: list[ReplayCandidateInput] = Field(min_length=1,max_length=10)

class Span(BaseModel):
    start: int
    end: int
    severity: Literal["low", "medium", "high", "critical"]
    reason: str

class DetectorOutput(BaseModel):
    detector: str
    version: str
    risk: float = Field(ge=0, le=1)
    severity: Literal["low", "medium", "high", "critical"]
    reason: str
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    duration_ms: float = 0
    spans: list[Span] = Field(default_factory=list)
