const fs = require('fs');

if (!fs.existsSync('src/store')) {
  fs.mkdirSync('src/store');
}
if (!fs.existsSync('src/store/slices')) {
  fs.mkdirSync('src/store/slices');
}

const slices = [
  'appSlice',
  'vocabularySlice',
  'quizSlice',
  'flashcardSlice',
  'learningSlice',
  'reviewSlice',
  'writingSlice'
];

let indexImports = '';
let indexReducers = '';

slices.forEach(s => {
  const name = s.replace('Slice', '');
  const content = `import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ${s.charAt(0).toUpperCase() + s.slice(1)}State {
  // TODO: Define state
}

const initialState: ${s.charAt(0).toUpperCase() + s.slice(1)}State = {
  
};

const ${s} = createSlice({
  name: '${name}',
  initialState,
  reducers: {
    // TODO: Define reducers
  },
});

export const { } = ${s}.actions;
export default ${s}.reducer;
`;
  fs.writeFileSync(`src/store/slices/${s}.ts`, content);
  
  indexImports += `import ${name}Reducer from './slices/${s}';\n`;
  indexReducers += `    ${name}: ${name}Reducer,\n`;
});

const indexContent = `import { configureStore } from '@reduxjs/toolkit';
${indexImports}

export const store = configureStore({
  reducer: {
${indexReducers}
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`;
fs.writeFileSync('src/store/index.ts', indexContent);

const hooksContent = `import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// Use throughout your app instead of plain \`useDispatch\` and \`useSelector\`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
`;
fs.writeFileSync('src/store/hooks.ts', hooksContent);

console.log('Redux store setup complete.');
