import { Link } from 'react-router-dom'
import { Camera, Check, MessageSquare, Sparkles } from 'lucide-react'
import { Seo } from '../components/Seo'
import { seo } from '../seo'

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="workspace">
        <header className="workspace-heading">
          <span className="role-chip">SNAPSHOTS / YEARBOOK REVIEW</span>
          <Link className="secondary-button" to="/home">
            Open workspace
          </Link>
        </header>
        <div
          className="workspace-grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            alignItems: 'center',
            paddingBlock: '48px',
          }}
        >
          <div>
            <p className="eyebrow">A LITTLE EDITORIAL CARE</p>
            <h1 style={{ fontSize: 'clamp(2.7rem, 6vw, 4.6rem)' }}>
              Every team has
              <br />a story to tell.
            </h1>
            <p className="intro">
              Collect the faces and words behind your team. Submit a photo and a
              short bio, get thoughtful feedback, and follow each review as it
              happens.
            </p>
            <Link
              to="/home"
              className="primary-button"
              style={{ marginTop: 28 }}
            >
              Enter the app
            </Link>
            <p className="privacy-note" style={{ marginTop: 16 }}>
              One team. Fictional members. Publicly shareable demo photos.
            </p>
          </div>
          <div className="compose-panel" style={{ padding: 32 }}>
            <div className="panel-title">
              <Camera size={24} />
              <h2>From snapshot to ready.</h2>
            </div>
            <div style={{ display: 'grid', gap: 24, marginTop: 28 }}>
              <div>
                <h3 className="panel-title">
                  <Camera size={18} /> Share your snapshot
                </h3>
                <p className="muted">
                  Sign in, upload a photo, and write a few words in your own
                  voice.
                </p>
              </div>
              <div>
                <h3 className="panel-title">
                  <MessageSquare size={18} /> Make room for feedback
                </h3>
                <p className="muted">
                  An editor approves your entry or sends a clear note about what
                  to revise.
                </p>
              </div>
              <div>
                <h3 className="panel-title">
                  <Check size={18} /> Stay in the loop
                </h3>
                <p className="muted">
                  Review decisions arrive live, without refreshing the page.
                </p>
              </div>
              <div>
                <h3 className="panel-title">
                  <Sparkles size={18} /> Keep your voice
                </h3>
                <p className="muted">
                  Optional AI suggests wording. You decide what stays.
                </p>
              </div>
            </div>
          </div>
        </div>
        <footer className="workspace-footer">
          <span>Yearbook Review · Inspired by the Snapshots yearbook team</span>
          <span>
            Approval does not publish a website. Demo photo URLs are public.
          </span>
        </footer>
      </div>
    </>
  )
}
