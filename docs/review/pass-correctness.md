I have completed a full read of the in-scope sources and their tests. Here is my review artifact.

---

## Review — Correctness & Robustness (CloserAI, cwd `D:/Dev/DSH-closerAI`)

Scope reviewed (read in full): `packages/supervisor/src/{supervisor,health,url,log-buffer,types}.ts`, `apps/desktop/src/main/{index,backend,dsh,dsh-home,session-store,project-store,provider-store,mode-store,capabilities,mcp-store,ipc,update,tray,deep-link,secrets,providers,diagnostics,dsh-settings,safe-storage-cipher,window}.ts`, and tests `packages/supervisor/test/supervisor.test.ts`, `apps/desktop/test/{persistence,session-store,project-store,provider-store,mode-store,update,deep-link,dsh-home}.test.ts`. No files were modified (review-only).

### Correct — verified sound (with evidence)

- **Supervisor restart/backoff core**: `handleExit` (supervisor.ts:274-321) only restarts from `ready`/`unhealthy`, guards `runId`, clears health/stable/startup timers on every terminal path, and caps restarts at `maxRestarts` with exponential backoff `restartBackoffMs * 2**(restartCount-1)` (supervisor.ts:311). `startPromise` dedupe via `if (this.startPromise !== null) return this.startPromise` (supervisor.ts:103). Tested by `supervisor.test.ts` (crash-restart, max-restarts, startup timeout, unhealthy→restart).
- **Health probe**: `tcpProbe` settles exactly once and always destroys the socket (health.ts:6-20); probe timeout is `min(2000, healthIntervalMs)` so probes never overlap; in-flight `.then` re-checks `runId`+state (supervisor.ts:193-205).
- **Session path safety**: `resolveDir` (session-store.ts:58-69) enforces strict `^session-[0-9a-f-]+$` id and an explicit `resolve`+prefix containment check; `readdir({withFileTypes})` Dirents don't follow symlinks, so a symlinked session dir is skipped and `rm`/`copyFile` never traverse out of root. Traversal tests exist (session-store.test.ts). `workspaceKeyFromPath` (session-store.ts:16-21) strips path separators, so `importFrom`'s `workspaceKey` can never escape root.
- **Stale task-board lock self-heal**: `clearStaleTaskBoardLock` (dsh-home.ts:76-102) is conservative — no file → false, unparseable/corrupt lock → false (left for manual handling), live owner pid → false; only removes when owner provably dead. Retry is gated on both `describeDshStartFailure` match AND a successful clear (index.ts:151-166). Covered by dsh-home.test.ts.
- **Deep-link**: `parseDeepLink` validates scheme (deep-link.ts:16-26); only known actions (`manage`/`chat`) are honored; `path`/`query` are ignored, no injection surface. Tested.
- **Log buffer** bounded (log-buffer.ts:12-21); **single-instance lock** (index.ts:439-441) prevents cross-process writers, and store read-modify-write is fully synchronous within one main-process tick, so there is no intra-process TOCTOU.
- **Corruption tolerance exists but is inconsistent** (see F2): `McpStoreFile.read` (mcp-store.ts:38-45) and `CapabilitiesStore.read` (capabilities.ts:31-39) already fall back to defaults on any parse failure; `SessionStore.list` survives unreadable dirs and record-less/0-byte sessions (session-store.ts:34-66, tested).

### Findings

**F1 — P1 — Concurrent restart requests launch multiple DSH children; orphaned backend + window flip-flop + unhandled-rejection crash risk**

- Location: `apps/desktop/src/main/index.ts:128-143` (`startBackendForActiveProfile`), `index.ts:367-368` (`onComplete: () => { void startBackendForActiveProfile() }`), triggered by `ipc.ts:141,192,204,215,226,263` (`deps.onComplete()`).
- Issue: restart requests are fire-and-forget (`void`) and not serialized/queued. Two overlapping invocations (e.g. a capability toggle followed quickly by a project activate, or a double-click) both run `await stopBackend()` — the second finds `backend === null` (index.ts:118-119) and returns immediately — then each calls `launchBackend()`→`startDsh()`→new `DshSupervisor`, so two DSH children boot against the same home. `backend = running` is last-writer-wins (index.ts:143); the first `RunningBackend` is orphaned: its supervisor child keeps running, and its `'ready'` listener (index.ts:145-151) still navigates the window to the orphan's URL. On quit, `before-quit` (index.ts:433-437) stops only `backend`, leaking the orphan's DSH process. Two DSH on one managed home can also collide on the task-board ledger lock, making one boot fail → `launchBackend` rejects → unhandled rejection (no catch on the `void` call) → under Node's current default (`--unhandled-rejections=throw`) the process terminates.
- Smallest fix: serialize restarts in `index.ts` with a single in-flight promise (`let restart = Promise.resolve(); onComplete → restart = restart.then(startBackendForActiveProfile).catch(...)`), and add a try/catch+`notify` to the managed branch (mirroring the system-sync branch at index.ts:132-173).

**F2 — P1 — Corrupt projects/provider/app-config JSON crashes the app at boot or breaks IPC; writes are non-atomic and no self-heal exists**

- Location: `project-store.ts:39-49` (`read()` rethrows all non-ENOENT errors), `provider-store.ts:25-32`, `mode-store.ts:23-31`, `index.ts:324` (`applyProjectToConfig` at the top of `boot()`), `index.ts:441` (`void app.whenReady().then(boot)` — no catch), and unguarded reads `ipc.ts:105-106,137,184,233`.
- Issue: these stores tolerate only `ENOENT`; corrupt content (truncated JSON from a crash mid-`writeFileSync`, or disk error) throws. On next launch `boot()`→`applyProjectToConfig`→`projectStore.getActive()`→`read()` throws inside `boot()`, which rejects the promise from `.then(boot)` → unhandled rejection → process exits with no recovery, contradicting the v0.0.9 "磁盘容错" (disk fault tolerance) hardening. Even without the boot crash, `modeGet`/`providersList`/`projectsList`/`appState` handlers throw → renderer gets a rejected invoke → manage page renders a broken/blank state with no recovery path. Writes are non-atomic (direct `writeFileSync`, no temp+rename). This is inconsistent with `mcp-store.ts:38-45` and `capabilities.ts:31-39`, which already tolerate all corrupt content.
- Smallest fix: treat JSON parse errors as defaults in the three stores (with an optional `.corrupt` backup), and/or write atomically (temp file + `rename`); wrap the top of `boot()` in try/catch so a store fault lands on onboarding instead of crashing.

**F3 — P2 — Supervisor: `start()` during an in-flight `stop()` leaves `stopPromise` pending forever (hang)**

- Location: `packages/supervisor/src/supervisor.ts:101-113` (`start()` proceeds from any non-`ready` state incl. `stopping`), `116-148` (`stop()`), `274-294` (`handleExit`).
- Issue: `start()` checks only `state !== 'ready'` and `startPromise === null`, so it can run while `stop()` awaits child exit. `spawnChild()` bumps `runId`; the old child's exit then hits `if (runId !== this.runId) return` (supervisor.ts:275-276) _before_ the `stopping`/`finishStop` branch, so `finishStop()` never runs, `stopResolve` is never invoked, and `stopPromise` never resolves → desktop `stopBackend()` (index.ts:116-123) and therefore `before-quit` (index.ts:433-437) hang; the app won't quit. Currently latent because the desktop serializes stop-then-start sequentially, but it becomes reachable if the F1 fix is implemented naively or by any future caller that overlaps start/stop. Not covered by `supervisor.test.ts`.
- Smallest fix: make `start()` reject (or defer) while `stopPromise !== null` / state `'stopping'`, or have the stale-runId exit path in `handleExit` still call `finishStop()` when a stop is pending.

**F4 — P2 — Supervisor: `start()` while a crash-restart timer is pending double-spawns and orphans the first child**

- Location: `supervisor.ts:101-113` (`start()`), `151-156` (`spawnChild()` clears `stableTimer` but not `restartTimer`), `311-316` (`restartTimer` → `spawnChild()`).
- Issue: in `unhealthy` with a pending `restartTimer` (crashed, waiting to retry), `start()` spawns child B without clearing the timer; when the timer fires it spawns child C (`runId++`), so child B's exit/error handlers see a stale `runId` and B is never supervised or killed — even by `stop()`. Zombie process leak. Untested.
- Smallest fix: `clearRestartTimer()` at the top of `start()` and `spawnChild()`.

**F5 — P2 — Managed-mode backend boot failure via IPC is an unhandled promise rejection with no user feedback**

- Location: `index.ts:367-368` (`void startBackendForActiveProfile()`), `index.ts:128-143` (managed branch, no try/catch — unlike the system-sync branch at 132-173 which notifies).
- Issue: any `launchBackend`/`startDsh` rejection in the managed branch (startup timeout, preset install failure, ENOENT on workspace mkdir) propagates to a fire-and-forget caller → unhandled rejection in main → process termination under current Node defaults, with no notification.
- Smallest fix: mirror the system-sync branch's catch+`notify` (or return the error through `onComplete`'s OpResult).

**F6 — P2 — `before-quit` async-stop races electron-updater's quit-and-install; `install()` doesn't stop the backend first**

- Location: `index.ts:433-437` (`before-quit` → `event.preventDefault()` + async `stopBackend()` + `app.quit()`), `update.ts:59-73` (`install()` → `updater.quitAndInstall()`).
- Issue: `quitAndInstall()` is called while a DSH child is still running and relies on its own quit sequence (`isUpdating` → installer on `will-quit`). Our `before-quit` calls `event.preventDefault()`, stops the backend asynchronously, then calls `app.quit()` again — the re-entrant quit can disrupt the install handshake (installer not launched, or quit before the handoff), and if `stopBackend()` hangs (F3) the app never quits and never installs.
- Smallest fix: in `install()`, stop the backend first, set an `installing` flag, and let `before-quit` skip `preventDefault()` when an update install is in progress.

**F7 — P3 — `update.check()` clobbers a `downloaded` state, forcing a re-download**

- Location: `update.ts:43-50`. A manual "check" after a completed download resets `status` to `checking`/`available`, so a subsequent `install()` re-downloads instead of installing the ready artifact.

**F8 — P3 — Deep-link `chat` with no backend leaves a stale page, no recovery**

- Location: `index.ts:74-80` (`showChat` only `loadURL`s when `backend !== null`), `96-100` (`handleDeepLink`). `closerai://chat` before the backend is ready just focuses the current (onboarding/manage) window.

**F9 — P3 — `SessionStore.list()` re-stats every file of every session on every call**

- Location: `session-store.ts:29-71`. Called by `appState`, `sessionsList`, `appDiagnostics`, `appExportDiagnostics` (ipc.ts:233,147,270,290) on each renderer query; O(total files) synchronous-ish async stat churn on large stores adds latency to the manage page. Consider caching or bounding.

**F10 — P3 — `startupTimer` not cleared on ready**

- Location: `supervisor.ts:186-195` (`onReady` doesn't clear/null `startupTimer`). The timer callback early-returns once state is `ready` (supervisor.ts:170-174), but the timer object and its closure live up to `startupTimeoutMs` (60 s) after a successful boot. Harmless, but should be cleared in `onReady` for symmetry with `handleExit`.

**F11 — P3 — Session import leaves partial files on the record-overwrite failure path**

- Location: `session-store.ts:121-141`. `importFrom` copies files while iterating and only throws `already exists` when it reaches the record file, so an existing target record leaves earlier-copied files behind. `list()` skips the record-less dir, so it's benign, but the partial copy should be cleaned up or checked first.

### Residual risks

- F1/F3/F4 are state-machine/concurrency gaps in the supervisor's public API; F1 is the only one reachable through the current desktop wiring, and is reachable through normal UI interaction (rapid mode/project/capability changes).
- F2's boot-crash trigger requires a corrupted file (crash/disk-full mid-write), but the app's own hardening claims make this a real gap; no corruption-recovery tests exist for the three stores.
- The desktop `before-quit` shutdown depends on `supervisor.stop()` resolving; any path that leaves a supervisor with an unresolved `stopPromise` (F3) also blocks quit.
- `pnpm check` / `pnpm test` were **not run** (review toolset has no shell). The supervisor must run them to confirm the current baseline passes before merge.

### Merge verdict

**OK with notes** — no P0; F1 and F2 are P1 and should be fixed before release; F3–F6 are recommended P2 follow-ups.

---
