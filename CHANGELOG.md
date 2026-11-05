# Changelog

## 2026-11-05 — A photo on each component and project

**Why:** a photo makes a part or a build much easier to spot than its name.

- Component and project forms: a **Photo** field to pick or take a picture, with a preview, **Change** and **Remove**. Nothing is uploaded until **Save**. Hidden for the demo account.
- A thumbnail next to the name in the table, cards and projects list (an empty box when there's none), and a large photo at the top of the drawer (click for full size).
- Storage: the browser resizes the photo to 800 px WebP (JPEG on Safari, which can't always encode WebP) and uploads it with erickmob-api `POST /inventory/photos`. It lands in the public Cloudflare R2 bucket `erickmob-cdn` at `https://cdn.erickmob.dev/inventory/{uid}/{uuid}.webp`, and its URL is saved as the new `photo` field (`''` = none).
- Replacing or removing a photo, or deleting the item, deletes the old file (`DELETE /inventory/photos/...`, best effort). If the save fails, the file that was just uploaded is deleted again.
- The names are random, so the URLs can't be guessed, but anyone with a link can see the photo.

## 2026-10-27 — Auto-fill a component from its name or a photo

**Why:** adding a part meant typing category, voltage, interfaces, specs and links by hand.

- Component form: **Auto-fill** (from the typed name) and **Photo** (take or pick a picture) next to the name. Only empty fields are filled; specs and links are added without duplicates; quantity is never touched. Hidden for the demo account.
- Backend: erickmob-api `POST /inventory/identify` (Claude Haiku 5.5). Photos are scaled to 1568 px JPEG in the browser first.
- New build env `VITE_API_URL` (`https://api.erickmob.dev`, in the Pages workflow).

## 2026-10-25 — Login + Firestore, edit in the browser

**Why:** the page was static, so nothing changed in the browser could be saved; every edit meant committing `data/inventory.json`. Now each user signs in with the shared erickmob login and edits their own components and projects.

| | Before | After |
|---|---|---|
| URL | `erickmobltda.github.io/eletronic-inventory/` | **`https://inventory.erickmob.dev`** (old URL redirects) |
| Code | `index.html` + `assets/app.js` (vanilla JS) | React + Vite + TypeScript, same screens (Inventory, Cards, Projects, Insights) and styles |
| Login | none (public) | Firebase Auth, project `erickmob-apps`, shared with the other apps; sign-up off; demo account kept out |
| Data | `data/inventory.json` in the repo | Firestore `apps/inventory/users/{uid}/{components,projects}` |
| Editing | commit the JSON | create / edit / delete components and projects, link components to projects with a quantity |
| Checks | `scripts/validate.mjs` on deploy | in the app (no over-allocation, no deleting a component a project still uses) and in the Firestore rules (name, category, whole-number quantity, project status) |
| Deploy | copy files to Pages | `npm ci && npm test && npm run build` with the 4 `VITE_FIREBASE_*` secrets, then `actions/deploy-pages` |

### Data migration

`my_readmes/migration-kit/migrate_inventory.py` copies the last `data/inventory.json` (28 components, 1 project) to `erickmobltda@gmail.com`'s account, keeping the JSON ids as document ids. It skips documents that already exist, so re-running is safe. Tested twice in the emulator: 28 + 1 written, then 0 written; counts match.

### Removed

`index.html` (old), `assets/`, `data/inventory.json`, `scripts/validate.mjs`. The JSON is still in the git history (`git show 3e4e7fc:data/inventory.json`).
