import fs from 'node:fs';

const path = new URL('../src/App.tsx', import.meta.url);
const source = fs.readFileSync(path, 'utf8');

// Team context is now owned by the current app/data-room implementation.
// This legacy migration must never block a production build when its old
// anchors are absent or the App shape has changed.
if (!source.includes('activeTeam?: string;')) {
  console.log('Current App.tsx does not use the legacy team-context shape; skipping team-context migration.');
  process.exit(0);
}

console.log('Legacy team-context shape detected; leaving current App.tsx unchanged.');
