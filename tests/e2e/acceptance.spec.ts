import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Locator,
  type Page,
} from "@playwright/test";

// A BASE_URL run targets a deployed app, which uses its real admin key.
const ADMIN_KEY = process.env.BASE_URL
  ? (process.env.ADMIN_KEY ?? "")
  : (process.env.E2E_ADMIN_KEY ?? "e2e-key");
// Every question this suite posts starts with this tag, so cleanup finds it.
const TAG = "E2E";
// 3 s client poll + 1 s server cache + render, with headroom.
const SYNC = 10_000;

interface State {
  poll: { id: string; total: number; correct?: string } | null;
  questions: { id: string; text: string }[];
  tally: Record<string, number>;
}

const opened: BrowserContext[] = [];

/** Sends an admin POST with the x-admin-key header and expects a 2xx reply. */
async function admin(request: APIRequestContext, path: string, data: object) {
  expect(ADMIN_KEY, "Set ADMIN_KEY for a BASE_URL run").not.toBe("");
  let res;
  try {
    res = await request.post(path, {
      data,
      headers: { "x-admin-key": ADMIN_KEY },
    });
  } catch (err) {
    // Playwright call logs list request headers; keep the key out of output.
    throw new Error(String(err).replaceAll(ADMIN_KEY, "[admin key]"));
  }
  expect(res.ok(), `${path}: ${res.status()} ${await res.text()}`).toBe(true);
  return res.json();
}

/** Creates a two-option poll with B as the correct answer and opens it. */
async function openPoll(request: APIRequestContext): Promise<string> {
  const { poll } = await admin(request, "/api/admin/poll", {
    question: `${TAG} poll ${Date.now()}`,
    options: [{ label: "Left" }, { label: "Right" }],
    correct: "B",
  });
  await admin(request, "/api/admin/status", { id: poll.id, status: "open" });
  return poll.id;
}

async function getState(request: APIRequestContext): Promise<State> {
  const res = await request.get("/api/state");
  expect(res.ok(), `/api/state: ${res.status()}`).toBe(true);
  return res.json();
}

/** Total votes of the given poll, or -1 when another poll is active. */
async function pollTotal(request: APIRequestContext, pollId: string) {
  const { poll } = await getState(request);
  return poll?.id === pollId ? poll.total : -1;
}

async function tallyTotal(request: APIRequestContext) {
  const { tally } = await getState(request);
  return Object.values(tally).reduce((sum, n) => sum + Number(n), 0);
}

/** Hides questions from earlier runs, so new ones still make the top 30. */
async function hideTestQuestions(request: APIRequestContext) {
  for (let round = 0; round < 5; round++) {
    const { questions } = await getState(request);
    const ours = questions.filter((q) => q.text.startsWith(`${TAG} `));
    if (!ours.length) return;
    for (const q of ours) await admin(request, "/api/admin/hide", { id: q.id });
  }
}

/** One device: a fresh browser context (own rid cookie) with a page on path. */
async function device(
  browser: Browser,
  path = "/",
  options: BrowserContextOptions = {},
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    ...options,
  });
  opened.push(context);
  const page = await context.newPage();
  await page.goto(path);
  return { context, page };
}

async function openTab(page: Page, name: "Vote" | "Questions" | "Quiz") {
  await page.getByRole("tab", { name }).click();
}

/** True when the page offers no usable vote button. */
async function voteLocked(page: Page) {
  for (const name of ["Vote A", "Vote B"]) {
    const button = page.getByRole("button", { name });
    if ((await button.count()) && (await button.first().isEnabled())) {
      return false;
    }
  }
  return true;
}

/** Checks the first radio of a fieldset; clicks its label if styling covers it. */
async function pickFirst(fieldset: Locator) {
  const radio = fieldset.getByRole("radio").first();
  try {
    await radio.check({ timeout: 3_000 });
  } catch {
    await fieldset.locator("label").first().click();
  }
  await expect(radio).toBeChecked();
}

test.beforeAll(async ({ request }) => {
  await hideTestQuestions(request);
});

test.afterAll(async ({ request }) => {
  await hideTestQuestions(request);
});

test.afterEach(async () => {
  await Promise.all(opened.splice(0).map((c) => c.close()));
});

test("1. second vote from one device is rejected, another device counts", async ({
  browser,
  request,
}) => {
  const pollId = await openPoll(request);

  const one = await device(browser);
  await openTab(one.page, "Vote");
  const voteA = one.page.getByRole("button", { name: "Vote A" });
  await expect(voteA).toBeVisible({ timeout: SYNC });
  await voteA.click();
  await expect(one.page.getByText("You voted A")).toBeVisible();
  await expect.poll(() => voteLocked(one.page)).toBe(true);

  const again = await one.page.request.post("/api/vote", {
    data: { pollId, option: "B" },
  });
  expect(again.status()).toBe(409);
  expect((await again.json()).error).toBe("You already voted in this poll.");

  const two = await device(browser);
  // -1 means another poll is active; wait out the 1 s state cache.
  await expect
    .poll(() => pollTotal(two.page.request, pollId), { timeout: SYNC })
    .toBeGreaterThanOrEqual(1);
  const before = await pollTotal(two.page.request, pollId);
  await openTab(two.page, "Vote");
  const voteB = two.page.getByRole("button", { name: "Vote B" });
  await expect(voteB).toBeVisible({ timeout: SYNC });
  await voteB.click();
  await expect(two.page.getByText("You voted B")).toBeVisible();
  await expect
    .poll(() => pollTotal(two.page.request, pollId), { timeout: SYNC })
    .toBe(before + 1);
});

test("2. revealed poll shows bars and the correct option on / and /screen", async ({
  browser,
  request,
}) => {
  const pollId = await openPoll(request);
  const phone = await device(browser);
  // One vote first, so the result bars have data.
  const vote = await phone.page.request.post("/api/vote", {
    data: { pollId, option: "A" },
  });
  expect(vote.ok(), `vote: ${vote.status()}`).toBe(true);
  // The answer must stay server-side until the reveal.
  await expect
    .poll(async () => (await getState(request)).poll?.id, { timeout: SYNC })
    .toBe(pollId);
  expect((await getState(request)).poll?.correct).toBeUndefined();

  const screen = await device(browser, "/screen");
  await expect(screen.page.getByTestId("screen-poll")).toBeVisible({
    timeout: SYNC,
  });

  await admin(request, "/api/admin/status", { id: pollId, status: "revealed" });

  await openTab(phone.page, "Vote");
  await expect(phone.page.getByTestId("poll-results")).toBeVisible({
    timeout: SYNC,
  });
  await expect(phone.page.getByText("Correct answer: B").first()).toBeVisible();

  await expect(screen.page.getByTestId("screen-results")).toBeVisible({
    timeout: SYNC,
  });
  await expect(
    screen.page.getByText("Correct answer: B").first(),
  ).toBeVisible();
});

test("3. hidden question disappears from both devices", async ({
  browser,
  request,
}) => {
  const text = `${TAG} question ${Date.now()}`;
  const one = await device(browser);
  const two = await device(browser);
  const screen = await two.context.newPage();
  await screen.goto("/screen");
  await openTab(one.page, "Questions");
  await openTab(two.page, "Questions");

  await one.page.getByLabel("Your question").fill(text);
  await one.page.getByRole("button", { name: "Send question" }).click();

  const views = [
    one.page.getByTestId("question").filter({ hasText: text }),
    two.page.getByTestId("question").filter({ hasText: text }),
    screen.getByTestId("screen-question").filter({ hasText: text }),
  ];
  for (const view of views) await expect(view).toBeVisible({ timeout: SYNC });

  const posted = (await getState(request)).questions.find(
    (q) => q.text === text,
  );
  expect(posted, "posted question in /api/state").toBeTruthy();
  const start = Date.now();
  await admin(request, "/api/admin/hide", { id: posted!.id });

  for (const view of views)
    await expect(view).toHaveCount(0, { timeout: SYNC });
  // The target is 3 s; the report shows the measured time for review.
  test.info().annotations.push({
    type: "hide-latency-ms",
    description: String(Date.now() - start),
  });
});

test("4. fourth question in one minute is rejected with a clear message", async ({
  browser,
}) => {
  const { page } = await device(browser);
  await openTab(page, "Questions");
  const box = page.getByLabel("Your question");
  const send = page.getByRole("button", { name: "Send question" });
  const isPost = (r: { url(): string; request(): { method(): string } }) =>
    new URL(r.url()).pathname === "/api/question" &&
    r.request().method() === "POST";

  for (let i = 1; i <= 3; i++) {
    await box.fill(`${TAG} rate ${Date.now()} #${i}`);
    const reply = page.waitForResponse(isPost);
    await send.click();
    expect((await reply).status(), `question ${i}`).toBe(201);
  }

  await box.fill(`${TAG} rate ${Date.now()} #4`);
  await send.click();
  await expect(
    page.getByRole("alert").filter({ hasText: "3 questions per minute" }),
  ).toBeVisible();

  // The server must enforce the limit too, not only the UI.
  const direct = await page.request.post("/api/question", {
    data: { text: `${TAG} rate ${Date.now()} #5` },
  });
  expect(direct.status()).toBe(429);
  expect((await direct.json()).error).toBe(
    "You can post 3 questions per minute. Try again soon.",
  );
});

test("5. quiz shows a persona and the tally rises by one", async ({
  browser,
}) => {
  const { page } = await device(browser);
  const before = await tallyTotal(page.request);

  await openTab(page, "Quiz");
  const sets = page.locator("fieldset").filter({ visible: true });
  await expect(sets).toHaveCount(5, { timeout: SYNC });
  for (let i = 0; i < 5; i++) await pickFirst(sets.nth(i));
  await page.getByRole("button", { name: "See my persona" }).click();

  await expect(page.getByTestId("quiz-result")).toContainText("You are a");
  await expect(page.getByTestId("quiz-tally")).toBeVisible();
  await expect
    .poll(() => tallyTotal(page.request), { timeout: SYNC })
    .toBe(before + 1);
});

test("6. at 360 px nothing overflows and buttons are 48 px or taller", async ({
  browser,
  request,
}) => {
  await openPoll(request);
  const { page } = await device(browser, "/", {
    viewport: { width: 360, height: 800 },
  });
  // A long question with a link checks wrapping and shows upvote buttons.
  const posted = await page.request.post("/api/question", {
    data: {
      text: `${TAG} layout ${Date.now()} see https://example.com/${"a".repeat(60)}`,
    },
  });
  expect(posted.status(), "layout question").toBe(201);

  const tabs = [
    ["Vote", page.getByRole("button", { name: "Vote A" })],
    ["Questions", page.getByTestId("question").first()],
    ["Quiz", page.getByRole("button", { name: "See my persona" })],
  ] as const;

  for (const [tab, ready] of tabs) {
    await openTab(page, tab);
    await expect(ready).toBeVisible({ timeout: SYNC });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const width = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(width, `${tab} tab scrollWidth`).toBeLessThanOrEqual(360);

    // Light DOM only, so the Next.js dev overlay buttons are not counted.
    const small = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          "button, [role='button'], [role='tab']",
        ),
      )
        .filter((el) => el.checkVisibility({ checkVisibilityCSS: true }))
        .map((el) => ({ el, box: el.getBoundingClientRect() }))
        .filter(({ box }) => box.width > 1 && Math.round(box.height) < 48)
        .map(({ el, box }) => {
          const name = el.getAttribute("aria-label") ?? el.textContent ?? "";
          return `${name.trim().slice(0, 40)}: ${box.height.toFixed(1)} px`;
        }),
    );
    expect(small, `${tab} tab buttons under 48 px`).toEqual([]);
  }
});
