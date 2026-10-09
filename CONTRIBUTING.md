# Contributing to Chatterjar

Thanks for helping. This guide covers setup, house rules and how to open a pull request.

## Setup

1. Fork and clone the repo. You need Node.js 24.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`. Fill in a Redis REST URL and token, and set
   `ADMIN_KEY` to any string for local use (set `SUPER_ADMIN_KEY` too if you want to try
   rooms). Redis options:
   - a free [Upstash](https://upstash.com) database, or
   - local Redis plus [serverless-redis-http](https://github.com/hiett/serverless-redis-http)
     (see the CI workflow or `docker-compose.yml` for a working setup).
4. Run `npm run dev`, open http://localhost:3000 for the phone page and
   `/admin#key=<ADMIN_KEY>` for the admin console.

## Checks

Run these before you open a pull request. CI runs them too, plus a Docker self-host
smoke test (`docker compose up`).

| Command             | What it checks                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `npm run lint`      | ESLint                                                                                             |
| `npm run build`     | Production build and types                                                                         |
| `npm run test:unit` | Unit tests and the house-style test                                                                |
| `npm run test:e2e`  | 14 acceptance checks with two browser contexts (needs Redis and `npx playwright install chromium`) |
| `npm run format`    | Prettier                                                                                           |

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
- API routes send `Cache-Control: no-store`, except `GET /api/room`, which is cached on
  the CDN for 1 s and must never set cookies.
- Admin keys travel only in the `x-admin-key` header. Only `/embed` pages may be framed.

## Translations

All interface text lives in `lib/i18n/messages/en.ts`. Quiz questions (`data/quiz.json`)
and content packs (`data/packs/`) are content, not part of the catalog. API error
messages are in the catalog, but the server always sends them in English.

To add a language:

1. Copy `lib/i18n/messages/en.ts` to `lib/i18n/messages/<code>.ts` (for example `si.ts`)
   and type it: `import type { Messages } from "../index";` then
   `export const si: Messages = { ... }`.
2. Translate every value. Keep `{name}` placeholders as they are. Plural groups
   (`one`, `other`) may add the forms your language needs (`zero`, `two`, `few`, `many`).
3. Register it in the `catalogs` object in `lib/i18n/index.ts`.
4. Run `npm run test:unit`. The catalog test fails on a missing or extra key, and so
   does the type check in `npm run build`.

A supported `?lang=<code>` wins. Otherwise the page uses the first supported browser
language, then English. Pages render in English on the server and switch in the browser.

## Pull requests

- Branch from `main` as `type/short-name` (for example `feat/poll-timer`).
- Commit subjects follow Conventional Commits: `feat: add timer to polls`.
  Lowercase, imperative, 50 characters or less.
- Keep the PR description to one or two sentences: what changed and why.
- One logical change per PR. Add or update tests for behavior changes.

## Reporting bugs and ideas

Open an issue with the bug report or feature request template. For security problems,
see [SECURITY.md](SECURITY.md) and do not open a public issue.
