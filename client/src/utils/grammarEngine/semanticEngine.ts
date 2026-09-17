import type { GrammarScenario, SemanticRelation, ValidationScore, SmartGrammarRule } from '../../types/grammarEngine';
import type { GrammarVocabulary } from './vocabularyAdapter';
import { verbCollocations, verbTopics } from '../../data/grammar/grammarConfig';

export class SemanticEngine {
  
  static validateCollocation(verb: GrammarVocabulary, obj: GrammarVocabulary): boolean {
    const verbName = verb.kanji || verb.hiragana;
    const allowedObjects = verbCollocations[verbName] || [];
    
    // If no specific collocations are defined for this verb, we might be lenient or strict.
    // For a semantic engine, if it's not defined, it might be safer to reject unless we have a fallback.
    // Let's be somewhat strict: if it's not in the list, we reject if the list exists.
    if (allowedObjects.length > 0) {
      return allowedObjects.includes(obj.kanji) || allowedObjects.includes(obj.hiragana);
    }
    return true; // If no rule, allow by default to prevent blocking all unknown verbs
  }

  static validateLogicalRelation(left: GrammarVocabulary, right: GrammarVocabulary, _relation: SemanticRelation): boolean {
    // Check if the two vocabularies satisfy the semantic relation
    // For example, if relation is prerequisite -> result
    // We check if left has 'prerequisite_candidate' or specific topic matching right's topic
    
    // As a simple heuristic using our defined verbTopics:
    const leftName = left.kanji || left.hiragana;
    const rightName = right.kanji || right.hiragana;
    
    const leftTopics = verbTopics[leftName] || [];
    const rightTopics = verbTopics[rightName] || [];
    
    // They should share at least one topic for a logical sequence in most scenarios
    const commonTopics = leftTopics.filter(t => rightTopics.includes(t));
    
    if (commonTopics.length > 0) return true;
    
    // If no common topics, they might still be valid if left is generic 'preparation'
    if (left.semanticRoles?.includes('preparation')) return true;
    
    // For strictness, if no logic aligns, we return false
    // But since our dictionary is small, we'll allow it if both are defined but no explicit topic match
    // ONLY if the scenario explicitly pairs them through roles.
    
    return false;
  }

  static evaluateCandidate(
    vocabularies: Record<string, GrammarVocabulary>, 
    scenario: GrammarScenario
  ): ValidationScore {
    
    let collocationScore = 1.0;
    let semanticScore = 1.0;
    let topicScore = 1.0;
    let grammarScore = 1.0; // Assume grammar is correct if it matched slot forms
    let levelScore = 1.0;
    let naturalnessScore = 1.0;
    let diversityScore = 1.0; // Checked at the set level

    // Check collocations (e.g. if we have a Verb and an Object)
    // In our simplified slots, we usually just have A and B. 
    // If A and B are both verbs, we check logical relation instead of collocation.
    
    if (vocabularies['A'] && vocabularies['B']) {
      const a = vocabularies['A'];
      const b = vocabularies['B'];
      
      // If A is verb and B is verb, check logical relation according to scenario
      if (a.wordType === 'verb' && b.wordType === 'verb') {
        const relation = scenario.validRelations[0];
        if (relation) {
          const isValid = this.validateLogicalRelation(a, b, relation);
          if (!isValid) semanticScore = 0;
        }
      }
      
      // If A is noun and B is verb (e.g. object -> verb)
      if (a.wordType === 'noun' && b.wordType === 'verb') {
         const isValid = this.validateCollocation(b, a);
         if (!isValid) collocationScore = 0;
      }
    }

    return {
      grammarScore,
      semanticScore,
      collocationScore,
      topicScore,
      levelScore,
      naturalnessScore,
      diversityScore
    };
  }

  static getValidScenarios(_rule: SmartGrammarRule, allScenarios: GrammarScenario[], topic?: string): GrammarScenario[] {
    // If the grammar rule has a specific allowedRelationTypes, we could filter scenarios
    // For now, we assume the scenarios passed are specifically for this grammar rule (e.g. tekaraDenaitoScenarios)
    
    if (topic) {
       return allScenarios.filter(s => s.topic === topic || s.vocabularyTags.includes(topic));
    }
    return allScenarios;
  }
}
