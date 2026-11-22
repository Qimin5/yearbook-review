import { useRef, useState } from 'react'
import {
  useAuthProfileReady,
  useR2Files,
  useQuery,
  useRecordContext,
  useUserLookup,
} from 'deepspace'
import { Camera, Check, ImagePlus, Sparkles, X } from 'lucide-react'
import { callAction } from '../../lib/actions'
import {
  STATUS_LABELS,
  type Submission,
  type ReviewStatus,
} from '../../lib/submissions'
import SubmissionCard from '../../components/SubmissionCard'

export default function HomePage() {
  const { isSignedIn, user } = useAuthProfileReady({ requireUser: true })
  const { upload, isUploading, getUrl } = useR2Files({ scope: 'app' })
  const { records, status, error } = useQuery<Submission>('submissions', {
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 100,
  })
  const { ready: roomReady } = useRecordContext()
  const { getName } = useUserLookup()
  const isEditor = user?.role === 'admin'
  const [filter, setFilter] = useState<ReviewStatus | 'all'>('all')
  const [caption, setCaption] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoKey, setPhotoKey] = useState('')
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPolishing, setIsPolishing] = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const [suggestionSource, setSuggestionSource] = useState('')
  const [aiMessage, setAiMessage] = useState<{
    kind: 'success' | 'error'
    text: string
  } | null>(null)
  const [revisingId, setRevisingId] = useState('')
  const requestId = useRef(crypto.randomUUID())
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const busy = isUploading || isSubmitting
  const visible = records.filter(
    (record) => filter === 'all' || record.data.status === filter,
  )

  function resetForm() {
    setCaption('')
    setPhoto(null)
    setPhotoKey('')
    setRevisingId('')
    setSuggestion('')
    setAiMessage(null)
    setFormError('')
    requestId.current = crypto.randomUUID()
    if (inputRef.current) inputRef.current.value = ''
  }

  async function uploadPhoto() {
    if (!photo || busy) return
    setFormError('')
    setMessage('')
    try {
      const result = await upload(photo, photo.name)
      if (!result.success || !result.key)
        throw new Error(result.error || 'Upload failed. Please try again.')
      setPhotoKey(result.key)
      setMessage('Photo uploaded. Add your caption, then submit for review.')
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Upload failed. Please try again.',
      )
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !photoKey || !caption.trim()) return
    setIsSubmitting(true)
    setFormError('')
    setMessage('')
    try {
      await callAction(revisingId ? 'revise' : 'submit', {
        photoKey,
        caption: caption.trim(),
        requestId: requestId.current,
        recordId: revisingId,
      })
      resetForm()
      setMessage(
        'Submission saved. Pending review. You can follow its status below.',
      )
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Submission failed. Your draft is still here.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function polish() {
    if (isPolishing || !caption.trim()) return
    const source = caption
    setIsPolishing(true)
    setAiMessage(null)
    setSuggestion('')
    try {
      const result = await callAction<{ suggestion: string }>('polish', {
        caption: source,
      })
      setSuggestion(result.suggestion)
      setSuggestionSource(source)
    } catch (error) {
      setAiMessage({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'AI is unavailable. You can submit your original text.',
      })
    } finally {
      setIsPolishing(false)
    }
  }

  return (
    <div className="workspace">
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">SNAPSHOTS / TEAM WORKSPACE</p>
          <h1>A team worth remembering.</h1>
          <p className="intro">
            One place for team photos, thoughtful bios, and a little editorial
            care.
          </p>
        </div>
        {isSignedIn && (
          <div className="workspace-meta">
            <span className="role-chip">
              {isEditor ? 'Editor workspace' : 'Contributor workspace'}
            </span>
            <span className="sync-label">
              {roomReady
                ? 'Live updates connected'
                : 'Reconnecting to live updates…'}
            </span>
          </div>
        )}
      </header>
      {!isSignedIn ? (
        <div className="signed-out-panel">
          <Camera size={40} />
          <h2>Your team starts here.</h2>
          <p>
            Use Sign in above to submit a photo and a short introduction.
            Editors review submissions before any future publication.
          </p>
        </div>
      ) : (
        <>
          <div className="workspace-grid">
            <aside className="compose-panel">
              <div className="panel-title">
                <ImagePlus size={21} />
                <h2>
                  {revisingId ? 'Revise your submission' : 'Add your snapshot'}
                </h2>
              </div>
              <p className="muted">
                Share a photo and a few words about yourself or your team.
              </p>
              <form ref={formRef} onSubmit={submit} className="submission-form">
                <label htmlFor="photo">Team photo</label>
                <div className="photo-picker">
                  {photoKey ? (
                    <img
                      className="upload-preview"
                      src={getUrl(photoKey)}
                      alt="Your uploaded team photo"
                    />
                  ) : (
                    <Camera size={30} />
                  )}
                  <input
                    ref={inputRef}
                    id="photo"
                    type="file"
                    accept="image/jpeg,image/png"
                    disabled={busy}
                    aria-describedby="photo-help"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      setPhoto(null)
                      setPhotoKey('')
                      setMessage('')
                      setFormError('')
                      if (!file) return
                      if (!['image/jpeg', 'image/png'].includes(file.type)) {
                        setFormError('Please choose a JPEG or PNG image.')
                        event.target.value = ''
                        return
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        setFormError(
                          'Please choose an image no larger than 5 MB.',
                        )
                        event.target.value = ''
                        return
                      }
                      setPhoto(file)
                    }}
                  />
                  <p id="photo-help">JPEG or PNG · up to 5 MB</p>
                </div>
                <p className="privacy-note">
                  Demo photos are publicly accessible by URL. Use fictional
                  members and images you can share publicly. Submission text is
                  restricted to its contributor and editors.
                </p>
                <button
                  className="secondary-button full-width"
                  type="button"
                  onClick={uploadPhoto}
                  disabled={!photo || busy || !!photoKey}
                >
                  {photoKey ? (
                    <>
                      <Check size={16} /> Photo uploaded
                    </>
                  ) : isUploading ? (
                    'Uploading photo…'
                  ) : (
                    'Upload photo'
                  )}
                </button>
                <div className="label-row">
                  <label htmlFor="caption">Short bio or photo caption</label>
                  <span>{caption.length}/500</span>
                </div>
                <textarea
                  id="caption"
                  value={caption}
                  onChange={(e) => {
                    setCaption(e.target.value)
                    setSuggestion('')
                    setAiMessage(null)
                  }}
                  maxLength={500}
                  rows={5}
                  disabled={busy}
                  placeholder="A few words about you, your role, or the moment in this photo."
                  required
                />
                <button
                  className="polish-button"
                  type="button"
                  onClick={polish}
                  disabled={!caption.trim() || isPolishing || busy}
                >
                  <Sparkles size={16} />
                  {isPolishing
                    ? 'Working on a suggestion…'
                    : 'Suggest a polish'}
                </button>
                <p className="privacy-note">
                  Optional. Only your text goes to AI. Check the facts before
                  choosing to use a suggestion.
                </p>
                {aiMessage && (
                  <p
                    className={
                      aiMessage.kind === 'error'
                        ? 'error-message'
                        : 'success-message'
                    }
                    role={aiMessage.kind === 'error' ? 'alert' : 'status'}
                  >
                    {aiMessage.text}
                  </p>
                )}
                {suggestion && (
                  <div className="suggestion-panel">
                    <strong>Suggested wording</strong>
                    <p>{suggestion}</p>
                    <div className="button-row">
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={busy || caption !== suggestionSource}
                        onClick={() => {
                          setCaption(suggestion)
                          setSuggestion('')
                          setAiMessage({
                            kind: 'success',
                            text: 'Suggestion applied. You can still edit it.',
                          })
                        }}
                      >
                        Use suggestion
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setSuggestion('')}
                      >
                        Keep original
                      </button>
                    </div>
                  </div>
                )}
                <button
                  className="primary-button full-width"
                  type="submit"
                  disabled={
                    !photoKey || !caption.trim() || busy || status !== 'ready'
                  }
                >
                  {isSubmitting
                    ? 'Saving submission…'
                    : revisingId
                      ? 'Resubmit for review'
                      : 'Submit for review'}
                </button>
                {revisingId && (
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      resetForm()
                      setMessage('Revision cancelled.')
                    }}
                  >
                    <X size={15} /> Cancel revision
                  </button>
                )}
                {formError && (
                  <p className="error-message" role="alert">
                    {formError}
                  </p>
                )}
                <p className="inline-message" role="status">
                  {message}
                </p>
              </form>
            </aside>
            <section className="queue-panel" aria-label="Submission list">
              <div className="queue-heading">
                <div>
                  <p className="eyebrow">
                    {isEditor ? 'THE EDITORIAL DESK' : 'YOUR CONTRIBUTIONS'}
                  </p>
                  <h2>{isEditor ? 'Review queue' : 'Your submissions'}</h2>
                </div>
                <span className="entry-count">{records.length} entries</span>
              </div>
              <p className="muted">
                {isEditor
                  ? 'Read each story. Approve it, or send a helpful note back.'
                  : 'Your review status and editor feedback update here automatically.'}
              </p>
              <div
                className="filter-tabs"
                role="group"
                aria-label="Filter submissions"
              >
                {(
                  ['all', 'pending', 'approved', 'needs_revision'] as const
                ).map((value) => (
                  <button
                    key={value}
                    className={filter === value ? 'active' : ''}
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {value === 'all' ? 'All' : STATUS_LABELS[value]}
                  </button>
                ))}
              </div>
              {status === 'loading' && (
                <p role="status" className="empty-state">
                  Loading submissions…
                </p>
              )}
              {status === 'error' && (
                <p role="alert" className="error-message">
                  {error ||
                    'Could not load submissions. Please reload to reconnect.'}
                </p>
              )}
              {status === 'ready' && visible.length === 0 && (
                <div className="empty-state">
                  <Camera size={32} />
                  <h3>
                    {filter === 'all'
                      ? 'A fresh page for your team.'
                      : 'No entries in this view.'}
                  </h3>
                  <p>
                    {filter === 'all'
                      ? 'Upload a photo and introduce yourself to get started.'
                      : 'Try another filter to see more submissions.'}
                  </p>
                </div>
              )}
              <div className="submission-list">
                {status === 'ready' &&
                  visible.map((record) => (
                    <SubmissionCard
                      key={record.recordId}
                      id={record.recordId}
                      data={record.data}
                      author={getName(record.createdBy) || 'Team member'}
                      createdAt={record.createdAt}
                      imageUrl={getUrl(record.data.photoKey)}
                      isEditor={isEditor}
                      canRevise={
                        record.createdBy === user?.id &&
                        record.data.status === 'needs_revision'
                      }
                      onRevise={() => {
                        setRevisingId(record.recordId)
                        setCaption(record.data.caption)
                        setPhoto(null)
                        setPhotoKey(record.data.photoKey)
                        setMessage(
                          'Update your text or upload a replacement photo, then resubmit.',
                        )
                        setFormError('')
                        setSuggestion('')
                        setAiMessage(null)
                        if (inputRef.current) inputRef.current.value = ''
                        formRef.current?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        })
                      }}
                    />
                  ))}
              </div>
              {records.length >= 100 && (
                <p className="privacy-note">
                  Showing the latest 100 visible submissions.
                </p>
              )}
            </section>
          </div>
        </>
      )}
      <footer className="workspace-footer">
        <span>Snapshots / Yearbook Review</span>
        <span>A single-team demo. Approval does not publish a photo.</span>
      </footer>
    </div>
  )
}
