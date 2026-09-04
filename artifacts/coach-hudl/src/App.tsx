import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { getGames, getSeasons } from './lib/footballData';
import { Check, ChevronRight, CircleAlert, ClipboardList, Download, FileSpreadsheet, Film, LayoutDashboard, Menu, Plus, RefreshCw, Search, Shield, Sparkles, Target, Trash2, UploadCloud, Users, X, Zap } from 'lucide-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

type Play = {
  playNo: string;
  odk: string;
  dn: string;
  dist: string;
  hash: string;
  gnls: string;
  carrier: string;
  yardLn: string;
  type: string;
  result: string;
  form: string;
  personnel: string;
  scheme: string;
  defense: string;
  motion: string;
  offPlay: string;
  dir: string;
  backfield: string;
};

type ScheduleGame = { id: string; season: string; opponent: string; date: string; location: string; result: string; archived: boolean };
type Dataset = { scouting: Play[]; live: Play[]; schedule: ScheduleGame[]; activeGameId: string };
type NavKey = '/' | '/upload' | '/scout' | '/live' | '/reports' | '/schedule';

const STORAGE_KEY = 'coach-hudl-datasets-v1';
const demoSchedule: ScheduleGame[] = [
  { id: 'game-2024-north-ridge', season: '2024', opponent: 'North Ridge', date: '2024-10-18', location: 'Home', result: '—', archived: false },
  { id: 'game-2023-river-city', season: '2023', opponent: 'River City', date: '2023-10-20', location: 'Away', result: 'W 28-14', archived: true },
];
const demoScouting: Play[] = [
  { playNo:'01', odk:'O', dn:'1', dist:'10', hash:'R', gnls:'7', carrier:'M. Carter', yardLn:'OWN 22', type:'Run', result:'Inside Zone +4', form:'11 Personnel', personnel:'11', scheme:'Spread', defense:'4-2-5', motion:'None', offPlay:'IZ', dir:'Right', backfield:'Gun' },
  { playNo:'02', odk:'O', dn:'2', dist:'6', hash:'L', gnls:'12', carrier:'J. Hayes', yardLn:'OWN 26', type:'Pass', result:'Complete +8', form:'11 Personnel', personnel:'11', scheme:'Spread', defense:'4-2-5', motion:'Jet', offPlay:'Glance', dir:'Left', backfield:'Gun' },
  { playNo:'03', odk:'O', dn:'1', dist:'10', hash:'M', gnls:'18', carrier:'M. Carter', yardLn:'OWN 34', type:'Run', result:'Outside Zone +13', form:'12 Personnel', personnel:'12', scheme:'Power', defense:'4-3', motion:'Orbit', offPlay:'OZ', dir:'Left', backfield:'Under Center' },
  { playNo:'04', odk:'O', dn:'1', dist:'10', hash:'R', gnls:'11', carrier:'J. Hayes', yardLn:'OPP 48', type:'Pass', result:'Incomplete', form:'11 Personnel', personnel:'11', scheme:'Spread', defense:'Nickel', motion:'None', offPlay:'Curl Flat', dir:'Right', backfield:'Gun' },
  { playNo:'05', odk:'O', dn:'2', dist:'10', hash:'R', gnls:'0', carrier:'M. Carter', yardLn:'OPP 48', type:'Run', result:'Inside Zone +2', form:'11 Personnel', personnel:'11', scheme:'Spread', defense:'Nickel', motion:'Short', offPlay:'IZ', dir:'Right', backfield:'Gun' },
  { playNo:'06', odk:'O', dn:'3', dist:'8', hash:'L', gnls:'-2', carrier:'J. Hayes', yardLn:'OPP 46', type:'Pass', result:'Sack -7', form:'11 Personnel', personnel:'11', scheme:'Spread', defense:'Nickel', motion:'None', offPlay:'Four Verticals', dir:'Left', backfield:'Gun' },
  { playNo:'07', odk:'O', dn:'1', dist:'10', hash:'M', gnls:'24', carrier:'M. Carter', yardLn:'OPP 39', type:'Run', result:'Counter +18', form:'12 Personnel', personnel:'12', scheme:'Power', defense:'4-3', motion:'None', offPlay:'GT Counter', dir:'Right', backfield:'Under Center' },
  { playNo:'08', odk:'O', dn:'2', dist:'7', hash:'L', gnls:'8', carrier:'K. Owens', yardLn:'OPP 21', type:'Pass', result:'Complete +16', form:'11 Personnel', personnel:'11', scheme:'Spread', defense:'Nickel', motion:'Orbit', offPlay:'Deep Over', dir:'Left', backfield:'Gun' },
  { playNo:'09', odk:'O', dn:'1', dist:'10', hash:'R', gnls:'5', carrier:'M. Carter', yardLn:'OPP 5', type:'Run', result:'Inside Zone +3', form:'12 Personnel', personnel:'12', scheme:'Power', defense:'Goal Line', motion:'None', offPlay:'IZ', dir:'Right', backfield:'Under Center' },
  { playNo:'10', odk:'O', dn:'2', dist:'7', hash:'M', gnls:'3', carrier:'J. Hayes', yardLn:'OPP 2', type:'Pass', result:'Touchdown +2', form:'11 Personnel', personnel:'11', scheme:'Spread', defense:'Goal Line', motion:'Jet', offPlay:'Sprint Out', dir:'Right', backfield:'Gun' },
  { playNo:'11', odk:'O', dn:'1', dist:'10', hash:'L', gnls:'14', carrier:'M. Carter', yardLn:'OWN 18', type:'Run', result:'Duo +6', form:'12 Personnel', personnel:'12', scheme:'Power', defense:'4-3', motion:'None', offPlay:'Duo', dir:'Left', backfield:'Under Center' },
  { playNo:'12', odk:'O', dn:'3', dist:'4', hash:'R', gnls:'4', carrier:'J. Hayes', yardLn:'OWN 24', type:'Pass', result:'Complete +12', form:'11 Personnel', personnel:'11', scheme:'Spread', defense:'Nickel', motion:'Short', offPlay:'Stick', dir:'Right', backfield:'Gun' },
  { playNo:'13', odk:'O', dn:'2', dist:'8', hash:'M', gnls:'19', carrier:'M. Carter', yardLn:'OWN 40', type:'Run', result:'Outside Zone +11', form:'11 Personnel', personnel:'11', scheme:'Spread', defense:'4-2-5', motion:'Jet', offPlay:'OZ', dir:'Left', backfield:'Gun' },
  { playNo:'14', odk:'O', dn:'3', dist:'2', hash:'L', gnls:'2', carrier:'J. Hayes', yardLn:'OPP 49', type:'Pass', result:'Incomplete', form:'12 Personnel', personnel:'12', scheme:'Power', defense:'4-3', motion:'None', offPlay:'Boot', dir:'Right', backfield:'Under Center' },
  { playNo:'15', odk:'O', dn:'1', dist:'10', hash:'R', gnls:'32', carrier:'M. Carter', yardLn:'OPP 44', type:'Run', result:'Counter +22', form:'12 Personnel', personnel:'12', scheme:'Power', defense:'4-3', motion:'Orbit', offPlay:'GT Counter', dir:'Right', backfield:'Under Center' },
];
const emptyDataset: Dataset = { scouting: demoScouting, live: [], schedule: demoSchedule, activeGameId: demoSchedule[0].id };

function safeLoad(): Dataset {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDataset;
    const parsed = JSON.parse(raw) as Partial<Dataset>;
    const schedule = Array.isArray(parsed.schedule) && parsed.schedule.length ? parsed.schedule : demoSchedule;
    return { scouting: Array.isArray(parsed.scouting) ? parsed.scouting : demoScouting, live: Array.isArray(parsed.live) ? parsed.live : [], schedule, activeGameId: typeof parsed.activeGameId === 'string' && schedule.some(game => game.id === parsed.activeGameId) ? parsed.activeGameId : schedule[0].id };
  } catch { return emptyDataset; }
}
function saveDataset(data: Dataset) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function num(value: string) { const found = value.match(/-?\d+/); return found ? Number(found[0]) : 0; }
function normalizeOdk(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (['o', 'offense', 'offensive'].includes(normalized)) return 'O';
  if (['d', 'defense', 'defensive'].includes(normalized)) return 'D';
  if (['k', 'kick', 'kicking', 'special teams'].includes(normalized)) return 'K';
  return value.trim().toUpperCase();
}
function normalizeYardLine(value: string): string {
  const normalized = value.trim().toUpperCase();
  const match = normalized.match(/^(OWN|OPP|OPPONENT|OUR|O|A)?\s*(-?\d{1,3})\b/);
  if (!match) return value.trim();
  const yard = Number(match[2]);
  if (Math.abs(yard) > 100) return value.trim();
  const side = match[1] ?? '';
  const signed = side === 'OWN' || side === 'OUR' || side === 'O' ? -Math.abs(yard) : side === 'OPP' || side === 'OPPONENT' || side === 'A' ? Math.abs(yard) : yard;
  return String(signed);
}
function yardLineToFieldPosition(value: string): number | null {
  const normalized = normalizeYardLine(value);
  const match = normalized.match(/^-?\d{1,3}$/);
  if (!match) return null;
  const yard = Number(match[0]);
  if (Math.abs(yard) > 100) return null;
  return yard < 0 ? -yard : 100 - yard;
}
function calculateGnls(previousYardLine: string, currentYardLine: string): number | null {
  const previous = yardLineToFieldPosition(previousYardLine);
  const current = yardLineToFieldPosition(currentYardLine);
  return previous === null || current === null ? null : current - previous;
}
function formatGnls(value: number | null): string {
  if (value === null) return '—';
  return value > 0 ? `+${value}` : String(value);
}
function deriveLiveGains(plays: Play[], startingYardLine: string): Play[] {
  let previousYardLine = startingYardLine;
  return plays.map(play => {
    const yardLine = normalizeYardLine(play.yardLn);
    const gain = calculateGnls(previousYardLine, yardLine);
    if (yardLineToFieldPosition(yardLine) !== null) previousYardLine = yardLine;
    return gain === null ? { ...play, yardLn: yardLine } : { ...play, yardLn: yardLine, gnls: String(gain) };
  });
}
function recalculateLiveGains(plays: Play[], startingYardLine: string): Play[] {
  return deriveLiveGains(plays, startingYardLine);
}
function isExplosive(play: Play) { return num(play.gnls) >= 12; }
function average(plays: Play[]) { return plays.length ? (plays.reduce((sum, play) => sum + num(play.gnls), 0) / plays.length).toFixed(1) : '0.0'; }
function csvCell(value: string) { return `"${value.replaceAll('"', '""')}"`; }
function download(name: string, contents: string, type = 'text/csv') {
  const blob = new Blob([contents], { type }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = name; link.click(); URL.revokeObjectURL(link.href);
}
function normalizeHeader(header: string) { return header.toLowerCase().replace(/[\s_./-]+/g, ' ').trim(); }
const headerAliases: Record<keyof Play, string[]> = {
  playNo: ['play #', 'play no', 'play number', 'play'], odk: ['odk', 'off def kick'], dn: ['dn', 'down'], dist: ['dist', 'distance', 'to go'],
  hash: ['hash', 'field hash'], gnls: ['gn/ls', 'gn ls', 'gain loss', 'yards', 'result yards'], carrier: ['ball carrier', 'carrier', 'ballcarrier', 'player'],
  yardLn: ['yard ln', 'yard line', 'yardline'], type: ['play type', 'type', 'run pass'], result: ['result', 'outcome'], form: ['off form', 'formation', 'offensive formation'],
  defense: ['defense', 'def front', 'front'], motion: ['motion'], offPlay: ['off play', 'play call', 'offensive play'], personnel: ['personnel', 'personnel group', 'offensive personnel'], scheme: ['scheme', 'offensive scheme', 'defensive scheme'], dir: ['play dir', 'direction', 'play direction'],
  backfield: ['backfield'],
};
function parseCsv(text: string): Play[] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) { const char = text[i]; if (char === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; } else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; } else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[i + 1] === '\n') i++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ''; } else cell += char; }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  const indexes = (key: keyof Play) => { const aliases = headerAliases[key]; return headers.findIndex(header => aliases.some(alias => normalizeHeader(alias) === header || header.includes(normalizeHeader(alias)))); };
  return rows.slice(1).map((values, index) => {
    const get = (key: keyof Play, fallback = '') => { const at = indexes(key); return at >= 0 ? (values[at] ?? fallback).trim() : fallback; };
    return {
  playNo: get('playNo', String(index + 1).padStart(2, '0')),
  odk: normalizeOdk(get('odk', 'O')),
  dn: get('dn', '1'),
  dist: get('dist', '10'),
  hash: get('hash', 'M'),
  gnls: get('gnls', '0'),
  carrier: get('carrier', 'Unknown'),
  yardLn: get('yardLn', '—'),
  type: get('type', 'Pass'),
  result: get('result', 'No result'),
  form: get('form', '—'),
  personnel: get('personnel', '—'),
  scheme: get('scheme', '—'),
  defense: get('defense', '—'),
  motion: get('motion', 'None'),
  offPlay: get('offPlay', '—'),
  dir: get('dir', '—'),
  backfield: get('backfield', '—'),
};
  }).filter(play => play.playNo || play.result);
}

function AppShell({ children, data, setData }: { children: ReactNode; data: Dataset; setData: (data: Dataset) => void }) {
  const [location] = useLocation(); const [mobileOpen, setMobileOpen] = useState(false);
  const activeGame = data.schedule.find(game => game.id === data.activeGameId) ?? data.schedule[0];

  const seasons = Array.from(new Set(data.schedule.map(game => game.season)))
    .sort((a, b) => Number(b) - Number(a));

  const activeSeason = activeGame?.season ?? seasons[0] ?? '';

  const seasonGames = data.schedule
    .filter(game => game.season === activeSeason)
    .sort((a, b) => a.date.localeCompare(b.date));

  const selectGame = (gameId: string) => {
    if (!gameId) return;
    setData({ ...data, activeGameId: gameId });
  };

  const selectSeason = (season: string) => {
    const firstGame =
      data.schedule.find(game => game.season === season && !game.archived) ??
      data.schedule.find(game => game.season === season);

    if (firstGame) {
      setData({ ...data, activeGameId: firstGame.id });
    }
  };
  const items: { href: NavKey; label: string; icon: typeof LayoutDashboard }[] = [
    { href: '/', label: 'Overview', icon: LayoutDashboard }, { href: '/upload', label: 'Data room', icon: UploadCloud },
    { href: '/scout', label: 'Scouting', icon: Film }, { href: '/live', label: 'Live game', icon: Target }, { href: '/reports', label: 'Reports', icon: ClipboardList }, { href: '/schedule', label: 'Schedule', icon: FileSpreadsheet },
  ];
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark">H</div><div className="brand-name">coach<span>hudl</span></div></div>
      <div className="nav-label eyebrow">Workspace</div>
      <nav className="nav-list" aria-label="Primary navigation">{items.map(item => { const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`nav-item ${location === item.href ? 'active' : ''}`} data-testid={`link-nav-${item.label.toLowerCase().replace(' ', '-')}`}><Icon /><span>{item.label}</span>{location === item.href && <ChevronRight className="ml-auto" />}</Link>; })}</nav>
      <div className="sidebar-spacer" />
      <div className="season-card"><div className="eyebrow">Current board</div><strong>{activeGame ? `${activeGame.season} · ${activeGame.opponent}` : 'No active game'}</strong><p>{activeGame ? `${activeGame.location} · ${activeGame.result}` : 'Choose a game from Schedule.'}</p><div className="season-line" /></div>
    </aside>
    <div className="main-shell">
      <header className="topbar">
        <div className="topbar-title">
          <button className="mobile-menu" onClick={() => setMobileOpen(value => !value)} aria-label="Open navigation" data-testid="button-open-navigation"><Menu /></button>
          <span>Coach Hudl workspace</span>
        </div>

        <div className="topbar-actions" style={{ gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="global-season" className="eyebrow" style={{ margin: 0 }}>Season</label>
            <select
              id="global-season"
              value={activeSeason}
              onChange={event => selectSeason(event.target.value)}
              style={{ minWidth: 90 }}
              data-testid="select-global-season"
            >
              {seasons.map(season => (
                <option key={season} value={season}>{season}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="global-game" className="eyebrow" style={{ margin: 0 }}>Game</label>
            <select
              id="global-game"
              value={activeGame?.id ?? ''}
              onChange={event => selectGame(event.target.value)}
              style={{ minWidth: 190 }}
              data-testid="select-global-game"
            >
              {seasonGames.map(game => (
                <option key={game.id} value={game.id}>
                  {game.opponent}{game.archived ? ' · Archived' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="live-pill"><span className="live-dot" /> workspace synced</div>
          <div className="avatar" aria-label="Coach profile">JR</div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  </div>;
}

function PageHead({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="page-head fade-in"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{actions && <div className="actions">{actions}</div>}</div>;
}
function Panel({ children, className = '', pad = true, style }: { children: ReactNode; className?: string; pad?: boolean; style?: CSSProperties }) { return <section className={`panel ${pad ? 'panel-pad' : ''} ${className}`} style={style}>{children}</section>; }
function SectionTitle({ title, detail, link }: { title: string; detail?: string; link?: ReactNode }) { return <div className="section-title"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{link}</div>; }
function Toast({ message, onClose }: { message: string; onClose: () => void }) { useEffect(() => { const timer = window.setTimeout(onClose, 2800); return () => window.clearTimeout(timer); }, [onClose]); return <div className="toast" role="status" data-testid="status-toast"><Check /><span>{message}</span><button onClick={onClose} aria-label="Dismiss notification" data-testid="button-dismiss-toast"><X /></button></div>; }
function useToast() { const [message, setMessage] = useState(''); return { message, notify: setMessage, clear: () => setMessage('') }; }

function Kpi({ label, value, note, green = false }: { label: string; value: string; note: string; green?: boolean }) { return <div className={`panel kpi ${green ? 'green' : ''}`} data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-note">{note}</div></div>; }
function Dashboard({ data }: { data: Dataset }) {
  const plays = data.scouting; const runs = plays.filter(play => play.type.toLowerCase().includes('run')); const passes = plays.filter(play => play.type.toLowerCase().includes('pass')); const explosives = plays.filter(isExplosive);
  const runPercent = plays.length ? Math.round(runs.length / plays.length * 100) : 0; const passPercent = 100 - runPercent;
  const downGroups = ['1', '2', '3', '4'].map(down => plays.filter(play => play.dn === down).length);
  return <div className="content"><PageHead eyebrow="Opponent intelligence · week 08" title="Your film room, sharper." description="North Ridge defense is queued up. Here's what the tape is saying before kickoff." actions={<><Link href="/upload" className="btn btn-ghost" data-testid="link-dashboard-upload"><UploadCloud /> Load data</Link><Link href="/scout" className="btn btn-primary" data-testid="link-dashboard-scout">Open scouting <ChevronRight /></Link></>} />
    <div className="grid kpi-grid"><Kpi label="Plays charted" value={String(plays.length).padStart(2, '0')} note="Scouting dataset" /><Kpi label="Yards / play" value={average(plays)} note="+0.8 vs last scout" green /><Kpi label="Explosive plays" value={String(explosives.length).padStart(2, '0')} note={`${plays.length ? Math.round(explosives.length / plays.length * 100) : 0}% of all snaps`} /><Kpi label="Run tendency" value={`${runPercent}%`} note={`${passes.length} pass / ${runs.length} run`} green /></div>
    <div className="grid dashboard-grid">
      <Panel><SectionTitle title="Down & distance profile" detail="Snap count by situation" link={<Link href="/scout" className="tiny-link" data-testid="link-dashboard-down-profile">Full breakdown</Link>} /><div className="bar-chart">{downGroups.map((count, i) => <div className="bar-col" key={i}><span className="bar-value">{count}</span><div className="bar" style={{ height: `${Math.max(8, (count / Math.max(...downGroups, 1)) * 150)}px` }} /><span className="bar-label">{i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}</span></div>)}</div></Panel>
      <Panel><SectionTitle title="Call mix" detail="Run / pass identity at a glance" /><div className="donut-wrap"><div className="donut"><div className="donut-center"><strong>{plays.length}</strong><span>snaps</span></div></div><div className="legend"><div className="legend-row"><span className="legend-dot" style={{ background: 'hsl(var(--primary))' }} />Pass <b>{passPercent}%</b></div><div className="legend-row"><span className="legend-dot" style={{ background: 'hsl(var(--accent))' }} />Run <b>{runPercent}%</b></div></div></div></Panel>
      <Panel><SectionTitle title="Tendency alerts" detail="What to carry into the meeting" /><div className="feed"><div className="feed-row"><span className="feed-num">01</span><div className="feed-main"><strong>Counter shows up on early downs</strong><span>{plays.filter(p => p.offPlay.toLowerCase().includes('counter')).length} calls · {Math.round(plays.filter(p => p.offPlay.toLowerCase().includes('counter')).length / plays.length * 100)}% tendency</span></div><span className="tag green">watch</span></div><div className="feed-row"><span className="feed-num">02</span><div className="feed-main"><strong>Motion shows up in the pass game</strong><span>{plays.filter(p => p.motion.toLowerCase() !== 'none').length} motion-tagged snaps · mostly Gun</span></div><span className="tag">key</span></div><div className="feed-row"><span className="feed-num">03</span><div className="feed-main"><span>{plays.filter(p => p.dn === '3' && num(p.dist) >= 6 && false).length} pressures in chart</span></div><span className="tag gold">alert</span></div></div></Panel>
      <Panel><SectionTitle title="Recent charted plays" detail="Latest additions to scouting board" link={<Link href="/upload" className="tiny-link" data-testid="link-dashboard-recent">Data room</Link>} /><div className="feed">{plays.slice(-4).reverse().map(play => <div className="feed-row" key={play.playNo}><span className="feed-num">#{play.playNo}</span><div className="feed-main"><strong>{play.type} · {play.offPlay}</strong><span>{play.dn}&amp;{play.dist} · {play.form} · {play.result}</span></div><span className={`tag ${isExplosive(play) ? 'green' : ''}`}>{isExplosive(play) ? 'explosive' : play.type.toLowerCase()}</span></div>)}</div></Panel>
    </div>
  </div>;
}

function UploadPage({ data, setData }: { data: Dataset; setData: (data: Dataset) => void }) {
  const [target, setTarget] = useState<'scouting' | 'live'>('scouting'); const [preview, setPreview] = useState<Play[]>(data.scouting); const [loading, setLoading] = useState(false); const fileRef = useRef<HTMLInputElement>(null); const toast = useToast();
  const handleFile = (file?: File) => { if (!file) return; setLoading(true); const reader = new FileReader(); reader.onload = () => { const parsed = parseCsv(String(reader.result ?? '')); setPreview(parsed.slice(0, 12)); if (parsed.length) { const next = { ...data, [target]: parsed }; setData(next); toast.notify(`${parsed.length} plays normalized into ${target} board`); } else toast.notify('No readable play rows found in that file'); setLoading(false); }; reader.onerror = () => { setLoading(false); toast.notify('Could not read that file'); }; reader.readAsText(file); };
  const loadDemo = () => { const next = { ...data, scouting: demoScouting }; setData(next); setPreview(demoScouting.slice(0, 12)); toast.notify('Demo scout loaded · 15 plays ready to study'); };
  const clear = (which: 'scouting' | 'live') => { const next = { ...data, [which]: [] }; setData(next); if (target === which) setPreview([]); toast.notify(`${which === 'scouting' ? 'Scouting' : 'Live'} board cleared`); };
  return <div className="content"><PageHead eyebrow="Data room · ingest & normalize" title="Bring in the tape." description="Start with a Sheets export or a live chart. Coach Hudl maps common headers and keeps your board local to this device." actions={<button className="btn btn-primary" onClick={() => fileRef.current?.click()} data-testid="button-upload-top"><UploadCloud /> Import CSV</button>} />
    <input ref={fileRef} className="drop-input" type="file" accept=".csv,text/csv" onChange={event => handleFile(event.target.files?.[0])} data-testid="input-csv-file" />
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, .42fr)' }}>
      <div className="grid"><Panel><div className="filters"><button className={`btn ${target === 'scouting' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setTarget('scouting'); setPreview(data.scouting.slice(0, 12)); }} data-testid="button-target-scouting"><Shield /> Scouting board</button><button className={`btn ${target === 'live' ? 'btn-green' : 'btn-ghost'}`} onClick={() => { setTarget('live'); setPreview(data.live.slice(0, 12)); }} data-testid="button-target-live"><Zap /> Live board</button><span className="eyebrow" style={{ marginLeft: 'auto' }}>{target === 'scouting' ? data.scouting.length : data.live.length} plays saved</span></div><div className="upload-zone" onClick={() => fileRef.current?.click()} role="button" tabIndex={0} onKeyDown={event => event.key === 'Enter' && fileRef.current?.click()} data-testid="dropzone-csv"><div className="upload-icon">{loading ? <RefreshCw className="animate-spin" /> : <UploadCloud />}</div><h3>{loading ? 'Normalizing your rows…' : 'Drop a CSV here'}</h3><p>Exports from Google Sheets, Hudl, or your charting workflow. Headers are matched automatically.</p><button className="btn btn-primary" onClick={event => { event.stopPropagation(); fileRef.current?.click(); }} data-testid="button-choose-csv">Choose file</button></div></Panel>
        <Panel pad={false}><div style={{ padding: '21px 21px 0' }}><SectionTitle title="Normalized preview" detail={preview.length ? `Showing ${preview.length} of ${target === 'scouting' ? data.scouting.length : data.live.length} rows` : 'Your parsed rows will appear here'} /></div>{preview.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Play</th><th>Down</th><th>Type</th><th>Play call</th><th>Formation</th><th>Gain / loss</th><th>Result</th></tr></thead><tbody>{preview.map((play, i) => <tr key={`${play.playNo}-${i}`} data-testid={`row-preview-${i}`}><td><strong>#{play.playNo}</strong></td><td>{play.dn}&amp;{play.dist}</td><td><span className={`tag ${play.type.toLowerCase().includes('run') ? 'green' : ''}`}>{play.type}</span></td><td>{play.offPlay}</td><td>{play.form}</td><td style={{ color: num(play.gnls) >= 0 ? '#62dfae' : '#ef8f88' }}>{play.gnls}</td><td>{play.result}</td></tr>)}</tbody></table></div> : <div className="empty"><FileSpreadsheet size={30} /><h3>No rows in this board yet</h3><p>Import a CSV or load the demo board to get moving.</p><button className="btn btn-primary" onClick={loadDemo} data-testid="button-empty-load-demo">Load demo data</button></div>}</Panel></div>
      <div className="grid"><Panel><SectionTitle title="Quick start" detail="A clean chart in three moves" /><div className="feed"><div className="feed-row"><span className="feed-num">01</span><div className="feed-main"><strong>Export your sheet as CSV</strong><span>One row per snap works best.</span></div></div><div className="feed-row"><span className="feed-num">02</span><div className="feed-main"><strong>Choose your board</strong><span>Keep scouting and live data separate.</span></div></div><div className="feed-row"><span className="feed-num">03</span><div className="feed-main"><strong>Study the signal</strong><span>Tendencies update immediately.</span></div></div></div></Panel><Panel><SectionTitle title="Demo board" detail="A realistic North Ridge scout" /><p style={{ fontSize: 12, lineHeight: 1.6, color: 'hsl(var(--muted-foreground))', marginTop: 0 }}>Use the bundled chart to explore the workspace before your next upload. It stays on this device until you clear it.</p><div className="actions"><button className="btn btn-primary" onClick={loadDemo} data-testid="button-load-demo"><Sparkles /> Load demo</button><button className="btn btn-danger" onClick={() => clear('scouting')} data-testid="button-clear-scouting"><Trash2 /> Clear scout</button></div></Panel><Panel><SectionTitle title="Clear live board" detail={data.live.length ? `${data.live.length} live snaps stored` : 'No live snaps stored'} />{data.live.length ? <button className="btn btn-danger" onClick={() => clear('live')} data-testid="button-clear-live"><Trash2 /> Clear live data</button> : <div className="eyebrow">Ready for game day</div>}</Panel></div>
    </div>{toast.message && <Toast message={toast.message} onClose={toast.clear} />}
  </div>;
}

function ScoutPage({ data }: { data: Dataset }) {
  const [typeFilter, setTypeFilter] = useState('All'); const [search, setSearch] = useState(''); const plays = useMemo(() => data.scouting.filter(play => (typeFilter === 'All' || play.type.toLowerCase().includes(typeFilter.toLowerCase())) && Object.values(play).some(value => value.toLowerCase().includes(search.toLowerCase()))), [data.scouting, typeFilter, search]);
  const source = data.scouting; const runPlays = source.filter(p => p.type.toLowerCase().includes('run')); const passPlays = source.filter(p => p.type.toLowerCase().includes('pass')); const formations = ['11 Personnel', '12 Personnel', 'Empty']; const formationCounts = formations.map(form => source.filter(p => p.form === form).length);
  const topFormationFavorites = formations.map(form => { const formationPlays = source.filter(play => play.form === form); const counts = Array.from(new Set(formationPlays.map(play => play.offPlay))).map(offPlay => ({ offPlay, count: formationPlays.filter(play => play.offPlay === offPlay).length })); return { form, total: formationPlays.length, favorite: counts.sort((a, b) => b.count - a.count)[0] }; }).filter(row => row.favorite).sort((a, b) => b.total - a.total).slice(0, 3);
  const fieldZones = [{ label: 'Backed up', filter: (p: Play) => num(p.yardLn) <= 20 }, { label: 'Middle third', filter: (p: Play) => num(p.yardLn) > 20 && num(p.yardLn) < 50 }, { label: 'Red zone', filter: (p: Play) => p.yardLn.toLowerCase().includes('opp 2') || p.yardLn.toLowerCase().includes('opp 5') }];
  return <div className="content"><PageHead eyebrow="Scouting · tendency board" title="Find the tell." description="Turn every snap into a decision. Filter the noise, then take the strongest pattern into the room." actions={<Link href="/reports" className="btn btn-primary" data-testid="link-scout-reports"><ClipboardList /> Build report</Link>} /><div className="filters"><div style={{ position: 'relative' }}><Search size={15} style={{ position: 'absolute', left: 11, top: 10, color: '#77758a' }} /><input className="input" style={{ paddingLeft: 33, width: 220 }} placeholder="Search chart…" value={search} onChange={event => setSearch(event.target.value)} aria-label="Search scouting plays" data-testid="input-scout-search" /></div><select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} aria-label="Filter play type" data-testid="select-scout-type"><option>All</option><option>Run</option><option>Pass</option></select><span className="eyebrow">{plays.length} matching snaps</span></div>
    <div className="grid split-grid"><Panel><SectionTitle title="Run / pass splits" detail="Averages by play type" /><div className="trend-row"><div className="trend-head"><span>Run calls <small>({runPlays.length})</small></span><span>{source.length ? Math.round(runPlays.length / source.length * 100) : 0}%</span></div><div className="progress green"><span style={{ width: `${source.length ? runPlays.length / source.length * 100 : 0}%` }} /></div></div><div className="trend-row"><div className="trend-head"><span>Pass calls <small>({passPlays.length})</small></span><span>{source.length ? Math.round(passPlays.length / source.length * 100) : 0}%</span></div><div className="progress"><span style={{ width: `${source.length ? passPlays.length / source.length * 100 : 0}%` }} /></div><div className="trend-head" style={{ marginTop: 16 }}><span>Run yards / call</span><span>{average(runPlays)}</span></div><div className="trend-head"><span>Pass yards / call</span><span>{average(passPlays)}</span></div></div></Panel><Panel><SectionTitle title="Top formations" detail="What they line up in" />{formations.map((form, i) => <div className="trend-row" key={form}><div className="trend-head"><span>{form}</span><span>{formationCounts[i]}</span></div><div className="progress"><span style={{ width: `${source.length ? formationCounts[i] / source.length * 100 : 0}%` }} /></div></div>)}<div className="callout"><CircleAlert />11 personnel carries the highest volume. Expect motion from the slot before the snap.</div></Panel><Panel><SectionTitle title="Field zone profile" detail="Where the calls happen" />{fieldZones.map(zone => { const count = source.filter(zone.filter).length; return <div className="trend-row" key={zone.label}><div className="trend-head"><span>{zone.label}</span><span>{count} snaps</span></div><div className="progress green"><span style={{ width: `${source.length ? count / source.length * 100 : 0}%` }} /></div></div>; })}</Panel><Panel><SectionTitle title="Favorite 3 plays" detail="One favorite call from each top formation" />{topFormationFavorites.length ? topFormationFavorites.map(row => <div className="trend-row" key={row.form}><div className="trend-head"><span>{row.form}</span><span>{row.favorite?.offPlay}</span></div><div className="progress green"><span style={{ width: `${row.total ? row.favorite!.count / row.total * 100 : 0}%` }} /></div><div className="kpi-note">{row.favorite?.count} of {row.total} calls · {row.favorite?.count && row.total ? Math.round(row.favorite.count / row.total * 100) : 0}% of formation snaps</div></div>) : <div className="empty"><Sparkles size={28} /><h3>No formation calls yet</h3><p>Import or load scouting data to see the favorite call from each top formation.</p></div>}</Panel></div>
    <Panel className="fade-in" pad={false} style={{ marginTop: 14 }}><div style={{ padding: '21px 21px 0' }}><SectionTitle title="Play call ledger" detail="Normalized snap-by-snap view" /></div>{plays.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Play</th><th>Situation</th><th>Type / call</th><th>Personnel</th><th>Direction</th><th>Gain / loss</th><th>Defense</th></tr></thead><tbody>{plays.map((play, i) => <tr key={`${play.playNo}-${i}`} data-testid={`row-scout-${i}`}><td><strong>#{play.playNo}</strong></td><td>{play.dn}&amp;{play.dist} · {play.hash}</td><td><span className={`tag ${play.type.toLowerCase().includes('run') ? 'green' : ''}`}>{play.type}</span> <span style={{ marginLeft: 7 }}>{play.offPlay}</span></td><td>{play.form}</td><td>{play.dir}</td><td style={{ color: num(play.gnls) >= 0 ? '#62dfae' : '#ef8f88' }}>{play.gnls}</td><td>{play.defense} · {play.scheme}</td></tr>)}</tbody></table></div> : <div className="empty"><Search size={28} /><h3>Nothing matches that filter</h3><p>Try clearing your search or loading the demo board.</p></div>}</Panel>
  </div>;
}

function LivePage({ data, setData }: { data: Dataset; setData: (data: Dataset) => void }) {
  const [startingYardLine, setStartingYardLine] = useState('-20');
  const [form, setForm] = useState<Play>({ ...demoScouting[0], playNo: String(data.live.length + 1).padStart(2, '0'), yardLn: data.live.at(-1)?.yardLn ?? '-22', result: '' }); const toast = useToast(); const fileRef = useRef<HTMLInputElement>(null);
  const update = (key: keyof Play, value: string) => setForm(current => ({ ...current, [key]: value }));
  const previousYardLine = data.live.at(-1)?.yardLn || startingYardLine;
  const normalizedFormYardLine = normalizeYardLine(form.yardLn);
  const calculatedGnls = calculateGnls(previousYardLine, normalizedFormYardLine);
  const addPlay = () => {
    if (!form.yardLn.trim()) { toast.notify('Enter the yard line after the snap'); return; }
    if (calculatedGnls === null) { toast.notify('Use a signed yard line like -22 or 22'); return; }
    if (!form.result.trim()) { toast.notify('Add a result before saving the snap'); return; }
    const next = { ...data, live: [...data.live, { ...form, yardLn: normalizedFormYardLine, gnls: String(calculatedGnls), playNo: String(data.live.length + 1).padStart(2, '0') }] };
    setData(next);
    setForm(current => ({ ...current, playNo: String(next.live.length + 1).padStart(2, '0'), yardLn: normalizedFormYardLine, gnls: '0', result: '' }));
    toast.notify(`Live snap added · GN/LS ${formatGnls(calculatedGnls)}`);
  };
  const importLive = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload = () => { const parsed = deriveLiveGains(parseCsv(String(reader.result ?? '')), previousYardLine); setData({ ...data, live: [...data.live, ...parsed] }); toast.notify(`${parsed.length} live snaps imported with yard-line gains`); }; reader.readAsText(file); };
  const field = (key: keyof Play, label: string, options?: string[]) => <div className="field"><label htmlFor={`live-${key}`}>{label}</label>{options ? <select id={`live-${key}`} value={form[key]} onChange={event => update(key, event.target.value)} data-testid={`select-live-${key}`}>{options.map(option => <option key={option}>{option}</option>)}</select> : <input id={`live-${key}`} className="input" value={form[key]} onChange={event => update(key, event.target.value)} data-testid={`input-live-${key}`} />}</div>;
  const yardLineField = <div className="field"><label htmlFor="live-yardLn">Yard line</label><input id="live-yardLn" className="input" value={form.yardLn} onChange={event => update('yardLn', event.target.value)} onBlur={() => update('yardLn', normalizeYardLine(form.yardLn))} placeholder="-22 or 22" inputMode="numeric" data-testid="input-live-yardLn" /><span className="field-hint">Negative = own · positive = opponent</span></div>;
  const scout = data.scouting; const live = data.live; const metric = (plays: Play[], filter: (p: Play) => boolean) => plays.filter(filter).length;
  return <div className="content"><PageHead eyebrow="Live game · sideline mode" title="See the shift." description="Chart the game as it happens, then compare the opponent you prepared for with the one showing up today." actions={<><input ref={fileRef} className="drop-input" type="file" accept=".csv,text/csv" onChange={event => importLive(event.target.files?.[0])} data-testid="input-live-csv" /><button className="btn btn-ghost" onClick={() => fileRef.current?.click()} data-testid="button-import-live"><UploadCloud /> Import live CSV</button></>} />
    <Panel><SectionTitle title="Add a live snap" detail="Enter O, D, or K for the phase, then enter the signed yard line after the snap." />{!live.length && <div className="starting-yard-line"><div className="field"><label htmlFor="live-starting-yard-line">Starting yard line</label><input id="live-starting-yard-line" className="input" value={startingYardLine} onChange={event => setStartingYardLine(event.target.value)} onBlur={() => setStartingYardLine(normalizeYardLine(startingYardLine))} placeholder="-20" inputMode="numeric" data-testid="input-live-starting-yard-line" /></div><span>Use a negative number on your side and a positive number on the opponent’s side.</span></div>}<div className="form-grid">{field('odk', 'ODK', ['O', 'D', 'K'])}{field('dn', 'Down', ['1', '2', '3', '4'])}{field('dist', 'Distance')}{field('hash', 'Hash', ['L', 'M', 'R'])}{yardLineField}{field('type', 'Play type', ['Run', 'Pass'])}{field('offPlay', 'Play call', ['IZ', 'OZ', 'GT Counter', 'Glance', 'Stick', 'Four Verticals', 'Other'])}{field('form', 'Formation', ['11 Personnel', '12 Personnel', 'Empty', 'Other'])}{field('carrier', 'Ball carrier')}<div className="field"><label htmlFor="live-gnls">GN/LS · calculated</label><output id="live-gnls" className={`computed-value ${calculatedGnls !== null && calculatedGnls >= 0 ? 'positive' : calculatedGnls !== null ? 'negative' : ''}`} data-testid="output-live-gnls">{formatGnls(calculatedGnls)}</output><span className="field-hint">From {previousYardLine}</span></div>{field('result', 'Result', ['Complete', 'Incomplete', 'Inside Zone +4', 'Outside Zone +8', 'First down', 'Touchdown', 'Sack', 'No gain'])}{field('defense', 'Defense', ['4-2-5', '4-3', 'Nickel', 'Goal Line', 'Other'])}</div><div className="actions" style={{ marginTop: 17 }}><button className="btn btn-green" onClick={addPlay} data-testid="button-add-live-play"><Plus /> Add snap <span style={{ opacity: .7 }}>↵</span></button><span className="eyebrow" style={{ alignSelf: 'center' }}>{live.length} live snaps tracked</span></div></Panel>
    <Panel style={{ marginTop: 14 }}><SectionTitle title="Scouting vs live" detail={live.length ? 'Same lens, two realities.' : 'Add a live snap to activate comparison.'} /><div className="comparison"><div className="compare-col"><div className="compare-head"><strong>Scouting board</strong><span className="tag">baseline</span></div><div className="compare-stat"><span>Run rate</span><b>{scout.length ? Math.round(metric(scout, p => p.type.toLowerCase().includes('run')) / scout.length * 100) : 0}%</b></div><div className="compare-stat"><span>Explosives</span><b>{metric(scout, isExplosive)}</b></div><div className="compare-stat"><span>Avg gain</span><b>{average(scout)}</b></div><div className="compare-stat"><span>Blitz rate</span><b>{scout.length ? Math.round(metric(scout, p => false) / scout.length * 100) : 0}%</b></div></div><div className="compare-col"><div className="compare-head"><strong>Live board</strong><span className="tag green">today</span></div><div className="compare-stat"><span>Run rate</span><b>{live.length ? Math.round(metric(live, p => p.type.toLowerCase().includes('run')) / live.length * 100) : 0}%</b></div><div className="compare-stat"><span>Explosives</span><b>{metric(live, isExplosive)}</b></div><div className="compare-stat"><span>Avg gain</span><b>{average(live)}</b></div><div className="compare-stat"><span>Blitz rate</span><b>{live.length ? Math.round(metric(live, p => false) / live.length * 100) : 0}%</b></div></div></div>{live.length > 0 && <div className="callout" style={{ marginTop: 14 }}><Sparkles />Live is trending {metric(live, p => p.type.toLowerCase().includes('run')) / live.length > metric(scout, p => p.type.toLowerCase().includes('run')) / Math.max(scout.length, 1) ? 'more run-heavy' : 'more pass-heavy'} than the scout. Check the next early-down tendency.</div>}</Panel>
    {live.length > 0 && <Panel style={{ marginTop: 14 }} pad={false}><div style={{ padding: '21px 21px 0' }}><SectionTitle title="Live snap log" detail="Most recent first" /></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Play</th><th>ODK</th><th>Situation</th><th>Type</th><th>Call</th><th>Gain / loss</th><th>Result</th><th /></tr></thead><tbody>{live.slice().reverse().map((play, i) => <tr key={`${play.playNo}-${i}`} data-testid={`row-live-${i}`}><td><strong>#{play.playNo}</strong></td><td><span className={`tag ${play.odk === 'O' ? 'green' : ''}`}>{play.odk}</span></td><td>{play.dn}&amp;{play.dist}</td><td><span className={`tag ${play.type === 'Run' ? 'green' : ''}`}>{play.type}</span></td><td>{play.offPlay}</td><td>{play.gnls}</td><td>{play.result}</td><td><button className="btn btn-danger" style={{ padding: 6 }} onClick={() => { setData({ ...data, live: data.live.filter((_, index) => index !== live.length - 1 - i) }); toast.notify('Live snap removed'); }} aria-label={`Remove play ${play.playNo}`} data-testid={`button-remove-live-${i}`}><Trash2 size={13} /></button></td></tr>)}</tbody></table></div></Panel>}{toast.message && <Toast message={toast.message} onClose={toast.clear} />}
  </div>;
}

function ReportsPage({ data }: { data: Dataset }) {
  const [active, setActive] = useState<'qb' | 'carrier' | 'explosive'>('qb'); const plays = data.scouting; const qbs = plays.filter(p => p.type.toLowerCase().includes('pass')); const carriers = Array.from(new Set(plays.map(p => p.carrier))).filter(Boolean).map(name => { const rows = plays.filter(p => p.carrier === name); return { name, count: rows.length, yards: rows.reduce((sum, p) => sum + num(p.gnls), 0), explosive: rows.filter(isExplosive).length }; }).sort((a, b) => b.yards - a.yards);
  const exportReport = () => { const headers = ['Play #', 'Type', 'Ball Carrier', 'Gain/Loss', 'Result', 'Formation', 'Play Call']; const rows = plays.map(p => [p.playNo, p.type, p.carrier, p.gnls, p.result, p.form, p.offPlay].map(csvCell).join(',')); download('coach-hudl-report.csv', [headers.join(','), ...rows].join('\n')); };
  return <div className="content"><PageHead eyebrow="Reports · ready for the room" title="Make the call." description="Clean report views for the staff meeting, the sideline, and the next opponent." actions={<button className="btn btn-primary" onClick={exportReport} data-testid="button-export-report"><Download /> Export CSV</button>} /><div className="grid" style={{ gridTemplateColumns: 'minmax(0, .8fr) minmax(0, 1.2fr)' }}><Panel><SectionTitle title="Report views" detail="Select a lens" /><div className="report-list"><button className={`report-card ${active === 'qb' ? 'active-report' : ''}`} onClick={() => setActive('qb')} data-testid="button-report-qb"><div className="report-info"><div className="report-icon"><Users size={16} /></div><div><h3>QB report</h3><p>Pass volume, RPOs, pressure</p></div></div><ChevronRight size={16} /></button><button className="report-card" onClick={() => setActive('carrier')} data-testid="button-report-carrier"><div className="report-info"><div className="report-icon"><Zap size={16} /></div><div><h3>Ball-carrier report</h3><p>Usage, yardage, explosives</p></div></div><ChevronRight size={16} /></button><button className="report-card" onClick={() => setActive('explosive')} data-testid="button-report-explosive"><div className="report-info"><div className="report-icon"><Sparkles size={16} /></div><div><h3>Explosive plays</h3><p>Every gain of 12+ yards</p></div></div><ChevronRight size={16} /></button></div><div className="callout" style={{ marginTop: 18 }}><Download />The export includes normalized fields from every charted snap, ready for a staff packet.</div></Panel><Panel pad={false}><div style={{ padding: '21px 21px 0' }}><SectionTitle title={active === 'qb' ? 'Quarterback report' : active === 'carrier' ? 'Ball-carrier report' : 'Explosive-play report'} detail={`${plays.length} snaps in scouting board`} /></div>{active === 'qb' && <div className="panel-pad"><div className="grid kpi-grid" style={{ marginBottom: 22 }}><Kpi label="Pass attempts" value={String(qbs.length)} note="charted throws" /><Kpi label="Pass yards" value={String(qbs.reduce((sum, p) => sum + num(p.gnls), 0))} note="net charted gain" green /><Kpi label="Pressure" value={String(qbs.filter(p => false).length)} note="blitz-tagged" /></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Call</th><th>Formation</th><th>Result</th><th>Gain</th></tr></thead><tbody>{qbs.map((p, i) => <tr key={i}><td><strong>{p.offPlay}</strong></td><td>{p.form}</td><td>{p.result}</td><td>{p.gnls}</td></tr>)}</tbody></table></div></div>}{active === 'carrier' && <div className="panel-pad"><div className="table-wrap"><table className="data-table"><thead><tr><th>Ball carrier</th><th>Touches</th><th>Total gain</th><th>Avg / touch</th><th>Explosives</th></tr></thead><tbody>{carriers.map(row => <tr key={row.name}><td><strong>{row.name}</strong></td><td>{row.count}</td><td style={{ color: '#62dfae' }}>{row.yards}</td><td>{(row.yards / row.count).toFixed(1)}</td><td><span className="tag green">{row.explosive}</span></td></tr>)}</tbody></table></div></div>}{active === 'explosive' && <div className="panel-pad"><div className="feed">{plays.filter(isExplosive).sort((a, b) => num(b.gnls) - num(a.gnls)).map((p, i) => <div className="feed-row" key={i}><span className="feed-num">#{p.playNo}</span><div className="feed-main"><strong>{p.offPlay} · {p.result}</strong><span>{p.type} · {p.form} · {p.yardLn}</span></div><span className="tag green">+{p.gnls}</span></div>)}</div></div>}</Panel></div></div>;
}

function LiveSpreadsheetPage({ data, setData }: { data: Dataset; setData: (data: Dataset) => void }) {
  const [startingYardLine, setStartingYardLine] = useState('-20');
  const [form, setForm] = useState<Play>({ ...demoScouting[0], playNo: String(data.live.length + 1).padStart(2, '0'), yardLn: data.live.at(-1)?.yardLn ?? '-22', result: '' });
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const live = data.live;
  const update = (key: keyof Play, value: string) => setForm(current => ({ ...current, [key]: value }));
  const previousYardLine = live.at(-1)?.yardLn || startingYardLine;
  const normalizedFormYardLine = normalizeYardLine(form.yardLn);
  const calculatedGnls = calculateGnls(previousYardLine, normalizedFormYardLine);
  const addPlay = () => {
    if (!form.yardLn.trim()) { toast.notify('Enter the yard line after the snap'); return; }
    if (calculatedGnls === null) { toast.notify('Use a signed yard line like -22 or 22'); return; }
    if (!form.result.trim()) { toast.notify('Add a result before saving the snap'); return; }
    const next = { ...data, live: [...live, { ...form, yardLn: normalizedFormYardLine, gnls: String(calculatedGnls), playNo: String(live.length + 1).padStart(2, '0') }] };
    setData(next);
    setForm(current => ({ ...current, playNo: String(next.live.length + 1).padStart(2, '0'), yardLn: normalizedFormYardLine, gnls: '0', result: '' }));
    toast.notify(`Live snap added · GN/LS ${formatGnls(calculatedGnls)}`);
  };
  const importLive = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = deriveLiveGains(parseCsv(String(reader.result ?? '')), previousYardLine);
      setData({ ...data, live: [...live, ...parsed] });
      toast.notify(`${parsed.length} live snaps imported with yard-line gains`);
    };
    reader.readAsText(file);
  };
  const updateLiveRow = (displayIndex: number, key: keyof Play, value: string) => {
    const actualIndex = live.length - 1 - displayIndex;
    const nextLive = live.map((play, index) => index === actualIndex ? { ...play, [key]: key === 'odk' ? normalizeOdk(value) : value } : play);
    setData({ ...data, live: recalculateLiveGains(nextLive, startingYardLine) });
  };
  const removeLiveRow = (displayIndex: number) => {
    const actualIndex = live.length - 1 - displayIndex;
    setData({ ...data, live: live.filter((_, index) => index !== actualIndex) });
    toast.notify('Live snap removed');
  };
  const field = (key: keyof Play, label: string, options?: string[]) => <div className="field"><label htmlFor={`live-${key}`}>{label}</label>{options ? <select id={`live-${key}`} value={form[key]} onChange={event => update(key, event.target.value)} data-testid={`select-live-${key}`}>{options.map(option => <option key={option}>{option}</option>)}</select> : <input id={`live-${key}`} className="input" value={form[key]} onChange={event => update(key, event.target.value)} data-testid={`input-live-${key}`} />}</div>;
  const yardLineField = <div className="field"><label htmlFor="live-yardLn">Yard line</label><input id="live-yardLn" className="input" value={form.yardLn} onChange={event => update('yardLn', event.target.value)} onBlur={() => update('yardLn', normalizeYardLine(form.yardLn))} placeholder="-22 or 22" inputMode="numeric" data-testid="input-live-yardLn" /><span className="field-hint">Negative = own · positive = opponent</span></div>;
  const editCell = (displayIndex: number, key: keyof Play, value: string, options?: string[]) => options ? <select className="table-input" value={value} onChange={event => updateLiveRow(displayIndex, key, event.target.value)} aria-label={`Edit ${key} for snap ${displayIndex + 1}`} data-testid={`select-edit-live-${displayIndex}-${key}`}>{options.map(option => <option key={option}>{option}</option>)}</select> : <input className="table-input" value={value} onChange={event => updateLiveRow(displayIndex, key, event.target.value)} onBlur={event => key === 'yardLn' && updateLiveRow(displayIndex, key, normalizeYardLine(event.currentTarget.value))} aria-label={`Edit ${key} for snap ${displayIndex + 1}`} data-testid={`input-edit-live-${displayIndex}-${key}`} />;
  return <div className="content"><PageHead eyebrow="Live game · editable chart" title="Keep every snap in reach." description="Chart the game as it happens, then edit any prior snap directly in the spreadsheet below." actions={<><input ref={fileRef} className="drop-input" type="file" accept=".csv,text/csv" onChange={event => importLive(event.target.files?.[0])} data-testid="input-live-csv" /><button className="btn btn-ghost" onClick={() => fileRef.current?.click()} data-testid="button-import-live"><UploadCloud /> Import live CSV</button></>} />
    <Panel><SectionTitle title="Add a live snap" detail="Choose O, D, or K. GN/LS calculates from the previous spot." />{!live.length && <div className="starting-yard-line"><div className="field"><label htmlFor="live-starting-yard-line">Starting yard line</label><input id="live-starting-yard-line" className="input" value={startingYardLine} onChange={event => setStartingYardLine(event.target.value)} onBlur={() => setStartingYardLine(normalizeYardLine(startingYardLine))} placeholder="-20" inputMode="numeric" data-testid="input-live-starting-yard-line" /></div><span>Negative = your side · positive = opponent’s side.</span></div>}<div className="form-grid">{field('odk', 'ODK', ['O', 'D', 'K'])}{field('dn', 'Down', ['1', '2', '3', '4'])}{field('dist', 'Distance')}{field('hash', 'Hash', ['L', 'M', 'R'])}{yardLineField}{field('type', 'Play type', ['Run', 'Pass'])}{field('offPlay', 'Play call', ['IZ', 'OZ', 'GT Counter', 'Glance', 'Stick', 'Four Verticals', 'Other'])}{field('form', 'Formation', ['11 Personnel', '12 Personnel', 'Empty', 'Other'])}{field('carrier', 'Ball carrier')}<div className="field"><label htmlFor="live-gnls">GN/LS · calculated</label><output id="live-gnls" className={`computed-value ${calculatedGnls !== null && calculatedGnls >= 0 ? 'positive' : calculatedGnls !== null ? 'negative' : ''}`} data-testid="output-live-gnls">{formatGnls(calculatedGnls)}</output><span className="field-hint">From {previousYardLine}</span></div>{field('result', 'Result', ['Complete', 'Incomplete', 'Inside Zone +4', 'Outside Zone +8', 'First down', 'Touchdown', 'Sack', 'No gain'])}{field('defense', 'Defense', ['4-2-5', '4-3', 'Nickel', 'Goal Line', 'Other'])}</div><div className="actions" style={{ marginTop: 17 }}><button className="btn btn-green" onClick={addPlay} data-testid="button-add-live-play"><Plus /> Add snap <span style={{ opacity: .7 }}>↵</span></button><span className="eyebrow" style={{ alignSelf: 'center' }}>{live.length} live snaps tracked</span></div></Panel>
    <Panel style={{ marginTop: 14 }} pad={false}><div style={{ padding: '21px 21px 0' }}><SectionTitle title="Live game spreadsheet" detail={live.length ? `${live.length} snaps · click any cell to edit` : 'Your saved snaps will appear here'} /></div>{live.length ? <div className="table-wrap"><table className="data-table live-sheet"><thead><tr><th>Play</th><th>ODK</th><th>Down</th><th>Distance</th><th>Type</th><th>Call</th><th>Formation</th><th>Ball carrier</th><th>Yard line</th><th>GN/LS</th><th>Result</th><th /></tr></thead><tbody>{live.slice().reverse().map((play, i) => <tr key={`${play.playNo}-${i}`} data-testid={`row-live-${i}`}><td><strong>#{play.playNo}</strong></td><td>{editCell(i, 'odk', play.odk, ['O', 'D', 'K'])}</td><td>{editCell(i, 'dn', play.dn, ['1', '2', '3', '4'])}</td><td>{editCell(i, 'dist', play.dist)}</td><td>{editCell(i, 'type', play.type, ['Run', 'Pass'])}</td><td>{editCell(i, 'offPlay', play.offPlay)}</td><td>{editCell(i, 'form', play.form)}</td><td>{editCell(i, 'carrier', play.carrier)}</td><td>{editCell(i, 'yardLn', play.yardLn)}</td><td className={num(play.gnls) >= 0 ? 'gain-positive' : 'gain-negative'}>{formatGnls(num(play.gnls))}</td><td>{editCell(i, 'result', play.result)}</td><td><button className="btn btn-danger" style={{ padding: 6 }} onClick={() => removeLiveRow(i)} aria-label={`Remove play ${play.playNo}`} data-testid={`button-remove-live-${i}`}><Trash2 size={13} /></button></td></tr>)}</tbody></table></div> : <div className="empty"><FileSpreadsheet size={30} /><h3>No live snaps yet</h3><p>Add a snap above or import a live CSV. Saved snaps stay editable here.</p></div>}</Panel>{toast.message && <Toast message={toast.message} onClose={toast.clear} />}
  </div>;
}

function ReportsHubPage({ data }: { data: Dataset }) {
  const [active, setActive] = useState<'offense' | 'defense'>('offense');
  const live = data.live;
  const offense = live.filter(play => normalizeOdk(play.odk) === 'O');
  const defense = live.filter(play => normalizeOdk(play.odk) === 'D');
  const scoutingDefense = data.scouting.filter(play => normalizeOdk(play.odk) === 'D');
  const qbs = offense.filter(play => play.type.toLowerCase().includes('pass'));
  const carriers = Array.from(new Set(offense.map(play => play.carrier))).filter(Boolean).map(name => { const rows = offense.filter(play => play.carrier === name); return { name, count: rows.length, yards: rows.reduce((sum, play) => sum + num(play.gnls), 0), explosive: rows.filter(isExplosive).length }; }).sort((a, b) => b.yards - a.yards);
  const runPass = (plays: Play[]) => { const runs = plays.filter(play => play.type.toLowerCase().includes('run')).length; const passes = plays.filter(play => play.type.toLowerCase().includes('pass')).length; return plays.length ? `${Math.round(runs / plays.length * 100)}% / ${Math.round(passes / plays.length * 100)}%` : '—'; };
  const situation = (play: Play) => { const down = num(play.dn); if (down === 1) return '1st & long'; const distance = num(play.dist); return `${down === 2 ? '2nd' : '3rd'} & ${distance >= 7 ? 'long' : distance >= 4 ? 'med' : 'short'}`; };
  const situations = ['1st & long', '2nd & long', '2nd & med', '2nd & short', '3rd & long', '3rd & med', '3rd & short'];
  const defenseFormationRows = Array.from(new Set([...scoutingDefense, ...defense].map(play => play.form).filter(Boolean))).slice(0, 8);
  const exportReport = () => { const source = active === 'offense' ? offense : defense; const headers = ['Play #', 'ODK', 'Type', 'Ball Carrier', 'Gain/Loss', 'Result', 'Formation', 'Play Call']; const rows = source.map(play => [play.playNo, play.odk, play.type, play.carrier, play.gnls, play.result, play.form, play.offPlay].map(csvCell).join(',')); download(`coach-hudl-live-${active}.csv`, [headers.join(','), ...rows].join('\n')); };
  return <div className="content"><PageHead eyebrow="Reports · live game analysis" title="Make the call." description="Live offense and defense reports stay separate, so each staff conversation starts with the right lens." actions={<button className="btn btn-primary" onClick={exportReport} data-testid="button-export-report"><Download /> Export {active} CSV</button>} />
    <div className="filters report-tabs"><button className={`btn ${active === 'offense' ? 'btn-green' : 'btn-ghost'}`} onClick={() => setActive('offense')} data-testid="button-report-live-offense"><Zap /> Live offense</button><button className={`btn ${active === 'defense' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActive('defense')} data-testid="button-report-defense"><Shield /> Defense</button><span className="eyebrow">{active === 'offense' ? offense.length : defense.length} live snaps in view</span></div>
    {active === 'offense' ? <div className="grid" style={{ gridTemplateColumns: 'minmax(0, .8fr) minmax(0, 1.2fr)' }}><Panel><SectionTitle title="Live offense" detail="O entries only" /><div className="report-list"><div className="report-card active-report"><div className="report-info"><div className="report-icon"><Users size={16} /></div><div><h3>Quarterback report</h3><p>{qbs.length} pass attempts · pressure</p></div></div></div><div className="report-card"><div className="report-info"><div className="report-icon"><Zap size={16} /></div><div><h3>Ball-carrier report</h3><p>{carriers.length} carriers · usage · yardage</p></div></div></div><div className="report-card"><div className="report-info"><div className="report-icon"><Sparkles size={16} /></div><div><h3>Explosive plays</h3><p>{offense.filter(isExplosive).length} gains of 12+ yards</p></div></div></div></div></Panel><Panel pad={false}><div style={{ padding: '21px 21px 0' }}><SectionTitle title="Quarterback report" detail={`${offense.length} O snaps in the live board`} /></div><div className="panel-pad"><div className="grid kpi-grid" style={{ marginBottom: 22 }}><Kpi label="Pass attempts" value={String(qbs.length)} note="live throws" /><Kpi label="Pass yards" value={String(qbs.reduce((sum, play) => sum + num(play.gnls), 0))} note="charted gain" green /><Kpi label="Explosives" value={String(offense.filter(isExplosive).length)} note="12+ yards" /></div>{qbs.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Call</th><th>Formation</th><th>Result</th><th>Gain</th></tr></thead><tbody>{qbs.map((play, i) => <tr key={i}><td><strong>{play.offPlay}</strong></td><td>{play.form}</td><td>{play.result}</td><td>{formatGnls(num(play.gnls))}</td></tr>)}</tbody></table></div> : <div className="empty"><Users size={28} /><h3>No live O entries yet</h3><p>Mark offensive snaps with O in Live Game to populate this report.</p></div>}</div></Panel></div> : <div className="grid"><Panel><SectionTitle title="Scouting vs live defense" detail="D entries only · run/pass percentage" /><div className="comparison"><div className="compare-col"><div className="compare-head"><strong>Scouting board</strong><span className="tag">baseline</span></div><div className="compare-stat"><span>Snaps</span><b>{scoutingDefense.length}</b></div><div className="compare-stat"><span>Run / pass</span><b>{runPass(scoutingDefense)}</b></div><div className="compare-stat"><span>Average gain</span><b>{average(scoutingDefense)}</b></div></div><div className="compare-col"><div className="compare-head"><strong>Live board</strong><span className="tag green">today</span></div><div className="compare-stat"><span>Snaps</span><b>{defense.length}</b></div><div className="compare-stat"><span>Run / pass</span><b>{runPass(defense)}</b></div><div className="compare-stat"><span>Average gain</span><b>{average(defense)}</b></div></div></div></Panel><Panel><SectionTitle title="Run / pass by situation" detail="Scouting / live percentages" /><div className="table-wrap"><table className="data-table"><thead><tr><th>Situation</th><th>Scouting R / P</th><th>Live R / P</th></tr></thead><tbody>{situations.map(label => <tr key={label}><td><strong>{label}</strong></td><td>{runPass(scoutingDefense.filter(play => situation(play) === label))}</td><td>{runPass(defense.filter(play => situation(play) === label))}</td></tr>)}</tbody></table></div></Panel><Panel><SectionTitle title="Formation run / pass" detail="Scouting / live percentages" />{defenseFormationRows.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Formation</th><th>Scouting R / P</th><th>Live R / P</th></tr></thead><tbody>{defenseFormationRows.map(form => <tr key={form}><td><strong>{form}</strong></td><td>{runPass(scoutingDefense.filter(play => play.form === form))}</td><td>{runPass(defense.filter(play => play.form === form))}</td></tr>)}</tbody></table></div> : <div className="empty"><Shield size={28} /><h3>No D entries yet</h3><p>Mark defensive snaps with D in Live Game to populate this report.</p></div>}</Panel></div>}
  </div>;
}

function SchedulePage({ data, setData }: { data: Dataset; setData: (data: Dataset) => void }) {
  const [draft, setDraft] = useState({ season: '2025', opponent: '', date: '', location: 'Home', result: '—' });
  const [showArchived, setShowArchived] = useState(false);
  const schedule = data.schedule;
  const activeGame = schedule.find(game => game.id === data.activeGameId) ?? schedule[0];
  const seasons = Array.from(new Set(schedule.map(game => game.season))).sort((a, b) => Number(b) - Number(a));
  const lastSeason = activeGame ? String(Number(activeGame.season) - 1) : seasons[1];
  const addGame = () => {
    if (!draft.season.trim() || !draft.opponent.trim()) return;
    const id = `game-${Date.now()}-${draft.opponent.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const game: ScheduleGame = { ...draft, id, archived: false };
    setData({ ...data, schedule: [game, ...schedule], activeGameId: id });
    setDraft(current => ({ ...current, opponent: '', date: '', result: '—' }));
  };
  const toggleArchive = (id: string) => setData({ ...data, schedule: schedule.map(game => game.id === id ? { ...game, archived: !game.archived } : game) });
  const chooseGame = (id: string) => setData({ ...data, activeGameId: id });
  const visibleGames = schedule.filter(game => showArchived || !game.archived);
  const currentSeasonGames = schedule.filter(game => game.season === activeGame?.season);
  const lastSeasonGames = schedule.filter(game => game.season === lastSeason);
  return <div className="content"><PageHead eyebrow="Schedule · seasons & opponents" title="Know who is next." description="Enter your schedule, choose the active game, archive old opponents, and keep last season available for comparison." /><div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, .45fr)' }}><div className="grid"><Panel><SectionTitle title="Add to schedule" detail="Build the board you want to chart" /><div className="form-grid schedule-form"><div className="field"><label htmlFor="schedule-season">Season</label><input id="schedule-season" className="input" value={draft.season} onChange={event => setDraft({ ...draft, season: event.target.value })} placeholder="2025" data-testid="input-schedule-season" /></div><div className="field"><label htmlFor="schedule-opponent">Opponent</label><input id="schedule-opponent" className="input" value={draft.opponent} onChange={event => setDraft({ ...draft, opponent: event.target.value })} placeholder="Opponent name" data-testid="input-schedule-opponent" /></div><div className="field"><label htmlFor="schedule-date">Date</label><input id="schedule-date" className="input" type="date" value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} data-testid="input-schedule-date" /></div><div className="field"><label htmlFor="schedule-location">Location</label><select id="schedule-location" value={draft.location} onChange={event => setDraft({ ...draft, location: event.target.value })} data-testid="select-schedule-location"><option>Home</option><option>Away</option><option>Neutral</option></select></div></div><button className="btn btn-primary" onClick={addGame} disabled={!draft.season.trim() || !draft.opponent.trim()} data-testid="button-add-schedule-game"><Plus /> Add game</button></Panel><Panel pad={false}><div style={{ padding: '21px 21px 0' }}><SectionTitle title={`${activeGame?.season ?? 'Season'} schedule`} detail="Choose a game to make it active" link={<button className="btn btn-ghost" onClick={() => setShowArchived(value => !value)} data-testid="button-toggle-archived">{showArchived ? 'Hide archived' : 'Show archived'}</button>} /></div><div className="schedule-list">{visibleGames.map(game => <div className={`schedule-row ${game.id === data.activeGameId ? 'selected-schedule' : ''}`} key={game.id}><button className="schedule-select" onClick={() => chooseGame(game.id)} data-testid={`button-choose-game-${game.id}`}><span className="schedule-date">{game.date || 'Date TBD'}</span><strong>{game.opponent}</strong><span>{game.season} · {game.location} · {game.result}</span></button><button className={`btn ${game.archived ? 'btn-ghost' : 'btn-danger'}`} onClick={() => toggleArchive(game.id)} data-testid={`button-archive-game-${game.id}`}>{game.archived ? 'Restore' : 'Archive'}</button></div>)}</div></Panel></div><div className="grid"><Panel><SectionTitle title="Active game" detail="Current charting context" />{activeGame ? <><div className="kpi-value" style={{ fontSize: 27 }}>{activeGame.opponent}</div><p className="kpi-note">{activeGame.season} · {activeGame.date || 'Date TBD'} · {activeGame.location}</p><div className="callout" style={{ marginTop: 16 }}><Target />Live and scouting boards are ready for the selected game.</div></> : <div className="empty"><FileSpreadsheet size={28} /><h3>No active game</h3><p>Add a schedule entry to begin.</p></div>}</Panel><Panel><SectionTitle title="Last season comparison" detail={`${lastSeason} schedule`} /><div className="compare-stat"><span>{activeGame?.season ?? 'Current'} games</span><b>{currentSeasonGames.length}</b></div><div className="compare-stat"><span>{lastSeason} games</span><b>{lastSeasonGames.length}</b></div><div className="feed" style={{ marginTop: 12 }}>{lastSeasonGames.length ? lastSeasonGames.slice(0, 4).map(game => <div className="feed-row" key={game.id}><span className="feed-num">{game.season}</span><div className="feed-main"><strong>{game.opponent}</strong><span>{game.date || 'Date TBD'} · {game.result}</span></div></div>) : <div className="eyebrow">Add last season opponents to compare them here.</div>}</div></Panel></div></div></div>;
}

function NotFoundPage() { return <div className="content"><PageHead eyebrow="404 · off the board" title="That page isn't charted." description="Use the workspace navigation to get back into the film room." actions={<Link href="/" className="btn btn-primary" data-testid="link-not-found-home"><LayoutDashboard /> Back to overview</Link>} /></div>; }

function Router() {
  const [data, setDataState] = useState<Dataset>(safeLoad);
  const [loadingFromSupabase, setLoadingFromSupabase] = useState(true);

  const setData = (next: Dataset) => {
    setDataState(next);
    saveDataset(next);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadSupabaseData() {
      try {
        const seasons = await getSeasons();

        if (!seasons.length) {
          return;
        }

        const currentSeason =
          seasons.find(season => season.is_current) ?? seasons[0];

        const games = await getGames(undefined, true);

        if (cancelled) return;

        const seasonYears = new Map(
          seasons.map(season => [season.id, String(season.season_year)])
        );

        const schedule: ScheduleGame[] = games.map(game => ({
          id: game.id,
          season: seasonYears.get(game.season_id) ?? 'Unknown',
          opponent: game.opponent,
          date: game.game_date ?? '',
          location: game.location ?? '—',
          result: game.game_result ?? '—',
          archived: game.archived,
        }));

        const activeGameId =
          schedule.find(game => !game.archived)?.id ??
          schedule[0]?.id ??
          '';

        setDataState(current => ({
          ...current,
          schedule,
          activeGameId,
        }));

        saveDataset({
          ...safeLoad(),
          schedule,
          activeGameId,
        });
      } catch (error) {
        console.error('Could not load football data from Supabase:', error);
      } finally {
        if (!cancelled) {
          setLoadingFromSupabase(false);
        }
      }
    }

    loadSupabaseData();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loadingFromSupabase) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={24} />
          <p>Loading football data…</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell data={data} setData={setData}>
      <Switch>
        <Route path="/"><Dashboard data={data} /></Route>
        <Route path="/upload"><UploadPage data={data} setData={setData} /></Route>
        <Route path="/scout"><ScoutPage data={data} /></Route>
        <Route path="/live"><LiveSpreadsheetPage data={data} setData={setData} /></Route>
        <Route path="/reports"><ReportsHubPage data={data} /></Route>
        <Route path="/schedule"><SchedulePage data={data} setData={setData} /></Route>
        <Route><NotFoundPage /></Route>
      </Switch>
    </AppShell>
  );
}
function App() { return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter>; }

export default App;
