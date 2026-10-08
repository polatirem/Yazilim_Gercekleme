# Data model

Users belong to organizations through memberships. Organizations own projects; projects own environments and API keys. Runtime keys carry an immutable project/environment scope.

A request stores prompt/response metadata. Sources, detector runs/results, risk spans, and one reliability score belong to that request. UUID identifiers and UTC timestamps are used throughout. `organization_id`, `project_id`, `environment_id`, creation time, and status are indexed along request query paths. The first migration is authoritative for the implemented schema.

