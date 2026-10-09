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
// Client poll + 1 s server cache + render: 3 polls, at least 10 s.
const SYNC = Math.max(
  10_000,
  3 * (Number(process.env.NEXT_PUBLIC_POLL_MS) || 3000),
);

interface State {
  poll: { id: string; total: number; correct?: string } | null;
  questions: { id: string; text: string }[];
  tally: Record<string, number>;
  reactions: Record<string, number>;
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

async function reactionTotal(request: APIRequestContext) {
  const { reactions } = await getState(request);
  return Object.values(reactions).reduce((sum, n) => sum + Number(n), 0);
}

/** Admin state of the main room: settings and questions that wait for review. */
async function adminState(request: APIRequestContext): Promise<{
  settings: { moderate: boolean };
  pending: { id: string; text: string; flagged: string | null }[];
}> {
  const res = await request.get("/api/admin/state", {
    headers: { "x-admin-key": ADMIN_KEY },
  });
  expect(res.ok(), `/api/admin/state: ${res.status()}`).toBe(true);
  return res.json();
}

/** Hides questions from earlier runs, so new ones still make the top 30. */
async function hideTestQuestions(request: APIRequestContext) {
  for (let round = 0; round < 5; round++) {
    const { questions } = await getState(request);
    const { pending } = await adminState(request);
    const ours = [...questions, ...(pending ?? [])].filter((q) =>
      q.text.startsWith(`${TAG} `),
    );
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
  await expect(screen.page.getByTestId("screen-qr")).toBeVisible();
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
  // A long unbroken word checks wrapping; a link would wait for review.
  const posted = await page.request.post("/api/question", {
    data: {
      text: `${TAG} layout ${Date.now()} see example.com/${"a".repeat(60)}`,
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

test("7. admin can withdraw the poll and reset the room", async ({
  browser,
  request,
}) => {
  // Reset wipes every vote, question and quiz answer: never run it on live data.
  test.skip(Boolean(process.env.BASE_URL), "reset-room clears live data");
  const pollId = await openPoll(request);
  const text = `${TAG} reset ${Date.now()}`;

  const student = await device(browser);
  await openTab(student.page, "Vote");
  await student.page
    .getByRole("button", { name: "Vote A" })
    .click({ timeout: SYNC });
  await expect(student.page.getByText("You voted A")).toBeVisible();
  await openTab(student.page, "Questions");
  await student.page.getByLabel("Your question").fill(text);
  await student.page.getByRole("button", { name: "Send question" }).click();
  await expect(
    student.page.getByTestId("question").filter({ hasText: text }),
  ).toBeVisible({
    timeout: SYNC,
  });

  const lecturer = await device(browser, `/admin?key=${ADMIN_KEY}`);
  const withdraw = lecturer.page.getByRole("button", { name: "Withdraw poll" });
  await expect(withdraw).toBeEnabled({ timeout: SYNC });
  await withdraw.click();
  await expect(lecturer.page.getByText("Poll withdrawn.")).toBeVisible();
  await openTab(student.page, "Vote");
  await expect(student.page.getByText("No poll yet")).toBeVisible({
    timeout: SYNC,
  });

  lecturer.page.once("dialog", (d) => d.accept());
  await lecturer.page.getByRole("button", { name: "Reset room" }).click();
  await expect(lecturer.page.getByText("Room reset.")).toBeVisible({
    timeout: SYNC,
  });

  await expect
    .poll(
      async () => {
        const s = await getState(student.page.request);
        const tally = Object.values(s.tally).reduce(
          (sum, n) => sum + Number(n),
          0,
        );
        return {
          poll: s.poll,
          mine: s.questions.some((q) => q.text === text),
          tally,
        };
      },
      { timeout: SYNC },
    )
    .toEqual({ poll: null, mine: false, tally: 0 });

  // Voters were cleared, so the same device can vote again after reopening.
  await admin(request, "/api/admin/status", { id: pollId, status: "open" });
  await openTab(student.page, "Vote");
  await student.page
    .getByRole("button", { name: "Vote B" })
    .click({ timeout: SYNC });
  await expect(student.page.getByText("You voted B")).toBeVisible();
});

test("8. invite-only rooms keep data and admin keys separate", async ({
  browser,
  request,
}) => {
  test.skip(Boolean(process.env.BASE_URL), "creates and deletes rooms");
  const owner = { "x-admin-key": "e2e-super-key" };
  const made = await request.post("/api/super/rooms", {
    headers: owner,
    data: { title: `${TAG} room ${Date.now()}` },
  });
  expect(made.status()).toBe(201);
  const { code, token } = (await made.json()).room;
  const inRoom = (path: string) => `${path}?room=${code}`;

  // The room token unlocks only its room; the main key does not unlock it.
  const poll = await request.post(inRoom("/api/admin/poll"), {
    headers: { "x-admin-key": token },
    data: {
      question: `${TAG} room poll`,
      options: [{ label: "Yes" }, { label: "No" }],
    },
  });
  expect(poll.status()).toBe(201);
  const pollId = (await poll.json()).poll.id;
  const tokenOnMain = await request.get("/api/admin/state", {
    headers: { "x-admin-key": token },
  });
  expect(tokenOnMain.status()).toBe(401);
  const mainOnRoom = await request.get(inRoom("/api/admin/state"), {
    headers: { "x-admin-key": ADMIN_KEY },
  });
  expect(mainOnRoom.status()).toBe(401);
  await request.post(inRoom("/api/admin/status"), {
    headers: { "x-admin-key": token },
    data: { id: pollId, status: "open" },
  });

  // A phone on /r/<code> votes and asks; the main room sees none of it.
  const phone = await device(browser, `/r/${code}`);
  await openTab(phone.page, "Vote");
  await phone.page
    .getByRole("button", { name: "Vote A" })
    .click({ timeout: SYNC });
  await expect(phone.page.getByText("You voted A")).toBeVisible();
  const text = `${TAG} room question ${Date.now()}`;
  await openTab(phone.page, "Questions");
  await phone.page.getByLabel("Your question").fill(text);
  await phone.page.getByRole("button", { name: "Send question" }).click();
  await expect(
    phone.page.getByTestId("question").filter({ hasText: text }),
  ).toBeVisible({ timeout: SYNC });
  const main = await getState(request);
  expect(main.poll?.id).not.toBe(pollId);
  expect(main.questions.some((q) => q.text === text)).toBe(false);

  // Deleting the room removes it for everyone.
  const gone = await request.delete(`/api/super/rooms?code=${code}`, {
    headers: owner,
  });
  expect(gone.ok()).toBe(true);
  expect((await request.get(inRoom("/api/room"))).status()).toBe(404);
  await phone.page.reload();
  await expect(
    phone.page.getByRole("tabpanel").getByText("This room does not exist"),
  ).toBeVisible({
    timeout: SYNC,
  });
});

test("9. admin exports results and the projector has a dark theme", async ({
  browser,
  request,
}) => {
  const pollId = await openPoll(request);
  const { page } = await device(browser);
  const text = `${TAG} export ${Date.now()}`;
  const posted = await page.request.post("/api/question", { data: { text } });
  expect(posted.status(), "export question").toBe(201);

  const res = await request.get("/api/admin/export?format=json", {
    headers: { "x-admin-key": ADMIN_KEY },
  });
  expect(res.status()).toBe(200);
  expect(res.headers()["content-disposition"]).toMatch(
    /^attachment; filename="chatterjar-main-\d{4}-\d{2}-\d{2}\.json"$/,
  );
  const data = await res.json();
  expect(data.room).toBe("main");
  expect(data.polls.some((p: { id: string }) => p.id === pollId)).toBe(true);
  expect(data.questions.some((q: { text: string }) => q.text === text)).toBe(
    true,
  );

  const csv = await request.get("/api/admin/export?format=csv", {
    headers: { "x-admin-key": ADMIN_KEY },
  });
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain(text);

  const anonymous = await request.get("/api/admin/export?format=json");
  expect(anonymous.status()).toBe(401);

  const screen = await device(browser, "/screen?theme=dark");
  const root = screen.page.locator("[data-theme]").first();
  await expect(root).toHaveAttribute("data-theme", "dark", { timeout: SYNC });
  await screen.page.getByRole("button", { name: "Light theme" }).click();
  await expect(root).toHaveAttribute("data-theme", "light");
});

test("10. reactions add to the totals and the 11th in 10 s is rejected", async ({
  browser,
}) => {
  const { page } = await device(browser);
  await expect(page.getByRole("button", { name: "Love it" })).toBeVisible({
    timeout: SYNC,
  });
  const before = await reactionTotal(page.request);

  // All 11 go out back to back, well inside the 10 s window.
  const types = ["love", "idea", "applause", "confused"];
  for (let i = 1; i <= 11; i++) {
    const res = await page.request.post("/api/react", {
      data: { type: types[i % types.length] },
    });
    expect(res.status(), `reaction ${i}`).toBe(i <= 10 ? 200 : 429);
    if (i > 10) expect((await res.json()).error).toBe("Slow down a little.");
  }
  await expect
    .poll(() => reactionTotal(page.request), { timeout: SYNC })
    .toBe(before + 10);

  const screen = await page.context().newPage();
  await screen.goto("/screen");
  await expect(screen.getByTestId("screen-reactions")).toBeVisible({
    timeout: SYNC,
  });
});

test("11. with review on, a question shows only after the admin approves it", async ({
  browser,
  request,
}) => {
  // The setting is room-wide: never flip it on live data.
  test.skip(Boolean(process.env.BASE_URL), "changes the room review setting");
  await admin(request, "/api/admin/settings", { moderate: true });
  try {
    expect((await adminState(request)).settings.moderate).toBe(true);
    const text = `${TAG} review ${Date.now()}`;
    const { page } = await device(browser);
    await openTab(page, "Questions");
    await page.getByLabel("Your question").fill(text);
    await page.getByRole("button", { name: "Send question" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "The host will review" }),
    ).toBeVisible();

    const waiting = (await adminState(request)).pending.find(
      (q) => q.text === text,
    );
    expect(waiting, "question in the review queue").toBeTruthy();
    const shown = async () =>
      (await getState(request)).questions.some((q) => q.text === text);
    expect(await shown()).toBe(false);

    await admin(request, "/api/admin/approve", { id: waiting!.id });
    await expect.poll(shown, { timeout: SYNC }).toBe(true);
    await expect(
      page.getByTestId("question").filter({ hasText: text }),
    ).toBeVisible({ timeout: SYNC });
    const queue = (await adminState(request)).pending;
    expect(queue.some((q) => q.text === text)).toBe(false);
  } finally {
    await admin(request, "/api/admin/settings", { moderate: false });
  }
});
