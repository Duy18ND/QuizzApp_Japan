import type { GrammarScenario } from '../../../types/grammarEngine';

export const tekaraDenaitoScenarios: GrammarScenario[] = [
  {
    id: 'TEKARA_SCHOOL_01',
    topic: 'school',
    description: 'Homework must be done before playing',
    roles: ['task', 'free_time'],
    validRelations: [
      { left: 'task', right: 'free_time' } // e.g. 宿題をする -> 遊ぶ
    ],
    vocabularyTags: ['school', 'daily_life'],
    templates: ['{A}てからでないと、{B}ない。']
  },
  {
    id: 'TEKARA_WORK_01',
    topic: 'work',
    description: 'Check with boss before starting work',
    roles: ['preparation', 'task'],
    validRelations: [
      { left: 'preparation', right: 'task' } // e.g. 確認する -> 始める
    ],
    vocabularyTags: ['work'],
    templates: ['{A}てからでないと、{B}ない。']
  },
  {
    id: 'TEKARA_TRAVEL_01',
    topic: 'travel',
    description: 'Reservation required before staying at hotel',
    roles: ['preparation', 'travel_action'],
    validRelations: [
      { left: 'preparation', right: 'travel_action' } // e.g. 予約する -> 泊まる
    ],
    vocabularyTags: ['travel', 'restaurant'],
    templates: ['{A}てからでないと、{B}ない。']
  },
  {
    id: 'TEKARA_TRANSPORT_01',
    topic: 'transportation',
    description: 'Buy ticket before riding train',
    roles: ['preparation', 'travel_action'],
    validRelations: [
      { left: 'preparation', right: 'travel_action' } // e.g. 買う -> 乗る
    ],
    vocabularyTags: ['transportation', 'shopping'],
    templates: ['{A}てからでないと、{B}ない。']
  },
  {
    id: 'TEKARA_EVENT_01',
    topic: 'event',
    description: 'Apply before participating',
    roles: ['preparation', 'activity'],
    validRelations: [
      { left: 'preparation', right: 'activity' } // e.g. 申し込む -> 参加する
    ],
    vocabularyTags: ['event', 'school'],
    templates: ['{A}てからでないと、{B}ない。']
  }
];
