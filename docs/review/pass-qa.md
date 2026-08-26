I now have a complete evidence base. Let me compile the review.

---

# TESTS & QUALITY-GATE Review — CloserAI (D:/Dev/DSH-closerAI)

Review-only pass; no project/source files were modified. All findings are verified from the code, tests, configs, and workflows. Test count cross-checked: ~145–147 `it()` blocks across 21 vitest files (17 desktop + 4 packages), consistent with the "145 tests" claim in `docs/STATUS.md`/`README.md`.

## Review

### 1. Coverage gaps by module (which source files have zero/effectively-zero direct unit tests)

Verified mapping of `apps/desktop/src/main/*` to `apps/desktop/test/*.test.ts` (vitest include is only `test/**/*.test.ts`, `apps/desktop/vitest.config.ts:8`):

| Source file (src/main)            | Test file              | Status                                                                                                                      |
| --------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| capabilities.ts                   | capabilities.test.ts   | ✓                                                                                                                           |
| deep-link.ts                      | deep-link.test.ts      | ✓                                                                                                                           |
| diagnostics.ts                    | diagnostics.test.ts    | ✓                                                                                                                           |
| dsh-home.ts                       | dsh-home.test.ts       | ✓                                                                                                                           |
| dsh-settings.ts                   | dsh-settings.test.ts   | partial — only `writeDshProviderSettings`; **`writeDshAgentPresetDefault` untested**                                        |
| mcp-store.ts                      | mcp-store.test.ts      | partial — **http enabled export path, `exportPath`, per-record sanitize, empty-name default untested**                      |
| mode-store.ts                     | mode-store.test.ts     | ✓                                                                                                                           |
| permissions.ts                    | permissions.test.ts    | ✓                                                                                                                           |
| presets.ts                        | presets.test.ts        | ✓                                                                                                                           |
| project-store.ts                  | project-store.test.ts  | ✓                                                                                                                           |
| provider-store.ts                 | provider-store.test.ts | partial — no corrupt-file fallback, no delete, no "apiKey never in file"                                                    |
| providers.ts                      | providers.test.ts      | ✓ (incl. negative + error mapping)                                                                                          |
| secrets.ts                        | secrets.test.ts        | partial — fake cipher only; **real `createSafeStorageCipher` and corrupt-file/decrypt-failure untested**                    |
| security.ts                       | security.test.ts       | ✓ (strong contract tests)                                                                                                   |
| session-store.ts                  | session-store.test.ts  | ✓ (incl. disk-error negatives)                                                                                              |
| update.ts                         | update.test.ts         | ✓                                                                                                                           |
| **backend.ts**                    | —                      | **no direct tests** (`launchBackend` never unit-tested; mock/system-sync branches untested)                                 |
| **ipc.ts**                        | —                      | **no tests** (all 30+ IPC handlers, validation errors, `fail()` mapping, `applyProjectToConfig`, `appState` shape untested) |
| **dsh.ts**                        | —                      | only `resolveDshBin` exercised indirectly by persistence.test.ts; `startDsh` untested                                       |
| **index.ts** (main)               | —                      | no tests; only exercised by manual smoke                                                                                    |
| **tray.ts**                       | —                      | no tests (electron-dependent)                                                                                               |
| **window.ts**                     | —                      | no tests (electron-dependent; pure helpers `isAppIndexNavigation`/`targetOrigin` also untested)                             |
| **preload/index.cjs**             | —                      | no tests; **not typechecked** (see F-05)                                                                                    |
| **renderer/src/{App,Manage}.tsx** | —                      | **zero component tests**; no jsdom/@testing-library in any devDependency, so renderer testing is not even set up            |

Test quality is genuinely good at the store/unit level: temp-dir-based round-trips, corrupt-file fallbacks (project-store, mcp-store, session-store), negative IDs (session-store), fetch stubbing with error mapping (providers), a fake-updater (update), and one real end-to-end DSH headless persistence test (`persistence.test.ts`). Weak/tautological tests (P3): `deep-link.test.ts:26` (asserts constant equals its literal), `permissions.test.ts:32` (asserts non-empty strings), `mcp-store.test.ts:101` (write-then-read same value), `presets.test.ts:50` (asserts MODES equals its literal).

Missing negative/error paths worth adding (P3): provider-store corrupt-file + apiKey-not-persisted; mcp-store per-record sanitize + http enabled export; secrets corrupt-file + decrypt-failure; capabilities corrupt-file; dsh-settings `writeDshAgentPresetDefault`.

### 2. Gate structure (`pnpm check`)

- `package.json:20` — `"check": "pnpm format:check && pnpm lint && pnpm build && pnpm typecheck && pnpm test && pnpm sbom:gen"`. Order is sound; format first, SBOM last.
- **`sbom:gen` (license gate) is NOT run on CI.** `ci.yml` splits `pnpm check` into individual steps and runs only Format/Lint/Build/Typecheck/Test — `sbom:gen` is absent. A PR introducing an unlicensed dependency passes CI but fails local `pnpm check` / release. Contradicts the "SBOM gate" claim in `docs/STATUS.md:13` and `AGENTS.md`.
- **No coverage gate** — zero `coverage` config anywhere (only an eslint ignore entry `eslint.config.mjs:8`); vitest configs are bare. No minimum-coverage enforcement.
- **Smoke/E2E is manual-only** — `apps/desktop/package.json:15` `"smoke": "electron . --smoke-test"` is not invoked by CI or release.yml.
- **`pnpm smoke` in README is wrong** — `README.md:54`, `README.zh.md:54`, `docs/PLUGIN_DEV.md:35` document `pnpm smoke`, but the root `package.json` defines **no** `smoke` script; the command fails ("Missing script"). Actual usage is `pnpm --filter @closerai/desktop run smoke`.
- Renderer coverage consequence: the smoke test checks only `body.innerText.includes('CloserAI 工作区')` (`index.ts`), so it passes despite the two concrete renderer defects below (F-03, F-04).

### 3. CI

- Matrix sanity is good: 3-OS `quality` job, `fail-fast: false`, pnpm 11.21.0 pinned via `pnpm/action-setup@v4`, Node 22 with pnpm cache, `--frozen-lockfile`.
- `format:check` is present on CI (good).
- Release workflow gaps: `release.yml` (windows-installer + cross-installer) runs only `pnpm -r build`; **no format/lint/typecheck/test and no smoke on either release job**. A tag pushed to a broken commit would build and publish installers with zero test/smoke verification.
- **`cross-installer` "Verify packaged DSH runtime is complete" can silently pass** — the step (`release.yml`) only runs `find` commands with no failure check on empty results; a missing/broken dmg/AppImage would not fail the job (it would only fail later, and only on tag runs, at `gh release upload`). Windows job has an implicit gate (SHA step errors if the exe is missing).
- No coverage threshold job; no artifact size/checksum verification in CI itself (windows SHA is computed but not verified against a known-good hash).

### Concrete defects found in untested code (evidence of coverage-gap cost)

- F-03 `apps/desktop/src/renderer/src/Manage.tsx:423` — `当前模式「${MODE_LABEL[state.mode]}」设计授予的能力…` is a **plain string child, not a JS template literal** (no backticks), so the user sees the literal `${MODE_LABEL[state.mode]}` text instead of the mode label. No renderer test or smoke assertion catches it.
- F-04 `apps/desktop/src/renderer/src/Manage.tsx:735` — `diag.logLines.slice(-20).join('\n')` joins `DiagnosticLogLine` **objects** (`shared/types.ts` — `{stream,text,at}`), producing lines of `[object Object]` in the log viewer. Should be `.map((l) => l.text).join('\n')`.
- F-06 Version drift: `ipc.ts:276,297` hardcode diagnostics `appVersion: '0.0.7'` while `apps/desktop/package.json` is `0.7.0` and `preload/index.cjs:47` says `'0.7.0'`; the diagnostics report will display "CloserAI 0.0.7".

---

## Findings (ranked)

- **F-01 (P1)** — `ci.yml` omits `sbom:gen`, so the license/SBOM gate is not enforced on CI/PRs while `pnpm check` and docs claim it. Evidence: `ci.yml` steps (format/lint/build/typecheck/test only) vs `package.json:20`. Fix: add `- run: pnpm sbom:gen` to the CI `quality` job (or run `pnpm check`).
- **F-02 (P1)** — No smoke/E2E in CI **and** `release.yml` runs no tests at all; a broken commit on a release tag can ship untested installers. Evidence: `apps/desktop/package.json:15`; `ci.yml`/`release.yml` (no `smoke`, no `test` in release). Fix: run the desktop smoke on the packaged build in CI (ubuntu, `xvfb-run` for the window) and run `pnpm check` (at least `pnpm test`+`pnpm typecheck`) in release.yml.
- **F-03 (P2)** — Renderer has zero tests and smoke is too shallow → shipped literal-text bug. `Manage.tsx:423` renders `${MODE_LABEL[state.mode]}` literally. Evidence: source read; smoke checks only heading text (`index.ts`). Fix: add renderer unit/component tests (set up jsdom + @testing-library) and assert the permission hint text; fix the literal interpolation.
- **F-04 (P2)** — `Manage.tsx:735` `join('\n')` on `DiagnosticLogLine[]` → `[object Object]` in the log viewer. Evidence: `shared/types.ts` `DiagnosticLogLine` is an object; no test. Fix: `.map((l) => l.text).join('\n')` + renderer test.
- **F-05 (P2)** — `src/preload/index.cjs` is not typechecked (not in any tsconfig include: `tsconfig.json` includes only `*.ts`, `tsconfig.build.json` only `src/main/**/*.ts`) and hand-duplicates all 33 IPC channel names with `shared/ipc.ts`; no parity test. A renamed channel fails only at runtime. Evidence: `tsconfig*.json` includes; `preload/index.cjs` IPC block. Fix: extract channel names to a shared module imported by both (preload can `require` a tiny `.cjs`/JSON), or add a test asserting preload's channel set equals `shared/ipc.ts` `IPC`.
- **F-06 (P2)** — Diagnostics version drift `'0.0.7'` vs `0.7.0`. Evidence: `ipc.ts:276,297` vs `package.json`/`preload/index.cjs:47`. Fix: single source of truth (e.g. `app.getVersion()`), plus a test.
- **F-07 (P2)** — No coverage gate anywhere; vitest configs have no `coverage`. Evidence: grep for `coverage` returns only the eslint ignore. Fix: add `coverage` (v8) with a modest threshold on `src/main` and `src/shared` as a warning-gate.
- **F-08 (P2)** — `cross-installer` runtime-verify step can silently pass (find with no failure on empty); `release.yml`. Fix: `find ... | grep -q` / explicit exit-1 when a required artifact (`.dmg`/`.AppImage`/`latest-*.yml`) is missing.
- **F-09 (P3)** — `writeDshAgentPresetDefault`, `launchBackend`, `registerIpcHandlers`, `applyProjectToConfig`, `exportPath`, http-enabled MCP export are untested (see table). Fix: unit tests for `dsh-settings` and mcp-store http export; an ipc handler test with a fake `IpcDeps` covering the `mcpAdd` validation branches.
- **F-10 (P3)** — README/PLUGIN_DEV document `pnpm smoke` which does not exist at root. Evidence: root `package.json` has no `smoke` script; `README.md:54`. Fix: add root `"smoke": "pnpm --filter @closerai/desktop run smoke"` or correct docs.
- **F-11 (P3)** — Minor tautological/weak tests and store negatives (see §1). Low priority; no action required before release.

## Merge verdict

**OK with notes** — the store/unit/supervisor test suite is above average (real behavior, temp-file isolation, negative paths, one true E2E), and the `pnpm check` order is sound. Release-blocking concerns are the gate-structure gaps (F-01, F-02) plus the two confirmed renderer defects (F-03, F-04) that ship in v0.7.0; all are fixable in a follow-up pass rather than blocking this review.

---
