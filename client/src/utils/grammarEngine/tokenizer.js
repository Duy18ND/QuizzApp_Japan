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
exports.tokenizeJapanese = tokenizeJapanese;
function tokenizeJapanese(sentence, options) {
    var opts = __assign({ splitGrammarParticle: true, splitParticles: true, grammarKeywords: [] }, options);
    var PARTICLES = [
        'からは', 'までは', 'には', 'では', 'へは', 'でも', 'とも',
        'から', 'まで', 'より', 'しか', 'だけ', 'など', 'ばかり',
        'は', 'が', 'を', 'に', 'で', 'へ', 'と', 'や', 'も', 'の', 'か', 'ね', 'よ'
    ];
    var PUNCTUATIONS = ['、', '。', '？', '！', '「', '」', '（', '）', '『', '』'];
    // Sort grammar keywords from longest to shortest to match multi-char grammar first
    var grammarWords = __spreadArray([], (opts.grammarKeywords || []), true).sort(function (a, b) { return b.length - a.length; });
    var tokens = [];
    var currentWord = '';
    var index = 0;
    var pushCurrentWord = function () {
        if (currentWord) {
            tokens.push({
                id: "t_".concat(index),
                text: currentWord,
                type: 'vocabulary',
                originalIndex: index++
            });
            currentWord = '';
        }
    };
    for (var i = 0; i < sentence.length;) {
        var matchedPunctuation = '';
        for (var _i = 0, PUNCTUATIONS_1 = PUNCTUATIONS; _i < PUNCTUATIONS_1.length; _i++) {
            var p = PUNCTUATIONS_1[_i];
            if (sentence.startsWith(p, i)) {
                matchedPunctuation = p;
                break;
            }
        }
        if (matchedPunctuation) {
            pushCurrentWord();
            tokens.push({
                id: "t_".concat(index),
                text: matchedPunctuation,
                type: 'punctuation',
                originalIndex: index++
            });
            i += matchedPunctuation.length;
            continue;
        }
        var matchedGrammar = '';
        for (var _a = 0, grammarWords_1 = grammarWords; _a < grammarWords_1.length; _a++) {
            var g = grammarWords_1[_a];
            if (sentence.startsWith(g, i)) {
                matchedGrammar = g;
                break;
            }
        }
        if (matchedGrammar && !opts.splitGrammarParticle) {
            pushCurrentWord();
            tokens.push({
                id: "t_".concat(index),
                text: matchedGrammar,
                type: 'grammar',
                originalIndex: index++
            });
            i += matchedGrammar.length;
            continue;
        }
        var matchedParticle = '';
        if (opts.splitParticles) {
            for (var _b = 0, PARTICLES_1 = PARTICLES; _b < PARTICLES_1.length; _b++) {
                var p = PARTICLES_1[_b];
                if (sentence.startsWith(p, i)) {
                    matchedParticle = p;
                    break;
                }
            }
        }
        if (matchedParticle) {
            pushCurrentWord();
            tokens.push({
                id: "t_".concat(index),
                text: matchedParticle,
                type: 'particle',
                originalIndex: index++
            });
            i += matchedParticle.length;
            continue;
        }
        // Nothing matched, it's part of a word
        currentWord += sentence[i];
        i++;
    }
    pushCurrentWord();
    return tokens;
}
