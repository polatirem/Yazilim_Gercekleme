# Security

Runtime secrets are generated with a cryptographic RNG and stored as SHA-256 digests; the plaintext is returned once. Passwords use PBKDF2-HMAC-SHA256 with unique salts. JWTs are signed server-side. Queries are scoped through authenticated organization membership or the environment encoded by the runtime key.

Raw prompts and outputs can contain sensitive material. PII findings are persisted without copying secret values into reasons. Administrative key, policy, and review changes are tenant-scoped in the audit log. Basic process-local rate limits protect authentication and runtime endpoints. Production work remains: TLS, external secret management, configurable field storage/retention, at-rest encryption, distributed rate limits, CSRF-safe cookie sessions if cookies are introduced, and SIEM export.
