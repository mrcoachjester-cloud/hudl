import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const appPath = path.join(root, 'src', 'App.tsx');
let source = fs.readFileSync(appPath, 'utf8');

if (!source.includes("import ScoutDashboard from './ScoutDashboard';")) {
  source = source.replace("import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';", "import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';\nimport ScoutDashboard from './ScoutDashboard';");
}

const start = source.indexOf('function ScoutPage(');
const end = source.indexOf('\nfunction LivePage(', start);
if (start < 0 || end < 0) throw new Error('Could not locate ScoutPage boundaries in App.tsx');

const replacement = `function ScoutPage({ data }: { data: Dataset }) {\n  return <ScoutDashboard data={data} />;\n}\n`;
source = source.slice(0, start) + replacement + source.slice(end + 1);
fs.writeFileSync(appPath, source);
console.log('Full Scouting dashboard wired into ScoutPage.');
