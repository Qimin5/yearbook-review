import { getAuthToken } from 'deepspace'

/** Same-origin action call with the signed-in user's token, never an owner token. */
export async function callAction<T>(
  name: string,
  params: Record<string, unknown>,
): Promise<T> {
  const token = await getAuthToken()
  if (!token) throw new Error('Please sign in again.')
  const response = await fetch(`/api/actions/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(45000),
  })
  const result = (await response.json()) as {
    success?: boolean
    data?: T
    error?: string
  }
  if (!response.ok || !result.success)
    throw new Error(result.error || 'Could not save. Please try again.')
  return result.data as T
}
