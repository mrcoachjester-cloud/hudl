import fs from 'node:fs';
import path from 'node:path';

const appPath = path.join(path.resolve(process.cwd()), 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);

let source = fs.readFileSync(appPath, 'utf8');

// The committed App.tsx already contains valid JSX. The build-time transform
// chain is creating an invalid copy of the Live Game field helper. Replace only
// that generated helper with a literal, valid JSX implementation.
const liveStart = source.indexOf('function LiveSpreadsheetPage');
if (liveStart >= 0) {
  const fieldStart = source.indexOf('const field = (key: keyof Play, label: string, options?: string[]) =>', liveStart);
  const yardFieldStart = source.indexOf('const yardLineField =', fieldStart);

  if (fieldStart >= 0 && yardFieldStart > fieldStart) {
    const canonicalField = [
      'const field = (key: keyof Play, label: string, options?: string[]) =>',
      '  options ? (',
      '    <div className="field">',
      '      <label htmlFor={"live-" + key}>{label}</label>',
      '      <select id={"live-" + key} value={form[key]} onChange={event => update(key, event.target.value)} data-testid={"select-live-" + key}>',
      '        {options.map(option => <option key={option}>{option}</option>)}',
      '      </select>',
      '    </div>',
      '  ) : (',
      '    <div className="field">',
      '      <label htmlFor={"live-" + key}>{label}</label>',
      '      <input id={"live-" + key} className="input" value={form[key]} onChange={event => update(key, event.target.value)} data-testid={"input-live-" + key} />',
      '    </div>',
      '  );',
      '',
    ].join('\n');
    source = source.slice(0, fieldStart) + canonicalField + source.slice(yardFieldStart);
    console.log('Rebuilt generated Live Game field helper as explicit JSX.');
  }
}

// Fail closed if this exact helper still contains escaped JSX quotes.
const helperStart = source.indexOf('const field = (key: keyof Play, label: string, options?: string[]) =>');
const helperEnd = source.indexOf('const yardLineField =', helperStart);
const helper = helperStart >= 0 && helperEnd > helperStart ? source.slice(helperStart, helperEnd) : '';
if (/\\["']/.test(helper)) {
  throw new Error('Generated Live Game field helper still contains escaped JSX quotes');
}

fs.writeFileSync(appPath, source);
console.log('Final generated JSX validation passed; App.tsx is normalized before Vite.');
