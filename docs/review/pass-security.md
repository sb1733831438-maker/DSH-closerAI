I now have a complete evidence base. All files in scope have been read and cross-checked. Here is my security review artifact.

---

# CloserAI — Security Review (pass-security)

**Scope reviewed:** `apps/desktop/src/main/{security,window,index,secrets,safe-storage-cipher,providers,diagnostics,mcp-store,dsh-home,update,dsh,backend,ipc,project-store,provider-store,permissions,presets,dsh-settings,session-store,deep-link}.ts`, `apps/desktop/src/preload/index.cjs`, `apps/desktop/src/renderer/src/bridge.d.ts`, `apps/desktop/src/shared/{ipc,types}.ts`, `apps/desktop/src/renderer/index.html`, `apps/desktop/electron-builder.yml`, `packages/supervisor/src/{supervisor,health,url}.ts`, `packages/mock-provider/src/server.ts`, `apps/desktop/scripts/copy-runtime-node-modules.js`, `.github/workflows/{ci,release}.yml`, tests `security/secrets/diagnostics/mcp-store.test.ts`, `docs/DECISIONS.md` (D-008…D-021).

**Review-only:** no files modified, no commands executed (no shell available). Test/git runs are left to the supervisor.

## Correct (verified, with evidence)

1. **Secret at-rest path is sound (D-011).** `SecretStore` writes only base64 ciphertext; `writeFileSync(..., { mode: 0o600 })` (secrets.ts:46-47); round-trip test proves no plaintext on disk (secrets.test.ts:38-44). `createSafeStorageCipher` **throws** when encryption is unavailable — there is **no plaintext fallback** (safe-storage-cipher.ts:10-13). `ProviderProfile` has no `apiKey` field (types.ts:12-22), so keys never round-trip to the renderer; the key is injected to the child only as `DEEPSEEK_API_KEY` env (dsh.ts:37-40) and `writeDshProviderSettings` never writes it to `settings.yaml` (dsh-settings.ts:27-30, providers.ts:56-70).
2. **CSP split is correct in the right place.** The app's own renderer uses a strict CSP with `script-src 'self'`, **no** `'unsafe-eval'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`, `frame-ancestors 'none'` (index.html meta; enforced by test security.test.ts:120-133). The permissive `'unsafe-inline' 'unsafe-eval'` is confined to the DSH-served loopback origin via `onHeadersReceived` (window.ts:60-67, security.ts:22).
3. **Renderer shell hardening is real.** `contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, allowRunningInsecureContent: false` (security.ts:47-60; exact-contract test security.test.ts:96-105). Preload exposes only a frozen allow-list of 37 fixed channels via `invoke` (no `send`/`on`/`sendSync`), plain-CJS (preload/index.cjs:12-60, 64-82). Permission requests denied (window.ts:84-86). No `dangerouslySetInnerHTML`/`eval`/`innerHTML` in the renderer (grep clean).
4. **No untrusted `loadURL`/`executeJavaScript`.** Every `loadURL` target is `backend.dsh.url` (supervisor-returned loopback) or the app's own `index.html`; `executeJavaScript` is smoke-test-only with static strings (index.ts:97, 205, 216-251, 382-384). Deep links only map to fixed `manage`/`chat` actions (deep-link.ts:15-27, index.ts:85-95) — no open-redirect vector.
5. **DSH child is loopback-only + random port.** `host: '127.0.0.1'`, `port: 0`, `shell: false` (dsh.ts:53-58; supervisor.ts:166-172). Env merge is a controlled `{...process.env, ...options.env}` with `DSH_HOME`/`DSH_CWD` (supervisor.ts:174-176). `--expose-internals` is the documented D-008 requirement.
6. **Navigation lock + external links are strict.** Same-origin-only internal navigation (window.ts:70-77), new windows denied, http/https opened in system browser, all other schemes denied (window.ts:79-82, security.ts:33-39; covered by tests).
7. **Session ops are path-safe.** Session ids validated by `SESSION_NAME_RE` and directory containment checked (`resolveDir`, session-store.ts:77-96); import forbids overwriting an existing record (session-store.ts:115-134).
8. **Supply-chain hygiene.** DSH pinned exactly (`@deepseek-ai/dsh 0.1.0-rc.6`, apps/desktop/package.json:25); CI uses `pnpm install --frozen-lockfile`; the flat runtime overlay installs with `--ignore-scripts --no-audit --no-fund` (release.yml) — no install-time arbitrary scripts; SBOM generated and shipped (release.yml). `asar:false` is documented (D-020) and required by `ELECTRON_RUN_AS_NODE`.

## Findings (ranked)

- **[F1] P1 — IPC handlers have no sender validation, and the preload bridge is reachable from the DSH SPA.**
  - Location: apps/desktop/src/main/ipc.ts:105-397 (every `ipcMain.handle` uses `_event` and never checks `event.senderFrame`/`event.sender`), window.ts:57, index.ts:97/205.
  - Issue: The single hardened window is created once with the preload attached (window.ts:57) and both the app pages and the DSH SPA (`http://127.0.0.1:PORT`) are loaded into that same window (index.ts:97, 205). Preloads run on every page of the window regardless of origin, so `window.closerai` (37 privileged channels) is present inside the DSH SPA. The DSH content CSP deliberately allows `'unsafe-inline' 'unsafe-eval'` (security.ts:22). Therefore any XSS or malicious plugin/skill content in the DSH SPA escalates to the full privileged bridge: `providersSave` (write secrets.bin), `mcpAdd`/`mcpUpdate` (write mcp-servers.json incl. tokens), `exportMcpConfig(destDir)` (write an arbitrary file anywhere user-writable), `setLaunchAtLogin`, `setCapabilities`. This is the single highest-value hardening gap.
  - Recommendation (smallest fix): add a per-handler sender check — reject when `event.senderFrame.url`/`event.sender.getURL()` is not the app's `file://` entry (or a fixed allow-list), i.e. only the app's own pages may invoke the bridge. Long-term: host the DSH UI in its own BrowserWindow/session **without** the preload so DSH content has no bridge at all.
  - Evidence: preload exposes the full API unconditionally (preload/index.cjs:64-82); ipc.ts grep shows zero `event.sender`/`senderFrame` usages; single-window reuse at index.ts:111-113.

- **[F2] P1/P2 — Hash-based script-src is not feasible for the DSH SPA; risk must be contained by sender validation.**
  - Location: security.ts:22, window.ts:60-67, D-009.
  - Feasibility answer: **not feasible without modifying DSH core** (forbidden by AGENTS.md). Nonce would require rewriting DSH's served HTML to inject the nonce attribute — the app only appends a response header and cannot rewrite the body. Hashes would break on every DSH build change since DSH emits inline boot scripts and evaluates at runtime (D-009 "verified via renderer console"). Keep `'unsafe-eval'` for the DSH origin, but the concrete XSS→privilege escalation it enables is exactly what F1 must mitigate. The app's own pages are already hash-grade strict.
  - Recommendation: implement F1; keep DSH-origin permissiveness; re-verify DSH CSP once the runtime ships (it is not vendored locally, so it cannot be re-tested here).
  - Evidence: D-009 text + onHeadersReceived header-only injection.

- **[F3] P2 — Nav-lock origin is captured once and goes stale/null; DSH internal navigation can be misrouted.**
  - Location: window.ts:69 (`const origin = targetOrigin(target)`), window.ts:70-77, index.ts:83/111-113/125.
  - Issue: `origin` is computed at window creation from the _initial_ target. When the window is first created with the `file://` onboarding target (first-run, manage-first, smoke) and the DSH URL is later `loadURL`'d into that same window, `origin === null` permanently. Then every renderer-initiated navigation in the DSH SPA is `preventDefault()`ed and, because `http:` maps to `'open'` (security.ts:35), DSH's own loopback URL gets `shell.openExternal`'d into the system browser. The same stale-origin problem recurs after a DSH restart on a new random port. This is over-restrictive (not a bypass) and depends on whether DSH uses full-page navigation vs. client-side routing (not vendored, so unverifiable here) — but the misrouting behavior is a correctness bug.
  - Recommendation: derive the allowed origin per navigation from the _current_ backend URL (`backendUrl()`/`running.dsh.url`) rather than a captured constant, or recreate the window when the target origin changes.
  - Evidence: index.ts:111-113 reuses the existing window for URL targets; index.ts:83 creates it file-first.

- **[F4] P2 — MCP server credentials are stored in plaintext and returned to the renderer.**
  - Location: apps/desktop/src/main/mcp-store.ts:97-101 (write plaintext JSON), mcp-store.ts:16-25 (sanitizeRecord keeps string values verbatim), ipc.ts:342 (`mcpList` returns full server objects incl. `headers`/`env`).
  - Issue: Unlike `secrets.bin` (safeStorage), `mcp-servers.json` persists user-supplied `headers`/`env` (the app's own test uses `headers: { Authorization: 'Bearer x' }`, mcp-store.test.ts:58-62) in plaintext under userData. `mcpList` returns those `headers`/`env` back to the renderer, so any page with bridge access (see F1) can read MCP tokens. D-011's "key never in files/logs/renderer" guarantee does not extend to MCP credentials.
  - Recommendation: encrypt header/env values with `SecretStore` (or a derived cipher) and redact secret-like values on read; gate reads behind F1's sender check.
  - Evidence: mcp-store.ts write of raw store; test stores a Bearer header.

- **[F5] P2 — Diagnostics sanitizer is not "absolute" for JSON-encoded secrets (D-017).**
  - Location: apps/desktop/src/main/diagnostics.ts:3-15, sanitizeLogLine 17-22.
  - Issue: The key=value rule `(?:api[-_]?key|password|secret|token|apikey)\s*[:=]` requires the key to be immediately followed by optional spaces then `:` or `=`. JSON-formatted secrets (`"password":"hunter2"`, `"token":"ghp_xxx"`) have a quote between the key and the colon, so they are **not** redacted; only values starting with `sk-` (≥8 chars) are caught by rule 1 (diagnostics.ts:5). The D-017 claim that secrets "never leave the main process" is therefore not fully met for non-`sk-` secrets in JSON log lines.
  - Recommendation: extend the regex to quoted keys, e.g. `(["']?(?:api[-_]?key|password|secret|token|apikey)["']?\s*[:=]\s*)[^,"\s}]+`, and add a test.
  - Evidence: grep of REDACTIONS; sanitizer test only covers unquoted forms (diagnostics.test.ts:10-30).

- **[F6] P2 — Auto-update has no code-signature verification.**
  - Location: apps/desktop/src/main/update.ts:1-80, electron-builder.yml (no win signing cert; mac `hardenedRuntime: false`, `gatekeeperAssess: false`).
  - Issue: `electron-updater` with GitHub provider validates the SHA512 in `latest.yml` over HTTPS but performs no code-signature verification on Windows (unsigned NSIS) and skips signature checks on unsigned macOS builds. Trust root is effectively the GitHub account owning `sb1733831438-maker/DSH-closerAI`; a compromised account/repo or TLS compromise could push a malicious auto-update that installs silently.
  - Recommendation: add Windows code-signing and macOS signature verification once certificates are available; until then, document the trust root in SECURITY.md.
  - Evidence: electron-builder.yml publish/nsis/mac settings; update.ts wraps `checkForUpdates`/`quitAndInstall` with no signature handling.

- **[F7] P3 — safeStorage "fails loudly" can be silently downgraded on Linux.**
  - Location: apps/desktop/src/main/safe-storage-cipher.ts:10-13.
  - Issue: The code throws only when `safeStorage.isEncryptionAvailable()` is false. On Linux without a keyring, Electron's safeStorage can report available while using the `basic_text` backend with a hardcoded key — i.e. obfuscation, not real encryption, without raising an error.
  - Recommendation: also reject/warn when `safeStorage.getSelectedStorageBackend?.() === 'basic_text'`.
  - Evidence: cipher throws only on `isEncryptionAvailable() === false`.

- **[F8] P3 — nav-lock exemption is query-permissive; DSH child env + unauthenticated loopback API are residual.**
  - Location: window.ts:21-30 (`isAppIndexNavigation` allows any query), dsh.ts:37-40 (key in child env for process lifetime).
  - Notes: (a) `file://index.html?view=manage&…` is trusted with any query — benign today (manage reads only `view`), but treat any future query-param→DOM sink in the app renderer as a review point; the app index.html strict CSP is the compensating control. (b) The DSH local web API has no app-side token/origin gate; the app relies on loopback binding + random port. DSH's own Origin/CORS/Host validation is upstream and **not vendored locally, so it cannot be verified here** — must be checked against the pinned `@deepseek-ai/dsh@0.1.0-rc.6`. Residual: DNS rebinding from an external browser reaching the DSH API if DSH does not validate Origin/Host; same-user processes on Linux/macOS can read the child env (`/proc/<pid>/environ`). AGENTS.md forbids forking DSH, so mitigations are limited to documentation/upstream verification.
  - Evidence: window.ts:21-30; dsh.ts env injection; supervisor.ts:174-176.

- **[F9] P3 — IPC argument validation is thin (defense-in-depth once F1 lands).**
  - Location: ipc.ts:139 (`modeSet` writes arbitrary `AppConfig`), 260 (`capsSet`), 319 (`launchAtLoginSet`), 344-373 (`mcpAdd`/`mcpUpdate` command/args/url free-form).
  - Issue: not exploitable beyond what the bridge permits (and the bridge is only reachable by app pages + DSH content). Tighten schema validation on these handlers once sender validation is in place.
  - Evidence: handlers accept renderer-supplied objects without type/range checks.

## Residual risks (for the supervisor)

1. **Upstream DSH behavior is unverifiable from this repo** — the DSH runtime is fetched at packaging time (release.yml) and not vendored. Its SPA's eval usage, internal navigation style (full-page vs. SPA routing — impacts F3), and local API Origin/Host/CORS posture must be verified against `@deepseek-ai/dsh@0.1.0-rc.6` (affects F1/F2/F3 and finding #4).
2. **F1 sender validation is not yet implemented** — the DSH SPA currently has the full privileged bridge; treat it as exposed until per-handler `event.senderFrame` checks land.
3. **Auto-update authenticity rests on the GitHub account + HTTPS/SHA512** until code signing is added (F6).
4. **Linux keychain absence downgrades secrets to basic_text** without an error (F7).
5. **`asar:false` + flat npm overlay** means the app ships an unsigned, on-disk JS tree — integrity relies on the installer; no content integrity for installed files (acceptable for a local tool, but note for release hardening).
6. **No test run by this reviewer** — review-only; `pnpm check` and the packaged-runtime smoke should be run by the supervisor to confirm the working tree still passes.

## Security verdict

**OK with notes — no P0; one P1 (IPC sender validation, F1) and five P2s; strong at-rest secrets, CSP split, shell hardening, and loopback isolation, but the preload bridge must not be reachable from the DSH SPA.**

---
