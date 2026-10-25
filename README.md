# Electronics Inventory

My electronic components, which ones are free and which are used in projects. Each user signs in and keeps their own components and projects; everything is edited in the browser and saved in Firestore.

**Live:** <https://inventory.erickmob.dev> · Every push to `main` runs the tests, builds and deploys to GitHub Pages.

## Stack

- **Frontend:** React · Vite · TypeScript (plain CSS)
- **Login:** Firebase Auth, project `erickmob-apps` — the same email and password as every other erickmob app. Sign-up is off; accounts are created in the Firebase console. The Ledgenator demo account is kept out.
- **Data:** Firestore, per user:
  - `apps/inventory/users/{uid}/components/{id}` — name, category, quantity (`null` = unknown), voltage, interfaces, description, specs, links, notes, source
  - `apps/inventory/users/{uid}/projects/{id}` — name, status, description, repo, `components: [{ id, qty }]`
- **Rules:** in [erickmob-api](https://github.com/erickmobltda/erickmob-api) `firebase/firestore.rules` (owner only, plus the checks below). No erickmob-api endpoint: the app only touches its own documents.

## How it works

- **Project status:** `active` uses the parts, `planned` reserves them, `archived` gives them back.
- **Free** = quantity − parts in `active` and `planned` projects.
- A project can't use more units than you own (the old `scripts/validate.mjs` check), and a component can't be deleted while a project still lists it.
- Link a component to a project from the project's **Edit** form or from the component's detail drawer (**Add to project**).
- Column order, sort and theme are saved per browser (localStorage).

## Required env (repo secrets)

| Variable | Source |
| --- | --- |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID` | `firebase apps:sdkconfig WEB <inventory appId> --project erickmob-apps` |
| `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` | `erickmob-apps.firebaseapp.com`, `erickmob-apps` |

Locally: copy `.env.example` to `.env` and fill it in.

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (vitest)
npm run build
```

Against the Firebase emulators instead of production (needs Java and `firebase-tools`), with a `firebase.json` that enables `auth` and `firestore` (e.g. `my_readmes/migration-kit/emulators.firebase.json`):

```bash
firebase emulators:start --only auth,firestore --project demo-erickmob
VITE_USE_EMULATORS=true VITE_FIREBASE_PROJECT_ID=demo-erickmob VITE_FIREBASE_API_KEY=fake VITE_FIREBASE_APP_ID=fake npm run dev
```

## History

Until Oct 2026 this was a static page: all data in `data/inventory.json`, validated by `scripts/validate.mjs` on each deploy, no login. See [CHANGELOG.md](CHANGELOG.md).
