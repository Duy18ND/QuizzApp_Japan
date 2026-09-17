import type { SemanticRole } from '../../types/grammarEngine';

// Mapping from N3 vocab (hiragana/kanji) to their semantic roles.
// In a real app, this should be part of the vocabulary database.
export const semanticDictionary: Record<string, SemanticRole[]> = {
  // Persons
  'わたし': ['person'], '私': ['person'],
  'せんせい': ['person', 'school'], '先生': ['person', 'school'],
  'がくせい': ['person', 'school'], '学生': ['person', 'school'],
  'ともだち': ['person'], '友達': ['person'],
  'こども': ['person', 'family'], '子供': ['person', 'family'],
  'おや': ['person', 'family'], '親': ['person', 'family'],

  // Places
  'がっこう': ['place', 'school'], '学校': ['place', 'school'],
  'えき': ['place', 'transportation'], '駅': ['place', 'transportation'],
  'かいしゃ': ['place', 'work'], '会社': ['place', 'work'],
  'ホテル': ['place', 'travel'],
  'としょかん': ['place', 'school'], '図書館': ['place', 'school'],
  'みせ': ['place', 'shopping'], '店': ['place', 'shopping'],
  'スーパー': ['place', 'shopping'],

  // Objects
  'ほん': ['object', 'school'], '本': ['object', 'school'],
  'しゅくだい': ['object', 'school'], '宿題': ['object', 'school'],
  'くすり': ['object', 'health'], '薬': ['object', 'health'],
  'ごはん': ['food'], 'ご飯': ['food'],
  'パン': ['food'],
  'みず': ['food'], '水': ['food'],
  'コーヒー': ['food'],
  'おちゃ': ['food'], 'お茶': ['food'],
  'チケット': ['object', 'travel'], 'きっぷ': ['object', 'travel'], '切符': ['object', 'travel'],
  'にもつ': ['object', 'travel'], '荷物': ['object', 'travel'],
  'しんぶん': ['object', 'daily life'], '新聞': ['object', 'daily life'],
  'きじ': ['object', 'work'], '記事': ['object', 'work'],
  'けーたい': ['object'], '携帯': ['object'],

  // Transportation
  'でんしゃ': ['transportation'], '電車': ['transportation'],
  'バス': ['transportation'],
  'くるま': ['transportation'], '車': ['transportation'],
  'ひこうき': ['transportation', 'travel'], '飛行機': ['transportation', 'travel'],

  // Activities (can be treated as verbal nouns / suru-verbs)
  'べんきょう': ['activity', 'school'], '勉強': ['activity', 'school'],
  'しごと': ['activity', 'work'], '仕事': ['activity', 'work'],
  'りょこう': ['activity', 'travel'], '旅行': ['activity', 'travel'],
  'かいもの': ['activity', 'shopping'], '買い物': ['activity', 'shopping'],
  'そうじ': ['activity', 'daily life'], '掃除': ['activity', 'daily life'],

  // Weather / Nature
  'あめ': ['weather'], '雨': ['weather'],
  'ゆき': ['weather'], '雪': ['weather'],
  'てんき': ['weather'], '天気': ['weather'],

  // State / Adjectives (Mapped as states for slots)
  'わかい': ['person', 'time'], '若い': ['person', 'time'],
  'あたたかい': ['weather'], '暖かい': ['weather'],
  'さむい': ['weather'], '寒い': ['weather'],
  'あつい': ['weather'], '暑い': ['weather'],
  'げんき': ['health'], '元気': ['health'],
  'ひま': ['time'], '暇': ['time'],
};

// Verb - Object Collocation Rules (What can this verb take as an object with 'を' / 'に' / 'へ')
export const verbCollocations: Record<string, string[]> = {
  // 食べる (eat) -> foods
  'たべる': ['ご飯', 'パン', 'ごはん', 'ケーキ', '料理', 'りょうり'],
  '食べる': ['ご飯', 'パン', 'ごはん', 'ケーキ', '料理', 'りょうり'],
  
  // 飲む (drink / take medicine)
  'のむ': ['水', 'みず', 'お茶', 'おちゃ', 'コーヒー', '薬', 'くすり'],
  '飲む': ['水', 'みず', 'お茶', 'おちゃ', 'コーヒー', '薬', 'くすり'],
  
  // 読む (read)
  'よむ': ['本', 'ほん', '新聞', 'しんぶん', '記事', 'きじ'],
  '読む': ['本', 'ほん', '新聞', 'しんぶん', '記事', 'きじ'],

  // 乗る (ride)
  'のる': ['電車', 'でんしゃ', 'バス', '車', 'くるま', '飛行機', 'ひこうき'],
  '乗る': ['電車', 'でんしゃ', 'バス', '車', 'くるま', '飛行機', 'ひこうき'],

  // 降りる (get off)
  'おりる': ['電車', 'でんしゃ', 'バス', '車', 'くるま', '飛行機', 'ひこうき'],
  '降りる': ['電車', 'でんしゃ', 'バス', '車', 'くるま', '飛行機', 'ひこうき'],

  // 買う (buy)
  'かう': ['本', 'ほん', 'パン', 'チケット', '切符', 'きっぷ'],
  '買う': ['本', 'ほん', 'パン', 'チケット', '切符', 'きっぷ'],

  // 勉強する (study)
  'べんきょうする': ['日本語', 'にほんご', '英語', 'えいご', '漢字', 'かんじ'],
  '勉強する': ['日本語', 'にほんご', '英語', 'えいご', '漢字', 'かんじ'],

  // 予約する (reserve)
  'よやくする': ['ホテル', 'レストラン', 'チケット', '切符'],
  '予約する': ['ホテル', 'レストラン', 'チケット', '切符'],

  // 申し込む (apply/register)
  'もうしこむ': ['試合', 'イベント', '試験'],
  '申し込む': ['試合', 'イベント', '試験'],

  // 受ける (take an exam)
  'うける': ['試験', 'テスト', '面接'],
  '受ける': ['試験', 'テスト', '面接'],

  // 卒業する (graduate)
  'そつぎょうする': ['学校', '大学'],
  '卒業する': ['学校', '大学'],
};

export const verbTopics: Record<string, string[]> = {
  '勉強する': ['school', 'study'],
  '予約する': ['travel', 'restaurant', 'event'],
  '泊まる': ['travel'],
  '申し込む': ['event', 'school'],
  '受ける': ['school', 'work'],
  '卒業する': ['school'],
  '乗る': ['transportation', 'travel'],
  '買う': ['shopping', 'transportation'],
  '遊ぶ': ['daily_life', 'free_time', 'school'],
  '帰る': ['daily_life', 'family'],
  '寝る': ['daily_life', 'health'],
  '確認する': ['work', 'school'],
  '始める': ['work', 'school', 'study'],
};
