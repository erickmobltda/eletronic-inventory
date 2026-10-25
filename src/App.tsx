import { useAuth } from './hooks/useAuth';
import { LoginPage } from './components/LoginPage';
import { InventoryApp } from './InventoryApp';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="empty">Loading…</div>;
  if (!user) return <LoginPage />;
  return <InventoryApp key={user.uid} uid={user.uid} email={user.email ?? ''} />;
}
