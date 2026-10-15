import { useMemo, useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  X,
  ChevronDown,
  Check,
  Plus,
  GraduationCap,
  Loader2,
  Bell,
  CalendarClock,
} from 'lucide-react';
import type { Batch } from '@/types';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/States';
import { BatchAnnouncementsModal } from '@/components/BatchAnnouncementsModal';
import { BatchScheduleModal } from '@/components/BatchScheduleModal';

interface Props {
  batches: Batch[];
  loading: boolean;
  error: string | null;
  onSelect: (id: string, name: string) => void;
  onRetry: () => void;
  enrolledIds: Set<string>;
  enrolledBatches: Batch[];
  enrollmentsLoading: boolean;
  onEnroll: (batch: Batch) => Promise<void>;
  onUnenroll: (batchId: string) => Promise<void>;
}

type Tab = 'all' | 'enrolled';
type BatchModal = { type: 'announcements' | 'schedule'; batch: Batch } | null;

const PAGE_SIZE = 24;

export function BatchesView({
  batches,
  loading,
  error,
  onSelect,
  onRetry,
  enrolledIds,
  enrolledBatches,
  enrollmentsLoading,
  onEnroll,
  onUnenroll,
}: Props) {
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [activeModal, setActiveModal] = useState<BatchModal>(null);

  const sourceBatches = activeTab === 'enrolled' ? enrolledBatches : batches;

  const filtered = useMemo(() => {
    if (!query.trim()) return sourceBatches;
    const q = query.toLowerCase();
    return sourceBatches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.byName || '').toLowerCase().includes(q)
    );
  }, [sourceBatches, query]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, activeTab]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const isLoading = loading || (activeTab === 'enrolled' && enrollmentsLoading);

  if (isLoading) return <LoadingSpinner message="Loading study batches..." />;
  if (error && activeTab === 'all')
    return (
      <ErrorState message={`Failed to load batches: ${error}`} onRetry={onRetry} />
    );

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Study Batches
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          {activeTab === 'enrolled'
            ? `${enrolledBatches.length} enrolled ${enrolledBatches.length === 1 ? 'batch' : 'batches'} — continue where you left off`
            : `${batches.length} batches available — find your course and start learning`}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-slate-700/50 bg-slate-800/30 p-1">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition-all ${
            activeTab === 'all'
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
              : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          All Batches
        </button>
        <button
          onClick={() => setActiveTab('enrolled')}
          className={`flex min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition-all ${
            activeTab === 'enrolled'
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
              : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          Enrolled
          {enrolledBatches.length > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                activeTab === 'enrolled'
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-500/20 text-blue-400'
              }`}
            >
              {enrolledBatches.length}
            </span>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            activeTab === 'enrolled'
              ? 'Search enrolled batches...'
              : 'Search batches by name or category...'
          }
          className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-3 pl-11 pr-11 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        activeTab === 'enrolled' ? (
          <EmptyState
            icon={<GraduationCap className="h-12 w-12" />}
            title="No enrolled batches yet"
            message={
              query
                ? `No enrolled batches match "${query}". Try a different search.`
                : 'Browse the All Batches tab and enroll in a batch to get started.'
            }
          />
        ) : (
          <EmptyState
            icon={<Search className="h-12 w-12" />}
            title="No batches found"
            message={`No batches match "${query}". Try a different search term.`}
          />
        )
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((batch) => (
              <BatchCard
                key={batch._id}
                batch={batch}
                onSelect={onSelect}
                isEnrolled={enrolledIds.has(batch._id)}
                onEnroll={onEnroll}
                onUnenroll={onUnenroll}
                onShowAnnouncements={() => setActiveModal({ type: 'announcements', batch })}
                onShowSchedule={() => setActiveModal({ type: 'schedule', batch })}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/40 px-6 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800/70 hover:text-white"
              >
                Load More
                <ChevronDown className="h-4 w-4" />
              </button>
              <p className="text-xs text-slate-600">
                Showing {visible.length} of {filtered.length}
              </p>
            </div>
          )}
        </>
      )}

      {activeModal?.type === 'announcements' && (
        <BatchAnnouncementsModal
          batchId={activeModal.batch._id}
          batchName={activeModal.batch.name}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal?.type === 'schedule' && (
        <BatchScheduleModal
          batchId={activeModal.batch._id}
          batchName={activeModal.batch.name}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}

function BatchCard({
  batch,
  onSelect,
  isEnrolled,
  onEnroll,
  onUnenroll,
  onShowAnnouncements,
  onShowSchedule,
}: {
  batch: Batch;
  onSelect: (id: string, name: string) => void;
  isEnrolled: boolean;
  onEnroll: (batch: Batch) => Promise<void>;
  onUnenroll: (batchId: string) => Promise<void>;
  onShowAnnouncements: () => void;
  onShowSchedule: () => void;
}) {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(false);

  const handleEnrollClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(true);
    setActionError(false);
    try {
      if (isEnrolled) {
        await onUnenroll(batch._id);
      } else {
        await onEnroll(batch);
      }
    } catch {
      setActionError(true);
      setTimeout(() => setActionError(false), 2500);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      onClick={() => onSelect(batch._id, batch.name)}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/30 text-left transition-all duration-300 hover:border-blue-500/50 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-blue-500/10 active:scale-[0.98]"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-800">
        {batch.previewImage ? (
          <img
            src={batch.previewImage}
            alt={batch.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
            <BookOpen className="h-10 w-10 text-slate-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
        <span className="absolute top-3 left-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-slate-200 backdrop-blur-sm">
          {batch.language}
        </span>
        {isEnrolled && (
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-green-500/90 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            <Check className="h-3 w-3" />
            Enrolled
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-white text-base leading-snug line-clamp-2 group-hover:text-blue-400 transition">
          {batch.name}
        </h3>
        {batch.byName && (
          <p className="mt-1 text-sm text-slate-400 line-clamp-1">{batch.byName}</p>
        )}
        <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
          <span className="rounded-md bg-slate-700/40 px-2 py-0.5">
            {batch.type}
          </span>
          <span>Starts {batch.startDate}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onShowAnnouncements();
            }}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/10 px-2 py-2 text-[11px] font-semibold text-amber-300 transition hover:bg-amber-400/20 active:scale-95"
          >
            <Bell className="h-3.5 w-3.5" />
            Announcements
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onShowSchedule();
            }}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-sky-400/20 bg-sky-400/10 px-2 py-2 text-[11px] font-semibold text-sky-300 transition hover:bg-sky-400/20 active:scale-95"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Schedule
          </button>
        </div>

        <button
          onClick={handleEnrollClick}
          disabled={actionLoading}
          className={`mt-4 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 ${
            isEnrolled
              ? 'border border-slate-600/50 bg-slate-700/40 text-slate-300 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400'
              : actionError
                ? 'border border-red-500/40 bg-red-500/10 text-red-400'
                : 'bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg shadow-blue-500/20 hover:from-sky-400 hover:to-blue-400'
          }`}
        >
          {actionLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {isEnrolled ? 'Removing...' : 'Enrolling...'}
            </>
          ) : isEnrolled ? (
            <>
              <X className="h-3.5 w-3.5" />
              Unenroll
            </>
          ) : actionError ? (
            <>
              <X className="h-3.5 w-3.5" />
              Failed — Retry
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Enroll
            </>
          )}
        </button>
      </div>
    </div>
  );
}
