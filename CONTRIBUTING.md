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
```

`pnpm check` runs all of them in order. CI runs the same gates on Linux, macOS, and Windows.

## Commit conventions

```
feat(scope): summary
fix(scope): summary
test(scope): summary
docs(scope): summary
build(scope): summary
chore(scope): summary
```

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
