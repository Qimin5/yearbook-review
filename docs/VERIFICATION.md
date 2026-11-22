# Verification record — November 22, 2026

This file distinguishes checks performed by the applicant from checks performed by Codex. It does not claim that the applicant personally operated the final editor or AI features.

## Applicant-operated checks during the guided phase

- Checked Node 24.16.0, npm 11.13.0 and Git 2.54.0.
- Created the DeepSpace 0.44.2 starter, authenticated, started it locally, changed a title and saw the browser update.
- Created the GitHub repository, committed/pushed code and deployed the initial app. Confirmed the live page loaded and survived refresh.
- Signed in inside the application.
- Entered caption text and checked character count/reset on refresh; personally changed its label to English.
- Selected and uploaded sample images; verified the browser rejected an image over 5 MB and cleared the selection.
- Reloaded stored photos from DeepSpace after refresh.
- Submitted a pending record, loaded its photo/caption/status, then refreshed and confirmed it persisted.

## Agent-run automated checks

`npm run validate`: TypeScript passed and **7 unit tests passed**. The AI tests mock only the external integration boundary: successful text-only payload, provider refusal, thrown network error, oversized suggestion. Existing prerender tests also pass.

`npm run build`: passed production frontend/worker build and static landing prerender. The build's Rules of Hooks lint reported no errors.

`node scripts/verify-workflow.mjs`: **14 real-service checks passed**, first locally and then against **https://yearbook-review.app.space**. Local verification used an isolated record database and a locally designated test editor. Production verification used the real app owner's refreshed CLI identity as editor plus independent contributor and outsider test-account sessions. No passwords or tokens are written to this repository or report.

1. Three identities signed in/connected separately and subscribed over real WebSockets.
2. Real platform file upload and anonymous byte-for-byte readback of the public demo image.
3. Contributor creation produced a pending entry received by contributor/editor on their existing sockets.
4. Retrying the same creation request returned the same record ID.
5. Contributor review spoofing and editor rejection with blank feedback were refused by the backend.
6. A raw forged WebSocket `core.put` changing review status was rejected by collection RBAC.
7. Revision status and feedback arrived on the contributor's existing socket without reconnect/reload.
8. The unrelated third account received no private submission and could not revise it.
9. The owner of a returned entry revised/resubmitted; editor approved; contributor received approval live.
10. A fresh connection reloaded the persisted approved record.
11. A real DeepSpace OpenAI integration call returned a bounded text suggestion.
12. Empty caption and a fake PNG with non-image bytes were rejected server-side.
13. A stored image above 5 MB was rejected at submission, independent of browser validation.
14. An anonymous review request received HTTP 401.

The workflow test uses a tiny original PNG fixture and fictional text. Invalid and oversized QA uploads are removed by the test; the valid image is retained for its referenced QA entry. The file gateway itself follows platform upload limits; the app's stricter 5 MB/signature rule is enforced before accepting a submission.

## Agent-operated browser checks

Using the in-app browser on the local production-build preview:

- Signed in as the test editor and observed the editor queue and connected-live indicator.
- Entered feedback, clicked Request changes, and observed the persisted needs-revision state and feedback.
- Clicked Approve and observed approved status and cleared feedback.
- Requested a real AI polish, observed the original text unchanged while the suggestion was displayed, then clicked Use suggestion and observed the input change to the suggestion.
- Inspected the actual layout screenshot.

The separate Playwright browser workflow is included but **not claimed as passed**: Chromium process startup was blocked by the execution sandbox. Its replacement verification used the real HTTP/WebSocket runtime, plus browser interactions listed above; it did not mock app auth, records or actions.

## Boundaries and remaining work

- Public image URLs are intentional for this demo; record permissions do not make images private.
- Review uses the built-in admin role. A real organization should separate editorial and administrative powers.
- AI's fact preservation is an instruction and a human-review responsibility, not a guaranteed property.
- No approved-content publishing website, multi-team support, invitations, durable AI usage limiting or orphan-upload cleanup.
- Applicant has not yet personally re-tested the agent-completed final features.
- The careers task-page submission must still be made by the applicant; deployment is not the same as submitting the application task.
