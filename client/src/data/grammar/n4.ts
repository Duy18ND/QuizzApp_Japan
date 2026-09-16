import type { GrammarRule } from '../../types/grammar';

export const n4GrammarData: GrammarRule[] = [
  {
    id: 'N4-PASSIVE',
    name: '受身形',
    hiragana: 'うけみけい',
    meaning: 'Thể bị động (bị, được)',
    level: 'N4',
    category: 'conjugation',
    target: 'verb',
    transformation: {
      type: 'passive',
      rules: {
        group1: 'u_to_a_plus_reru',
        group2: 'remove_ru_plus_rareru',
        group3: { 'する': 'される', '来る': 'こられる' }
      }
    },
    practiceTypes: [
      'recognition',
      'conjugation',
      'sentence_transformation',
      'word_order',
      'translation',
      'free_writing',
      'mix_review'
    ],
    example: '先生が私をほめました。 → 私は先生にほめられました。',
    exampleMeaning: 'Giáo viên đã khen tôi. → Tôi đã được giáo viên khen.'
  },
  {
    id: 'N4-NAGARA',
    name: '〜ながら',
    hiragana: '〜ながら',
    meaning: 'Vừa ... vừa ...',
    level: 'N4',
    category: 'sentence_pattern',
    target: 'verb',
    transformation: {
      type: 'nagara',
      rules: {
        all_groups: 'masu_stem_plus_nagara'
      }
    },
    practiceTypes: [
      'recognition',
      'conjugation',
      'word_order',
      'fill_blank',
      'translation',
      'free_writing'
    ],
    example: '音楽を聞きながら、勉強します。',
    exampleMeaning: 'Vừa nghe nhạc vừa học bài.'
  },
  {
    id: 'N4-TARI',
    name: '〜たり〜たりする',
    hiragana: '〜たり〜たりする',
    meaning: 'Nào là ... nào là ... / Lúc thì ... lúc thì ...',
    level: 'N4',
    category: 'sentence_pattern',
    target: 'verb',
    transformation: {
      type: 'tari',
      rules: {
        all_groups: 'ta_form_plus_ri'
      }
    },
    practiceTypes: [
      'recognition',
      'conjugation',
      'word_order',
      'translation',
      'free_writing'
    ],
    example: '休みの日は、本を読んだり、映画を見たりします。',
    exampleMeaning: 'Vào ngày nghỉ, tôi lúc thì đọc sách, lúc thì xem phim.'
  }
];
