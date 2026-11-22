import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { findTestAccountByName } from 'deepspace/testing'

const origin = process.env.QA_ORIGIN || 'http://localhost:5188'
const config = readFileSync(
  new URL('../wrangler.toml', import.meta.url),
  'utf8',
)
const appId = config.match(/DEEPSPACE_APP_ID\s*=\s*"([^"]+)"/)[1]
const checks = []
const sockets = []
const uploadedKeys = []
let uploadUser
function pass(message) {
  checks.push(message)
  console.log(`PASS ${message}`)
}
async function signIn(name) {
  if (name === 'Yearbook Editor' && process.env.QA_USE_CLI_EDITOR === '1') {
    const token = readFileSync(`${homedir()}/.deepspace/token`, 'utf8').trim()
    const claims = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString(),
    )
    return { name: 'App owner', token, userId: claims.sub }
  }
  const account = findTestAccountByName(name)
  const response = await fetch(`${origin}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ email: account.email, password: account.password }),
  })
  assert.equal(
    response.ok,
    true,
    `Sign-in failed for ${name}: HTTP ${response.status}`,
  )
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
  const result = await fetch(`${origin}/api/auth/token`, {
    method: 'POST',
    headers: { Cookie: cookie, Origin: origin },
  })
  const { token } = await result.json()
  assert.equal(typeof token, 'string', 'Missing auth token')
  return { name, token, userId: account.userId, cookie }
}
async function connect(user) {
  const ws = new WebSocket(
    `${origin.replace(/^http/, 'ws')}/ws/app:${appId}?token=${encodeURIComponent(user.token)}`,
  )
  sockets.push(ws)
  const messages = []
  ws.addEventListener('message', (event) => {
    if (typeof event.data === 'string') messages.push(JSON.parse(event.data))
  })
  const wait = async (predicate, timeout = 20000) => {
    const end = Date.now() + timeout
    while (Date.now() < end) {
      const match = messages.find(predicate)
      if (match) return match
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error(
      `Timed out on ${user.name}; received ${messages.map((m) => m.type).join(', ')}`,
    )
  }
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  ws.send(
    JSON.stringify({
      type: 'core.subscribe',
      payload: {
        subscriptionId: 'qa',
        query: { collection: 'submissions', limit: 100 },
      },
    }),
  )
  const initial = await wait((m) => m.type === 'core.query_result')
  return { ...user, ws, messages, wait, initial }
}
async function action(user, name, params) {
  const response = await fetch(`${origin}/api/actions/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${user.token}`,
    },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(45000),
  })
  return response.json()
}
async function upload(
  user,
  bytes,
  name = 'fictional-team.png',
  type = 'image/png',
) {
  const form = new FormData()
  form.append('file', new Blob([bytes], { type }), name)
  form.append('name', name)
  const response = await fetch(`${origin}/api/files/upload?scope=app`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user.token}` },
    body: form,
  })
  const result = await response.json()
  if (result.success && result.key) uploadedKeys.push(result.key)
  return result
}
try {
  const [editorUser, memberUser, outsiderUser] = await Promise.all(
    ['Yearbook Editor', 'Yearbook Contributor', 'Yearbook Outsider'].map(
      signIn,
    ),
  )
  uploadUser = memberUser
  const [editor, member, outsider] = await Promise.all(
    [editorUser, memberUser, outsiderUser].map(connect),
  )
  pass(
    'Three real accounts authenticated in separate sessions and subscribed over WebSocket',
  )
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=',
    'base64',
  )
  const uploaded = await upload(member, png)
  assert.equal(uploaded.success, true, uploaded.error)
  const photoKey = uploaded.key
  const photoResponse = await fetch(
    `${origin}/api/files/${photoKey.split('/').map(encodeURIComponent).join('/')}?scope=app`,
  )
  assert.equal(photoResponse.ok, true)
  assert.deepEqual(Buffer.from(await photoResponse.arrayBuffer()), png)
  pass(
    'Real photo uploaded, then fetched anonymously with identical bytes (public demo storage)',
  )
  const requestId = randomUUID()
  const caption = `Alex photographs team events. QA ${Date.now()}`
  const saved = await action(member, 'submit', { photoKey, caption, requestId })
  assert.equal(saved.success, true, saved.error)
  const recordId = saved.data.recordId
  const recordChange = (m) =>
    m.type === 'core.record_change' && m.payload.record?.recordId === recordId
  const memberPending = await member.wait(recordChange)
  await editor.wait(recordChange)
  assert.equal(memberPending.payload.record.data.status, 'pending')
  pass(
    'Contributor submitted; contributor and editor received pending record without reconnecting',
  )
  assert.equal(
    (await action(member, 'submit', { photoKey, caption, requestId })).data
      .recordId,
    recordId,
  )
  pass('Retry with the same request ID returns the same submission')
  assert.equal(
    (
      await action(member, 'review', {
        recordId,
        status: 'approved',
        role: 'admin',
      })
    ).success,
    false,
  )
  assert.equal(
    (
      await action(editor, 'review', {
        recordId,
        status: 'needs_revision',
        feedback: ' ',
      })
    ).success,
    false,
  )
  pass(
    'Backend rejected contributor review spoof and editor request-changes without feedback',
  )
  member.ws.send(
    JSON.stringify({
      type: 'core.put',
      payload: {
        collection: 'submissions',
        recordId,
        data: { status: 'approved' },
        requestId: 'qa-forged-update',
      },
    }),
  )
  const rejected = await member.wait(
    (m) =>
      m.type === 'records.ack' && m.payload.requestId === 'qa-forged-update',
  )
  assert.equal(rejected.payload.success, false)
  pass('Direct forged WebSocket update rejected by collection RBAC')
  const feedback = 'Please mention your role on the yearbook team.'
  const reviewed = await action(editor, 'review', {
    recordId,
    status: 'needs_revision',
    feedback,
  })
  assert.equal(reviewed.success, true, reviewed.error)
  const revision = await member.wait(
    (m) => recordChange(m) && m.payload.record.data.status === 'needs_revision',
  )
  assert.equal(revision.payload.record.data.feedback, feedback)
  pass(
    'Needs-revision status and feedback delivered live to original contributor socket',
  )
  assert.equal(
    (
      await action(outsider, 'revise', {
        recordId,
        photoKey,
        caption: 'Forged edit',
      })
    ).success,
    false,
  )
  assert.equal(outsider.messages.some(recordChange), false)
  pass(
    'Unrelated third account received no private submission and could not revise it',
  )
  const revised = await action(member, 'revise', {
    recordId,
    photoKey,
    caption: caption + ' Alex is a yearbook photographer.',
  })
  assert.equal(revised.success, true, revised.error)
  await editor.wait(
    (m) =>
      recordChange(m) &&
      m.payload.record.data.caption.endsWith('photographer.'),
  )
  const approval = await action(editor, 'review', {
    recordId,
    status: 'approved',
  })
  assert.equal(approval.success, true, approval.error)
  await member.wait(
    (m) => recordChange(m) && m.payload.record.data.status === 'approved',
  )
  pass(
    'Owner revised and resubmitted; editor approved; contributor received live approval',
  )
  const reconnected = await connect(memberUser)
  const rows = reconnected.initial.payload.records
  assert.equal(
    rows.find((r) => r.recordId === recordId)?.data.status,
    'approved',
  )
  pass('Fresh connection reloaded persisted approved record')
  const ai = await action(member, 'polish', {
    caption: 'Alex help take photos for our team.',
  })
  if (ai.success) {
    assert.equal(typeof ai.data.suggestion, 'string')
    assert.ok(ai.data.suggestion.length <= 500)
    pass('Real DeepSpace AI integration returned a bounded text suggestion')
  } else {
    assert.match(ai.error, /original text|unchanged/)
    pass('Real AI unavailable: action returned explicit original-text fallback')
  }
  const empty = await action(member, 'submit', {
    photoKey,
    caption: '  ',
    requestId: randomUUID(),
  })
  assert.equal(empty.success, false)
  const fake = await upload(member, Buffer.from('not an image'), 'fake.png')
  assert.equal(fake.success, true, fake.error)
  const fakeSubmit = await action(member, 'submit', {
    photoKey: fake.key,
    caption: 'Fake image should fail',
    requestId: randomUUID(),
  })
  assert.equal(fakeSubmit.success, false)
  assert.match(fakeSubmit.error, /JPEG or PNG/)
  pass(
    'Backend rejected empty caption and fake PNG bytes despite a valid-looking extension',
  )
  const over = await upload(
    member,
    Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)]),
    'too-large.png',
  )
  assert.equal(over.success, true, over.error)
  const overSubmit = await action(member, 'submit', {
    photoKey: over.key,
    caption: 'Oversize should fail',
    requestId: randomUUID(),
  })
  assert.equal(overSubmit.success, false)
  assert.match(overSubmit.error, /5 MB/)
  pass(
    'Backend rejected stored photo above 5 MB, independent of browser validation',
  )
  const noAuth = await fetch(`${origin}/api/actions/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recordId, status: 'approved' }),
  })
  assert.equal(noAuth.status, 401)
  pass('Anonymous review request rejected with HTTP 401')
  mkdirSync(new URL('../test-results/', import.meta.url), { recursive: true })
  writeFileSync(
    new URL('../test-results/workflow-report.json', import.meta.url),
    JSON.stringify(
      {
        origin,
        checkedAt: new Date().toISOString(),
        checks,
        aiAvailable: ai.success,
        recordId,
      },
      null,
      2,
    ),
  )
} finally {
  for (const socket of sockets) socket.close()
  // These exact files were created by this test run; never list/delete user files.
  for (const key of uploadedKeys.slice(1)) {
    const response = await fetch(
      `${origin}/api/files/${key.split('/').map(encodeURIComponent).join('/')}?scope=app`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${uploadUser.token}` },
      },
    )
    if (!response.ok) console.warn('Could not remove a QA-only photo fixture.')
  }
}
