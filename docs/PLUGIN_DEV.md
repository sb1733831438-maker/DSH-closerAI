# CloserAI Plugin & Preset Development

CloserAI does **not fork or modify** the DeepSeek Harness (DSH) core. The
extension surface is the DSH agent-preset system plus the app-owned preset
files under `apps/desktop/presets/`. This doc explains how a contributor
extends a mode's capability surface safely.

## Where the presets live

- Source of truth: `apps/desktop/presets/<mode>/{agent.cordis.yml,preset.yml}`
  for `chat`, `work`, and `code`.
- Installed to `$DSH_HOME/.agent-presets/<mode>/` when a profile starts.
- `preset.yml` is the DSH agent preset (name, description, order).
- `agent.cordis.yml` is the cordis plugin-row file for the agent.

## Capability toggles render presets at install time

`apps/desktop/src/main/capabilities.ts` renders the preset files with a
line-based, block-scoped transform keyed on top-level `- id:` entries
(e.g. `tool-web`, `tool-fetch`, `tool-skill`). A toggle set to **off**
comments out that block before the preset is installed, so the running DSH
agent simply does not expose the tool.

Why text transform and not a YAML AST edit: the checked-in presets use YAML
tags such as `!!js` that plain js-yaml cannot parse.

## Adding a tool to a mode

1. Add the plugin row to the mode's `agent.cordis.yml` with a stable `id`.
2. If it should be user-toggleable, add a capability entry to the capability
   manifest (management page) and to the renderer transform.
3. Update the permission manifest in `permissions.ts` to reflect the new
   capability surface honestly.
4. Add or extend unit tests (`capabilities.test.ts`, `permissions.test.ts`).
5. `pnpm check` must stay green; run `pnpm smoke` to verify the mode still
   boots in the packaged app.

## Safety rules

- Never edit DSH core; presets/plugins are the only extension surface.
- Toggles must never weaken a mode's isolation (e.g. Work stays shell-less).
- Secrets stay in the OS keychain; preset files must not embed credentials.
- Every preset change ships with a regression test.

## Runtime packaging note

The packaged app's `node_modules` is overlaid at build time with a flat npm
install of the DSH runtime (see `scripts/copy-runtime-node-modules.js`), so a
new DSH plugin added to the runtime must be present in that install to work
in the installer.
