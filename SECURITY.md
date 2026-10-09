# Security policy

## Reporting a vulnerability

Please do not open a public issue for security problems.

Use GitHub private vulnerability reporting: open the **Security** tab of this repository
and select **Report a vulnerability**. Include the steps to reproduce and the impact.

You can expect a first reply within 7 days. We will tell you when a fix is released and
credit you if you want.

## Supported versions

Only the latest release on `main` gets security fixes.

## Scope notes

- `ADMIN_KEY` protects the main room's admin routes. The API accepts it only in the
  `x-admin-key` header and compares it in constant time. The admin page reads a key from
  `#key=` (preferred, never sent to the server) or `?key=`, keeps it in sessionStorage
  for that tab and removes it from the address bar. Keep it long and random, and never
  share a screen that shows it.
- `SUPER_ADMIN_KEY` is the owner key. It creates and deletes rooms and opens every room's
  admin page. Each room's admin token is shown once and stored only as a SHA-256 hash.
  When `SUPER_ADMIN_KEY` is not set, the rooms API is off.
- Only `/embed` and `/r/<code>/embed` may be shown in a frame on other sites
  (`frame-ancestors *`). They show only public room data and set no cookie. Every other
  page sends `X-Frame-Options: DENY` and `frame-ancestors 'none'`.
- Each device can post 3 questions per minute and send 10 reactions per 10 seconds. A
  short word list and a link check send matching questions to the host's review queue;
  it is a filter, not a full moderation system. CSV exports prefix cells that start with
  `=`, `+`, `-` or `@` so spreadsheets do not run them as formulas.
- Students are anonymous by design. The app stores a random device id (`rid` cookie:
  httpOnly, SameSite=Lax, 1 year, Secure over HTTPS) and, per device, votes, questions,
  upvotes, quiz answers and reaction counts. It stores nothing else about people. This
  audience data expires 30 days after the last write by default (`DATA_TTL_DAYS`). Polls
  and room records are kept until you delete them.
