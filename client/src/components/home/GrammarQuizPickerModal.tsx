import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Button, Chip, Field, Modal, Select } from '../ui';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { getLiveGrammarBooks } from '../../services/curriculumStore';

const LEVELS = ['N5', 'N4', 'N3'] as const;
type PickerLevel = (typeof LEVELS)[number];
const COUNTS = [6, 12, 20];

interface GrammarQuizPickerModalProps {
  open: boolean;
  defaultLevel?: string | null;
  onClose: () => void;
}

/** Pick level → lesson → grammar point, then start the situation quiz. */
export const GrammarQuizPickerModal: React.FC<GrammarQuizPickerModalProps> = ({
  open,
  defaultLevel,
  onClose,
}) => {
  const navigate = useNavigate();
  const snapshot = useCurriculumSnapshot();
  const [pickedLevel, setLevel] = useState<PickerLevel | null>(null);
  const [chapterId, setChapterId] = useState('');
  const [grammarId, setGrammarId] = useState('');
  const [count, setCount] = useState(12);

  const level: PickerLevel =
    pickedLevel ?? (LEVELS.find((l) => l === defaultLevel) || 'N5');
  const book = getLiveGrammarBooks(snapshot).find((b) => b.level === level);
  const chapters = (book?.chapters ?? []).filter((c) => c.grammars.length > 0);
  const chapter = chapters.find((c) => c.id === chapterId) ?? chapters[0];
  const grammar = chapter?.grammars.find((g) => g.id === grammarId);

  const start = () => {
    if (!book || !chapter) return;
    const base = `/grammar/${book.id}/${chapter.id}/practice`;
    onClose();
    navigate(`${base}${grammar ? `/${grammar.id}` : ''}?mode=scenario&count=${count}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Quiz ngữ pháp"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!chapter}
            leftIcon={<Play className="size-4" aria-hidden />}
            onClick={start}
          >
            Bắt đầu
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-1.5" role="group" aria-label="Trình độ">
          {LEVELS.map((l) => (
            <Chip
              key={l}
              selected={level === l}
              className="flex-1 justify-center"
              onClick={() => {
                setLevel(l);
                setChapterId('');
                setGrammarId('');
              }}
            >
              {l}
            </Chip>
          ))}
        </div>

        <Field label="Bài" htmlFor="gq-chapter">
          <Select
            id="gq-chapter"
            value={chapter?.id ?? ''}
            onChange={(e) => {
              setChapterId(e.target.value);
              setGrammarId('');
            }}
          >
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Mẫu ngữ pháp" htmlFor="gq-grammar">
          <Select id="gq-grammar" value={grammar?.id ?? ''} onChange={(e) => setGrammarId(e.target.value)}>
            <option value="">Cả bài ({chapter?.grammars.length ?? 0} mẫu)</option>
            {(chapter?.grammars ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="space-y-1.5">
          <span className="text-sm font-semibold text-fg">Số câu tối đa</span>
          <div className="flex gap-1.5">
            {COUNTS.map((n) => (
              <Chip key={n} selected={count === n} className="flex-1 justify-center" onClick={() => setCount(n)}>
                {n}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
