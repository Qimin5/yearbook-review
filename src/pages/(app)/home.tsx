/**
 * Placeholder home page — replace this with the app's real home.
 *
 * This is intentionally unstyled scaffolding, not a design to build on.
 * Design the app's own look (layout, theme tokens, typography) from your
 * product's point of view instead of extending this page.
 */

import { useAuthProfileReady } from 'deepspace'
import { APP_NAME } from '../../constants'
import { useState } from 'react'

export default function HomePage() {
  const { isSignedIn, user } = useAuthProfileReady({ requireUser: true })
  const [caption, setCaption] = useState('')

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
      <h1 className="text-2xl font-semibold">{APP_NAME}</h1>
      {isSignedIn && (
  <div className="flex w-full max-w-md flex-col gap-2 text-left">
    <label htmlFor="caption">Short bio or photo caption</label>
    <textarea
      id="caption"
      value={caption}
      onChange={(event) => setCaption(event.target.value)}
      maxLength={500}
      rows={5}
      className="rounded-md border border-border bg-background p-3 text-foreground"
    />
    <p className="text-sm text-muted-foreground">
      {caption.length}/500
    </p>
  </div>
)}
    </div>
  )
}
