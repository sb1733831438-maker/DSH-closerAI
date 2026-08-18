# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.8] - 2026-08-18

### Added

- First official Windows installer: `CloserAI-0.0.8-Setup-x64.exe` built by a
  Windows CI runner (electron-builder, no wine), shipped with a SHA-256 checksum.
- Packaged runtime fix: the app node_modules is overlaid with a flat npm install of
  the DSH runtime (afterPack hook), so the packaged app resolves every DSH plugin
  (cordis, dsh-timeout, dsh-fs, ...) that electron-builder's collector drops.
- Release workflow: dispatchable and tag-triggered; builds the installer, verifies
  the packaged DSH tree, computes SHA-256, and attaches both to the GitHub Release.

### Verified

- Fresh install to a clean directory, then the packaged app smoke passes end-to-end:
  onboarding → DeepSeek Harness UI mounts → management page renders real content
  (exit 0).

## [0.0.7] - 2026-08-18

### Added

- System tray with quick actions (返回对话 / 工作区与历史 / 开机启动 / 退出); closing the