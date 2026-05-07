import { useEffect, useState } from 'react';
import { api, type AgentPrompt } from '../api';

export default function AgentPrompts({ onBack }: { onBack: () => void }) {
  const [prompts, setPrompts] = useState<AgentPrompt[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { api.agentPrompts().then(setPrompts); }, []);

  return (
    <>
      <span className="back-link" onClick={onBack}>&larr; Back</span>
      <h2 style={{ fontSize: 16, marginBottom: 14 }}>Agent System Prompts</h2>
      <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
        These are the instructions each agent receives. Click to expand.
      </p>
      {prompts.map(p => (
        <div key={p.role} className="prompt-box" onClick={() => setExpanded(expanded === p.role ? null : p.role)}>
          <h4>{p.name} — {p.title} ({p.role})</h4>
          {expanded === p.role && <pre>{p.system_prompt}</pre>}
          {expanded !== p.role && (
            <p style={{ fontSize: 10, color: 'var(--text4)', cursor: 'pointer' }}>Click to view prompt...</p>
          )}
        </div>
      ))}
    </>
  );
}
