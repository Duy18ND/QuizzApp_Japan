const fs = require('fs');
const pages = ['DashboardPage', 'VocabularyPage', 'FlashcardPage', 'WritingPage', 'ReviewPage', 'UnmasteredPage', 'SettingsPage'];

if (!fs.existsSync('src/pages')) {
  fs.mkdirSync('src/pages', { recursive: true });
}

pages.forEach(p => {
  const content = `import React from 'react';

export const ${p}: React.FC = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">${p.replace('Page', '')}</h1>
      <p className="text-gray-400">This is the placeholder for ${p}.</p>
    </div>
  );
};
`;
  fs.writeFileSync(`src/pages/${p}.tsx`, content);
});
