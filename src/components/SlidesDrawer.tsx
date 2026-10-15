import { useEffect, useState } from 'react';
import { AlertCircle, BookOpen, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import type { Slide } from '@/types';
import { fetchSlides } from '@/services/api';

interface Props {
  batchId: string;
  subjectId: string;
  scheduleId: string;
  onClose: () => void;
  onJumpTo: (seconds: number) => void;
}

function getSlideUrl(slide: Slide): string {
  if (slide.img?.baseUrl && slide.img.key) return `${slide.img.baseUrl}${slide.img.key}`;
  return slide.imageUrl ?? '';
}

export function SlidesDrawer({ batchId, subjectId, scheduleId, onClose, onJumpTo }: Props) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSlides(batchId, subjectId, scheduleId)
      .then((response) => {
        if (!cancelled) setSlides((response.data?.slides ?? []).filter((slide) => Boolean(getSlideUrl(slide))));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load slides');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [batchId, subjectId, scheduleId]);

  const selectedSlide = slides[selectedIndex];
  const timestamp = selectedSlide?.timeStamp ? Number(selectedSlide.timeStamp) : NaN;

  const changeSlide = (direction: number) => {
    setSelectedIndex((current) => Math.max(0, Math.min(slides.length - 1, current + direction)));
  };

  return (
    <aside className="absolute inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-slate-700 bg-slate-900 shadow-2xl sm:w-[min(90vw,28rem)]">
      <header className="flex items-center justify-between border-b border-slate-700/70 px-4 py-3">
        <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-blue-400" /><h2 className="text-sm font-semibold text-white">Lecture slides</h2></div>
        <button onClick={onClose} aria-label="Close slides" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>}
        {error && <div className="flex flex-col items-center py-12 text-center"><AlertCircle className="h-8 w-8 text-red-400" /><p className="mt-3 text-sm text-slate-300">{error}</p></div>}
        {!loading && !error && slides.length === 0 && <div className="py-12 text-center"><BookOpen className="mx-auto h-9 w-9 text-slate-600" /><p className="mt-3 text-sm text-slate-400">No slides are available for this lecture.</p></div>}
        {!loading && !error && selectedSlide && (
          <>
            <div className="overflow-hidden rounded-xl border border-slate-700 bg-black">
              <img src={getSlideUrl(selectedSlide)} alt={selectedSlide.name} className="max-h-[55vh] w-full object-contain" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button onClick={() => changeSlide(-1)} disabled={selectedIndex === 0} className="rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:bg-slate-800 disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button>
              <button
                onClick={() => {
                  if (Number.isFinite(timestamp)) onJumpTo(timestamp);
                }}
                className="text-center text-xs text-slate-400 transition hover:text-blue-400"
              >
                <span className="block font-semibold text-slate-200">{selectedIndex + 1} of {slides.length}</span>
                {Number.isFinite(timestamp) ? 'Jump to this moment' : 'Slide'}
              </button>
              <button onClick={() => changeSlide(1)} disabled={selectedIndex === slides.length - 1} className="rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:bg-slate-800 disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {slides.map((slide, index) => (
                <button key={slide._id} onClick={() => setSelectedIndex(index)} className={`overflow-hidden rounded-lg border-2 transition ${index === selectedIndex ? 'border-blue-400' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                  <img src={getSlideUrl(slide)} alt={slide.name} className="aspect-video w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
