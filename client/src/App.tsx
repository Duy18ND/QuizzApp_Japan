import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
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
import { GrammarPractice } from './pages/grammar/GrammarPractice';
import { MistakesReview } from './pages/grammar/MistakesReview';
import { GrammarPDFModal } from './components/grammar/pdf/GrammarPDFModal';
import './index.css';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/vocabulary" replace />} />
          
          <Route path="vocabulary">
            <Route index element={<VocabularyLevelsPage />} />
            <Route path=":level" element={<VocabularyUnitsPage />} />
            <Route path=":level/:unitId" element={<VocabularyWordsPage />} />

            <Route path="quiz" element={<QuizPage />} />
            <Route path="writing" element={<WritingPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="unmastered" element={<UnmasteredPage />} />
          </Route>
          
          <Route path="grammar">
            <Route index element={<GrammarDashboard />} />
            <Route path="pdf" element={<GrammarPDFModal />} />
            <Route path="mistakes" element={<MistakesReview />} />
            <Route path=":id" element={<GrammarDetail />} />
            <Route path=":id/practice" element={<GrammarPractice />} />
          </Route>

          <Route path="flashcard" element={<FlashcardPage />}>
            <Route index element={<VocabularyLevelsPage basePath="/flashcard" title="Flashcard" hideTabs={true} />} />
            <Route path=":level" element={<VocabularyUnitsPage basePath="/flashcard" title="Flashcard" hideTabs={true} />} />
            <Route path=":level/:unitId" element={<FlashcardViewer />} />
          </Route>

          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
