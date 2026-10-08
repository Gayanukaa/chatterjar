<p align="center">
  <img src="docs/assets/banner.png" alt="Chatterjar: every voice in the room, in one jar. Live polls, a question wall and quizzes for talks, classes and conferences." width="820" />
</p>

<p align="center">
  <a href="https://the-room-app-two.vercel.app"><strong>Live demo</strong></a> &middot;
  <a href="#quickstart"><strong>Quickstart</strong></a> &middot;
  <a href="#run-a-session"><strong>Run a session</strong></a> &middot;
  <a href="#architecture"><strong>Architecture</strong></a> &middot;
  <a href="#development"><strong>Development</strong></a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/Next.js-16-18202F?logo=nextdotjs&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/Upstash-Redis-147A58?logo=redis&logoColor=white" alt="Upstash Redis" />
  <img src="https://img.shields.io/badge/deploy-Vercel-000?logo=vercel&logoColor=white" alt="Deployed on Vercel" />
  <img src="https://img.shields.io/badge/acceptance%20checks-7%2F7-2D58D2" alt="7 of 7 acceptance checks pass" />
</p>

<br/>

# Chatterjar is the live audience app for talks, classes and conferences.

Open a link on the projector, show a QR code, and the whole room is in. People vote in polls, ask and upvote questions, and take a short quiz from their phones. You run everything from one admin page, and the results animate live on the big screen.

**No app to install. No sign-up. Nobody's name, email or phone number is collected.**

|        | Step              | What happens                                                                                |
| ------ | ----------------- | ------------------------------------------------------------------------------------------- |
| **01** | Share the QR code | People scan it and land on the phone page. Each phone gets an anonymous device id.          |
| **02** | Run the room      | Open a poll, watch questions arrive, see the quiz tally grow. Everything updates every 3 s. |
| **03** | Reveal together   | Press Reveal. The projector animates the results and shows the correct answer.              |

<br/>

<div align="center">
<table>
  <tr>
    <td align="center"><img src="docs/assets/phone-vote.png" width="220" alt="Phone: vote on a poll" /><br/><sub><b>Vote</b>: one vote per device</sub></td>
    <td align="center"><img src="docs/assets/phone-questions.png" width="220" alt="Phone: question wall" /><br/><sub><b>Questions</b>: ask and upvote</sub></td>
    <td align="center"><img src="docs/assets/phone-quiz.png" width="220" alt="Phone: persona quiz" /><br/><sub><b>Quiz</b>: find your persona</sub></td>
  </tr>
</table>
</div>

<p align="center">
  <img src="docs/assets/screen.png" width="820" alt="Projector view with revealed poll results, top questions and the quiz tally" /><br/>
  <sub><b>Projector view</b> (<code>/screen</code>): animated results after reveal, the top questions and the quiz tally.</sub>
</p>

<br/>

## Chatterjar is right for you if

- You give **talks, workshops, classes or conference sessions** and want the room to take part.
- You want **live polls** with a dramatic reveal, not a results chart everyone sees too early.
- You want an **anonymous question wall** where the best questions rise to the top.
- You want something people can join in **5 seconds from a QR code**, with nothing to install.
- You want to **own the app**: one Next.js repo, one Redis database, deployed on your own Vercel account.

<br/>

## Features

<table>
<tr>
<td width="33%" valign="top">
<h3>Live polls</h3>
Two to four options, with optional images, code, text or audio per option. One vote per device. Results and the correct answer stay hidden until you press Reveal.
</td>
<td width="33%" valign="top">
<h3>Question wall</h3>
Questions of up to 200 characters, sorted by upvotes and then by time, so new ones always show. One upvote per question per device. Rate limited to 3 new questions per minute.
</td>
<td width="33%" valign="top">
<h3>Persona quiz</h3>
Five questions map each person to a persona. The room tally grows live on the projector. Each device counts once and keeps its result after a reload.
</td>
</tr>
<tr>
<td valign="top">
<h3>Projector view</h3>
A 1600 x 900 layout with large type: the active poll, the top five questions and the quiz tally. Bars and new questions animate in.
</td>
<td valign="top">
<h3>Admin console</h3>
Create polls, load presets, open, close and reveal, hide questions, withdraw the poll, or reset the whole room. Answers stay hidden on the admin page too, so it is safe to share your screen.
</td>
<td valign="top">
<h3>Built for a full room</h3>
Phones poll every 3 seconds with plain fetch. Each state read takes at most two Redis round trips and is cached for 1 s, so about 90 phones stay well inside the Upstash budget.
</td>
</tr>
</table>

<br/>

## Quickstart

You need Node.js 24, a [Vercel](https://vercel.com) account and the Vercel CLI (`npm i -g vercel`).

```bash
git clone https://github.com/Gayanukaa/the-room-app.git chatterjar
cd chatterjar
npm install

# Create the Vercel project and add Upstash Redis from the Vercel Marketplace
vercel link
vercel integration add upstash/upstash-kv

# Admin key: a long random string, stored only in Vercel
openssl rand -hex 24 | vercel env add ADMIN_KEY production
vercel env pull .env.local

npm run dev
```

Open http://localhost:3000 for the phone page, `/screen` for the projector and `/admin?key=<ADMIN_KEY>` for the admin console.

**Deploy:** connect the GitHub repo to the Vercel project. Every merge to `main` deploys production, and every pull request gets a preview. You can also run `vercel --prod`.

<details>
<summary><b>Environment variables</b></summary>

| Variable                               | Set by              | Purpose                                                                                               |
| -------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash integration | Redis REST connection (the app falls back to `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`) |
| `ADMIN_KEY`                            | You                 | Unlocks `/admin` and the admin API                                                                    |
| `REDIS_PREFIX`                         | Optional            | Prefixes every Redis key, so tests and demos never touch live data                                    |

</details>

<br/>

## Run a session

1. Open `/admin?key=<ADMIN_KEY>` on your laptop. The page removes the key from the address bar after the first load.
2. Click **Load preset polls**, or create your own poll.
3. Put `/screen` on the projector. It shows the join address in the corner; add a QR code for it to your slides.
4. Click **Open** on a poll. Phones show the options and people vote.
5. Click **Reveal**. The projector animates the results and shows the correct answer.
6. Use **Hide** on any question you do not want on the wall.
7. After a rehearsal, click **Reset room** to clear all votes, questions and quiz answers. Your polls stay.

<p align="center">
  <img src="docs/assets/admin.png" width="820" alt="Admin console with the poll list, room controls, poll form, questions and quiz tally" /><br/>
  <sub><b>Admin console</b> (<code>/admin</code>): answers stay hidden until you reveal, so you can share this screen.</sub>
</p>

<br/>

## Architecture

<p align="center">
  <img src="docs/architecture.png" alt="Chatterjar architecture: phones and projector, Next.js pages, API routes, rules core, Upstash Redis, static content, build and deploy" width="900" />
</p>

- **Next.js 16 App Router** on Vercel: a phone page (`/`), a projector view (`/screen`) and an admin console (`/admin`).
- **API routes** under `app/api/`, all with `Cache-Control: no-store`. Admin routes require `ADMIN_KEY`.
- **Upstash Redis** is the only database. Polls, votes, questions and the quiz tally live in a small set of keys.
- **No WebSockets.** Clients fetch `/api/state` every 3 seconds, which keeps the app simple and serverless-friendly.
- An anonymous **`rid` cookie** (random UUID, 1 year) is set in `proxy.ts`, so each device votes once.

The diagram source is [`docs/architecture.drawio`](docs/architecture.drawio).

<br/>

## Development

| Command             | What it does                                                               |
| ------------------- | -------------------------------------------------------------------------- |
| `npm run dev`       | Start the dev server on port 3000                                          |
| `npm run build`     | Production build                                                           |
| `npm run lint`      | ESLint                                                                     |
| `npm run test:unit` | Vitest unit tests, plus a house-style test for comments and punctuation    |
| `npm run test:e2e`  | Seven Playwright acceptance checks with two browser contexts (two devices) |

The acceptance checks run against a local dev server with `REDIS_PREFIX=e2e:`. They cover voting once per device, the reveal on phones and the projector, hiding a question, the question rate limit, the quiz tally, the layout at 360 px, and the withdraw and reset controls.

```
app/            pages (/, /screen, /admin) and API routes
components/     student, screen and admin UI
lib/            domain rules, Redis client, state reader
data/           quiz questions and Spot-the-AI rounds
public/spot/    Spot-the-AI media
tests/          unit and end-to-end tests
docs/           architecture diagram and README assets
```

<br/>

## Content and licence

The code is MIT licensed (see [`LICENSE`](LICENSE)). The MIT licence does not cover the Spot-the-AI files in `public/spot/assets` and `data/rounds.json`. Use them for non-commercial teaching only, with the credits in [`SOURCES.md`](SOURCES.md).
