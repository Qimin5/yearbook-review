import { useState } from 'react'
import { useAuthProfileReady, useR2Files } from 'deepspace'
import type { R2FileInfo } from 'deepspace'
import { APP_NAME } from '../../constants'

export default function HomePage() {
  const { isSignedIn } = useAuthProfileReady({ requireUser: true })
  const { upload, isUploading, list, getUrl } = useR2Files({
    scope: 'app',
  })

  const [caption, setCaption] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState('')
  const [photoKey, setPhotoKey] = useState('')
  const [uploadMessage, setUploadMessage] = useState('')

  const [uploadedFiles, setUploadedFiles] = useState<R2FileInfo[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [filesMessage, setFilesMessage] = useState('')

  async function handleUpload() {
    if (!photo || isUploading || photoKey) return

    setUploadMessage('')

    try {
      const result = await upload(photo, photo.name)

      if (!result.success || !result.key) {
        setUploadMessage(result.error || 'Upload failed. Please try again.')
        return
      }

      setPhotoKey(result.key)
      setUploadMessage('Photo uploaded successfully.')
    } catch {
      setUploadMessage('Upload failed. Please try again.')
    }
  }

  async function handleCheckFiles() {
    if (isLoadingFiles) return

    setIsLoadingFiles(true)
    setFilesMessage('')

    try {
      const files = await list()
      setUploadedFiles(files)
      setFilesMessage(`Found ${files.length} stored files.`)
    } catch {
      setUploadedFiles([])
      setFilesMessage('Could not load stored files. Please try again.')
    } finally {
      setIsLoadingFiles(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-background px-6 py-10 text-center text-foreground">
      <h1 className="text-2xl font-semibold">{APP_NAME}</h1>

      {isSignedIn ? (
        <div className="flex w-full max-w-md flex-col gap-2 text-left">
          <label htmlFor="photo">Team photo</label>
          <p id="photo-help" className="text-sm text-muted-foreground">
            JPEG or PNG, up to 5 MB. Use photos you can share publicly.
          </p>

          <input
            id="photo"
            type="file"
            accept="image/jpeg,image/png"
            disabled={isUploading}
            aria-describedby="photo-help photo-error"
            onChange={(event) => {
              const file = event.target.files?.[0]

              setPhoto(null)
              setPhotoKey('')
              setPhotoError('')
              setUploadMessage('')

              if (!file) return

              if (!['image/jpeg', 'image/png'].includes(file.type)) {
                setPhotoError('Please choose a JPEG or PNG image.')
                event.target.value = ''
                return
              }

              if (file.size > 5 * 1024 * 1024) {
                setPhotoError('Please choose an image no larger than 5 MB.')
                event.target.value = ''
                return
              }

              setPhoto(file)
            }}
          />

          {photo && (
            <p className="text-sm text-muted-foreground">
              Selected: {photo.name}
            </p>
          )}

          <p id="photo-error" role="alert" className="text-sm text-red-500">
            {photoError}
          </p>

          <button
            type="button"
            onClick={handleUpload}
            disabled={!photo || isUploading || !!photoKey}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Upload photo'}
          </button>

          <p role="status" className="text-sm text-muted-foreground">
            {uploadMessage}
          </p>

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

          <section className="mt-6 flex flex-col gap-3 border-t border-border pt-4">
            <h2 className="text-lg font-semibold">Stored photos</h2>
            <p className="text-sm text-muted-foreground">
              Demo check: these are uploaded files, not submitted entries.
              App-scope photo URLs are publicly accessible.
            </p>

            <button
              type="button"
              onClick={handleCheckFiles}
              disabled={isLoadingFiles}
              className="rounded-md border border-border px-4 py-2 disabled:opacity-50"
            >
              {isLoadingFiles ? 'Loading...' : 'Check stored photos'}
            </button>

            <p role="status" className="text-sm text-muted-foreground">
              {filesMessage}
            </p>

            {uploadedFiles.map((file) => (
              <div
                key={file.key}
                className="rounded-md border border-border p-3"
              >
                <p className="break-all text-sm">
                  {file.originalName ?? file.key}
                </p>
                <img
                  src={getUrl(file)}
                  alt={file.originalName ?? 'Uploaded team photo'}
                  loading="lazy"
                  className="mt-2 max-h-48 max-w-full rounded-md object-contain"
                />
              </div>
            ))}
          </section>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Sign in to submit your team photo and bio.
        </p>
      )}
    </div>
  )
}