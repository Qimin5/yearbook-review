export type ReviewStatus = 'pending' | 'approved' | 'needs_revision'
export type Submission = {
  photoKey: string
  caption: string
  status: ReviewStatus
  feedback: string
  reviewedBy?: string
  reviewedAt?: string
}
export const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  needs_revision: 'Needs revision',
}
