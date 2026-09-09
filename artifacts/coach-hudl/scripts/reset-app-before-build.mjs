import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(process.cwd());
const appPath = path.join(root, 'src', 'App.tsx');

if (!fs.existsSync(appPath)) process.exit(0);

// Every prebuild transformer edits App.tsx in place. Always start from the
// committed source so repeated Vercel builds cannot accumulate generated code.
try {
  const canonical = execFileSync('git', ['show', 'HEAD:artifacts/coach-hudl/src/App.tsx'], {
    cwd: path.resolve(root, '../..'),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (canonical.trim()) {
    fs.writeFileSync(appPath, canonical);
    console.log('Reset App.tsx to committed source before build transforms.');
  }
} catch (error) {
  // Some hosted build environments omit .git metadata. In that case leave the
  // checked-out source alone rather than making the build fail here.
  console.warn('Could not reset App.tsx from git HEAD; continuing with checked-out source.');
}
