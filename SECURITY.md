# Security policy

## Reporting a vulnerability

Do not open a public issue for security problems.

Use GitHub private vulnerability reporting: open the **Security** tab of this repository
and select **Report a vulnerability**. Include the steps to reproduce and the impact.
You can expect a first reply within 7 days.

Only the latest version on `main` gets security fixes.

## Scope notes

- `ADMIN_KEY` protects the main room's admin routes. The API accepts it only in the
  `x-admin-key` header and compares it in constant time. The admin page reads the key from
  `#key=` (never sent to the server) and removes it from the address bar.
- `SUPER_ADMIN_KEY` is the owner key. It creates and deletes rooms and opens every room's
  admin page. Each room's admin token is shown once and stored only as a SHA-256 hash.
- No page can be shown in a frame (`X-Frame-Options: DENY`, `frame-ancestors 'none'`).
- Each device can post 3 questions per minute and send 10 reactions per 10 seconds.
  Questions with strong language or a link go to the host's review queue. CSV exports
  escape cells that spreadsheets could run as formulas.
- Students are anonymous. The app stores a random device id (`rid` cookie) and, per
  device, votes, questions, upvotes, quiz answers and reaction counts. This data expires
  30 days after the last write by default (`DATA_TTL_DAYS`).
