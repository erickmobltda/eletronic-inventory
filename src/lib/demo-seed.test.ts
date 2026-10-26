import { describe, expect, it } from 'vitest';
import seed from '../../scripts/demo-seed.json';
import { normalizeComponent, normalizeProject, overAllocation } from './inventory';
import type { Project } from './types';

// scripts/reset-demo.mjs writes this straight to Firestore, past the app's checks.
describe('demo seed', () => {
  const components = Object.entries(seed.components).map(([id, c]) => normalizeComponent(id, c));
  const projects = Object.entries(seed.projects).map(([id, p]) => normalizeProject(id, p as Partial<Project>));

  it('only lists components it has, and never more than it owns', () => {
    const ids = new Set(components.map((c) => c.id));
    expect(projects.flatMap((p) => p.components).filter((a) => !ids.has(a.id))).toEqual([]);
    expect(overAllocation(components, projects)).toBeNull();
  });
});
