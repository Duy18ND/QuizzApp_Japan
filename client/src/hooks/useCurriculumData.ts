import { useEffect, useSyncExternalStore } from 'react';
import type { CmsSnapshot } from '../services/adminCmsService';
import {
  ensureCurriculumHydrated,
  getCurriculumSnapshotSync,
  subscribeCurriculum,
} from '../services/curriculumStore';

export function useCurriculumSnapshot(): CmsSnapshot {
  const snapshot = useSyncExternalStore(
    subscribeCurriculum,
    getCurriculumSnapshotSync,
    getCurriculumSnapshotSync,
  );

  useEffect(() => {
    ensureCurriculumHydrated();
  }, []);

  return snapshot;
}
