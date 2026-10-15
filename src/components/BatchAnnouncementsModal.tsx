import { useEffect, useState } from 'react';
import { AlertCircle, Bell, CalendarDays, ExternalLink, Loader2, X } from 'lucide-react';
import type { Announcement, AnnouncementAttachment } from '@/types';
import { fetchAnnouncements } from '@/services/api';

interface Props {
  batchId: string;
  batchName: string;
  onClose: () => void;
}

function formatDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function BatchAnnouncementsModal({ batchId, batchName, onClose }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAnnouncements(batchId)
      .then((response) => {
        if (!cancelled) setAnnouncements(response.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load announcements');
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
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcements-title"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-slate-700/70 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Announcements</p>
              <h2 id="announcements-title" className="mt-1 text-lg font-semibold text-white">{batchName}</h2>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close announcements" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto p-5 sm:p-6">
          {loading && <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>}
          {error && (
            <div className="flex flex-col items-center py-12 text-center">
              <AlertCircle className="h-9 w-9 text-red-400" />
              <p className="mt-3 text-sm text-slate-300">{error}</p>
            </div>
          )}
          {!loading && !error && announcements.length === 0 && (
            <div className="py-12 text-center">
              <Bell className="mx-auto h-10 w-10 text-slate-600" />
              <p className="mt-3 text-sm text-slate-400">No announcements for this batch yet.</p>
            </div>
          )}
          {!loading && !error && announcements.length > 0 && (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <article key={announcement._id} className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-400">{announcement.type || 'Update'}</span>
                    {announcement.createdAt && (
                      <span className="flex items-center gap-1 text-xs text-slate-500"><CalendarDays className="h-3.5 w-3.5" />{formatDate(announcement.createdAt)}</span>
                    )}
                  </div>
                  {announcement.heading && (
                    <h3 className="mt-3 text-base font-semibold text-white">{announcement.heading}</h3>
                  )}
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-200">{announcement.announcement}</p>
                  <AnnouncementAttachments announcement={announcement} />
                  {announcement.createdBy?.firstName && (
                    <p className="mt-3 text-xs text-slate-500">Posted by {announcement.createdBy.firstName} {announcement.createdBy.lastName ?? ''}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function AnnouncementAttachments({ announcement }: { announcement: Announcement }) {
  const attachments = [
    ...(Array.isArray(announcement.attachment) ? announcement.attachment : announcement.attachment ? [announcement.attachment] : []),
    ...(announcement.attachments ?? []),
  ];

  if (attachments.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {attachments.map((attachment, index) => {
        const url = getAttachmentUrl(attachment);
        if (!url) return null;
        const name = attachment.name || 'Open attachment';
        const isImage = /\.(png|jpe?g|gif|webp|svg)(?:$|[?#])/i.test(url) || /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
        return (
          <a
            key={attachment._id ?? `${url}-${index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border border-slate-700/70 bg-slate-900/50 p-2 transition hover:border-blue-500/50"
          >
            {isImage && <img src={url} alt={name} loading="lazy" className="max-h-72 w-full rounded-lg object-contain" />}
            <span className="mt-2 flex items-center gap-2 px-1 text-xs font-medium text-blue-400">
              <ExternalLink className="h-3.5 w-3.5" />
              {name}
            </span>
          </a>
        );
      })}
    </div>
  );
}

function getAttachmentUrl(attachment: AnnouncementAttachment): string | null {
  if (attachment.url || attachment.imageUrl) return attachment.url ?? attachment.imageUrl ?? null;
  if (attachment.baseUrl && attachment.key) return `${attachment.baseUrl}${attachment.key}`;
  if (attachment.baseUrl && /\.(png|jpe?g|gif|webp|svg)(?:$|[?#])/i.test(attachment.baseUrl)) return attachment.baseUrl;
  return null;
}
