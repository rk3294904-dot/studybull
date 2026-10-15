import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { LoginModal } from '@/components/LoginModal';
import { useAuth } from '@/context/AuthContext';

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" aria-hidden="true" />
        <span className="sr-only">Checking your sign-in...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginModal message="You must sign in with Google to use the app." />;
  }

  return <>{children}</>;
}
