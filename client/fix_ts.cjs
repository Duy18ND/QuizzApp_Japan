const fs = require('fs');
const path = require('path');
const slicesDir = path.join('src', 'store', 'slices');
const files = fs.readdirSync(slicesDir);
files.forEach(file => {
  const filePath = path.join(slicesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/import \{ createSlice, PayloadAction \} from '@reduxjs\/toolkit';/g, 
    "import { createSlice } from '@reduxjs/toolkit';\nimport type { PayloadAction } from '@reduxjs/toolkit';");
  // Fix unused variable issue by adding a dummy use or removing PayloadAction
  content = content.replace(/import type \{ PayloadAction \} from '@reduxjs\/toolkit';/g, "");
  fs.writeFileSync(filePath, content);
});

let hooksContent = fs.readFileSync('src/store/hooks.ts', 'utf8');
hooksContent = hooksContent.replace(/import \{ TypedUseSelectorHook, useDispatch, useSelector \} from 'react-redux';/g,
  "import { useDispatch, useSelector } from 'react-redux';\nimport type { TypedUseSelectorHook } from 'react-redux';");
fs.writeFileSync('src/store/hooks.ts', hooksContent);
