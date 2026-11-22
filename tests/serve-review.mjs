import { servePreview } from 'deepspace/testing'
servePreview({
  appDir: new URL('..', import.meta.url),
  port: process.env.QA_PORT || 5188,
  owner: 'Yearbook Editor',
  skipBuild: true,
})
