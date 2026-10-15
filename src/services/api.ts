import type {
  BatchesResponse,
  BatchDetailsResponse,
  ChaptersResponse,
  AnnouncementsResponse,
  ScheduleItem,
  ScheduleResponse,
  SlidesResponse,
  VideosResponse,
  NotesResponse,
  NotesItem,
  VideoApiResponse,
  VideoItem,
} from '@/types';

const BATCHES_API_URL = 'https://edu.coreapi.cc.cd/api';
const VIDEO_API_URL = 'https://player.examcrushers.in/api/videox';

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const timeoutCtrl = new AbortController();
  const timeoutId = setTimeout(() => timeoutCtrl.abort(), 30000);

  if (signal) {
    signal.addEventListener('abort', () => timeoutCtrl.abort());
  }

  try {
    const res = await fetch(url, { signal: timeoutCtrl.signal });
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }
    const data = await res.json();
    return data as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

interface RawBatch {
  _id?: string;
  batch_id?: string;
  batchId?: string;
  name: string;
  byName?: string;
  language?: string;
  photo?: string;
  previewImage?: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  amount?: number;
  feeTotal?: number;
  type?: string;
  class?: string;
  exam?: string;
  slug?: string;
  subBatches?: unknown[];
}

export async function fetchBatches(signal?: AbortSignal): Promise<BatchesResponse> {
  const response = await fetchJson<{ success: boolean; batches: RawBatch[] }>(
    `${BATCHES_API_URL}/batches`,
    signal
  );

  return {
    success: response.success,
    batches: response.batches.map((batch) => ({
      _id: batch._id ?? batch.batch_id ?? batch.batchId ?? batch.slug ?? batch.name,
      name: batch.name,
      byName: batch.byName ?? '',
      startDate: batch.startDate ?? batch.start_date ?? '',
      endDate: batch.endDate ?? batch.end_date ?? '',
      language: batch.language ?? '',
      previewImage: batch.previewImage ?? batch.photo ?? '',
      feeTotal: batch.feeTotal ?? batch.amount ?? 0,
      type: batch.type ?? batch.class ?? batch.exam ?? '',
      slug: batch.slug ?? batch.batch_id ?? batch.batchId ?? '',
      subBatches: batch.subBatches ?? [],
    })),
  };
}

export function fetchBatchDetails(
  batchId: string,
  signal?: AbortSignal
): Promise<BatchDetailsResponse> {
  return fetchJson<BatchDetailsResponse>(
    `${BATCHES_API_URL}/batch/${batchId}/details`,
    signal
  );
}

export function fetchAnnouncements(
  batchId: string,
  page = 1,
  signal?: AbortSignal
): Promise<AnnouncementsResponse> {
  return fetchJson<AnnouncementsResponse>(
    `${BATCHES_API_URL}/batch/${batchId}/announcement?page=${page}`,
    signal
  );
}

function normalizeScheduleItem(item: Record<string, unknown>): ScheduleItem {
  const videoDetails = item.videoDetails as Record<string, unknown> | undefined;
  return {
    _id: String(item._id ?? item.id ?? ''),
    topic: String(item.topic ?? item.title ?? 'Untitled class'),
    batchId: String(item.batchId ?? ''),
    batchSubjectId: String(item.batchSubjectId ?? item.subjectId ?? ''),
    subjectId: item.subjectId ? String(item.subjectId) : undefined,
    date: item.date ? String(item.date) : undefined,
    startTime: item.startTime ? String(item.startTime) : undefined,
    endTime: item.endTime ? String(item.endTime) : undefined,
    status: item.status ? String(item.status) : undefined,
    day: item.day ? String(item.day) : undefined,
    lectureType: item.lectureType ? String(item.lectureType) : undefined,
    isVideoLecture: Boolean(item.isVideoLecture),
    videoDetails: videoDetails
      ? {
          _id: String(videoDetails._id ?? ''),
          name: String(videoDetails.name ?? item.topic ?? ''),
          image: String(videoDetails.image ?? ''),
          duration: String(videoDetails.duration ?? ''),
          status: String(videoDetails.status ?? ''),
          videoUrl: videoDetails.videoUrl ? String(videoDetails.videoUrl) : undefined,
          drmProtected: Boolean(videoDetails.drmProtected),
        }
      : undefined,
  };
}

function normalizeScheduleResponse(response: unknown): ScheduleResponse {
  const body = response as { success?: boolean; data?: unknown };
  const rawData = Array.isArray(body.data) ? body.data : body.data ? [body.data] : [];
  return {
    success: body.success ?? true,
    data: rawData.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')).map(normalizeScheduleItem),
  };
}

export function fetchTodaySchedule(
  batchId: string,
  signal?: AbortSignal
): Promise<ScheduleResponse> {
  return fetchJson<unknown>(
    `${BATCHES_API_URL}/todays-schedule/v2?batchId=${encodeURIComponent(batchId)}`,
    signal
  ).then(normalizeScheduleResponse);
}

export function fetchSchedule(
  batchId: string,
  subjectId: string,
  contentId: string,
  signal?: AbortSignal
): Promise<ScheduleResponse> {
  return fetchJson<unknown>(
    `${BATCHES_API_URL}/Schedule?BatchId=${encodeURIComponent(batchId)}&SubjectId=${encodeURIComponent(subjectId)}&ContentId=${encodeURIComponent(contentId)}`,
    signal
  ).then(normalizeScheduleResponse);
}

export function fetchSlides(
  batchId: string,
  subjectId: string,
  scheduleId: string,
  signal?: AbortSignal
): Promise<SlidesResponse> {
  return fetchJson<SlidesResponse>(
    `${BATCHES_API_URL}/slides/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subjectId)}/schedule/${encodeURIComponent(scheduleId)}`,
    signal
  );
}

export function fetchChapters(
  batchId: string,
  subjectId: string,
  signal?: AbortSignal
): Promise<ChaptersResponse> {
  return fetchJson<{ data: ChaptersResponse['data'] } & { success?: boolean }>(
    `${BATCHES_API_URL}/batch/${batchId}/subject/${subjectId}/topics?page=1`,
    signal
  ).then((res) => ({
    success: res.success ?? true,
    data: res.data,
  }));
}

export function fetchVideos(
  batchId: string,
  subjectId: string,
  topicId: string,
  page = 1,
  signal?: AbortSignal
): Promise<VideosResponse> {
  return fetchJson<{ data: VideoItem[] } & { success?: boolean }>(
    `${BATCHES_API_URL}/batch/${batchId}/subject/${subjectId}/topic/${topicId}/videos?page=${page}`,
    signal
  ).then((res) => ({
    success: res.success ?? true,
    data: res.data,
  }));
}

export function fetchDppVideos(
  batchId: string,
  subjectId: string,
  topicId: string,
  page = 1,
  signal?: AbortSignal
): Promise<VideosResponse> {
  return fetchJson<{ data: VideoItem[] } & { success?: boolean }>(
    `${BATCHES_API_URL}/batch/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subjectId)}/topic/${encodeURIComponent(topicId)}/dpp-videos?page=${page}`,
    signal
  ).then((res) => ({
    success: res.success ?? true,
    data: res.data,
  }));
}

interface RawDppNote {
  data: NotesItem;
}

export function fetchDppNotes(
  batchId: string,
  subjectId: string,
  topicId: string,
  page = 1,
  signal?: AbortSignal
): Promise<NotesResponse> {
  const skip = (page - 1) * 20;
  return fetchJson<{ data: Array<NotesItem | RawDppNote> } & { success?: boolean }>(
    `${BATCHES_API_URL}/batch/${encodeURIComponent(batchId)}/subject/${encodeURIComponent(subjectId)}/topic/${encodeURIComponent(topicId)}/dpp-notes/v2?skip=${skip}&limit=20`,
    signal
  ).then((res) => ({
    success: res.success ?? true,
    data: res.data.map((item) => {
      const note = 'data' in item ? item.data : item;
      return {
        ...note,
        topic: note.topic || note.homeworkIds?.[0]?.topic || 'DPP Notes',
      };
    }),
  }));
}

export function fetchNotes(
  batchId: string,
  subjectId: string,
  topicId: string,
  page = 1,
  signal?: AbortSignal
): Promise<NotesResponse> {
  return fetchJson<{ data: NotesResponse['data'] } & { success?: boolean }>(
    `${BATCHES_API_URL}/batch/${batchId}/subject/${subjectId}/topic/${topicId}/notes?page=${page}`,
    signal
  ).then((res) => ({
    success: res.success ?? true,
    data: res.data,
  }));
}

export function fetchVideo(
  batchId: string,
  lectureId: string,
  subjectId: string,
  signal?: AbortSignal
): Promise<VideoApiResponse> {
  return fetchJson<VideoApiResponse>(
    `${VIDEO_API_URL}?batchId=${batchId}&lectureId=${lectureId}&subjectId=${subjectId}&key=Vinyl`,
    signal
  );
}
