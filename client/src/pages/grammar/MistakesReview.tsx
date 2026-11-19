import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { BookOpen, CircleCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { LoginRequiredState } from '../../components/auth/LoginRequiredState';
import type { RootState } from '../../store';
import { clearMistakes, removeMistakesByGrammar } from '../../store/slices/mistakeSlice';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { getLiveGrammarBooks } from '../../services/curriculumStore';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  PageContainer,
  PageHeader,
  buttonStyles,
} from '../../components/ui';

interface ResolvedRuleMeta {
  id: string;
  name: string;
  practicePath: string;
}

export const MistakesReview: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const cmsSnapshot = useCurriculumSnapshot();
  const liveGrammarBooks = getLiveGrammarBooks(cmsSnapshot);
  const mistakes = useSelector((state: RootState) => state.mistake.mistakes);

  const mistakesByGrammar = mistakes.reduce(
    (acc, mistake) => {
      if (!acc[mistake.grammarId]) {
        acc[mistake.grammarId] = [];
      }
      acc[mistake.grammarId].push(mistake);
      return acc;
    },
    {} as Record<string, typeof mistakes>,
  );

  const resolveRuleMeta = (
    grammarId: string,
    sampleMistake?: (typeof mistakes)[number],
  ): ResolvedRuleMeta => {
    if (sampleMistake?.categoryLabel || sampleMistake?.practicePath || grammarId.startsWith('JLPT_')) {
      return {
        id: grammarId,
        name: sampleMistake?.categoryLabel || grammarId,
        practicePath: sampleMistake?.practicePath || '/',
      };
    }

    for (const book of liveGrammarBooks) {
      for (const chapter of book.chapters) {
        const found = chapter.grammars.find((g) => g.id === grammarId);
        if (found) {
          return {
            id: found.id,
            name: found.name,
            practicePath: `/grammar/${book.id}/${chapter.id}/practice/${found.id}?mode=mixed`,
          };
        }
      }
    }

    return {
      id: grammarId,
      name: grammarId,
      practicePath: '/grammar',
    };
  };

  const entries = Object.entries(mistakesByGrammar);

  return (
    <PageContainer size="md">
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Ôn tập lỗi sai' },
        ]}
        title="Ôn tập lỗi sai"
        description="Danh sách các câu hỏi bạn đã làm sai trong quá trình luyện tập."
        actions={
          user && mistakes.length > 0 ? (
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="size-4" aria-hidden />}
              onClick={() => dispatch(clearMistakes())}
            >
              Xóa lịch sử
            </Button>
          ) : undefined
        }
      />

      {!user ? (
        <LoginRequiredState
          title="Đăng nhập để lưu & ôn tập lỗi sai"
          description="Câu làm sai khi luyện tập được lưu vào tài khoản cá nhân của bạn (Google hoặc tài khoản Email) để bạn ôn lại bất cứ lúc nào."
        />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<CircleCheck className="size-6 text-success-fg" aria-hidden />}
          title="Không có lỗi sai nào!"
          description="Tuyệt vời, bạn đang làm rất tốt."
          action={
            <Link to="/" className={buttonStyles({ variant: 'secondary' })}>
              Quay lại Trang chủ
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {entries.map(([grammarId, grammarMistakes]) => {
            const ruleMeta = resolveRuleMeta(grammarId, grammarMistakes[0]);
            const isJlptGroup = grammarId.startsWith('JLPT_');

            return (
              <Card key={grammarId} padding="none" className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2 px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <h2 lang="ja" className="text-base font-bold text-fg">
                      {ruleMeta.name}
                    </h2>
                    <Badge tone="danger" className="tabular">
                      {grammarMistakes.length} lỗi sai
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={ruleMeta.practicePath}
                      className={buttonStyles({ variant: 'soft', size: 'sm' })}
                    >
                      <BookOpen className="size-4" aria-hidden />
                      {isJlptGroup ? 'Luyện lại phần này' : 'Ôn lại ngữ pháp này'}
                    </Link>
                    <IconButton
                      variant="ghost"
                      size="sm"
                      aria-label={`Xóa lỗi của ${ruleMeta.name}`}
                      onClick={() => dispatch(removeMistakesByGrammar(grammarId))}
                      className="text-danger-fg"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </IconButton>
                  </div>
                </div>

                <div className="divide-y divide-line">
                  {grammarMistakes.map((mistake) => (
                    <div key={mistake.id} className="space-y-3 p-4 md:p-5">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                              {mistake.prompt ? 'Câu hỏi' : 'Mã câu hỏi'}
                            </p>
                            {mistake.level && <Badge tone="primary">{mistake.level}</Badge>}
                          </div>
                          {mistake.prompt ? (
                            <p lang="ja" className="text-sm font-medium leading-relaxed text-fg">
                              {mistake.prompt}
                            </p>
                          ) : (
                            <p className="font-mono text-sm font-medium text-fg">{mistake.questionId}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-danger-line bg-danger-soft p-3">
                            <p className="text-xs font-semibold text-danger-fg uppercase">
                              Bạn trả lời
                            </p>
                            <p lang="ja" className="mt-1 text-sm font-medium text-fg line-through">
                              {mistake.userAnswer}
                            </p>
                          </div>

                          <div className="rounded-lg border border-success-line bg-success-soft p-3">
                            <p className="text-xs font-semibold text-success-fg uppercase">
                              Đáp án đúng
                            </p>
                            <p lang="ja" className="mt-1 text-sm font-semibold text-fg">
                              {mistake.correctAnswer}
                            </p>
                          </div>
                        </div>
                      </div>

                      {mistake.explanation && (
                        <p className="rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-sm leading-relaxed text-muted">
                          {mistake.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
};
