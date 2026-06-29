import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setSyncConfig, clearSyncConfig, loadFromGist } from '../store/syncSlice'
import { fetchGist } from '../engine/gistSync'

const fmtDate = iso => iso
  ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  : null

export default function SyncSettings({ onClose }) {
  const dispatch = useDispatch()
  const sync = useSelector(s => s.sync)
  const [gistId, setGistId] = useState(sync.gistId)
  const [pat, setPat] = useState(sync.pat)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const handleSave = () => {
    dispatch(setSyncConfig({ gistId, pat }))
    dispatch(loadFromGist())
    onClose()
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const data = await fetchGist(gistId, pat)
      setTestResult({
        ok: true,
        msg: `Connected — ${data.history?.length ?? 0} history records, ${data.savedClients?.length ?? 0} saved clients.`,
      })
    } catch (e) {
      setTestResult({ ok: false, msg: e.message })
    }
    setTesting(false)
  }

  const handleDisconnect = () => {
    dispatch(clearSyncConfig())
    onClose()
  }

  const STATUS_COLOR = { synced: '#22C55E', syncing: '#F59E0B', error: '#EF4444', idle: '#94A3B8' }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sync-modal">
        <div className="sync-modal-head">
          <div>
            <div className="sync-modal-title">Cloud Sync</div>
            <div className="sync-modal-sub">Share client data across devices via a GitHub Gist</div>
          </div>
          <button className="modal-close" onClick={onClose} style={{ top: 14, right: 14 }}>✕</button>
        </div>

        <div className="sync-modal-body">
          {sync.gistId && (
            <div className="sync-status-bar">
              <span className="sync-dot" style={{ background: STATUS_COLOR[sync.status] || STATUS_COLOR.idle }} />
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {sync.status === 'synced'  && `Synced · ${fmtDate(sync.lastSync)}`}
                {sync.status === 'syncing' && 'Syncing…'}
                {sync.status === 'error'   && `Error: ${sync.errorMsg}`}
                {sync.status === 'idle'    && 'Not synced yet — save to start'}
              </span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Gist ID</label>
            <input
              className="form-input"
              placeholder="e.g. a1b2c3d4e5f6abc7d8e9..."
              value={gistId}
              onChange={e => { setGistId(e.target.value.trim()); setTestResult(null) }}
            />
            <div className="form-hint">From your Gist URL: gist.github.com/user/<strong>THIS_PART</strong></div>
          </div>

          <div className="form-group">
            <label className="form-label">GitHub Personal Access Token</label>
            <input
              className="form-input"
              type="password"
              placeholder="ghp_..."
              value={pat}
              onChange={e => { setPat(e.target.value.trim()); setTestResult(null) }}
            />
            <div className="form-hint">
              Create at <strong>github.com/settings/tokens</strong> — enable <code>gist</code> scope only
            </div>
          </div>

          {testResult && (
            <div className={`sync-test-result ${testResult.ok ? 'ok' : 'err'}`}>{testResult.msg}</div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={!gistId || !pat}>
              Save &amp; Sync
            </button>
            <button className="btn btn-outline" onClick={handleTest} disabled={!gistId || !pat || testing}>
              {testing ? 'Testing…' : 'Test Connection'}
            </button>
            {sync.gistId && (
              <button
                className="btn btn-outline"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
            )}
          </div>

          <details className="sync-setup-guide">
            <summary>First time? Quick setup guide</summary>
            <ol className="sync-guide-steps">
              <li>
                Go to <strong>gist.github.com</strong> → New secret Gist<br />
                Filename: <code>sales-agent-data.json</code><br />
                Content: <code>{`{"history":[],"savedClients":[]}`}</code><br />
                Click <strong>Create secret Gist</strong>
              </li>
              <li>Copy the Gist ID from the URL (the alphanumeric string after your username)</li>
              <li>
                Go to <strong>github.com/settings/tokens</strong> → Generate new token (classic)<br />
                Check <strong>gist</strong> scope only → Generate → copy the token
              </li>
              <li>Paste both above → <strong>Test Connection</strong> → <strong>Save &amp; Sync</strong></li>
            </ol>
          </details>
        </div>
      </div>
    </div>
  )
}
