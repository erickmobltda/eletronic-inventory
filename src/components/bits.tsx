import { STATUS } from '../lib/inventory';
import type { ComponentStatus, DerivedComponent } from '../lib/types';

export const qty = (v: number | null) => (v == null ? '?' : v);

export const Badge = ({ status }: { status: ComponentStatus }) => <span className={`badge ${status}`}>{STATUS[status]}</span>;

export const Chips = ({ items }: { items: string[] }) => <>{items.map((i) => <span key={i} className="chip">{i}</span>)}</>;

export function ProjectChips({ c, onProject }: { c: DerivedComponent; onProject: (id: string) => void }) {
  if (!c.allocations.length) return <span className="muted">—</span>;
  return (
    <>
      {c.allocations.map((a) => (
        <a key={a.project.id} className="chip" href="#projects"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onProject(a.project.id); }}>
          {a.project.name}{a.qty > 1 ? ` ×${a.qty}` : ''}
        </a>
      ))}
    </>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="scrim modal-scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn ghost" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </>
  );
}
