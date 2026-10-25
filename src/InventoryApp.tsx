import * as React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { derive, STATUS } from './lib/inventory';
import { EMPTY_FILTERS, filterComponents, sortComponents, type Filters } from './lib/view';
import type { Component, Project } from './lib/types';
import { useInventory } from './hooks/useInventory';
import { usePrefs } from './hooks/usePrefs';
import { TableView } from './views/TableView';
import { CardsView } from './views/CardsView';
import { ProjectsView } from './views/ProjectsView';
import { InsightsView } from './views/InsightsView';
import { Drawer } from './components/Drawer';
import { ComponentForm } from './components/ComponentForm';
import { ProjectForm } from './components/ProjectForm';

const VIEWS = ['inventory', 'cards', 'projects', 'insights'] as const;
type View = (typeof VIEWS)[number];

const viewFromHash = (): View => {
  const v = location.hash.slice(1);
  return (VIEWS as readonly string[]).includes(v) ? (v as View) : 'inventory';
};

type Editing = { kind: 'component'; item: Component | null } | { kind: 'project'; item: Project | null } | null;

export function InventoryApp({ uid, email }: { uid: string; email: string }) {
  const { components, projects, error, loading } = useInventory(uid);
  const [prefs, setPrefs] = usePrefs();
  const [view, setView] = React.useState<View>(viewFromHash);
  const [q, setQ] = React.useState('');
  const [filters, setFilters] = React.useState<Filters>(EMPTY_FILTERS);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<Editing>(null);
  const [scrollTo, setScrollTo] = React.useState<string | null>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onHash = () => setView(viewFromHash());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setEditing(null); setDetailId(null); }
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, select');
      if (e.key === '/' && !typing) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('hashchange', onHash);
    document.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('hashchange', onHash); document.removeEventListener('keydown', onKey); };
  }, []);

  const go = (v: View) => { if (location.hash !== `#${v}`) location.hash = v; else setView(v); };

  const all = React.useMemo(() => derive(components ?? [], projects ?? []), [components, projects]);
  const byId = React.useMemo(() => Object.fromEntries(all.map((c) => [c.id, c])), [all]);
  const list = React.useMemo(() => sortComponents(filterComponents(all, q, filters), prefs.sort), [all, q, filters, prefs.sort]);

  if (error) return <div className="empty">Could not load your inventory ({error}).</div>;
  if (loading || !components || !projects) return <div className="empty">Loading…</div>;

  const openProject = (id: string) => { setDetailId(null); go('projects'); setScrollTo(id); };
  const applyFilters = (f: Partial<Filters>, toView?: View) => {
    setFilters({ ...EMPTY_FILTERS, ...f });
    if (toView) go(toView);
    else if (view !== 'inventory' && view !== 'cards') go('inventory');
  };

  const toggleTheme = () => {
    const dark = prefs.theme ? prefs.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    setPrefs({ theme: dark ? 'light' : 'dark' });
  };

  const units = all.reduce((s, c) => s + (c.quantity ?? 0), 0);
  const stats = [
    { v: all.length, l: 'Components', on: () => applyFilters({}) },
    { v: units, l: 'Units (known qty)', on: () => applyFilters({}) },
    { v: all.filter((c) => c.status === 'free').length, l: 'Not used anywhere', on: () => applyFilters({ status: 'free' }) },
    { v: all.filter((c) => c.used > 0).length, l: 'Used in a project', on: () => applyFilters({ status: 'any-used' }) },
    { v: projects.filter((p) => p.status === 'active').length, l: 'Active projects', on: () => go('projects') },
  ];

  const categories = [...new Set(all.map((c) => c.category))].sort();
  const ifaces = [...new Set(all.flatMap((c) => c.interfaces))].sort();
  const listView = view === 'inventory' || view === 'cards';
  const detail = detailId ? byId[detailId] : null;

  const select = (key: keyof Filters, label: string, opts: [string, string][]) => (
    <label>{label}
      <select value={filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}>
        <option value="">All</option>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );

  return (
    <>
      <header className="top">
        <div className="brand">
          <h1>Electronics Inventory</h1>
          <span className="muted">{email}</span>
        </div>
        <div className="search">
          <input ref={searchRef} type="search" placeholder="Search name, specs, notes…  ( / )" autoComplete="off"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="actions">
          <button className="btn primary" onClick={() => setEditing({ kind: 'component', item: null })}>+ Component</button>
          <button className="btn" onClick={() => setEditing({ kind: 'project', item: null })}>+ Project</button>
          <button className="btn ghost" title="Toggle theme" aria-label="Toggle theme" onClick={toggleTheme}>◐</button>
          <button className="btn ghost" onClick={() => void signOut(auth)}>Sign out</button>
        </div>
      </header>

      <nav className="tabs">
        {VIEWS.map((v) => (
          <a key={v} href={`#${v}`} className={view === v ? 'active' : ''}>{v[0].toUpperCase() + v.slice(1)}</a>
        ))}
      </nav>

      <main>
        <section className="stats">
          {stats.map((s) => (
            <button key={s.l} className="stat" onClick={s.on}><div className="v">{s.v}</div><div className="l">{s.l}</div></button>
          ))}
        </section>

        {listView && (
          <section className="filters">
            {select('category', 'Category', categories.map((c) => [c, c]))}
            {select('status', 'Status', [['available', 'Available (free or partly)'], ['any-used', 'Used in a project'], ...Object.entries(STATUS)])}
            {select('project', 'Project', [['__none', 'Not in any project'], ...projects.map((p): [string, string] => [p.id, p.name])])}
            {select('iface', 'Interface', ifaces.map((i) => [i, i]))}
            <button className="btn ghost" onClick={() => { setQ(''); setFilters(EMPTY_FILTERS); }}>Clear filters</button>
          </section>
        )}

        {components.length === 0 && projects.length === 0 ? (
          <div className="empty">Your inventory is empty. Add your first component with <b>+ Component</b>.</div>
        ) : (
          <section>
            {view === 'inventory' && (
              <TableView list={list} total={all.length} cols={prefs.cols} sort={prefs.sort}
                onCols={(cols) => setPrefs({ cols })} onSort={(sort) => setPrefs({ sort })}
                onOpen={setDetailId} onProject={openProject} />
            )}
            {view === 'cards' && <CardsView list={list} total={all.length} onOpen={setDetailId} />}
            {view === 'projects' && (
              <ProjectsView projects={projects} byId={byId} unused={all.filter((c) => c.allocations.length === 0)}
                scrollTo={scrollTo} onScrolled={() => setScrollTo(null)} onOpen={setDetailId}
                onEdit={(p) => setEditing({ kind: 'project', item: p })} />
            )}
            {view === 'insights' && <InsightsView components={all} onOpen={setDetailId} onFilter={(f) => applyFilters(f, 'inventory')} />}
          </section>
        )}
      </main>

      {detail && (
        <Drawer c={detail} components={components} projects={projects} onClose={() => setDetailId(null)}
          onProject={openProject} onEdit={() => setEditing({ kind: 'component', item: components.find((c) => c.id === detail.id) ?? null })} />
      )}

      {editing?.kind === 'component' && (
        <ComponentForm item={editing.item} components={components} projects={projects}
          onClose={() => setEditing(null)} onSaved={(id) => { setEditing(null); setDetailId(id); }}
          onDeleted={() => { setEditing(null); setDetailId(null); }} />
      )}
      {editing?.kind === 'project' && (
        <ProjectForm item={editing.item} components={components} projects={projects}
          onClose={() => setEditing(null)} onSaved={(id) => { setEditing(null); openProject(id); }}
          onDeleted={() => setEditing(null)} />
      )}
    </>
  );
}
