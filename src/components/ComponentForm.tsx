import * as React from 'react';
import { deleteComponent, saveComponent } from '../lib/store';
import { normalizeComponent, uniqueId } from '../lib/inventory';
import type { Component, Project } from '../lib/types';
import { Modal } from './bits';

type Props = {
  item: Component | null; // null = new component
  components: Component[];
  projects: Project[];
  onClose: () => void;
  onSaved: (id: string) => void;
  onDeleted: () => void;
};

type Pair = { a: string; b: string };

export function ComponentForm({ item, components, projects, onClose, onSaved, onDeleted }: Props) {
  const [name, setName] = React.useState(item?.name ?? '');
  const [category, setCategory] = React.useState(item?.category ?? '');
  const [quantity, setQuantity] = React.useState(item?.quantity == null ? '' : String(item.quantity));
  const [voltage, setVoltage] = React.useState(item?.voltage ?? '');
  const [interfaces, setInterfaces] = React.useState((item?.interfaces ?? []).join(', '));
  const [source, setSource] = React.useState(item?.source ?? '');
  const [description, setDescription] = React.useState(item?.description ?? '');
  const [notes, setNotes] = React.useState(item?.notes ?? '');
  const [specs, setSpecs] = React.useState<Pair[]>(Object.entries(item?.specs ?? {}).map(([a, b]) => ({ a, b })));
  const [links, setLinks] = React.useState<Pair[]>((item?.links ?? []).map((l) => ({ a: l.label, b: l.url })));
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const categories = [...new Set(components.map((c) => c.category))].sort();

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try { await fn(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = quantity.trim();
    if (q && !(Number.isInteger(Number(q)) && Number(q) >= 0)) return setError('Quantity must be a whole number, or empty if unknown.');
    const id = item?.id ?? uniqueId(name, components.map((c) => c.id));
    const c = normalizeComponent(id, {
      ...item,
      name, category, voltage, source, description, notes,
      quantity: q ? Number(q) : null,
      interfaces: [...new Set(interfaces.split(',').map((s) => s.trim()).filter(Boolean))],
      specs: Object.fromEntries(specs.filter((p) => p.a.trim()).map((p) => [p.a.trim(), p.b.trim()])),
      links: links.filter((p) => p.b.trim()).map((p) => ({ label: p.a.trim() || p.b.trim(), url: p.b.trim() })),
    });
    if (!c.name || !c.category) return setError('Name and category are required.');
    void run(async () => { await saveComponent(c, components, projects); onSaved(id); });
  }

  function remove() {
    if (!item || !confirm(`Delete "${item.name}"?`)) return;
    void run(async () => { await deleteComponent(item.id, projects); onDeleted(); });
  }

  const pairs = (rows: Pair[], set: (r: Pair[]) => void, a: string, b: string) => (
    <>
      {rows.map((r, i) => (
        <div key={i} className="pair">
          <input placeholder={a} value={r.a} onChange={(e) => set(rows.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
          <input placeholder={b} value={r.b} onChange={(e) => set(rows.map((x, j) => (j === i ? { ...x, b: e.target.value } : x)))} />
          <button type="button" className="btn ghost" aria-label="Remove row" onClick={() => set(rows.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button type="button" className="btn ghost" onClick={() => set([...rows, { a: '', b: '' }])}>+ Add</button>
    </>
  );

  return (
    <Modal title={item ? `Edit ${item.name}` : 'New component'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label className="field">Name *<input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label>
        <div className="two">
          <label className="field">Category *
            <input list="categories" value={category} onChange={(e) => setCategory(e.target.value)} />
            <datalist id="categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
          <label className="field">Quantity <span className="muted">(empty = unknown)</span>
            <input type="number" min={0} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
        </div>
        <div className="two">
          <label className="field">Voltage<input value={voltage} onChange={(e) => setVoltage(e.target.value)} /></label>
          <label className="field">Source<input value={source} onChange={(e) => setSource(e.target.value)} /></label>
        </div>
        <label className="field">Interfaces <span className="muted">(comma separated)</span>
          <input value={interfaces} onChange={(e) => setInterfaces(e.target.value)} placeholder="I2C, SPI, GPIO" />
        </label>
        <label className="field">Description<textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <div className="field">Specs{pairs(specs, setSpecs, 'Spec', 'Value')}</div>
        <div className="field">Links{pairs(links, setLinks, 'Label', 'https://…')}</div>
        <label className="field">Notes<textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        {item && <div className="idline">ID: {item.id}</div>}
        {error && <div className="error">{error}</div>}
        <div className="form-foot">
          {item && <button type="button" className="btn danger" disabled={busy} onClick={remove}>Delete</button>}
          <span className="spacer" />
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
