import fs from 'node:fs';

const path = new URL('../src/ScoutDashboard.tsx', import.meta.url);
let source = fs.readFileSync(path, 'utf8');

const oldFormations = "const formations = useMemo(() => Array.from(new Set(source.map(p => clean(p.form)))).sort((a,b) => a.localeCompare(b)), [source]);";
const newFormations = "const formations = useMemo(() => Array.from(new Set(source.map(p => clean(p.form)))).sort((a,b) => { const ac = source.filter(p => clean(p.form) === a).length; const bc = source.filter(p => clean(p.form) === b).length; return bc - ac || a.localeCompare(b); }), [source]);";
if (source.includes(oldFormations)) source = source.replace(oldFormations, newFormations);

const oldTopGrid = '<div className="grid split-grid"><Card title="Scout snapshot" detail="Selected Scout File"><div className="kpi-grid">';
const newTopGrid = '<div className="grid split-grid" style={{ alignItems: \'start\' }}><Card title="Scout snapshot" detail="Selected Scout File" style={{ height: \'fit-content\' }}><div className="kpi-grid">';
if (source.includes(oldTopGrid)) source = source.replace(oldTopGrid, newTopGrid);

const oldProfile = '</div></Card><Card title="Run / pass profile" detail="What they want to do"><Bar label="Run calls"';
const newProfile = '</div></Card><Card title="Run / pass profile" detail="What they want to do" style={{ height: \'fit-content\' }}><Bar label="Run calls"';
if (source.includes(oldProfile)) source = source.replace(oldProfile, newProfile);

if (!source.includes('style={{ alignItems: \'start\' }}')) throw new Error('Scout top-grid layout patch did not apply.');
if (!source.includes('return bc - ac || a.localeCompare(b);')) throw new Error('Formation volume sort patch did not apply.');

fs.writeFileSync(path, source);
console.log('Scouting layout tightened and formation selector sorted by snap volume.');
