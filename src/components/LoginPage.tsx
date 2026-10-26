import * as React from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

// Public sandbox account shared by the erickmob apps (custom claim `demo`); the
// Firestore rules keep it inside its own inventory. `npm run reset-demo` restores it.
const DEMO_EMAIL = 'demo@ledgenator.app';
const DEMO_PASSWORD = 'demo1234';

// Same login as every erickmob app (Firebase project erickmob-apps). Sign-up is
// off: accounts are created in the Firebase console.
export function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  async function signIn(withEmail: string, withPassword: string) {
    setBusy(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, withEmail, withPassword);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form
        className="panel login-card"
        onSubmit={(e) => {
          e.preventDefault();
          void signIn(email, password);
        }}
      >
        <h1>🔌 Electronics Inventory</h1>
        <p className="muted">Sign in with your erickmob account.</p>
        <label className="field">Email
          <input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">Password
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary" type="submit" disabled={busy || !email || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <button className="btn" type="button" disabled={busy} onClick={() => void signIn(DEMO_EMAIL, DEMO_PASSWORD)}>Try the demo</button>
        <p className="muted">Explore a sample inventory — no sign-up needed.</p>
      </form>
    </div>
  );
}
