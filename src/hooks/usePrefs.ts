import * as React from 'react';
import { mergeCols, type Col, type Sort } from '../lib/view';

// Per-browser view preferences (column order, sort, theme). The inventory itself is in Firestore.
const PREFS_KEY = 'inventory.prefs.v1';

type Prefs = { cols: Col[]; sort: Sort; theme: '' | 'light' | 'dark' };

function load(): Prefs {
  let saved: Partial<Prefs> = {};
  try { saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') || {}; } catch { /* storage unavailable */ }
  return { cols: mergeCols(saved.cols), sort: saved.sort ?? { key: 'name', dir: 1 }, theme: saved.theme ?? '' };
}

export function usePrefs() {
  const [prefs, setPrefs] = React.useState<Prefs>(load);

  React.useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* storage unavailable */ }
    if (prefs.theme) document.documentElement.dataset.theme = prefs.theme;
    else delete document.documentElement.dataset.theme;
  }, [prefs]);

  const update = React.useCallback((patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch })), []);
  return [prefs, update] as const;
}
