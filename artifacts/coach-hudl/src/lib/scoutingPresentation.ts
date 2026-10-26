import type { StandardPlay } from './footballData';

export type PresentationMeta = { opponent: string; reportDate: string; week: string; gameType: string; location: string; preparedBy: string; notes: string };
type Any = Record<string, any>;
declare global { interface Window { jspdf?: { jsPDF: new (options?: Any) => Any }; PptxGenJS?: new () => Any } }

function loadScript(src: string, name: 'jspdf' | 'PptxGenJS'): Promise<void> {
  if (name === 'jspdf' && window.jspdf?.jsPDF || name === 'PptxGenJS' && window.PptxGenJS) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = src; script.async = true;
    script.onload = () => (name === 'jspdf' ? !!window.jspdf?.jsPDF : !!window.PptxGenJS) ? resolve() : reject(new Error('Presentation library did not initialize.'));
    script.onerror = () => reject(new Error('Could not load presentation exporter. Check internet access and try again.'));
    document.head.appendChild(script);
  });
}
const txt = (v: unknown, fallback = '—') => String(v ?? '').trim() || fallback;
const gain = (p: StandardPlay) => { const m = String(p.gnls ?? '').match(/-?\d+/); return m ? Number(m[0]) : 0; };
const run = (p: StandardPlay) => /run|scramble/i.test(p.type || '');
const pass = (p: StandardPlay) => /pass/i.test(p.type || '') && !/scramble/i.test(p.type || '');
const explosive = (p: StandardPlay) => run(p) ? gain(p) >= 15 : pass(p) ? gain(p) >= 20 : false;
const pct = (n: number, total: number) => total ? Math.round(n / total * 100) : 0;
const avg = (rows: StandardPlay[]) => rows.length ? (rows.reduce((s, p) => s + gain(p), 0) / rows.length).toFixed(1) : '0.0';
const success = (p: StandardPlay) => { const d = Number(p.dn), dist = Math.max(1, Number(p.dist) || 1), g = gain(p); return d === 1 ? g >= Math.max(4, dist * .4) : d === 2 ? g >= Math.max(4, dist * .6) : d === 3 || d === 4 ? g >= dist : g >= 4; };
const summary = (rows: StandardPlay[]) => ({ total: rows.length, runs: rows.filter(run).length, passes: rows.filter(pass).length, runPct: pct(rows.filter(run).length, rows.length), passPct: pct(rows.filter(pass).length, rows.length), avg: avg(rows), successPct: pct(rows.filter(success).length, rows.length), explosives: rows.filter(explosive).length, explosivePct: pct(rows.filter(explosive).length, rows.length) });
function groups(rows: StandardPlay[], get: (p: StandardPlay) => string) {
  const map = new Map<string, StandardPlay[]>(); rows.forEach(p => { const k = txt(get(p), 'Unknown'); map.set(k, [...(map.get(k) ?? []), p]); });
  return [...map.entries()].map(([name, plays]) => ({ name, plays, n: plays.length })).sort((a, b) => b.n - a.n);
}
function safeName(v: string) { return v.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 60) || 'Opponent'; }
function reportData(plays: StandardPlay[], meta: PresentationMeta) {
  const formations = groups(plays, p => p.form).slice(0, 8).map(g => { const s = summary(g.plays); return [g.name, String(g.n), `${s.runPct}%`, `${s.passPct}%`, s.avg, `${s.successPct}%`]; });
  const concepts = groups(plays, p => txt(p.offPlay, txt(p.scheme, 'Unknown'))).slice(0, 8).map(g => { const s = summary(g.plays); return [g.name, g.plays.filter(run).length >= g.plays.filter(pass).length ? 'RUN' : 'PASS', String(g.n), `${pct(g.n, plays.length)}%`, s.avg, `${s.successPct}%`, `${s.explosivePct}%`]; });
  const downs = [1, 2, 3].map(d => { const ps = plays.filter(p => Number(p.dn) === d); return { d, ps, s: summary(ps), forms: groups(ps, p => p.form).slice(0, 5).map(g => [g.name, String(g.n), `${pct(g.plays.filter(run).length, g.n)}% R`, `${pct(g.plays.filter(pass).length, g.n)}% P`]), calls: groups(ps, p => txt(p.offPlay, txt(p.scheme))).slice(0, 5).map(g => [g.name, String(g.n), `${pct(g.n, ps.length)}%`]) }; });
  const backfields = groups(plays, p => p.backfield).slice(0, 6).map(g => [g.name, String(g.n), `${pct(g.n, plays.length)}%`, `${pct(g.plays.filter(run).length, g.n)}% R / ${pct(g.plays.filter(pass).length, g.n)}% P`]);
  const motions = groups(plays, p => p.motion).filter(g => !/^(none|—)$/i.test(g.name)).slice(0, 6).map(g => [g.name, String(g.n), `${pct(g.n, plays.length)}%`, `${pct(g.plays.filter(run).length, g.n)}% R / ${pct(g.plays.filter(pass).length, g.n)}% P`]);
  const verdict = [summary(plays).runPct >= 60 ? `Run-leaning: ${summary(plays).runPct}% of charted snaps are runs/QB scrambles.` : summary(plays).passPct >= 60 ? `Pass-leaning: ${summary(plays).passPct}% of charted snaps are passes.` : 'Balanced profile: align to formation and down-and-distance.', groups(plays, p => p.form)[0] ? `Top formation: ${groups(plays, p => p.form)[0].name} (${groups(plays, p => p.form)[0].n} snaps).` : 'No formation values were supplied.', ...downs.filter(d => d.ps.length).map(d => `${d.d}st/nd/rd down: ${d.s.runPct}% run, ${d.s.passPct}% pass across ${d.ps.length} snaps.`), meta.notes.trim() ? `Coach notes: ${meta.notes.trim()}` : ''];
  const explosives = plays.filter(explosive).sort((a, b) => gain(b) - gain(a)).map(p => [`#${txt(p.playNo)}`, `${txt(p.dn)} & ${txt(p.dist)}`, txt(p.form), txt(p.offPlay, txt(p.scheme)), txt(p.type), gain(p) > 0 ? `+${gain(p)}` : String(gain(p)), txt(p.yardLn)]);
  return { meta, plays, stats: summary(plays), formations, concepts, downs, backfields, motions, verdict: verdict.filter(Boolean), explosives };
}
export async function downloadScoutingPresentation(plays: StandardPlay[], meta: PresentationMeta) {
  if (!plays.length) throw new Error('There are no scouting plays for the selected team to include.');
  await Promise.all([
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf'),
    loadScript('https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js', 'PptxGenJS'),
  ]);
  const r = reportData(plays, meta), base = `Coach-Hudl-${safeName(meta.opponent)}-${meta.reportDate || new Date().toISOString().slice(0, 10)}`;
  makePdf(r, base); await makePptx(r, base);
}
function makePdf(r: ReturnType<typeof reportData>, base: string) {
  const doc = new window.jspdf!.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), m = 34; let page = 0;
  const pageHead = (title: string) => { if (page) doc.addPage(); page++; doc.setFillColor(32,18,66); doc.rect(0,0,W,50,'F'); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text(title, m, 29, { maxWidth: W-2*m }); doc.setTextColor(55,50,65); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text(`${r.meta.opponent} · ${r.meta.reportDate} · ${r.stats.total} scouting plays`, m, H-18); doc.text(String(page), W-m, H-18, {align:'right'}); };
  const table = (title: string, heads: string[], rows: string[][], proportions: number[]) => {
    const usable = W-2*m, widths = proportions.map(v => v*usable), maxRows = 10; const chunks = rows.length ? Array.from({length: Math.ceil(rows.length/maxRows)}, (_,i)=>rows.slice(i*maxRows,(i+1)*maxRows)) : [[]];
    chunks.forEach((chunk, ci) => {
      pageHead(ci ? `${title} — continued` : title); const y0=68, hh=23, rh=31; let x=m;
      doc.setFillColor(74,40,127); doc.rect(m,y0,usable,hh,'F'); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(255,255,255);
      heads.forEach((h,i)=>{ doc.text(h,x+4,y0+15,{maxWidth:Math.max(18,widths[i]-8)}); x+=widths[i]; });
      chunk.forEach((row,ri)=>{ const y=y0+hh+ri*rh; if(y+rh>H-34) throw new Error('PDF pagination safety check failed.'); if(ri%2===0){doc.setFillColor(247,245,250);doc.rect(m,y,usable,rh,'F');} let cx=m; row.forEach((cell,i)=>{doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(40,38,50); const lines=doc.splitTextToSize(String(cell ?? '—'),Math.max(16,widths[i]-8)); doc.text(lines.slice(0,3),cx+4,y+11,{maxWidth:Math.max(16,widths[i]-8)}); cx+=widths[i];}); doc.setDrawColor(225,221,232);doc.line(m,y+rh,W-m,y+rh);});
    });
  };
  doc.setFillColor(32,18,66);doc.rect(0,0,W,H,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(29);doc.text('COACH HUDL',m,110);doc.setFontSize(23);doc.text('SCOUTING PRESENTATION',m,150,{maxWidth:W-2*m});doc.setFont('helvetica','normal');doc.setFontSize(17);doc.text(r.meta.opponent||'Opponent',m,192,{maxWidth:W-2*m});doc.setFontSize(10);doc.text([r.meta.reportDate,r.meta.week&&`Week ${r.meta.week}`,r.meta.gameType,r.meta.location,r.meta.preparedBy&&`Prepared by ${r.meta.preparedBy}`].filter(Boolean).join(' · '),m,220,{maxWidth:W-2*m});doc.setFontSize(12);doc.text(`${r.stats.total} plays · ${r.stats.runPct}% run · ${r.stats.passPct}% pass · ${r.stats.explosives} explosives`,m,265);
  table('OFFENSIVE PROFILE',['Metric','Value'],[['Total plays',String(r.stats.total)],['Run / pass',`${r.stats.runPct}% / ${r.stats.passPct}%`],['Average gain',r.stats.avg],['Success rate',`${r.stats.successPct}%`],['Explosive plays',`${r.stats.explosives} (${r.stats.explosivePct}%)`]], [.55,.45]);
  table('FORMATION TENDENCIES',['Formation','Snaps','Run %','Pass %','Avg gain','Success %'],r.formations,[.28,.11,.13,.13,.15,.20]);
  table('PLAY CONCEPT BREAKDOWN',['Concept','Type','Count','% total','Avg','Success','Explosive'],r.concepts,[.25,.1,.1,.12,.12,.15,.16]);
  r.downs.forEach(d=>{table(`${d.d} DOWN PROFILE`,['Metric','Value'],[['Plays',String(d.ps.length)],['Run / pass',`${d.s.runPct}% / ${d.s.passPct}%`],['Average gain',d.s.avg],['Success rate',`${d.s.successPct}%`],['Explosive rate',`${d.s.explosivePct}%`]], [.55,.45]);table(`DOWN ${d.d} FORMATIONS`,['Formation','Snaps','Run','Pass'],d.forms,[.45,.15,.2,.2]);table(`DOWN ${d.d} CONCEPTS`,['Concept','Snaps','Share'],d.calls,[.5,.2,.3]);});
  table('BACKFIELD TENDENCIES',['Backfield','Snaps','Share','Run / pass'],r.backfields,[.3,.15,.2,.35]);table('MOTION TELLS',['Motion','Snaps','Share','Run / pass'],r.motions,[.3,.15,.2,.35]);table('SCOUTING VERDICT & COACH NOTES',['#','Assessment'],r.verdict.map((v,i)=>[String(i+1),v]),[.08,.92]);table('KEY EXPLOSIVE PLAYS',['Play','Down/dist','Formation','Concept','Type','Gain','Field pos'],r.explosives,[.08,.13,.16,.22,.12,.1,.17]);
  doc.save(`${base}.pdf`);
}
async function makePptx(r: ReturnType<typeof reportData>, base: string) {
  const pptx = new (window.PptxGenJS!)(); pptx.layout='LAYOUT_WIDE';pptx.author=r.meta.preparedBy||'Coach Hudl';pptx.subject=`Scouting report: ${r.meta.opponent}`;pptx.title=`Coach Hudl Scouting Presentation — ${r.meta.opponent}`;
  const W=13.333,H=7.5,m=.55,navy='201242',purple='4A287F',light='F5F3F8',ink='282536';
  const addText=(s: Any,t: unknown,x:number,y:number,w:number,h:number,opts:Any={})=>{if(x<0||y<0||x+w>W+.01||y+h>H+.01)throw new Error('PowerPoint layout safety check failed: content exceeds slide bounds.');s.addText(String(t??'—'),{x,y,w,h,fontFace:'Aptos',fontSize:Math.min(opts.fontSize??10,Math.max(7,Math.floor(h*15))),color:ink,margin:.04,breakLine:false,valign:'mid',fit:'shrink',...opts});};
  const slide=(title:string)=>{const s=pptx.addSlide();s.background={color:'FFFFFF'};s.addShape(pptx.ShapeType.rect,{x:0,y:0,w:W,h:.78,fill:{color:navy},line:{color:navy}});addText(s,title,m,.12,W-2*m,.34,{fontSize:20,bold:true,color:'FFFFFF',margin:0});addText(s,`${r.meta.opponent} · ${r.meta.reportDate} · ${r.stats.total} scouting plays`,m,7.18,W-2*m,.15,{fontSize:7,color:'666174',margin:0});addText(s,String(pptx._slides.length),W-.7,7.18,.2,.15,{fontSize:7,color:'666174',align:'right',margin:0});return s;};
  const table=(title:string,heads:string[],rows:string[][],ratios:number[])=>{const per=10,chunks=rows.length?Array.from({length:Math.ceil(rows.length/per)},(_,i)=>rows.slice(i*per,(i+1)*per)):[[]];chunks.forEach((chunk,ci)=>{const s=slide(ci?`${title} (continued)`:title),x0=m,y0=1.15,tw=W-2*m,hh=.4,rh=Math.min(.48,5.1/Math.max(1,chunk.length));let x=x0;heads.forEach((h,i)=>{const w=ratios[i]*tw;s.addShape(pptx.ShapeType.rect,{x,y:y0,w,h:hh,fill:{color:purple},line:{color:purple}});addText(s,h,x+.03,y0+.02,w-.06,hh-.04,{fontSize:8,bold:true,color:'FFFFFF',margin:.01});x+=w;});chunk.forEach((row,ri)=>{const y=y0+hh+ri*rh;if(y+rh>6.95)throw new Error('PowerPoint pagination safety check failed: row overlaps footer.');let cx=x0;row.forEach((v,i)=>{const w=ratios[i]*tw;s.addShape(pptx.ShapeType.rect,{x:cx,y,w,h:rh,fill:{color:ri%2? 'FFFFFF':light},line:{color:'E1DDE8',width:.5}});addText(s,v,cx+.03,y+.02,w-.06,rh-.04,{fontSize:8,margin:.01});cx+=w;});});});};
  const cover=pptx.addSlide();cover.background={color:navy};addText(cover,'COACH HUDL',.7,1,11.9,.5,{fontSize:24,bold:true,color:'D9B45B',margin:0});addText(cover,'SCOUTING PRESENTATION',.7,1.8,11.9,.8,{fontSize:30,bold:true,color:'FFFFFF',margin:0});addText(cover,r.meta.opponent||'Opponent',.7,2.8,11.9,.55,{fontSize:23,color:'FFFFFF',margin:0});addText(cover,[r.meta.reportDate,r.meta.week&&`Week ${r.meta.week}`,r.meta.gameType,r.meta.location,r.meta.preparedBy&&`Prepared by ${r.meta.preparedBy}`].filter(Boolean).join(' · '),.7,3.5,11.9,.45,{fontSize:12,color:'E2DDF0',margin:0});addText(cover,`${r.stats.total} plays · ${r.stats.runPct}% run · ${r.stats.passPct}% pass · ${r.stats.explosives} explosives`,.7,4.45,11.9,.45,{fontSize:14,color:'D9B45B',margin:0});
  table('OFFENSIVE PROFILE',['Metric','Value'],[['Total plays',String(r.stats.total)],['Run / pass',`${r.stats.runPct}% / ${r.stats.passPct}%`],['Average gain',r.stats.avg],['Success rate',`${r.stats.successPct}%`],['Explosive plays',`${r.stats.explosives} (${r.stats.explosivePct}%)`]], [.55,.45]);
  table('FORMATION TENDENCIES',['Formation','Snaps','Run %','Pass %','Avg gain','Success %'],r.formations,[.28,.11,.13,.13,.15,.20]);table('PLAY CONCEPT BREAKDOWN',['Concept','Type','Count','% total','Avg','Success','Explosive'],r.concepts,[.25,.1,.1,.12,.12,.15,.16]);
  r.downs.forEach(d=>{table(`${d.d} DOWN PROFILE`,['Metric','Value'],[['Plays',String(d.ps.length)],['Run / pass',`${d.s.runPct}% / ${d.s.passPct}%`],['Average gain',d.s.avg],['Success rate',`${d.s.successPct}%`],['Explosive rate',`${d.s.explosivePct}%`]], [.55,.45]);table(`DOWN ${d.d} FORMATIONS`,['Formation','Snaps','Run','Pass'],d.forms,[.45,.15,.2,.2]);table(`DOWN ${d.d} CONCEPTS`,['Concept','Snaps','Share'],d.calls,[.5,.2,.3]);});
  table('BACKFIELD TENDENCIES',['Backfield','Snaps','Share','Run / pass'],r.backfields,[.3,.15,.2,.35]);table('MOTION TELLS',['Motion','Snaps','Share','Run / pass'],r.motions,[.3,.15,.2,.35]);table('SCOUTING VERDICT & COACH NOTES',['#','Assessment'],r.verdict.map((v,i)=>[String(i+1),v]),[.08,.92]);table('KEY EXPLOSIVE PLAYS',['Play','Down/dist','Formation','Concept','Type','Gain','Field pos'],r.explosives,[.08,.13,.16,.22,.12,.1,.17]);
  await pptx.writeFile({fileName:`${base}.pptx`});
}
