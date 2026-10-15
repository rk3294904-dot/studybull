export interface Batch {
  _id: string;
  name: string;
  byName: string;
  startDate: string;
  endDate: string;
  language: string;
  previewImage: string;
  feeTotal: number;
  type: string;
  slug: string;
  subBatches: unknown[];
}

export interface BatchesResponse {
  success: boolean;
  batches: Batch[];
}

export interface Teacher {
  _id: string;
  firstName: string;
  lastName: string;
  experience?: string;
  qualification?: string;
  featuredLine?: string;
  subject?: string;
  imageId?: ImageRef;
}

export interface ImageRef {
  _id: string;
  baseUrl: string;
  key: string;
  name: string;
}

export interface Subject {
  _id: string;
  subject: string;
  subjectId: string;
  description: string;
  slug: string;
  tagCount: number;
  lectureCount: number;
  displayOrder: number;
  teacherIds: Teacher[];
  imageId?: ImageRef;
}

export interface BatchDetails {
  _id: string;
  name: string;
  batchName: string;
  byName: string;
  language: string;
  startDate: string;
  endDate: string;
  previewImage: ImageRef;
  exam: string[];
  subjects: Subject[];
}

export interface BatchDetailsResponse {
  success: boolean;
  data: BatchDetails;
}

export interface AnnouncementAttachment {
  _id?: string;
  name?: string;
  baseUrl?: string;
  key?: string;
  url?: string;
  imageUrl?: string;
}

export interface Announcement {
  _id: string;
  batchId: string;
  type: string;
  announcement: string;
  heading?: string;
  createdAt?: string;
  attachment?: AnnouncementAttachment | AnnouncementAttachment[];
  attachments?: AnnouncementAttachment[];
  createdBy?: {
    firstName?: string;
    lastName?: string;
  };
}

export interface AnnouncementsResponse {
  success: boolean;
  data: Announcement[];
}

export interface ScheduleItem {
  _id: string;
  topic: string;
  batchId: string;
  batchSubjectId: string;
  subjectId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  day?: string;
  lectureType?: string;
  isVideoLecture?: boolean;
  videoDetails?: VideoDetails;
}

export interface ScheduleResponse {
  success: boolean;
  data: ScheduleItem[];
}

export interface Slide {
  _id: string;
  name: string;
  serialNumber: number;
  timeStamp?: string;
  img?: ImageRef;
  imageUrl?: string;
}

export interface SlidesResponse {
  success: boolean;
  data: {
    _id: string;
    topic?: string;
    slides?: Slide[];
  };
}

export interface Chapter {
  _id: string;
  name: string;
  type: string;
  typeId: string;
  displayOrder: number;
  notes: number;
  exercises: number;
  videos: number;
  lectureVideos: number;
  slug: string;
}

export interface ChaptersResponse {
  success: boolean;
  data: Chapter[];
}

export interface Attachment {
  _id: string;
  baseUrl: string;
  key: string;
  name: string;
  url?: string;
  imageUrl?: string;
}

export interface Homework {
  _id: string;
  topic: string;
  note: string;
  attachmentIds: Attachment[];
  slug: string;
  status: string;
  actions: string[];
}

export interface Exercise {
  _id: string;
  title: string;
  slug: string;
  dppId: string;
  isSubjective: boolean;
  totalMarks: number;
  totalQuestions: number;
}

export interface VideoDetails {
  _id: string;
  name: string;
  image: string;
  duration: string;
  status: string;
  videoUrl?: string;
  drmProtected?: boolean;
}

export interface VideoItem {
  _id: string;
  topic: string;
  date: string;
  startTime: string;
  status: string;
  lectureType: string;
  isDPPNotes: boolean;
  isDPPVideos: boolean;
  isVideoLecture: boolean;
  hasAttachment: boolean;
  dppCount: number;
  slug: string;
  batchId: string;
  tags?: { _id: string; name: string }[];
  videoDetails?: VideoDetails;
  homeworkIds: Homework[];
  exerciseIds: Exercise[];
}

export type NotesItem = VideoItem;

export interface VideosResponse {
  success: boolean;
  data: VideoItem[];
}

export interface NotesResponse {
  success: boolean;
  data: NotesItem[];
}

export interface VideoApiResponse {
  success: boolean;
  dashurl: string;
  url: string;
  keys: Record<string, string>;
}

// Legacy Lecture type kept for VideoPlayer compatibility
export interface Lecture {
  _id: string;
  data: VideoItem;
}
