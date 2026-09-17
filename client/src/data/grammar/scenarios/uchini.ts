import type { GrammarScenario } from '../../../types/grammarEngine';

export const uchiniStateScenarios: GrammarScenario[] = [
  {
    id: 'UCHINI_FOOD_01',
    topic: 'restaurant',
    description: 'Eat food while it is still hot/fresh',
    roles: ['food', 'task'], // using task to represent eating/drinking
    validRelations: [
      { left: 'food', right: 'task' }
    ],
    vocabularyTags: ['restaurant', 'daily_life'],
    templates: ['{A}うちに、{B}。']
  },
  {
    id: 'UCHINI_DAILY_01',
    topic: 'daily_life',
    description: 'Do tasks while you have free time/energy',
    roles: ['free_time', 'task'],
    validRelations: [
      { left: 'free_time', right: 'task' }
    ],
    vocabularyTags: ['daily_life', 'work', 'study'],
    templates: ['{A}うちに、{B}。']
  },
  {
    id: 'UCHINI_WEATHER_01',
    topic: 'other', // weather is not a topic, so use other
    description: 'Go home while it is not raining',
    roles: ['weather', 'travel_action'],
    validRelations: [
      { left: 'weather', right: 'travel_action' }
    ],
    vocabularyTags: ['daily_life'],
    templates: ['{A}うちに、{B}。']
  }
];

export const uchiniChangeScenarios: GrammarScenario[] = [
  {
    id: 'UCHINI_STUDY_01',
    topic: 'study',
    description: 'Improvement happens while studying/practicing',
    roles: ['activity', 'result_action'],
    validRelations: [
      { left: 'activity', right: 'result_action' }
    ],
    vocabularyTags: ['school', 'study'],
    templates: ['{A}うちに、{B}。']
  },
  {
    id: 'UCHINI_RELAX_01',
    topic: 'daily_life',
    description: 'Fall asleep while doing something relaxing',
    roles: ['free_time', 'result_action'],
    validRelations: [
      { left: 'free_time', right: 'result_action' } // watch tv -> sleep
    ],
    vocabularyTags: ['daily_life'],
    templates: ['{A}うちに、{B}。']
  }
];
