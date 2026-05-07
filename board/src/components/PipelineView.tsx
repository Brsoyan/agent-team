import { useEffect, useState, useRef } from 'react';
import { api, type PipelineState, type PipelineEvent } from '../api';

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  waiting: { bg: '#0f172a', border: '#1e293b', text: '#475569', dot: '#334155' },
  running: { bg: '#172554', border: '#2563eb', text: '#38bdf8', dot: '#38bdf8' },
  done:    { bg: '#052e16', border: '#16a34a', text: '#86efac', dot: '#22c55e' },
  skipped: { bg: '#0f172a', border: '#1e293b', text: '#334155', dot: '#1e293b' },
  error:   { bg: '#450a0a', border: '#dc2626', text: '#fca5a5', dot: '#ef4444' },
};

const STATUS_LABELS: Record<string, string> = {
  waiting: 'Waiting', running: 'Working...', done: 'Done', skipped: 'Skipped', error: 'Error',
};

export default function PipelineView({ projectId, onStop }: { projectId: string; onStop: () => void }) {
  const [pipeline, setPipeline] = useState<PipelineState | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const poll = async () => {
      try { setPipeline(await api.project(projectId).pipeline()); } catch {}
    };
    poll();
    const iv = setInterval(poll, 1500);
    return () => clearInterval(iv);
  }, [projectId]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [pipeline?.events.length]);

  if (!pipeline) return null;

  const activeEvents = pipeline.events.slice(-40);

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Agent pipeline */}
      <div style={{
        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8,
        padding: 14, marginBottom: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {pipeline.running && (
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', animation: 'pulse 1.5s infinite' }} />
            )}
            <span style={{ fontSize: 13, fontWeight: 700, color: pipeline.running ? '#38bdf8' : '#22c55e' }}>
              {pipeline.running ? `Day ${pipeline.currentDay} — Running` : 'Pipeline Idle'}
            </span>
          </div>
          {pipeline.running && (
            <button className="btn btn-red btn-sm" onClick={onStop}>Stop</button>
          )}
        </div>

        {/* Agent cards row */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {pipeline.agents.map((a, i) => {
            const c = STATUS_COLORS[a.status];
            return (
              <div key={a.role} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6,
                  padding: '8px 12px', minWidth: 130, position: 'relative',
                  transition: 'all .3s',
                }}>
                  {a.status === 'running' && (
                    <div style={{
                      position: 'absolute', top: -1, left: -1, right: -1, height: 2,
                      background: `linear-gradient(90deg, transparent, ${c.dot}, transparent)`,
                      animation: 'pulse 1.5s infinite', borderRadius: '6px 6px 0 0',
                    }} />
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot,
                      animation: a.status === 'running' ? 'pulse 1s infinite' : 'none',
                    }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: c.text }}>{a.title}</span>
                  </div>
                  <div style={{ fontSize: 9, color: '#64748b' }}>{a.name}</div>
                  <div style={{ fontSize: 9, color: c.text, marginTop: 2, fontWeight: 600 }}>
                    {STATUS_LABELS[a.status]}
                  </div>
                  {a.summary && (
                    <div style={{ fontSize: 8, color: '#475569', marginTop: 3, lineHeight: 1.3, maxHeight: 30, overflow: 'hidden' }}>
                      {a.summary.substring(0, 80)}
                    </div>
                  )}
                </div>
                {i < pipeline.agents.length - 1 && (
                  <span style={{ color: '#334155', fontSize: 14 }}>→</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Event log */}
      <div style={{
        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8,
        maxHeight: 200, overflow: 'hidden',
      }}>
        <div style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Live Log</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: '#475569', fontWeight: 400 }}>{pipeline.events.length} events</span>
            {activeEvents.length > 0 && (
              <button
                onClick={() => {
                  const text = activeEvents.map(e =>
                    `${new Date(e.time).toLocaleTimeString()} [${e.agentName}] ${e.message}`
                  ).join('\n');
                  navigator.clipboard.writeText(text);
                }}
                title="Copy all logs"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 12 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#38bdf8')}
                onMouseLeave={e => (e.currentTarget.style.color = '#475569')}>
                &#128203; Copy All
              </button>
            )}
          </div>
        </div>
        <div ref={logRef} style={{ padding: '4px 10px', maxHeight: 160, overflowY: 'auto' }}>
          {activeEvents.map((e, i) => (
            <EventLine key={i} event={e} />
          ))}
          {activeEvents.length === 0 && (
            <p style={{ color: '#334155', fontSize: 10, padding: 8 }}>No events yet. Start a run to see progress.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function EventLine({ event }: { event: PipelineEvent }) {
  const typeColors: Record<string, string> = {
    day_start: '#38bdf8', agent_start: '#a78bfa', agent_working: '#94a3b8',
    agent_done: '#22c55e', agent_skip: '#334155', day_done: '#38bdf8',
    error: '#ef4444', info: '#94a3b8',
  };
  const color = typeColors[event.type] || '#94a3b8';

  return (
    <div style={{ padding: '2px 0', fontSize: 10, display: 'flex', gap: 6, borderBottom: '1px solid #111827', alignItems: 'start' }}>
      <span style={{ color: '#334155', minWidth: 48, fontFamily: 'monospace', fontSize: 9 }}>
        {new Date(event.time).toLocaleTimeString()}
      </span>
      <span style={{ color, minWidth: 80, fontWeight: 600 }}>{event.agentName}</span>
      <span style={{ color: '#94a3b8', flex: 1 }}>{event.message}</span>
    </div>
  );
}
