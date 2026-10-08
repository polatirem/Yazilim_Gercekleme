# Architecture

Axiom is a small workspace monorepo. `apps/api` owns authentication, tenant boundaries, runtime ingestion, detector orchestration, persistence, and read APIs. `apps/web` is a server-rendered Next.js control plane. SDK packages are thin HTTP clients and do not embed business logic.

```text
SDK / HTTP -> API key scope -> trace transaction -> detector registry
                                              -> score fusion
                                              -> PostgreSQL
Browser -> user token -> tenant-scoped read API -> dashboard / inspector
```

Detector implementations conform to one protocol and return normalized findings. Applicability metadata prevents detectors from running without their required inputs. The heuristic fusion layer converts detector risk to a clearly labelled 0–100 score; it is not calibrated probability.

Inline analysis is used for the deterministic Phase 3 detectors. A future worker boundary can execute deep detectors without changing the ingestion contract. Provider generation remains behind a protocol; Phase 2 accepts completed generations and includes a deterministic local adapter rather than requiring paid credentials.

