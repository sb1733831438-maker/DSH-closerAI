# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-08-24

### System DSH sync

- The desktop app now boots your **own DSH** when a system DSH home
  (`~/.dsh`) exists: conversations, profiles, plugins and settings are shared
  with your web DSH — the desktop looks and behaves exactly like the web.
- CloserAI never overwrites the system home's `settings.yaml` or presets in
  sync mode.
- `CLOSERAI_DSH_HOME` / `CLOSERAI_DSH_MODE` environment variables let you
  pin an explicit home or force managed/sync mode; without a system home the
  app falls back to an isolated managed home (onboarding + mock as before).
- Smoke test forces a fresh managed temp home, so CI stays deterministic.

### Verified

- `pnpm check` green (125 tests: 17 + 11 + 97); smoke exit 0 (managed path).
- System-sync boot loads the user's web-profile plugins (verified up to the
  task-board single-owner lock, which only blocks a SECOND DSH on the same
  home — see TROUBLESHOOTING: don't run web + desktop DSH concurrently).

## [0.1.0] - 2026-08-18