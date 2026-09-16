import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM Fix: T?o l?i __dirname và __filename cho type: module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function exportData() {
  const words = await prisma.word.findMany({
    orderBy: { id: 'asc' }
  });

  const n3Dir = path.join(__dirname, '../../client/src/data/n3');
  if (!fs.existsSync(n3Dir)) {
    fs.mkdirSync(n3Dir, { recursive: true });
  }

  const exportContent = `export const unit1Data = ${JSON.stringify(words, null, 2)};\n`;
  
  fs.writeFileSync(path.join(n3Dir, 'unit1.ts'), exportContent, 'utf-8');
  console.log(`Exported ${words.length} words to client/src/data/n3/unit1.ts`);

  const indexContent = `import { unit1Data } from './n3/unit1';

export const allVocabularyData: Record<string, Record<string, any[]>> = {
  n3: {
    '1': unit1Data,
  }
};
`;

  fs.writeFileSync(path.join(__dirname, '../../client/src/data/index.ts'), indexContent, 'utf-8');
  console.log('Generated client/src/data/index.ts');
}

exportData()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

