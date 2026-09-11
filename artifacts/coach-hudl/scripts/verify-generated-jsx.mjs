import fs from 'node:fs';
import path from 'node:path';

const appPath = path.join(path.resolve(process.cwd()), 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);

let source = fs.readFileSync(appPath, 'utf8');

// This is the FINAL pre-Vite pass. Some earlier transformers construct JSX
// inside JavaScript strings. Normalize only escape characters that are illegal
// immediately before JSX punctuation; leave normal JS string escapes alone.
source = source.replace(/\\+(?=["'`])/g, '');

const bad = [
  /className=\\+["']/,
  /htmlFor=\\+["']/,
  /id=\\+["']/,
  /data-testid=\\+["']/,
];
const failures = bad.filter(pattern => pattern.test(source));
if (failures.length) {
  throw new Error(`Generated App.tsx still contains malformed JSX attribute escaping (${failures.length} pattern(s))`);
}

fs.writeFileSync(appPath, source);
console.log('Final generated JSX validation passed; App.tsx is normalized before Vite.');
