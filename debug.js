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
var questionGenerator_1 = require("./client/src/utils/grammarEngine/questionGenerator");
var lesson01_1 = require("./client/src/data/grammar/shinkanzen-n3/lesson01");
var shuffle_1 = require("./client/src/utils/shuffle");
var unit1_1 = require("./client/src/data/n3/unit1");
var rulesToPractice = lesson01_1.shinkanzenN3Lesson01;
var questionCount = 20;
var allQuestions = [];
var currentSeed = Date.now();
var mode = 'mixed';
rulesToPractice.forEach(function (rule, index) {
    var countPerRule = Math.max(4, Math.ceil(questionCount / rulesToPractice.length));
    var questionSet = (0, questionGenerator_1.generateSmartQuestionSet)({
        grammarRule: rule,
        count: countPerRule,
        seed: currentSeed + index,
        rawVocabulary: unit1_1.unit1Data,
        requestedPracticeTypes: ['sentence_ordering', 'star_question', 'fill_blank', 'multiple_choice'],
    });
    allQuestions = __spreadArray(__spreadArray([], allQuestions, true), questionSet.questions, true);
});
var shuffled = (0, shuffle_1.shuffleArray)(__spreadArray([], allQuestions, true));
shuffled = shuffled.slice(0, 20);
console.log("Total generated:", allQuestions.length);
console.log("Sliced length:", shuffled.length);
var counts = {};
shuffled.forEach(function (q) {
    counts[q.grammarId] = (counts[q.grammarId] || 0) + 1;
});
console.log("Grammar distribution in final 20:", counts);
