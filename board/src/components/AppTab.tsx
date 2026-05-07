import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

interface Props {
  projectId: string;
  files: string[];
  viewFile: (path: string) => void;
}

interface BuildLog {
  title: string;
  output: string[];
  running: boolean;
  exitCode: number | null;
}

interface Device {
  id: string;
  name: string;
  platform: string;
  model: string;
  connected: boolean;
}

export default function AppTab({ projectId, files, viewFile }: Props) {
  const [appInfo, setAppInfo] = useState<{ path: string | null; relativePath: string | null; exists: boolean; prebuilt: boolean; hasAppJson: boolean } | null>(null);
  const [actionMsg, setActionMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [buildLog, setBuildLog] = useState<BuildLog | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const logContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const p = api.project(projectId);

  useEffect(() => { p.appInfo().then(setAppInfo); }, [projectId]);
  useEffect(() => { api.devices().then(setDevices); }, [projectId]);

  // Poll build log
  useEffect(() => {
    const poll = () => {
      p.buildLog().then(log => {
        if (log.title) {
          setBuildLog(log);
          if (!log.running && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = undefined;
          }
        }
      }).catch(() => {});
    };

    poll();
    pollRef.current = setInterval(poll, 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [projectId]);

  // Auto-scroll log (inside container only)
  useEffect(() => {
    const el = logContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [buildLog?.output.length]);

  const doAction = async (action: () => Promise<unknown>, msg: string) => {
    setActionMsg({ text: msg });
    setBuildLog(null);
    try {
      const res = await action() as any;
      if (res?.error) {
        setActionMsg({ text: `${msg} — ${res.error}`, error: true });
      } else {
        setActionMsg({ text: msg + ' — Started' });
        setTimeout(() => setActionMsg(null), 3000);
        // Start polling
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => {
          p.buildLog().then(log => {
            if (log.title) {
              setBuildLog(log);
              if (!log.running && pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = undefined;
              }
            }
          }).catch(() => {});
        }, 1500);
      }
    } catch (e: any) {
      const detail = e?.message || String(e);
      setActionMsg({ text: `${msg} — Error: ${detail}`, error: true });
    }
  };

  const clearLog = () => {
    p.clearBuildLog();
    setBuildLog(null);
  };

  const codeFiles = files.filter(f => f.startsWith('code/'));
  const testFiles = files.filter(f => f.startsWith('tests/'));
  const specFiles = files.filter(f => f.startsWith('specs/') || f.startsWith('designs/'));

  return (
    <div>
      {/* Action message */}
      {actionMsg && (
        <div style={{
          background: actionMsg.error ? '#1c1017' : '#172554',
          border: `1px solid ${actionMsg.error ? '#dc2626' : '#2563eb'}`,
          borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: 11,
          color: actionMsg.error ? '#fca5a5' : '#38bdf8',
          display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)}
            style={{ background: 'none', border: 'none', color: actionMsg.error ? '#fca5a5' : '#38bdf8', cursor: 'pointer', fontSize: 14, padding: 0, flexShrink: 0 }}>
            &times;
          </button>
        </div>
      )}

      {/* Build Log */}
      {buildLog && (
        <div className="panel" style={{ marginBottom: 12 }}>
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              {buildLog.title}
              {buildLog.running && <span style={{ color: '#facc15', marginLeft: 8, fontSize: 10 }}>Running...</span>}
              {!buildLog.running && buildLog.exitCode === 0 && <span style={{ color: '#86efac', marginLeft: 8, fontSize: 10 }}>Success</span>}
              {!buildLog.running && buildLog.exitCode !== null && buildLog.exitCode !== 0 && <span style={{ color: '#fca5a5', marginLeft: 8, fontSize: 10 }}>Failed (exit {buildLog.exitCode})</span>}
            </span>
            <span style={{ display: 'flex', gap: 6 }}>
              {buildLog.running && (
                <button
                  onClick={() => p.stopBuild().then(() => p.buildLog().then(setBuildLog))}
                  className="btn btn-sm"
                  style={{ fontSize: 10, background: '#431407', color: '#fdba74', border: '1px solid #92400e' }}
                >Stop</button>
              )}
              {!buildLog.running && (
                <button onClick={clearLog} className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}>Clear</button>
              )}
            </span>
          </div>
          <div ref={logContainerRef} style={{
            background: '#0a0a0a', borderRadius: '0 0 6px 6px', padding: '8px 12px',
            maxHeight: 350, overflowY: 'auto', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5,
          }}>
            {buildLog.output.map((line, i) => {
              // Skip noisy xcodebuild compiler flag dumps
              const isNoise = /^error\s+(export\s+\w+\\?=|\\?=non-modular|[-\w]+(\\=|-W))/.test(line) || /^error\s+['"]?-[A-Z]/.test(line);
              if (isNoise) return null;
              const isRealError = /Unable to resolve|could not be found|Failed to build|exited with error|Provisioning profile|DEVELOPMENT_TEAM|No signing certificate/i.test(line);
              const isError = isRealError || (/^error\s/i.test(line) && !isNoise);
              const isWarning = /warning|warn|\[!\]/i.test(line);
              const isSuccess = /success|installed on|done|complete/i.test(line);
              return (
                <div key={i} style={{
                  color: isError ? '#fca5a5' : isWarning ? '#fdba74' : isSuccess ? '#86efac' : '#a1a1aa',
                  fontWeight: isRealError ? 700 : 'normal',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>
                  {line}
                </div>
              );
            })}
            {buildLog.output.length === 0 && <div style={{ color: '#525252' }}>Waiting for output...</div>}
          </div>
        </div>
      )}

      {/* Build & Run buttons */}
      <div className="panel">
        <div className="panel-header">Build & Run</div>
        <div className="panel-body">
          {!appInfo?.exists ? (
            <p style={{ color: 'var(--text4)', fontSize: 12 }}>
              No React Native project found yet. Developer agent needs to create the app first.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
                App at: <code style={{ color: 'var(--text)', cursor: 'pointer' }} onClick={() => navigator.clipboard.writeText(appInfo.path!)}>{appInfo.relativePath || appInfo.path}</code>
              </p>

              {/* Device Picker */}
              {devices.length > 0 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', flexShrink: 0 }}>Target Device:</span>
                  <select value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)}
                    style={{ flex: 1, padding: '5px 8px', borderRadius: 4, border: '1px solid var(--border2)', background: 'var(--bg)', color: 'var(--text)', fontSize: 11 }}>
                    <option value="">Auto (first available)</option>
                    {devices.filter(d => d.connected).map(d => (
                      <option key={d.id} value={d.id}>
                        {d.platform === 'ios' ? '🍎' : '🤖'} {d.name}{d.model ? ` — ${d.model}` : ''}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}
                    onClick={() => api.devices().then(setDevices)}>
                    Refresh
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: '#818cf8', background: '#1e1b4b', border: '1px solid #3730a3', borderRadius: 4, padding: '2px 6px' }}>
                  EXPO
                </div>
                {appInfo.prebuilt && (
                  <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, color: '#86efac', background: '#052e16', border: '1px solid #16a34a', borderRadius: 4, padding: '2px 6px' }}>
                    PREBUILT (ios/ + android/ present)
                  </div>
                )}
              </div>

              {/* Action rows with button + command */}
              {[
                { label: 'Install Dependencies', btn: { bg: '#1e293b', color: 'var(--text2)', border: 'var(--border2)' },
                  action: () => doAction(() => p.installDeps(), 'Installing...'),
                  cmd: `cd "${appInfo.path}" && npm install` },
                { label: '▶ Run iOS Simulator', btn: { bg: '#172554', color: '#60a5fa', border: '#2563eb' },
                  action: () => doAction(() => p.runIos(), 'Running iOS Simulator...'),
                  cmd: `cd "${appInfo.path}" && npx expo run:ios` },
                { label: '📱 Run iOS Device', btn: { bg: '#172554', color: '#93c5fd', border: '#1d4ed8' },
                  action: () => doAction(() => p.runIosDevice(selectedDevice || undefined), `Running on iOS device${selectedDevice ? ': ' + selectedDevice : ''}...`),
                  cmd: `cd "${appInfo.path}" && npx expo run:ios ${selectedDevice ? '--device "' + selectedDevice + '"' : '--device'}` },
                { label: '▶ Run Android Emulator', btn: { bg: '#052e16', color: '#86efac', border: '#16a34a' },
                  action: () => doAction(() => p.runAndroid(), 'Running Android Emulator...'),
                  cmd: `cd "${appInfo.path}" && npx expo run:android` },
                { label: '📱 Run Android Device', btn: { bg: '#052e16', color: '#bbf7d0', border: '#15803d' },
                  action: () => doAction(() => p.runAndroidDevice(selectedDevice || undefined), `Running on Android device${selectedDevice ? ': ' + selectedDevice : ''}...`),
                  cmd: `cd "${appInfo.path}" && npx expo run:android ${selectedDevice ? '--device "' + selectedDevice + '"' : '--device'}` },
                { label: '🏗️  Prebuild', btn: { bg: '#3f0f0f', color: '#fca5a5', border: '#b91c1c' },
                  action: () => doAction(() => p.prebuild(false), 'Running expo prebuild...'),
                  cmd: `cd "${appInfo.path}" && npx expo prebuild` },
                { label: '🧹 Prebuild (clean)', btn: { bg: '#3f0f0f', color: '#fecaca', border: '#dc2626' },
                  action: () => doAction(() => p.prebuild(true), 'Running expo prebuild --clean...'),
                  cmd: `cd "${appInfo.path}" && npx expo prebuild --clean` },
                { label: 'Build APK (release)', btn: { bg: '#431407', color: '#fdba74', border: '#92400e' },
                  action: () => doAction(() => p.buildApk(), 'Building Android release APK...'),
                  cmd: `cd "${appInfo.path}" && npx expo run:android --variant release` },
                { label: 'Build iOS (release)', btn: { bg: '#1e1b4b', color: '#a5b4fc', border: '#3730a3' },
                  action: () => doAction(() => p.buildIos(), 'Building iOS release...'),
                  cmd: `cd "${appInfo.path}" && npx expo run:ios --configuration Release` },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <button className="btn" onClick={item.action}
                    disabled={buildLog?.running}
                    style={{ background: item.btn.bg, color: item.btn.color, border: `1px solid ${item.btn.border}`, padding: '8px 16px', minWidth: 160, flexShrink: 0, opacity: buildLog?.running ? 0.5 : 1 }}>
                    {item.label}
                  </button>
                  <code style={{
                    flex: 1, fontSize: 10, color: 'var(--text4)', background: 'var(--bg)', padding: '6px 8px',
                    borderRadius: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer',
                  }} onClick={() => navigator.clipboard.writeText(item.cmd)} title="Click to copy">
                    {item.cmd}
                  </code>
                </div>
              ))}
              <p style={{ fontSize: 9, color: 'var(--text4)', marginTop: 4 }}>Click any command to copy. Buttons disabled while a build is running.</p>
            </>
          )}
        </div>
      </div>

      {/* Useful commands */}
      {appInfo?.exists && (
        <div className="panel">
          <div className="panel-header">Useful Commands</div>
          <div className="panel-body">
            {[
              { label: 'Start Expo dev server', cmd: `cd "${appInfo.path}" && npx expo start` },
              { label: 'Start Expo (clear cache)', cmd: `cd "${appInfo.path}" && npx expo start --clear` },
              { label: 'Start Expo (tunnel)', cmd: `cd "${appInfo.path}" && npx expo start --tunnel` },
              { label: 'Prebuild (generate ios/ & android/)', cmd: `cd "${appInfo.path}" && npx expo prebuild` },
              { label: 'Prebuild clean', cmd: `cd "${appInfo.path}" && npx expo prebuild --clean` },
              { label: 'Expo Doctor', cmd: `cd "${appInfo.path}" && npx expo-doctor` },
              { label: 'Install (Expo-managed)', cmd: `cd "${appInfo.path}" && npx expo install` },
              { label: 'Clean node_modules + reinstall', cmd: `cd "${appInfo.path}" && rm -rf node_modules && npm install` },
              { label: 'Run tests', cmd: `cd "${appInfo.path}" && npx jest` },
              { label: 'TypeScript check', cmd: `cd "${appInfo.path}" && npx tsc --noEmit` },
              { label: 'Lint', cmd: `cd "${appInfo.path}" && npx eslint src/` },
              { label: 'Open Xcode (after prebuild)', cmd: `cd "${appInfo.path}" && xed -b ios` },
              { label: 'Open Android Studio (after prebuild)', cmd: `open -a "Android Studio" "${appInfo.path}/android"` },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--bg)' }}>
                <span style={{ fontSize: 11, color: 'var(--text2)', minWidth: 160, flexShrink: 0 }}>{item.label}</span>
                <code style={{
                  flex: 1, fontSize: 10, color: 'var(--text4)', background: 'var(--bg)', padding: '4px 6px',
                  borderRadius: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer',
                }} onClick={() => navigator.clipboard.writeText(item.cmd)} title="Click to copy">
                  {item.cmd}
                </code>
              </div>
            ))}
            <p style={{ fontSize: 9, color: 'var(--text4)', marginTop: 6 }}>Click any command to copy to clipboard.</p>
          </div>
        </div>
      )}

      {/* File sections */}
      <div className="grid-2">
        <div>
          <div className="panel">
            <div className="panel-header">Source Code ({codeFiles.length})</div>
            <div className="panel-body">
              {codeFiles.length === 0 ? (
                <p style={{ color: 'var(--text4)', fontSize: 11 }}>No code yet.</p>
              ) : codeFiles.map(f => (
                <div key={f} className="file-item" onClick={() => viewFile(f)}>{f}</div>
              ))}
            </div>
          </div>
        </div>
        <div>
          <div className="panel">
            <div className="panel-header">Specs & Designs ({specFiles.length})</div>
            <div className="panel-body">
              {specFiles.map(f => (
                <div key={f} className="file-item" onClick={() => viewFile(f)}>{f}</div>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel-header">Tests ({testFiles.length})</div>
            <div className="panel-body">
              {testFiles.length === 0 ? (
                <p style={{ color: 'var(--text4)', fontSize: 11 }}>No tests.</p>
              ) : testFiles.map(f => (
                <div key={f} className="file-item" onClick={() => viewFile(f)}>{f}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
