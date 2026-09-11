import fs from 'node:fs';
import path from 'node:path';

const appPath = path.join(path.resolve(process.cwd()), 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);

let source = fs.readFileSync(appPath, 'utf8');

// This is the FINAL pre-Vite pass. Some earlier transformers construct JSX
// inside JavaScript strings. Normalize escaped JSX quotes first.
source = source.replace(/\\+(?=["'`])/g, '');

// One legacy Live Game transformer can partially reconstruct the `field` helper
// and leave escaped quotes only in the ternary branch. Repair that helper from
// the canonical source shape rather than applying another broad App.tsx rewrite.
const liveStart = source.indexOf('function LiveSpreadsheetPage');
if (liveStart >= 0) {
  const fieldStart = source.indexOf('  const field = (key: keyof Play, label: string, options?: string[]) =>', liveStart);
  const yardFieldStart = source.indexOf('  const yardLineField =', fieldStart);

  if (fieldStart >= 0 && yardFieldStart > fieldStart) {
    const canonicalField = `  const field = (key: keyof Play, label: string, options?: string[]) => <div className="field"><label htmlFor={\`live-\${key}\`}>{label}</label>{options ? <select id={\`live-\${key}\`} value={form[key]} onChange={event => update(key, event.target.value)} data-testid={\`select-live-\${key}\`}>{options.map(option => <option key={option}>{option}</option>)}</select> : <input id={\`live-\${key}\`} className="input" value={form[key]} onChange={event => update(key, event.target.value)} data-testid={\`input-live-\${key}\`} />}</div>;
`;
    source = source.slice(0, fieldStart) + canonicalField + source.slice(yardFieldStart);
    console.log('Repaired generated Live Game field helper from canonical JSX.');
  }
}

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
