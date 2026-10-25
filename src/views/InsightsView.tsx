import type { DerivedComponent } from '../lib/types';
import type { Filters } from '../lib/view';

type Row = { key: string; total: number; segs: [string, number][] };

function group(components: DerivedComponent[], keyFn: (c: DerivedComponent) => string[]): Row[] {
  const m = new Map<string, DerivedComponent[]>();
  for (const c of components) for (const k of keyFn(c)) {
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(c);
  }
  const count = (list: DerivedComponent[], s: string) => list.filter((c) => c.status === s).length;
  return [...m.entries()].map(([key, list]) => ({
    key, total: list.length,
    segs: [['f', count(list, 'free')], ['p', count(list, 'partial')], ['u', count(list, 'in-use')], ['r', count(list, 'reserved')]] as [string, number][],
  })).sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

function Bars({ rows, onClick }: { rows: Row[]; onClick: (r: Row) => void }) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <>
      {rows.map((r) => (
        <div key={r.key} className="bar-row" onClick={() => onClick(r)}>
          <span className="lbl">{r.key}</span>
          <div className="bar" style={{ width: `${(r.total / max) * 100}%` }}>
            {r.segs.map(([cls, n]) => n > 0 && <span key={cls} className={cls} style={{ flex: n }} />)}
          </div>
          <span className="n">{r.total}</span>
        </div>
      ))}
    </>
  );
}

const Legend = () => (
  <div className="legend">
    <span><i style={{ background: 'var(--free)' }} />Free</span><span><i style={{ background: 'var(--partial)' }} />Partly used</span>
    <span><i style={{ background: 'var(--used)' }} />In use</span><span><i style={{ background: 'var(--reserved)' }} />Reserved</span>
  </div>
);

type Props = { components: DerivedComponent[]; onOpen: (id: string) => void; onFilter: (f: Partial<Filters>) => void };

export function InsightsView({ components, onOpen, onFilter }: Props) {
  const unknownQty = components.filter((c) => c.quantity == null);
  const units = components.filter((c) => c.quantity != null).sort((a, b) => b.quantity! - a.quantity!).slice(0, 8);
  return (
    <div className="insights">
      <div className="panel"><h2>By category</h2>
        <Bars rows={group(components, (c) => [c.category])} onClick={(r) => onFilter({ category: r.key })} /><Legend />
      </div>
      <div className="panel"><h2>By interface</h2>
        <Bars rows={group(components, (c) => c.interfaces)} onClick={(r) => onFilter({ iface: r.key })} /><Legend />
      </div>
      <div className="panel"><h2>Most units</h2>
        {units.map((c) => (
          <div key={c.id} className="bar-row" onClick={() => onOpen(c.id)}>
            <span className="lbl">{c.name}</span>
            <div className="bar" style={{ width: `${(c.quantity! / units[0].quantity!) * 100}%` }}><span className="a" style={{ flex: 1 }} /></div>
            <span className="n">{c.quantity}</span>
          </div>
        ))}
      </div>
      <div className="panel"><h2>Quantity unknown</h2>
        <p className="muted">Count these and set the quantity.</p>
        {unknownQty.map((c) => <div key={c.id}><a href="#" onClick={(e) => { e.preventDefault(); onOpen(c.id); }}>{c.name}</a></div>)}
        {!unknownQty.length && <p className="muted">None 🎉</p>}
      </div>
    </div>
  );
}
