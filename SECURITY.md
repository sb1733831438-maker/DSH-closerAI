# Security Policy

CloserAI is a local-first desktop client: your chat history, provider keys, and
MCP credentials stay on your machine. This policy explains how to report
security issues and what the current security model guarantees.

## Reporting a vulnerability

**Do not open a public issue for a security vulnerability.** Use one of the
private channels:

- **GitHub private security advisory** (preferred): open a draft advisory at
  <https://github.com/sb1733831438-maker/DSH-closerAI/security/advisories/new>
  — it is visible only to maintainers until you publish it.
- **Email the maintainer**: `sb1733831438@163.com` (Sun Binbin, the project
  maintainer).

Please include:

- A description of the issue.
- Steps to reproduce.
- Affected versions or commits.
- Any suggested remediation.

A maintainer will acknowledge the report within 5 business days and coordinate
a fix and disclosure timeline (default: 90 days coordinated disclosure).

## Scope

- Remote code execution via the local DSH API or plugin host code.
- Secret leakage (API keys, tokens, MCP credentials) into logs, files, or the
  renderer.
- Sandbox, navigation, IPC sender, or permission-bypass issues in the Electron
  shell.
- Supply-chain or dependency issues introduced by this repository.

## Out of scope (for the time being)

- Vulnerabilities in third-party dependencies that are already publicly tracked
  upstream.
- Code-signing / notarization posture (CloserAI does not yet purchase signing
  certificates; see the trust-root notes below).

## Security model (as implemented in v0.8.0)

The full architecture is described in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Key guarantees:

- **Electron renderer hardening**: `contextIsolation: true`, `nodeIntegration:
false`, `sandbox: true`, strict CSP on every response, navigation locked to
  the live DSH loopback origin, new windows denied, every permission request
  denied.
- **IPC sender validation (R-01)**: the preload bridge only answers invocations
  from the app's own `file://` pages. The DSH SPA shares the same hardened
  window and also runs the preload, so without this any XSS in DSH content
  would reach the whole bridge.
- **Secrets at rest (R-12)**: provider API keys are encrypted with the OS
  keychain/DPAPI via Electron `safeStorage`; MCP `env`/`header` values are
  encrypted at rest with the same cipher and masked from the renderer.
- **Log sanitization (R-13)**: diagnostics redact `sk-` keys, bearer tokens, and
  `KEY=VALUE` / JSON secret fields before they reach the renderer or export.
- **Trust root for auto-update**: updates are delivered over TLS from GitHub
  Releases. Code signing is not yet purchased, so binaries are not
  chain-of-trust signed; the signing gap is tracked in `docs/ROADMAP.md`
  (A-5 / R-14).
- **Local-first**: the DSH HTTP API binds to `127.0.0.1` on a random port; no
  data leaves the machine unless you explicitly configure a remote provider.

## Responsible use of third-party plugins

Plugins run with no implicit permissions and require explicit per-capability
grants (see `docs/ARCHITECTURE.md`). Treat third-party plugins like any
untrusted code.
