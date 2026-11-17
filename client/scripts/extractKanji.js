import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to wait
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function extractKanji() {
  console.log("Loading vocabulary data...");
  
  const unit1Path = path.join(__dirname, '../src/data/n3/unit1.ts');
  const content = fs.readFileSync(unit1Path, 'utf-8');
  
  const KANJI_REGEX = /[\u4e00-\u9faf\u3400-\u4dbf]/g;
  
  const jsonMatch = content.match(/export const unit1Data = (\[[\s\S]*?\]);/);
  
  let vocabList = [];
  if (jsonMatch) {
    try {
      const fn = new Function(`return ${jsonMatch[1]}`);
      vocabList = fn();
    } catch (e) {
      console.error("Failed to parse unit1Data:", e);
      return;
    }
  } else {
    console.error("Could not find unit1Data array in unit1.ts");
    return;
  }

  const kanjiMap = new Map();
  console.log(`Extracted ${vocabList.length} vocabulary words.`);

  for (const word of vocabList) {
    if (!word.kanji) continue;
    
    const characters = word.kanji.match(KANJI_REGEX) || [];
    
    for (const char of characters) {
      if (!kanjiMap.has(char)) {
        kanjiMap.set(char, {
          id: char,
          kanji: char,
          meanings: [],
          hanViet: "",
          onReadings: [],
          kunReadings: [],
          strokeCount: 0,
          jlptLevel: "N3",
          vocabularyIds: [word.id],
          examples: [{
            vocabularyId: word.id,
            word: word.kanji,
            hiragana: word.hiragana,
            meaning: word.meaning
          }]
        });
      } else {
        const existing = kanjiMap.get(char);
        if (!existing.vocabularyIds.includes(word.id)) {
          existing.vocabularyIds.push(word.id);
          existing.examples.push({
            vocabularyId: word.id,
            word: word.kanji,
            hiragana: word.hiragana,
            meaning: word.meaning
          });
        }
      }
    }
  }

  console.log(`Found ${kanjiMap.size} unique kanji characters.`);
  
  const finalKanjiList = [];
  let index = 1;

  for (const [char, data] of kanjiMap.entries()) {
    console.log(`[${index}/${kanjiMap.size}] Fetching data for ${char}...`);
    try {
      const response = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(char)}`);
      if (response.ok) {
        const apiData = await response.json();
        data.meanings = apiData.meanings || [];
        data.onReadings = apiData.on_readings || [];
        data.kunReadings = apiData.kun_readings || [];
        data.strokeCount = apiData.stroke_count || 0;
        data.jlptLevel = apiData.jlpt ? `N${apiData.jlpt}` : "N3";
      } else {
        console.warn(`Warning: Could not fetch data for ${char} (Status: ${response.status})`);
      }
    } catch (e) {
      console.error(`Error fetching data for ${char}:`, e.message);
    }
    
    finalKanjiList.push(data);
    index++;
    await delay(150); // Rate limiting
  }

  const outputDir = path.join(__dirname, '../src/data/kanji');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'kanjiDataset.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalKanjiList, null, 2), 'utf-8');
  console.log(`\nSuccessfully saved Kanji dataset to ${outputPath}`);
}

extractKanji();
