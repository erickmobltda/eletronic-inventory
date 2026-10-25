import { STATUS } from './inventory';
import type { DerivedComponent } from './types';

export type Filters = { category: string; status: string; project: string; iface: string };
export const EMPTY_FILTERS: Filters = { category: '', status: '', project: '', iface: '' };

export type Sort = { key: ColumnKey; dir: 1 | -1 };

export const COLUMNS = [
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
] as const;

export type ColumnKey = (typeof COLUMNS)[number]['key'];
export type Col = { key: ColumnKey; visible: boolean };

const DEFAULT_HIDDEN: ColumnKey[] = ['reserved', 'source', 'notes'];
export const defaultCols = (): Col[] => COLUMNS.map((c) => ({ key: c.key, visible: !DEFAULT_HIDDEN.includes(c.key) }));

/** Keep saved column order, but pick up columns added after the prefs were saved. */
export function mergeCols(saved: unknown): Col[] {
  if (!Array.isArray(saved)) return defaultCols();
  const known = saved.filter((c): c is Col => COLUMNS.some((d) => d.key === c?.key));
  const missing = defaultCols().filter((d) => !known.some((c) => c.key === d.key));
  return [...known, ...missing];
}

function matchesStatus(c: DerivedComponent, status: string) {
  if (status === 'available') return c.status === 'free' || c.status === 'partial';
  if (status === 'any-used') return c.used > 0;
  return c.status === status;
}

export function filterComponents(list: DerivedComponent[], q: string, f: Filters): DerivedComponent[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter((c) =>
    terms.every((t) => c.haystack.includes(t)) &&
    (!f.category || c.category === f.category) &&
    (!f.status || matchesStatus(c, f.status)) &&
    (!f.project || (f.project === '__none' ? c.allocations.length === 0 : c.allocations.some((a) => a.project.id === f.project))) &&
    (!f.iface || c.interfaces.includes(f.iface)));
}

function sortValue(c: DerivedComponent, key: ColumnKey): string | number | null {
  if (key === 'projects') return c.allocations.map((a) => a.project.name).join(', ');
  if (key === 'interfaces') return c.interfaces.join(', ');
  if (key === 'status') return Object.keys(STATUS).indexOf(c.status);
  return c[key];
}

export function sortComponents(list: DerivedComponent[], { key, dir }: Sort): DerivedComponent[] {
  return [...list].sort((a, b) => {
    const x = sortValue(a, key);
    const y = sortValue(b, key);
    const xe = x == null || x === '';
    const ye = y == null || y === '';
    if (xe || ye) return xe === ye ? 0 : xe ? 1 : -1; // empty values always last
    return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
  });
}
