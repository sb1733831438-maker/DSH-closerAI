# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-08-14

### Added

- Repository bootstrap: pnpm workspace, TypeScript, ESLint, Prettier, Vitest.
- Deterministic OpenAI-compatible mock provider (`@closerai/mock-provider`).
- MIT license, README, CONTRIBUTING, SECURITY, and architecture/status/decision docs.
- GitHub Actions CI running format/lint/typecheck/build/test on Linux, macOS, and Windows.
- Public GitHub repository, topics, annotated `v0.0.1` tag, and Release.

## [0.0.2] - 2026-08-14

### Added

- DSH child-process supervisor (`@closerai/supervisor`): random loopback port, stdout URL
  parsing, TCP health checks, crash-restart with backoff, graceful shutdown.
- Hardened Electron shell (`apps/desktop`): single instance, `closerai://` deep links, strict
  CSP, navigation lock, external links to the system browser, permission denial, minimal
  sandboxed preload.
- Bundled DeepSeek Harness (`@deepseek-ai/dsh@0.1.0-rc.6`) launched via
  `ELECTRON_RUN_AS_NODE` + `--expose-internals`, and Electron pinned to `43.4.0`.
- `--smoke-test` mode that verifies the DSH UI mounts in the hardened window.

## [Unreleased]
