import { useCallback, useEffect, useState } from 'react';
import { Crown, Medal, RefreshCw, Sparkles, Trophy, UserRound } from 'lucide-react';
import { ensureLeaderboardEntry, listLeaderboard, POINTS, type LeaderboardEntry } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';

export function LeaderboardView() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Make sure the viewer has an entry before listing, so they always see themselves.
      if (user) await ensureLeaderboardEntry(user).catch(() => {});
      setEntries(await listLeaderboard());
    } catch (err) {
      console.error('Failed to load leaderboard:', (err as Error).message);
      const code = (err as { code?: string }).code;
      setError(
        code === 'permission-denied'
          ? 'Leaderboard access was denied. Publish the Firestore security rules in the Firebase console and try again.'
          : code === 'unavailable'
            ? 'Could not reach Firestore. Check your connection and that a Firestore database exists for this project.'
            : 'Could not load the leaderboard. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const myRank = entries.findIndex((e) => e.uid === user?.uid);
  const me = myRank >= 0 ? entries[myRank] : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-amber-400">Top learners</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Leaderboard</h1>
          <p className="mt-2 text-sm text-slate-400">
            Earn {POINTS.lecture} points for every new lecture you watch and {POINTS.enroll} points per enrolled batch.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          aria-label="Refresh leaderboard"
          className="rounded-lg border border-slate-700/70 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {me && (
        <div className="mb-5 flex items-center gap-4 rounded-2xl border border-sky-400/30 bg-sky-400/10 p-4">
          <span className="text-2xl font-bold text-sky-300">#{myRank + 1}</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Your rank</p>
            <p className="text-xs text-slate-400">{me.lecturesWatched} lectures · {me.enrolledCount} batches</p>
          </div>
          <span className="text-lg font-bold text-white">{me.points.toLocaleString()} pts</span>
        </div>
      )}

      {loading && entries.length === 0 ? (
        <div role="status" aria-label="Loading leaderboard" className="leaderboard-skeleton grid grid-cols-3 items-end gap-3 rounded-3xl border border-slate-700/60 bg-slate-800/40 p-5 pt-12">
          <span className="h-44 rounded-2xl bg-slate-700/50" />
          <span className="h-56 rounded-2xl bg-slate-700/50" />
          <span className="h-40 rounded-2xl bg-slate-700/50" />
        </div>
      ) : error ? (
        <p className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">{error}</p>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/45 p-10 text-center">
          <Trophy className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-3 text-sm text-slate-400">No one is on the board yet. Watch a lecture to claim the top spot!</p>
        </div>
      ) : (
        <>
          <section aria-labelledby="podium-heading" className="leaderboard-stage mb-6 overflow-hidden rounded-3xl border border-amber-300/15 bg-slate-800/40 px-3 pb-5 pt-5 sm:px-6">
            <div className="relative flex items-center gap-2 text-amber-300">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              <h2 id="podium-heading" className="text-xs font-semibold uppercase tracking-[0.2em]">The leading three</h2>
            </div>
            <p className="relative mt-2 text-sm text-slate-400">Every lecture moves you forward.</p>
            <ol className="leaderboard-podium" aria-label="Top three learners">
              {entries.slice(0, 3).map((entry, index) => (
                <PodiumPlace key={entry.uid} entry={entry} rank={index + 1} isViewer={entry.uid === user?.uid} />
              ))}
            </ol>
          </section>
          {entries.length > 3 && (
            <h2 className="mb-3 text-sm font-semibold text-slate-300">More learners</h2>
          )}
        <ol start={4} className="space-y-2">
          {entries.slice(3).map((entry, index) => (
            <li
              key={entry.uid}
              className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${
                entry.uid === user?.uid ? 'border-sky-400/40 bg-sky-400/5' : 'border-slate-700/60 bg-slate-800/40'
              }`}
            >
              <span className="w-6 shrink-0 text-center text-sm font-semibold text-slate-400">{index + 4}</span>
              {entry.photoURL ? (
                <img src={entry.photoURL} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-slate-300">
                  <UserRound className="h-4 w-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {entry.displayName}
                  {entry.uid === user?.uid && <span className="ml-2 text-xs font-normal text-sky-300">(you)</span>}
                </p>
                <p className="text-xs text-slate-500">{entry.lecturesWatched} lectures · {entry.enrolledCount} batches</p>
              </div>
              <span className="text-sm font-bold text-amber-300">{entry.points.toLocaleString()} pts</span>
            </li>
          ))}
        </ol>
        </>
      )}
    </div>
  );
}

function PodiumPlace({ entry, rank, isViewer }: { entry: LeaderboardEntry; rank: number; isViewer: boolean }) {
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    setPhotoFailed(false);
  }, [entry.photoURL]);

  return (
    <li className={`podium-place podium-place--${rank}`}>
      <div className="podium-person">
        {rank === 1 && <Crown aria-hidden="true" className="podium-crown h-7 w-7 sm:h-9 sm:w-9" />}
        <div className="podium-avatar">
          {entry.photoURL && !photoFailed ? (
            <img src={entry.photoURL} onError={() => setPhotoFailed(true)} alt="" referrerPolicy="no-referrer" className="h-full w-full rounded-full object-cover" />
          ) : (
            <UserRound aria-hidden="true" className="h-6 w-6 sm:h-8 sm:w-8" />
          )}
          <span className="podium-medal" aria-hidden="true">{rank}</span>
        </div>
        <p className="mt-4 break-words text-xs font-semibold leading-snug text-white sm:text-sm">
          {entry.displayName}
          {isViewer && <span className="mt-1 block text-xs font-normal text-sky-300">You</span>}
        </p>
      </div>
      <div className="podium-step">
        <span className="sr-only">Rank {rank}, </span>
        <span className="podium-points text-lg font-bold tabular-nums sm:text-2xl">{entry.points.toLocaleString()}</span>
        <span className="mt-0.5 block text-[10px] uppercase tracking-widest text-slate-400">Points</span>
        <Medal aria-hidden="true" className="mx-auto my-3 h-5 w-5 opacity-70" />
        <p className="text-[10px] text-slate-400 sm:text-xs">{entry.lecturesWatched} lectures</p>
        <p className="mt-1 hidden text-xs text-slate-500 sm:block">{entry.enrolledCount} batches</p>
      </div>
    </li>
  );
}
