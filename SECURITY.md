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

- `ADMIN_KEY` protects every admin route. The API accepts it only in the `x-admin-key`
  header and compares it in constant time. Keep it long and random, and never share a
  screen that shows it.
- Students are anonymous by design. The app stores a random device id (`rid` cookie),
  votes, questions and quiz answers in Redis, and nothing else about people. This
  audience data expires 30 days after the last write by default (`DATA_TTL_DAYS`).
