import { appFiles, resolveAppMembership } from 'deepspace/worker'
import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { polishCaption } from './polish'

const fail = (error: string) => ({ success: false as const, error })

/** Validate the stored bytes too: browser accept/maxLength are only UX hints. */
async function validatePhoto(
  env: Env,
  userId: string,
  key: unknown,
): Promise<string | null> {
  if (
    typeof key !== 'string' ||
    !key.startsWith(`apps/${env.DEEPSPACE_APP_ID}/`) ||
    key.includes('/users/') ||
    key.includes('..')
  ) {
    return 'Choose an uploaded photo from this app.'
  }
  try {
    const response = await appFiles(env, { scope: 'app', userId }).download(key)
    if (!response.ok || !response.body)
      return 'The uploaded photo could not be read.'
    const reader = response.body.getReader()
    let size = 0
    let first: number[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (first.length < 8)
        first = [...first, ...value.slice(0, 8 - first.length)]
      if (size > 5 * 1024 * 1024) {
        await reader.cancel()
        return 'Please choose an image no larger than 5 MB.'
      }
    }
    const jpeg = first[0] === 255 && first[1] === 216 && first[2] === 255
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
      (byte, i) => first[i] === byte,
    )
    return size > 0 && (jpeg || png)
      ? null
      : 'The stored file must be a JPEG or PNG image.'
  } catch {
    return 'Could not verify the uploaded photo. Please try again.'
  }
}

function captionValue(value: unknown): string | null {
  return typeof value === 'string' &&
    value.trim().length > 0 &&
    value.trim().length <= 500
    ? value.trim()
    : null
}

export const actions: Record<string, ActionHandler<Env>> = {
  submit: async ({ userId, params, tools, env }) => {
    const membership = await resolveAppMembership(env, userId)
    if (!membership?.member || membership.role === 'viewer')
      return fail('Sign in as a contributor first.')
    const caption = captionValue(params.caption)
    if (!caption) return fail('Write a caption between 1 and 500 characters.')
    if (
      typeof params.requestId !== 'string' ||
      !/^[a-zA-Z0-9-]{16,64}$/.test(params.requestId)
    )
      return fail('Invalid submission request.')
    // A retry gets the same record; it cannot overwrite an existing review.
    const recordId = `submission-${userId}-${params.requestId}`
    const existing = await tools.get('submissions', recordId)
    if (existing.success) return { success: true, data: { recordId } }
    const error = await validatePhoto(env, userId, params.photoKey)
    if (error) return fail(error)
    return tools.create(
      'submissions',
      { photoKey: params.photoKey, caption, status: 'pending', feedback: '' },
      recordId,
    )
  },

  review: async ({ userId, params, tools, env }) => {
    // Never trust a role or owner ID sent by the browser. Actions bypass RBAC.
    const membership = await resolveAppMembership(env, userId)
    if (!membership?.member || membership.role !== 'admin')
      return fail('Only an editor can review submissions.')
    if (typeof params.recordId !== 'string') return fail('Choose a submission.')
    if (params.status !== 'approved' && params.status !== 'needs_revision')
      return fail('Invalid review status.')
    const feedback =
      typeof params.feedback === 'string' ? params.feedback.trim() : ''
    if (feedback.length > 500)
      return fail('Keep feedback within 500 characters.')
    if (params.status === 'needs_revision' && !feedback)
      return fail('Write feedback before requesting changes.')
    const current = await tools.get('submissions', params.recordId)
    if (!current.success) return fail('Submission not found.')
    return tools.update('submissions', params.recordId, {
      status: params.status,
      feedback: params.status === 'needs_revision' ? feedback : '',
      reviewedBy: userId,
      reviewedAt: new Date().toISOString(),
    })
  },

  revise: async ({ userId, params, tools, env }) => {
    if (typeof params.recordId !== 'string') return fail('Choose a submission.')
    const current = await tools.get('submissions', params.recordId)
    if (!current.success || current.data.record.createdBy !== userId)
      return fail('You can only revise your own submission.')
    if (current.data.record.data.status !== 'needs_revision')
      return fail('Only submissions needing changes can be resubmitted.')
    const caption = captionValue(params.caption)
    if (!caption) return fail('Write a caption between 1 and 500 characters.')
    const error = await validatePhoto(env, userId, params.photoKey)
    if (error) return fail(error)
    return tools.update('submissions', params.recordId, {
      photoKey: params.photoKey,
      caption,
      status: 'pending',
      feedback: '',
      reviewedBy: '',
      reviewedAt: '',
    })
  },

  polish: async ({ userId, params, tools, env }) => {
    const membership = await resolveAppMembership(env, userId)
    if (!membership?.member) return fail('Sign in before polishing text.')
    const caption = captionValue(params.caption)
    if (!caption) return fail('Write between 1 and 500 characters first.')
    return polishCaption(caption, tools.integration)
  },
}
