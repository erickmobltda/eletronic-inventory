import { deleteDoc, setDoc } from 'firebase/firestore';
import { userDoc } from './firebase';
import { now, overAllocation } from './inventory';
import type { Component, Project } from './types';

// All writes go straight to Firestore; firestore.rules (in erickmob-api) only
// lets the signed-in owner touch apps/inventory/users/{uid}.

function withoutId<T extends { id: string }>(item: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = item;
  return rest;
}

export async function saveComponent(c: Component, components: Component[], projects: Project[]): Promise<void> {
  const next = [...components.filter((x) => x.id !== c.id), c];
  const err = overAllocation(next, projects);
  if (err) throw new Error(`${err}. Lower the project quantities first.`);
  const ts = now();
  await setDoc(userDoc('components', c.id), { ...withoutId(c), created_at: c.created_at ?? ts, updated_at: ts });
}

/** Refused while a project still lists the component (Firestore has no foreign keys). */
export async function deleteComponent(id: string, projects: Project[]): Promise<void> {
  const users = projects.filter((p) => p.components.some((a) => a.id === id));
  if (users.length) throw new Error(`Remove it from ${users.map((p) => `"${p.name}"`).join(', ')} first.`);
  await deleteDoc(userDoc('components', id));
}

export async function saveProject(p: Project, components: Component[], projects: Project[]): Promise<void> {
  const next = [...projects.filter((x) => x.id !== p.id), p];
  const err = overAllocation(components, next);
  if (err) throw new Error(err);
  const ts = now();
  await setDoc(userDoc('projects', p.id), { ...withoutId(p), created_at: p.created_at ?? ts, updated_at: ts });
}

export async function deleteProject(id: string): Promise<void> {
  await deleteDoc(userDoc('projects', id));
}
