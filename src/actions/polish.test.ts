import { describe, expect, it, vi } from 'vitest'
import { polishCaption } from './polish'
import type { ActionTools } from 'deepspace/worker'

describe('text-only AI integration boundary', () => {
  it('sends only source text and returns a suggestion without replacing it', async () => {
    const source = 'Alex help take photos.'
    const integration = vi
      .fn()
      .mockResolvedValue({
        success: true,
        data: {
          choices: [{ message: { content: 'Alex helps take photos.' } }],
        },
      })
    expect(
      await polishCaption(source, integration as ActionTools['integration']),
    ).toEqual({
      success: true,
      data: { suggestion: 'Alex helps take photos.' },
    })
    const [endpoint, body] = integration.mock.calls[0]
    expect(endpoint).toBe('openai/chat-completion')
    expect(Object.keys(body).sort()).toEqual([
      'max_tokens',
      'messages',
      'model',
      'temperature',
    ])
    expect(body.messages[1]).toEqual({ role: 'user', content: source })
    expect(source).toBe('Alex help take photos.')
  })
  it.each(['refusal', 'network'])(
    'keeps the original-text fallback on %s failure',
    async (kind) => {
      const integration =
        kind === 'network'
          ? vi.fn().mockRejectedValue(new Error('offline'))
          : vi
              .fn()
              .mockResolvedValue({
                success: false,
                error: 'Insufficient credits',
              })
      const result = await polishCaption(
        'Alex takes photos.',
        integration as ActionTools['integration'],
      )
      expect(result.success).toBe(false)
      expect(result.error).toContain('submit your original text')
    },
  )
  it('rejects suggestions beyond the form limit', async () => {
    const integration = vi
      .fn()
      .mockResolvedValue({
        success: true,
        data: { choices: [{ message: { content: 'x'.repeat(501) } }] },
      })
    const result = await polishCaption(
      'Alex takes photos.',
      integration as ActionTools['integration'],
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('unchanged')
  })
})
