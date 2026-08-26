I now have complete coverage of the main process, shared contract, preload, renderer, and both packages, plus docs. Here is the full architecture review artifact.

---

## Review — CloserAI Electron monorepo (architecture pass)

Reviewed: all 23 `apps/desktop/src/main/*.ts` modules, `src/shared/{types,ipc}.ts`, `src/preload/index.cjs`, `src/renderer/src/{App,Manage,main,bridge}.tsx/.ts`, `packages/supervisor/src/*`, `packages/mock-provider/src/*`, plus `docs/{ARCHITECTURE,DECISIONS,EXECUTION_PLAN,STATUS}.md`. Review-only — no files modified.

### 1. Module boundaries & SRP

| Module                         | ~Lines     | Assessment                                                                                                                                                               |
| ------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `main/index.ts`                | ~397       | Overloaded composition root: app lifecycle, single-instance, deep-link, menu, tray wiring, backend lifecycle, window mgmt, **and ~90 lines of smoke-test harness**       |
| `main/ipc.ts`                  | ~366       | Single `registerIpcHandlers` with ~35 handlers + duplicated diagnostics snapshot builder — large but linear; main drift risk is the duplicated `buildDiagnostics` blocks |
| `renderer/src/Manage.tsx`      | ~734       | One component for ~10 concerns (projects, sessions, capabilities, diagnostics, update, MCP CRUD, launch-at-login, permission manifest, sync banner)                      |
| `renderer/src/App.tsx`         | ~190       | Onboarding provider form — focused, fine                                                                                                                                 |
| `main/mcp-store.ts`            | ~205       | SRP-respecting store + export; fine                                                                                                                                      |
| `main/session-store.ts`        | ~155       | SRP-respecting, defensive path validation; fine                                                                                                                          |
| `main/capabilities.ts`         | ~130       | Store + fragile line-based YAML transform (D-018) mixed together                                                                                                         |
| `packages/supervisor/src/*`    | ~450 total | Clean, cohesive (`supervisor.ts` is the largest at ~330, still single-responsibility)                                                                                    |
| `packages/mock-provider/src/*` | ~240 total | Clean, dependency-free, deterministic                                                                                                                                    |

Cleanest boundaries: stores, `diagnostics.ts`, `security.ts`, `window.ts`, `tray.ts`, `update.ts`, `deep-link.ts`, `dsh.ts`, `dsh-home.ts`, `dsh-settings.ts`, `presets.ts`, and both packages. The `supervisor`/`mock-provider` packages are exemplary.

Worst offenders: `index.ts` (smoke harness + orchestration + app events in one file), `Manage.tsx` (monolithic view), `ipc.ts` (all handlers + duplicated logic).

### 2. Coupling & dependency direction

- Clean: renderer → preload (`window.closerai`) → `ipcMain.handle` → stores; main → `shared/*` and `packages/*`. No renderer→main backdoor found: the preload (index.cjs:45-77) exposes only fixed `invoke` wrappers, `Object.freeze`'d, no generic `send`/`on` channel passthrough, no `ipcRenderer` exposure; window is `contextIsolation` + `sandbox` + no `nodeIntegration` (security.ts:52-64, window.ts:24-31).
- Renderer-supplied paths (session export/import, MCP export, diagnostics export) all resolve inside main against user-picked directories, with `SessionStore.resolveDir` (session-store.ts:97-108) refusing escapes — no traversal from renderer-controlled input.
- **Contract leak (the one real coupling problem):** the preload api is hand-duplicated CJS and is _not_ typechecked (`tsconfig.json` includes only `src/**/*.ts`; the JSDoc `@type CloserAiBridge` at index.cjs:37 is never validated), so `CloserAiBridge` and the actual bridge can silently diverge — and they have (see §3).
- DSH child boundary honored: `dsh.ts:37-57` spawns via `process.execPath` + `ELECTRON_RUN_AS_NODE`; main never imports DSH code (D-002). Supervisor owns child lifecycle and health (`supervisor.ts`), main owns the `RunningBackend` aggregate (`backend.ts`).

### 3. Shared contract completeness

- `shared/ipc.ts` `IPC` constant: **35 channels**. Main `ipc.ts` registers handlers for **all 35**. Preload `index.cjs` `IPC` object: **identical 35 names**. Channel-name layer is perfectly in sync.
- **Drift found in the bridge-method layer:** `CloserAiBridge` (shared/ipc.ts:83) declares 37 members including `getCapabilities`/`setCapabilities`/`getDiagnostics`/`exportDiagnostics`/`getLaunchAtLogin`/`setLaunchAtLogin` (shared/ipc.ts:107-112). The preload `api` object (index.cjs:45-77) implements **only 31** — those 6 are missing. `Manage.tsx` calls 4 of them at runtime: `:321` (`getDiagnostics`), `:335` (`exportDiagnostics`), `:348` (`setLaunchAtLogin`), `:359` (`setCapabilities`) → each throws `TypeError: window.closerai.X is not a function` (caught, shown as error). Diagnostics refresh/export, capability save, and the launch-at-login checkbox on the manage page are all **broken in the current build**, and the smoke test (`index.ts:196-249`) only asserts the heading text so it cannot catch this. `getCapabilities`/`getLaunchAtLogin` are declared but never called (dead interface members).
- `types.ts` fully covers all IPC payloads and `AppState`/`Diagnostics`/`UpdateStatus`/`McpServer` shapes used by both sides. No payload drift found.

### 4. State ownership

- **Main process owns all persistence**: providers, projects, sessions-metadata, MCP registry, capabilities, app-config (JSON in userData), secrets (keychain via `SecretStore` + `safeStorage`), plus the DSH child lifecycle. This is correct and consistent with D-011/D-014.
- **Renderer owns UI state only.** One smell: `Manage.tsx:212` `setCaps((previous) => previous ?? { ...next.capabilities })` initializes caps once and **never re-syncs** from the backend on later refreshes — silently prefers local over server truth (low impact today, wrong pattern).
- **`launchAtLogin` has two sources of truth**: `AppConfig.launchAtLogin` (configStore) _and_ the OS login item (`getLaunchAtLogin()` reads `app.getLoginItemSettings()`, tray.ts:70-73, fed into `appState` at ipc.ts:243). `index.ts:335-342` writes both together, but if OS state changes externally the two diverge.
- **DSH owns session content** (zstd records) — clean split per D-014; `SessionStore` only inspects directory layout.
- Supervisor-owned vs main-owned child state is cleanly separated (`supervisor.ts` getters + status events).

### 5. Concrete refactor opportunities (ranked by risk/benefit)

1. **[High value, low risk] Enforce the preload contract.** Add a `test/preload-contract.test.ts` that imports `CloserAiBridge` and asserts every member exists and is a function on a copy of the preload api (or typecheck `index.cjs` with `allowJs`+`checkJs`). Would have caught both the missing 6 methods and future drift; cheapest safety net in the repo. _This is the fix that unblocks P1-1._
2. **[High value, low risk] Fix MCP add + extract MCP view.** Fix the `mcpEditId` sentinel (see P1-2) and, opportunistically, split the ~250-line MCP card out of `Manage.tsx` into `McpPanel.tsx`. The MCP add bug is a 1-line logic fix; the split is pure refactor.
3. **[Medium value, low risk] De-duplicate in `ipc.ts` and `index.ts`.** Extract `snapshotDiagnostics()` used by `appDiagnostics`/`appExportDiagnostics` (ipc.ts:264-282 vs 288-309) and one `applyLoginItemChange(enabled)` closure (index.ts:335-342 vs 361-367).
4. **[Medium value, low risk] Extract the smoke harness** (`index.ts` `isSmokeTest` blocks, ~90 lines) into `scripts/smoke.ts`, keeping the production entry free of test branches.
5. **[Medium value, low risk] Derive version once.** Replace hard-coded `appVersion: '0.0.7'` (ipc.ts:276, 297) with `app.getVersion()` injected via deps, and consider reading the preload `appVersion` from a shared source.
6. **[Lower priority] Split `Manage.tsx`** into cards (Projects, Sessions, Capabilities, Diagnostics, MCP). ~734 lines is at the edge of maintainability but the renderer is otherwise tiny; benefit is modest.
7. **[Lower priority] Caps re-sync** — drop the `previous ??` pattern at Manage.tsx:212 so `refresh()` always overwrites caps from `appState`.

---

## Finding list (severity-ranked)

1. **P1 — `shared/ipc.ts:107-112` vs `preload/index.cjs:45-77` vs `Manage.tsx:321,335,348,359` — Preload bridge missing 6 declared methods → 4 broken manage-page actions.**
   Evidence: `CloserAiBridge` declares `getCapabilities/setCapabilities/getDiagnostics/exportDiagnostics/getLaunchAtLogin/setLaunchAtLogin`; the preload `api` object does not implement them; `Manage.tsx` invokes 4 → runtime `TypeError`. Not typechecked (`tsconfig.json` includes only `src/**/*.ts`, not `*.cjs`) and not smoke-tested.
   Recommendation: add the 6 wrappers to the preload api **and** add a preload-contract test asserting every `CloserAiBridge` member is exposed (regression guard).

2. **P1 — `Manage.tsx:571-576` + `:159-161` — MCP “add server” always fails with “未找到该 MCP 服务器”.**
   Evidence: the “＋ 添加服务器” button sets `mcpEditId=''` (after `resetMcpForm()` sets `null`), but `onSaveMcp` only routes to `addMcpServer` when `mcpEditId === null`; with `''` it calls `updateMcpServer({id:''})` → `mcpStore.update('')` returns null → error (ipc.ts:324-330). The headline v0.7.0 feature cannot add a new server.
   Recommendation: treat `''` as the add sentinel too (`mcpEditId === null || mcpEditId === ''`), or keep `null` for add and use a separate show-form boolean.

3. **P2 — `ipc.ts:276,297` — Diagnostics `appVersion` hard-coded to stale `0.0.7`** while the app is v0.7.0 (package.json, preload index.cjs:47). Diagnostics summary/export misreport version.
   Recommendation: `app.getVersion()` injected once.

4. **P2 — `index.ts:128-250, 370-400` — Smoke-test harness embedded in the production entry** (~90 lines of `isSmokeTest` branching, `executeJavaScript` assertions).
   Recommendation: extract to `scripts/smoke.ts`.

5. **P2 — `apps/desktop/test/` — No renderer or preload-contract tests.** 17 test files cover main modules only; both P1 defects are renderer/preload and would have been caught by a contract test.
   Recommendation: add preload-contract + `Manage.tsx` component tests.

6. **P2 — `index.ts:335-342` vs `:361-367` — Identical launch-at-login closure duplicated** (config write + `applyLaunchAtLogin` + tray refresh).
   Recommendation: hoist a single `applyLoginItemChange(enabled)`.

7. **P2 — `ipc.ts:264-282` vs `:288-309` — Diagnostics snapshot builder duplicated verbatim** in the two handlers.
   Recommendation: extract `snapshotDiagnostics()`.

8. **P3 — `Manage.tsx:423` — Literal `${MODE_LABEL[state.mode]}` in JSX text** renders the raw string instead of the mode label (missing `{...}` braces). Cosmetic.

9. **P3 — `Manage.tsx:212` — `setCaps(prev => prev ?? …)` never re-syncs caps from the backend** after initial load; silently prefers stale local state.

10. **P3 — `launchAtLogin` dual source of truth** (`AppConfig.launchAtLogin` vs OS login item read at `index.ts:334,360`/tray.ts:70-73); diverges if OS state changes externally.

11. **P3 — `window.ts:61` — `session.defaultSession.webRequest.onHeadersReceived` listener accumulates** on every `createWindow` call (window recreate path via `index.ts` `ensureWindow`); `setPermissionRequestHandler` (window.ts:85) replaces so is safe. Low impact today (single window), worth guarding.

12. **P3 — `.gitignore` — `.pi/` scratch dir not ignored.** `.pi/tasks/session-*` at repo root is not covered by `.gitignore`; risk of accidental commit of agent scratch files. Recommend adding `.pi/`.

13. **P3 — `capabilities.ts:69-118` — line-based preset YAML transform (D-018)** keys on exact `- id:`/`disabled:`/`name:` indentation; formatting drift in checked-in presets would silently change the capability surface. Mitigated by `capabilities.test.ts`; note only.

## Merge verdict

**BLOCK** — no P0; architecture/layering/state-ownership is otherwise sound, but two P1 runtime defects (preload bridge drift breaking diagnostics/capabilities/launch-at-login on the manage page, and MCP add being unusable) must be fixed before the v0.7.0 release cut. Both are small, low-risk fixes; findings 1–2 should be resolved first, ideally with the P2 contract-test guard from finding 5.

---
