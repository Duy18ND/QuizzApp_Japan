export interface KanjiExample {
  vocabularyId: number | string;
  word: string;
  hiragana: string;
  meaning: string;
}

export interface KanjiItem {
  id: string;
  kanji: string;
  meanings: string[];
  hanViet?: string;
  onReadings: string[];
  kunReadings: string[];
  strokeCount?: number;
  strokeOrder?: any[];
  radical?: string;
  components?: string[];
  jlptLevel?: "N5" | "N4" | "N3" | "N2" | "N1";
  vocabularyIds: (number | string)[];
  examples?: KanjiExample[];
}
