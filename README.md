# Electronics Inventory

My electronic components, which ones are free and which are used in projects. Each user signs in and keeps their own components and projects; everything is edited in the browser and saved in Firestore.

**Live:** <https://inventory.erickmob.dev> · Every push to `main` runs the tests, builds and deploys to GitHub Pages.

## Stack

- **Frontend:** React · Vite · TypeScript (plain CSS)
- **Login:** Firebase Auth, project `erickmob-apps` — the same email and password as every other erickmob app. Sign-up is off; accounts are created in the Firebase console. **Try the demo** signs in with the public demo account (see [Live demo](#live-demo)).
- **Data:** Firestore, per user:
  - `apps/inventory/users/{uid}/components/{id}` — name, category, quantity (`null` = unknown), voltage, interfaces, description, specs, links, notes, source
  - `apps/inventory/users/{uid}/projects/{id}` — name, status, description, repo, `components: [{ id, qty }]`
- **Rules:** in [erickmob-api](https://github.com/erickmobltda/erickmob-api) `firebase/firestore.rules` (owner only, plus the checks below).
- **Auto-fill:** erickmob-api `POST /inventory/identify` (Claude Haiku 5.5, behind the Firebase login). Everything else reads and writes Firestore directly.

## Live demo

Click **Try the demo** on <https://inventory.erickmob.dev>. It signs in with `demo@ledgenator.app` / `demo1234`, the public sandbox account shared by the erickmob apps, which has its own inventory: the 28 components from the old static page and four projects (active, planned, archived).

It's a **shared sandbox**: anyone can sign in and change it. To restore it:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-sa.json npm run reset-demo
```

It replaces the demo account's `components` and `projects` with `scripts/demo-seed.json` (and restores its password and `demo` claim). `src/lib/demo-seed.test.ts` checks the seed against the app's rules (no over-allocation).

## How it works

- **Project status:** `active` uses the parts, `planned` reserves them, `archived` gives them back.
- **Free** = quantity − parts in `active` and `planned` projects.
- A project can't use more units than you own (the old `scripts/validate.mjs` check), and a component can't be deleted while a project still lists it.
- Link a component to a project from the project's **Edit** form or from the component's detail drawer (**Add to project**).
- **Auto-fill** (next to the name in the component form): type a name such as `Raspberry Pi 5`, or tap **Photo** to take or pick a picture, and Claude fills category, voltage, interfaces, description, specs, links and notes. It only fills empty fields (specs and links are added, quantity is never touched); review and **Save**. It comes from the model's own knowledge, so double-check specs and links for obscure parts. Not shown to the demo account.
- Column order, sort and theme are saved per browser (localStorage).

## Required env (repo secrets)

| Variable | Source |
| --- | --- |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID` | `firebase apps:sdkconfig WEB <inventory appId> --project erickmob-apps` |
| `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` | `erickmob-apps.firebaseapp.com`, `erickmob-apps` |
| `VITE_API_URL` | `https://api.erickmob.dev` (set in the workflow, not a secret; defaults to `http://localhost:8010`) |

Locally: copy `.env.example` to `.env` and fill it in.

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (vitest)
npm run build
npm run reset-demo # restore the demo account (needs the Firebase service account)
```

Against the Firebase emulators instead of production (needs Java and `firebase-tools`), with a `firebase.json` that enables `auth` and `firestore` (e.g. `my_readmes/migration-kit/emulators.firebase.json`):

```bash
firebase emulators:start --only auth,firestore --project demo-erickmob
VITE_USE_EMULATORS=true VITE_FIREBASE_PROJECT_ID=demo-erickmob VITE_FIREBASE_API_KEY=fake VITE_FIREBASE_APP_ID=fake npm run dev
```

## History

Until Oct 2026 this was a static page: all data in `data/inventory.json`, validated by `scripts/validate.mjs` on each deploy, no login. See [CHANGELOG.md](CHANGELOG.md).
