# Contributing to Chatterjar

Thanks for helping. This guide covers setup, house rules and how to open a pull request.

## Setup

1. Fork and clone the repo. You need Node.js 24 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in a Redis REST URL and token. Options:
   - a free [Upstash](https://upstash.com) database, or
   - local Redis plus [serverless-redis-http](https://github.com/hiett/serverless-redis-http)
     (see the CI workflow for a working setup).
4. Run `npm run dev` and open http://localhost:3000.

## Checks

Run these before you open a pull request. CI runs them too.

| Command             | What it checks                                            |
| ------------------- | --------------------------------------------------------- |
| `npm run lint`      | ESLint                                                    |
| `npm run build`     | Production build and types                                |
| `npm run test:unit` | Unit tests and the house-style test                       |
| `npm run test:e2e`  | Acceptance checks with two browser contexts (needs Redis) |

## House rules

The style test (`tests/unit/style.test.ts`) enforces the first three rules.

- Never use the em dash character (U+2014) anywhere. Use a hyphen.
- Comments explain facts or the reason for a decision, not what the code does.
  Single-line comments are 80 characters or less.
- Docstrings and JSDoc blocks are at most two lines.
- Keep it simple: prefer the platform and the standard library over new dependencies.
- UI: tap targets at least 48 px, works at 360 px width, icons from lucide-react,
  sentence case.
- Students stay anonymous. Never collect names, emails or phone numbers.
- Answers stay on the server until a poll is revealed.

## Pull requests

- Branch from `main` as `type/short-name` (for example `feat/word-cloud`).
- Commit subjects follow Conventional Commits: `feat: add word cloud poll`.
  Lowercase, imperative, 50 characters or less.
- Keep the PR description to one or two sentences: what changed and why.
- One logical change per PR. Add or update tests for behavior changes.

## Reporting bugs and ideas

Open an issue with the bug report or feature request template. For security problems,
see [SECURITY.md](SECURITY.md) and do not open a public issue.
