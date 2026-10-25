import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { collection, connectFirestoreEmulator, doc, getFirestore } from 'firebase/firestore';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
});

export const auth = getAuth(app);
export const db = getFirestore(app);

// Local development against `firebase emulators:start --only auth,firestore` (README).
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

export function currentUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

type UserCollection = 'components' | 'projects';

// Each user's inventory lives under apps/inventory/users/{uid}.
export const userCollection = (name: UserCollection) =>
  collection(db, 'apps', 'inventory', 'users', currentUid(), name);

export const userDoc = (name: UserCollection, id: string) =>
  doc(db, 'apps', 'inventory', 'users', currentUid(), name, id);
