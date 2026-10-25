import * as React from 'react';
import { deleteProject, saveProject } from '../lib/store';
import { allocated, normalizeProject, PROJECT_STATUS, uniqueId } from '../lib/inventory';
import type { Allocation, Component, Project, ProjectStatus } from '../lib/types';
import { Modal } from './bits';

type Props = {
  item: Project | null; // null = new project
  components: Component[];
  projects: Project[];
  onClose: () => void;
  onSaved: (id: string) => void;
  onDeleted: () => void;
};

export function ProjectForm({ item, components, projects, onClose, onSaved, onDeleted }: Props) {
  const [name, setName] = React.useState(item?.name ?? '');
  const [status, setStatus] = React.useState<ProjectStatus>(item?.status ?? 'active');
  const [description, setDescription] = React.useState(item?.description ?? '');
  const [repo, setRepo] = React.useState(item?.repo ?? '');
  const [parts, setParts] = React.useState<Allocation[]>(item?.components ?? []);
  const [adding, setAdding] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const byId = Object.fromEntries(components.map((c) => [c.id, c]));
  const available = components.filter((c) => !parts.some((a) => a.id === c.id)).sort((a, b) => a.name.localeCompare(b.name));
  // Units left for this project: what is owned minus what the other projects take.
  const left = (c: Component) => (c.quantity == null ? null : c.quantity - allocated(projects, c.id, item?.id));

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try { await fn(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = item?.id ?? uniqueId(name, projects.map((p) => p.id));
    const p = normalizeProject(id, { ...item, name, status, description, repo, components: parts });
    if (!p.name) return setError('Name is required.');
    void run(async () => { await saveProject(p, components, projects); onSaved(id); });
  }

  function remove() {
    if (!item || !confirm(`Delete project "${item.name}"? Its components become free again.`)) return;
    void run(async () => { await deleteProject(item.id); onDeleted(); });
  }

  return (
    <Modal title={item ? `Edit ${item.name}` : 'New project'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label className="field">Name *<input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label>
        <div className="two">
          <label className="field">Status
            <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              {Object.entries(PROJECT_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="field">Repository URL<input type="url" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="https://github.com/…" /></label>
        </div>
        <p className="muted small">Active uses the parts, Planned reserves them, Archived gives them back.</p>
        <label className="field">Description<textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></label>

        <div className="field">Components
          {parts.map((a, i) => {
            const c = byId[a.id];
            const l = c ? left(c) : null;
            return (
              <div key={a.id} className="pair">
                <span className="grow">{c ? c.name : <>Unknown <code>{a.id}</code></>}{l != null && <span className="muted"> · {l} available</span>}</span>
                <input type="number" min={1} step={1} value={a.qty} aria-label="Units"
                  onChange={(e) => setParts(parts.map((x, j) => (j === i ? { ...x, qty: Math.max(1, Math.floor(Number(e.target.value) || 1)) } : x)))} />
                <button type="button" className="btn ghost" aria-label="Remove" onClick={() => setParts(parts.filter((_, j) => j !== i))}>✕</button>
              </div>
            );
          })}
          {available.length > 0 && (
            <div className="pair">
              <select className="grow" value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Component">
                <option value="">Add a component…</option>
                {available.map((c) => {
                  const l = left(c);
                  return <option key={c.id} value={c.id}>{c.name}{l != null ? ` (${l} available)` : ''}</option>;
                })}
              </select>
              <button type="button" className="btn" disabled={!adding}
                onClick={() => { setParts([...parts, { id: adding, qty: 1 }]); setAdding(''); }}>Add</button>
            </div>
          )}
        </div>

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
