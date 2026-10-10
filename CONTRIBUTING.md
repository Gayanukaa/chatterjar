# Contributing to Chatterjar

## Setup

1. Clone the repo. You need Node.js 24.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and add a Redis REST URL and token and an
   `ADMIN_KEY`. If you use Vercel, run `vercel env pull .env.local` instead.
4. Run `npm run dev` and open http://localhost:3000.
5. Run `npm run test:unit`.
6. Run `npm run test:e2e`. These checks need Redis.

## House rules

`tests/unit/style.test.ts` enforces these rules.

- Never use em dashes anywhere. Use a hyphen.
- Single-line comments are 80 characters or less and only give reasons.
- Docstrings are at most two lines.
