import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { EmptyState, buttonStyles } from './components/ui';
import { ToastProvider } from './components/ui/Toast';
import { HomePage } from './pages/HomePage';
import { VocabularyLevelsPage } from './pages/vocabulary/VocabularyLevelsPage';
import { VocabularyUnitsPage } from './pages/vocabulary/VocabularyUnitsPage';
import { VocabularyWordsPage } from './pages/vocabulary/VocabularyWordsPage';
import { QuizPage } from './pages/QuizPage';
import { FlashcardPage } from './pages/FlashcardPage';
import { FlashcardViewer } from './components/flashcard/FlashcardViewer';
import { WritingPage } from './pages/WritingPage';
import { ReviewPage } from './pages/ReviewPage';
import { UnmasteredPage } from './pages/UnmasteredPage';
import { SettingsPage } from './pages/SettingsPage';
import { GrammarDashboard } from './pages/grammar/GrammarDashboard';
import { GrammarDetail } from './pages/grammar/GrammarDetail';
import { GrammarLesson } from './pages/grammar/GrammarLesson';
import { GrammarPractice } from './pages/grammar/GrammarPractice';
import { MistakesReview } from './pages/grammar/MistakesReview';
import { PdfPage } from './pages/PdfPage';
import { KanjiDashboard } from './pages/kanji/KanjiDashboard';
import { KanjiDetail } from './pages/kanji/KanjiDetail';
import { KanjiPractice } from './pages/kanji/KanjiPractice';
import { JLPTModulePage } from './pages/jlpt/JLPTModulePage';
import { validateGrammarPracticeBanks } from './data/grammar/shinkanzen-n3/lesson01PracticeBank';
import './index.css';

validateGrammarPracticeBanks();

function App() {

  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<HomePage />} />
          
            <Route path="vocabulary">
              <Route index element={<VocabularyLevelsPage />} />
              <Route path=":level" element={<VocabularyUnitsPage />} />
              <Route path=":level/:unitId" element={<VocabularyWordsPage />} />

              <Route path="quiz" element={<QuizPage />} />
              <Route path="writing" element={<WritingPage />} />
              <Route path="review" element={<ReviewPage />} />
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
              <Route path=":level/:unitId" element={<FlashcardViewer />} />
            </Route>

            <Route path="jlpt/:moduleId" element={<JLPTModulePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="pdf" element={<PdfPage />} />
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
      </HashRouter>
    </ToastProvider>
  );
}

export default App;
