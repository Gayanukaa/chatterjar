# the-room-app

A live classroom app for about 90 students. Students open it on their phones from a QR code.
They vote in polls, post and upvote questions, and take a short persona quiz. A projector view
shows the results, and the lecturer runs the room from an admin page.

![Room app architecture](docs/architecture.png)

## Stack
Next.js 16 (App Router, TypeScript) on Vercel, with shared state in Upstash Redis.
Clients refresh every 3 seconds with fetch. Students are anonymous.

## Content and licence
The code is MIT licensed (see `LICENSE`). The MIT licence does not cover the Spot-the-AI
files in `public/spot/assets` and `data/rounds.json`. Use them for non-commercial teaching
only, with the credits in `SOURCES.md`.
