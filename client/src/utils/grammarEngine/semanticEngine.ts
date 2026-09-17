import type { GrammarScenario, SemanticRelation, SmartGrammarRule, SentenceValidationResult, SemanticSignature } from '../../types/grammarEngine';
import type { GrammarVocabulary } from './vocabularyAdapter';
import { verbTopics } from '../../data/grammar/grammarConfig';

export class SemanticEngine {
  
  static validateLogicalRelation(left: GrammarVocabulary, right: GrammarVocabulary, _relation: SemanticRelation): boolean {
    const leftName = left.kanji || left.hiragana;
    const rightName = right.kanji || right.hiragana;
    
    const leftTopics = verbTopics[leftName] || [];
    const rightTopics = verbTopics[rightName] || [];
    
    const commonTopics = leftTopics.filter(t => rightTopics.includes(t));
    if (commonTopics.length > 0) return true;
    if (left.semanticRoles?.includes('preparation')) return true;
    
    // Fallback: If we have no metadata for these verbs, allow them to avoid blocking generation
    if (leftTopics.length === 0 && rightTopics.length === 0) return true;
    
    return false;
  }

  static createSignature(vocabularies: Record<string, GrammarVocabulary>, grammarId: string, templateId: string): SemanticSignature {
    // Try to heuristically find the main roles from slot names or vocabulary tags
    const findVocab = (roleKeyword: string) => {
      // First check if slot name contains keyword
      for (const [slot, vocab] of Object.entries(vocabularies)) {
        if (slot.toLowerCase().includes(roleKeyword)) return vocab.kanji;
      }
      // Then check if any vocab has the tag
      for (const vocab of Object.values(vocabularies)) {
        if (vocab.tags.includes(roleKeyword) || vocab.semanticRoles?.includes(roleKeyword)) return vocab.kanji;
      }
      return undefined;
    };

    return {
      grammarId,
      templateId,
      subject: findVocab('person') || findVocab('subject'),
      verb: findVocab('verb') || findVocab('action') || vocabularies['A']?.kanji || vocabularies['B']?.kanji,
      object: findVocab('object'),
      place: findVocab('place')
    };
  }

  static getSignatureString(sig: SemanticSignature): string {
    return `${sig.grammarId}|${sig.templateId}|S:${sig.subject || ''}|V:${sig.verb || ''}|O:${sig.object || ''}|P:${sig.place || ''}`;
  }

  static validateSentence(
    vocabularies: Record<string, GrammarVocabulary>, 
    scenario?: GrammarScenario
  ): SentenceValidationResult {
    
    const reasons: string[] = [];
    const verbs = Object.values(vocabularies).filter(v => v.wordType === 'verb');

    // 1. Strict Object-Verb Collocation Check
    for (const [slotName, noun] of Object.entries(vocabularies)) {
      if (noun.wordType === 'noun') {
        const nounName = noun.kanji || noun.hiragana;
        // Check if this noun acts as an object for any verb in the sentence
        if (slotName.toLowerCase().includes('object') || noun.tags.includes('object') || noun.tags.includes('food')) {
           for (const verb of verbs) {
             if (verb.compatibleObjects && verb.compatibleObjects.length > 0) {
               if (!verb.compatibleObjects.includes(nounName)) {
                 reasons.push(`[Collocation Error] Noun '${nounName}' is not a compatible object for Verb '${verb.kanji || verb.hiragana}'`);
               }
             }
           }
        }
        
        // Subject-Verb Check
        if (slotName.toLowerCase().includes('person') || slotName.toLowerCase().includes('subject')) {
           for (const verb of verbs) {
             if (verb.compatibleSubjects && verb.compatibleSubjects.length > 0) {
               if (!verb.compatibleSubjects.includes(nounName)) {
                 reasons.push(`[Collocation Error] Noun '${nounName}' is not a compatible subject for Verb '${verb.kanji || verb.hiragana}'`);
               }
             }
           }
        }

        // Place-Verb Check
        if (slotName.toLowerCase().includes('place')) {
           for (const verb of verbs) {
             if (verb.compatiblePlaces && verb.compatiblePlaces.length > 0) {
               if (!verb.compatiblePlaces.includes(nounName)) {
                 reasons.push(`[Collocation Error] Place '${nounName}' is not a compatible place for Verb '${verb.kanji || verb.hiragana}'`);
               }
             }
           }
        }
      }
    }

    // 2. Scenario Logical Relations (e.g. A てからでないと B)
    if (scenario && scenario.validRelations.length > 0) {
      if (vocabularies['A'] && vocabularies['B']) {
        const a = vocabularies['A'];
        const b = vocabularies['B'];
        if (a.wordType === 'verb' && b.wordType === 'verb') {
          const relation = scenario.validRelations[0];
          if (!this.validateLogicalRelation(a, b, relation)) {
             reasons.push(`[Semantic Error] Invalid logical relation between '${a.kanji}' and '${b.kanji}' for scenario '${scenario.id}'`);
          }
        }
      }
    }

    return {
      valid: reasons.length === 0,
      reasons
    };
  }

  static getValidScenarios(_rule: SmartGrammarRule, allScenarios: GrammarScenario[], topic?: string): GrammarScenario[] {
    if (topic) {
       return allScenarios.filter(s => s.topic === topic || s.vocabularyTags.includes(topic));
    }
    return allScenarios;
  }
}
