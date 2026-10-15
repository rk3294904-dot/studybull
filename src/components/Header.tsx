import { LogIn, LogOut, Send, Trophy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Props {
  onHome: () => void;
  onLeaderboard: () => void;
  onLogin: () => void;
}

export function Header({ onHome, onLeaderboard, onLogin }: Props) {
  const { user, logout } = useAuth();
  const iconButton =
    'rounded-lg border border-slate-700/70 p-2 text-slate-300 transition hover:border-sky-400/50 hover:bg-slate-800 hover:text-white active:scale-95';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button
          onClick={onHome}
          className="flex items-center gap-2.5 transition active:scale-95"
        >
          <img
            src="/quantica-logo.svg"
            alt="Quantica Digital logo"
            className="h-9 w-9 rounded-xl shadow-lg shadow-blue-500/20"
          />
          <div className="hidden text-left min-[380px]:block">
            <h1 className="text-base font-bold text-white leading-tight">
Study Bull
            </h1>
            <p className="text-[10px] text-slate-400 leading-tight">
              Learning Platform
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onLeaderboard}
            aria-label="Open leaderboard"
            className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-400/20 active:scale-95 sm:text-sm"
          >
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Leaderboard</span>
          </button>
          {user?.photoURL && (
            <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full ring-2 ring-slate-700" />
          )}
          {user ? (
            <button onClick={() => logout()} aria-label="Sign out" title="Sign out" className={iconButton}>
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700/70 px-2.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 active:scale-95 sm:text-sm"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign in</span>
            </button>
          )}
          <a
            href="https://t.me/+cld-t6gvyONhMjU1"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-500 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-sky-400 hover:to-blue-400 active:scale-95 sm:text-sm"
          >
            <Send className="h-4 w-4" />
            <span className="hidden md:inline">Join Telegram</span>
          </a>
        </div>
      </div>
    </header>
  );
}
