import fs from 'node:fs';

const path = new URL('../src/ScoutDashboard.tsx', import.meta.url);
let source = fs.readFileSync(path, 'utf8');

// Sort the Formation selector by actual snap volume. Keep the underlying value clean,
// but show the coach the count so the order is obvious.
const oldFormations = "const formations = useMemo(() => Array.from(new Set(source.map(p => clean(p.form)))).sort((a,b) => a.localeCompare(b)), [source]);";
const newFormations = "const formations = useMemo(() => Array.from(new Set(source.map(p => clean(p.form)))).map(form => ({ form, total: source.filter(p => clean(p.form) === form).length })).sort((a,b) => b.total - a.total || a.form.localeCompare(b.form)).map(x => x.form), [source]);";
if (!source.includes(newFormations)) source = source.replace(oldFormations, newFormations);

const oldSelect = "{formations.map(f => <option key={f}>{f}</option>)}";
const newSelect = "{formations.map(f => <option key={f} value={f}>{f} — {source.filter(p => clean(p.form) === f).length} snaps</option>)}";
if (!source.includes(newSelect)) source = source.replace(oldSelect, newSelect);

// Add a real PowerPoint download alongside the browser print/PDF option. The generator
// creates a standards-compliant .pptx ZIP directly in the browser, so no server is needed.
const oldImports = "import { Activity, Download, Printer, Search, TrendingUp, Target, X, Zap } from 'lucide-react';";
const newImports = "import { Activity, Download, FileDown, Printer, Search, TrendingUp, Target, X, Zap } from 'lucide-react';";
if (!source.includes('FileDown') && source.includes(oldImports)) source = source.replace(oldImports, newImports);

const marker = "function Slide({ number, title, subtitle, children }: { number: number; title: string; subtitle?: string; children: ReactNode }) {";
if (!source.includes('function downloadScoutingPptx(')) {
  const helper = String.raw`
function escXml(value: string) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) { crc ^= data[i]; for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function u16(n: number) { return new Uint8Array([n & 255, (n >>> 8) & 255]); }
function u32(n: number) { return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]); }
function concatBytes(parts: Uint8Array[]) { const total = parts.reduce((n, p) => n + p.length, 0); const out = new Uint8Array(total); let at = 0; for (const p of parts) { out.set(p, at); at += p.length; } return out; }
function zipStore(files: Record<string, string>) {
  const enc = new TextEncoder(); const locals: Uint8Array[] = []; const centrals: Uint8Array[] = []; let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const nb = enc.encode(name), db = enc.encode(text), crc = crc32(db);
    const local = concatBytes([new Uint8Array([80,75,3,4,20,0,0,0,0,0,0,0,0,0]), u32(crc), u32(db.length), u32(db.length), u16(nb.length), u16(0), nb, db]);
    locals.push(local);
    const central = concatBytes([new Uint8Array([80,75,1,2,20,0,20,0,0,0,0,0,0,0]), u32(crc), u32(db.length), u32(db.length), u16(nb.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nb]);
    centrals.push(central); offset += local.length;
  }
  const body = concatBytes(locals); const central = concatBytes(centrals); const end = concatBytes([new Uint8Array([80,75,5,6,0,0,0,0]), u16(centrals.length), u16(centrals.length), u32(central.length), u32(body.length), u16(0)]);
  return concatBytes([body, central, end]);
}
function pptTextShape(id: number, text: string, x: number, y: number, w: number, h: number, size = 20, bold = false) {
  return '<p:sp><p:nvSpPr><p:cNvPr id="' + id + '" name="Text ' + id + '"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + w + '" cy="' + h + '"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="' + (size * 100) + '" b="' + (bold ? 1 : 0) + '"/><a:t>' + escXml(text) + '</a:t></a:r><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>';
}
function pptSlideXml(title: string, subtitle: string, rows: string[], page: number) {
  const shapes = [pptTextShape(2, 'COACH HUDL · SCOUTING', 500000, 250000, 8500000, 300000, 900, true), pptTextShape(3, title, 500000, 650000, 8500000, 650000, 2600, true), pptTextShape(4, subtitle, 500000, 1250000, 8500000, 350000, 1100, false)];
  rows.slice(0, 16).forEach((r, i) => shapes.push(pptTextShape(10 + i, r, 650000, 1750000 + i * 320000, 8200000, 260000, 1350, i === 0)));
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>' + shapes.join('') + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
}
function downloadScoutingPptx(slides: {title:string; subtitle:string; rows:string[]}[]) {
  const files: Record<string,string> = {};
  files['[Content_Types].xml'] = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' + slides.map((_,i)=>'<Override PartName="/ppt/slides/slide'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>').join('') + '</Types>';
  files['_rels/.rels'] = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>';
  files['ppt/presentation.xml'] = '<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>' + slides.map((_,i)=>'<p:sldId id="'+(256+i)+'" r:id="rId'+(i+2)+'"/>').join('') + '</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>';
  files['ppt/_rels/presentation.xml.rels'] = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>' + slides.map((_,i)=>'<Relationship Id="rId'+(i+2)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide'+(i+1)+'.xml"/>').join('') + '</Relationships>';
  files['ppt/slideMasters/slideMaster1.xml'] = '<?xml version="1.0" encoding="UTF-8"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles/></p:sldMaster>';
  files['ppt/slideMasters/_rels/slideMaster1.xml.rels'] = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>';
  files['ppt/slideLayouts/slideLayout1.xml'] = '<?xml version="1.0" encoding="UTF-8"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>';
  slides.forEach((s,i)=>{ files['ppt/slides/slide'+(i+1)+'.xml']=pptSlideXml(s.title,s.subtitle,s.rows,i+1); files['ppt/slides/_rels/slide'+(i+1)+'.xml.rels']='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>'; });
  const blob = new Blob([zipStore(files)], {type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='scouting-report.pptx'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
`;
  source = source.replace(marker, helper + '\n' + marker);
}

// Wire the PPTX button into the existing presentation controls.
const oldAction = "<div className=\"scout-slide-action\"><button className=\"btn btn-primary\" onClick={() => window.print()}><Printer /> Print / Save as PDF</button></div>";
const newAction = "<div className=\"scout-slide-action\"><button className=\"btn btn-primary\" onClick={() => downloadScoutingPptx([{title:`${opponent} Scouting Report`,subtitle:`${filtered.length} snaps · Selected Scout File`,rows:[`${filtered.length} snaps`,`${pct(runs.length,filtered.length)}% run · ${pct(passes.length,filtered.length)}% pass`,`${avg(filtered)} average yards`,`${explosive.length} explosive plays`]}, {title:'Formation Tendencies',subtitle:'Highest-volume formations first',rows:formationStats.slice(0,10).map(x=>`${x.form} · ${x.total} snaps · ${pct(x.runs,x.total)}% run · ${pct(x.passes,x.total)}% pass`)}, {title:'Down & Distance',subtitle:'Situational tendencies',rows:downStats.map(x=>`${x.label} · ${x.total} snaps · ${x.runPct}% run · ${x.passPct}% pass`)}, {title:'Field Position',subtitle:'Five-zone breakdown',rows:zoneStats.map(x=>`${x.label} · ${x.total} snaps · ${x.runPct}% run · ${x.passPct}% pass`)}, {title:'Backfield & Motion Tells',subtitle:'Pre-snap indicators',rows:[...backfieldStats.map(x=>`${x.value} · ${x.total} snaps · ${x.runPct}% run`),...motionStats.map(x=>`Motion: ${x.value} · ${x.total} snaps · ${x.runPct}% run`)]}, {title:'Top Concepts & Calls',subtitle:'Highest-volume calls',rows:topCalls.map(x=>`${x.call} · ${x.total} snaps · ${pct(x.runs,x.total)}% run · ${x.avg} avg`)}, {title:'Automated Scouting Verdict',subtitle:'Signals worth carrying into the meeting',rows:alerts}, {title:'Key Explosive Plays',subtitle:'12+ yard gains',rows:explosive.slice(0,12).map(p=>`#${p.playNo} · ${clean(p.form)} · ${clean(p.offPlay)} · ${p.gnls}`)}])}><FileDown /> Download PPT</button><button className=\"btn btn-ghost\" onClick={() => window.print()}><Printer /> Print / Save as PDF</button></div>";
if (!source.includes('Download PPT') && source.includes(oldAction)) source = source.replace(oldAction, newAction);

fs.writeFileSync(path, source);
console.log('Scouting dashboard fixes applied.');
