import type { Component, ComponentStatus, DerivedComponent, Project, ProjectStatus } from './types';

export const STATUS: Record<ComponentStatus, string> = {
  free: 'Free',
  partial: 'Partly used',
  'in-use': 'In use',
  reserved: 'Reserved',
};

export const PROJECT_STATUS: Record<ProjectStatus, string> = { active: 'Active', planned: 'Planned', archived: 'Archived' };

/** Free = quantity − parts in active and planned projects. Archived projects give their parts back. */
export function derive(components: Component[], projects: Project[]): DerivedComponent[] {
  return components.map((c) => {
    const allocations: DerivedComponent['allocations'] = [];
    let used = 0;
    let reserved = 0;
    for (const p of projects) {
      for (const a of p.components) {
        if (a.id !== c.id || p.status === 'archived') continue;
        const qty = a.qty ?? 1;
        allocations.push({ project: p, qty });
        if (p.status === 'planned') reserved += qty;
        else used += qty;
      }
    }
    const quantity = c.quantity ?? null;
    const free = quantity == null ? null : Math.max(quantity - used - reserved, 0);
    let status: ComponentStatus = 'free';
    if (used + reserved > 0) {
      if (free == null || free === 0) status = used > 0 ? 'in-use' : 'reserved';
      else status = 'partial';
    }
    const haystack = [c.name, c.id, c.category, c.description, c.notes, c.voltage, c.source,
      ...c.interfaces, ...Object.entries(c.specs).flat(), ...allocations.map((a) => a.project.name)]
      .join(' ').toLowerCase();
    return { ...c, quantity, used, reserved, free, status, allocations, haystack };
  });
}

/** Units of a component taken by active and planned projects, optionally ignoring one project. */
export function allocated(projects: Project[], componentId: string, exceptProjectId?: string): number {
  let n = 0;
  for (const p of projects) {
    if (p.status === 'archived' || p.id === exceptProjectId) continue;
    for (const a of p.components) if (a.id === componentId) n += a.qty ?? 1;
  }
  return n;
}

/**
 * The check scripts/validate.mjs ran before each deploy of the static page:
 * projects may not use more units than are owned. Returns an error message or null.
 */
export function overAllocation(components: Component[], projects: Project[]): string | null {
  for (const c of components) {
    if (c.quantity == null) continue;
    const n = allocated(projects, c.id);
    if (n > c.quantity) return `"${c.name}": projects use ${n} but only ${c.quantity} owned`;
  }
  return null;
}

export function slugify(text: string): string {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'item';
}

/** A slug of `name` that is not in `taken` (adds -2, -3… when needed). */
export function uniqueId(name: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = slugify(name);
  if (!used.has(base)) return base;
  for (let i = 2; ; i++) if (!used.has(`${base}-${i}`)) return `${base}-${i}`;
}

/** Same format as the old JSON and the other apps: JavaScript's toISOString(). */
export const now = () => new Date().toISOString();

/** Firestore rejects `undefined`; fill every field the rules and the UI expect. */
export function normalizeComponent(id: string, d: Partial<Component>): Component {
  return {
    id,
    name: String(d.name ?? '').trim(),
    category: String(d.category ?? '').trim(),
    quantity: d.quantity == null ? null : Number(d.quantity),
    voltage: d.voltage ?? '',
    interfaces: Array.isArray(d.interfaces) ? d.interfaces : [],
    description: d.description ?? '',
    specs: d.specs && typeof d.specs === 'object' ? d.specs : {},
    links: Array.isArray(d.links) ? d.links : [],
    notes: d.notes ?? '',
    source: d.source ?? '',
    created_at: d.created_at,
    updated_at: d.updated_at,
  };
}

export function normalizeProject(id: string, d: Partial<Project>): Project {
  return {
    id,
    name: String(d.name ?? '').trim(),
    status: (['active', 'planned', 'archived'] as const).includes(d.status as ProjectStatus) ? (d.status as ProjectStatus) : 'active',
    description: d.description ?? '',
    repo: d.repo ?? '',
    components: Array.isArray(d.components) ? d.components.map((a) => ({ id: a.id, qty: a.qty ?? 1 })) : [],
    created_at: d.created_at,
    updated_at: d.updated_at,
  };
}
