import type { Component } from './types';

// "Auto-fill" in the component form: erickmob-api asks Claude what the part is
// (identify() in api.ts) and the answer only fills what the form leaves empty.

export type Pair = { a: string; b: string };

export type FormFields = {
  name: string;
  category: string;
  voltage: string;
  interfaces: string; // comma separated, as typed in the form
  description: string;
  notes: string;
  specs: Pair[];
  links: Pair[];
};

export type Identified = Partial<Pick<Component, 'name' | 'category' | 'voltage' | 'interfaces' | 'description' | 'notes' | 'specs' | 'links'>>;

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Fill the empty form fields from `found`; specs and links are added, never replaced. */
export function mergeEmpty(form: FormFields, found: Identified): FormFields {
  const keep = (mine: string, theirs: unknown) => (mine.trim() ? mine : text(theirs));
  const specs = form.specs.filter((p) => p.a.trim() || p.b.trim());
  const specNames = new Set(specs.map((p) => p.a.trim().toLowerCase()));
  for (const [a, b] of Object.entries(found.specs ?? {})) {
    if (text(a) && text(b) && !specNames.has(text(a).toLowerCase())) specs.push({ a: text(a), b: text(b) });
  }
  const links = form.links.filter((p) => p.a.trim() || p.b.trim());
  const urls = new Set(links.map((p) => p.b.trim()));
  for (const l of found.links ?? []) {
    if (text(l?.url) && !urls.has(text(l.url))) links.push({ a: text(l.label), b: text(l.url) });
  }
  return {
    name: keep(form.name, found.name),
    category: keep(form.category, found.category),
    voltage: keep(form.voltage, found.voltage),
    interfaces: keep(form.interfaces, (found.interfaces ?? []).map(text).filter(Boolean).join(', ')),
    description: keep(form.description, found.description),
    notes: keep(form.notes, found.notes),
    specs,
    links,
  };
}
