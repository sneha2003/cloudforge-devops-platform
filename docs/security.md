# Security

## Implemented controls

- No committed secrets; `.env`, Terraform state, plans, databases, and deployment logs are ignored.
- Operator endpoints use a constant-time token check. Browser reads cannot start Docker, run commands, or mutate infrastructure.
- Non-root application/web containers, capability dropping, health checks, minimal runtime stages, and pinned versions.
- Separate Docker networks; cloud NSG exposes only web ports and restricted SSH. Local observability ports bind to loopback.
- GitHub workflows declare minimal permissions. Azure uses short-lived OIDC and a protected environment.
- Trivy scans repository dependencies/configuration; backend linting, frontend type checks, tests, and image builds gate changes.
- Terraform rejects `0.0.0.0/0` administrative access and uses key-only VM authentication.

## Remaining limitations

The local operator token is a shared secret and has no rotation service or per-user audit identity. Local HTTP is acceptable only on loopback; a cloud deployment needs TLS and a real authentication layer. A Docker administrator is effectively root on the host. cAdvisor is privileged and should remain on the internal network. SQLite has no built-in cross-host replication. Dependencies require ongoing updates; a pinned version is reproducible, not permanently secure.

For production, use Entra ID/OAuth for people, Azure Key Vault for secrets, signed images and policy verification, centralized logs, encrypted backups, patched hosts, vulnerability exception governance, and external penetration/security review.

## Reporting a concern

Do not open a public issue containing a credential or exploit details. Revoke exposed credentials immediately, remove them from history with appropriate coordination, and rotate dependent tokens. Git history deletion is disruptive and must be reviewed.

