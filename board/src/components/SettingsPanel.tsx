import { useState, useEffect } from 'react';
import { api } from '../api';

export default function SettingsPanel({ projectId }: { projectId: string }) {
  const [appId, setAppId] = useState('');
  const [iosSecret, setIosSecret] = useState('');
  const [androidPkg, setAndroidPkg] = useState('');
  const [saved, setSaved] = useState(false);

  // Signing
  const [identities, setIdentities] = useState<{ id: string; name: string; team: string }[]>([]);
  const [team, setTeam] = useState('');
  const [bundleId, setBundleId] = useState('');
  const [androidPackage, setAndroidPackage] = useState('');
  const [signingSaved, setSigningSaved] = useState(false);

  const p = api.project(projectId);

  useEffect(() => {
    p.settings().then(({ sdkConfig }) => {
      if (sdkConfig) {
        setAppId(sdkConfig.appId || '');
        setIosSecret(sdkConfig.iosSecret || '');
        setAndroidPkg(sdkConfig.androidPkg || '');
      }
    });
    api.signingIdentities().then(setIdentities);
    p.signing().then(s => {
      setTeam(s.team || '');
      setBundleId(s.bundleId || '');
      setAndroidPackage(s.androidPackage || '');
    });
  }, [projectId]);

  const save = async () => {
    await p.updateSettings({ appId, iosSecret, androidPkg });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveSigning = async () => {
    await p.updateSigning(team, bundleId, androidPackage);
    setSigningSaved(true);
    setTimeout(() => setSigningSaved(false), 2000);
  };

  return (
    <div className="grid-2">
      <div className="panel">
        <div className="panel-header">SDK Configuration</div>
        <div className="panel-body">
          <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
            These values are used by agents when building the app. Edit anytime — agents will use the latest values on their next run.
          </p>
          <div className="form-field">
            <label>App ID / Bundle ID</label>
            <input value={appId} onChange={e => setAppId(e.target.value)} placeholder="com.mycompany.myapp" />
          </div>
          <div className="form-field">
            <label>iOS Shared Secret</label>
            <input value={iosSecret} onChange={e => setIosSecret(e.target.value)} placeholder="App Store shared secret (receipt validation)" />
          </div>
          <div className="form-field">
            <label>Android Package</label>
            <input value={androidPkg} onChange={e => setAndroidPkg(e.target.value)} placeholder="com.mycompany.myapp" />
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-blue" onClick={save}>Save</button>
            {saved && <span style={{ fontSize: 11, color: 'var(--green)' }}>Saved!</span>}
          </div>
        </div>
      </div>

      <div>
        <div className="panel">
          <div className="panel-header">App Identity & Signing (Expo)</div>
          <div className="panel-body">
            <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
              These are written to <code>app.json</code> under <code>expo.ios</code> / <code>expo.android</code>.
              After saving, <code>npx expo run:ios</code> / <code>run:android</code> will auto-prebuild the native project with the new IDs.
            </p>
            <div className="form-field">
              <label>Apple Development Team</label>
              <select value={team} onChange={e => setTeam(e.target.value)}
                style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border2)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, width: '100%' }}>
                <option value="">None (Simulator only)</option>
                {identities.map(i => (
                  <option key={i.team} value={i.team}>{i.name} ({i.team})</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>iOS Bundle Identifier</label>
              <input value={bundleId} onChange={e => setBundleId(e.target.value)} placeholder="com.yourname.appname" />
            </div>
            <div className="form-field">
              <label>Android Package</label>
              <input value={androidPackage} onChange={e => setAndroidPackage(e.target.value)} placeholder="com.yourname.appname" />
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn btn-blue" onClick={saveSigning}>Save</button>
              {signingSaved && <span style={{ fontSize: 11, color: 'var(--green)' }}>Saved!</span>}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">Project Info</div>
          <div className="panel-body" style={{ fontSize: 11, color: 'var(--text2)' }}>
            <p><strong>ID:</strong> {projectId}</p>
            <p style={{ marginTop: 4 }}><strong>Data:</strong> data/projects/{projectId}/</p>
            <p style={{ marginTop: 4 }}><strong>Workspace:</strong> workspace/{projectId}/</p>
          </div>
        </div>
      </div>
    </div>
  );
}
