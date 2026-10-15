import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import type { Batch } from '@/types';

export interface EnrollmentRow {
  batchId: string;
  batchName: string;
  byName: string;
  language: string;
  previewImage: string;
  type: string;
  startDate: string;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL: string;
  points: number;
  lecturesWatched: number;
  enrolledCount: number;
}

export const POINTS = { lecture: 10, enroll: 5 } as const;

const enrollmentsCol = (uid: string) => collection(db, 'users', uid, 'enrollments');
const leaderboardDoc = (uid: string) => doc(db, 'leaderboard', uid);

// Keeps the public leaderboard entry in sync with the signed-in user.
async function bumpLeaderboard(user: User, changes: Record<string, unknown>) {
  await setDoc(
    leaderboardDoc(user.uid),
    {
      uid: user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || 'Student',
      photoURL: user.photoURL ?? '',
      updatedAt: serverTimestamp(),
      ...changes,
    },
    { merge: true }
  );
}

export async function listEnrollments(uid: string): Promise<EnrollmentRow[]> {
  const snap = await getDocs(query(enrollmentsCol(uid), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => d.data() as EnrollmentRow);
}

export async function createEnrollment(user: User, batch: Batch) {
  const ref = doc(enrollmentsCol(user.uid), batch._id);
  if ((await getDoc(ref)).exists()) return;
  await setDoc(ref, {
    batchId: batch._id,
    batchName: batch.name,
    byName: batch.byName ?? '',
    language: batch.language ?? '',
    previewImage: batch.previewImage ?? '',
    type: batch.type ?? '',
    startDate: batch.startDate ?? '',
    createdAt: serverTimestamp(),
  });
  await bumpLeaderboard(user, { points: increment(POINTS.enroll), enrolledCount: increment(1) });
}

export async function deleteEnrollment(user: User, batchId: string) {
  const ref = doc(enrollmentsCol(user.uid), batchId);
  if (!(await getDoc(ref)).exists()) return;
  await deleteDoc(ref);
  await bumpLeaderboard(user, { points: increment(-POINTS.enroll), enrolledCount: increment(-1) });
}

export async function recordLectureWatched(user: User, lectureId: string) {
  const ref = doc(db, 'users', user.uid, 'watched', lectureId);
  if ((await getDoc(ref)).exists()) return;
  await setDoc(ref, { watchedAt: serverTimestamp() });
  await bumpLeaderboard(user, { points: increment(POINTS.lecture), lecturesWatched: increment(1) });
}

// Creates the user's leaderboard entry on first sign-in and refreshes their name/photo afterwards.
export async function ensureLeaderboardEntry(user: User) {
  const snap = await getDoc(leaderboardDoc(user.uid));
  await bumpLeaderboard(user, snap.exists() ? {} : { points: 0, lecturesWatched: 0, enrolledCount: 0 });
}

function toEntry(id: string, data: Record<string, unknown>): LeaderboardEntry {
  return {
    uid: id,
    displayName: String(data.displayName || 'Student'),
    photoURL: String(data.photoURL ?? ''),
    points: Number(data.points ?? 0),
    lecturesWatched: Number(data.lecturesWatched ?? 0),
    enrolledCount: Number(data.enrolledCount ?? 0),
  };
}

export async function listLeaderboard(max = 50): Promise<LeaderboardEntry[]> {
  const col = collection(db, 'leaderboard');
  try {
    const snap = await getDocs(query(col, orderBy('points', 'desc'), limit(max)));
    return snap.docs.map((d) => toEntry(d.id, d.data()));
  } catch (err) {
    // An ordered query can fail if an entry is missing `points`; fall back to sorting locally.
    if ((err as { code?: string }).code === 'permission-denied') throw err;
    const snap = await getDocs(col);
    return snap.docs
      .map((d) => toEntry(d.id, d.data()))
      .sort((a, b) => b.points - a.points)
      .slice(0, max);
  }
}

export async function saveFeedback(feedback: {
  name: string;
  feedback: string;
  telegram_joined: boolean;
  whatsapp_joined: boolean;
}) {
  await addDoc(collection(db, 'feedback'), { ...feedback, submittedAt: serverTimestamp() });
}
