import { useState } from 'react'
import { Check, MessageSquare, Pencil } from 'lucide-react'
import { callAction } from '../lib/actions'
import { STATUS_LABELS, type Submission } from '../lib/submissions'

export default function SubmissionCard({
  id,
  data,
  author,
  createdAt,
  imageUrl,
  isEditor,
  canRevise,
  onRevise,
}: {
  id: string
  data: Submission
  author: string
  createdAt: string
  imageUrl: string
  isEditor: boolean
  canRevise: boolean
  onRevise: () => void
}) {
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function review(status: 'approved' | 'needs_revision') {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      await callAction('review', { recordId: id, status, feedback })
      setMessage(
        status === 'approved'
          ? 'Review saved: approved.'
          : 'Feedback sent to contributor.',
      )
      setFeedback('')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Review failed. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <article
      className="submission-card"
      data-testid="submission-card"
      data-record-id={id}
    >
      <div className="submission-photo">
        <img
          src={imageUrl}
          alt={`Team photo submitted by ${author}`}
          loading="lazy"
        />
      </div>
      <div className="submission-body">
        <div className="card-heading">
          <span className={`status-badge ${data.status}`}>
            {STATUS_LABELS[data.status] ?? data.status}
          </span>
          <time dateTime={createdAt}>
            {new Date(createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </time>
        </div>
        <h3>{author}</h3>
        <p className="caption-text">{data.caption}</p>
        {data.feedback && (
          <div className="editor-feedback">
            <MessageSquare size={16} />
            <div>
              <strong>Editor feedback</strong>
              <p>{data.feedback}</p>
            </div>
          </div>
        )}
        {canRevise && (
          <button className="secondary-button" onClick={onRevise}>
            <Pencil size={16} /> Revise submission
          </button>
        )}
        {isEditor && (
          <div className="review-controls">
            <label htmlFor={`feedback-${id}`}>
              Feedback <span>(required when requesting changes)</span>
            </label>
            <textarea
              id={`feedback-${id}`}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              maxLength={500}
              rows={2}
              disabled={busy}
              placeholder="Tell the contributor what to improve..."
            />
            <div className="button-row">
              <button
                className="primary-button"
                disabled={busy || data.status === 'approved'}
                onClick={() => review('approved')}
              >
                <Check size={16} /> Approve
              </button>
              <button
                className="secondary-button"
                disabled={busy || !feedback.trim()}
                onClick={() => review('needs_revision')}
              >
                <MessageSquare size={16} /> Request changes
              </button>
            </div>
          </div>
        )}
        <p role="status" className="inline-message">
          {message}
        </p>
      </div>
    </article>
  )
}
