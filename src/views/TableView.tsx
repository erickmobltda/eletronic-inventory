import * as React from 'react';
import { COLUMNS, defaultCols, type Col, type ColumnKey, type Sort } from '../lib/view';
import type { DerivedComponent } from '../lib/types';
import { Badge, Chips, ProjectChips, qty } from '../components/bits';

type Props = {
  list: DerivedComponent[];
  total: number;
  cols: Col[];
  sort: Sort;
  onCols: (cols: Col[]) => void;
  onSort: (sort: Sort) => void;
  onOpen: (id: string) => void;
  onProject: (id: string) => void;
};

const def = (key: ColumnKey) => COLUMNS.find((c) => c.key === key)!;
const isNum = (key: ColumnKey) => 'num' in def(key);

function cell(c: DerivedComponent, key: ColumnKey, onProject: (id: string) => void): React.ReactNode {
  switch (key) {
    case 'quantity': case 'used': case 'reserved': case 'free': return qty(c[key]);
    case 'status': return <Badge status={c.status} />;
    case 'projects': return <ProjectChips c={c} onProject={onProject} />;
    case 'interfaces': return <Chips items={c.interfaces} />;
    default: return c[key];
  }
}

export function TableView({ list, total, cols, sort, onCols, onSort, onOpen, onProject }: Props) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [dragKey, setDragKey] = React.useState<ColumnKey | null>(null);
  const [overKey, setOverKey] = React.useState<ColumnKey | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  const reorder = (from: ColumnKey | null, to: ColumnKey) => {
    if (!from || from === to) return;
    const next = [...cols];
    const item = next.splice(next.findIndex((c) => c.key === from), 1)[0];
    next.splice(next.findIndex((c) => c.key === to), 0, item);
    onCols(next);
  };

  // Column reordering: drag table headers or items in the Columns menu.
  const drag = (key: ColumnKey) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => { setDragKey(key); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', key); },
    onDragOver: (e: React.DragEvent) => { if (dragKey) { e.preventDefault(); setOverKey(key); } },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); reorder(dragKey, key); },
    onDragEnd: () => { setDragKey(null); setOverKey(null); },
  });

  const visible = cols.filter((c) => c.visible).map((c) => c.key);

  return (
    <>
      <div className="table-bar">
        <div className="count">{list.length} of {total} components</div>
        <div className="cols-wrap" ref={menuRef}>
          <button className="btn" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>Columns ▾</button>
          {menuOpen && (
            <div className="cols-menu">
              <div className="hint">Toggle and drag to reorder</div>
              {cols.map((c) => (
                <label key={c.key} className={`item${overKey === c.key ? ' drag-over' : ''}`} {...drag(c.key)}>
                  <input type="checkbox" checked={c.visible}
                    onChange={(e) => onCols(cols.map((x) => (x.key === c.key ? { ...x, visible: e.target.checked } : x)))} />
                  {def(c.key).label}<span className="grip">⋮⋮</span>
                </label>
              ))}
              <div className="foot">
                <button className="btn ghost" onClick={() => onCols(cols.map((c) => ({ ...c, visible: true })))}>Show all</button>
                <button className="btn ghost" onClick={() => onCols(defaultCols())}>Reset</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="table-wrap">
        {!list.length ? <div className="empty">No components match.</div> : (
          <table>
            <thead>
              <tr>
                {visible.map((key) => (
                  <th key={key} className={`${isNum(key) ? 'num' : ''}${overKey === key ? ' drag-over' : ''}`} title="Click to sort, drag to reorder"
                    onClick={() => onSort({ key, dir: sort.key === key ? (-sort.dir as 1 | -1) : 1 })} {...drag(key)}>
                    {def(key).label}{sort.key === key && <span className="arrow">{sort.dir > 0 ? '▲' : '▼'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} onClick={() => onOpen(c.id)}>
                  {visible.map((key) => <td key={key} className={`${isNum(key) ? 'num' : ''} ${key}`}>{cell(c, key, onProject)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
