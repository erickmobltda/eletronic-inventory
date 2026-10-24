(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const STATUS = {
    free: 'Free',
    partial: 'Partly used',
    'in-use': 'In use',
    reserved: 'Reserved',
  };
  const PROJECT_STATUS = { active: 'Active', planned: 'Planned', archived: 'Archived' };

  const COLUMNS = [
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'quantity', label: 'Qty', num: true },
    { key: 'used', label: 'In use', num: true },
    { key: 'reserved', label: 'Reserved', num: true },
    { key: 'free', label: 'Free', num: true },
    { key: 'status', label: 'Status' },
    { key: 'projects', label: 'Projects' },
    { key: 'interfaces', label: 'Interfaces' },
    { key: 'voltage', label: 'Voltage' },
    { key: 'source', label: 'Source' },
    { key: 'notes', label: 'Notes' },
  ];
  const DEFAULT_HIDDEN = ['reserved', 'source', 'notes'];
  const defaultCols = () => COLUMNS.map((c) => ({ key: c.key, visible: !DEFAULT_HIDDEN.includes(c.key) }));

  const PREFS_KEY = 'inventory.prefs.v1';
  const loadPrefs = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; } };
  const savePrefs = () => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ cols: state.cols, sort: state.sort, theme: state.theme })); } catch { /* storage unavailable */ }
  };

  const prefs = loadPrefs();
  const state = {
    view: 'inventory',
    q: '',
    filters: { category: '', status: '', project: '', iface: '' },
    sort: prefs.sort || { key: 'name', dir: 1 },
    cols: mergeCols(prefs.cols),
    theme: prefs.theme || '',
  };
  let components = [];
  let projects = [];
  let byId = {};

  // Keep saved column order, but pick up columns added after the prefs were saved.
  function mergeCols(saved) {
    if (!Array.isArray(saved)) return defaultCols();
    const known = saved.filter((c) => COLUMNS.some((d) => d.key === c.key));
    const missing = defaultCols().filter((d) => !known.some((c) => c.key === d.key));
    return [...known, ...missing];
  }

  function derive(data) {
    projects = data.projects || [];
    components = (data.components || []).map((c) => {
      const allocations = [];
      let used = 0;
      let reserved = 0;
      for (const p of projects) {
        for (const a of p.components || []) {
          if (a.id !== c.id || p.status === 'archived') continue;
          const qty = a.qty ?? 1;
          allocations.push({ project: p, qty });
          if (p.status === 'planned') reserved += qty; else used += qty;
        }
      }
      const quantity = c.quantity ?? null;
      const free = quantity == null ? null : Math.max(quantity - used - reserved, 0);
      let status = 'free';
      if (used + reserved > 0) {
        if (free == null || free === 0) status = used > 0 ? 'in-use' : 'reserved';
        else status = 'partial';
      }
      const haystack = [c.name, c.id, c.category, c.description, c.notes, c.voltage, c.source,
        ...(c.interfaces || []), ...Object.entries(c.specs || {}).flat(), ...allocations.map((a) => a.project.name)]
        .join(' ').toLowerCase();
      return { ...c, quantity, used, reserved, free, status, allocations, haystack };
    });
    byId = Object.fromEntries(components.map((c) => [c.id, c]));
    for (const p of projects) {
      for (const a of p.components || []) {
        if (!byId[a.id]) console.warn(`Project "${p.id}" references unknown component "${a.id}"`);
      }
    }
  }

  function matchesStatus(c, status) {
    if (status === 'available') return c.status === 'free' || c.status === 'partial';
    if (status === 'any-used') return c.used > 0;
    return c.status === status;
  }

  function filtered() {
    const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    const f = state.filters;
    return components.filter((c) =>
      terms.every((t) => c.haystack.includes(t)) &&
      (!f.category || c.category === f.category) &&
      (!f.status || matchesStatus(c, f.status)) &&
      (!f.project || (f.project === '__none' ? c.allocations.length === 0 : c.allocations.some((a) => a.project.id === f.project))) &&
      (!f.iface || (c.interfaces || []).includes(f.iface)));
  }

  function sortValue(c, key) {
    if (key === 'projects') return c.allocations.map((a) => a.project.name).join(', ');
    if (key === 'interfaces') return (c.interfaces || []).join(', ');
    if (key === 'status') return Object.keys(STATUS).indexOf(c.status);
    return c[key];
  }

  function sorted(list) {
    const { key, dir } = state.sort;
    return [...list].sort((a, b) => {
      const x = sortValue(a, key);
      const y = sortValue(b, key);
      const xe = x == null || x === '';
      const ye = y == null || y === '';
      if (xe || ye) return xe === ye ? 0 : xe ? 1 : -1; // empty values always last
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
    });
  }

  const qty = (v) => (v == null ? '?' : v);
  const badge = (status) => `<span class="badge ${status}">${STATUS[status]}</span>`;
  const projectChips = (c) => c.allocations.map((a) =>
    `<a class="chip" href="#projects" data-project="${esc(a.project.id)}">${esc(a.project.name)}${a.qty > 1 ? ` ×${a.qty}` : ''}</a>`).join('') || '<span class="muted">—</span>';

  function cell(c, key) {
    switch (key) {
      case 'name': return esc(c.name);
      case 'quantity': case 'used': case 'reserved': case 'free': return esc(qty(c[key]));
      case 'status': return badge(c.status);
      case 'projects': return projectChips(c);
      case 'interfaces': return (c.interfaces || []).map((i) => `<span class="chip">${esc(i)}</span>`).join('');
      default: return esc(c[key]);
    }
  }

  // ---------- rendering ----------

  function renderStats() {
    const units = components.reduce((s, c) => s + (c.quantity ?? 0), 0);
    const count = (st) => components.filter((c) => c.status === st).length;
    const items = [
      { v: components.length, l: 'Components', f: {} },
      { v: units, l: 'Units (known qty)', f: {} },
      { v: count('free'), l: 'Not used anywhere', f: { status: 'free' } },
      { v: components.filter((c) => c.used > 0).length, l: 'Used in a project', f: { status: 'any-used' } },
      { v: projects.filter((p) => p.status === 'active').length, l: 'Active projects', view: 'projects' },
    ];
    $('#stats').innerHTML = items.map((s, i) =>
      `<button class="stat" data-i="${i}"><div class="v">${s.v}</div><div class="l">${s.l}</div></button>`).join('');
    $('#stats').onclick = (e) => {
      const b = e.target.closest('.stat');
      if (!b) return;
      const s = items[b.dataset.i];
      if (s.view) return go(s.view);
      Object.assign(state.filters, { category: '', status: '', project: '', iface: '' });
      Object.assign(state.filters, s.f);
      syncFilterInputs();
      if (state.view !== 'inventory' && state.view !== 'cards') return go('inventory');
      render();
    };
  }

  function options(sel, list, current, allLabel) {
    sel.innerHTML = `<option value="">${allLabel}</option>` +
      list.map(([v, l]) => `<option value="${esc(v)}"${v === current ? ' selected' : ''}>${esc(l)}</option>`).join('');
  }

  function renderFilterOptions() {
    const cats = [...new Set(components.map((c) => c.category))].sort();
    const ifaces = [...new Set(components.flatMap((c) => c.interfaces || []))].sort();
    options($('#f-category'), cats.map((c) => [c, c]), state.filters.category, 'All');
    options($('#f-status'), [['available', 'Available (free or partly)'], ['any-used', 'Used in a project'], ...Object.entries(STATUS)], state.filters.status, 'All');
    options($('#f-project'), [['__none', 'Not in any project'], ...projects.map((p) => [p.id, p.name])], state.filters.project, 'All');
    options($('#f-iface'), ifaces.map((i) => [i, i]), state.filters.iface, 'All');
  }

  function syncFilterInputs() {
    $('#f-category').value = state.filters.category;
    $('#f-status').value = state.filters.status;
    $('#f-project').value = state.filters.project;
    $('#f-iface').value = state.filters.iface;
    $('#q').value = state.q;
  }

  function renderTable(list) {
    const cols = state.cols.filter((c) => c.visible).map((c) => COLUMNS.find((d) => d.key === c.key));
    if (!list.length) return `<div class="table-wrap"><div class="empty">No components match.</div></div>`;
    const head = cols.map((c) => {
      const arrow = state.sort.key === c.key ? `<span class="arrow">${state.sort.dir > 0 ? '▲' : '▼'}</span>` : '';
      return `<th draggable="true" data-key="${c.key}" class="${c.num ? 'num' : ''}" title="Click to sort, drag to reorder">${c.label}${arrow}</th>`;
    }).join('');
    const rows = list.map((c) => `<tr data-id="${esc(c.id)}">${cols.map((col) =>
      `<td class="${col.num ? 'num' : ''} ${col.key}">${cell(c, col.key)}</td>`).join('')}</tr>`).join('');
    return `<div class="count">${list.length} of ${components.length} components</div>
      <div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderCards(list) {
    if (!list.length) return `<div class="empty">No components match.</div>`;
    return `<div class="count">${list.length} of ${components.length} components</div><div class="grid">${list.map((c) => `
      <div class="card" data-id="${esc(c.id)}">
        <div class="row"><div class="title">${esc(c.name)}</div>${badge(c.status)}</div>
        <div class="desc">${esc(c.description)}</div>
        <div>${(c.interfaces || []).map((i) => `<span class="chip">${esc(i)}</span>`).join('')}</div>
        <div class="meta">${esc(c.category)} · qty ${esc(qty(c.quantity))} · free ${esc(qty(c.free))}${c.allocations.length ? ' · ' + c.allocations.map((a) => esc(a.project.name)).join(', ') : ''}</div>
      </div>`).join('')}</div>`;
  }

  function renderProjects() {
    const blocks = projects.map((p) => {
      const parts = (p.components || []).map((a) => ({ c: byId[a.id], id: a.id, qty: a.qty ?? 1 }));
      return `<div class="project" id="project-${esc(p.id)}">
        <div class="head"><h2>${esc(p.name)}</h2><span class="badge ${esc(p.status)}">${esc(PROJECT_STATUS[p.status] || p.status)}</span>
          ${p.repo ? `<a href="${esc(p.repo)}" target="_blank" rel="noopener">Repository ↗</a>` : ''}</div>
        <p>${esc(p.description)}</p>
        <ul>${parts.map(({ c, id, qty: q }) => c
          ? `<li data-id="${esc(id)}"><span>${esc(c.name)}</span><span class="muted">×${q}</span></li>`
          : `<li><span>Unknown component <code>${esc(id)}</code></span></li>`).join('') || '<li class="muted">No components yet</li>'}</ul>
      </div>`;
    }).join('');
    const unused = components.filter((c) => c.allocations.length === 0);
    return (blocks || '<div class="empty">No projects yet.</div>') + `
      <div class="project"><div class="head"><h2>Not in any project</h2><span class="badge free">${unused.length}</span></div>
        <p>Components free to use in the next build.</p>
        <ul>${unused.map((c) => `<li data-id="${esc(c.id)}"><span>${esc(c.name)}</span><span class="muted">×${esc(qty(c.quantity))}</span></li>`).join('')}</ul>
      </div>`;
  }

  function barRows(rows, filterKey) {
    const max = Math.max(...rows.map((r) => r.total), 1);
    return rows.map((r) => `<div class="bar-row" data-filter="${filterKey}" data-value="${esc(r.key)}">
      <span class="lbl">${esc(r.key)}</span>
      <div class="bar" style="width:${(r.total / max) * 100}%">${r.segs.map(([cls, n]) => n ? `<span class="${cls}" style="flex:${n}"></span>` : '').join('')}</div>
      <span class="n">${r.total}</span></div>`).join('');
  }

  function renderInsights() {
    const group = (keyFn) => {
      const m = new Map();
      for (const c of components) for (const k of [].concat(keyFn(c))) {
        if (!m.has(k)) m.set(k, []);
        m.get(k).push(c);
      }
      return [...m.entries()].map(([key, list]) => ({
        key, total: list.length,
        segs: [['f', list.filter((c) => c.status === 'free').length], ['p', list.filter((c) => c.status === 'partial').length],
          ['u', list.filter((c) => c.status === 'in-use').length], ['r', list.filter((c) => c.status === 'reserved').length]],
      })).sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
    };
    const legend = `<div class="legend"><span><i style="background:var(--free)"></i>Free</span><span><i style="background:var(--partial)"></i>Partly used</span>
      <span><i style="background:var(--used)"></i>In use</span><span><i style="background:var(--reserved)"></i>Reserved</span></div>`;
    const unknownQty = components.filter((c) => c.quantity == null);
    const units = components.filter((c) => c.quantity != null).map((c) => ({ key: c.name, total: c.quantity, segs: [['a', c.quantity]] }))
      .sort((a, b) => b.total - a.total).slice(0, 8);
    return `<div class="insights">
      <div class="panel"><h2>By category</h2>${barRows(group((c) => c.category), 'category')}${legend}</div>
      <div class="panel"><h2>By interface</h2>${barRows(group((c) => c.interfaces?.length ? c.interfaces : []), 'iface')}${legend}</div>
      <div class="panel"><h2>Most units</h2>${units.map((r) => `<div class="bar-row" data-id="${esc(components.find((c) => c.name === r.key).id)}">
        <span class="lbl">${esc(r.key)}</span><div class="bar" style="width:${(r.total / units[0].total) * 100}%"><span class="a" style="flex:1"></span></div><span class="n">${r.total}</span></div>`).join('')}</div>
      <div class="panel"><h2>Quantity unknown</h2><p class="muted">Count these and update <code>data/inventory.json</code>.</p>
        ${unknownQty.map((c) => `<div><a href="#" data-id="${esc(c.id)}">${esc(c.name)}</a></div>`).join('') || '<p class="muted">None 🎉</p>'}</div>
    </div>`;
  }

  function renderColsMenu() {
    $('#cols-menu').innerHTML = `<div class="hint">Toggle and drag to reorder</div>` + state.cols.map((c) => {
      const def = COLUMNS.find((d) => d.key === c.key);
      return `<label class="item" draggable="true" data-key="${c.key}"><input type="checkbox" ${c.visible ? 'checked' : ''} data-key="${c.key}">${def.label}<span class="grip">⋮⋮</span></label>`;
    }).join('') + `<div class="foot"><button class="btn ghost" id="cols-all">Show all</button><button class="btn ghost" id="cols-reset">Reset</button></div>`;
  }

  function render() {
    document.querySelectorAll('#tabs a').forEach((a) => a.classList.toggle('active', a.dataset.view === state.view));
    const listView = state.view === 'inventory' || state.view === 'cards';
    $('#filters').hidden = !listView;
    $('#cols-wrap').hidden = state.view !== 'inventory';
    const list = sorted(filtered());
    const html = { inventory: () => renderTable(list), cards: () => renderCards(list), projects: renderProjects, insights: renderInsights }[state.view];
    $('#view').innerHTML = html();
  }

  function go(view) {
    if (location.hash !== `#${view}`) location.hash = view;
    else { state.view = view; render(); }
  }

  // ---------- detail drawer ----------

  function openDetail(id) {
    const c = byId[id];
    if (!c) return;
    const specs = Object.entries(c.specs || {});
    $('#drawer-body').innerHTML = `
      <h2>${esc(c.name)}</h2>
      <div>${badge(c.status)} <span class="chip">${esc(c.category)}</span>${c.source ? ` <span class="chip">${esc(c.source)}</span>` : ''}</div>
      <p>${esc(c.description)}</p>
      <div class="qty-row">
        <div><b>${esc(qty(c.quantity))}</b><span>Owned</span></div>
        <div><b>${c.used}</b><span>In use</span></div>
        ${c.reserved ? `<div><b>${c.reserved}</b><span>Reserved</span></div>` : ''}
        <div><b>${esc(qty(c.free))}</b><span>Free</span></div>
      </div>
      ${c.voltage ? `<h3>Voltage</h3><div>${esc(c.voltage)}</div>` : ''}
      ${c.interfaces?.length ? `<h3>Interfaces</h3><div>${c.interfaces.map((i) => `<span class="chip">${esc(i)}</span>`).join('')}</div>` : ''}
      ${specs.length ? `<h3>Specs</h3><table class="kv">${specs.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>` : ''}
      <h3>Projects</h3><div>${projectChips(c)}</div>
      ${c.notes ? `<h3>Notes</h3><div>${esc(c.notes)}</div>` : ''}
      ${c.links?.length ? `<h3>Links</h3><div class="links">${c.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}</div>` : ''}
      <h3>ID</h3><div class="idline">${esc(c.id)}</div>`;
    $('#drawer').hidden = false;
    $('#scrim').hidden = false;
    $('#drawer-close').focus();
  }
  function closeDetail() { $('#drawer').hidden = true; $('#scrim').hidden = true; }

  // ---------- events ----------

  function bind() {
    $('#q').addEventListener('input', (e) => { state.q = e.target.value; render(); });
    for (const [id, key] of [['#f-category', 'category'], ['#f-status', 'status'], ['#f-project', 'project'], ['#f-iface', 'iface']]) {
      $(id).addEventListener('change', (e) => { state.filters[key] = e.target.value; render(); });
    }
    $('#clear').onclick = () => {
      state.q = '';
      Object.assign(state.filters, { category: '', status: '', project: '', iface: '' });
      syncFilterInputs();
      render();
    };

    $('#view').addEventListener('click', (e) => {
      const projectLink = e.target.closest('[data-project]');
      if (projectLink) { e.preventDefault(); e.stopPropagation(); return openProject(projectLink.dataset.project); }
      const bar = e.target.closest('.bar-row[data-filter]');
      if (bar) {
        Object.assign(state.filters, { category: '', status: '', project: '', iface: '' });
        state.filters[bar.dataset.filter] = bar.dataset.value;
        syncFilterInputs();
        return go('inventory');
      }
      const th = e.target.closest('th[data-key]');
      if (th) {
        const key = th.dataset.key;
        state.sort = { key, dir: state.sort.key === key ? -state.sort.dir : 1 };
        savePrefs();
        return render();
      }
      const item = e.target.closest('[data-id]');
      if (item) { e.preventDefault(); openDetail(item.dataset.id); }
    });

    $('#drawer').addEventListener('click', (e) => {
      const projectLink = e.target.closest('[data-project]');
      if (projectLink) { e.preventDefault(); closeDetail(); openProject(projectLink.dataset.project); }
    });

    // Column reordering: drag table headers or items in the Columns menu.
    let dragKey = null;
    const reorder = (from, to) => {
      if (!from || from === to) return;
      const cols = state.cols;
      const item = cols.splice(cols.findIndex((c) => c.key === from), 1)[0];
      cols.splice(cols.findIndex((c) => c.key === to), 0, item);
      savePrefs();
      render();
      renderColsMenu();
    };
    for (const root of [$('#view'), $('#cols-menu')]) {
      const sel = root === $('#view') ? 'th[data-key]' : '.item[data-key]';
      root.addEventListener('dragstart', (e) => {
        const el = e.target.closest(sel);
        if (!el) return;
        dragKey = el.dataset.key;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragKey);
      });
      root.addEventListener('dragover', (e) => {
        const el = e.target.closest(sel);
        if (!el || !dragKey) return;
        e.preventDefault();
        root.querySelectorAll('.drag-over').forEach((n) => n.classList.remove('drag-over'));
        el.classList.add('drag-over');
      });
      root.addEventListener('drop', (e) => {
        const el = e.target.closest(sel);
        if (!el) return;
        e.preventDefault();
        reorder(dragKey, el.dataset.key);
      });
      root.addEventListener('dragend', () => {
        dragKey = null;
        root.querySelectorAll('.drag-over').forEach((n) => n.classList.remove('drag-over'));
      });
    }

    $('#cols-btn').onclick = (e) => {
      e.stopPropagation();
      const menu = $('#cols-menu');
      menu.hidden = !menu.hidden;
      $('#cols-btn').setAttribute('aria-expanded', String(!menu.hidden));
    };
    $('#cols-menu').addEventListener('click', (e) => e.stopPropagation());
    $('#cols-menu').addEventListener('change', (e) => {
      const col = state.cols.find((c) => c.key === e.target.dataset.key);
      if (!col) return;
      col.visible = e.target.checked;
      savePrefs();
      render();
    });
    $('#cols-menu').addEventListener('click', (e) => {
      if (e.target.id === 'cols-reset') state.cols = defaultCols();
      else if (e.target.id === 'cols-all') state.cols.forEach((c) => { c.visible = true; });
      else return;
      savePrefs();
      render();
      renderColsMenu();
    });
    document.addEventListener('click', () => { $('#cols-menu').hidden = true; $('#cols-btn').setAttribute('aria-expanded', 'false'); });

    $('#drawer-close').onclick = closeDetail;
    $('#scrim').onclick = closeDetail;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDetail();
      if (e.key === '/' && document.activeElement !== $('#q')) { e.preventDefault(); $('#q').focus(); }
    });

    $('#theme').onclick = () => {
      const dark = document.documentElement.dataset.theme
        ? document.documentElement.dataset.theme === 'dark'
        : matchMedia('(prefers-color-scheme: dark)').matches;
      state.theme = dark ? 'light' : 'dark';
      document.documentElement.dataset.theme = state.theme;
      savePrefs();
    };

    window.addEventListener('hashchange', fromHash);
  }

  function openProject(id) {
    go('projects');
    requestAnimationFrame(() => document.getElementById(`project-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function fromHash() {
    const view = location.hash.slice(1);
    state.view = ['inventory', 'cards', 'projects', 'insights'].includes(view) ? view : 'inventory';
    render();
  }

  // ---------- boot ----------

  if (state.theme) document.documentElement.dataset.theme = state.theme;
  const build = $('#updated').dataset.build;
  if (build && !build.startsWith('__')) $('#updated').textContent = `Updated ${build}`;

  fetch('data/inventory.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then((data) => {
      derive(data);
      renderStats();
      renderFilterOptions();
      renderColsMenu();
      bind();
      fromHash();
    })
    .catch((err) => {
      $('#view').innerHTML = `<div class="empty">Could not load data/inventory.json (${esc(err.message)}).<br>
        Open the page through a web server, e.g. <code>python3 -m http.server</code>.</div>`;
    });
})();
