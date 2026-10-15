import { useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { authErrorMessage, useAuth } from '@/context/AuthContext';

interface Props {
  message?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function LoginModal({ message, onClose, onSuccess }: Props) {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const handleGoogle = async () => {
    setBusy(true);
    setError('');
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={onClose
        ? 'fixed inset-0 z-[70] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-md'
        : 'flex min-h-screen items-center justify-center bg-slate-900 px-4 py-6'}
      onClick={onClose}
      role={onClose ? 'dialog' : 'main'}
      aria-modal={onClose ? true : undefined}
      aria-labelledby="sign-in-title"
    >
      <div
        className="relative w-full max-w-sm rounded-3xl border border-slate-700/60 bg-slate-900 p-6 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="mb-5 flex flex-col items-center text-center">
          <img src="/quantica-logo.svg" alt="Quantica Digital logo" className="mb-3 h-12 w-12 rounded-xl" />
          <h2 id="sign-in-title" className="text-lg font-bold text-white">Sign in to continue</h2>
          {message && <p className="mt-1 text-sm text-slate-400">{message}</p>}
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={handleGoogle}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <GoogleIcon />}
          {busy ? 'Signing in...' : 'Sign in with Google'}
        </button>

        {error && (
          <div role="alert" className="mt-4 flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
