import fs from 'node:fs';
import path from 'node:path';

const appPath = path.join(path.resolve(process.cwd()), 'src', 'App.tsx');
if (!fs.existsSync(appPath)) process.exit(0);

let source = fs.readFileSync(appPath, 'utf8');

// The committed App.tsx contains valid Live Game JSX. The build-time transforms
// can rewrite the field helper into an ambiguous arrow-expression form. Rebuild
// only that helper using an explicit function body so TypeScript/esbuild parses it
// unambiguously as TSX.
const liveStart = source.indexOf('function LiveSpreadsheetPage');
if (liveStart >= 0) {
  const fieldStart = source.indexOf('const field = (key: keyof Play, label: string, options?: string[]) =>', liveStart);
  const yardFieldStart = source.indexOf('const yardLineField =', fieldStart);

  if (fieldStart >= 0 && yardFieldStart > fieldStart) {
    const canonicalField = [
      'const field = (key: keyof Play, label: string, options?: string[]) => {',
      '  if (options) {',
      '    return (',
      '      <div className="field">',
      '        <label htmlFor={"live-" + key}>{label}</label>',
      '        <select id={"live-" + key} value={form[key]} onChange={event => update(key, event.target.value)} data-testid={"select-live-" + key}>',
      '          {options.map(option => <option key={option}>{option}</option>)}',
      '        </select>',
      '      </div>',
      '    );',
      '  }',
      '  return (',
      '    <div className="field">',
      '      <label htmlFor={"live-" + key}>{label}</label>',
      '      <input id={"live-" + key} className="input" value={form[key]} onChange={event => update(key, event.target.value)} data-testid={"input-live-" + key} />',
      '    </div>',
      '  );',
      '};',
      '',
    ].join('\n');
    source = source.slice(0, fieldStart) + canonicalField + source.slice(yardFieldStart);
    console.log('Rebuilt Live Game field helper with an explicit TSX function body.');
  }
}

const helperStart = source.indexOf('const field = (key: keyof Play, label: string, options?: string[]) =>');
const helperEnd = source.indexOf('const yardLineField =', helperStart);
const helper = helperStart >= 0 && helperEnd > helperStart ? source.slice(helperStart, helperEnd) : '';
if (/\\["']/.test(helper)) {
  throw new Error('Generated Live Game field helper still contains escaped JSX quotes');
}
if (helperStart < 0 || helperEnd < 0) {
  throw new Error('Generated Live Game field helper could not be located after repair');
}

fs.writeFileSync(appPath, source);
console.log('Final generated JSX validation passed; App.tsx is normalized before Vite.');
