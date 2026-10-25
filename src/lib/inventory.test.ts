import { describe, expect, it } from 'vitest';
import { allocated, derive, normalizeComponent, normalizeProject, overAllocation, slugify, uniqueId } from './inventory';
import { filterComponents, mergeCols, sortComponents, EMPTY_FILTERS, defaultCols } from './view';
import type { Project } from './types';

const comp = (id: string, quantity: number | null, extra = {}) => normalizeComponent(id, { name: id.toUpperCase(), category: 'Cat', quantity, ...extra });
const proj = (id: string, status: Project['status'], components: Project['components']) => normalizeProject(id, { name: id, status, components });

describe('derive', () => {
  it('splits used (active), reserved (planned) and free; archived gives parts back', () => {
    const [c] = derive([comp('led', 10)], [
      proj('a', 'active', [{ id: 'led', qty: 3 }]),
      proj('p', 'planned', [{ id: 'led', qty: 2 }]),
      proj('x', 'archived', [{ id: 'led', qty: 5 }]),
    ]);
    expect([c.used, c.reserved, c.free, c.status]).toEqual([3, 2, 5, 'partial']);
    expect(c.allocations.map((a) => a.project.id)).toEqual(['a', 'p']);
  });

  it('status: free, in-use, reserved, and unknown quantity', () => {
    const projects = [proj('a', 'active', [{ id: 'one', qty: 1 }, { id: 'unk', qty: 1 }]), proj('p', 'planned', [{ id: 'two', qty: 2 }])];
    const out = derive([comp('free', 1), comp('one', 1), comp('two', 2), comp('unk', null)], projects);
    expect(out.map((c) => c.status)).toEqual(['free', 'in-use', 'reserved', 'in-use']);
    expect(out[3].free).toBeNull();
  });

  it('search covers specs and project names', () => {
    const out = derive([comp('esp', 1, { specs: { SoC: 'Xtensa LX6' } })], [proj('painel', 'active', [{ id: 'esp', qty: 1 }])]);
    expect(filterComponents(out, 'xtensa', EMPTY_FILTERS)).toHaveLength(1);
    expect(filterComponents(out, 'painel', EMPTY_FILTERS)).toHaveLength(1);
    expect(filterComponents(out, '', { ...EMPTY_FILTERS, project: '__none' })).toHaveLength(0);
  });
});

describe('allocation checks (what validate.mjs did)', () => {
  const projects = [proj('a', 'active', [{ id: 'led', qty: 3 }]), proj('b', 'planned', [{ id: 'led', qty: 2 }])];

  it('counts active and planned, optionally ignoring one project', () => {
    expect(allocated(projects, 'led')).toBe(5);
    expect(allocated(projects, 'led', 'a')).toBe(2);
  });

  it('flags projects using more than owned, ignores unknown quantities', () => {
    expect(overAllocation([comp('led', 5)], projects)).toBeNull();
    expect(overAllocation([comp('led', 4)], projects)).toMatch(/projects use 5 but only 4 owned/);
    expect(overAllocation([comp('led', null)], projects)).toBeNull();
  });
});

describe('ids', () => {
  it('slugifies names', () => {
    expect(slugify('Capitã Maeva — Jogo!')).toBe('capita-maeva-jogo');
    expect(slugify('***')).toBe('item');
  });

  it('avoids taken ids', () => {
    expect(uniqueId('LED red', ['led-red', 'led-red-2'])).toBe('led-red-3');
    expect(uniqueId('LED red', [])).toBe('led-red');
  });
});

describe('normalize', () => {
  it('fills missing fields so Firestore never sees undefined', () => {
    const c = normalizeComponent('x', { name: ' X ', category: 'Cat' });
    expect(c).toMatchObject({ name: 'X', quantity: null, interfaces: [], specs: {}, links: [], notes: '', source: '' });
    expect(normalizeProject('p', { name: 'P', status: 'bogus' as never }).status).toBe('active');
  });
});

describe('view', () => {
  it('sorts with empty values last in both directions', () => {
    const out = derive([comp('a', 2), comp('b', null), comp('c', 1)], []);
    expect(sortComponents(out, { key: 'quantity', dir: 1 }).map((c) => c.id)).toEqual(['c', 'a', 'b']);
    expect(sortComponents(out, { key: 'quantity', dir: -1 }).map((c) => c.id)).toEqual(['a', 'c', 'b']);
  });

  it('keeps saved column order and adds new columns', () => {
    const cols = mergeCols([{ key: 'free', visible: true }, { key: 'gone', visible: true }]);
    expect(cols[0].key).toBe('free');
    expect(cols).toHaveLength(defaultCols().length);
  });
});
