import { useEffect, useState } from 'react';
import { api, type Project } from '../api';

export default function ProjectList({ onOpen, onNew }: { onOpen: (id: string) => void; onNew: () => void }) {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    api.projects.list().then(setProjects);
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this project and all its data?')) return;
    await api.projects.delete(id);
    setProjects(p => p.filter(x => x.id !== id));
  };

  return (
    <>
      <h2 style={{ fontSize: 16, marginBottom: 14 }}>Projects</h2>
      <div className="project-grid">
        {projects.map(p => (
          <div key={p.id} className="project-card" onClick={() => onOpen(p.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <h3 style={{ fontSize: 14 }}>{p.name}</h3>
              <button className="btn btn-red btn-sm" onClick={(e) => handleDelete(e, p.id)}>Del</button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text3)', margin: '4px 0 8px' }}>
              {p.description || 'No description'}
            </p>
            <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text4)' }}>
              <span>Day {p.day}</span>
              <span>{p.task_count} tasks</span>
              <span>{p.done_count} done</span>
              <span>{new Date(p.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
        <div className="project-new" onClick={onNew}>+ New Project</div>
      </div>
    </>
  );
}
