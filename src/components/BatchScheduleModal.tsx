import { useEffect, useState } from 'react';
import { AlertCircle, CalendarClock, Clock3, Loader2, X } from 'lucide-react';
import type { ScheduleItem } from '@/types';
import { fetchTodaySchedule } from '@/services/api';

interface Props {
  batchId: string;
  batchName: string;
  onClose: () => void;
}

function formatTime(value?: string): string {
  if (!value) return 'Time not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDate(value?: string): string {
  if (!value) return 'Today';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function BatchScheduleModal({ batchId, batchName, onClose }: Props) {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchTodaySchedule(batchId)
      .then((response) => {
        if (!cancelled) setSchedule(response.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load schedule');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [batchId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="schedule-title" className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b border-slate-700/70 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-sky-500/10 p-2.5 text-sky-400"><CalendarClock className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Today’s schedule</p>
              <h2 id="schedule-title" className="mt-1 text-lg font-semibold text-white">{batchName}</h2>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close schedule" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
        </header>

        <div className="overflow-y-auto p-5 sm:p-6">
          {loading && <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>}
          {error && <div className="flex flex-col items-center py-12 text-center"><AlertCircle className="h-9 w-9 text-red-400" /><p className="mt-3 text-sm text-slate-300">{error}</p></div>}
          {!loading && !error && schedule.length === 0 && <div className="py-12 text-center"><CalendarClock className="mx-auto h-10 w-10 text-slate-600" /><p className="mt-3 text-sm text-slate-400">No classes are scheduled for today.</p></div>}
          {!loading && !error && schedule.length > 0 && (
            <div className="space-y-3">
              {schedule.map((item) => (
                <article key={item._id} className="flex gap-4 rounded-xl border border-slate-700/60 bg-slate-800/50 p-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400"><Clock3 className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500"><span>{formatDate(item.date)}</span><span>{formatTime(item.startTime)}{item.endTime ? ` – ${formatTime(item.endTime)}` : ''}</span></div>
                    <h3 className="mt-1.5 text-sm font-semibold leading-5 text-white">{item.topic}</h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                      {item.status && <span className="rounded-full bg-slate-700/70 px-2 py-1">{item.status}</span>}
                      {item.lectureType && <span className="rounded-full bg-slate-700/70 px-2 py-1">{item.lectureType}</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
