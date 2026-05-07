import { useState, useEffect } from 'react';
import { api, type AgentInfo, type ProjectAgent, type SkillSource, type UsageSummary, type UsageAgentRow } from '../api';

interface Props {
  agents: AgentInfo[];
  isRunning: boolean;
  projectId: string;
  onRunAgent: (role: string) => void;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const ROLE_LABELS: Record<string, string> = {
  pm: 'Product Manager', critic: 'Critic', designer: 'Designer',
  developer: 'Developer', reviewer: 'Reviewer', qa: 'QA', all: 'All Agents',
};

export default function AgentsPanel({ agents, isRunning, projectId, onRunAgent }: Props) {
  const [projectAgents, setProjectAgents] = useState<ProjectAgent[]>([]);
  const [skillSources, setSkillSources] = useState<SkillSource[]>([]);
  const [instrRole, setInstrRole] = useState('developer');
  const [instrMsg, setInstrMsg] = useState('');
  const [instructions, setInstructions] = useState<{ role: string; message: string; time: string }[]>([]);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [skippedRoles, setSkippedRoles] = useState<string[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  const p = api.project(projectId);

  useEffect(() => {
    p.agentsFull().then(setProjectAgents);
    p.instructions().then(setInstructions);
    api.skillSources().then(setSkillSources);
    p.skips().then(setSkippedRoles);
    p.usage().then(setUsage);
    const iv = setInterval(() => p.usage().then(setUsage).catch(() => {}), isRunning ? 3000 : 10000);
    return () => clearInterval(iv);
  }, [projectId, isRunning]);

  const usageByRole = new Map<string, UsageAgentRow>((usage?.by_agent ?? []).map(r => [r.role, r]));

  const toggleSkip = async (role: string) => {
    const next = skippedRoles.includes(role)
      ? skippedRoles.filter(r => r !== role)
      : [...skippedRoles, role];
    setSkippedRoles(next);
    await p.setSkips(next);
  };

  const sendInstruction = async () => {
    if (!instrMsg.trim()) return;
    await p.sendInstruction(instrRole, instrMsg.trim());
    setInstrMsg('');
    setInstructions(await p.instructions());
  };

  const clearInstructions = async () => {
    await p.clearInstructions();
    setInstructions([]);
  };

  const importSkills = async (role: string, sourceProjectId: string) => {
    setImporting(true);
    const result = await p.importSkills(role, sourceProjectId);
    setProjectAgents(await p.agentsFull());
    setImporting(false);
    alert(`Imported ${result.imported} skills`);
  };

  // Filter skill sources to exclude current project
  const otherSources = skillSources.filter(s => s.projectId !== projectId);

  return (
    <div>
      {/* Claude usage summary */}
      {usage && usage.total.calls > 0 && (
        <div className="panel" style={{ marginBottom: 12 }}>
          <div className="panel-header">
            <span>Claude usage</span>
            <span style={{ color: 'var(--text4)', fontSize: 10, fontWeight: 400 }}>
              {usage.total.calls} calls · billed cost — actual charge only if ANTHROPIC_API_KEY is set
            </span>
          </div>
          <div className="panel-body" style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 11 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>
                ${usage.total.total_cost_usd.toFixed(4)}
              </div>
              <div style={{ color: 'var(--text4)', fontSize: 10 }}>total cost</div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {formatTokens(usage.total.input_tokens + usage.total.cache_read_input_tokens + usage.total.cache_creation_input_tokens)}
              </div>
              <div style={{ color: 'var(--text4)', fontSize: 10 }}>input tokens (incl. cached)</div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {formatTokens(usage.total.output_tokens)}
              </div>
              <div style={{ color: 'var(--text4)', fontSize: 10 }}>output tokens</div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {formatTokens(usage.total.cache_read_input_tokens)}
              </div>
              <div style={{ color: 'var(--text4)', fontSize: 10 }}>cache reads (cheap)</div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {(usage.total.duration_ms / 1000).toFixed(1)}s
              </div>
              <div style={{ color: 'var(--text4)', fontSize: 10 }}>total LLM time</div>
            </div>
          </div>
        </div>
      )}

      {/* Agent cards with skills */}
      {projectAgents.map(a => {
        const info = agents.find(x => x.role === a.role);
        const expanded = expandedAgent === a.role;
        const isSkipped = skippedRoles.includes(a.role);
        return (
          <div key={a.role} className="panel" style={{ opacity: isSkipped ? 0.5 : 1 }}>
            <div className="panel-header" style={{ cursor: 'pointer' }} onClick={() => setExpandedAgent(expanded ? null : a.role)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={!isSkipped}
                  onChange={e => { e.stopPropagation(); toggleSkip(a.role); }}
                  style={{ accentColor: 'var(--blue)' }} />
                <span style={{ fontWeight: 700 }}>{a.name}</span>
                <span style={{ color: 'var(--text3)', fontSize: 11 }}>{a.title}</span>
                {isSkipped && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#431407', color: '#fdba74' }}>skipped</span>}
                {a.skills.length > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#172554', color: '#60a5fa' }}>
                    {a.skills.length} skills
                  </span>
                )}
                {a.imported_from && (
                  <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#2e1065', color: '#c4b5fd' }}>
                    imported
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {(() => {
                  const row = usageByRole.get(a.role);
                  if (!row || row.calls === 0) return null;
                  return (
                    <span
                      title={`${row.calls} calls · ${formatTokens(row.input_tokens + row.cache_read_input_tokens + row.cache_creation_input_tokens)} in / ${formatTokens(row.output_tokens)} out`}
                      style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#052e16', color: '#86efac' }}>
                      ${row.total_cost_usd.toFixed(3)} · {row.calls}×
                    </span>
                  );
                })()}
                <span style={{ fontSize: 10, color: 'var(--text4)' }}>{info?.pending ?? 0} pending</span>
                <button className="btn btn-ghost btn-sm" disabled={isRunning} onClick={e => { e.stopPropagation(); onRunAgent(a.role); }}>
                  Run
                </button>
              </div>
            </div>
            {expanded && (
              <div className="panel-body" style={{ fontSize: 11 }}>
                {/* Skills */}
                {a.skills.length > 0 ? (
                  <>
                    <h4 style={{ fontSize: 11, color: 'var(--blue)', marginBottom: 6 }}>Skills & Learnings</h4>
                    {a.skills.map((s, i) => (
                      <div key={i} style={{ padding: '3px 0', color: 'var(--text2)', borderBottom: '1px solid var(--bg)' }}>
                        {s}
                      </div>
                    ))}
                  </>
                ) : (
                  <p style={{ color: 'var(--text4)' }}>No skills yet. Run this agent to accumulate learnings.</p>
                )}

                {/* Import skills from other projects */}
                {otherSources.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <h4 style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Import Skills From Other Projects</h4>
                    {otherSources.map(src => {
                      const srcAgent = src.agents.find(x => x.role === a.role);
                      if (!srcAgent) return null;
                      return (
                        <div key={src.projectId} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '4px 0', borderBottom: '1px solid var(--bg)',
                        }}>
                          <span>
                            <strong>{src.projectId}</strong>
                            <span style={{ color: 'var(--text4)', marginLeft: 6 }}>{srcAgent.skillCount} skills</span>
                          </span>
                          <button className="btn btn-ghost btn-sm" disabled={importing}
                            onClick={() => importSkills(a.role, src.projectId)}>
                            Import
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Send instruction */}
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-header">Send Instruction to Agent</div>
        <div className="panel-body">
          <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
            Write a message to any agent. They'll see it next time they run.
          </p>
          <select value={instrRole} onChange={e => setInstrRole(e.target.value)}
            style={{ padding: '5px 8px', borderRadius: 5, border: '1px solid var(--border2)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, marginBottom: 6 }}>
            <option value="all">All Agents</option>
            {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'all').map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <textarea value={instrMsg} onChange={e => setInstrMsg(e.target.value)}
            placeholder="e.g. Developer, add error handling for purchase flow..."
            style={{ width: '100%', padding: 8, borderRadius: 5, border: '1px solid var(--border2)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', minHeight: 50, resize: 'vertical' }}
          />
          <button className="btn btn-blue" style={{ marginTop: 6 }} disabled={!instrMsg.trim()} onClick={sendInstruction}>
            Send
          </button>
        </div>
      </div>

      {/* Pending instructions */}
      {instructions.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <span>Pending Instructions ({instructions.length})</span>
            <button className="btn btn-ghost btn-sm" onClick={clearInstructions}>Clear</button>
          </div>
          <div className="panel-body">
            {instructions.map((instr, i) => (
              <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid var(--bg)', fontSize: 11 }}>
                <span style={{ color: 'var(--blue)', fontWeight: 700, fontSize: 10 }}>
                  To: {ROLE_LABELS[instr.role] || instr.role}
                </span>
                <p style={{ color: 'var(--text2)', marginTop: 2 }}>{instr.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
