/**
 * Commit message linting (Conventional Commits, tuned to this repo's style).
 * The project's conventions (docs/CONTRIBUTING.md) allow a small extra type
 * set (`security`, `release`), long headers, and flexible scopes (e.g.
 * `fix(mcp)+fix(preload): ...` is used for multi-package fixes), so those
 * rules are relaxed while the core shape (type: subject) stays enforced.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'security',
        'release',
      ],
    ],
    'header-max-length': [2, 'always', 120],
    'scope-enum': [0],
    'scope-case': [0],
    'subject-case': [0],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
}
