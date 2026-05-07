import { useState, useRef, useEffect, useCallback } from 'react';
import { api, type SkillSource } from '../api';

const SUGGESTIONS = [
  { name: 'Subscription App', desc: 'Plans, pricing, purchase flow, subscription management', features: ['Subscription Plans Screen with pricing tiers, feature comparison, and purchase flow', 'Subscription Management — view plan, upgrade, downgrade, cancel, billing history'] },
  { name: 'Landing Page App', desc: 'Single page with hero, title, description, CTA button', features: ['Landing page with hero section, app title, description, and call-to-action button'] },
  { name: 'Todo App', desc: 'Task list, categories, local storage', features: ['Task list with add, complete, delete, swipe actions', 'Task categories with color labels and filter tabs'] },
  { name: 'Weather App', desc: 'Current weather, forecast, city search', features: ['Weather display with temperature, conditions, humidity, animated icons', 'City search with favorites and auto-detect location'] },
];

const DEFAULT_AGENTS = [
  { role: 'pm', name: 'Sarah Chen', title: 'Product Manager', enabled: true },
  { role: 'critic', name: 'Marcus Webb', title: 'Product Critic', enabled: true },
  { role: 'designer', name: 'Ava Moretti', title: 'UI/UX Designer', enabled: true },
  { role: 'developer', name: 'James Park', title: 'Senior Developer', enabled: true },
  { role: 'reviewer', name: 'Diana Okafor', title: 'Code Reviewer', enabled: true },
  { role: 'qa', name: 'Raj Patel', title: 'QA Engineer', enabled: true },
];

function parseImportedFile(content: string): { name: string; description: string } {
  const lines = content.split('\n');
  let name = '';

  // Try to extract name from first markdown heading
  const headingIdx = lines.findIndex(l => /^#\s+/.test(l.trim()));
  if (headingIdx >= 0) {
    name = lines[headingIdx].trim().replace(/^#+\s*/, '');
    lines.splice(headingIdx, 1);
  }

  const description = lines.join('\n').trim();

  // If no heading found, use filename as name
  return { name, description };
}

function AutoTextarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = Math.max(36, ref.current.scrollHeight) + 'px'; }
  }, [value]);
  return <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={1} style={{ overflow: 'hidden', resize: 'none', minHeight: 36 }} />;
}

export default function NewProject({ onCreated, onBack }: { onCreated: (id: string) => void; onBack: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [features, setFeatures] = useState(['', '']);
  const [creating, setCreating] = useState(false);
  const [agents, setAgents] = useState(DEFAULT_AGENTS.map(a => ({ ...a })));
  const [skillSources, setSkillSources] = useState<SkillSource[]>([]);
  const [importSelections, setImportSelections] = useState<Record<string, string>>({}); // role -> sourceProjectId

  // SDK config
  const [appId, setAppId] = useState('');
  const [iosSecret, setIosSecret] = useState('');
  const [androidPkg, setAndroidPkg] = useState('');
  const [skipUnitTests, setSkipUnitTests] = useState(true);
  const [skipUITests, setSkipUITests] = useState(true);
  const [skipQA, setSkipQA] = useState(true);
  const [skipReview, setSkipReview] = useState(true);
  const [skipManager, setSkipManager] = useState(false);
  const [mode, setMode] = useState<'features' | 'prd'>('features');
  const [prd, setPrd] = useState('');

  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { api.skillSources().then(setSkillSources); }, []);

  const handleFileContent = useCallback((text: string, fileName: string) => {
    if (mode === 'prd') {
      setPrd(text);
      setName(prev => prev || fileName.replace(/\.(md|txt)$/i, ''));
      return;
    }
    const parsed = parseImportedFile(text);
    setName(prev => prev || parsed.name || fileName.replace(/\.(md|txt)$/i, ''));
    setDesc(parsed.description);
  }, [mode]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    if (!file.name.match(/\.(md|txt)$/i)) return alert('Please select a .md or .txt file');
    const reader = new FileReader();
    reader.onload = () => handleFileContent(reader.result as string, file.name);
    reader.readAsText(file);
  }, [handleFileContent]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const addFeature = () => setFeatures([...features, '']);
  const removeFeature = (i: number) => setFeatures(features.filter((_, idx) => idx !== i));
  const updateFeature = (i: number, val: string) => setFeatures(features.map((f, idx) => idx === i ? val : f));
  const toggleAgent = (role: string) => setAgents(agents.map(a => a.role === role ? { ...a, enabled: !a.enabled } : a));

  const useSuggestion = (s: typeof SUGGESTIONS[0]) => {
    setName(s.name);
    setDesc(s.desc);
    setFeatures(s.features);
  };

  const create = async (autoRun: boolean) => {
    const prdTrimmed = prd.trim();
    if (!name.trim()) return alert('Enter a name');
    if (mode === 'prd') {
      if (!prdTrimmed) return alert('Paste or drop a PRD');
    } else {
      const feats = features.filter(f => f.trim());
      if (!feats.length) return alert('Add at least one feature');
    }
    setCreating(true);
    try {
      const sdkConfig = { appId, iosSecret, androidPkg };
      const feats = mode === 'prd' ? [] : features.filter(f => f.trim());
      const descToSend = mode === 'prd' ? '' : desc;
      const proj = await api.projects.create(
        name,
        descToSend,
        feats,
        sdkConfig,
        mode === 'prd' ? prdTrimmed : undefined,
      );

      for (const [role, sourceId] of Object.entries(importSelections)) {
        if (sourceId) {
          await api.project(proj.id).importSkills(role, sourceId);
        }
      }

      const skips: string[] = [];
      if (skipQA) skips.push('qa');
      if (skipReview) skips.push('reviewer');
      if (skipManager) skips.push('manager');
      if (mode === 'prd') {
        skips.push('pm', 'critic');
      }
      if (skips.length > 0) await api.project(proj.id).setSkips(skips);

      if (skipUnitTests) {
        await api.project(proj.id).sendInstruction('developer', 'SKIP unit tests — do not write test files. Focus only on implementation code.');
      }
      if (skipUITests) {
        await api.project(proj.id).sendInstruction('qa', 'SKIP UI/E2E tests — do not write test files.');
      }

      if (autoRun) {
        api.project(proj.id).runAuto(5);
      }
      onCreated(proj.id);
    } catch {
      setCreating(false);
    }
  };

  return (
    <>
      <span className="back-link" onClick={onBack}>&larr; Back</span>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, marginTop: 4 }}>
        <button
          onClick={() => setMode('features')}
          style={{
            padding: '6px 14px', fontSize: 12, fontWeight: 700,
            background: mode === 'features' ? 'var(--blue)' : 'transparent',
            color: mode === 'features' ? '#fff' : 'var(--text3)',
            border: '1px solid ' + (mode === 'features' ? 'var(--blue)' : 'var(--border2)'),
            borderRadius: 6, cursor: 'pointer',
          }}
        >Features Mode</button>
        <button
          onClick={() => setMode('prd')}
          style={{
            padding: '6px 14px', fontSize: 12, fontWeight: 700,
            background: mode === 'prd' ? 'var(--blue)' : 'transparent',
            color: mode === 'prd' ? '#fff' : 'var(--text3)',
            border: '1px solid ' + (mode === 'prd' ? 'var(--blue)' : 'var(--border2)'),
            borderRadius: 6, cursor: 'pointer',
          }}
        >PRD Mode</button>
        {mode === 'prd' && (
          <span style={{ fontSize: 11, color: 'var(--text4)', alignSelf: 'center', marginLeft: 6 }}>
            PM &amp; Critic will be skipped. Designer starts from the PRD.
          </span>
        )}
      </div>

      {/* File Import Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--blue)' : 'var(--border2)'}`,
          borderRadius: 8, padding: '14px 20px', marginBottom: 12,
          textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'rgba(59,130,246,0.08)' : 'transparent',
          transition: 'all 0.15s',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: dragging ? 'var(--blue)' : 'var(--text3)' }}>
          {mode === 'prd'
            ? 'Drop your PRD (.md or .txt) here'
            : 'Drop a .md or .txt file here to import project description'}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>
          {mode === 'prd'
            ? 'or click to browse — fills the PRD textarea below'
            : 'or click to browse — parses name, description & features automatically'}
        </div>
        <input ref={fileInputRef} type="file" accept=".md,.txt" style={{ display: 'none' }}
          onChange={e => { handleFileSelect(e.target.files); e.target.value = ''; }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Left: Project details */}
        <div>
          <div className="panel">
            <div className="panel-header">New Project</div>
            <div className="panel-body">
              <div className="form-field">
                <label>Project Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="My App" />
              </div>
              {mode === 'features' && (
                <>
                  <div className="form-field">
                    <label>Description</label>
                    <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="What does this app do?" />
                  </div>
                  <div className="form-field">
                    <label>Features</label>
                    {features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'start' }}>
                        <AutoTextarea value={f} onChange={v => updateFeature(i, v)} placeholder="Describe this feature..." />
                        <button className="btn btn-ghost btn-sm" style={{ marginTop: 4 }} onClick={() => removeFeature(i)}>&times;</button>
                      </div>
                    ))}
                    <button className="btn btn-ghost btn-sm" onClick={addFeature} style={{ marginTop: 4 }}>+ Add Feature</button>
                  </div>
                </>
              )}
              {mode === 'prd' && (
                <div className="form-field">
                  <label>PRD Content</label>
                  <textarea
                    value={prd}
                    onChange={e => setPrd(e.target.value)}
                    placeholder="Paste your full PRD here (or drop a .md / .txt file above)…"
                    rows={18}
                    style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, minHeight: 320 }}
                  />
                  <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 4 }}>
                    {prd.trim() ? `${prd.length.toLocaleString()} chars` : 'Empty — required to create'}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">SDK Config <span style={{ fontWeight: 400, color: 'var(--text4)' }}>optional</span></div>
            <div className="panel-body">
              <div className="form-field">
                <label>App ID / Bundle ID</label>
                <input value={appId} onChange={e => setAppId(e.target.value)} placeholder="com.mycompany.myapp" />
              </div>
              <div className="form-field">
                <label>iOS Shared Secret</label>
                <input value={iosSecret} onChange={e => setIosSecret(e.target.value)} placeholder="For receipt validation" />
              </div>
              <div className="form-field">
                <label>Android Package</label>
                <input value={androidPkg} onChange={e => setAndroidPkg(e.target.value)} placeholder="com.mycompany.myapp" />
              </div>
            </div>
          </div>

          {/* Skip switches */}
          <div className="panel">
            <div className="panel-header">Pipeline Settings</div>
            <div className="panel-body">
              {mode === 'prd' && (
                <>
                  {['PM', 'Critic'].map(label => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', opacity: 0.6 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>Skip {label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text4)' }}>Skipped in PRD Mode</div>
                      </div>
                      <button disabled style={{ padding: '3px 10px', borderRadius: 10, border: 'none', fontSize: 10, fontWeight: 700, background: '#431407', color: '#fdba74', cursor: 'not-allowed' }}>SKIP</button>
                    </div>
                  ))}
                </>
              )}
              {[
                { label: 'Skip Team Manager', desc: 'Manager agent (unblocker) is skipped', value: skipManager, set: setSkipManager },
                { label: 'Skip Unit Tests', desc: 'Developer won\'t write test files', value: skipUnitTests, set: setSkipUnitTests },
                { label: 'Skip UI/E2E Tests', desc: 'QA won\'t write E2E test files', value: skipUITests, set: setSkipUITests },
                { label: 'Skip QA Testing', desc: 'QA agent is skipped entirely', value: skipQA, set: setSkipQA },
                { label: 'Skip Code Review', desc: 'Reviewer agent is skipped', value: skipReview, set: setSkipReview },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)' }}>{s.desc}</div>
                  </div>
                  <button
                    onClick={() => s.set(!s.value)}
                    style={{
                      padding: '3px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontSize: 10, fontWeight: 700,
                      background: s.value ? '#431407' : '#052e16',
                      color: s.value ? '#fdba74' : '#86efac',
                    }}>
                    {s.value ? 'SKIP' : 'ON'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Agents + Templates */}
        <div>
          {/* Agent Team Selection */}
          <div className="panel">
            <div className="panel-header">Choose Your Team</div>
            <div className="panel-body">
              <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>
                Select which agents work on this project. Import skills from other projects.
              </p>
              {agents.map(a => {
                const sources = skillSources.filter(s => s.agents.some(x => x.role === a.role));
                return (
                  <div key={a.role} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
                    borderBottom: '1px solid var(--border)', opacity: a.enabled ? 1 : 0.4,
                  }}>
                    <input
                      type="checkbox"
                      checked={mode === 'prd' && (a.role === 'pm' || a.role === 'critic') ? false : a.enabled}
                      disabled={mode === 'prd' && (a.role === 'pm' || a.role === 'critic')}
                      onChange={() => toggleAgent(a.role)}
                      style={{ accentColor: 'var(--blue)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{a.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--text4)' }}>{a.name}</div>
                    </div>
                    {sources.length > 0 && a.enabled && (
                      <select
                        value={importSelections[a.role] || ''}
                        onChange={e => setImportSelections({ ...importSelections, [a.role]: e.target.value })}
                        style={{
                          padding: '3px 6px', borderRadius: 4, border: '1px solid var(--border2)',
                          background: 'var(--bg)', color: 'var(--text)', fontSize: 10, maxWidth: 140,
                        }}
                      >
                        <option value="">No import</option>
                        {sources.map(s => {
                          const sa = s.agents.find(x => x.role === a.role)!;
                          return <option key={s.projectId} value={s.projectId}>
                            {s.projectId} ({sa.skillCount} skills)
                          </option>;
                        })}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Templates */}
          <div className="panel">
            <div className="panel-header">Quick Start Templates</div>
            <div className="panel-body">
              {SUGGESTIONS.map((s, i) => (
                <div key={i} className="suggestion" onClick={() => useSuggestion(s)}>
                  <h4>{s.name}</h4>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create buttons */}
      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <button className="btn btn-green" disabled={creating} onClick={() => create(false)} style={{ padding: '10px 24px', fontSize: 13 }}>
          Create Project
        </button>
        <button className="btn btn-blue" disabled={creating} onClick={() => create(true)} style={{ padding: '10px 24px', fontSize: 13 }}>
          Create & Auto-Run (5 days)
        </button>
      </div>
    </>
  );
}
