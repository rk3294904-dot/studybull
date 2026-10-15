import { useState, useEffect, useCallback } from 'react';
import {
  listEnrollments,
  createEnrollment,
  deleteEnrollment,
  type EnrollmentRow,
} from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import type { Batch } from '@/types';

function enrollmentToBatch(e: EnrollmentRow): Batch {
  return {
    _id: e.batchId,
    name: e.batchName,
    byName: e.byName,
    startDate: e.startDate,
    endDate: '',
    language: e.language,
    previewImage: e.previewImage,
    feeTotal: 0,
    type: e.type,
    slug: e.batchId,
    subBatches: [],
  };
}

export function useEnrollments() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [enrolledBatches, setEnrolledBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!uid) {
      setEnrolledIds(new Set());
      setEnrolledBatches([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let rows: EnrollmentRow[];
    try {
      rows = await listEnrollments(uid);
    } catch (error) {
      console.error('Failed to load enrollments:', (error as Error).message);
      setLoading(false);
      return;
    }

    setEnrolledIds(new Set(rows.map((r) => r.batchId)));
    setEnrolledBatches(rows.map(enrollmentToBatch));
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enroll = useCallback(
    async (batch: Batch) => {
      if (!user) throw new Error('Sign in to enroll');
      await createEnrollment(user, batch);

      setEnrolledIds((prev) => new Set(prev).add(batch._id));
      setEnrolledBatches((prev) => [batch, ...prev.filter((b) => b._id !== batch._id)]);
    },
    [user]
  );

  const unenroll = useCallback(
    async (batchId: string) => {
      if (!user) throw new Error('Sign in to manage enrollments');
      await deleteEnrollment(user, batchId);

      setEnrolledIds((prev) => {
        const next = new Set(prev);
        next.delete(batchId);
        return next;
      });
      setEnrolledBatches((prev) => prev.filter((b) => b._id !== batchId));
    },
    [user]
  );

  const isEnrolled = useCallback(
    (batchId: string) => enrolledIds.has(batchId),
    [enrolledIds]
  );

  return {
    enrolledIds,
    enrolledBatches,
    loading,
    enroll,
    unenroll,
    isEnrolled,
    refresh,
  };
}
