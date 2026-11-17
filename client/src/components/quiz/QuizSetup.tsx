import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Play, Trash2, X } from 'lucide-react';
import type { JLPTLevel, QuestionType, QuizConfig, QuizSource } from '../../types/quiz';
import { UNIT_DATA } from '../../data/unitData';
import { CustomDataImport } from '../common/CustomDataImport';
import {
  Button,
  Card,
  Chip,
  Field,
  Input,
  Notice,
  PageContainer,
  PageHeader,
  Select,
  Switch,
  Tabs,
} from '../ui';

interface Props {
  onStart: (config: QuizConfig) => void;
}

const LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

const SOURCES: { id: QuizSource; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'starred', label: 'Đã lưu (★)' },
  { id: 'wrong', label: 'Làm sai' },
];

const WORD_TYPES: { id: string; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'Danh từ', label: 'Danh từ' },
  { id: 'Động từ', label: 'Động từ' },
  { id: 'Tính từ -i', label: 'Tính từ - い' },
  { id: 'Tính từ -na', label: 'Tính từ - な' },
  { id: 'Trạng từ', label: 'Trạng từ' },
  { id: 'Đại từ', label: 'Đại từ' },
  { id: 'Khác', label: 'Khác' },
];

const QUESTION_COUNTS: (number | 'all')[] = [10, 20, 50, 'all'];

const QUESTION_TYPE_OPTIONS: { value: 'all' | QuestionType; label: string }[] = [
  { value: 'all', label: 'Tất cả dạng (Ngẫu nhiên)' },
  { value: 'vi_to_hiragana', label: 'Nghĩa Việt → Hiragana' },
  { value: 'vi_to_kanji', label: 'Nghĩa Việt → Kanji' },
  { value: 'kanji_to_hiragana', label: 'Kanji → Hiragana' },
  { value: 'kanji_to_vi', label: 'Kanji → Nghĩa Việt' },
  { value: 'hiragana_to_kanji', label: 'Hiragana → Kanji' },
  { value: 'hiragana_to_vi', label: 'Hiragana → Nghĩa Việt' },
];

export const QuizSetup: React.FC<Props> = ({ onStart }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialKanji = searchParams.get('kanji')?.trim() || undefined;

  const [config, setConfig] = useState<QuizConfig>(() => ({
    level: 'N3',
    unitId: 1,
    source: 'all',
    wordType: 'all',
    rangeType: 'fixed',
    questionCount: 10,
    customRange: { start: 1, end: 20 },
    shuffleQuestions: true,
    shuffleAnswers: true,
    showHanVietHint: true,
    questionType: 'all',
    kanjiFilter: initialKanji,
  }));

  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'system' | 'custom'>('system');
  const [customWords, setCustomWords] = useState<Record<string, unknown>[]>([]);

  const activeUnits = UNIT_DATA[config.level] || UNIT_DATA.N3;
  const systemTotalWords = activeUnits.find((u) => u.id === config.unitId)?.totalWords ?? 0;
  const currentTotalWords = tab === 'custom' ? customWords.length : systemTotalWords;

  const handleLevelChange = (newLevel: JLPTLevel) => {
    const defaultUnitId = UNIT_DATA[newLevel]?.[0]?.id || 1;
    setConfig({ ...config, level: newLevel, unitId: defaultUnitId, customRange: { start: 1, end: 20 } });
  };

  const handleTabChange = (nextTab: 'system' | 'custom') => {
    setTab(nextTab);
    setError(null);
    if (nextTab === 'custom') {
      setConfig({ ...config, questionCount: 'all', questionType: 'all', wordType: 'all' });
    }
  };

  const handleStart = () => {
    if (tab === 'custom' && customWords.length === 0) {
      setError('Vui lòng nhập dữ liệu từ vựng trước khi bắt đầu Quiz.');
      return;
    }

    if (tab === 'system' && systemTotalWords === 0) {
      setError('Unit này hiện chưa có dữ liệu từ vựng (Sắp ra mắt). Vui lòng chọn N3 Unit 1.');
      return;
    }

    if (config.rangeType === 'custom') {
      if (config.customRange.start >= config.customRange.end) {
        setError('STT Bắt đầu phải nhỏ hơn STT Kết thúc.');
        return;
      }
      if (config.customRange.start < 1 || config.customRange.end > currentTotalWords) {
        setError(`Vui lòng chọn khoảng trong phạm vi từ 1 đến ${currentTotalWords}.`);
        return;
      }
    }

    setError(null);
    onStart({ ...config, isCustom: tab === 'custom', customData: customWords });
  };

  return (
    <PageContainer size="md">
      <PageHeader
        title="Cài đặt Quiz"
        description="Tùy chỉnh cấp độ, phạm vi từ vựng và cách hiển thị trước khi bắt đầu."
      />

      <Card padding="lg" className="space-y-6">
        <Tabs
          aria-label="Nguồn dữ liệu Quiz"
          variant="pill"
          items={[
            { value: 'system', label: 'Chọn từ hệ thống' },
            { value: 'custom', label: 'Tạo danh sách tự do' },
          ]}
          value={tab}
          onChange={handleTabChange}
          className="border-b border-line pb-4"
        />

        {tab === 'system' ? (
          <div className="space-y-6">
            {config.kanjiFilter && (
              <Notice tone="info" className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Đang lọc từ vựng chứa chữ Hán:{' '}
                  <strong lang="ja" className="text-base">
                    {config.kanjiFilter}
                  </strong>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<X className="size-3.5" aria-hidden />}
                  onClick={() => {
                    setConfig((prev) => ({ ...prev, kanjiFilter: undefined }));
                    const next = new URLSearchParams(searchParams);
                    next.delete('kanji');
                    setSearchParams(next, { replace: true });
                  }}
                >
                  Bỏ lọc
                </Button>
              </Notice>
            )}

            {/* 1. Trình độ & Bài học */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Trình độ (JLPT)" htmlFor="quiz-level">
                <Select
                  id="quiz-level"
                  value={config.level}
                  onChange={(e) => handleLevelChange(e.target.value as JLPTLevel)}
                >
                  {LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Bài học (Unit)" htmlFor="quiz-unit">
                <Select
                  id="quiz-unit"
                  value={config.unitId}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      unitId: e.target.value === 'all' ? 'all' : Number(e.target.value),
                    })
                  }
                >
                  {activeUnits.map((unit) => (
                    <option key={unit.id} value={unit.id} disabled={unit.totalWords === 0}>
                      {unit.name} ({unit.totalWords > 0 ? `${unit.totalWords} từ` : 'Sắp ra mắt'})
                    </option>
                  ))}
                  <option value="all" disabled>
                    Tất cả (Sắp ra mắt)
                  </option>
                </Select>
              </Field>
            </div>

            <Field label="Dạng câu hỏi" htmlFor="quiz-question-type">
              <Select
                id="quiz-question-type"
                value={config.questionType || 'all'}
                onChange={(e) => setConfig({ ...config, questionType: e.target.value })}
              >
                {QUESTION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>

            {/* 2. Nguồn từ vựng */}
            <div className="space-y-2 border-t border-line pt-5">
              <p className="text-sm font-medium text-fg">Nguồn từ vựng</p>
              <div className="flex flex-wrap gap-2">
                {SOURCES.map((src) => (
                  <Chip
                    key={src.id}
                    selected={config.source === src.id}
                    onClick={() => setConfig({ ...config, source: src.id })}
                  >
                    {src.label}
                  </Chip>
                ))}
              </div>
            </div>

            {/* 3. Từ loại */}
            <div className="space-y-2 border-t border-line pt-5">
              <p className="text-sm font-medium text-fg">Từ loại</p>
              <div className="flex flex-wrap gap-2">
                {WORD_TYPES.map((wt) => (
                  <Chip
                    key={wt.id}
                    selected={config.wordType === wt.id}
                    onClick={() => setConfig({ ...config, wordType: wt.id })}
                  >
                    {wt.label}
                  </Chip>
                ))}
              </div>
            </div>

            {/* 4. Phạm vi câu hỏi */}
            <div className="space-y-3 border-t border-line pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-fg">Phạm vi câu hỏi</p>
                <div className="flex gap-1.5">
                  <Chip
                    selected={config.rangeType === 'fixed'}
                    onClick={() => setConfig({ ...config, rangeType: 'fixed' })}
                  >
                    Cố định
                  </Chip>
                  <Chip
                    selected={config.rangeType === 'custom'}
                    onClick={() => setConfig({ ...config, rangeType: 'custom' })}
                  >
                    Tùy chỉnh
                  </Chip>
                </div>
              </div>

              {config.rangeType === 'fixed' ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {QUESTION_COUNTS.map((count) => (
                    <Chip
                      key={count}
                      selected={config.questionCount === count}
                      onClick={() => setConfig({ ...config, questionCount: count })}
                      className="justify-center"
                    >
                      {count === 'all' ? 'Tất cả' : `${count} câu`}
                    </Chip>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 rounded-xl border border-line bg-surface-2 p-4 sm:grid-cols-2">
                  <Field label="STT Bắt đầu" htmlFor="range-start">
                    <Input
                      id="range-start"
                      type="number"
                      min={1}
                      max={Math.max(1, currentTotalWords - 1)}
                      value={config.customRange.start}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          customRange: { ...config.customRange, start: Number(e.target.value) },
                        })
                      }
                    />
                  </Field>
                  <Field label="STT Kết thúc" htmlFor="range-end">
                    <Input
                      id="range-end"
                      type="number"
                      min={2}
                      max={currentTotalWords}
                      value={config.customRange.end}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          customRange: { ...config.customRange, end: Number(e.target.value) },
                        })
                      }
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <CustomDataImport
              onDataImported={(data) => {
                setCustomWords(data.vocabularies);
                setError(null);
              }}
            />
            {customWords.length > 0 && (
              <Notice tone="success" className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 font-medium">
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                  Đã tạo danh sách {customWords.length} từ vựng
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<Trash2 className="size-3.5" aria-hidden />}
                  onClick={() => setCustomWords([])}
                >
                  Xóa dữ liệu
                </Button>
              </Notice>
            )}
          </div>
        )}

        {(tab === 'system' || customWords.length > 0) && (
          <div className="space-y-4 border-t border-line pt-5">
            <Switch
              checked={config.shuffleQuestions}
              onChange={(checked) => setConfig({ ...config, shuffleQuestions: checked })}
              label="Đảo vị trí câu hỏi"
            />
            <Switch
              checked={config.shuffleAnswers}
              onChange={(checked) => setConfig({ ...config, shuffleAnswers: checked })}
              label="Đảo vị trí đáp án"
            />
            <Switch
              checked={config.showHanVietHint}
              onChange={(checked) => setConfig({ ...config, showHanVietHint: checked })}
              label="Hiển thị gợi ý Hán Việt"
              description="Sẽ hiển thị bên dưới câu hỏi Kanji"
            />
          </div>
        )}

        {error && <Notice tone="danger">{error}</Notice>}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          leftIcon={<Play className="size-4" aria-hidden />}
          onClick={handleStart}
        >
          Bắt đầu Quiz
        </Button>
      </Card>
    </PageContainer>
  );
};
