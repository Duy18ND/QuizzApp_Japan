import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  MessageSquarePlus,
  Pin,
  Star,
  ThumbsUp,
  Trash2,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { cn } from '../../lib/cn';
import {
  adminModerateCommunityReview,
  computeReviewSummary,
  deleteCommunityReview,
  fetchCommunityReviewsAndStats,
  REVIEW_FEATURE_TAGS,
  submitOneTimeCommunityReview,
  toggleCommunityReviewVote,
  type AppReviewRecord,
  type CommunityStats,
} from '../../services/communityReviewService';
import type { StudyLevel } from '../../services/userLevelService';
import {
  Badge,
  Button,
  Card,
  Chip,
  Field,
  Modal,
  Notice,
  ProgressBar,
  Textarea,
  useToast,
} from '../ui';
import { buttonStyles } from '../ui/styles';

const RATING_LABELS: Record<number, string> = {
  1: 'Rất tệ',
  2: 'Chưa tốt',
  3: 'Bình thường',
  4: 'Tốt',
  5: 'Rất tốt',
};

function formatDateVi(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'HV';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export const CommunityReviewsSection: React.FC = () => {
  const { user, studyLevel } = useAuth();
  const { toast } = useToast();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const hasExperiencedApp = Boolean(user);

  const [reviews, setReviews] = useState<AppReviewRecord[]>([]);
  const [votedIds, setVotedIds] = useState<string[]>([]);
  const [stats, setStats] = useState<CommunityStats>({
    totalUsers: 0,
    totalAttempts: 0,
    totalReviews: 0,
    avgRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [tableNotReady, setTableNotReady] = useState(false);

  const [filterMode, setFilterMode] = useState<'ALL' | 1 | 2 | 3 | 4 | 5>('ALL');
  const [showAll, setShowAll] = useState(false);

  // One-time Write Review Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [draftRating, setDraftRating] = useState<number>(5);
  const [draftLevel, setDraftLevel] = useState<StudyLevel>(studyLevel ?? 'N5');
  const [draftComment, setDraftComment] = useState('');
  const [draftFeatures, setDraftFeatures] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refreshReviews = useCallback(async () => {
    setLoading(true);
    const res = await fetchCommunityReviewsAndStats(user?.id);
    setReviews(res.reviews);
    setVotedIds(res.votedReviewIds);
    setStats(res.stats);
    setTableNotReady(res.tableNotReady);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refreshReviews();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refreshReviews]);

  const myReview = useMemo(
    () => (user ? reviews.find((r) => r.userId === user.id) ?? null : null),
    [reviews, user],
  );

  const summary = useMemo(() => computeReviewSummary(reviews), [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (r.isHidden && !isAdmin && r.userId !== user?.id) return false;
      return filterMode === 'ALL' || r.rating === filterMode;
    });
  }, [filterMode, isAdmin, reviews, user?.id]);

  const displayedReviews = showAll ? filteredReviews : filteredReviews.slice(0, 6);

  const openWriteModal = () => {
    if (!user || myReview) return;
    if (!hasExperiencedApp) {
      toast({
        title: 'Hoàn thành 1 bài luyện tập để gửi đánh giá.',
        tone: 'info',
      });
      return;
    }
    setDraftRating(5);
    setDraftLevel(studyLevel ?? 'N5');
    setDraftComment('');
    setDraftFeatures([]);
    setFormError(null);
    setModalOpen(true);
  };

  const toggleDraftFeature = (tag: string) => {
    setDraftFeatures((prev) => {
      if (prev.includes(tag)) return prev.filter((item) => item !== tag);
      if (prev.length >= 3) {
        toast({ title: 'Bạn có thể chọn tối đa 3 tính năng thích nhất.', tone: 'info' });
        return prev;
      }
      return [...prev, tag];
    });
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || myReview) return;
    if (draftComment.trim().length < 1) {
      setFormError('Vui lòng nhập nhận xét.');
      return;
    }
    setSaving(true);
    setFormError(null);

    const res = await submitOneTimeCommunityReview({
      userId: user.id,
      authorName: user.displayName || user.email.split('@')[0] || 'Học viên',
      studyLevel: draftLevel,
      rating: draftRating,
      comment: draftComment,
      favoriteFeatures: draftFeatures,
    });

    setSaving(false);
    if (!res.ok) {
      setFormError(res.error || 'Không thể gửi đánh giá.');
      return;
    }

    setModalOpen(false);
    toast({
      title: 'Đã gửi đánh giá. Cảm ơn bạn!',
      tone: 'success',
    });
    await refreshReviews();
  };

  const handleAdminDelete = async (review: AppReviewRecord) => {
    if (!isAdmin) return;
    const res = await deleteCommunityReview(review.id);
    if (!res.ok) {
      toast({ title: res.error || 'Không thể xóa đánh giá.', tone: 'danger' });
      return;
    }
    toast({ title: 'Đã xóa đánh giá.', tone: 'info' });
    await refreshReviews();
  };

  const handleVoteHelpful = async (review: AppReviewRecord) => {
    if (!user) {
      toast({ title: 'Đăng nhập để bấm Hữu ích cho đánh giá này nhé!', tone: 'info' });
      return;
    }
    const currentlyVoted = votedIds.includes(review.id);
    const res = await toggleCommunityReviewVote(review.id, user.id, currentlyVoted);
    if (!res.ok) {
      toast({ title: res.error || 'Không thể cập nhật bình chọn.', tone: 'danger' });
      return;
    }
    setVotedIds((prev) =>
      currentlyVoted ? prev.filter((id) => id !== review.id) : [...prev, review.id],
    );
    setReviews((prev) =>
      prev.map((item) =>
        item.id === review.id
          ? {
              ...item,
              helpfulCount: Math.max(0, item.helpfulCount + (currentlyVoted ? -1 : 1)),
            }
          : item,
      ),
    );
  };

  const handleAdminToggle = async (
    review: AppReviewRecord,
    patch: { isFeatured?: boolean; isHidden?: boolean },
  ) => {
    const res = await adminModerateCommunityReview(review.id, patch);
    if (!res.ok) {
      toast({ title: res.error || 'Không thể cập nhật kiểm duyệt.', tone: 'danger' });
      return;
    }
    toast({ title: 'Đã cập nhật trạng thái đánh giá.', tone: 'success' });
    await refreshReviews();
  };

  const renderReviewActionControl = () => {
    if (!user) {
      return (
        <Link
          to="/login"
          className={buttonStyles({ variant: 'secondary', size: 'sm' })}
        >
          <span>Viết đánh giá</span>
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      );
    }

    if (myReview) {
      return (
        <Badge tone="success" className="px-2.5 py-1 text-xs">
          <CheckCircle2 className="size-3.5" aria-hidden />
          Đã đánh giá
        </Badge>
      );
    }

    if (!hasExperiencedApp) {
      return (
        <Link
          to="/vocabulary/quiz"
          className={buttonStyles({ variant: 'soft', size: 'sm' })}
        >
          <span>Làm 1 bài để đánh giá</span>
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      );
    }

    return (
      <Button
        type="button"
        variant="primary"
        size="sm"
        leftIcon={<MessageSquarePlus className="size-3.5" aria-hidden />}
        onClick={openWriteModal}
      >
        Viết đánh giá
      </Button>
    );
  };

  return (
    <Card as="section" aria-labelledby="section-community-reviews" padding="md" className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <h2
          id="section-community-reviews"
          className="flex items-center gap-2 text-base font-bold text-fg md:text-lg"
        >
          <span aria-hidden className="h-4 w-1 rounded-full bg-sakura" />
          Đánh giá
        </h2>

        <div className="flex flex-wrap items-center gap-2">{renderReviewActionControl()}</div>
      </div>

      {/* Rating Summary */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-line bg-surface-2/55 p-4 md:grid-cols-[minmax(200px,auto)_1fr]">
        <div className="flex flex-col justify-between gap-3 md:border-r md:border-line md:pr-5">
          <div className="flex items-baseline gap-2.5">
            <span className="tabular text-4xl font-extrabold tracking-tight text-fg">
              {summary.visibleCount > 0 ? summary.avgRating.toFixed(1) : '—'}
            </span>
            <div>
              <div
                className="flex items-center gap-0.5 text-warning-fg"
                aria-label={`Điểm trung bình ${summary.avgRating} trên 5`}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'size-4',
                      star <= Math.round(summary.avgRating)
                        ? 'fill-current text-warning-fg'
                        : 'text-line-strong',
                    )}
                    aria-hidden
                  />
                ))}
              </div>
              <p className="mt-0.5 text-xs text-muted tabular">
                {summary.visibleCount > 0
                  ? `${summary.visibleCount} đánh giá`
                  : 'Chưa có đánh giá'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {stats.totalUsers > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 font-medium text-fg tabular">
                <Users className="size-3.5 text-primary-fg" aria-hidden />
                {stats.totalUsers.toLocaleString('vi-VN')} tài khoản
              </span>
            )}
            {stats.totalAttempts > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 font-medium text-fg tabular">
                <CheckCircle2 className="size-3.5 text-success-fg" aria-hidden />
                {stats.totalAttempts.toLocaleString('vi-VN')} lượt luyện bài
              </span>
            )}
          </div>
        </div>

        {/* Right: 5-star to 1-star Distribution Bars */}
        <div className="flex flex-col justify-center gap-1.5">
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = summary.distribution[star];
            return (
              <button
                key={star}
                type="button"
                aria-pressed={filterMode === star}
                aria-label={`Xem đánh giá ${star} sao (${count})`}
                title={filterMode === star ? 'Bấm lần nữa để xem tất cả' : `Xem đánh giá ${star} sao`}
                onClick={() => setFilterMode(filterMode === star ? 'ALL' : star)}
                className={cn(
                  'grid cursor-pointer grid-cols-[36px_1fr_32px] items-center gap-2 rounded-lg px-2 py-0.5 text-xs transition-colors hover:bg-primary-soft',
                  filterMode === star && 'bg-primary-soft ring-1 ring-primary',
                )}
              >
                <span className="flex items-center gap-1 font-semibold text-muted tabular">
                  {star}
                  <Star className="size-3 fill-current text-warning-fg" aria-hidden />
                </span>
                <ProgressBar
                  value={count}
                  max={Math.max(1, summary.visibleCount)}
                  size="sm"
                  tone={star >= 4 ? 'success' : star === 3 ? 'primary' : 'danger'}
                  label={`${count} đánh giá ${star} sao`}
                />
                <span className="text-right font-medium text-muted tabular">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Admin setup notice if SQL migration not run yet */}
      {tableNotReady && isAdmin && (
        <Notice tone="warning" title="Cần chạy SQL tạo bảng đánh giá trên Supabase (Admin)">
          Chưa tìm thấy bảng <code>public.app_reviews</code> trên Supabase. Hãy chạy mục{' '}
          <strong>10. VERIFIED COMMUNITY REVIEWS</strong> ở cuối file <code>supabase/schema.sql</code>{' '}
          trong Supabase SQL Editor để kích hoạt lưu đánh giá thật.
        </Notice>
      )}

      {/* Only shown while a star row is selected (or for admins) */}
      {(filterMode !== 'ALL' || isAdmin) && reviews.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {filterMode !== 'ALL' ? (
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className="cursor-pointer text-xs font-semibold text-primary-fg hover:underline"
            >
              Đang xem {filterMode} sao · Xem tất cả ✕
            </button>
          ) : (
            <span />
          )}
          {isAdmin && (
            <span className="text-[11px] font-medium text-muted">
              Chế độ Admin: có thể Ghim nổi bật / Ẩn / Xóa spam trực tiếp trên thẻ
            </span>
          )}
        </div>
      )}

      {/* Review List or Honest Empty State */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-line bg-surface-2/50"
            />
          ))}
        </div>
      ) : displayedReviews.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted">
          {reviews.length === 0
            ? 'Chưa có đánh giá nào.'
            : 'Không có đánh giá nào phù hợp bộ lọc.'}
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {displayedReviews.map((review) => {
              const isMine = user?.id === review.userId;
              const isVoted = votedIds.includes(review.id);

              return (
                <li
                  key={review.id}
                  className={cn(
                    'flex flex-col justify-between gap-3 rounded-xl border p-4 transition-colors',
                    review.isHidden
                      ? 'border-danger-line bg-danger-soft/20 opacity-75'
                      : review.isFeatured
                        ? 'border-sakura/55 bg-sakura-soft/15'
                        : 'border-line bg-surface-2/55',
                  )}
                >
                  <div className="space-y-2.5">
                    {/* Card Top: Avatar + Author + Verified Proof + Stars */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          aria-hidden
                          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary-fg ring-1 ring-primary/25"
                        >
                          {getInitials(review.authorName)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-sm font-bold text-fg">
                              {review.authorName}
                            </span>
                            {isMine && <Badge tone="neutral">Của bạn</Badge>}
                            {review.isFeatured && <Badge tone="sakura">★ Nổi bật</Badge>}
                            {review.isHidden && <Badge tone="danger">Đang ẩn</Badge>}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                            <span className="inline-flex items-center gap-1 font-medium text-success-fg">
                              <CheckCircle2 className="size-3" aria-hidden />
                              {review.verifiedAttempts > 0
                                ? `Đã trải nghiệm ${review.verifiedAttempts} bài`
                                : 'Học viên đã xác thực'}
                            </span>
                            <span>·</span>
                            <span>{formatDateVi(review.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div
                        className="flex shrink-0 items-center gap-0.5 text-warning-fg"
                        aria-label={`${review.rating} trên 5 sao`}
                      >
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={cn(
                              'size-3.5',
                              s <= review.rating
                                ? 'fill-current text-warning-fg'
                                : 'text-line-strong',
                            )}
                            aria-hidden
                          />
                        ))}
                      </div>
                    </div>

                    {/* Comment Body */}
                    <p className="text-sm leading-relaxed text-fg whitespace-pre-line">
                      “{review.comment}”
                    </p>

                    {/* Favorite Feature Chips */}
                    {review.favoriteFeatures.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {review.favoriteFeatures.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md border border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-muted"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Helpful Vote + Admin-Only Moderation */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
                    <button
                      type="button"
                      onClick={() => void handleVoteHelpful(review)}
                      className={cn(
                        'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                        isVoted
                          ? 'border-primary/50 bg-primary-soft text-primary-fg'
                          : 'border-line bg-surface text-muted hover:border-primary/40 hover:text-fg',
                      )}
                    >
                      <ThumbsUp className={cn('size-3.5', isVoted && 'fill-current')} aria-hidden />
                      <span>Hữu ích</span>
                      {review.helpfulCount > 0 && (
                        <span className="tabular font-semibold">({review.helpfulCount})</span>
                      )}
                    </button>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title={review.isFeatured ? 'Bỏ ghim nổi bật' : 'Ghim nổi bật'}
                          aria-label={review.isFeatured ? 'Bỏ ghim nổi bật' : 'Ghim nổi bật'}
                          onClick={() =>
                            void handleAdminToggle(review, { isFeatured: !review.isFeatured })
                          }
                        >
                          <Pin
                            className={cn(
                              'size-3.5',
                              review.isFeatured ? 'text-sakura' : 'text-muted',
                            )}
                            aria-hidden
                          />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title={review.isHidden ? 'Hiện lại đánh giá' : 'Ẩn đánh giá spam'}
                          aria-label={review.isHidden ? 'Hiện lại đánh giá' : 'Ẩn đánh giá spam'}
                          onClick={() =>
                            void handleAdminToggle(review, { isHidden: !review.isHidden })
                          }
                        >
                          {review.isHidden ? (
                            <Eye className="size-3.5 text-success-fg" aria-hidden />
                          ) : (
                            <EyeOff className="size-3.5 text-warning-fg" aria-hidden />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          title="Xóa đánh giá này (Admin)"
                          aria-label="Xóa đánh giá này"
                          onClick={() => void handleAdminDelete(review)}
                        >
                          <Trash2 className="size-3.5 text-danger-fg" aria-hidden />
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {filteredReviews.length > 6 && (
            <div className="flex justify-center pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll
                  ? 'Thu gọn bớt'
                  : `Xem thêm ${filteredReviews.length - 6} đánh giá khác`}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Write Review Modal */}
      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        size="md"
        title="Viết đánh giá"
      >
        <form onSubmit={(e) => void handleSaveReview(e)} className="space-y-4">
          {formError && (
            <Notice tone="danger" title="Chưa thể gửi đánh giá">
              {formError}
            </Notice>
          )}

          {/* Star Selector */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-fg">Đánh giá *</span>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-2 p-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`Chọn ${star} sao`}
                    onClick={() => setDraftRating(star)}
                    className="cursor-pointer rounded-md p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        'size-7',
                        star <= draftRating
                          ? 'fill-current text-warning-fg'
                          : 'text-line-strong',
                      )}
                      aria-hidden
                    />
                  </button>
                ))}
              </div>
              <span className="text-sm font-semibold text-fg">
                {draftRating}/5 · {RATING_LABELS[draftRating]}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-fg">
              Thích nhất
            </span>
            <div className="flex flex-wrap gap-1.5">
              {REVIEW_FEATURE_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  selected={draftFeatures.includes(tag)}
                  onClick={() => toggleDraftFeature(tag)}
                >
                  {tag}
                </Chip>
              ))}
            </div>
          </div>

          <Field
            label="Nhận xét *"
            hint={`${draftComment.trim().length}/500`}
          >
            <Textarea
              rows={4}
              maxLength={500}
              value={draftComment}
              onChange={(e) => setDraftComment(e.target.value)}
              placeholder="Cảm nhận của bạn..."
            />
          </Field>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => setModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
            >
              {saving ? 'Đang gửi...' : 'Gửi đánh giá'}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};
