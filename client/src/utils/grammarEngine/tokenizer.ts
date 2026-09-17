export interface SentenceToken {
  id: string;
  text: string;
  type: 'vocabulary' | 'particle' | 'grammar' | 'conjugation' | 'auxiliary' | 'punctuation' | 'other';
  sourceVocabularyId?: string;
  sourceGrammarId?: string;
  originalIndex: number;
}

export interface TokenizerOptions {
  splitGrammarParticle?: boolean;
  splitParticles?: boolean;
  grammarKeywords?: string[];
}

export function tokenizeJapanese(sentence: string, options?: TokenizerOptions): SentenceToken[] {
  const opts = {
    splitGrammarParticle: true,
    splitParticles: true,
    grammarKeywords: [],
    ...options
  };

  const PARTICLES = [
    'からは', 'までは', 'には', 'では', 'へは', 'でも', 'とも',
    'から', 'まで', 'より', 'しか', 'だけ', 'など', 'ばかり',
    'は', 'が', 'を', 'に', 'で', 'へ', 'と', 'や', 'も', 'の', 'か', 'ね', 'よ'
  ];

  const PUNCTUATIONS = ['、', '。', '？', '！', '「', '」', '（', '）', '『', '』'];
  
  // Sort grammar keywords from longest to shortest to match multi-char grammar first
  const grammarWords = [...(opts.grammarKeywords || [])].sort((a, b) => b.length - a.length);

  const tokens: SentenceToken[] = [];
  let currentWord = '';
  let index = 0;

  const pushCurrentWord = () => {
    if (currentWord) {
      tokens.push({
        id: `t_${index}`,
        text: currentWord,
        type: 'vocabulary',
        originalIndex: index++
      });
      currentWord = '';
    }
  };

  for (let i = 0; i < sentence.length; ) {
    let matchedPunctuation = '';
    for (const p of PUNCTUATIONS) {
      if (sentence.startsWith(p, i)) {
        matchedPunctuation = p;
        break;
      }
    }

    if (matchedPunctuation) {
      pushCurrentWord();
      tokens.push({
        id: `t_${index}`,
        text: matchedPunctuation,
        type: 'punctuation',
        originalIndex: index++
      });
      i += matchedPunctuation.length;
      continue;
    }

    let matchedGrammar = '';
    for (const g of grammarWords) {
      if (sentence.startsWith(g, i)) {
        matchedGrammar = g;
        break;
      }
    }

    if (matchedGrammar && !opts.splitGrammarParticle) {
      pushCurrentWord();
      tokens.push({
        id: `t_${index}`,
        text: matchedGrammar,
        type: 'grammar',
        originalIndex: index++
      });
      i += matchedGrammar.length;
      continue;
    }

    let matchedParticle = '';
    if (opts.splitParticles) {
      for (const p of PARTICLES) {
        if (sentence.startsWith(p, i)) {
          matchedParticle = p;
          break;
        }
      }
    }

    if (matchedParticle) {
      pushCurrentWord();
      tokens.push({
        id: `t_${index}`,
        text: matchedParticle,
        type: 'particle',
        originalIndex: index++
      });
      i += matchedParticle.length;
      continue;
    }

    // Nothing matched, it's part of a word
    currentWord += sentence[i];
    i++;
  }

  pushCurrentWord();

  return tokens;
}
