import type { SentenceTemplate } from '../../types/grammar';

export const sentenceTemplates: SentenceTemplate[] = [
  {
    id: 'TPL_PASSIVE_1',
    grammarId: 'N4-PASSIVE',
    level: 'N4',
    pattern: '{person}は{agent}に{verbPassive}。',
    slots: [
      { name: 'person', type: 'person', required: true },
      { name: 'agent', type: 'person', required: true },
      { name: 'verbPassive', type: 'verb', required: true }
    ],
    contextTags: ['school', 'work', 'family']
  },
  {
    id: 'TPL_NAGARA_1',
    grammarId: 'N4-NAGARA',
    level: 'N4',
    pattern: '{object}を{verbNagara}、{actionVerb}。',
    slots: [
      { name: 'object', type: 'object', required: true },
      { name: 'verbNagara', type: 'verb', required: true }, // will conjugate to masu stem + nagara
      { name: 'actionVerb', type: 'verb', required: true } // will conjugate to masu form
    ],
    contextTags: ['daily_life', 'school']
  },
  {
    id: 'TPL_TARI_1',
    grammarId: 'N4-TARI',
    level: 'N4',
    pattern: '週末は{verbTari1}、{verbTari2}します。',
    slots: [
      { name: 'verbTari1', type: 'verb', required: true },
      { name: 'verbTari2', type: 'verb', required: true }
    ],
    contextTags: ['daily_life', 'hobby']
  },
  {
    id: 'TPL_SOUDESU_1',
    grammarId: 'N4-SOUDESU',
    level: 'N4',
    pattern: 'この{object}はとても{adjectiveSou}そうです。',
    slots: [
      { name: 'object', type: 'object', required: true },
      { name: 'adjectiveSou', type: 'adjective', required: true } // stem + そうです
    ],
    contextTags: ['shopping', 'daily_life']
  },
  {
    id: 'TPL_NAKEREBANARANAI_1',
    grammarId: 'N4-NAKEREBA',
    level: 'N4',
    pattern: '明日、{place}へ{verbNakereba}。',
    slots: [
      { name: 'place', type: 'place', required: true },
      { name: 'verbNakereba', type: 'verb', required: true }
    ],
    contextTags: ['school', 'work', 'travel']
  }
];

export const getTemplatesForGrammar = (grammarId: string): SentenceTemplate[] => {
  return sentenceTemplates.filter(t => t.grammarId === grammarId);
};
