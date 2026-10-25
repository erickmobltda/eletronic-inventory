import type { DerivedComponent } from '../lib/types';
import { Badge, Chips, qty } from '../components/bits';

export function CardsView({ list, total, onOpen }: { list: DerivedComponent[]; total: number; onOpen: (id: string) => void }) {
  if (!list.length) return <div className="empty">No components match.</div>;
  return (
    <>
      <div className="count">{list.length} of {total} components</div>
      <div className="grid">
        {list.map((c) => (
          <div key={c.id} className="card" onClick={() => onOpen(c.id)}>
            <div className="row"><div className="title">{c.name}</div><Badge status={c.status} /></div>
            <div className="desc">{c.description}</div>
            <div><Chips items={c.interfaces} /></div>
            <div className="meta">
              {c.category} · qty {qty(c.quantity)} · free {qty(c.free)}
              {c.allocations.length > 0 && ` · ${c.allocations.map((a) => a.project.name).join(', ')}`}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
