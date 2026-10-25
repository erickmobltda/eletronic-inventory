import * as React from 'react';
import { saveProject } from '../lib/store';
import { PROJECT_STATUS } from '../lib/inventory';
import type { Component, DerivedComponent, Project } from '../lib/types';
import { Badge, Chips, qty } from './bits';

type Props = {
  c: DerivedComponent;
  components: Component[];
  projects: Project[];
  onClose: () => void;
  onEdit: () => void;
  onProject: (id: string) => void;
};

/** Saves on blur or Enter, not on every keystroke. */
function QtyInput({ value, disabled, label, onCommit }: { value: number; disabled: boolean; label: string; onCommit: (n: number) => void }) {
  const [text, setText] = React.useState(String(value));
  React.useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = Math.floor(Number(text));
    if (n >= 1 && n !== value) onCommit(n);
    else setText(String(value));
  };
  return (
    <input type="number" min={1} step={1} value={text} disabled={disabled} aria-label={label}
      onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); }} />
  );
}

export function Drawer({ c, components, projects, onClose, onEdit, onProject }: Props) {
  const specs = Object.entries(c.specs);
  const linked = projects.filter((p) => p.components.some((a) => a.id === c.id));
  const others = projects.filter((p) => !linked.includes(p));
  const [target, setTarget] = React.useState('');
  const [count, setCount] = React.useState(1);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => closeRef.current?.focus(), [c.id]);
  React.useEffect(() => { setTarget(''); setCount(1); setError(''); }, [c.id]);

  async function update(p: Project, allocations: Project['components']) {
    setBusy(true);
    setError('');
    try {
      await saveProject({ ...p, components: allocations }, components, projects);
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function link() {
    const p = projects.find((x) => x.id === target);
    if (!p) return;
    if (await update(p, [...p.components, { id: c.id, qty: count }])) { setTarget(''); setCount(1); }
  }

  const setQty = (p: Project, n: number) => update(p, p.components.map((a) => (a.id === c.id ? { ...a, qty: n } : a)));
  const unlink = (p: Project) => update(p, p.components.filter((a) => a.id !== c.id));

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-inner">
          <button ref={closeRef} className="btn ghost close" aria-label="Close" onClick={onClose}>✕</button>
          <h2>{c.name}</h2>
          <div><Badge status={c.status} /> <span className="chip">{c.category}</span>{c.source && <> <span className="chip">{c.source}</span></>}</div>
          {c.description && <p>{c.description}</p>}
          <div className="qty-row">
            <div><b>{qty(c.quantity)}</b><span>Owned</span></div>
            <div><b>{c.used}</b><span>In use</span></div>
            {c.reserved > 0 && <div><b>{c.reserved}</b><span>Reserved</span></div>}
            <div><b>{qty(c.free)}</b><span>Free</span></div>
          </div>
          <button className="btn" onClick={onEdit}>Edit component</button>

          <h3>Projects</h3>
          {linked.length === 0 && <div className="muted">Not used in any project.</div>}
          {linked.map((p) => {
            const a = p.components.find((x) => x.id === c.id)!;
            return (
              <div key={p.id} className="link-row">
                <a href="#projects" onClick={(e) => { e.preventDefault(); onProject(p.id); }}>{p.name}</a>
                <span className={`badge ${p.status}`}>{PROJECT_STATUS[p.status]}</span>
                <QtyInput value={a.qty} disabled={busy} label={`Units in ${p.name}`} onCommit={(n) => void setQty(p, n)} />
                <button className="btn ghost" disabled={busy} title="Remove from project" onClick={() => void unlink(p)}>✕</button>
              </div>
            );
          })}
          {others.length > 0 && (
            <div className="link-row">
              <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Project">
                <option value="">Add to project…</option>
                {others.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" min={1} step={1} value={count} aria-label="Units"
                onChange={(e) => setCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))} />
              <button className="btn" disabled={!target || busy} onClick={() => void link()}>Add</button>
            </div>
          )}
          {error && <div className="error">{error}</div>}

          {c.voltage && <><h3>Voltage</h3><div>{c.voltage}</div></>}
          {c.interfaces.length > 0 && <><h3>Interfaces</h3><div><Chips items={c.interfaces} /></div></>}
          {specs.length > 0 && (
            <><h3>Specs</h3>
              <table className="kv"><tbody>{specs.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>
            </>
          )}
          {c.notes && <><h3>Notes</h3><div>{c.notes}</div></>}
          {c.links.length > 0 && (
            <><h3>Links</h3>
              <div className="links">{c.links.map((l) => <a key={l.url + l.label} href={l.url} target="_blank" rel="noopener">{l.label} ↗</a>)}</div>
            </>
          )}
          <h3>ID</h3><div className="idline">{c.id}</div>
        </div>
      </aside>
    </>
  );
}
