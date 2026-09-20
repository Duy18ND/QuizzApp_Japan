"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSmartQuestionSet = void 0;
var lesson01Sentences_1 = require("../../data/grammar/shinkanzen-n3/lesson01Sentences");
var questionTypes_1 = require("./questionTypes");
var SeededRandom = /** @class */ (function () {
    function SeededRandom(seed) {
        this.seed = seed;
    }
    SeededRandom.prototype.next = function () {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    };
    SeededRandom.prototype.choice = function (arr) {
        return arr[Math.floor(this.next() * arr.length)];
    };
    SeededRandom.prototype.shuffle = function (arr) {
        var _a;
        var copy = __spreadArray([], arr, true);
        for (var i = copy.length - 1; i > 0; i--) {
            var j = Math.floor(this.next() * (i + 1));
            _a = [copy[j], copy[i]], copy[i] = _a[0], copy[j] = _a[1];
        }
        return copy;
    };
    return SeededRandom;
}());
var generateSmartQuestionSet = function (options) {
    var grammarRule = options.grammarRule, count = options.count, seed = options.seed, requestedPracticeTypes = options.requestedPracticeTypes;
    var rng = new SeededRandom(seed);
    var questions = [];
    var usedFingerprints = new Set();
    // Lấy các câu cố định cho grammar hiện tại từ Sentence Bank
    var availableSentences = lesson01Sentences_1.lesson01Sentences.filter(function (s) { return s.grammarId === grammarRule.id; });
    var shuffledSentences = rng.shuffle(availableSentences);
    if (shuffledSentences.length === 0) {
        return { id: "set-".concat(seed), seed: seed, grammarId: grammarRule.id, questions: [] };
    }
    var ALLOWED_MIXED_TYPES = ['sentence_ordering', 'star_question'];
    var typesToUse = requestedPracticeTypes && requestedPracticeTypes.length > 0
        ? requestedPracticeTypes
        : grammarRule.practiceTypes.filter(function (t) { return ALLOWED_MIXED_TYPES.includes(t); });
    if (typesToUse.includes('mixed')) {
        typesToUse = typesToUse.filter(function (t) { return t !== 'mixed'; });
    }
    // Fallback to grammar_selection if nothing matches
    if (typesToUse.length === 0)
        typesToUse = ['grammar_selection'];
    var typeDistribution = [];
    var baseCount = Math.floor(count / typesToUse.length);
    var remainder = count % typesToUse.length;
    typesToUse.forEach(function (t, i) {
        var c = baseCount + (i < remainder ? 1 : 0);
        for (var j = 0; j < c; j++)
            typeDistribution.push(t);
    });
    var shuffledTypes = rng.shuffle(typeDistribution);
    for (var _i = 0, shuffledSentences_1 = shuffledSentences; _i < shuffledSentences_1.length; _i++) {
        var sentenceRecord = shuffledSentences_1[_i];
        if (questions.length >= count)
            break;
        // Duplicate check bằng ID cố định
        if (usedFingerprints.has(sentenceRecord.id)) {
            continue;
        }
        usedFingerprints.add(sentenceRecord.id);
        var pType = shuffledTypes[questions.length % shuffledTypes.length] || 'fill_blank';
        // Tạo baseQuestion và truyền GrammarSentence sang questionTypes
        var baseQuestion = {
            id: "".concat(sentenceRecord.id, "-").concat(seed),
            grammarId: grammarRule.id,
            hint: grammarRule.meaning,
            explanation: "C\u00E2u g\u1ED1c: ".concat(sentenceRecord.japanese, "\nD\u1ECBch: ").concat(sentenceRecord.vietnamese, "\nNg\u1EEF ph\u00E1p: ").concat(grammarRule.name, " - ").concat(grammarRule.meaning, "\nGi\u1EA3i th\u00EDch: ").concat(grammarRule.explanation),
            metadata: {
                japanese: sentenceRecord.japanese,
                vietnamese: sentenceRecord.vietnamese,
                grammarName: grammarRule.name,
                grammarMeaning: grammarRule.meaning,
                grammarExplanation: grammarRule.explanation
            }
        };
        var generatorCtx = {
            baseQuestion: baseQuestion,
            grammarRule: grammarRule,
            sentenceRecord: sentenceRecord,
            rng: rng
        };
        switch (pType) {
            case 'multiple_choice':
                questions.push((0, questionTypes_1.generateMultipleChoiceQuestion)(generatorCtx));
                break;
            case 'fill_blank':
                questions.push((0, questionTypes_1.generateFillBlankQuestion)(generatorCtx));
                break;
            case 'conjugation':
                questions.push((0, questionTypes_1.generateConjugationQuestion)(generatorCtx));
                break;
            case 'sentence_ordering':
                questions.push((0, questionTypes_1.generateWordOrderQuestion)(generatorCtx));
                break;
            case 'star_question':
                questions.push((0, questionTypes_1.generateStarQuestion)(generatorCtx));
                break;
            case 'ja_to_vi':
                questions.push((0, questionTypes_1.generateJaToViQuestion)(generatorCtx));
                break;
            case 'vi_to_ja':
                questions.push((0, questionTypes_1.generateViToJaQuestion)(generatorCtx));
                break;
            case 'sentence_transformation':
                questions.push((0, questionTypes_1.generateTransformationQuestion)(generatorCtx));
                break;
            case 'grammar_selection':
                questions.push((0, questionTypes_1.generateGrammarSelectionQuestion)(generatorCtx));
                break;
            case 'free_writing':
                questions.push((0, questionTypes_1.generateFreeWritingQuestion)(generatorCtx));
                break;
            case 'example':
                questions.push((0, questionTypes_1.generateExampleQuestion)(generatorCtx));
                break;
            default:
                questions.push((0, questionTypes_1.generateFillBlankQuestion)(generatorCtx));
        }
    }
    return {
        id: "set-".concat(seed, "-").concat(Date.now()),
        seed: seed,
        grammarId: grammarRule.id,
        questions: questions
    };
};
exports.generateSmartQuestionSet = generateSmartQuestionSet;
