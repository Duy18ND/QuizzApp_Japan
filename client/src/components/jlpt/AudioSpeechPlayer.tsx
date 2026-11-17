import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';
import { Button, Chip, Notice, Switch } from '../ui';
import type { JLPTListeningLine } from '../../data/jlpt/jlptDataset';
import { FuriganaText } from './FuriganaText';

interface AudioSpeechPlayerProps {
  dialogue: JLPTListeningLine[];
}

export const AudioSpeechPlayer: React.FC<AudioSpeechPlayerProps> = ({ dialogue }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeLineIdx, setActiveLineIdx] = useState<number | null>(null);
  const [rate, setRate] = useState<number>(1.0);
  const cancelledRef = useRef(false);

  const supportsSpeech =
    typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

  const stopAudio = useCallback(() => {
    cancelledRef.current = true;
    if (supportsSpeech) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setActiveLineIdx(null);
  }, [supportsSpeech]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (supportsSpeech) {
        window.speechSynthesis.cancel();
      }
    };
  }, [supportsSpeech]);

  const handlePlay = () => {
    if (!supportsSpeech) return;
    if (isPlaying) {
      stopAudio();
      return;
    }

    window.speechSynthesis.cancel();
    cancelledRef.current = false;
    setIsPlaying(true);

    const speakLine = (idx: number) => {
      if (cancelledRef.current || idx >= dialogue.length) {
        setIsPlaying(false);
        setActiveLineIdx(null);
        return;
      }

      setActiveLineIdx(idx);
      const line = dialogue[idx];
      const utterance = new SpeechSynthesisUtterance(line.plainText);
      utterance.lang = 'ja-JP';
      utterance.rate = rate;
      utterance.pitch = line.speaker.includes('女') || line.speaker.includes('先生') ? 1.08 : 0.95;

      utterance.onend = () => {
        if (!cancelledRef.current) {
          speakLine(idx + 1);
        }
      };
      utterance.onerror = () => {
        setIsPlaying(false);
        setActiveLineIdx(null);
      };

      window.speechSynthesis.speak(utterance);
    };

    speakLine(0);
  };

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant={isPlaying ? 'secondary' : 'primary'}
            size="md"
            leftIcon={isPlaying ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
            onClick={handlePlay}
            disabled={!supportsSpeech}
          >
            {isPlaying ? 'Dừng phát' : 'Phát hội thoại'}
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted">
            <Volume2 className="size-4 text-primary-fg" aria-hidden />
            <span>
              {isPlaying && activeLineIdx !== null
                ? `Đang đọc: ${dialogue[activeLineIdx]?.speaker || ''} (${activeLineIdx + 1}/${dialogue.length})`
                : `${dialogue.length} lượt thoại tiếng Nhật`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted">Tốc độ:</span>
          <Chip selected={rate === 0.85} onClick={() => setRate(0.85)} disabled={isPlaying}>
            0.85x
          </Chip>
          <Chip selected={rate === 1.0} onClick={() => setRate(1.0)} disabled={isPlaying}>
            1.0x
          </Chip>
        </div>
      </div>

      {!supportsSpeech && (
        <Notice tone="warning" title="Trình duyệt chưa hỗ trợ giọng đọc tự động">
          Bạn vẫn có thể mở Transcript bên dưới để đọc nội dung hội thoại và làm bài tập bình thường.
        </Notice>
      )}
    </div>
  );
};

interface ListeningTranscriptPanelProps {
  dialogue: JLPTListeningLine[];
  translation: string;
  showTranslation: boolean;
  showFurigana: boolean;
  onToggleFurigana: (value: boolean) => void;
}

export const ListeningTranscriptPanel: React.FC<ListeningTranscriptPanelProps> = ({
  dialogue,
  translation,
  showTranslation,
  showFurigana,
  onToggleFurigana,
}) => (
  <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-4">
    <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
      <span className="text-xs font-semibold tracking-wide text-primary-fg uppercase">
        Transcript hội thoại
      </span>
      <Switch checked={showFurigana} onChange={onToggleFurigana} label="Furigana" />
    </div>
    <div className="space-y-2 text-base leading-loose">
      {dialogue.map((line, idx) => (
        <p key={idx}>
          <span className="mr-2 font-semibold text-primary-fg">{line.speaker}:</span>
          <FuriganaText segments={line.segments} showFurigana={showFurigana} />
        </p>
      ))}
    </div>
    {showTranslation && (
      <p className="border-t border-line pt-2 text-sm leading-relaxed whitespace-pre-line text-muted">
        {translation}
      </p>
    )}
  </div>
);
