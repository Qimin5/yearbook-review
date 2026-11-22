/**
 * Multi-user collaboration spec — verifies two users sign in into
 * separate browser contexts and the app distinguishes them.
 *
 * `users(2)` takes any two accounts from your pool, so this spec passes on a
 * fresh app with no setup beyond having two test accounts:
 *   npx deepspace test accounts list
 *   npx deepspace test accounts create --email a@deepspace.test --name "A" --password-stdin
 *
 * Ask for accounts *by name* (`users(['Alice', 'Bob'])`) only when the
 * behaviour under test depends on which identity acts — otherwise naming them
 * couples the spec to one machine's pool.
 *
 * The `users` fixture handles sign-in caching (per-account storageState
 * persisted to `~/.deepspace/playwright-states/`), context creation, and
 * cleanup. No need to manage browser contexts manually.
 */
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

// A machine that has never created test accounts is the normal state of a
// fresh checkout, and there `users()` throws — turning "you have no pool yet"
// into three red tests about the app, which it is not. Skip the file instead
// and say what creates the pool. The count is of accounts usable HERE: the
// pool is global per developer, but passwords live only on the machine that
// created the account.
const usableTestAccounts = loadAllTestAccounts().length
test.skip(
  usableTestAccounts < 2,
  `Needs 2 usable test accounts, found ${usableTestAccounts}. Create them with ` +
    '`npx deepspace test accounts create --email <name>@deepspace.test --name "<name>" ' +
    '--password-stdin`, or fetch existing pool accounts with `npx deepspace test accounts recover --all`.',
)

test('each browser renders its own signed-in account', async ({ users }) => {
  const [a, b] = await users(2)

  // /home is dynamic (under src/pages/(app)/), so it mounts the nav shell;
  // '/' is the static landing and has no navigation.
  await Promise.all([a.page.goto('/home'), b.page.goto('/home')])

  // Email, not name. The page renders the *session's* `name || email`, while
  // `user.name` here comes from the LOCAL account registry — and the two are
  // not the same fact: a display name is optional, and an account recovered on
  // another machine has none stored locally at all. The email is the credential
  // the context signed in with, so it is the one identity both sides agree on,
  // and asserting it proves the page is showing THIS browser's account.
  // The two accounts are distinct, so two exact matches is also the proof that
  // the contexts are not sharing one session.
  for (const user of [a, b]) {
    await expect(user.page.getByTestId('app-navigation')).toBeVisible({
      timeout: 15_000,
    })

    // The identity chip shows `name || email`. Its text is not predictable, but
    // its presence is: something must be there once the profile has loaded.
    // (It is `hidden sm:inline` in some templates, so assert text, not
    // visibility.)
    await expect(user.page.getByTestId('nav-user-name')).toHaveText(/\S/, {
      timeout: 15_000,
    })

    await user.page.getByRole('button', { name: 'Account menu' }).click()
    await expect(user.page.getByTestId('nav-user-email')).toHaveText(
      user.email,
      {
        timeout: 15_000,
      },
    )
  }
})

test('API status page renders loading success and error states', async ({
  users,
}) => {
  const [user] = await users(1)
  let shouldFail = false
  let requestCount = 0

  await user.page.route('**/api/integrations', async (route) => {
    requestCount += 1
    if (shouldFail) {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Catalog unavailable' }),
      })
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { integrations: { openai: {}, wikipedia: {} } },
      }),
    })
  })

  await user.page.goto('/api-status')
  await expect(
    user.page.getByText('Loading integration catalog...'),
  ).toBeVisible()
  await expect(user.page.getByText('Integration catalog ready')).toBeVisible()
  await expect(user.page.getByText('2 integrations available.')).toBeVisible()

  shouldFail = true
  await user.page.getByRole('button', { name: 'Refresh' }).click()
  await expect(user.page.getByText('Catalog unavailable')).toBeVisible()
  await expect(
    user.page.getByText('Showing the last loaded catalog'),
  ).toBeVisible()
  await expect(user.page.getByText('Integration catalog ready')).toBeVisible()

  const urlAfterFailure = user.page.url()
  const requestsAfterFailure = requestCount
  await user.page.getByRole('button', { name: 'Refresh' }).click()
  await expect.poll(() => requestCount).toBeGreaterThan(requestsAfterFailure)
  expect(user.page.url()).toBe(urlAfterFailure)
})

test('API status page shows local retry after first-load API failure', async ({
  users,
}) => {
  const [user] = await users(1)
  let requestCount = 0

  await user.page.route('**/api/integrations', async (route) => {
    requestCount += 1
    await route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'Catalog unavailable' }),
    })
  })

  await user.page.goto('/api-status')
  await expect(
    user.page.getByText('Loading integration catalog...'),
  ).toBeVisible()
  await expect(user.page.getByText('Could not load API data')).toBeVisible()
  await expect(
    user.page.getByText('Retried 1 time automatically.'),
  ).toBeVisible()

  const retryButton = user.page.getByRole('button', { name: 'Retry' })
  await expect(retryButton).toBeVisible()

  const urlAfterFailure = user.page.url()
  const requestsAfterFailure = requestCount
  await retryButton.click()
  await expect.poll(() => requestCount).toBeGreaterThan(requestsAfterFailure)
  expect(user.page.url()).toBe(urlAfterFailure)
})

// A separate preview makes the test editor the owner, without changing the
// real app owner or its production records. Run via review.playwright.config.ts.
test('yearbook workflow: permissions, feedback, resubmission and live approval', async ({
  users,
}) => {
  const [editor, contributor, outsider] = await users([
    'Yearbook Editor',
    'Yearbook Contributor',
    'Yearbook Outsider',
  ])
  await Promise.all([
    editor.page.goto('/home'),
    contributor.page.goto('/home'),
    outsider.page.goto('/home'),
  ])
  await expect(
    editor.page.getByText('Editor workspace', { exact: true }),
  ).toBeVisible()
  await expect(
    contributor.page.getByText('Contributor workspace', { exact: true }),
  ).toBeVisible()
  await expect(
    contributor.page.getByText('Live updates connected', { exact: true }),
  ).toBeVisible()

  // A tiny original PNG fixture; no external person's image or remote URL.
  const image = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=',
    'base64',
  )
  const caption = `Alex documents team events. QA ${Date.now()}`
  await contributor.page
    .getByLabel('Team photo', { exact: true })
    .setInputFiles({
      name: 'fictional-team.png',
      mimeType: 'image/png',
      buffer: image,
    })
  await contributor.page
    .getByRole('button', { name: 'Upload photo', exact: true })
    .click()
  await expect(
    contributor.page.getByText(
      'Photo uploaded. Add your caption, then submit for review.',
    ),
  ).toBeVisible({ timeout: 30_000 })
  await contributor.page
    .getByLabel('Short bio or photo caption', { exact: true })
    .fill(caption)

  // The real platform AI call may succeed or refuse (e.g. insufficient credit).
  // Neither path may modify the source text or block normal submission.
  const aiResponse = contributor.page.waitForResponse((r) =>
    r.url().endsWith('/api/actions/polish'),
  )
  await contributor.page
    .getByRole('button', { name: 'Suggest a polish' })
    .click()
  await aiResponse
  await expect(
    contributor.page.getByLabel('Short bio or photo caption'),
  ).toHaveValue(caption)
  const suggestion = contributor.page.getByRole('button', {
    name: 'Use suggestion',
  })
  if (await suggestion.isVisible()) {
    await contributor.page
      .getByRole('button', { name: 'Keep original' })
      .click()
  }
  await contributor.page
    .getByRole('button', { name: 'Submit for review', exact: true })
    .click()
  await expect(
    contributor.page.getByText(
      'Submission saved. Pending review. You can follow its status below.',
    ),
  ).toBeVisible({ timeout: 30_000 })
  const memberCard = contributor.page
    .getByTestId('submission-card')
    .filter({ hasText: caption })
  const editorCard = editor.page
    .getByTestId('submission-card')
    .filter({ hasText: caption })
  await expect(
    memberCard.getByText('Pending review', { exact: true }),
  ).toBeVisible()
  await expect(editorCard).toBeVisible() // no reload on the editor page
  await expect(
    outsider.page.getByTestId('submission-card').filter({ hasText: caption }),
  ).toHaveCount(0)
  await expect(
    memberCard.getByRole('button', { name: 'Approve', exact: true }),
  ).toHaveCount(0)
  const id = await memberCard.getAttribute('data-record-id')

  async function action(
    page: typeof contributor.page,
    name: string,
    params: Record<string, unknown>,
  ) {
    return page.evaluate(
      async ({ name, params }) => {
        const { token } = await (
          await fetch('/api/auth/token', { method: 'POST' })
        ).json()
        const response = await fetch(`/api/actions/${name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(params),
        })
        return response.json()
      },
      { name, params },
    )
  }
  const denied = await action(contributor.page, 'review', {
    recordId: id,
    status: 'approved',
    role: 'admin',
  })
  expect(denied.success).toBe(false)
  expect(denied.error).toContain('Only an editor')
  const noFeedback = await action(editor.page, 'review', {
    recordId: id,
    status: 'needs_revision',
    feedback: '  ',
  })
  expect(noFeedback.success).toBe(false)
  expect(noFeedback.error).toContain('Write feedback')

  // Forge the ordinary SDK write protocol directly, bypassing our UI/action.
  const directWrite = await contributor.page.evaluate(
    async ({ id }) => {
      const { token } = await (
        await fetch('/api/auth/token', { method: 'POST' })
      ).json()
      const existingSocketUrl = performance
        .getEntriesByType('resource')
        .map((e) => e.name)
        .find((x) => x.includes('/ws/'))
      // Immutable app identity for this fixture, identical to wrangler.toml.
      const room = 'app:app_01M7NP7P0CH64W3EBQDW49KP2W'
      void existingSocketUrl
      return new Promise<Record<string, unknown>>((resolve, reject) => {
        const socket = new WebSocket(
          `${location.origin.replace(/^http/, 'ws')}/ws/${room}?token=${encodeURIComponent(token)}`,
        )
        const timer = setTimeout(() => {
          socket.close()
          reject(new Error('Direct-write ack timed out'))
        }, 15000)
        socket.onopen = () =>
          socket.send(
            JSON.stringify({
              type: 'core.put',
              payload: {
                collection: 'submissions',
                recordId: id,
                data: { status: 'approved' },
                requestId: 'qa-forged-update',
              },
            }),
          )
        socket.onmessage = (e) => {
          if (typeof e.data !== 'string') return
          const message = JSON.parse(e.data)
          if (message.type === 'records.ack' || message.type === 'core.error') {
            clearTimeout(timer)
            socket.close()
            resolve(message)
          }
        }
      })
    },
    { id },
  )
  expect(JSON.stringify(directWrite)).toMatch(
    /denied|permission|not allowed|false/i,
  )

  const feedback = 'Please mention your role on the yearbook team.'
  await editorCard.getByLabel(/Feedback/).fill(feedback)
  await editorCard
    .getByRole('button', { name: 'Request changes', exact: true })
    .click()
  await expect(
    memberCard.getByText('Needs revision', { exact: true }),
  ).toBeVisible()
  await expect(memberCard.getByText(feedback, { exact: true })).toBeVisible() // no refresh
  const stolen = await action(outsider.page, 'revise', {
    recordId: id,
    caption: 'Forged edit',
  })
  expect(stolen.success).toBe(false)
  await memberCard.getByRole('button', { name: 'Revise submission' }).click()
  const revised = caption + ' Alex is the yearbook photographer.'
  await contributor.page.getByLabel('Short bio or photo caption').fill(revised)
  await contributor.page
    .getByRole('button', { name: 'Resubmit for review' })
    .click()
  const revisedMember = contributor.page
    .getByTestId('submission-card')
    .filter({ hasText: revised })
  const revisedEditor = editor.page
    .getByTestId('submission-card')
    .filter({ hasText: revised })
  await expect(
    revisedEditor.getByText('Pending review', { exact: true }),
  ).toBeVisible()
  await revisedEditor
    .getByRole('button', { name: 'Approve', exact: true })
    .click()
  await expect(
    revisedMember.getByText('Approved', { exact: true }),
  ).toBeVisible()
  await contributor.page.reload()
  await expect(
    contributor.page
      .getByTestId('submission-card')
      .filter({ hasText: revised })
      .getByText('Approved', { exact: true }),
  ).toBeVisible()
  await expect(
    contributor.page
      .getByTestId('submission-card')
      .filter({ hasText: revised })
      .locator('img'),
  ).toHaveJSProperty('naturalWidth', 1)
  await contributor.page.screenshot({
    path: 'test-results/contributor-approved.png',
    fullPage: true,
  })
  await editor.page.screenshot({
    path: 'test-results/editor-queue.png',
    fullPage: true,
  })
})
