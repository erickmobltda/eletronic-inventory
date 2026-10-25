import * as React from 'react';
import { PROJECT_STATUS } from '../lib/inventory';
import type { DerivedComponent, Project } from '../lib/types';
import { qty } from '../components/bits';

type Props = {
  projects: Project[];
  byId: Record<string, DerivedComponent>;
  unused: DerivedComponent[];
  scrollTo: string | null;
  onScrolled: () => void;
  onOpen: (id: string) => void;
  onEdit: (p: Project) => void;
};

export function ProjectsView({ projects, byId, unused, scrollTo, onScrolled, onOpen, onEdit }: Props) {
  React.useEffect(() => {
    if (!scrollTo) return;
    requestAnimationFrame(() => document.getElementById(`project-${scrollTo}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    onScrolled();
  }, [scrollTo, onScrolled]);

  return (
    <>
      {!projects.length && <div className="empty">No projects yet. Create one with <b>+ Project</b>.</div>}
      {projects.map((p) => (
        <div key={p.id} className="project" id={`project-${p.id}`}>
          <div className="head">
            <h2>{p.name}</h2>
            <span className={`badge ${p.status}`}>{PROJECT_STATUS[p.status]}</span>
            {p.repo && <a href={p.repo} target="_blank" rel="noopener">Repository ↗</a>}
            <span className="spacer" />
            <button className="btn" onClick={() => onEdit(p)}>Edit</button>
          </div>
          {p.description && <p>{p.description}</p>}
          <ul>
            {p.components.map(({ id, qty: q }) => {
              const c = byId[id];
              return c
                ? <li key={id} onClick={() => onOpen(id)}><span>{c.name}</span><span className="muted">×{q}</span></li>
                : <li key={id}><span>Unknown component <code>{id}</code></span></li>;
            })}
            {!p.components.length && <li className="muted">No components yet</li>}
          </ul>
        </div>
      ))}
      <div className="project">
        <div className="head"><h2>Not in any project</h2><span className="badge free">{unused.length}</span></div>
        <p>Components free to use in the next build.</p>
        <ul>
          {unused.map((c) => <li key={c.id} onClick={() => onOpen(c.id)}><span>{c.name}</span><span className="muted">×{qty(c.quantity)}</span></li>)}
        </ul>
      </div>
    </>
  );
}
