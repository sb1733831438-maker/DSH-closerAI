# Troubleshooting (CloserAI)

Common issues and how to resolve them. Each entry explains the symptom, the
most likely cause, and the fix. If your problem is not listed, export the
diagnostics from the management page (管理页 → 诊断与日志 → 导出) and attach
them to a GitHub issue.

## The window opens but stays on a blank/loading screen

- **Cause:** the DSH child process failed to become ready (bad profile install,
  port conflict, or a missing plugin).
- **Check:** open 管理页 → 诊断与日志. Look for `dsh: plugin tree failed to load`
  or `Cannot find package '@deepseek-ai/...'`.
- **Fix:** in a terminal run `dsh plugin --profile web update` (or reinstall the
  app). Then restart CloserAI.

## I entered my API key but get an invalid-key / 401 error

- **Cause:** the key is stale, mistyped, or scoped to a different provider.
- **Check:** 管理页 → 提供者 → 连接测试. The exact HTTP error is shown.
- **Fix:** replace the key in the provider settings. Keys are stored in the OS
  keychain, never on disk.

## CloserAI is offline and nothing loads

- **Cause:** no network, or the DSH loopback server cannot bind (rare).
- **Check:** 管理页 → 诊断与日志 → 状态. If the supervisor shows `failed`,
  restart the app.
- **Fix:** connect to the network and restart. Offline mode is not supported for
  cloud models; the mock provider works fully offline.

## My session list is empty after an upgrade

- **Cause:** sessions live under `%APPDATA%/@closerai/dsh-home/sessions`. A
  changed `DSH_HOME` or a manual move of that folder would hide them.
- **Fix:** restore the folder (or use 管理页 → 会话 → 导入 on an export you made
  earlier).

## The packaged app on Windows shows an installer/SmartScreen warning

- **Cause:** the installer is not code-signed yet.
- **Check:** verify the SHA-256 in `SHA256SUMS.txt` against the downloaded file.
- **Fix:** click "More info → Run anyway". Signing is on the roadmap; until then
  the checksum is the trust anchor.

## I can't install the app / setup fails

- **Cause:** antivirus quarantined a file, or an older CloserAI is still
  running.
- **Check:** close CloserAI from the tray, then retry the installer as
  Administrator.
- **Fix:** uninstall the old version first if the installer insists on it.

## Where is my data stored?

- App config: `%APPDATA%/@closerai` (Windows) / `~/.config/@closerai` (Linux)
  / `~/Library/Application Support/@closerai` (macOS).
- Sessions: `%APPDATA%/@closerai/dsh-home/sessions`.
- Secrets: OS keychain (not in these folders).
