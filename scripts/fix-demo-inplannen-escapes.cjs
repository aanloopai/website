#!/usr/bin/env node
// Fix over-escape artifact in src/pages/demo-inplannen.astro from sessie-22 codemod.
// Removes backslash before backtick and before ${ in <script type="module"> block.
const fs = require('fs');
const path = require('path');

const fp = path.join(__dirname, '..', 'src', 'pages', 'demo-inplannen.astro');
let s = fs.readFileSync(fp, 'utf8');
const before = s.length;
s = s.split('\\`').join('`');
s = s.split('\\${').join('${');
fs.writeFileSync(fp, s);
console.log(`Fixed ${fp}: ${before} -> ${s.length} bytes`);
