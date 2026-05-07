import { useState, useEffect, useCallback } from 'react';
import { api, type RunStatus } from './api';
import ProjectList from './pages/ProjectList';
import ProjectBoard from './pages/ProjectBoard';
import NewProject from './pages/NewProject';
import AgentPrompts from './pages/AgentPrompts';

type Page = { view: 'projects' } | { view: 'project'; id: string } | { view: 'new' } | { view: 'prompts' };

export default function App() {
  const [page, setPage] = useState<Page>({ view: 'projects' });
  const [status, setStatus] = useState<RunStatus>({ running: false, agent: '' });
  const [cost, setCost] = useState<number | null>(null);

  const projectId = page.view === 'project' ? page.id : null;

  const pollStatus = useCallback(async () => {
    try { setStatus(await api.status()); } catch {}
  }, []);

  useEffect(() => {
    pollStatus();
    const iv = setInterval(pollStatus, 3000);
    return () => clearInterval(iv);
  }, [pollStatus]);

  useEffect(() => {
    if (!projectId) { setCost(null); return; }
    let cancelled = false;
    const fetchCost = async () => {
      try {
        const u = await api.project(projectId).usage();
        if (!cancelled) setCost(u.total.total_cost_usd);
      } catch {}
    };
    fetchCost();
    const iv = setInterval(fetchCost, status.running ? 3000 : 15000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [projectId, status.running]);

  return (
    <>
      <div className="header">
        <h1 onClick={() => setPage({ view: 'projects' })}>Agent Team</h1>
        <div className="header-right">
          {cost != null && (
            <span
              className="credit-icon"
              title="Claude cost for this project (actual charge only if ANTHROPIC_API_KEY is set)"
            >
              <span className="credit-glyph">$</span>{cost.toFixed(cost < 1 ? 4 : 2)}
            </span>
          )}
          <span
            className="back-link"
            onClick={() => setPage({ view: 'prompts' })}
          >
            Agent Prompts
          </span>
          {status.running && (
            <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="8" cy="8" r="6" fill="none" stroke="#334155" strokeWidth="2" />
              <circle cx="8" cy="8" r="6" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="20 20" strokeLinecap="round" />
            </svg>
          )}
          <span className={`badge ${status.running ? 'badge-run' : 'badge-idle'}`}>
            {status.running ? `Running: ${status.agent}` : 'Idle'}
          </span>
        </div>
      </div>

      <div className="main">
        {page.view === 'projects' && (
          <ProjectList
            onOpen={(id) => setPage({ view: 'project', id })}
            onNew={() => setPage({ view: 'new' })}
          />
        )}
        {page.view === 'project' && (
          <ProjectBoard
            projectId={page.id}
            isRunning={status.running}
            onBack={() => setPage({ view: 'projects' })}
          />
        )}
        {page.view === 'new' && (
          <NewProject
            onCreated={(id) => setPage({ view: 'project', id })}
            onBack={() => setPage({ view: 'projects' })}
          />
        )}
        {page.view === 'prompts' && (
          <AgentPrompts onBack={() => setPage({ view: 'projects' })} />
        )}
      </div>
    </>
  );
}
