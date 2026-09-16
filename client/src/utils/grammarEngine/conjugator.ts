export type VerbGroup = 1 | 2 | 3;

/**
 * Determines the verb group based on the dictionary form (hiragana).
 * Note: This is a fallback heuristic. Some group 1 verbs end in -eru/-iru (e.g., 帰る, 切る).
 * It's always better to provide the verbGroup explicitly.
 */
export const guessVerbGroup = (hiragana: string, kanji?: string): VerbGroup => {
  if (hiragana === 'する' || kanji === '勉強する' || hiragana.endsWith('する')) {
    return 3;
  }
  if (hiragana === 'くる' || kanji === '来る') {
    return 3;
  }
  
  // Basic heuristic for Group 2: ends in 'eru' or 'iru'
  // using romaji or just checking the character before 'る'
  if (hiragana.endsWith('る')) {
    const preRuChar = hiragana.charAt(hiragana.length - 2);
    const eRow = ['え', 'け', 'せ', 'て', 'ね', 'へ', 'め', 'れ', 'げ', 'ぜ', 'で', 'べ', 'ぺ'];
    const iRow = ['い', 'き', 'し', 'ち', 'に', 'ひ', 'み', 'り', 'ぎ', 'じ', 'ぢ', 'び', 'ぴ'];
    
    // Some common exceptions that are actually Group 1
    const exceptions = ['かえる', 'はいる', 'はしる', 'きる', 'しる', 'しゃべる']; 
    if (exceptions.includes(hiragana)) {
      return 1;
    }

    if (eRow.includes(preRuChar) || iRow.includes(preRuChar)) {
      return 2;
    }
  }
  
  return 1;
};

const gojuonToARow = (char: string): string => {
  const map: Record<string, string> = {
    'う': 'わ', // special case for verbs ending in う
    'く': 'か', 'ぐ': 'が',
    'す': 'さ',
    'つ': 'た',
    'ぬ': 'な',
    'ふ': 'は', 'ぶ': 'ば', 'ぷ': 'ぱ',
    'む': 'ま',
    'る': 'ら'
  };
  return map[char] || char;
};


const gojuonToIRow = (char: string): string => {
  const map: Record<string, string> = {
    'う': 'い',
    'く': 'き', 'ぐ': 'ぎ',
    'す': 'し',
    'つ': 'ち',
    'ぬ': 'に',
    'ふ': 'ひ', 'ぶ': 'び', 'ぷ': 'ぴ',
    'む': 'み',
    'る': 'り'
  };
  return map[char] || char;
};


export const conjugatePassive = (dictForm: string, group?: VerbGroup): string => {
  const g = group || guessVerbGroup(dictForm);
  
  if (g === 3) {
    if (dictForm === 'する') return 'される';
    if (dictForm === 'くる') return 'こられる';
    if (dictForm.endsWith('する')) return dictForm.slice(0, -2) + 'される';
    return dictForm; // fallback
  }
  
  if (g === 2) {
    if (dictForm.endsWith('る')) {
      return dictForm.slice(0, -1) + 'られる';
    }
  }
  
  if (g === 1) {
    const lastChar = dictForm.slice(-1);
    const stem = dictForm.slice(0, -1);
    return stem + gojuonToARow(lastChar) + 'れる';
  }
  
  return dictForm;
};

export const conjugateCausative = (dictForm: string, group?: VerbGroup): string => {
  const g = group || guessVerbGroup(dictForm);
  
  if (g === 3) {
    if (dictForm === 'する') return 'させる';
    if (dictForm === 'くる') return 'こさせる';
    if (dictForm.endsWith('する')) return dictForm.slice(0, -2) + 'させる';
    return dictForm;
  }
  
  if (g === 2) {
    if (dictForm.endsWith('る')) {
      return dictForm.slice(0, -1) + 'させる';
    }
  }
  
  if (g === 1) {
    const lastChar = dictForm.slice(-1);
    const stem = dictForm.slice(0, -1);
    return stem + gojuonToARow(lastChar) + 'せる';
  }
  
  return dictForm;
};

export const conjugateNagara = (dictForm: string, group?: VerbGroup): string => {
  const g = group || guessVerbGroup(dictForm);
  
  // Stem (Masu stem) + ながら
  if (g === 3) {
    if (dictForm === 'する') return 'しながら';
    if (dictForm === 'くる') return 'きながら';
    if (dictForm.endsWith('する')) return dictForm.slice(0, -2) + 'しながら';
    return dictForm;
  }
  
  if (g === 2) {
    if (dictForm.endsWith('る')) {
      return dictForm.slice(0, -1) + 'ながら';
    }
  }
  
  if (g === 1) {
    const lastChar = dictForm.slice(-1);
    const stem = dictForm.slice(0, -1);
    return stem + gojuonToIRow(lastChar) + 'ながら';
  }
  
  return dictForm;
};

export const conjugateTari = (dictForm: string, group?: VerbGroup): string => {
  // Uses Ta-form + り
  const taForm = conjugateTaForm(dictForm, group);
  return taForm + 'り';
};

const getTeTaStem = (dictForm: string): { stem: string, suffix: string } => {
  const lastChar = dictForm.slice(-1);
  const base = dictForm.slice(0, -1);
  
  if (['う', 'つ', 'る'].includes(lastChar)) return { stem: base, suffix: 'っ' };
  if (['む', 'ぶ', 'ぬ'].includes(lastChar)) return { stem: base, suffix: 'ん' };
  if (['く'].includes(lastChar)) {
    if (dictForm === 'いく') return { stem: 'い', suffix: 'っ' }; // iku exception
    return { stem: base, suffix: 'い' };
  }
  if (['ぐ'].includes(lastChar)) return { stem: base, suffix: 'い' }; // uses special ending later
  if (['す'].includes(lastChar)) return { stem: base, suffix: 'し' };
  
  return { stem: base, suffix: lastChar };
};

export const conjugateTeForm = (dictForm: string, group?: VerbGroup): string => {
  const g = group || guessVerbGroup(dictForm);
  
  if (g === 3) {
    if (dictForm === 'する') return 'して';
    if (dictForm === 'くる') return 'きて';
    if (dictForm.endsWith('する')) return dictForm.slice(0, -2) + 'して';
  }
  
  if (g === 2) {
    return dictForm.slice(0, -1) + 'て';
  }
  
  if (g === 1) {
    const lastChar = dictForm.slice(-1);
    const { stem, suffix } = getTeTaStem(dictForm);
    const ending = ['ぐ', 'ぬ', 'ぶ', 'む'].includes(lastChar) ? 'で' : 'て';
    return stem + suffix + ending;
  }
  
  return dictForm;
};

export const conjugateTaForm = (dictForm: string, group?: VerbGroup): string => {
  const teForm = conjugateTeForm(dictForm, group);
  if (teForm.endsWith('で')) return teForm.slice(0, -1) + 'だ';
  if (teForm.endsWith('て')) return teForm.slice(0, -1) + 'た';
  return dictForm;
};

export const conjugateNegative = (dictForm: string, group?: VerbGroup): string => {
  const g = group || guessVerbGroup(dictForm);
  
  if (g === 3) {
    if (dictForm === 'する') return 'しない';
    if (dictForm === 'くる') return 'こない';
    if (dictForm.endsWith('する')) return dictForm.slice(0, -2) + 'しない';
    return dictForm;
  }
  
  if (g === 2) {
    if (dictForm.endsWith('る')) {
      return dictForm.slice(0, -1) + 'ない';
    }
  }
  
  if (g === 1) {
    if (dictForm === 'ある') return 'ない'; // exception
    const lastChar = dictForm.slice(-1);
    const stem = dictForm.slice(0, -1);
    return stem + gojuonToARow(lastChar) + 'ない';
  }
  
  return dictForm;
};

export const conjugateVerb = (dictForm: string, type: string, group?: VerbGroup): string => {
  switch (type) {
    case 'passive': return conjugatePassive(dictForm, group);
    case 'causative': return conjugateCausative(dictForm, group);
    case 'nagara': return conjugateNagara(dictForm, group);
    case 'tari': return conjugateTari(dictForm, group);
    case 'te': return conjugateTeForm(dictForm, group);
    case 'ta': return conjugateTaForm(dictForm, group);
    case 'negative': return conjugateNegative(dictForm, group);
    case 'dictionary': return dictForm;
    default: return dictForm;
  }
};
