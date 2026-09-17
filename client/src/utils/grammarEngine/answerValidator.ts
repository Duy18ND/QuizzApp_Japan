export interface ValidationResult {
  isCorrect: boolean;
  score?: number; // 0-100 for partial correctness
  feedbackMessage?: string;
}

/**
 * Normalizes Japanese text by converting full-width alphanumeric to half-width,
 * removing trailing punctuation (like 。、. , ! ?), and removing all whitespaces.
 */
export const normalizeJapaneseText = (text: string): string => {
  if (!text) return '';
  
  let normalized = text
    .replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // Full-width to half-width
    .replace(/　/g, ' ') // Full-width space to half-width space
    .replace(/\s+/g, '') // Remove all whitespaces
    .replace(/[。、.,!?！？]$/g, ''); // Remove trailing punctuation
    
  return normalized;
};

/**
 * Validates the user's answer against the correct answer(s).
 */
export const validateAnswer = (
  userAnswer: string,
  correctAnswers: string | string[],
  practiceType: string,
  targetGrammar?: string // e.g. "うちに"
): ValidationResult => {
  if (!userAnswer) {
    return { isCorrect: false, feedbackMessage: 'Vui lòng nhập câu trả lời.' };
  }

  const normalizedUser = normalizeJapaneseText(userAnswer);
  const answers = Array.isArray(correctAnswers) ? correctAnswers : [correctAnswers];
  const normalizedAnswers = answers.map(normalizeJapaneseText);

  // 1. Exact Match
  if (normalizedAnswers.includes(normalizedUser)) {
    return { isCorrect: true, score: 100 };
  }

  // 2. Practice Type Specific Heuristics
  
  // For translation / free writing, allow variations like adding "私" or time words if the core is correct.
  if (practiceType === 'vi_to_ja' || practiceType === 'free_writing' || practiceType === 'sentence_transformation') {
    // Check if the user's answer CONTAINS the core grammar and key components
    // Since we don't have a full NLP parser, we do a substring match of the expected answer within the user's answer
    // OR check if the user's answer contains the expected answer (e.g. user added 昨日, at the beginning)
    
    for (const normAns of normalizedAnswers) {
      if (normalizedUser.includes(normAns) || normAns.includes(normalizedUser)) {
        // If it's very close (length difference is small), accept it.
        const lengthDiff = Math.abs(normalizedUser.length - normAns.length);
        if (lengthDiff <= 4) { // Allow up to 4 characters difference (e.g. 私は, 昨日)
          return { 
            isCorrect: true, 
            score: 90, 
            feedbackMessage: 'Gần chính xác! Câu trả lời của bạn có thể chấp nhận được trong một số ngữ cảnh.' 
          };
        }
      }
    }

    // Advanced: Check for target grammar existence
    if (targetGrammar) {
      const normGrammar = normalizeJapaneseText(targetGrammar);
      if (!normalizedUser.includes(normGrammar)) {
        return { isCorrect: false, feedbackMessage: `Câu của bạn dường như đang thiếu cấu trúc ngữ pháp mục tiêu: ${targetGrammar}` };
      }
    }
  }

  // 3. Typo checks (e.g. mistyping ha as wa, wo as o if typed in romaji but didn't convert correctly)
  // This is a simple heuristic: replace は/わ, を/お and check again
  const relaxedUser = normalizedUser.replace(/わ/g, 'は').replace(/お/g, 'を');
  for (const normAns of normalizedAnswers) {
    const relaxedAns = normAns.replace(/わ/g, 'は').replace(/お/g, 'を');
    if (relaxedUser === relaxedAns) {
      return { 
        isCorrect: true, 
        score: 80, 
        feedbackMessage: 'Chú ý lỗi chính tả trợ từ (は/わ, を/お).' 
      };
    }
  }

  return { isCorrect: false, score: 0 };
};
