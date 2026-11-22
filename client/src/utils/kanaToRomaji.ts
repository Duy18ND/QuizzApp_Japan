/**
 * Lightweight Hiragana / Katakana -> Romaji converter for the Ninja Vocabulary Shooter game.
 * Supports Hepburn + common typing variants so learners can type natural A-Z Romaji
 * without switching to a Japanese IME.
 */

const DIGRAPH_MAP: Record<string, string> = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja',  じゅ: 'ju',  じょ: 'jo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  ふぁ: 'fa',  ふぃ: 'fi',  ふぇ: 'fe',  ふぉ: 'fo',
  てぃ: 'ti',  でぃ: 'di',  うぃ: 'wi',  うぇ: 'we',
  シェ: 'she', チェ: 'che', ジェ: 'je',  ツァ: 'tsa',
};

const MONOGRAPH_MAP: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
  ゃ: 'ya', ゅ: 'yu', ょ: 'yo', ゎ: 'wa', ゔ: 'vu',
};

export function katakanaToHiragana(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if (code >= 0x30a1 && code <= 0x30f6) {
      out += String.fromCharCode(code - 0x60);
    } else {
      out += input[i];
    }
  }
  return out;
}

export function cleanReadingForGame(rawReading: string): string {
  return rawReading
    .replace(/\[[^\]]*\]/g, '')
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[～〜・、。！？\s/]/g, '')
    .trim();
}

export function kanaToRomaji(rawKana: string): string {
  const cleaned = katakanaToHiragana(cleanReadingForGame(rawKana));
  const tokens: string[] = [];
  let i = 0;

  while (i < cleaned.length) {
    const ch = cleaned[i];
    const next = cleaned[i + 1] ?? '';

    if (ch === 'っ') {
      // Double next consonant
      const pairAfter = cleaned.slice(i + 1, i + 3);
      const nextRomaji =
        DIGRAPH_MAP[pairAfter] ?? MONOGRAPH_MAP[next] ?? '';
      if (nextRomaji && /^[a-z]/.test(nextRomaji)) {
        tokens.push(nextRomaji[0]);
      }
      i += 1;
      continue;
    }

    if (ch === 'ー') {
      const prev = tokens[tokens.length - 1] ?? '';
      const lastVowel = prev.match(/[aeiou]$/)?.[0];
      if (lastVowel) tokens.push(lastVowel);
      i += 1;
      continue;
    }

    const pair = ch + next;
    if (next && DIGRAPH_MAP[pair]) {
      tokens.push(DIGRAPH_MAP[pair]);
      i += 2;
      continue;
    }

    if (MONOGRAPH_MAP[ch]) {
      tokens.push(MONOGRAPH_MAP[ch]);
      i += 1;
      continue;
    }

    if (/[a-zA-Z0-9]/.test(ch)) {
      tokens.push(ch.toLowerCase());
    }
    i += 1;
  }

  return tokens.join('') || 'nihon';
}

/**
 * Normalizes alternate Romaji spellings (si->shi, ti->chi, tu->tsu, hu->fu, jya->ja, nn->n)
 * so learners using either Hepburn or Kunrei-shiki match smoothly.
 */
export function normalizeRomajiInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/sya/g, 'sha')
    .replace(/syu/g, 'shu')
    .replace(/syo/g, 'sho')
    .replace(/tya/g, 'cha')
    .replace(/tyu/g, 'chu')
    .replace(/tyo/g, 'cho')
    .replace(/jya/g, 'ja')
    .replace(/jyu/g, 'ju')
    .replace(/jyo/g, 'jo')
    .replace(/zya/g, 'ja')
    .replace(/zyu/g, 'ju')
    .replace(/zyo/g, 'jo')
    .replace(/si/g, 'shi')
    .replace(/ti/g, 'chi')
    .replace(/tu/g, 'tsu')
    .replace(/hu/g, 'fu')
    .replace(/zi/g, 'ji');
}

export interface KanaMora {
  kana: string;
  romaji: string;
}

const SMALL_YOO_ON = new Set(['ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ゎ']);

/**
 * Splits a Japanese Hiragana/Katakana reading into natural playable Kana moras
 * (keeping digraphs like きょ, しゃ, じゃ as a single tile).
 */
export function splitKanaToMoras(rawReading: string): KanaMora[] {
  const cleaned = katakanaToHiragana(cleanReadingForGame(rawReading));
  const moras: KanaMora[] = [];
  let i = 0;

  while (i < cleaned.length) {
    const ch = cleaned[i];
    const next = cleaned[i + 1] ?? '';

    if (next && SMALL_YOO_ON.has(next)) {
      const pair = ch + next;
      moras.push({
        kana: pair,
        romaji: DIGRAPH_MAP[pair] ?? kanaToRomaji(pair),
      });
      i += 2;
      continue;
    }

    if (ch === 'っ') {
      moras.push({ kana: 'っ', romaji: '(ngắt)' });
      i += 1;
      continue;
    }

    if (ch === 'ー') {
      moras.push({ kana: 'ー', romaji: '(kéo dài)' });
      i += 1;
      continue;
    }

    moras.push({
      kana: ch,
      romaji: MONOGRAPH_MAP[ch] ?? ch,
    });
    i += 1;
  }

  return moras;
}

const DISTRACTOR_KANA_POOL: KanaMora[] = [
  { kana: 'あ', romaji: 'a' },
  { kana: 'い', romaji: 'i' },
  { kana: 'う', romaji: 'u' },
  { kana: 'か', romaji: 'ka' },
  { kana: 'き', romaji: 'ki' },
  { kana: 'く', romaji: 'ku' },
  { kana: 'さ', romaji: 'sa' },
  { kana: 'し', romaji: 'shi' },
  { kana: 'す', romaji: 'su' },
  { kana: 'た', romaji: 'ta' },
  { kana: 'ち', romaji: 'chi' },
  { kana: 'て', romaji: 'te' },
  { kana: 'と', romaji: 'to' },
  { kana: 'な', romaji: 'na' },
  { kana: 'に', romaji: 'ni' },
  { kana: 'の', romaji: 'no' },
  { kana: 'は', romaji: 'ha' },
  { kana: 'ま', romaji: 'ma' },
  { kana: 'み', romaji: 'mi' },
  { kana: 'め', romaji: 'me' },
  { kana: 'も', romaji: 'mo' },
  { kana: 'ら', romaji: 'ra' },
  { kana: 'り', romaji: 'ri' },
  { kana: 'る', romaji: 'ru' },
  { kana: 'れ', romaji: 're' },
  { kana: 'わ', romaji: 'wa' },
  { kana: 'ん', romaji: 'n' },
];

export interface KanaTileItem {
  uid: string;
  kana: string;
  romaji: string;
  isDistractor: boolean;
}

/**
 * Builds a deterministic shuffled rack of Kana tiles (6-9 tiles) containing every mora
 * of the target word plus 2-3 realistic distractor tiles.
 */
export function buildKanaTileRack(wordKey: string, moras: KanaMora[]): KanaTileItem[] {
  const usedKana = new Set(moras.map((m) => m.kana));
  const targetDistractors = moras.length >= 6 ? 2 : 3;

  // Deterministic pseudo-random seed from wordKey
  let hash = 2166136261;
  for (let i = 0; i < wordKey.length; i += 1) {
    hash ^= wordKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const nextRand = () => {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    return ((hash >>> 0) % 10000) / 10000;
  };

  const candidates = DISTRACTOR_KANA_POOL.filter((d) => !usedKana.has(d.kana));
  const pickedDistractors: KanaMora[] = [];
  const poolCopy = [...candidates];
  while (pickedDistractors.length < targetDistractors && poolCopy.length > 0) {
    const idx = Math.floor(nextRand() * poolCopy.length);
    const [picked] = poolCopy.splice(idx, 1);
    if (picked) pickedDistractors.push(picked);
  }

  const rack: KanaTileItem[] = [
    ...moras.map((m, idx) => ({
      uid: `${wordKey}-m-${idx}`,
      kana: m.kana,
      romaji: m.romaji,
      isDistractor: false,
    })),
    ...pickedDistractors.map((d, idx) => ({
      uid: `${wordKey}-d-${idx}`,
      kana: d.kana,
      romaji: d.romaji,
      isDistractor: true,
    })),
  ];

  // Deterministic Fisher-Yates shuffle
  for (let i = rack.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRand() * (i + 1));
    [rack[i], rack[j]] = [rack[j], rack[i]];
  }
  return rack;
}
