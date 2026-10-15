import { lazy, Suspense, useCallback, useState } from 'react';
import { Send } from 'lucide-react';
import { Header } from '@/components/Header';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BatchesView } from '@/components/BatchesView';
import { SubjectsView } from '@/components/SubjectsView';
import { ChaptersView } from '@/components/ChaptersView';
import { ContentView } from '@/components/ContentView';
import { LeaderboardView } from '@/components/LeaderboardView';
import { LoginModal } from '@/components/LoginModal';
import { useAuth } from '@/context/AuthContext';
import { recordLectureWatched } from '@/lib/db';
import type { Batch, VideoItem } from '@/types';
import { useNavigation, useAsync } from '@/hooks/useNavigation';
import { useEnrollments } from '@/hooks/useEnrollments';
import {
  fetchBatches,
  fetchBatchDetails,
  fetchChapters,
} from '@/services/api';

const VideoPlayer = lazy(() =>
  import('@/components/VideoPlayer').then(({ VideoPlayer: Player }) => ({
    default: Player,
  }))
);

function App() {
  const { user, loading: authLoading } = useAuth();
  const [panel, setPanel] = useState<'leaderboard' | null>(null);
  const [login, setLogin] = useState<{ message: string; then?: () => void } | null>(null);
  const showProfile = panel !== null;
  const {
    state,
    selectBatch,
    selectSubject,
    selectChapter,
    playLecture: navigateToLecture,
    closeVideo,
    goBack,
    goHome,
  } = useNavigation();

  const {
    enrolledIds,
    enrolledBatches,
    loading: enrollmentsLoading,
    enroll,
    unenroll,
  } = useEnrollments();

  const isVideoPage = state.view === 'video';

  const handleHome = useCallback(() => {
    setPanel(null);
    goHome();
  }, [goHome]);

  const handleSelectBatch = useCallback((id: string, name: string) => {
    setPanel(null);
    selectBatch(id, name);
  }, [selectBatch]);

  // Opens a panel, asking the visitor to sign in first if needed.
  const openPanel = useCallback(
    (next: 'leaderboard') => {
      if (user) {
        setPanel(next);
        return;
      }
      setLogin({
        message: 'Sign in to see the leaderboard.',
        then: () => setPanel(next),
      });
    },
    [user]
  );

  const handleEnroll = useCallback(
    async (batch: Batch) => {
      if (!user) {
        setLogin({ message: 'Sign in to enroll in batches.' });
        return;
      }
      await enroll(batch);
    },
    [user, enroll]
  );

  const playLecture = useCallback(
    (lecture: VideoItem) => {
      if (user) {
        recordLectureWatched(user, lecture._id).catch((e) => console.error('Failed to record progress:', e));
      }
      navigateToLecture(lecture);
    },
    [user, navigateToLecture]
  );

  const batchesQuery = useAsync(
    (signal?: AbortSignal) => fetchBatches(signal),
    [],
    state.view !== 'batches'
  );

  const batchDetailsQuery = useAsync(
    (signal?: AbortSignal) => fetchBatchDetails(state.batchId!, signal),
    [state.batchId, state.view],
    state.view !== 'subjects' && state.view !== 'chapters' && state.view !== 'content'
  );

  const chaptersQuery = useAsync(
    (signal?: AbortSignal) => fetchChapters(state.batchId!, state.subjectId!, signal),
    [state.subjectId, state.view],
    state.view !== 'chapters' && state.view !== 'content'
  );

  const retryBatches = useCallback(() => {
    window.location.reload();
  }, []);

  const goToBatch = useCallback(() => {
    if (state.view === 'subjects') {
      goBack();
    } else {
      goHome();
      if (state.batchId && state.batchName) {
        selectBatch(state.batchId, state.batchName);
      }
    }
  }, [state.view, state.batchId, state.batchName, goBack, goHome, selectBatch]);

  const goToSubject = useCallback(() => {
    if (state.view === 'content' && state.subjectId && state.subjectName) {
      selectSubject(state.subjectId, state.subjectName);
    }
  }, [state.view, state.subjectId, state.subjectName, selectSubject]);

  const breadcrumbItems = [
    { label: 'Home', onClick: goHome },
    ...(state.batchName
      ? [{ label: state.batchName, onClick: state.view !== 'subjects' && !isVideoPage ? goToBatch : undefined }]
      : []),
    ...(state.subjectName
      ? [{ label: state.subjectName, onClick: (state.view === 'content' || isVideoPage) ? goToSubject : undefined }]
      : []),
    ...(state.chapterName ? [{ label: state.chapterName, onClick: undefined as (() => void) | undefined }] : []),
  ];

  // Video page is fullscreen — render outside the main layout
  if (isVideoPage && state.playingLecture && state.batchId && state.subjectId) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-slate-900">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
              <p className="mt-4 text-sm text-slate-400">Loading video player...</p>
            </div>
          </div>
        }
      >
        <VideoPlayer
          batchId={state.batchId}
          lectureId={state.playingLecture._id}
          subjectId={state.subjectId}
          title={state.playingLecture.topic}
          onBack={closeVideo}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Header
        onHome={handleHome}
        onLeaderboard={() => openPanel('leaderboard')}
        onLogin={() => setLogin({ message: 'Sign in to track progress and join the leaderboard.' })}
      />

      {login && (
        <LoginModal
          message={login.message}
          onClose={() => setLogin(null)}
          onSuccess={() => {
            login.then?.();
            setLogin(null);
          }}
        />
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {!showProfile && state.view !== 'batches' && <Breadcrumbs items={breadcrumbItems} />}

        {panel && !authLoading && !user && (
          <div className="py-20 text-center">
            <p className="text-sm text-slate-400">Please sign in to continue.</p>
            <button
              onClick={() => openPanel(panel)}
              className="mt-4 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
            >
              Sign in
            </button>
          </div>
        )}

        {panel === 'leaderboard' && user && <LeaderboardView />}

        {!showProfile && state.view === 'batches' && (
          <BatchesView
            batches={batchesQuery.data?.batches ?? []}
            loading={batchesQuery.loading}
            error={batchesQuery.error}
            onSelect={handleSelectBatch}
            onRetry={retryBatches}
            enrolledIds={enrolledIds}
            enrolledBatches={enrolledBatches}
            enrollmentsLoading={enrollmentsLoading}
            onEnroll={handleEnroll}
            onUnenroll={unenroll}
          />
        )}

        {!showProfile && state.view === 'subjects' && (
          <SubjectsView
            details={batchDetailsQuery.data?.data ?? null}
            loading={batchDetailsQuery.loading}
            error={batchDetailsQuery.error}
            onSelect={selectSubject}
            onRetry={goBack}
          />
        )}

        {!showProfile && state.view === 'chapters' && (
          <ChaptersView
            chapters={chaptersQuery.data?.data ?? []}
            loading={chaptersQuery.loading}
            error={chaptersQuery.error}
            subjectName={state.subjectName ?? ''}
            onSelect={selectChapter}
            onRetry={goBack}
          />
        )}

        {!showProfile && state.view === 'content' && state.batchId && state.subjectId && state.chapterId && (
          <ContentView
            batchId={state.batchId}
            subjectId={state.subjectId}
            chapterId={state.chapterId}
            chapterName={state.chapterName ?? ''}
            onPlay={playLecture}
          />
        )}
      </main>

      <footer className="border-t border-slate-700/50 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <img
                src="/quantica-logo.svg"
                alt="Quantica Digital logo"
                className="h-8 w-8 rounded-lg"
              />
              <div>
                <p className="text-sm font-semibold text-white">Study Bull</p>
                <p className="text-[10px] text-slate-500">Learning Platform</p>
              </div>
            </div>

            <a
              href="https://t.me/Contactusquantabot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-sky-400 hover:to-blue-400 active:scale-95"
            >
              <Send className="h-4 w-4" />
Contact Developer            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
