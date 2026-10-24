# Electronics Inventory

A static page listing my electronic components, which ones are free and which are used in projects.
Every push to `main` validates the data and deploys the page to GitHub Pages.

## Updating

All data lives in [`data/inventory.json`](data/inventory.json).

- **Bought something**: add an entry to `components` (or raise its `quantity`). Use `null` if you don't know the count.
- **Used something in a project**: add `{ "id": "<component id>", "qty": 1 }` to that project's `components`.
- **New project**: add an entry to `projects` with `status` `active`, `planned` (parts show as reserved) or
  `archived` (parts go back to free).

Free = `quantity` − parts in `active` and `planned` projects.

Check the file before pushing:

```bash
node scripts/validate.mjs
```

## Running locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## First-time GitHub Pages setup

Repository **Settings → Pages → Source: GitHub Actions**.
