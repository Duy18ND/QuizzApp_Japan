import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

/**
 * `@fontsource/*` declares both `.woff2` and legacy `.woff` across 120+ Unicode subsets,
 * doubling emitted font files (~510 extra `.woff` files / ~18 MB) even though every
 * modern browser supports WOFF2. Stripping the `.woff` fallback keeps identical glyphs
 * and weights while halving build artifacts.
 */
function woff2OnlyFontsource(): Plugin {
  return {
    name: 'woff2-only-fontsource',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('@fontsource') || !id.endsWith('.css')) return null;
      return {
        code: code.replace(/,\s*url\([^)]+\.woff\)\s*format\(['"]woff['"]\)/g, ''),
        map: null,
      };
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [woff2OnlyFontsource(), react(), tailwindcss()],
  base: '/QuizzApp_Japan/',
  build: {
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (normalized.includes('node_modules/')) {
            if (
              normalized.includes('/react/') ||
              normalized.includes('/react-dom/') ||
              normalized.includes('/react-router-dom/') ||
              normalized.includes('/react-router/')
            ) {
              return 'vendor-react';
            }
            if (
              normalized.includes('/@reduxjs/toolkit/') ||
              normalized.includes('/react-redux/') ||
              normalized.includes('/redux')
            ) {
              return 'vendor-state';
            }
            if (normalized.includes('/@supabase/')) return 'vendor-supabase';
            if (normalized.includes('/lucide-react/')) return 'vendor-icons';
            if (normalized.includes('/hanzi-writer/')) return 'vendor-hanzi';
          }
          if (normalized.includes('/src/data/jlpt/')) return 'data-jlpt';
          if (normalized.includes('/src/data/grammar/')) return 'data-grammar';
          if (
            normalized.includes('/src/data/n3/') ||
            normalized.includes('/src/data/n4/') ||
            normalized.includes('/src/data/n5/') ||
            normalized.includes('/src/data/unitData') ||
            normalized.includes('/src/data/vocabTextbooks') ||
            normalized.includes('/src/data/index')
          ) {
            return 'data-vocab';
          }
          if (normalized.includes('/src/data/kanji/')) return 'data-kanji';
          return undefined;
        },
      },
    },
  },
});
