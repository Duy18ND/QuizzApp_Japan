import { supabase } from './supabaseClient';
import type { StudyLevel } from './userLevelService';

export const REVIEW_FEATURE_TAGS = [
  'Lộ trình 5 kỹ năng',
  'Nghe hiểu tách giọng',
  'Giải thích Ngữ pháp',
  'Bộ đề thi thử',
  '6 Mini-game Dojo',
  'Xuất tài liệu PDF',
  'Tự tạo bài Studio',
] as const;

export type ReviewFeatureTag = (typeof REVIEW_FEATURE_TAGS)[number];

export interface AppReviewRecord {
  id: string;
  userId: string;
  authorName: string;
  studyLevel: string;
  rating: number;
  comment: string;
  favoriteFeatures: string[];
  verifiedAttempts: number;
  helpfulCount: number;
  isFeatured: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityStats {
  totalUsers: number;
  totalAttempts: number;
  totalReviews: number;
  avgRating: number;
}

export interface FetchReviewsResult {
  reviews: AppReviewRecord[];
  votedReviewIds: string[];
  stats: CommunityStats;
  tableNotReady: boolean;
  error?: string;
}

interface RawReviewRow {
  id: string;
  user_id: string;
  author_name: string;
  study_level: string | null;
  rating: number;
  comment: string;
  favorite_features: string[] | null;
  verified_attempts: number | null;
  helpful_count: number | null;
  is_featured: boolean | null;
  is_hidden: boolean | null;
  created_at: string;
  updated_at: string;
}

function mapReviewRow(row: RawReviewRow): AppReviewRecord {
  return {
    id: row.id,
    userId: row.user_id,
    authorName: (row.author_name || 'Học viên').trim(),
    studyLevel: (row.study_level || 'N5').trim(),
    rating: Math.min(5, Math.max(1, Number(row.rating) || 5)),
    comment: row.comment || '',
    favoriteFeatures: Array.isArray(row.favorite_features) ? row.favorite_features : [],
    verifiedAttempts: Math.max(0, Number(row.verified_attempts) || 0),
    helpfulCount: Math.max(0, Number(row.helpful_count) || 0),
    isFeatured: Boolean(row.is_featured),
    isHidden: Boolean(row.is_hidden),
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

function isMissingTableError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    msg.includes('could not find the table') ||
    msg.includes('relation "public.app_reviews" does not exist')
  );
}

export function computeReviewSummary(reviews: AppReviewRecord[]): {
  visibleCount: number;
  avgRating: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
} {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const visible = reviews.filter((r) => !r.isHidden);
  let sum = 0;
  for (const r of visible) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[star] += 1;
    sum += star;
  }
  const visibleCount = visible.length;
  const avgRating = visibleCount > 0 ? Math.round((sum / visibleCount) * 10) / 10 : 0;
  return { visibleCount, avgRating, distribution };
}

export async function fetchCommunityReviewsAndStats(
  currentUserId?: string | null,
): Promise<FetchReviewsResult> {
  const emptyStats: CommunityStats = {
    totalUsers: 0,
    totalAttempts: 0,
    totalReviews: 0,
    avgRating: 0,
  };

  if (!supabase) {
    return {
      reviews: [],
      votedReviewIds: [],
      stats: emptyStats,
      tableNotReady: false,
    };
  }

  const [reviewsRes, votesRes, statsRes] = await Promise.all([
    supabase
      .from('app_reviews')
      .select(
        'id, user_id, author_name, study_level, rating, comment, favorite_features, verified_attempts, helpful_count, is_featured, is_hidden, created_at, updated_at',
      )
      .order('is_featured', { ascending: false })
      .order('helpful_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100),
    currentUserId
      ? supabase.from('app_review_votes').select('review_id').eq('user_id', currentUserId)
      : Promise.resolve({ data: [] as Array<{ review_id: string }>, error: null }),
    supabase.rpc('get_public_community_stats'),
  ]);

  if (reviewsRes.error) {
    if (isMissingTableError(reviewsRes.error)) {
      return {
        reviews: [],
        votedReviewIds: [],
        stats: emptyStats,
        tableNotReady: true,
      };
    }
    return {
      reviews: [],
      votedReviewIds: [],
      stats: emptyStats,
      tableNotReady: false,
      error: reviewsRes.error.message,
    };
  }

  const reviews = ((reviewsRes.data ?? []) as RawReviewRow[]).map(mapReviewRow);
  const votedReviewIds = (
    (votesRes.data ?? []) as Array<{ review_id: string }>
  ).map((v) => v.review_id);

  const localSummary = computeReviewSummary(reviews);
  let stats: CommunityStats = {
    totalUsers: 0,
    totalAttempts: 0,
    totalReviews: localSummary.visibleCount,
    avgRating: localSummary.avgRating,
  };

  if (!statsRes.error && statsRes.data && typeof statsRes.data === 'object') {
    const rawStats = statsRes.data as Record<string, unknown>;
    stats = {
      totalUsers: Math.max(0, Number(rawStats.totalUsers) || 0),
      totalAttempts: Math.max(0, Number(rawStats.totalAttempts) || 0),
      totalReviews: Math.max(localSummary.visibleCount, Number(rawStats.totalReviews) || 0),
      avgRating:
        Number(rawStats.avgRating) > 0
          ? Math.round(Number(rawStats.avgRating) * 10) / 10
          : localSummary.avgRating,
    };
  }

  return {
    reviews,
    votedReviewIds,
    stats,
    tableNotReady: false,
  };
}

export async function submitOneTimeCommunityReview(params: {
  userId: string;
  authorName: string;
  studyLevel: StudyLevel | string;
  rating: number;
  comment: string;
  favoriteFeatures: string[];
}): Promise<{ ok: boolean; review?: AppReviewRecord; error?: string }> {
  if (!supabase) {
    return { ok: false, error: 'Hiện chưa gửi được đánh giá, bạn thử lại sau nhé.' };
  }

  const cleanComment = params.comment.trim().replace(/\s+/g, ' ');
  if (cleanComment.length < 1) {
    return { ok: false, error: 'Vui lòng nhập nhận xét.' };
  }
  if (cleanComment.length > 500) {
    return { ok: false, error: 'Nội dung đánh giá tối đa 500 ký tự.' };
  }

  const safeRating = Math.min(5, Math.max(1, Math.round(params.rating)));
  const cleanName = params.authorName.trim().slice(0, 60) || 'Học viên';
  const cleanFeatures = Array.from(new Set(params.favoriteFeatures)).slice(0, 3);

  const { data, error } = await supabase
    .from('app_reviews')
    .insert({
      user_id: params.userId,
      author_name: cleanName,
      study_level: params.studyLevel || 'N5',
      rating: safeRating,
      comment: cleanComment,
      favorite_features: cleanFeatures,
    })
    .select(
      'id, user_id, author_name, study_level, rating, comment, favorite_features, verified_attempts, helpful_count, is_featured, is_hidden, created_at, updated_at',
    )
    .single();

  if (error || !data) {
    if (isMissingTableError(error)) {
      return {
        ok: false,
        error: 'Mục đánh giá đang được bảo trì, bạn thử lại sau nhé.',
      };
    }
    const errMsg = error?.message || '';
    if (errMsg.includes('app_reviews_comment_check')) {
      // Databases that have not run allow_review_without_attempts.sql still require 15+ characters
      return {
        ok: false,
        error:
          cleanComment.length < 15
            ? 'Nhận xét cần ít nhất 15 ký tự, bạn viết thêm một chút nhé.'
            : 'Nhận xét chưa hợp lệ (tối đa 500 ký tự).',
      };
    }
    if (errMsg.includes('EXPERIENCE_REQUIRED')) {
      return {
        ok: false,
        error: 'Bạn cần hoàn thành ít nhất 1 bài luyện tập (Quiz, Nghe/Đọc hoặc Mini-game) để mở khóa gửi đánh giá.',
      };
    }
    if (error?.code === '23505' || errMsg.toLowerCase().includes('duplicate key')) {
      return {
        ok: false,
        error: 'Tài khoản của bạn đã gửi đánh giá trước đó. Mỗi tài khoản chỉ được đánh giá duy nhất 1 lần.',
      };
    }
    return { ok: false, error: errMsg || 'Không thể lưu đánh giá.' };
  }

  return { ok: true, review: mapReviewRow(data as RawReviewRow) };
}

export async function deleteCommunityReview(
  reviewId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Chưa kết nối Supabase.' };
  const { error } = await supabase.from('app_reviews').delete().eq('id', reviewId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function toggleCommunityReviewVote(
  reviewId: string,
  userId: string,
  currentlyVoted: boolean,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Chưa kết nối Supabase.' };
  if (currentlyVoted) {
    const { error } = await supabase
      .from('app_review_votes')
      .delete()
      .eq('review_id', reviewId)
      .eq('user_id', userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  const { error } = await supabase
    .from('app_review_votes')
    .insert({ review_id: reviewId, user_id: userId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function adminModerateCommunityReview(
  reviewId: string,
  patch: { isFeatured?: boolean; isHidden?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Chưa kết nối Supabase.' };
  const payload: Record<string, boolean> = {};
  if (typeof patch.isFeatured === 'boolean') payload.is_featured = patch.isFeatured;
  if (typeof patch.isHidden === 'boolean') payload.is_hidden = patch.isHidden;
  const { error } = await supabase.from('app_reviews').update(payload).eq('id', reviewId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
