import { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { EmptyState, LoadingState, PageContainer, buttonStyles } from './components/ui';
import { ToastProvider } from './components/ui/Toast';
import { useAuth } from './context/auth-context';
import { consumeOAuthLoginPending } from './services/supabaseClient';
import './index.css';

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const StageRoadmapPage = lazy(() =>
  import('./pages/StageRoadmapPage').then((m) => ({ default: m.StageRoadmapPage })),
);
const StageStudySessionPage = lazy(() =>
  import('./pages/StageStudySessionPage').then((m) => ({ default: m.StageStudySessionPage })),
);
const AuthPage = lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const VocabularyLevelsPage = lazy(() =>
  import('./pages/vocabulary/VocabularyLevelsPage').then((m) => ({ default: m.VocabularyLevelsPage })),
);
const VocabularyTextbooksPage = lazy(() =>
  import('./pages/vocabulary/VocabularyTextbooksPage').then((m) => ({ default: m.VocabularyTextbooksPage })),
);
const VocabularyUnitsPage = lazy(() =>
  import('./pages/vocabulary/VocabularyUnitsPage').then((m) => ({ default: m.VocabularyUnitsPage })),
);
const VocabularyWordsPage = lazy(() =>
  import('./pages/vocabulary/VocabularyWordsPage').then((m) => ({ default: m.VocabularyWordsPage })),
);
const QuizPage = lazy(() => import('./pages/QuizPage').then((m) => ({ default: m.QuizPage })));
const FlashcardPage = lazy(() =>
  import('./pages/FlashcardPage').then((m) => ({ default: m.FlashcardPage })),
);
const FlashcardViewer = lazy(() =>
  import('./components/flashcard/FlashcardViewer').then((m) => ({ default: m.FlashcardViewer })),
);
/** Redirect that carries ?level=…&unit=… over to the new page. */
const RedirectKeepingQuery: React.FC<{ to: string }> = ({ to }) => {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
};

const UnmasteredPage = lazy(() =>
  import('./pages/UnmasteredPage').then((m) => ({ default: m.UnmasteredPage })),
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const GrammarDashboard = lazy(() =>
  import('./pages/grammar/GrammarDashboard').then((m) => ({ default: m.GrammarDashboard })),
);
const GrammarDetail = lazy(() =>
  import('./pages/grammar/GrammarDetail').then((m) => ({ default: m.GrammarDetail })),
);
const GrammarLesson = lazy(() =>
  import('./pages/grammar/GrammarLesson').then((m) => ({ default: m.GrammarLesson })),
);
const GrammarPractice = lazy(() =>
  import('./pages/grammar/GrammarPractice').then((m) => ({ default: m.GrammarPractice })),
);
const MistakesReview = lazy(() =>
  import('./pages/grammar/MistakesReview').then((m) => ({ default: m.MistakesReview })),
);
const PdfPage = lazy(() => import('./pages/PdfPage').then((m) => ({ default: m.PdfPage })));
const KanjiDashboard = lazy(() =>
  import('./pages/kanji/KanjiDashboard').then((m) => ({ default: m.KanjiDashboard })),
);
const KanjiDetail = lazy(() =>
  import('./pages/kanji/KanjiDetail').then((m) => ({ default: m.KanjiDetail })),
);
const KanjiPractice = lazy(() =>
  import('./pages/kanji/KanjiPractice').then((m) => ({ default: m.KanjiPractice })),
);
const JLPTModulePage = lazy(() =>
  import('./pages/jlpt/JLPTModulePage').then((m) => ({ default: m.JLPTModulePage })),
);
const MiniGamesPage = lazy(() =>
  import('./pages/MiniGamesPage').then((m) => ({ default: m.MiniGamesPage })),
);
const CustomStudioPage = lazy(() =>
  import('./pages/CustomStudioPage').then((m) => ({ default: m.CustomStudioPage })),
);
const LegalPage = lazy(() =>
  import('./pages/LegalPage').then((m) => ({ default: m.LegalPage })),
);

function RouteFallback() {
  return (
    <PageContainer size="md" className="flex min-h-[calc(100dvh-6rem)] flex-1 items-center justify-center">
      <LoadingState label="Đang tải trang..." className="py-0" />
    </PageContainer>
  );
}

function AdminPostLoginRedirector() {
  const { user, status } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (status !== 'authenticated' || !user) return;
    if (!consumeOAuthLoginPending()) return;
    if ((user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && pathname !== '/admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, status, pathname, navigate]);

  return null;
}

function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <AdminPostLoginRedirector />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="roadmap" element={<StageRoadmapPage />} />
            <Route path="roadmap/stages" element={<StageRoadmapPage />} />
            <Route path="roadmap/stage/:stageId/:mode" element={<StageStudySessionPage />} />
          
            <Route path="vocabulary">
              <Route index element={<VocabularyLevelsPage />} />
              <Route path=":level" element={<VocabularyTextbooksPage />} />
              <Route path=":level/book/:bookId" element={<VocabularyUnitsPage />} />
              <Route path=":level/book/:bookId/:unitId" element={<VocabularyWordsPage />} />
              <Route path=":level/:unitId" element={<VocabularyWordsPage />} />

              <Route path="quiz" element={<QuizPage />} />
              {/* typing practice removed: the mini-games cover it, old links keep their lesson params */}
              <Route path="writing" element={<RedirectKeepingQuery to="/games" />} />
              {/* old "Ôn tập" page removed: keep old links working */}
              <Route path="review" element={<Navigate to="/vocabulary/unmastered" replace />} />
              <Route path="unmastered" element={<UnmasteredPage />} />
            </Route>
          
            <Route path="kanji">
              <Route index element={<KanjiDashboard />} />
              <Route path=":kanjiId" element={<KanjiDetail />} />
              <Route path=":kanjiId/practice" element={<KanjiPractice />} />
            </Route>

            <Route path="grammar">
              <Route index element={<GrammarDashboard />} />
              <Route path="mistakes" element={<MistakesReview />} />
              <Route path=":bookId/:chapterId" element={<GrammarDetail />} />
              <Route path=":bookId/:chapterId/lesson/:grammarId" element={<GrammarLesson />} />
              <Route path=":bookId/:chapterId/practice" element={<GrammarPractice />} />
              <Route path=":bookId/:chapterId/practice/:grammarId" element={<GrammarPractice />} />
            </Route>

            <Route path="flashcard" element={<FlashcardPage />}>
              <Route index element={<VocabularyLevelsPage basePath="/flashcard" title="Flashcard" hideTabs={true} />} />
              <Route path=":level" element={<VocabularyUnitsPage basePath="/flashcard" title="Flashcard" hideTabs={true} />} />
              <Route path=":level/book/:bookId" element={<VocabularyUnitsPage basePath="/flashcard" title="Flashcard" hideTabs={true} />} />
              <Route path=":level/book/:bookId/:unitId" element={<FlashcardViewer />} />
              <Route path=":level/:unitId" element={<FlashcardViewer />} />
            </Route>

            <Route path="jlpt/:moduleId" element={<JLPTModulePage />} />
            <Route path="games" element={<MiniGamesPage />} />
            <Route path="studio" element={<CustomStudioPage />} />
            <Route path="login" element={<AuthPage initialMode="login" />} />
            <Route path="register" element={<AuthPage initialMode="register" />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="history" element={<ProfilePage />} />
            <Route
              path="admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="pdf" element={<PdfPage />} />
            <Route path="privacy" element={<LegalPage doc="privacy" />} />
            <Route path="terms" element={<LegalPage doc="terms" />} />
            <Route
              path="*"
              element={
                <div className="mx-auto max-w-xl px-4 py-12">
                  <EmptyState
                    title="404 — Không tìm thấy trang"
                    description="Đường dẫn bạn truy cập không tồn tại hoặc đã bị di chuyển."
                    className="bg-surface/90 backdrop-blur-md"
                    action={
                      <Link to="/" className={buttonStyles({ variant: 'primary' })}>
                        Trang chủ
                      </Link>
                    }
                  />
                </div>
              }
            />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    </ToastProvider>
  );
}

export default App;
