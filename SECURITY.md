# Security Policy

CloserAI is pre-release software. Please report security issues responsibly.

## Reporting a vulnerability

**Do not open a public issue for a security vulnerability.** Email the maintainers directly
with:

- A description of the issue.
- Steps to reproduce.
- Affected versions or commits.
- Any suggested remediation.

A maintainer will acknowledge the report and coordinate a fix and disclosure timeline.

## Scope

- Remote code execution via the local DSH API or plugin host code.
- Secret leakage (API keys, tokens) into logs, files, or the renderer.
- Sandbox, navigation, or permission-bypass issues in the Electron shell.
- Supply-chain or dependency issues introduced by this repository.

## Out of scope (for the time being)

- Vulnerabilities in third-party dependencies that are already publicly tracked upstream.

## Security model (summary)

The full architecture is described in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Key
guarantees under construction:

- Electron renderer: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`,
  strict CSP, no arbitrary navigation or new windows.
- The local DSH HTTP API binds to `127.0.0.1` on a random port and validates Origin/session
  tokens.
- Third-party plugins run with no implicit permissions and require explicit per-capability
  grants.
