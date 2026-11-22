import { useAuthProfileReady, useUsers } from 'deepspace'

export default function SettingsPage() {
  const { user } = useAuthProfileReady({ requireUser: true })
  const { users, setRole } = useUsers()
  return (
    <div className="workspace">
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">TEAM ACCESS</p>
          <h1>People behind the pages.</h1>
          <p className="intro">
            New sign-ins are contributors. Editors can review every submission.
          </p>
        </div>
      </header>
      {user?.role !== 'admin' ? (
        <p>Only editors can manage team roles.</p>
      ) : (
        <section className="compose-panel" style={{ maxWidth: 760 }}>
          <h2>Editor access</h2>
          <p className="muted" style={{ marginBlock: 12 }}>
            Ask a teammate to sign in to this app first. Then grant editor
            access here. The DeepSpace backend checks role changes; the app
            owner always remains an editor.
          </p>
          <ul style={{ display: 'grid', gap: 16, marginTop: 24 }}>
            {users.map((person) => (
              <li
                key={person.id}
                className="queue-heading"
                style={{
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <strong>{person.name || 'Team member'}</strong>
                  <p className="muted">{person.email}</p>
                  <p className="privacy-note">
                    {person.role === 'admin' ? 'Editor' : 'Contributor'}
                  </p>
                </div>
                {person.id !== user.id && (
                  <button
                    className="secondary-button"
                    onClick={() =>
                      setRole(
                        person.id,
                        person.role === 'admin' ? 'member' : 'admin',
                      )
                    }
                  >
                    {person.role === 'admin'
                      ? 'Make contributor'
                      : 'Make editor'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
