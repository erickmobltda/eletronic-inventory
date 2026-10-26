// Restores the public demo account (demo@ledgenator.app / demo1234) to the
// sample inventory in demo-seed.json, wiping whatever visitors changed.
//
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-sa.json npm run reset-demo
//
// The account is shared with the other erickmob apps; only its inventory is
// touched here.
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const DEMO_EMAIL = 'demo@ledgenator.app';
const DEMO_PASSWORD = 'demo1234';

initializeApp({ projectId: 'erickmob-apps' });
const auth = getAuth();
const db = getFirestore();

const seed = JSON.parse(readFileSync(new URL('./demo-seed.json', import.meta.url), 'utf8'));
const demo = await auth.getUserByEmail(DEMO_EMAIL);

// The claim keeps the demo away from paid APIs and from shared data.
await auth.updateUser(demo.uid, { password: DEMO_PASSWORD });
await auth.setCustomUserClaims(demo.uid, { demo: true });

const userRef = db.doc(`apps/inventory/users/${demo.uid}`);
for (const [collection, docs] of Object.entries(seed)) {
  await db.recursiveDelete(userRef.collection(collection));
  const batch = db.batch();
  for (const [id, data] of Object.entries(docs)) {
    batch.set(userRef.collection(collection).doc(id), data);
  }
  await batch.commit();
  console.log(`${collection}: ${Object.keys(docs).length}`);
}
