# Yearbook Review

A single-team photo and bio review workspace, inspired by my experience with the Snapshots yearbook club.

**Live app:** https://yearbook-review.app.space  
**Repository:** https://github.com/Qimin5/yearbook-review

## Try the workflow

1. Open the workspace and sign in with DeepSpace. New users are contributors; the app owner is an editor.
2. Upload a publicly shareable JPEG/PNG, up to 5 MB, and write a short bio/caption (1–500 characters).
3. Optionally click **Suggest a polish**. Review the suggestion, choose **Use suggestion** or **Keep original**, and edit as needed. AI receives only the source text.
4. Click **Submit for review**. The new entry appears as **Pending review**.
5. In another account/browser session, an editor sees the review queue. **Approve**, or enter feedback and choose **Request changes**.
6. Keep the contributor page open: status and feedback update without refreshing. A contributor can revise their own returned entry and resubmit it.
7. Editors can open **Settings** after a teammate has signed in and grant/revoke editor access. The app owner stays an editor. Never share an owner's CLI token with a reviewer.

For a two-person demonstration, use the owner account as editor and another account in an incognito window as contributor. A reviewer signing in independently initially has contributor access; the owner must explicitly grant editor access in Settings.

## DeepSpace features

- **Authentication:** SDK auth provider, sign-in overlay, verified caller JWTs and per-app roles.
- **File storage:** `useR2Files({ scope: 'app' })` uploads to platform storage. Records store a key, not image bytes. The worker verifies stored bytes with `appFiles` before accepting a submission.
- **Realtime records:** `useQuery<Submission>` subscribes to the `submissions` collection. Accepted server writes broadcast to authorized clients over WebSocket.
- **Server actions and permissions:** submit, review and revise actions enforce application rules on the worker. Ordinary record writes are denied for every role, including editors, so direct SDK/tools writes cannot bypass review validation.
- **AI:** an authenticated server action calls DeepSpace's `openai/chat-completion` integration with `gpt-4.1-mini`. No separate provider API key. The app owner pays platform usage; suggestions are optional and never automatically replace the source.
- **Hosting:** original DeepSpace starter, SDK 0.44.2, deployed with `deepspace deploy` to `app.space`.

## Permission and validation decisions

| Caller | Read submissions | Create / revise | Review |
| --- | --- | --- | --- |
| Signed out / viewer | No | No | No |
| Contributor (`member`) | Own only | Through validated actions; revise own `needs_revision` entry only | No |
| Editor (`admin`) | All team entries | Through validated actions | Through the review action only |

Actions bypass record RBAC, so `src/actions/index.ts` explicitly resolves the caller's current membership/role on the server. It never trusts a role sent by the browser. Requesting changes requires nonblank feedback; approval clears obsolete feedback. The worker supplies the pending state, review author and timestamp. It checks caption length, app-scoped file key, actual JPEG/PNG signature and stored byte count. Creation uses a user-scoped request ID so retrying the same request does not create a second entry or overwrite a review.

**Important storage tradeoff:** app-scoped image URLs are public before and after approval. Submission text is restricted by record permissions, but images are not private. This demo uses fictional members and shareable sample images. Approval does **not** publish an About the Team website. A real yearbook intake system should add private, editor-authorized image delivery and consent controls.

## Code map

| File | Purpose |
| --- | --- |
| `src/pages/(app)/home.tsx` | Upload/caption form, optional AI suggestion, live submission list and filters |
| `src/components/SubmissionCard.tsx` | Review controls, feedback, status and revision entry point |
| `src/actions/index.ts` | Server authorization, submit/review/revise validation |
| `src/actions/polish.ts` | Text-only AI boundary and graceful failure |
| `src/lib/actions.ts` | Same-origin action requests using the signed-in user's JWT |
| `src/lib/submissions.ts` | Readable TypeScript status union and shared record type |
| `src/schemas/submissions-schema.ts` | Columns, defaults, row read policy, direct-write denial |
| `src/pages/(app)/(protected)/settings.tsx` | SDK-backed editor role management |

## Run locally

Prerequisites: Node 22.15+ (22.x), 24.x or 26.x, npm 11.6+, Git, and a DeepSpace login.

```sh
npm ci
npx deepspace auth login
npx deepspace auth whoami
npx deepspace dev start
```

Open the printed local URL. Do not start a second server on the same port. Save source changes for Vite hot updates; restart when changing worker/schema configuration. Keep `.dev.vars`, `.deepspace`, auth sessions and `node_modules` out of Git. This existing app already has its immutable ID in `wrangler.toml`; do not generate a new ID when continuing it.

```sh
npm run validate
npm run build
npx deepspace deploy
```

The app uses GitHub source. Commit/push the reviewed code as usual; deployment ships the local checkout. Do not use `deepspace push` for this GitHub-owned app. Local records and deployed records are separate; platform file storage is shared for the same app identity.

## Verification

See [docs/VERIFICATION.md](docs/VERIFICATION.md) for the evidence and limitations, and [docs/LEARNING.md](docs/LEARNING.md) for a short bilingual walkthrough.

- `npm run validate`: TypeScript and unit tests, including AI refusal/network fallback.
- `npm run build`: production frontend/worker build and generated static landing.
- `npm run test:workflow`: real HTTP + WebSocket workflow test. Requires the isolated preview and three locally provisioned test accounts.
- `npm run test:browser-workflow`: optional Playwright UI workflow. Requires a usable Chromium installation and the same account names; browser startup was blocked in the Codex execution sandbox, so this suite is **not** claimed as passed.

For the real-service workflow test, create accounts using password stdin (credentials stay in the local DeepSpace registry), with names **Yearbook Editor**, **Yearbook Contributor**, and **Yearbook Outsider**. Then build and start the isolated test preview:

```sh
npm run build
node tests/serve-review.mjs
# In another terminal:
npm run test:workflow
```

The preview makes only the local test account the owner; `testState()` isolates its record database. Uploaded fixtures still use the app's platform storage. The test removes its invalid/oversized fixtures, retains the valid photo referenced by its test entry, and never deletes existing user uploads. Optional `QA_PORT`/`QA_ORIGIN` choose another test port. Do not put test passwords in README or source.

## Scope and next steps

This version serves one team and shows at most 100 visible entries. Editor maps to DeepSpace `admin`, which includes role management; a larger product should separate reviewer and team-administrator powers. There is no team invitation/allowlist: people who can sign in can contribute, and only editors can see all text. Uploaded but abandoned photos can remain in storage; automated orphan cleanup, durable AI usage limits, private media, moderation/audit history and an approved-content publishing page are next steps. AI is instructed to preserve facts but cannot guarantee that; contributors must review suggestions.

## Authorship and assistance

I chose the Snapshots-inspired workflow. During the guided phase I ran setup/login/deploy/Git commands, changed the landing title, created and connected the submission schema, edited the caption/photo form, changed its label to English, and personally checked login, typing, file-size rejection, photo upload/readback, and persistence after refresh. Codex supplied example code, explanations and debugging guidance. Near the deadline I delegated the remaining implementation and verification to Codex: server-enforced review/revision, realtime workflow checks, optional AI polishing, interface cleanup, automated tests and documentation. Those later checks are agent-run, not checks I personally performed.
