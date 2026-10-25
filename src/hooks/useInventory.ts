import * as React from 'react';
import { onSnapshot } from 'firebase/firestore';
import { userCollection } from '../lib/firebase';
import { normalizeComponent, normalizeProject } from '../lib/inventory';
import type { Component, Project } from '../lib/types';

/** Live view of the signed-in user's components and projects. */
export function useInventory(uid: string) {
  const [components, setComponents] = React.useState<Component[] | null>(null);
  const [projects, setProjects] = React.useState<Project[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fail = (e: Error) => setError(e.message);
    const offC = onSnapshot(userCollection('components'),
      (s) => setComponents(s.docs.map((d) => normalizeComponent(d.id, d.data()))), fail);
    const offP = onSnapshot(userCollection('projects'),
      (s) => setProjects(s.docs.map((d) => normalizeProject(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name))), fail);
    return () => { offC(); offP(); };
  }, [uid]);

  return { components, projects, error, loading: components == null || projects == null };
}
