- [x] Log viewer and diagnostics export (landed in v0.0.6)
- [ ] System permission guidance (with v0.0.8 hardening)

## v0.0.8 — Packaging and Security

- [x] Windows CI build (release-build workflow, tag-triggered)
- [ ] macOS / Linux CI builds (deferred: Windows installer is the v0.1.0 gate)
- [x] Installers + SHA-256 checksums (CloserAI-0.0.8-Setup-x64.exe + SHA256SUMS.txt)
- [x] CSP / Origin / navigation security tests (security.test.ts, 16 cases)
- [x] Dependency and license audit (scripts/audit-licenses.mjs)
- [x] THIRD_PARTY_NOTICES (regenerated from the audit), SECURITY exists
- [ ] SBOM (CycloneDX/Syft) — deferred

## v0.0.9 — Release Candidate

- [x] Clean-environment install test (v0.0.8 fresh-install packaged smoke)
- [x] Crash-recovery tests (supervisor restarts on crash + unhealthy port, pre-existing)
- [ ] Offline, invalid-key, disk-error tests (in progress)
- [ ] Complete bilingual README, user manual, plugin dev docs, troubleshooting (in progress)
- [ ] Resolve all P0/P1 defects
- [ ] Publish v0.1.0-rc.1 (then rc.2, rc.3 as needed)

## v0.1.0 — Daily-use Release

Only after all acceptance criteria in the goal are verified from a clean clone/install.
