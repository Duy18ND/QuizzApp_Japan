export interface GrammarVocabulary {
  id: string;
  kanji: string;
  hiragana: string;
  meaning: string;
  wordType: 'verb' | 'noun' | 'i-adjective' | 'na-adjective' | 'adverb' | 'other';
  verbGroup?: 1 | 2 | 3;
  tags: string[];
  semanticRoles?: string[];
  topics?: string[];
  compatibleVerbs?: string[];
  compatibleObjects?: string[];
  compatibleSubjects?: string[];
  compatiblePlaces?: string[];
  prerequisiteRoles?: string[];
  resultRoles?: string[];
}

// Exception lists for verbs that look like group 2 (ends in る and sound before is i/e) but are actually group 1.
const GROUP_1_EXCEPTIONS = [
  '帰る', 'かえる', '入る', 'はいる', '走る', 'はしる', '切る', 'きる', '知る', 'しる',
  '要る', 'いる', '限る', 'かぎる', '蹴る', 'ける', '滑る', 'すべる', '握る', 'にぎる',
  '練る', 'ねる', '交じる', 'まじる', '嘲る', 'あざける', '覆る', 'くつがえる',
  '遮る', 'さえぎる', '罵る', 'ののしる', '捻る', 'ひねる', '翻る', 'ひるがえる',
  '滅入る', 'めいる', '蘇る', 'よみがえる'
];

export const guessVerbGroup = (hiragana: string, kanji: string): 1 | 2 | 3 | undefined => {
  if (hiragana === 'する' || kanji.endsWith('する')) {
    return 3;
  }
  if (hiragana === 'くる' || kanji === '来る') {
    return 3;
  }

  // Check exceptions first (Group 1 verbs that look like Group 2)
  if (GROUP_1_EXCEPTIONS.includes(kanji) || GROUP_1_EXCEPTIONS.includes(hiragana)) {
    return 1;
  }

  if (hiragana.endsWith('る')) {
    // Check the sound before る. If it ends in i or e (e.g. べる, みる), it's usually group 2.
    // Hiragana ending in -i or -e before ru
    const iRow = ['い', 'き', 'し', 'ち', 'に', 'ひ', 'み', 'り', 'ぎ', 'じ', 'ぢ', 'び', 'ぴ'];
    const eRow = ['え', 'け', 'せ', 'て', 'ね', 'へ', 'め', 'れ', 'げ', 'ぜ', 'で', 'べ', 'ぺ'];
    
    if (hiragana.length > 1) {
      const charBeforeRu = hiragana[hiragana.length - 2];
      if (iRow.includes(charBeforeRu) || eRow.includes(charBeforeRu)) {
        return 2;
      }
    }
  }

  // If it ends in u, tsu, ru (not i/e before), mu, bu, nu, ku, gu, su -> Group 1
  return 1;
};

const mapWordType = (originalType: string): GrammarVocabulary['wordType'] => {
  if (originalType.toLowerCase().includes('động từ')) return 'verb';
  if (originalType.toLowerCase().includes('danh từ')) return 'noun';
  if (originalType.toLowerCase().includes('tính từ đuôi i')) return 'i-adjective';
  if (originalType.toLowerCase().includes('tính từ đuôi na')) return 'na-adjective';
  if (originalType.toLowerCase().includes('trạng từ')) return 'adverb';
  return 'other';
};

// Basic heuristic tagger
const assignTags = (item: any): string[] => {
  const tags: string[] = [];
  const meaning = (item.meaning || '').toLowerCase();
  
  if (meaning.includes('người') || meaning.includes('nhân') || meaning.includes('bạn') || meaning.includes('sếp') || meaning.includes('đàn ông') || meaning.includes('phụ nữ')) {
    tags.push('person');
  }
  if (meaning.includes('nhà') || meaning.includes('quê') || meaning.includes('công ty')) {
    tags.push('place');
  }
  if (meaning.includes('trường') || meaning.includes('giáo viên') || meaning.includes('học sinh') || meaning.includes('bài tập')) {
    tags.push('place', 'school', 'study');
  }
  if (meaning.includes('bánh') || meaning.includes('cơm') || meaning.includes('đồ ăn') || meaning.includes('thịt')) {
    tags.push('object', 'food');
  }
  if (meaning.includes('xe') || meaning.includes('tàu') || meaning.includes('máy bay')) {
    tags.push('vehicle', 'transport');
  }
  if (meaning.includes('ngày') || meaning.includes('năm') || meaning.includes('tuổi') || meaning.includes('tháng') || meaning.includes('giờ')) {
    tags.push('time');
  }
  if (meaning.includes('ăn') || meaning.includes('uống') || meaning.includes('nấu')) {
    tags.push('action', 'food-action', 'task');
  }
  if (meaning.includes('mua') || meaning.includes('bán') || meaning.includes('viết') || meaning.includes('đọc')) {
    tags.push('action', 'task');
  }
  if (mapWordType(item.wordType) === 'verb') {
    tags.push('verb');
  }
  if (mapWordType(item.wordType) === 'noun') {
    tags.push('noun');
  }
  
  return tags;
};

import { verbCollocations, subjectCollocations, placeCollocations } from '../../data/grammar/grammarConfig';

export const adaptVocabulary = (rawVocabulary: any[]): GrammarVocabulary[] => {
  return rawVocabulary.map(item => {
    const wordType = mapWordType(item.wordType);
    const kanji = item.kanji || item.hiragana;
    
    // Auto-resolve compatible relations based on global dictionary
    const autoCompatibleObjects: string[] = verbCollocations[kanji] || [];
    const autoCompatibleSubjects: string[] = subjectCollocations[kanji] || [];
    const autoCompatiblePlaces: string[] = placeCollocations[kanji] || [];
    
    const autoCompatibleVerbs: string[] = [];
    
    if (wordType === 'noun') {
       // Reverse lookup: which verbs can take this noun as an object?
       for (const [v, objects] of Object.entries(verbCollocations)) {
          if (objects.includes(kanji) || objects.includes(item.hiragana)) {
             autoCompatibleVerbs.push(v);
          }
       }
       // Reverse lookup for subject and place can also be added if needed
    }

    const adapted: GrammarVocabulary = {
      id: item.id?.toString() || kanji,
      kanji,
      hiragana: item.hiragana,
      meaning: item.meaning,
      wordType,
      tags: Array.from(new Set([...assignTags(item), ...(item.tags || [])])),
      semanticRoles: item.semanticRoles || [],
      topics: item.topics || [],
      compatibleVerbs: Array.from(new Set([...(item.compatibleVerbs || []), ...autoCompatibleVerbs])),
      compatibleObjects: Array.from(new Set([...(item.compatibleObjects || []), ...autoCompatibleObjects])),
      compatibleSubjects: Array.from(new Set([...(item.compatibleSubjects || []), ...autoCompatibleSubjects])),
      compatiblePlaces: Array.from(new Set([...(item.compatiblePlaces || []), ...autoCompatiblePlaces])),
      prerequisiteRoles: item.prerequisiteRoles || [],
      resultRoles: item.resultRoles || []
    };

    if (wordType === 'verb') {
      adapted.verbGroup = guessVerbGroup(item.hiragana, item.kanji);
    }

    return adapted;
  });
};
