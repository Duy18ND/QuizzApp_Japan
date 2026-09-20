"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.generateExampleQuestion = exports.generateFreeWritingQuestion = exports.generateGrammarSelectionQuestion = exports.generateTransformationQuestion = exports.generateViToJaQuestion = exports.generateJaToViQuestion = exports.generateWordOrderQuestion = exports.generateStarQuestion = exports.generateConjugationQuestion = exports.generateFillBlankQuestion = exports.generateMultipleChoiceQuestion = void 0;
var tokenizer_1 = require("./tokenizer");
var generateDistractors = function (target) {
    if (!target)
        return ['A', 'B', 'C'];
    // Very naive distractor generation based on string endings
    if (target.endsWith('ている'))
        return [target.replace('ている', 'た'), target.replace('ている', 'て'), target.replace('ている', 'ない')];
    if (target.endsWith('た'))
        return [target.replace('た', 'ている'), target.replace('た', 'て'), target.replace('た', 'ない')];
    if (target.endsWith('て'))
        return [target.replace('て', 'た'), target.replace('て', 'ている'), target.replace('て', 'ない')];
    if (target.endsWith('ない'))
        return [target.replace('ない', 'た'), target.replace('ない', 'ている'), target.replace('ない', 'て')];
    return [target + 'た', target + 'ている', target + 'ない'];
};
var generateMultipleChoiceQuestion = function (ctx) {
    var target = ctx.sentenceRecord.target || ctx.grammarRule.hiragana;
    var distractors = generateDistractors(target);
    var allAnswers = ctx.rng.shuffle(__spreadArray([target], distractors, true));
    var blanked = ctx.sentenceRecord.japanese.replace(target, '＿＿＿＿＿');
    return __assign(__assign({}, ctx.baseQuestion), { type: 'multiple_choice', instruction: "Ch\u1ECDn \u0111\u00E1p \u00E1n \u0111\u00FAng \u0111i\u1EC1n v\u00E0o ch\u1ED7 tr\u1ED1ng:", question: blanked, answers: allAnswers, correctAnswer: target });
};
exports.generateMultipleChoiceQuestion = generateMultipleChoiceQuestion;
var generateFillBlankQuestion = function (ctx) {
    var target = ctx.sentenceRecord.target || ctx.grammarRule.hiragana;
    var blanked = ctx.sentenceRecord.japanese.replace(target, '＿＿＿＿＿');
    return __assign(__assign({}, ctx.baseQuestion), { type: 'fill_blank', instruction: "\u0110i\u1EC1n t\u1EEB th\u00EDch h\u1EE3p v\u00E0o ch\u1ED7 tr\u1ED1ng:", question: blanked, correctAnswer: target });
};
exports.generateFillBlankQuestion = generateFillBlankQuestion;
var generateConjugationQuestion = function (ctx) {
    var target = ctx.sentenceRecord.target || ctx.grammarRule.hiragana;
    var blanked = ctx.sentenceRecord.japanese.replace(target, '＿＿＿＿＿');
    return __assign(__assign({}, ctx.baseQuestion), { type: 'conjugation', instruction: "Chia \u0111\u1ED9ng t\u1EEB trong ngo\u1EB7c cho \u0111\u00FAng:", question: "".concat(blanked, "\uFF08").concat(target, "\uFF09"), correctAnswer: target });
};
exports.generateConjugationQuestion = generateConjugationQuestion;
var getMergedTokens = function (sentence, grammarKeywords, splitParticles) {
    if (splitParticles === void 0) { splitParticles = false; }
    var tokenObjects = (0, tokenizer_1.tokenizeJapanese)(sentence, {
        grammarKeywords: grammarKeywords,
        splitParticles: splitParticles,
        splitGrammarParticle: false
    });
    var merged = [];
    for (var _i = 0, tokenObjects_1 = tokenObjects; _i < tokenObjects_1.length; _i++) {
        var t = tokenObjects_1[_i];
        if (t.type === 'punctuation' && merged.length > 0) {
            merged[merged.length - 1] += t.text;
        }
        else {
            merged.push(t.text);
        }
    }
    return merged;
};
var generateStarQuestion = function (ctx) {
    var sentence = ctx.sentenceRecord.japanese;
    var keyword = ctx.grammarRule.hiragana;
    // 1. Get fine-grained tokens and remove punctuation to prevent awkward chunks
    var rawObjs = (0, tokenizer_1.tokenizeJapanese)(sentence, { grammarKeywords: [keyword], splitParticles: true, splitGrammarParticle: false });
    var cleanTokens = rawObjs.map(function (t) { return t.text; }).filter(function (t) { return !['、', '。', '？', '！', '「', '」'].includes(t); });
    var keywordIdx = cleanTokens.findIndex(function (t) { return t.includes(keyword); });
    if (keywordIdx === -1)
        keywordIdx = Math.floor(cleanTokens.length / 2);
    var beforeTokens = cleanTokens.slice(0, keywordIdx);
    var afterTokens = cleanTokens.slice(keywordIdx + 1);
    // 2. Decide how many chunks to take from before and after
    var numBeforeChunks = Math.floor(ctx.rng.next() * 4); // 0, 1, 2, 3
    if (numBeforeChunks > beforeTokens.length)
        numBeforeChunks = beforeTokens.length;
    var numAfterChunks = 3 - numBeforeChunks;
    if (numAfterChunks > afterTokens.length) {
        numAfterChunks = afterTokens.length;
        numBeforeChunks = Math.min(3 - numAfterChunks, beforeTokens.length);
    }
    // 3. Extract tokens for chunks (approx 2 tokens per chunk for good sizing)
    var TOKENS_PER_CHUNK = 2;
    var beforeTokensToUseCount = Math.min(beforeTokens.length, numBeforeChunks * TOKENS_PER_CHUNK);
    var afterTokensToUseCount = Math.min(afterTokens.length, numAfterChunks * TOKENS_PER_CHUNK);
    var prefixTokens = beforeTokens.slice(0, beforeTokens.length - beforeTokensToUseCount);
    var beforeTokensToUse = beforeTokens.slice(beforeTokens.length - beforeTokensToUseCount);
    var afterTokensToUse = afterTokens.slice(0, afterTokensToUseCount);
    var suffixTokens = afterTokens.slice(afterTokensToUseCount);
    var prefix = prefixTokens.join('');
    var suffix = suffixTokens.join('') + (sentence.endsWith('。') ? '。' : ''); // Restore trailing period if needed
    // 4. Group tokens into the exact number of chunks
    var buildChunks = function (tokens, numChunks) {
        if (numChunks === 0)
            return [];
        var res = Array(numChunks).fill('');
        for (var i = 0; i < tokens.length; i++) {
            var c = Math.floor((i * numChunks) / tokens.length);
            res[c] += tokens[i];
        }
        return res;
    };
    var beforeChunks = buildChunks(beforeTokensToUse, numBeforeChunks);
    var afterChunks = buildChunks(afterTokensToUse, numAfterChunks);
    var rawSlots = __spreadArray(__spreadArray(__spreadArray([], beforeChunks, true), [cleanTokens[keywordIdx]], false), afterChunks, true);
    // Pad if we somehow have fewer than 4 slots (very short sentences)
    while (rawSlots.length < 4)
        rawSlots.push('...');
    var chunks = rawSlots.map(function (text, idx) { return ({
        id: "chunk_".concat(idx),
        text: text,
        originalIndex: idx
    }); });
    var shuffledChunks = ctx.rng.shuffle(__spreadArray([], chunks, true));
    var starIndex = numBeforeChunks; // The keyword is placed exactly after numBeforeChunks
    var correctChunk = chunks[starIndex];
    return __assign(__assign({}, ctx.baseQuestion), { type: 'star_question', instruction: 'Sắp xếp các từ sau thành câu hoàn chỉnh và chọn đáp án cho vị trí có ngôi sao (★):', question: '', sentenceParts: {
            prefix: prefix,
            suffix: suffix
        }, chunks: chunks, shuffledChunks: shuffledChunks, starIndex: starIndex, correctAnswer: correctChunk.text, metadata: {
            originalSentence: sentence
        } });
};
exports.generateStarQuestion = generateStarQuestion;
var generateWordOrderQuestion = function (ctx) {
    var tokens = getMergedTokens(ctx.sentenceRecord.japanese, [ctx.grammarRule.hiragana, ctx.grammarRule.name], true);
    var targetChunks = Math.min(tokens.length, 6);
    var parts = Array(targetChunks).fill('');
    for (var i = 0; i < tokens.length; i++) {
        var chunkIdx = Math.floor((i * targetChunks) / tokens.length);
        parts[chunkIdx] += tokens[i];
    }
    return __assign(__assign({}, ctx.baseQuestion), { type: 'sentence_ordering', instruction: 'Sắp xếp các phần sau thành câu hoàn chỉnh:', question: '', parts: ctx.rng.shuffle(parts), correctAnswer: ctx.sentenceRecord.japanese, metadata: { originalSentence: ctx.sentenceRecord.japanese } });
};
exports.generateWordOrderQuestion = generateWordOrderQuestion;
var generateJaToViQuestion = function (ctx) {
    return __assign(__assign({}, ctx.baseQuestion), { type: 'ja_to_vi', instruction: "D\u1ECBch c\u00E2u sau sang ti\u1EBFng Vi\u1EC7t:", question: ctx.sentenceRecord.japanese, correctAnswer: ctx.sentenceRecord.vietnamese });
};
exports.generateJaToViQuestion = generateJaToViQuestion;
var generateViToJaQuestion = function (ctx) {
    return __assign(__assign({}, ctx.baseQuestion), { type: 'vi_to_ja', instruction: "D\u1ECBch c\u00E2u sau sang ti\u1EBFng Nh\u1EADt:", question: ctx.sentenceRecord.vietnamese, correctAnswer: ctx.sentenceRecord.japanese });
};
exports.generateViToJaQuestion = generateViToJaQuestion;
var generateTransformationQuestion = function (ctx) {
    return __assign(__assign({}, ctx.baseQuestion), { type: 'sentence_transformation', instruction: "Bi\u1EBFn \u0111\u1ED5i c\u00E2u sau s\u1EED d\u1EE5ng ng\u1EEF ph\u00E1p ".concat(ctx.grammarRule.name, ":"), question: ctx.sentenceRecord.japanese.replace(ctx.grammarRule.hiragana, ''), correctAnswer: ctx.sentenceRecord.japanese });
};
exports.generateTransformationQuestion = generateTransformationQuestion;
var generateGrammarSelectionQuestion = function (ctx) {
    var distractors = ctx.rng.shuffle(['間に', 'てからでないと', 'ところだ']).slice(0, 3);
    var target = ctx.grammarRule.hiragana;
    var allAnswers = ctx.rng.shuffle(__spreadArray([target], distractors, true));
    var blanked = ctx.sentenceRecord.japanese.replace(target, '＿＿＿＿＿');
    return __assign(__assign({}, ctx.baseQuestion), { type: 'grammar_selection', instruction: "Ch\u1ECDn c\u1EA5u tr\u00FAc ng\u1EEF ph\u00E1p \u0111\u00FAng:", question: blanked, answers: allAnswers, correctAnswer: target });
};
exports.generateGrammarSelectionQuestion = generateGrammarSelectionQuestion;
var generateFreeWritingQuestion = function (ctx) {
    return __assign(__assign({}, ctx.baseQuestion), { type: 'free_writing', instruction: "T\u1EF1 \u0111\u1EB7t m\u1ED9t c\u00E2u s\u1EED d\u1EE5ng ng\u1EEF ph\u00E1p ".concat(ctx.grammarRule.name, ":"), question: "T\u1EEB g\u1EE3i \u00FD: ".concat(ctx.sentenceRecord.target || ctx.grammarRule.hiragana), correctAnswer: ctx.sentenceRecord.japanese });
};
exports.generateFreeWritingQuestion = generateFreeWritingQuestion;
var generateExampleQuestion = function (ctx) {
    var _a;
    var analysis = ctx.sentenceRecord.analysis;
    if (!analysis) {
        var target = ctx.sentenceRecord.target || ctx.grammarRule.hiragana;
        var sentence = ctx.sentenceRecord.japanese;
        var parts = sentence.split(target);
        if (parts.length >= 2) {
            var before = parts[0];
            var after = parts.slice(1).join(target);
            var type = 'Vる';
            var rule = 'Vる';
            var base = before;
            if (before.endsWith('な')) {
                type = 'Aな';
                base = before.slice(0, -1) + '（だ）';
                rule = 'Aな + な';
            }
            else if (before.endsWith('い')) {
                type = 'Aい';
                rule = 'Aい';
            }
            else if (before.endsWith('の')) {
                type = 'N';
                base = before.slice(0, -1);
                rule = 'N + の';
            }
            else if (before.endsWith('ている')) {
                type = 'Vている';
                base = before.slice(0, -3) + 'る';
                rule = 'Vている';
            }
            else if (before.endsWith('ない')) {
                type = 'Vない';
                base = before.slice(0, -2) + 'る';
                rule = 'Vない';
            }
            else if (before.endsWith('た')) {
                type = 'Vた';
                base = before.slice(0, -1) + 'る';
                rule = 'Vた';
            }
            analysis = {
                pattern: "{".concat(type, "}").concat(target, "{Clause}"),
                slotValues: (_a = {},
                    _a[type] = before,
                    _a["Clause"] = after,
                    _a),
                conjugation: {
                    base: base,
                    conjugated: before,
                    rule: rule
                }
            };
        }
    }
    return __assign(__assign({}, ctx.baseQuestion), { type: 'example', instruction: '', question: ctx.sentenceRecord.japanese, correctAnswer: ctx.sentenceRecord.vietnamese, metadata: {
            japanese: ctx.sentenceRecord.japanese,
            hiragana: ctx.sentenceRecord.hiragana,
            vietnamese: ctx.sentenceRecord.vietnamese,
            grammarName: ctx.grammarRule.name,
            grammarHiragana: ctx.grammarRule.hiragana,
            pattern: analysis === null || analysis === void 0 ? void 0 : analysis.pattern,
            slotValues: analysis === null || analysis === void 0 ? void 0 : analysis.slotValues,
            conjugation: analysis === null || analysis === void 0 ? void 0 : analysis.conjugation
        } });
};
exports.generateExampleQuestion = generateExampleQuestion;
