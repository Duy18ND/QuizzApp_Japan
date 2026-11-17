import { createContext, useContext } from 'react';
import type { PassageVocabNote } from '../../utils/japaneseLookup';

export interface LookupTarget {
  text: string;
  rect: DOMRect;
  rubyMap?: Record<string, string>;
  sentenceText?: string;
  sentenceTranslation?: string;
  sentenceRubyMap?: Record<string, string>;
  passageVocab?: PassageVocabNote[];
  activeTokenId?: string;
  activeSentenceId?: string;
  initialScope?: 'phrase' | 'sentence';
}

export interface JapaneseLookupContextValue {
  openLookup: (target: LookupTarget) => void;
  closeLookup: () => void;
  scheduleHoverLookup: (target: LookupTarget, delayMs?: number) => void;
  cancelHoverLookup: () => void;
  activeTokenId: string | null;
  activeSentenceId: string | null;
}

export const JapaneseLookupContext = createContext<JapaneseLookupContextValue | null>(null);

export function useJapaneseLookup(): JapaneseLookupContextValue {
  const ctx = useContext(JapaneseLookupContext);
  if (!ctx) {
    throw new Error('useJapaneseLookup must be used within JapaneseLookupProvider');
  }
  return ctx;
}
