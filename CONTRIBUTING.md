# Contributing to CloserAI

Thank you for your interest in contributing. This file describes the workflow used by this
repository.

## Ground rules

- Every commit keeps `main` buildable and testable.
- Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.
- Never commit secrets, tokens, or API keys. Use `.env.example` placeholders and the OS
  keychain at runtime.
- Do not weaken or delete tests to make them pass.

## Quality gates

```bash
pnpm format:check   # Prettier
pnpm lint           # ESLint (typescript-eslint)
pnpm typecheck      # tsc --noEmit per package
pnpm test           # vitest per package
pnpm build          # compile packages
pnpm sbom:gen       # regenerate sbom.json (CycloneDX)
pnpm coverage       # desktop coverage gate (thresholds in vitest.config.ts)
pnpm commitlint     # lint the last commit message (Conventional Commits)
pnpm smoke          # real Electron e2e smoke (boots DSH, checks the UI)
```

`pnpm check` runs the core gates in order. CI runs the same gates on Linux,
macOS, and Windows, plus a `smoke` job (xvfb) and a `coverage` gate; the
release workflow fails unless the packaged app passes `--smoke-test`.

## Commit conventions

```
feat(scope): summary
fix(scope): summary
test(scope): summary
docs(scope): summary
build(scope): summary
chore(scope): summary
security(scope): summary
ci(scope): summary
```

Commit messages are linted in CI with commitlint (`commitlint.config.mjs`);
rules for scope and subject casing are relaxed for this repo's style, but a
valid type and the `type: subject` shape are required.

The body explains **why**. Significant commits append metadata:

```
Milestone: v0.0.x
Constraint: <current constraint>
Rejected: <rejected approach> | <reason>
Confidence: high|medium|low
Scope-risk: narrow|moderate|broad
Not-tested: <untested items or none>
```

## Branches

- `main` — always releasable.
- `release/v0.0.x-<short-name>` — one branch per minor version.

## License

By contributing, you agree that your contributions will be licensed under the MIT License
found in [LICENSE](LICENSE).
