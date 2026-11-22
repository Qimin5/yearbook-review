# Yearbook Review

A shared workspace for collecting and reviewing team photos and bios, inspired by my experience with the Snapshots yearbook club. Built with DeepSpace, it brings submissions and editorial feedback together to help teams prepare content for a yearbook or an About the Team page.

[Open the app](https://yearbook-review.app.space) · [GitHub repository](https://github.com/Qimin5/yearbook-review)

## How it works

1. **Contribute:** Sign in, upload a JPEG or PNG up to 5 MB, and write a short bio or caption.
2. **Optional AI help:** Click **Suggest a polish**, then choose whether to use the suggestion. You can still submit your original text if AI fails.
3. **Submit:** Your entry appears as **Pending review**.
4. **Review:** An editor approves the entry or requests changes. Requesting changes requires written feedback.
5. **See updates live:** The contributor sees the result without refreshing and can edit and resubmit a returned entry.

Click any submission photo to see the full image. The original file is unchanged.

## Try it with two accounts

Use the app owner's account as the editor and a different account in an incognito window as the contributor. Keep both pages open to see live updates.

New users start as contributors. To make another user an editor, have them sign in first, then grant editor access in **Settings** from the owner account.

Contributors see only their own submission text. Editors see all submissions. The backend checks permissions, so hiding a button is not the only protection against unauthorized reviews.

## Built with DeepSpace

The app started from the DeepSpace starter and uses React and TypeScript with SDK version 0.44.2.

| Feature | DeepSpace use |
| --- | --- |
| Sign-in | Authentication and app roles |
| Photos | Platform file storage |
| Submissions and feedback | Realtime records |
| Review permissions | Server actions and collection permissions |
| AI polishing | `openai/chat-completion` integration with `gpt-4.1-mini` |
| Deployment | Hosting at `yearbook-review.app.space` |

AI receives only the caption text. Suggestions are intended to preserve facts, but the contributor must check them before accepting. Calls go through DeepSpace; no separate OpenAI API key is configured.

## Main choices and limits

- **One team:** Keeps the first version small. An editor uses DeepSpace's admin role, which also allows role management.
- **Public demo photos:** Image URLs are public, even before approval. Use only photos you can share publicly. Submission text has separate access restrictions.
- **Server validation:** The backend checks photo type and size, caption length, ownership, and review permissions. Direct record writes are blocked so they cannot skip these checks.
- **Review only:** Approval does not publish a public team page. Private photo access, invitations, unused-upload cleanup, AI usage limits, and publishing are future improvements. Anyone who can sign in can currently contribute.

## Run locally

Use Node 24, npm 11.6 or newer, Git, and a DeepSpace account. From the project folder:

```sh
npm ci
npx deepspace auth login
npx deepspace auth whoami
npx deepspace dev start
```

Open the local URL printed in the terminal. Keep passwords, tokens, and `.dev.vars` out of Git.

To check and deploy changes:

```sh
npm run validate
npm run build
npx deepspace deploy
```

Commit and push reviewed changes to GitHub before deploying. Deployment uses the local checkout.

## What was tested

I personally checked sign-in, text input, file-size rejection, photo upload and loading, and saved submissions after refresh. During final testing I tried AI suggestions and a logo submission, reported the photo display issue, and tested the updated app.

Codex ran the TypeScript check, **7 unit tests**, the production build, and **14 real-service workflow checks**, including two-account live updates and rejected unauthorized requests. These are agent-run checks. The separate Playwright browser suite could not start in the sandbox and is not counted as passed.

See the [detailed verification record](docs/VERIFICATION.md) for test results and remaining limitations.

## My contribution and AI assistance

I designed the workflow around my experience with the Snapshots yearbook club: contributors submit photos and bios, editors give feedback, and contributors see updates live. I set up and deployed the DeepSpace starter, connected the submission schema, edited the form, and manually tested uploads, saved submissions, and AI suggestions. My testing also identified a photo display issue that was corrected.

I used Codex for guided learning, debugging, and implementation help, including backend permissions, review and revision actions, AI polishing, and interface improvements. Codex also ran automated checks for realtime updates and unauthorized requests. The verification record distinguishes my manual testing from agent-run checks.
