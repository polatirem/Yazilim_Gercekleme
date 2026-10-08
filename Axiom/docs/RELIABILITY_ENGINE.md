# Reliability engine

The registry currently includes schema, citation, grounding, contradiction, and PII detectors. Grounding uses normalized token overlap per response sentence. Contradiction identifies changed numeric quantities when surrounding language overlaps. These deterministic checks are useful for the bundled scenario but do not prove factual correctness.

Each result includes risk, severity, reason, evidence, duration, metadata, and zero or more character-offset spans. Score fusion uses configured detector weights and the maximum finding risk for each dimension. The resulting score is labelled `heuristic` until calibration data exists.

Gemini is integrated as a server-side generation and repair provider. Its output is always passed back through the same detector registry; model output is not treated as an evaluator truth signal. The API key is loaded from an ignored local environment file or deployment secret.
