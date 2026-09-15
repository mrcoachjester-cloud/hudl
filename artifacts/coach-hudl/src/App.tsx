import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { appendScoutingPlays, createGame, createScoutingSession, getGames, getLivePlays, getScoutingSessions, getScoutingPlays, getSeasons, livePlayToStandard, scoutingPlayToStandard, type StandardPlay } from './lib/footballData';
import { getScoutingPlaysForTeam } from './lib/teamData';
import { parseHudlCsv } from './lib/hudlCsv';
import { isSupabaseConfigured } from './lib/supabase';
import { standardPlaysToHudlCsv, hudlCsvFilename } from './lib/hudlCsvExport';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Compass,
  Download,
  FileSpreadsheet,
  Film,
  Gauge,
  Layers,
  LayoutDashboard,
  Menu,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Split,
  Target,
  Trash2,
  TrendingUp,
  UploadCloud,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

type Play = StandardPlay;

type ScheduleGame = {
  id: string;
  season: string;
  opponent: string;
  date: string;
  location: string;
  result: string;
  archived: boolean;
};

type Dataset = {
  scouting: Play[];
  live: Play[];
  schedule: ScheduleGame[];
  activeGameId: string;
  gameData?: Record<string, { scouting: Play[]; live: Play[] }>;
};

type NavKey = '/' | '/upload' | '/scout' | '/live' | '/reports' | '/schedule';

const STORAGE_KEY = 'coach-hudl-datasets-v2';
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
const emptyDataset: Dataset = {
  scouting: demoScouting,
  live: [],
  schedule: demoSchedule,
  activeGameId: demoSchedule[0].id,
  gameData: { [demoSchedule[0].id]: { scouting: demoScouting, live: [] } },
};

function safeLoad(): Dataset {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('coach-hudl-datasets-v1');
    if (!raw) return emptyDataset;
    const parsed = JSON.parse(raw) as Partial<Dataset>;
    const schedule = Array.isArray(parsed.schedule) && parsed.schedule.length ? parsed.schedule : demoSchedule;
    const activeGameId = typeof parsed.activeGameId === 'string' && schedule.some(game => game.id === parsed.activeGameId) ? parsed.activeGameId : schedule[0].id;
    const gameData: Record<string, { scouting: Play[]; live: Play[] }> =
      parsed.gameData && typeof parsed.gameData === 'object'
        ? parsed.gameData
        : {};

    const currentPlays = gameData[activeGameId] ?? {
      scouting: activeGameId === demoSchedule[0].id ? demoScouting : [],
      live: [],
    };

    return {
      scouting: currentPlays.scouting,
      live: currentPlays.live,
      schedule,
      activeGameId,
      gameData: {
        ...gameData,
        [activeGameId]: currentPlays,
      },
    };
  } catch {
    return emptyDataset;
  }
}
function saveDataset(data: Dataset) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Could not persist dataset to localStorage:', err);
  }
}
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
    const actualStart = play.startYardLn ? normalizeYardLine(play.startYardLn) : previousYardLine;
    const yardLine = normalizeYardLine(play.yardLn);
    const gain = calculateGnls(actualStart, yardLine);
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
const headerAliases: Partial<Record<keyof Play, string[]>> = {
  playNo: ['play #', 'play no', 'play number', 'play'], odk: ['odk', 'off def kick'], dn: ['dn', 'down'], dist: ['dist', 'distance', 'to go'],
  hash: ['hash', 'field hash'], gnls: ['gn/ls', 'gn ls', 'gain loss', 'yards', 'result yards'], carrier: ['ball carrier', 'carrier', 'ballcarrier', 'player'],
  yardLn: ['yard ln', 'yard line', 'yardline'], startYardLn: ['start yard ln', 'start yard line', 'start'], type: ['play type', 'type', 'run pass'], result: ['result', 'outcome'], form: ['off form', 'formation', 'offensive formation'],
  defense: ['defense', 'def front', 'front'], motion: ['motion'], offPlay: ['off play', 'play call', 'offensive play'], personnel: ['personnel', 'personnel group', 'offensive personnel'], scheme: ['scheme', 'offensive scheme', 'defensive scheme'], dir: ['play dir', 'direction', 'play direction'],
  backfield: ['backfield'],
};
export function parseCsv(text: string): Play[] {
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
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeGame = data.schedule.find(game => game.id === data.activeGameId) ?? data.schedule[0];

  const seasons = Array.from(new Set(data.schedule.map(game => game.season)))
    .sort((a, b) => Number(b) - Number(a));

  const activeSeason = activeGame?.season ?? seasons[0] ?? '';

  const seasonGames = data.schedule
    .filter(game => game.season === activeSeason)
    .sort((a, b) => a.date.localeCompare(b.date));

  const selectGame = async (gameId: string) => {
    if (!gameId || gameId === data.activeGameId) return;
    const gameData = {
      ...(data.gameData || {}),
      [data.activeGameId]: { scouting: data.scouting, live: data.live },
    };
    let targetPlays = gameData[gameId];
    if (!targetPlays) {
      let livePlays: Play[] = [];
      let scoutingPlays: Play[] = [];
      if (isSupabaseConfigured) {
        try {
          const remoteLive = await getLivePlays(gameId);
          if (remoteLive.length > 0) livePlays = remoteLive.map(livePlayToStandard);
          const gameObj = data.schedule.find(g => g.id === gameId);
          const seasons = await getSeasons();
          const currentSeason = seasons.find(s => s.is_current) ?? seasons[0];
          if (currentSeason && gameObj) {
            const sessions = await getScoutingSessions(currentSeason.id);
            const matchedSession = sessions.find(
              s =>
                s.game_id === gameId ||
                (s.opponent && s.opponent.toLowerCase().trim() === gameObj.opponent.toLowerCase().trim())
            );
            if (matchedSession) {
              const remoteScout = await getScoutingPlays(matchedSession.id);
              if (remoteScout.length > 0) scoutingPlays = remoteScout.map(scoutingPlayToStandard);
            }
          }
        } catch (err) {
          console.warn('Could not fetch game data from Supabase:', err);
        }
      } else if (gameId === demoSchedule[0].id) {
        scoutingPlays = demoScouting;
      }
      targetPlays = { scouting: scoutingPlays, live: livePlays };
    }
    setData({
      ...data,
      activeGameId: gameId,
      scouting: targetPlays.scouting,
      live: targetPlays.live,
      gameData: {
        ...gameData,
        [gameId]: targetPlays,
      },
    });
  };

  const selectSeason = (season: string) => {
    const firstGame =
      data.schedule.find(game => game.season === season && !game.archived) ??
      data.schedule.find(game => game.season === season);

    if (firstGame) {
      selectGame(firstGame.id);
    }
  };

  const items: { href: NavKey; label: string; icon: typeof LayoutDashboard }[] = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/upload', label: 'Data room', icon: UploadCloud },
    { href: '/scout', label: 'Scouting', icon: Film },
    { href: '/live', label: 'Live game', icon: Target },
    { href: '/reports', label: 'Reports', icon: ClipboardList },
    { href: '/schedule', label: 'Schedule', icon: FileSpreadsheet },
  ];

  const totalPlays = data.scouting.length + data.live.length;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">CC</div>
          <div className="brand-name">
            coach<span>Connect</span>
          </div>
        </div>
        <div className="nav-label eyebrow">Workspace</div>
        <nav className="nav-list" aria-label="Primary navigation">
          {items.map(item => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`nav-item ${location === item.href ? 'active' : ''}`}
                data-testid={`link-nav-${item.label.toLowerCase().replace(' ', '-')}`}
              >
                <Icon />
                <span>{item.label}</span>
                {location === item.href && <ChevronRight className="ml-auto" />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-spacer" />
        <div className="season-card">
          <div className="eyebrow">Active matchup</div>
          <strong>{activeGame ? `${activeGame.season} · ${activeGame.opponent}` : 'No active game'}</strong>
          <p>{activeGame ? `${activeGame.location} · ${totalPlays} plays charted` : 'Choose a game from Schedule.'}</p>
          <div className="season-line" />
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-title">
            <button className="mobile-menu" onClick={() => setMobileOpen(value => !value)} aria-label="Open navigation" data-testid="button-open-navigation">
              <Menu />
            </button>
            <span>Coach Connect workspace</span>
          </div>

          <div className="topbar-actions" style={{ gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label htmlFor="global-season" className="eyebrow" style={{ margin: 0 }}>
                Season
              </label>
              <select
                id="global-season"
                value={activeSeason}
                onChange={event => selectSeason(event.target.value)}
                style={{ minWidth: 90 }}
                data-testid="select-global-season"
              >
                {seasons.map(season => (
                  <option key={season} value={season}>
                    {season}
                  </option>
                ))}
              </select>
            </div>

            <div className="live-pill">
              <span className="live-dot" /> {isSupabaseConfigured ? 'cloud connected' : 'local workspace'}
            </div>
            <div className="avatar" aria-label="Coach profile">
              JR
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

function PageHead({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="page-head fade-in">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

function Panel({ children, className = '', pad = true, style }: { children: ReactNode; className?: string; pad?: boolean; style?: CSSProperties }) {
  return (
    <section className={`panel ${pad ? 'panel-pad' : ''} ${className}`} style={style}>
      {children}
    </section>
  );
}

function SectionTitle({ title, detail, link }: { title: string; detail?: string; link?: ReactNode }) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {detail && <p>{detail}</p>}
      </div>
      {link}
    </div>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 2800);
    return () => window.clearTimeout(timer);
  }, [onClose]);
  return (
    <div className="toast" role="status" data-testid="status-toast">
      <Check />
      <span>{message}</span>
      <button onClick={onClose} aria-label="Dismiss notification" data-testid="button-dismiss-toast">
        <X />
      </button>
    </div>
  );
}

function useToast() {
  const [message, setMessage] = useState('');
  return { message, notify: setMessage, clear: () => setMessage('') };
}

function Kpi({ label, value, note, green = false }: { label: string; value: string; note: string; green?: boolean }) {
  return (
    <div className={`panel kpi ${green ? 'green' : ''}`} data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-note">{note}</div>
    </div>
  );
}

function Dashboard({ data, setData }: { data: Dataset; setData?: (data: Dataset) => void }) {
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'O' | 'D' | 'K'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'scouting' | 'live'>('all');

  const activeGame = data.schedule.find(game => game.id === data.activeGameId) ?? data.schedule[0];
  const scoutingPlays = data.scouting;
  const livePlays = data.live;

  const basePlays = useMemo(() => {
    if (sourceFilter === 'scouting') return scoutingPlays;
    if (sourceFilter === 'live') return livePlays;
    return [...scoutingPlays, ...livePlays];
  }, [sourceFilter, scoutingPlays, livePlays]);

  const plays = useMemo(() => {
    if (phaseFilter === 'all') return basePlays;
    return basePlays.filter(play => normalizeOdk(play.odk) === phaseFilter);
  }, [basePlays, phaseFilter]);

  // Core Football Efficiency Calculations
  const runs = plays.filter(play => play.type.toLowerCase().includes('run'));
  const passes = plays.filter(play => play.type.toLowerCase().includes('pass'));
  const explosives = plays.filter(isExplosive);

  const runPercent = plays.length ? Math.round((runs.length / plays.length) * 100) : 0;
  const passPercent = plays.length ? 100 - runPercent : 0;

  const runYards = runs.reduce((sum, play) => sum + num(play.gnls), 0);
  const passYards = passes.reduce((sum, play) => sum + num(play.gnls), 0);
  const runAvg = runs.length ? (runYards / runs.length).toFixed(1) : '0.0';
  const passAvg = passes.length ? (passYards / passes.length).toFixed(1) : '0.0';

  // Standard Football Success Rate (1st: 40% dist, 2nd: 60% dist, 3rd/4th: 100% dist)
  const successCount = plays.filter(play => {
    const down = num(play.dn);
    const dist = Math.max(num(play.dist), 1);
    const gain = num(play.gnls);
    if (down === 1) return gain >= dist * 0.4 || gain >= 4;
    if (down === 2) return gain >= dist * 0.6 || gain >= 4;
    if (down === 3 || down === 4) return gain >= dist;
    return gain >= 4;
  }).length;
  const successRate = plays.length ? Math.round((successCount / plays.length) * 100) : 0;

  // 3rd Down Conversions
  const thirdDownPlays = plays.filter(play => play.dn === '3');
  const thirdDownConverted = thirdDownPlays.filter(play => num(play.gnls) >= num(play.dist) && num(play.dist) > 0).length;
  const thirdDownPct = thirdDownPlays.length ? Math.round((thirdDownConverted / thirdDownPlays.length) * 100) : 0;

  // Down Profiles
  const downGroups = ['1', '2', '3', '4'].map(down => {
    const dPlays = plays.filter(play => play.dn === down);
    const dRuns = dPlays.filter(play => play.type.toLowerCase().includes('run'));
    const dPasses = dPlays.filter(play => play.type.toLowerCase().includes('pass'));
    const dRunPct = dPlays.length ? Math.round((dRuns.length / dPlays.length) * 100) : 0;
    return {
      down,
      total: dPlays.length,
      runs: dRuns.length,
      passes: dPasses.length,
      runPct: dRunPct,
      passPct: 100 - dRunPct,
      avg: average(dPlays),
    };
  });
  const maxDownCount = Math.max(...downGroups.map(d => d.total), 1);

  // Formations Breakdown
  const uniqueFormations = Array.from(new Set(plays.map(p => p.form).filter(f => f && f !== '—')));
  const formationStats = uniqueFormations.map(form => {
    const fPlays = plays.filter(p => p.form === form);
    const fRuns = fPlays.filter(p => p.type.toLowerCase().includes('run'));
    const fPasses = fPlays.filter(p => p.type.toLowerCase().includes('pass'));
    const fRunPct = fPlays.length ? Math.round((fRuns.length / fPlays.length) * 100) : 0;
    const playCalls = Array.from(new Set(fPlays.map(p => p.offPlay).filter(c => c && c !== '—'))).map(call => ({
      call,
      count: fPlays.filter(p => p.offPlay === call).length,
    })).sort((a, b) => b.count - a.count);
    return {
      form,
      total: fPlays.length,
      runPct: fRunPct,
      passPct: 100 - fRunPct,
      avg: average(fPlays),
      topCall: playCalls[0] ? `${playCalls[0].call} (${Math.round((playCalls[0].count / fPlays.length) * 100)}%)` : '—',
    };
  }).sort((a, b) => b.total - a.total).slice(0, 4);

  // Dynamic Tendency Tells Generator
  const alerts: { num: string; title: string; detail: string; tag: string; tagColor?: string }[] = [];
  const firstDown = downGroups[0];
  if (firstDown.total >= 3) {
    if (firstDown.runPct >= 65) {
      alerts.push({
        num: String(alerts.length + 1).padStart(2, '0'),
        title: 'Heavy run bias on 1st down',
        detail: `${firstDown.runPct}% run rate on 1st down (${firstDown.runs} runs, avg ${firstDown.avg} yds). Expect inside/outside zone on 1st & 10.`,
        tag: 'tendency',
        tagColor: 'green',
      });
    } else if (firstDown.passPct >= 65) {
      alerts.push({
        num: String(alerts.length + 1).padStart(2, '0'),
        title: 'Early-down passing aggression',
        detail: `${firstDown.passPct}% pass rate on 1st down (${firstDown.passes} throws). Watch for quick game and play-action shots.`,
        tag: 'alert',
        tagColor: 'gold',
      });
    }
  }

  formationStats.forEach(f => {
    if (f.total >= 3) {
      if (f.runPct >= 75) {
        alerts.push({
          num: String(alerts.length + 1).padStart(2, '0'),
          title: `${f.form} is a dedicated run look`,
          detail: `${f.runPct}% run tendency (${f.total} snaps). Primary call: ${f.topCall}.`,
          tag: 'tell',
          tagColor: 'green',
        });
      } else if (f.passPct >= 75) {
        alerts.push({
          num: String(alerts.length + 1).padStart(2, '0'),
          title: `${f.form} triggers the pass game`,
          detail: `${f.passPct}% pass tendency (${f.total} snaps). Primary call: ${f.topCall}.`,
          tag: 'key',
          tagColor: 'gold',
        });
      }
    }
  });

  const motionPlays = plays.filter(p => p.motion && p.motion.toLowerCase() !== 'none' && p.motion !== '—');
  if (motionPlays.length >= 2) {
    const motionPasses = motionPlays.filter(p => p.type.toLowerCase().includes('pass')).length;
    const motionPassPct = Math.round((motionPasses / motionPlays.length) * 100);
    alerts.push({
      num: String(alerts.length + 1).padStart(2, '0'),
      title: `Motion tell: ${motionPassPct}% pass tendency`,
      detail: `${motionPlays.length} motion-tagged snaps. Formation adjustment creates coverage voids.`,
      tag: 'tell',
      tagColor: '',
    });
  }

  const thirdAndLong = plays.filter(p => p.dn === '3' && num(p.dist) >= 7);
  if (thirdAndLong.length >= 2) {
    const tPasses = thirdAndLong.filter(p => p.type.toLowerCase().includes('pass')).length;
    alerts.push({
      num: String(alerts.length + 1).padStart(2, '0'),
      title: '3rd & Long pass lock',
      detail: `${Math.round((tPasses / thirdAndLong.length) * 100)}% pass rate on 3rd & 7+ (${tPasses} of ${thirdAndLong.length} snaps). Prime pressure window.`,
      tag: 'money down',
      tagColor: 'gold',
    });
  }

  if (alerts.length === 0 && plays.length > 0) {
    alerts.push({
      num: '01',
      title: 'Charted profile ready',
      detail: `${plays.length} snaps ready for analysis across ${formationStats.length || 1} formation packages.`,
      tag: 'ready',
      tagColor: 'green',
    });
  }

  // Live vs Scouting Comparison Shift
  const hasLive = livePlays.length > 0;
  const scoutRunPct = scoutingPlays.length ? Math.round((scoutingPlays.filter(p => p.type.toLowerCase().includes('run')).length / scoutingPlays.length) * 100) : 0;
  const liveRunPct = livePlays.length ? Math.round((livePlays.filter(p => p.type.toLowerCase().includes('run')).length / livePlays.length) * 100) : 0;
  const runShift = liveRunPct - scoutRunPct;

  const loadDemoScout = () => {
    if (setData) {
      setData({ ...data, scouting: demoScouting });
    }
  };

  return (
    <div className="content">
      <PageHead
        eyebrow={`Opponent intelligence · ${activeGame ? `${activeGame.season} · ${activeGame.location === 'Home' ? 'vs' : '@'} ${activeGame.opponent}` : 'Active Game'}`}
        title="Your film room, sharper."
        description={`${activeGame ? activeGame.opponent : 'Opponent'} is queued up with ${plays.length} charted snaps in active view (${scoutingPlays.length} scout, ${livePlays.length} live).`}
        actions={
          <>
            <Link href="/upload" className="btn btn-ghost" data-testid="link-dashboard-upload">
              <UploadCloud /> Data room
            </Link>
            <Link href="/scout" className="btn btn-ghost" data-testid="link-dashboard-scout">
              <Film /> Scouting tape
            </Link>
            <Link href="/live" className="btn btn-primary" data-testid="link-dashboard-live">
              <Target /> Sideline chart <ChevronRight />
            </Link>
          </>
        }
      />

      {/* Filter Tabs */}
      <div className="filters" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div className="actions" style={{ gap: 6 }}>
          <button
            className={`btn ${phaseFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: 11 }}
            onClick={() => setPhaseFilter('all')}
            data-testid="filter-phase-all"
          >
            All phases
          </button>
          <button
            className={`btn ${phaseFilter === 'O' ? 'btn-green' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: 11 }}
            onClick={() => setPhaseFilter('O')}
            data-testid="filter-phase-offense"
          >
            <Zap size={13} /> Offense (O)
          </button>
          <button
            className={`btn ${phaseFilter === 'D' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: 11 }}
            onClick={() => setPhaseFilter('D')}
            data-testid="filter-phase-defense"
          >
            <Shield size={13} /> Defense (D)
          </button>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="eyebrow" style={{ margin: 0 }}>
            Source:
          </span>
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value as 'all' | 'scouting' | 'live')}
            style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6 }}
            data-testid="select-source-filter"
          >
            <option value="all">Combined ({scoutingPlays.length + livePlays.length})</option>
            <option value="scouting">Scouting only ({scoutingPlays.length})</option>
            <option value="live">Live game only ({livePlays.length})</option>
          </select>
        </div>
      </div>

      {/* KPI Suite */}
      <div className="grid kpi-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <Kpi label="Plays charted" value={String(plays.length).padStart(2, '0')} note={`${runs.length} Run / ${passes.length} Pass`} />
        <Kpi label="Yards / play" value={average(plays)} note={`Run ${runAvg} / Pass ${passAvg}`} green />
        <Kpi label="Success rate" value={`${successRate}%`} note={`${successCount} situational wins`} green={successRate >= 50} />
        <Kpi label="Explosive plays" value={String(explosives.length).padStart(2, '0')} note={`${plays.length ? Math.round((explosives.length / plays.length) * 100) : 0}% of charted snaps`} />
      </div>

      {/* Live Shift Alert Banner */}
      {hasLive && (
        <Panel className="fade-in" style={{ marginBottom: 14, background: 'rgba(31, 201, 139, 0.06)', borderColor: 'rgba(31, 201, 139, 0.28)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 8, borderRadius: 8, background: 'rgba(31, 201, 139, 0.18)', color: '#62dfae' }}>
                <Activity size={18} />
              </div>
              <div>
                <strong style={{ fontSize: 14, color: '#fff' }}>Game-Day Shift Detected</strong>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                  Live game is trending {runShift > 5 ? `+${runShift}% more run-heavy` : runShift < -5 ? `+${Math.abs(runShift)}% more pass-heavy` : 'consistent with'} the scouting report ({liveRunPct}% Run live vs {scoutRunPct}% Run scout).
                </p>
              </div>
            </div>
            <Link href="/live" className="btn btn-green" style={{ padding: '6px 12px', fontSize: 11 }} data-testid="link-banner-live">
              View live sideline
            </Link>
          </div>
        </Panel>
      )}

      {/* Main Analysis Grid */}
      <div className="grid dashboard-grid">
        {/* Down & Distance Profile */}
        <Panel>
          <SectionTitle
            title="Down & distance profile"
            detail="Snap count & Run/Pass distribution by down"
            link={
              <Link href="/scout" className="tiny-link" data-testid="link-dashboard-down-profile">
                Full breakdown
              </Link>
            }
          />
          <div className="bar-chart" style={{ height: 180 }}>
            {downGroups.map(d => (
              <div className="bar-col" key={d.down}>
                <span className="bar-value">
                  {d.total} <small style={{ opacity: 0.7 }}>({d.runPct}% R)</small>
                </span>
                <div className="bar" style={{ height: `${Math.max(10, (d.total / maxDownCount) * 120)}px` }} />
                <span className="bar-label">
                  {d.down}
                  {d.down === '1' ? 'st' : d.down === '2' ? 'nd' : d.down === '3' ? 'rd' : 'th'}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <div>
              <span className="eyebrow">3rd down conversion:</span> <strong>{thirdDownPct}%</strong> ({thirdDownConverted}/{thirdDownPlays.length})
            </div>
            <div>
              <span className="eyebrow">Early down run rate:</span> <strong>{firstDown.runPct}%</strong>
            </div>
          </div>
        </Panel>

        {/* Call Mix & Identity */}
        <Panel>
          <SectionTitle title="Play call mix" detail="Run / pass identity at a glance" />
          <div className="donut-wrap">
            <div
              className="donut"
              style={{
                background: `conic-gradient(hsl(var(--accent)) 0 ${runPercent}%, hsl(var(--primary)) ${runPercent}% 100%)`,
              }}
            >
              <div className="donut-center">
                <strong>{plays.length}</strong>
                <span>snaps</span>
              </div>
            </div>
            <div className="legend">
              <div className="legend-row">
                <span className="legend-dot" style={{ background: 'hsl(var(--accent))' }} />
                Run <b>{runPercent}%</b> ({runs.length})
              </div>
              <div className="legend-row">
                <span className="legend-dot" style={{ background: 'hsl(var(--primary))' }} />
                Pass <b>{passPercent}%</b> ({passes.length})
              </div>
              <div className="legend-row" style={{ marginTop: 8, fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                Explosives: <b style={{ color: '#fff', marginLeft: 4 }}>{explosives.length}</b>
              </div>
            </div>
          </div>
        </Panel>

        {/* Dynamic Tendency Tells Feed */}
        <Panel>
          <SectionTitle title="Tendency alerts & tells" detail="Automated tactical cues for staff meetings" />
          <div className="feed">
            {alerts.map(item => (
              <div className="feed-row" key={item.num}>
                <span className="feed-num">{item.num}</span>
                <div className="feed-main">
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
                <span className={`tag ${item.tagColor === 'green' ? 'green' : item.tagColor === 'gold' ? 'gold' : ''}`}>
                  {item.tag}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Top Formations Matrix */}
        <Panel>
          <SectionTitle title="Formation tendencies" detail="Package distribution & favorite call" />
          {formationStats.length ? (
            <div className="feed">
              {formationStats.map(f => (
                <div className="feed-row" key={f.form}>
                  <div className="feed-main">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <strong>{f.form}</strong>
                      <span className="eyebrow" style={{ color: '#62dfae' }}>{f.runPct}% Run / {f.passPct}% Pass</span>
                    </div>
                    <span>Primary call: <b>{f.topCall}</b> · Avg gain: <b>{f.avg} yds</b></span>
                    <div className="progress" style={{ marginTop: 6, height: 4 }}>
                      <span style={{ width: `${f.runPct}%`, background: 'hsl(var(--accent))' }} />
                    </div>
                  </div>
                  <span className="tag" style={{ marginLeft: 8 }}>{f.total} snaps</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty" style={{ padding: 20 }}>
              <Layers size={24} />
              <p style={{ margin: 0 }}>No formation data in current filter.</p>
            </div>
          )}
        </Panel>

        {/* Recent Charted Plays */}
        <Panel style={{ gridColumn: '1 / -1' }} pad={false}>
          <div style={{ padding: '21px 21px 0' }}>
            <SectionTitle
              title="Recent charted plays"
              detail={`Latest snaps from ${sourceFilter === 'all' ? 'active board' : sourceFilter}`}
              link={
                <Link href="/scout" className="tiny-link" data-testid="link-dashboard-recent">
                  Full tape ledger
                </Link>
              }
            />
          </div>
          {plays.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Play #</th>
                    <th>Phase</th>
                    <th>Situation</th>
                    <th>Type / Call</th>
                    <th>Formation</th>
                    <th>Ball carrier</th>
                    <th>Gain / loss</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {plays.slice(-5).reverse().map((play, i) => (
                    <tr key={`${play.playNo}-${i}`} data-testid={`row-overview-play-${i}`}>
                      <td>
                        <strong>#{play.playNo}</strong>
                      </td>
                      <td>
                        <span className={`tag ${normalizeOdk(play.odk) === 'O' ? 'green' : normalizeOdk(play.odk) === 'D' ? '' : 'gold'}`}>
                          {play.odk}
                        </span>
                      </td>
                      <td>
                        {play.dn}&amp;{play.dist} · {play.hash}
                      </td>
                      <td>
                        <span className={`tag ${play.type.toLowerCase().includes('run') ? 'green' : ''}`}>
                          {play.type}
                        </span>{' '}
                        <span style={{ marginLeft: 6 }}>{play.offPlay}</span>
                      </td>
                      <td>{play.form}</td>
                      <td>{play.carrier}</td>
                      <td style={{ color: num(play.gnls) >= 0 ? '#62dfae' : '#ef8f88' }}>
                        {num(play.gnls) > 0 ? `+${play.gnls}` : play.gnls}
                      </td>
                      <td>{play.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              <Film size={28} />
              <h3>No charted plays for this game</h3>
              <p>Import a CSV, chart live sideline snaps, or load demo scouting tape.</p>
              <button className="btn btn-primary" onClick={loadDemoScout} data-testid="button-overview-load-demo">
                <Sparkles /> Load demo scouting data
              </button>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function UploadPage({ data, setData }: { data: Dataset; setData: (data: Dataset) => void }) {
  const scheduleTeams = useMemo(() => Array.from(new Set(data.schedule.map(game => game.opponent.trim()).filter(Boolean))).sort(), [data.schedule]);
  const [team, setTeam] = useState(data.activeTeam || scheduleTeams[0] || '');
  const [scouts, setScouts] = useState<Array<{ id: string; description: string | null; created_at: string }>>([]);
  const [scoutId, setScoutId] = useState('new');
  const [newScoutName, setNewScoutName] = useState('Scout File');
  const [preview, setPreview] = useState<Play[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const teamGame = useMemo(() => data.schedule.find(game => game.opponent.trim().toLowerCase() === team.trim().toLowerCase()), [data.schedule, team]);
  const seasonYear = teamGame?.season || data.schedule[0]?.season || '';

  useEffect(() => {
    let cancelled = false;
    async function loadScouts() {
      if (!team || !seasonYear) { setScouts([]); return; }
      try {
        const seasons = await getSeasons();
        const season = seasons.find(item => String(item.season_year) === String(seasonYear));
        if (!season) { setScouts([]); return; }
        const sessions = await getScoutingSessions(season.id);
        const filtered = sessions.filter(session => session.opponent.trim().toLowerCase() === team.trim().toLowerCase());
        if (!cancelled) {
          setScouts(filtered.map(session => ({ id: session.id, description: session.description, created_at: session.created_at })));
          setScoutId(current => filtered.some(session => session.id === current) ? current : (filtered[0]?.id ?? 'new'));
        }
      } catch (error) {
        console.error('Could not load scout files:', error);
        if (!cancelled) setScouts([]);
      }
    }
    void loadScouts();
    return () => { cancelled = true; };
  }, [team, seasonYear]);

  const selectTeam = (value: string) => {
    setTeam(value);
    setScoutId('new');
    setPreview([]);
    if (value) {
      const game = data.schedule.find(item => item.opponent.trim().toLowerCase() === value.trim().toLowerCase());
      setData({ ...data, activeTeam: value, ...(game ? { activeGameId: game.id, live: data.gameData?.[game.id]?.live ?? [] } : {}) });
    }
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!team) { toast.notify('Select a Team before uploading.'); return; }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = parseHudlCsv(String(reader.result ?? ''));
        setPreview(parsed.slice(0, 12));
        if (!parsed.length) { toast.notify('No readable play rows found in that file'); return; }
        const seasons = await getSeasons();
        const season = seasons.find(item => String(item.season_year) === String(seasonYear));
        if (!season) throw new Error('The selected team does not have a matching Supabase season.');
        let targetScoutId = scoutId;
        if (targetScoutId === 'new') {
          const session = await createScoutingSession({ seasonId: season.id, team, description: newScoutName.trim() || file.name.replace(/\.csv$/i, '') || 'Scout File' });
          if (!session) throw new Error('Supabase is not configured.');
          targetScoutId = session.id;
        }
        await appendScoutingPlays(targetScoutId, parsed);
        const scouting = await getScoutingPlaysForTeam(seasonYear, team);
        setData({ ...data, activeTeam: team, scouting });
        toast.notify(parsed.length + ' plays saved under ' + team + ' · ' + (scouts.find(s => s.id === targetScoutId)?.description ?? newScoutName));
        if (targetScoutId !== scoutId) setScoutId(targetScoutId);
        const sessions = await getScoutingSessions(season.id);
        setScouts(sessions.filter(session => session.opponent.trim().toLowerCase() === team.trim().toLowerCase()).map(session => ({ id: session.id, description: session.description, created_at: session.created_at })));
      } catch (error) {
        console.error('Scout upload failed:', error);
        toast.notify(error instanceof Error ? error.message : 'Scout upload failed');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => { setLoading(false); toast.notify('Could not read that file'); };
    reader.readAsText(file);
  };

  const selectedScout = scouts.find(scout => scout.id === scoutId);
  return <div className="content">
    <PageHead eyebrow="Data room · scouting files" title="Organize the opponent." description="Choose a team from your Schedule, choose its Scout File, then upload the scouting data into that file. Live Game data stays separate." actions={<button className="btn btn-primary" onClick={() => fileRef.current?.click()} data-testid="button-upload-top"><UploadCloud /> Upload Data</button>} />
    <input ref={fileRef} className="drop-input" type="file" accept=".csv,text/csv" onChange={event => handleFile(event.target.files?.[0])} data-testid="input-csv-file" />
    <Panel>
      <SectionTitle title="Scout data" detail="Team → Scout File → Upload" />
      <div className="filters" style={{ alignItems: 'end' }}>
        <div><label className="eyebrow">Team</label><select value={team} onChange={event => selectTeam(event.target.value)} data-testid="select-data-room-team"><option value="">Select Team</option>{scheduleTeams.map(name => <option key={name} value={name}>{name}</option>)}</select></div>
        <div><label className="eyebrow">Scout</label><select value={scoutId} onChange={event => setScoutId(event.target.value)} disabled={!team} data-testid="select-data-room-scout"><option value="new">+ New Scout File</option>{scouts.map(scout => <option key={scout.id} value={scout.id}>{scout.description || 'Scout File'}</option>)}</select></div>
        {scoutId === 'new' && <div><label className="eyebrow">Scout File Name</label><input className="input" value={newScoutName} onChange={event => setNewScoutName(event.target.value)} placeholder="Scout File 1" /></div>}
        <button className="btn btn-primary" disabled={!team || loading} onClick={() => fileRef.current?.click()} data-testid="button-data-room-upload"><UploadCloud /> {loading ? 'Saving…' : 'Upload Data'}</button>
      </div>
      <div className="callout" style={{ marginTop: 16 }}><Shield /><span><strong>{team || 'No team selected'}</strong>{selectedScout ? ' · ' + (selectedScout.description || 'Scout File') : team ? ' · New Scout File' : ''} — scouting data is stored independently from Live Game charting.</span></div>
    </Panel>
    <Panel pad={false}>
      <div style={{ padding: '21px 21px 0' }}><SectionTitle title="Normalized preview" detail={preview.length ? 'Showing ' + preview.length + ' imported rows' : 'Your uploaded rows will appear here'} /></div>
      {preview.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Play</th><th>Down</th><th>Type</th><th>Play call</th><th>Formation</th><th>Gain / loss</th><th>Result</th></tr></thead><tbody>{preview.map((play, i) => <tr key={play.playNo + '-' + i}><td><strong>#{play.playNo}</strong></td><td>{play.dn}&amp;{play.dist}</td><td>{play.type}</td><td>{play.offPlay}</td><td>{play.form}</td><td>{play.gnls}</td><td>{play.result}</td></tr>)}</tbody></table></div> : <div className="empty"><FileSpreadsheet size={30} /><h3>Select a Team and Scout File</h3><p>Example: Data Room → Paschal → Scout File 1 → Upload Data.</p></div>}
    </Panel>
    {toast.message && <Toast message={toast.message} onClose={toast.clear} />}
  </div>;
}

function ScoutPage({ data }: { data: Dataset }) {
  const source = data.scouting;
  const [view, setView] = useState<ScoutView>('dashboard');
  const [search, setSearch] = useState('');

  // DASHBOARD yellow-cell filters (Apps Script rows 3-7, columns B / E / H / K).
  const [fOdk, setFOdk] = useState(SCOUT_ALL);
  const [fFormation, setFFormation] = useState(SCOUT_ALL);
  const [fPersonnel, setFPersonnel] = useState(SCOUT_ALL);
  const [fScheme, setFScheme] = useState(SCOUT_ALL);
  const [fDown, setFDown] = useState(SCOUT_ALL);
  const [fPlayType, setFPlayType] = useState(SCOUT_ALL);
  const [fBackfield, setFBackfield] = useState(SCOUT_ALL);
  const [fOffPlay, setFOffPlay] = useState(SCOUT_ALL);
  const [fDistance, setFDistance] = useState(SCOUT_ALL);
  const [fMotion, setFMotion] = useState(SCOUT_ALL);
  const [fPlayDir, setFPlayDir] = useState(SCOUT_ALL);
  const [fHash, setFHash] = useState(SCOUT_ALL);

  const formationList = useMemo(() => optionsFor(source, play => play.form).slice(1), [source]);
  const formationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const play of source) { const form = scoutText(play.form); if (isMeaningful(form)) counts.set(form, (counts.get(form) ?? 0) + 1); }
    return counts;
  }, [source]);
  const rankedFormations = useMemo(
    () => [...formationList].sort((a, b) => (formationCounts.get(b) ?? 0) - (formationCounts.get(a) ?? 0)),
    [formationList, formationCounts],
  );

  const filtered = useMemo(() => source.filter(play => {
    if (search && !Object.values(play).some(value => String(value ?? '').toLowerCase().includes(search.toLowerCase()))) return false;
    if (!matchesAll(fOdk) && normalizeOdk(play.odk) !== fOdk) return false;
    if (!matchesAll(fFormation) && scoutText(play.form) !== scoutText(fFormation)) return false;
    if (!matchesAll(fPersonnel) && scoutText(play.personnel) !== scoutText(fPersonnel)) return false;
    if (!matchesAll(fScheme) && scoutText(play.scheme) !== scoutText(fScheme)) return false;
    if (!matchesAll(fDown) && String(num(play.dn)) !== fDown) return false;
    if (!matchesAll(fPlayType) && !scoutText(play.type).startsWith(scoutText(fPlayType))) return false;
    if (!matchesAll(fBackfield) && scoutText(play.backfield) !== scoutText(fBackfield)) return false;
    if (!matchesAll(fOffPlay) && !scoutText(play.offPlay).includes(scoutText(fOffPlay))) return false;
    if (!matchesAll(fDistance) && distanceBucket(num(play.dist)) !== fDistance) return false;
    if (!matchesAll(fMotion) && scoutText(play.motion) !== scoutText(fMotion)) return false;
    if (!matchesAll(fPlayDir) && !scoutText(play.dir).includes(scoutText(fPlayDir))) return false;
    if (!matchesAll(fHash) && !scoutText(play.hash).includes(scoutText(fHash))) return false;
    return true;
  }), [source, search, fOdk, fFormation, fPersonnel, fScheme, fDown, fPlayType, fBackfield, fOffPlay, fDistance, fMotion, fPlayDir, fHash]);

  const allMetrics = useMemo(() => summarize(source, source.length), [source]);
  const filteredMetrics = useMemo(() => summarize(filtered, filtered.length), [filtered]);

  const resetFilters = () => {
    setSearch(''); setFOdk(SCOUT_ALL); setFFormation(SCOUT_ALL); setFPersonnel(SCOUT_ALL); setFScheme(SCOUT_ALL);
    setFDown(SCOUT_ALL); setFPlayType(SCOUT_ALL); setFBackfield(SCOUT_ALL); setFOffPlay(SCOUT_ALL);
    setFDistance(SCOUT_ALL); setFMotion(SCOUT_ALL); setFPlayDir(SCOUT_ALL); setFHash(SCOUT_ALL);
  };

  // DASHBOARD · formation tendencies + play concept breakdown (top 8 each).
  const dashboardFormations = useMemo(
    () => formationList.map(form => ({ name: form, summary: summarize(filtered.filter(play => scoutText(play.form) === scoutText(form)), filtered.length) }))
      .filter(row => row.summary.count > 0).sort((a, b) => b.summary.count - a.summary.count).slice(0, 8),
    [formationList, filtered],
  );
  const dashboardConcepts = useMemo<ConceptRow[]>(() => {
    const groups = new Map<string, Play[]>();
    for (const play of filtered) { const key = conceptKey(play); if (!isMeaningful(key)) continue; groups.set(key, [...(groups.get(key) ?? []), play]); }
    return [...groups.entries()].map(([name, plays]) => {
      const summary = summarize(plays, filtered.length);
      const runs = plays.filter(scoutIsRun).length;
      return { name, type: runs >= plays.length - runs ? 'RUN' : 'PASS', count: summary.count, pctTotal: summary.pctTotal, avgGain: summary.avgGain, successRate: summary.successRate, explosiveRate: summary.explosiveRate } as ConceptRow;
    }).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [filtered]);

  // FORMATION REPORT · every formation across the whole chart, unfiltered.
  const formationReport = useMemo(
    () => formationList.map(form => ({ name: form, summary: summarize(source.filter(play => scoutText(play.form) === scoutText(form)), source.length) }))
      .sort((a, b) => b.summary.count - a.summary.count),
    [formationList, source],
  );

  // FORMATION DETAIL · one formation drilled by field zone.
  const [detailFormation, setDetailFormation] = useState(SCOUT_ALL);
  const [detailZone, setDetailZone] = useState(SCOUT_ALL);
  const detailTarget = useMemo(
    () => matchesAll(detailFormation) ? source : source.filter(play => scoutText(play.form) === scoutText(detailFormation)),
    [source, detailFormation],
  );
  const detailActive = useMemo(
    () => matchesAll(detailZone) ? detailTarget : detailTarget.filter(play => classifyYardLine(play.yardLn) === detailZone),
    [detailTarget, detailZone],
  );
  const detailProfile = useMemo(() => summarize(detailActive, source.length), [detailActive, source.length]);
  const detailSituations = useMemo(
    () => DOWN_DISTANCE_SITUATIONS.map(situation => ({ name: situation.label, summary: summarize(detailActive.filter(situation.match), detailActive.length) })),
    [detailActive],
  );
  // Zone table always spans the whole field so the staff sees every bucket, per the workbook.
  const detailZones = useMemo(() => {
    const zones = FIELD_ZONES.map(zone => ({ name: zone, summary: summarize(detailTarget.filter(play => classifyYardLine(play.yardLn) === zone), detailTarget.length) }));
    const unclassified = detailTarget.filter(play => classifyYardLine(play.yardLn) === UNCLASSIFIED_ZONE);
    return unclassified.length ? [...zones, { name: 'UNCLASSIFIED (no yard line)', summary: summarize(unclassified, detailTarget.length) }] : zones;
  }, [detailTarget]);

  // MULTI FORMATION REPORT · combine any set of formations, then read the tells.
  const [excludedForms, setExcludedForms] = useState<Set<string>>(new Set());
  const [multiBackfield, setMultiBackfield] = useState(SCOUT_ALL);
  const [multiMotion, setMultiMotion] = useState(SCOUT_ALL);
  const [multiPlayType, setMultiPlayType] = useState(SCOUT_ALL);
  const selectedForms = useMemo(() => rankedFormations.filter(form => !excludedForms.has(form)), [rankedFormations, excludedForms]);
  const toggleForm = (form: string) => setExcludedForms(previous => {
    const next = new Set(previous);
    if (next.has(form)) next.delete(form); else next.add(form);
    return next;
  });
  const allFormsSelected = selectedForms.length === rankedFormations.length;
  const multiPlays = useMemo(() => {
    const selected = new Set(selectedForms.map(scoutText));
    return source.filter(play => selected.has(scoutText(play.form))
      && (matchesAll(multiBackfield) || scoutText(play.backfield) === scoutText(multiBackfield))
      && (matchesAll(multiMotion) || scoutText(play.motion) === scoutText(multiMotion))
      && (matchesAll(multiPlayType) || scoutText(play.type).startsWith(scoutText(multiPlayType))));
  }, [source, selectedForms, multiBackfield, multiMotion, multiPlayType]);
  const multiSummary = useMemo(() => summarize(multiPlays, source.length), [multiPlays, source.length]);
  const multiSituations = useMemo(
    () => DOWN_DISTANCE_SITUATIONS.map(situation => ({ name: situation.label, summary: summarize(multiPlays.filter(situation.match), multiPlays.length) })),
    [multiPlays],
  );
  const multiVerdict = useMemo<{ text: string; tone: 'run' | 'pass' | 'balanced' | 'none' }>(() => {
    if (!multiPlays.length) return { text: 'NO PLAYS MATCH CURRENT SELECTIONS', tone: 'none' };
    if (multiSummary.runPct >= 0.65) return { text: `RUN-HEAVY SET (${roundPct(multiSummary.runPct)}% RUN) — LOAD THE BOX`, tone: 'run' };
    if (multiSummary.passPct >= 0.65) return { text: `PASS-HEAVY SET (${roundPct(multiSummary.passPct)}% PASS) — PASS COVERAGE ALERT`, tone: 'pass' };
    return { text: 'BALANCED FORMATION SET', tone: 'balanced' };
  }, [multiPlays.length, multiSummary]);
  const backfieldTells = useMemo(() => countBy(multiPlays.map(play => play.backfield)).slice(0, 2).map(([name]) => {
    const rows = multiPlays.filter(play => scoutText(play.backfield) === name);
    const runPct = rows.length ? rows.filter(scoutIsRun).length / rows.length : 0;
    const passPct = rows.length ? rows.filter(scoutIsPass).length / rows.length : 0;
    const bias = runPct >= 0.6 ? `${roundPct(runPct)}% RUN` : passPct >= 0.6 ? `${roundPct(passPct)}% PASS` : 'BALANCED';
    return { name, snaps: rows.length, share: multiPlays.length ? rows.length / multiPlays.length : 0, bias, flagged: runPct >= 0.6 || passPct >= 0.6, topCall: topValue(rows.map(play => conceptKey(play))) };
  }), [multiPlays]);
  const motionTells = useMemo(() => {
    const hasMotion = (play: Play) => { const motion = scoutText(play.motion); return isMeaningful(motion) && motion !== 'NONE'; };
    const withMotion = multiPlays.filter(hasMotion);
    const staticPlays = multiPlays.filter(play => !hasMotion(play));
    const share = (rows: Play[], predicate: (play: Play) => boolean) => rows.length ? roundPct(rows.filter(predicate).length / rows.length) : 0;
    const motionRunPct = withMotion.length ? withMotion.filter(scoutIsRun).length / withMotion.length : 0;
    const motionPassPct = withMotion.length ? withMotion.filter(scoutIsPass).length / withMotion.length : 0;
    let alert = '';
    if (withMotion.length >= 3 && motionRunPct >= 0.7) alert = 'MOTION = HEAVY RUN ALERT';
    else if (withMotion.length >= 3 && motionPassPct >= 0.7) alert = 'MOTION = HEAVY PASS ALERT';
    return {
      usage: multiPlays.length ? withMotion.length / multiPlays.length : 0,
      withCount: withMotion.length, total: multiPlays.length,
      motionRun: share(withMotion, scoutIsRun), motionPass: share(withMotion, scoutIsPass),
      staticRun: share(staticPlays, scoutIsRun), staticPass: share(staticPlays, scoutIsPass),
      alert,
    };
  }, [multiPlays]);
  // Strength tags live in play direction in the workbook, but in the backfield column on our charts.
  const strengthTagged = (play: Play, token: string) => scoutText(play.dir).includes(token) || scoutText(play.backfield).includes(token);
  const strPlays = multiPlays.filter(play => strengthTagged(play, 'STR')).length;
  const wkPlays = multiPlays.filter(play => strengthTagged(play, 'WK')).length;

  // FORMATION PLAY BY PLAY · every snap from one formation.
  const [pbpFormation, setPbpFormation] = useState(SCOUT_ALL);
  const pbpPlays = useMemo(
    () => matchesAll(pbpFormation) ? source : source.filter(play => scoutText(play.form) === scoutText(pbpFormation)),
    [source, pbpFormation],
  );
  const pbpSituation = (play: Play) => {
    const down = num(play.dn); const dist = num(play.dist);
    if (down === 1) return '1ST & 10';
    if (down === 2 || down === 3) {
      const prefix = down === 2 ? '2ND' : '3RD';
      return dist <= 3 ? `${prefix} & SHORT (1-3)` : dist <= 7 ? `${prefix} & MEDIUM (4-7)` : `${prefix} & LONG (8+)`;
    }
    return down === 4 ? '4TH DOWN' : 'OTHER';
  };

  const metricCards: { label: string; filtered: string; all: string; green: boolean }[] = [
    { label: 'Total plays', filtered: String(filteredMetrics.count), all: String(allMetrics.count), green: false },
    { label: 'Run %', filtered: pctText(filteredMetrics.runPct), all: pctText(allMetrics.runPct), green: filteredMetrics.runPct >= 0.6 },
    { label: 'Pass %', filtered: pctText(filteredMetrics.passPct), all: pctText(allMetrics.passPct), green: false },
    { label: 'Avg gain', filtered: decText(filteredMetrics.avgGain), all: decText(allMetrics.avgGain), green: false },
    { label: 'Success rate', filtered: pctText(filteredMetrics.successRate), all: pctText(allMetrics.successRate), green: filteredMetrics.successRate >= 0.5 },
    { label: 'Explosive rate', filtered: pctText(filteredMetrics.explosiveRate), all: pctText(allMetrics.explosiveRate), green: false },
  ];

  if (!source.length) {
    return <div className="content">
      <PageHead eyebrow="Scouting · tendency board" title="Find the tell." description="Turn every snap into a decision. Filter the noise, then take the strongest pattern into the room." actions={<Link href="/upload" className="btn btn-primary" data-testid="link-scout-upload"><UploadCloud /> Import chart</Link>} />
      <Panel><div className="empty"><Film size={30} /><h3>No scouting snaps on this board</h3><p>Import a CSV in the data room or load the demo chart to build the tendency report.</p><Link href="/upload" className="btn btn-primary" data-testid="link-scout-empty-upload">Go to data room</Link></div></Panel>
    </div>;
  }

  return <div className="content">
    <PageHead
      eyebrow="Scouting · tendency board"
      title="Find the tell."
      description="Every report from the Kangaroos scouting workbook, driven live off the current chart. Success is 4+ yards on 1st, half the sticks on 2nd, and a conversion on 3rd or 4th."
      actions={<Link href="/reports" className="btn btn-primary" data-testid="link-scout-reports"><ClipboardList /> Build report</Link>}
    />

    <div className="filters report-tabs">
      {SCOUT_VIEWS.map(item => {
        const Icon = item.icon;
        return <button key={item.key} className={`btn ${view === item.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView(item.key)} data-testid={`button-scout-view-${item.key}`}><Icon /> {item.label}</button>;
      })}
      <span className="eyebrow" style={{ marginLeft: 'auto' }}>{source.length} charted snaps</span>
    </div>

    {view === 'dashboard' && <div className="grid">
      <Panel>
        <SectionTitle title="Dashboard filters" detail="Every yellow filter cell from the workbook" link={<button className="btn btn-ghost" onClick={resetFilters} data-testid="button-scout-reset-filters"><RefreshCw /> Reset</button>} />
        <div className="form-grid">
          <div className="field">
            <label htmlFor="scout-search">Search chart</label>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 11, top: 11, color: '#77758a' }} />
              <input id="scout-search" className="input" style={{ paddingLeft: 33 }} placeholder="Any field…" value={search} onChange={event => setSearch(event.target.value)} data-testid="input-scout-search" />
            </div>
          </div>
          <ScoutFilter id="select-scout-odk" label="ODK" value={fOdk} options={[SCOUT_ALL, 'O', 'D', 'K']} onChange={setFOdk} />
          <ScoutFilter id="select-scout-formation" label="Formation" value={fFormation} options={[SCOUT_ALL, ...formationList]} onChange={setFFormation} />
          <ScoutFilter id="select-scout-personnel" label="Personnel" value={fPersonnel} options={optionsFor(source, play => play.personnel)} onChange={setFPersonnel} />
          <ScoutFilter id="select-scout-scheme" label="Scheme" value={fScheme} options={optionsFor(source, play => play.scheme)} onChange={setFScheme} />
          <ScoutFilter id="select-scout-down" label="Down" value={fDown} options={[SCOUT_ALL, '1', '2', '3', '4']} onChange={setFDown} />
          <ScoutFilter id="select-scout-type" label="Play type" value={fPlayType} options={[SCOUT_ALL, 'RUN', 'PASS']} onChange={setFPlayType} />
          <ScoutFilter id="select-scout-backfield" label="Backfield" value={fBackfield} options={optionsFor(source, play => play.backfield)} onChange={setFBackfield} />
          <ScoutFilter id="select-scout-offplay" label="Off play" value={fOffPlay} options={optionsFor(source, play => play.offPlay)} onChange={setFOffPlay} />
          <ScoutFilter id="select-scout-distance" label="Distance" value={fDistance} options={[SCOUT_ALL, ...DISTANCE_BUCKETS]} onChange={setFDistance} />
          <ScoutFilter id="select-scout-motion" label="Motion" value={fMotion} options={optionsFor(source, play => play.motion)} onChange={setFMotion} />
          <ScoutFilter id="select-scout-dir" label="Play direction" value={fPlayDir} options={optionsFor(source, play => play.dir)} onChange={setFPlayDir} />
          <ScoutFilter id="select-scout-hash" label="Hash" value={fHash} options={optionsFor(source, play => play.hash)} onChange={setFHash} />
        </div>
      </Panel>

      <div className="grid kpi-grid" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', marginBottom: 0 }}>
        {metricCards.map(card => <Kpi key={card.label} label={card.label} value={card.filtered} note={`All plays · ${card.all}`} green={card.green} />)}
      </div>

      <div className="grid split-grid">
        <Panel pad={false}>
          <div style={{ padding: '21px 21px 0' }}><SectionTitle title="Formation tendencies" detail={`Top ${dashboardFormations.length} formations in the filtered set`} /></div>
          {dashboardFormations.length ? <div className="table-wrap"><table className="data-table" data-testid="table-scout-formation-tendencies">
            <thead><tr><th>Formation</th><th>Snaps</th><th>Run %</th><th>Pass %</th><th>Avg yds</th><th>Success %</th></tr></thead>
            <tbody>{dashboardFormations.map(row => <tr key={row.name}>
              <td><strong>{row.name}</strong></td>
              <td>{row.summary.count}</td>
              <td style={row.summary.runPct >= 0.7 ? RUN_CELL : undefined}>{pctText(row.summary.runPct)}</td>
              <td style={row.summary.passPct >= 0.7 ? PASS_CELL : undefined}>{pctText(row.summary.passPct)}</td>
              <td>{decText(row.summary.avgGain)}</td>
              <td>{pctText(row.summary.successRate)}</td>
            </tr>)}</tbody>
          </table></div> : <div className="empty"><Layers size={28} /><h3>No formations match</h3><p>Loosen a filter to bring snaps back into the report.</p></div>}
        </Panel>
        <Panel pad={false}>
          <div style={{ padding: '21px 21px 0' }}><SectionTitle title="Play concept breakdown" detail="Play call, or scheme when the call is blank" /></div>
          {dashboardConcepts.length ? <div className="table-wrap"><table className="data-table" data-testid="table-scout-concepts">
            <thead><tr><th>Concept</th><th>Type</th><th>Count</th><th>% of total</th><th>Avg yds</th><th>Eff %</th><th>Expl %</th></tr></thead>
            <tbody>{dashboardConcepts.map(row => <tr key={row.name}>
              <td><strong>{row.name}</strong></td>
              <td><span className={`tag ${row.type === 'RUN' ? 'green' : ''}`}>{row.type}</span></td>
              <td>{row.count}</td>
              <td>{pctText(row.pctTotal)}</td>
              <td>{decText(row.avgGain)}</td>
              <td>{pctText(row.successRate)}</td>
              <td>{pctText(row.explosiveRate)}</td>
            </tr>)}</tbody>
          </table></div> : <div className="empty"><Target size={28} /><h3>No concepts match</h3><p>Play call and scheme are both blank for these snaps.</p></div>}
        </Panel>
      </div>

      <Panel pad={false} className="fade-in">
        <div style={{ padding: '21px 21px 0' }}><SectionTitle title="Play call ledger" detail={`${filtered.length} of ${source.length} snaps in view`} /></div>
        {filtered.length ? <div className="table-wrap"><table className="data-table">
          <thead><tr><th>Play</th><th>Situation</th><th>Type / call</th><th>Formation</th><th>Direction</th><th>Gain / loss</th><th>Defense</th></tr></thead>
          <tbody>{filtered.map((play, index) => <tr key={`${play.playNo}-${index}`} data-testid={`row-scout-${index}`}>
            <td><strong>#{play.playNo}</strong></td>
            <td>{play.dn}&amp;{play.dist} · {play.hash}</td>
            <td><span className={`tag ${scoutIsRun(play) ? 'green' : ''}`}>{play.type}</span> <span style={{ marginLeft: 7 }}>{play.offPlay}</span></td>
            <td>{play.form}</td>
            <td>{play.dir}</td>
            <td style={{ color: num(play.gnls) >= 0 ? '#62dfae' : '#ef8f88' }}>{play.gnls}</td>
            <td>{play.defense} · {play.scheme}</td>
          </tr>)}</tbody>
        </table></div> : <div className="empty"><Search size={28} /><h3>Nothing matches that filter</h3><p>Clear a dropdown or reset the filter block.</p></div>}
      </Panel>
    </div>}

    {view === 'formations' && <Panel pad={false}>
      <div style={{ padding: '21px 21px 0' }}><SectionTitle title="Formation report" detail="Every formation across the full chart — dashboard filters do not apply here" /></div>
      <SummaryTable label="FORMATION" rows={formationReport} testId="table-scout-formation-report" />
    </Panel>}

    {view === 'detail' && <div className="grid">
      <Panel>
        <SectionTitle title="Formation detail" detail="Drill one formation, then slice it by field zone" />
        <div className="form-grid">
          <ScoutFilter id="select-scout-detail-formation" label="Select formation" value={detailFormation} options={[SCOUT_ALL, ...formationList]} onChange={setDetailFormation} />
          <ScoutFilter id="select-scout-detail-zone" label="Field zone filter" value={detailZone} options={[SCOUT_ALL, ...FIELD_ZONES]} onChange={setDetailZone} />
        </div>
      </Panel>
      <Panel pad={false}>
        <div style={{ padding: '21px 21px 0' }}><SectionTitle title="Formation profile" detail={`${detailProfile.count} snaps · ${pctText(detailProfile.pctTotal)} of the chart`} /></div>
        <SummaryTable label="FORMATION" rows={[{ name: matchesAll(detailFormation) ? 'ALL FORMATIONS' : detailFormation, summary: detailProfile }]} testId="table-scout-detail-profile" />
      </Panel>
      <Panel pad={false}>
        <div style={{ padding: '21px 21px 0' }}><SectionTitle title="Down & distance breakdown" detail="Percentages are of the snaps currently in view" /></div>
        <SummaryTable label="SITUATION" rows={detailSituations} testId="table-scout-detail-situations" />
      </Panel>
      <Panel pad={false}>
        <div style={{ padding: '21px 21px 0' }}><SectionTitle title="Field position / yard line breakdown" detail="Always spans the whole field, so the zone filter above never hides a bucket" /></div>
        <SummaryTable label="FIELD ZONE" rows={detailZones} testId="table-scout-detail-zones" />
      </Panel>
    </div>}

    {view === 'multi' && <div className="grid">
      <ScoutVerdict verdict={multiVerdict.text} tone={multiVerdict.tone} />
      <div className="grid split-grid">
        <Panel>
          <SectionTitle title="Select formations to combine" detail={`${selectedForms.length} of ${rankedFormations.length} selected`} link={<button className="btn btn-ghost" onClick={() => setExcludedForms(allFormsSelected ? new Set(rankedFormations) : new Set())} data-testid="button-scout-multi-toggle-all">{allFormsSelected ? 'Deselect all' : 'Select all'}</button>} />
          <div className="feed">
            {rankedFormations.map(form => <label key={form} className="feed-row" style={{ cursor: 'pointer', gridTemplateColumns: '20px 1fr auto' }}>
              <input type="checkbox" checked={!excludedForms.has(form)} onChange={() => toggleForm(form)} data-testid={`checkbox-scout-form-${form}`} />
              <div className="feed-main"><strong>{form}</strong></div>
              <span className="eyebrow">{formationCounts.get(form) ?? 0} snaps</span>
            </label>)}
          </div>
        </Panel>
        <Panel>
          <SectionTitle title="Combined filters" detail="Narrow the combined set before reading the tells" />
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <ScoutFilter id="select-scout-multi-backfield" label="Backfield" value={multiBackfield} options={optionsFor(source, play => play.backfield)} onChange={setMultiBackfield} />
            <ScoutFilter id="select-scout-multi-motion" label="Motion" value={multiMotion} options={optionsFor(source, play => play.motion)} onChange={setMultiMotion} />
            <ScoutFilter id="select-scout-multi-type" label="Play type" value={multiPlayType} options={[SCOUT_ALL, 'RUN', 'PASS']} onChange={setMultiPlayType} />
          </div>
          <div className="trend-row" style={{ marginTop: 18, marginBottom: 0 }}>
            <div className="trend-head"><span>Run calls <small>({multiPlays.filter(scoutIsRun).length})</small></span><span>{roundPct(multiSummary.runPct)}%</span></div>
            <div className="progress green"><span style={{ width: `${roundPct(multiSummary.runPct)}%` }} /></div>
            <div className="trend-head" style={{ marginTop: 14 }}><span>Pass calls <small>({multiPlays.filter(scoutIsPass).length})</small></span><span>{roundPct(multiSummary.passPct)}%</span></div>
            <div className="progress"><span style={{ width: `${roundPct(multiSummary.passPct)}%` }} /></div>
          </div>
        </Panel>
      </div>
      <Panel>
        <SectionTitle title="Backfield & motion tells" detail="Pre-snap indicators inside the combined set" />
        <div className="feed">
          {backfieldTells.length ? backfieldTells.map(tell => <div className="feed-row" key={tell.name}>
            <span className="feed-num">{tell.flagged ? <AlertTriangle size={14} /> : <Activity size={14} />}</span>
            <div className="feed-main"><strong>{tell.name} · {tell.bias}</strong><span>{tell.snaps} snaps ({roundPct(tell.share)}% of the set) · #1 call: {tell.topCall}</span></div>
          </div>) : <div className="feed-row"><span className="feed-num">—</span><div className="feed-main"><strong>Backfield tells: no data for current selections</strong></div></div>}
          <div className="feed-row">
            <span className="feed-num">{motionTells.alert ? <AlertTriangle size={14} /> : <Percent size={14} />}</span>
            <div className="feed-main">
              <strong>Motion used on {roundPct(motionTells.usage)}% of snaps ({motionTells.withCount}/{motionTells.total}){motionTells.alert ? ` · ${motionTells.alert}` : ''}</strong>
              <span>With motion = {motionTells.motionRun}% run / {motionTells.motionPass}% pass · Static = {motionTells.staticRun}% run / {motionTells.staticPass}% pass</span>
            </div>
          </div>
        </div>
      </Panel>
      <Panel pad={false}>
        <div style={{ padding: '21px 21px 0' }}><SectionTitle title={`Combined profile (${selectedForms.length} formations selected)`} detail="Aggregate identity of everything you checked" /></div>
        <div className="table-wrap"><table className="data-table" style={{ minWidth: 1040 }} data-testid="table-scout-multi-profile">
          <thead><tr><th>Selected formations</th><th>Snaps</th><th>% off</th><th>Run %</th><th>Pass %</th><th>Top 3 backfields</th><th>Str / wk</th><th>Top 3 schemes</th><th>Top 3 runs</th><th>Top 3 passes</th><th>Avg yds</th></tr></thead>
          <tbody><tr>
            <td><strong>{selectedForms.slice(0, 3).join(', ') || '—'}{selectedForms.length > 3 ? '…' : ''}</strong></td>
            <td>{multiSummary.count}</td>
            <td>{pctText(multiSummary.pctTotal)}</td>
            <td style={multiSummary.count && multiSummary.runPct >= 0.7 ? RUN_CELL : undefined}>{pctText(multiSummary.runPct)}</td>
            <td style={multiSummary.count && multiSummary.passPct >= 0.7 ? PASS_CELL : undefined}>{pctText(multiSummary.passPct)}</td>
            <td>{topValues(multiPlays.map(play => play.backfield), 3)}</td>
            <td>{strPlays} STR / {wkPlays} WK</td>
            <td>{topValues(multiPlays.map(play => play.scheme), 3)}</td>
            <td>{topValues(multiPlays.filter(scoutIsRun).map(play => play.offPlay), 3)}</td>
            <td>{topValues(multiPlays.filter(scoutIsPass).map(play => play.offPlay), 3)}</td>
            <td>{decText(multiSummary.avgGain)}</td>
          </tr></tbody>
        </table></div>
      </Panel>
      <Panel pad={false}>
        <div style={{ padding: '21px 21px 0' }}><SectionTitle title="Combined down & distance tendencies" detail="Percentages are of the combined set" /></div>
        <SummaryTable label="SITUATION" rows={multiSituations} testId="table-scout-multi-situations" />
      </Panel>
    </div>}

    {view === 'pbp' && <div className="grid">
      <Panel>
        <SectionTitle title="Formation play by play" detail="Every snap from one formation, in order" />
        <div className="form-grid">
          <ScoutFilter id="select-scout-pbp-formation" label="Formation" value={pbpFormation} options={[SCOUT_ALL, ...formationList]} onChange={setPbpFormation} />
        </div>
      </Panel>
      <Panel pad={false}>
        <div style={{ padding: '21px 21px 0' }}><SectionTitle title={`Play-by-play log — ${matchesAll(pbpFormation) ? 'ALL FORMATIONS' : pbpFormation.toUpperCase()}`} detail={`${pbpPlays.length} total plays`} /></div>
        {pbpPlays.length ? <div className="table-wrap"><table className="data-table" style={{ minWidth: 1040 }} data-testid="table-scout-pbp">
          <thead><tr><th>Play #</th><th>Down & dist</th><th>Situation</th><th>Play call</th><th>Type</th><th>Dir</th><th>Gain</th><th>Scheme</th><th>Backfield</th><th>Motion</th><th>Hash</th></tr></thead>
          <tbody>{pbpPlays.map((play, index) => <tr key={`${play.playNo}-${index}`}>
            <td><strong>#{play.playNo}</strong></td>
            <td>{num(play.dn) > 0 ? `${play.dn} & ${play.dist}` : '—'}</td>
            <td>{pbpSituation(play)}</td>
            <td><strong>{play.offPlay}</strong></td>
            <td><span className={`tag ${scoutIsRun(play) ? 'green' : ''}`}>{play.type}</span></td>
            <td>{play.dir}</td>
            <td style={scoutIsExplosive(play) ? { color: '#e8c886', fontWeight: 700 } : { color: num(play.gnls) >= 0 ? '#62dfae' : '#ef8f88' }}>{play.gnls}</td>
            <td>{play.scheme}</td>
            <td>{play.backfield}</td>
            <td>{play.motion}</td>
            <td>{play.hash}</td>
          </tr>)}</tbody>
        </table></div> : <div className="empty"><Film size={28} /><h3>No plays found for this formation</h3><p>Pick another formation to load its log.</p></div>}
      </Panel>
    </div>}
  </div>;
}


function ReportsPage({ data }: { data: Dataset }) {
  const [active, setActive] = useState<'qb' | 'carrier' | 'explosive'>('qb'); const plays = data.scouting; const qbs = plays.filter(p => p.type.toLowerCase().includes('pass')); const carriers = Array.from(new Set(plays.map(p => p.carrier))).filter(Boolean).map(name => { const rows = plays.filter(p => p.carrier === name); return { name, count: rows.length, yards: rows.reduce((sum, p) => sum + num(p.gnls), 0), explosive: rows.filter(isExplosive).length }; }).sort((a, b) => b.yards - a.yards);
  const exportReport = () => { const headers = ['Play #', 'Type', 'Ball Carrier', 'Gain/Loss', 'Result', 'Formation', 'Play Call']; const rows = plays.map(p => [p.playNo, p.type, p.carrier, p.gnls, p.result, p.form, p.offPlay].map(csvCell).join(',')); download('coach-hudl-report.csv', [headers.join(','), ...rows].join('\n')); };
  return <div className="content"><PageHead eyebrow="Reports · ready for the room" title="Make the call." description="Clean report views for the staff meeting, the sideline, and the next opponent." actions={<button className="btn btn-primary" onClick={exportReport} data-testid="button-export-report"><Download /> Export CSV</button>} /><div className="grid" style={{ gridTemplateColumns: 'minmax(0, .8fr) minmax(0, 1.2fr)' }}><Panel><SectionTitle title="Report views" detail="Select a lens" /><div className="report-list"><button className={`report-card ${active === 'qb' ? 'active-report' : ''}`} onClick={() => setActive('qb')} data-testid="button-report-qb"><div className="report-info"><div className="report-icon"><Users size={16} /></div><div><h3>QB report</h3><p>Pass volume, RPOs, pressure</p></div></div><ChevronRight size={16} /></button><button className="report-card" onClick={() => setActive('carrier')} data-testid="button-report-carrier"><div className="report-info"><div className="report-icon"><Zap size={16} /></div><div><h3>Ball-carrier report</h3><p>Usage, yardage, explosives</p></div></div><ChevronRight size={16} /></button><button className="report-card" onClick={() => setActive('explosive')} data-testid="button-report-explosive"><div className="report-info"><div className="report-icon"><Sparkles size={16} /></div><div><h3>Explosive plays</h3><p>Every gain of 12+ yards</p></div></div><ChevronRight size={16} /></button></div><div className="callout" style={{ marginTop: 18 }}><Download />The export includes normalized fields from every charted snap, ready for a staff packet.</div></Panel><Panel pad={false}><div style={{ padding: '21px 21px 0' }}><SectionTitle title={active === 'qb' ? 'Quarterback report' : active === 'carrier' ? 'Ball-carrier report' : 'Explosive-play report'} detail={`${plays.length} snaps in scouting board`} /></div>{active === 'qb' && <div className="panel-pad"><div className="grid kpi-grid" style={{ marginBottom: 22 }}><Kpi label="Pass attempts" value={String(qbs.length)} note="charted throws" /><Kpi label="Pass yards" value={String(qbs.reduce((sum, p) => sum + num(p.gnls), 0))} note="net charted gain" green /><Kpi label="Pressure" value={String(qbs.filter(p => false).length)} note="blitz-tagged" /></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Call</th><th>Formation</th><th>Result</th><th>Gain</th></tr></thead><tbody>{qbs.map((p, i) => <tr key={i}><td><strong>{p.offPlay}</strong></td><td>{p.form}</td><td>{p.result}</td><td>{p.gnls}</td></tr>)}</tbody></table></div></div>}{active === 'carrier' && <div className="panel-pad"><div className="table-wrap"><table className="data-table"><thead><tr><th>Ball carrier</th><th>Touches</th><th>Total gain</th><th>Avg / touch</th><th>Explosives</th></tr></thead><tbody>{carriers.map(row => <tr key={row.name}><td><strong>{row.name}</strong></td><td>{row.count}</td><td style={{ color: '#62dfae' }}>{row.yards}</td><td>{(row.yards / row.count).toFixed(1)}</td><td><span className="tag green">{row.explosive}</span></td></tr>)}</tbody></table></div></div>}{active === 'explosive' && <div className="panel-pad"><div className="feed">{plays.filter(isExplosive).sort((a, b) => num(b.gnls) - num(a.gnls)).map((p, i) => <div className="feed-row" key={i}><span className="feed-num">#{p.playNo}</span><div className="feed-main"><strong>{p.offPlay} · {p.result}</strong><span>{p.type} · {p.form} · {p.yardLn}</span></div><span className="tag green">+{p.gnls}</span></div>)}</div></div>}</Panel></div></div>;
}

function LiveSpreadsheetPage({ data, setData }: { data: Dataset; setData: (data: Dataset) => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const live = data.live;
  
  const previousYardLine = live.at(-1)?.yardLn || '-20';
  const [form, setForm] = useState<Play>({ ...demoScouting[0], playNo: String(data.live.length + 1).padStart(2, '0'), startYardLn: previousYardLine, yardLn: '-22', form: '', offPlay: '', carrier: '', defense: '', result: '' });
  
  // Keep form.startYardLn in sync with previousYardLine when a new play is added or deleted
  useEffect(() => {
    setForm(current => ({ ...current, startYardLn: previousYardLine }));
  }, [previousYardLine]);

  const update = (key: keyof Play, value: string) => setForm(current => ({ ...current, [key]: value }));
  const actualStart = form.startYardLn ? normalizeYardLine(form.startYardLn) : previousYardLine;
  const normalizedFormYardLine = normalizeYardLine(form.yardLn);
  const calculatedGnls = calculateGnls(actualStart, normalizedFormYardLine);

  const resultOptions = ['Complete', 'Complete TD', 'Fumble', 'Good', 'Incomplete', 'Interception', 'No Good', 'Penalty', 'Return', 'Rush', 'Rush TD', 'Sack', 'Scramble', '2 Pt', 'Extra Pt', 'Punt', 'FG', 'Onside Kick', 'Pass'];

  const addPlay = () => {
    if (!form.yardLn.trim()) { toast.notify('Enter the end yard line after the snap'); return; }
    if (calculatedGnls === null) { toast.notify('Use a signed yard line like -22 or 22'); return; }
    if (!form.result.trim()) { toast.notify('Add a result before saving the snap'); return; }
    
    const next = { ...data, live: [...live, { ...form, startYardLn: actualStart, yardLn: normalizedFormYardLine, gnls: String(calculatedGnls), playNo: String(live.length + 1).padStart(2, '0') }] };
    setData(next);
    
    // reset form for next play
    setForm(current => ({ ...current, playNo: String(next.live.length + 1).padStart(2, '0'), startYardLn: normalizedFormYardLine, yardLn: '', gnls: '0', form: '', offPlay: '', carrier: '', defense: '', result: '' }));
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
    setData({ ...data, live: recalculateLiveGains(nextLive, '-20') }); // recalculated from start
  };

  const removeLiveRow = (displayIndex: number) => {
    const actualIndex = live.length - 1 - displayIndex;
    setData({ ...data, live: live.filter((_, index) => index !== actualIndex) });
    toast.notify('Live snap removed');
  };

  const field = (key: keyof Play, label: string, options?: string[]) => <div className="field"><label htmlFor={`live-${key}`}>{label}</label>{options ? <select id={`live-${key}`} value={form[key]} onChange={event => update(key, event.target.value)} data-testid={`select-live-${key}`}>{options.map(option => <option key={option}>{option}</option>)}</select> : <input id={`live-${key}`} className="input" value={form[key]} onChange={event => update(key, event.target.value)} data-testid={`input-live-${key}`} />}</div>;

  const getSuggestions = (key: keyof Play) => Array.from(new Set([...data.scouting, ...live].map(p => p[key]))).filter(Boolean).sort();
  const editableField = (key: keyof Play, label: string) => {
    const listId = `live-${key}-list`;
    return <div className="field"><label htmlFor={`live-${key}`}>{label}</label><input id={`live-${key}`} list={listId} className="input" value={form[key]} onChange={event => update(key, event.target.value)} data-testid={`input-live-${key}`} /><datalist id={listId}>{getSuggestions(key).map(option => <option key={option} value={option} />)}</datalist></div>;
  };

  const startYardLineField = <div className="field"><label htmlFor="live-startYardLn">Start yard line</label><input id="live-startYardLn" className="input" value={form.startYardLn || ''} onChange={event => update('startYardLn', event.target.value)} onBlur={() => update('startYardLn', normalizeYardLine(form.startYardLn || previousYardLine))} placeholder="-20 or 20" inputMode="numeric" data-testid="input-live-startYardLn" /></div>;
  
  const endYardLineField = <div className="field"><label htmlFor="live-yardLn">End yard line</label><input id="live-yardLn" className="input" value={form.yardLn} onChange={event => update('yardLn', event.target.value)} onBlur={() => update('yardLn', normalizeYardLine(form.yardLn))} placeholder="-22 or 22" inputMode="numeric" data-testid="input-live-yardLn" /><span className="field-hint">Negative = own · positive = opponent</span></div>;

  const editCell = (displayIndex: number, key: keyof Play, value: string, options?: string[]) => options ? <select className="table-input" value={value} onChange={event => updateLiveRow(displayIndex, key, event.target.value)} aria-label={`Edit ${key} for snap ${displayIndex + 1}`} data-testid={`select-edit-live-${displayIndex}-${key}`}>{options.map(option => <option key={option}>{option}</option>)}</select> : <input className="table-input" value={value} onChange={event => updateLiveRow(displayIndex, key, event.target.value)} onBlur={event => (key === 'yardLn' || key === 'startYardLn') && updateLiveRow(displayIndex, key, normalizeYardLine(event.currentTarget.value))} aria-label={`Edit ${key} for snap ${displayIndex + 1}`} data-testid={`input-edit-live-${displayIndex}-${key}`} />;

  return <div className="content"><PageHead eyebrow="Live game · editable chart" title="Keep every snap in reach." description="Chart the game as it happens, then edit any prior snap directly in the spreadsheet below." actions={<><input ref={fileRef} className="drop-input" type="file" accept=".csv,text/csv" onChange={event => importLive(event.target.files?.[0])} data-testid="input-live-csv" /><button className="btn btn-ghost" onClick={() => fileRef.current?.click()} data-testid="button-import-live"><UploadCloud /> Import live CSV</button></>} />
    <Panel><SectionTitle title="Add a live snap" detail="Choose O, D, or K. GN/LS calculates from start to end yard line." /><div className="form-grid">{field('odk', 'ODK', ['O', 'D', 'K'])}{field('dn', 'Down', ['1', '2', '3', '4'])}{field('dist', 'Distance')}{field('hash', 'Hash', ['L', 'M', 'R'])}{startYardLineField}{endYardLineField}{editableField('form', 'Formation')}{editableField('offPlay', 'Play call')}{field('type', 'Play type', ['Run', 'Pass'])}{editableField('carrier', 'Ball carrier')}{field('result', 'Result', resultOptions)}{editableField('defense', 'Defense')}<div className="field"><label htmlFor="live-gnls">GN/LS · calculated</label><output id="live-gnls" className={`computed-value ${calculatedGnls !== null && calculatedGnls >= 0 ? 'positive' : calculatedGnls !== null ? 'negative' : ''}`} data-testid="output-live-gnls">{formatGnls(calculatedGnls)}</output><span className="field-hint">From {actualStart}</span></div></div><div className="actions" style={{ marginTop: 17 }}><button className="btn btn-green" onClick={addPlay} data-testid="button-add-live-play"><Plus /> Add snap <span style={{ opacity: .7 }}>↵</span></button><span className="eyebrow" style={{ alignSelf: 'center' }}>{live.length} live snaps tracked</span></div></Panel>
    <Panel style={{ marginTop: 14 }} pad={false}><div style={{ padding: '21px 21px 0' }}><SectionTitle title="Live game spreadsheet" detail={live.length ? `${live.length} snaps · click any cell to edit` : 'Your saved snaps will appear here'} /></div>{live.length ? <div className="table-wrap"><table className="data-table live-sheet"><thead><tr><th>Play</th><th>ODK</th><th>Down</th><th>Dist</th><th>Start</th><th>End</th><th>Formation</th><th>Play call</th><th>Play type</th><th>Ball carrier</th><th>Result</th><th>Defense</th><th>GN/LS</th><th /></tr></thead><tbody>{live.slice().reverse().map((play, i) => <tr key={`${play.playNo}-${i}`} data-testid={`row-live-${i}`}><td><strong>#{play.playNo}</strong></td><td>{editCell(i, 'odk', play.odk, ['O', 'D', 'K'])}</td><td>{editCell(i, 'dn', play.dn, ['1', '2', '3', '4'])}</td><td>{editCell(i, 'dist', play.dist)}</td><td>{editCell(i, 'startYardLn', play.startYardLn ?? '')}</td><td>{editCell(i, 'yardLn', play.yardLn)}</td><td>{editCell(i, 'form', play.form)}</td><td>{editCell(i, 'offPlay', play.offPlay)}</td><td>{editCell(i, 'type', play.type, ['Run', 'Pass'])}</td><td>{editCell(i, 'carrier', play.carrier)}</td><td>{editCell(i, 'result', play.result, resultOptions)}</td><td>{editCell(i, 'defense', play.defense)}</td><td className={num(play.gnls) >= 0 ? 'gain-positive' : 'gain-negative'}>{formatGnls(num(play.gnls))}</td><td><button className="btn btn-danger" style={{ padding: 6 }} onClick={() => removeLiveRow(i)} aria-label={`Remove play ${play.playNo}`} data-testid={`button-remove-live-${i}`}><Trash2 size={13} /></button></td></tr>)}</tbody></table></div> : <div className="empty"><FileSpreadsheet size={30} /><h3>No live snaps yet</h3><p>Add a snap above or import a live CSV. Saved snaps stay editable here.</p></div>}</Panel>{toast.message && <Toast message={toast.message} onClose={toast.clear} />}
  </div>;
}
function isRun(p: Play) { return p.type.toLowerCase().includes('run'); }
function isPass(p: Play) { return p.type.toLowerCase().includes('pass'); }
function isExplosiveRun(p: Play) { return isRun(p) && num(p.gnls) >= 10; }
function isExplosivePass(p: Play) { return isPass(p) && num(p.gnls) >= 15; }
function formatPct(val: number, total: number) { return total > 0 ? `${Math.round((val / total) * 100)}%` : '—'; }
function getRunPass(plays: Play[]) { 
  const r = plays.filter(isRun).length; 
  const p = plays.filter(isPass).length; 
  return plays.length > 0 ? `${Math.round((r / plays.length) * 100)}R / ${Math.round((p / plays.length) * 100)}P` : '—'; 
}
function topPlaysStr(plays: Play[], isRunFlag: boolean, limit = 2) {
  const filtered = plays.filter(p => isRunFlag ? isRun(p) : isPass(p));
  if (!filtered.length) return '—';
  const counts: Record<string, number> = {};
  filtered.forEach(p => counts[p.offPlay] = (counts[p.offPlay] || 0) + 1);
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit).map(e => e[0] || 'Unknown').join(', ');
}
function getSituation(play: Play) {
  const down = num(play.dn);
  const distance = num(play.dist);
  if (down === 1) return distance > 10 ? '1st & Long' : '1st & 10';
  const distLabel = distance >= 7 ? 'Long' : distance >= 4 ? 'Med' : 'Short';
  return `${down === 2 ? '2nd' : down === 3 ? '3rd' : '4th'} & ${distLabel}`;
}
function changeArrow(scoutPct: number, livePct: number) {
  const diff = livePct - scoutPct;
  if (diff > 5) return `▲ +${Math.round(diff)}%`;
  if (diff < -5) return `▼ ${Math.round(diff)}%`;
  return '✓';
}

function ReportsHubPage({ data }: { data: Dataset }) {
  const [active, setActive] = useState<'offense' | 'defense'>('offense');
  const live = data.live;
  
  // OFFENSE: Self tendency. Our 'O' from the live game.
  const offense = live.filter(play => normalizeOdk(play.odk) === 'O');
  
  // DEFENSE: Scout vs Live comparison. Scout 'O' vs Live 'D'.
  const defenseLive = live.filter(play => normalizeOdk(play.odk) === 'D');
  const defenseScout = data.scouting.filter(play => normalizeOdk(play.odk) === 'O');

  const exportReport = () => { 
    const source = active === 'offense' ? offense : defenseLive; 
    const headers = ['Play #', 'ODK', 'Type', 'Ball Carrier', 'Gain/Loss', 'Result', 'Formation', 'Play Call']; 
    const rows = source.map(play => [play.playNo, play.odk, play.type, play.carrier, play.gnls, play.result, play.form, play.offPlay].map(csvCell).join(',')); 
    download(`coach-hudl-${active}.csv`, [headers.join(','), ...rows].join('\n')); 
  };

  // --- OFFENSE COMPUTATIONS ---
  const oRuns = offense.filter(isRun);
  const oPasses = offense.filter(isPass);
  
  const oCarriers = Array.from(new Set(offense.map(p => p.carrier))).filter(Boolean).map(name => {
    const touches = offense.filter(p => p.carrier === name);
    const rushYards = touches.filter(isRun).reduce((s, p) => s + num(p.gnls), 0);
    const recYards = touches.filter(isPass).reduce((s, p) => s + num(p.gnls), 0);
    const totalYards = rushYards + recYards;
    return { name, touches: touches.length, rushYards, recYards, avg: (touches.length ? totalYards / touches.length : 0) };
  }).sort((a, b) => (b.rushYards + b.recYards) - (a.rushYards + a.recYards));
  
  const oFormations = Array.from(new Set(offense.map(p => p.form))).filter(Boolean).map(form => {
    const plays = offense.filter(p => p.form === form);
    return { form, plays };
  }).sort((a, b) => b.plays.length - a.plays.length);
  
  const oTopRuns = Array.from(new Set(oRuns.map(p => p.offPlay))).filter(Boolean).map(offPlay => {
    const plays = oRuns.filter(p => p.offPlay === offPlay);
    return { offPlay, calls: plays.length, avgGain: average(plays), explosives: plays.filter(isExplosiveRun).length };
  }).sort((a, b) => b.calls - a.calls);

  const oTopPasses = Array.from(new Set(oPasses.map(p => p.offPlay))).filter(Boolean).map(offPlay => {
    const plays = oPasses.filter(p => p.offPlay === offPlay);
    return { offPlay, calls: plays.length, avgGain: average(plays), explosives: plays.filter(isExplosivePass).length };
  }).sort((a, b) => b.calls - a.calls);

  const oSituations = ['1st & 10', '1st & Long', '2nd & Long', '2nd & Med', '2nd & Short', '3rd & Long', '3rd & Med', '3rd & Short'].map(sit => {
    const plays = offense.filter(p => getSituation(p) === sit);
    return { sit, plays };
  }).filter(s => s.plays.length > 0);

  // --- DEFENSE COMPUTATIONS ---
  const dScoutRuns = defenseScout.filter(isRun).length;
  const dScoutPasses = defenseScout.filter(isPass).length;
  const dScoutPctRun = defenseScout.length ? (dScoutRuns / defenseScout.length) * 100 : 0;
  const dScoutPctPass = defenseScout.length ? (dScoutPasses / defenseScout.length) * 100 : 0;
  
  const dLiveRuns = defenseLive.filter(isRun).length;
  const dLivePasses = defenseLive.filter(isPass).length;
  const dLivePctRun = defenseLive.length ? (dLiveRuns / defenseLive.length) * 100 : 0;
  const dLivePctPass = defenseLive.length ? (dLivePasses / defenseLive.length) * 100 : 0;

  const dFormations = Array.from(new Set([...defenseScout.map(p => p.form), ...defenseLive.map(p => p.form)])).filter(Boolean).map(form => {
    const scoutF = defenseScout.filter(p => p.form === form);
    const liveF = defenseLive.filter(p => p.form === form);
    const sRunPct = scoutF.length ? (scoutF.filter(isRun).length / scoutF.length) * 100 : 0;
    const lRunPct = liveF.length ? (liveF.filter(isRun).length / liveF.length) * 100 : 0;
    const lPassPct = liveF.length ? (liveF.filter(isPass).length / liveF.length) * 100 : 0;
    return { form, scoutPlays: scoutF.length, livePlays: liveF.length, sRunPct, lRunPct, lPassPct, change: changeArrow(sRunPct, lRunPct) };
  }).sort((a, b) => b.livePlays - a.livePlays).slice(0, 5);

  const dSituations = ['1st & 10', '1st & Long', '2nd & Long', '2nd & Med', '2nd & Short', '3rd & Long', '3rd & Med', '3rd & Short'].map(sit => {
    const sPlays = defenseScout.filter(p => getSituation(p) === sit);
    const lPlays = defenseLive.filter(p => getSituation(p) === sit);
    return { sit, scout: sPlays, live: lPlays };
  }).filter(s => s.scout.length > 0 || s.live.length > 0);

  return <div className="content"><PageHead eyebrow="Reports · live game analysis" title="Make the call." description="Live offense and defense reports stay separate, so each staff conversation starts with the right lens." actions={<button className="btn btn-primary" onClick={exportReport} data-testid="button-export-report"><Download /> Export {active} CSV</button>} />
    <div className="filters report-tabs"><button className={`btn ${active === 'offense' ? 'btn-green' : 'btn-ghost'}`} onClick={() => setActive('offense')} data-testid="button-report-live-offense"><Zap /> Live offense</button><button className={`btn ${active === 'defense' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActive('defense')} data-testid="button-report-defense"><Shield /> Defense</button><span className="eyebrow">{active === 'offense' ? offense.length : defenseLive.length} live snaps in view</span></div>
    
    {active === 'offense' ? <div className="grid">
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
        <Panel><SectionTitle title="OFFENSE IDENTITY" detail="Live game self-tendency" />
          <div className="table-wrap"><table className="data-table"><tbody>
            <tr><td>Plays</td><td><strong>{offense.length}</strong></td></tr>
            <tr><td>Run / Pass</td><td><strong>{formatPct(oRuns.length, offense.length)} / {formatPct(oPasses.length, offense.length)}</strong></td></tr>
            <tr><td>X-Run (10+)</td><td><strong>{offense.filter(isExplosiveRun).length}</strong></td></tr>
            <tr><td>X-Pass (15+)</td><td><strong>{offense.filter(isExplosivePass).length}</strong></td></tr>
          </tbody></table></div>
        </Panel>
        <Panel><SectionTitle title="BALL CARRIERS" detail="Touches and yardage" />
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Carrier</th><th>Touches</th><th>Rush Yds</th><th>Rec Yds</th><th>Avg</th></tr></thead>
          <tbody>{oCarriers.map(c => <tr key={c.name}><td><strong>{c.name}</strong></td><td>{c.touches}</td><td>{c.rushYards}</td><td>{c.recYards}</td><td>{c.avg.toFixed(1)}</td></tr>)}</tbody>
          </table></div>
        </Panel>
      </div>
      
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
        <Panel><SectionTitle title="TOP FORMATIONS (SELF)" detail="Most used formations" />
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Formation</th><th>Usage</th><th>R/P</th><th>Fav Runs</th><th>Fav Pass</th></tr></thead>
          <tbody>{oFormations.slice(0, 5).map(f => <tr key={f.form}><td><strong>{f.form}</strong></td><td>{formatPct(f.plays.length, offense.length)}</td><td>{getRunPass(f.plays)}</td><td>{topPlaysStr(f.plays, true, 1)}</td><td>{topPlaysStr(f.plays, false, 1)}</td></tr>)}</tbody>
          </table></div>
        </Panel>
        <Panel><SectionTitle title="DOWN & DISTANCE" detail="Situational tendency" />
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Situation</th><th>Plays</th><th>R/P</th><th>Top Plays</th></tr></thead>
          <tbody>{oSituations.map(s => <tr key={s.sit}><td><strong>{s.sit}</strong></td><td>{s.plays.length}</td><td>{getRunPass(s.plays)}</td><td>{topPlaysStr(s.plays, true, 1)} / {topPlaysStr(s.plays, false, 1)}</td></tr>)}</tbody>
          </table></div>
        </Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
        <Panel><SectionTitle title="TOP RUN PLAYS" detail="Sorted by volume" />
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Play</th><th>Calls</th><th>Avg Gain</th><th>Explosive</th></tr></thead>
          <tbody>{oTopRuns.slice(0,5).map(r => <tr key={r.offPlay}><td><strong>{r.offPlay}</strong></td><td>{r.calls}</td><td>{r.avgGain}</td><td>{r.explosives}</td></tr>)}</tbody>
          </table></div>
        </Panel>
        <Panel><SectionTitle title="TOP PASS PLAYS" detail="Sorted by volume" />
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Play</th><th>Calls</th><th>Avg Gain</th><th>Explosive</th></tr></thead>
          <tbody>{oTopPasses.slice(0,5).map(p => <tr key={p.offPlay}><td><strong>{p.offPlay}</strong></td><td>{p.calls}</td><td>{p.avgGain}</td><td>{p.explosives}</td></tr>)}</tbody>
          </table></div>
        </Panel>
      </div>
    </div> 
    
    : 
    
    <div className="grid">
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
        <Panel><SectionTitle title="OVERALL IDENTITY" detail="Scout baseline vs Live" />
          <div className="table-wrap"><table className="data-table"><thead><tr><th></th><th>Scout</th><th>Live</th><th>Trend</th></tr></thead>
          <tbody>
            <tr><td>Plays</td><td>{defenseScout.length}</td><td>{defenseLive.length}</td><td></td></tr>
            <tr><td>Run / Pass</td><td>{Math.round(dScoutPctRun)}% / {Math.round(dScoutPctPass)}%</td><td>{Math.round(dLivePctRun)}% / {Math.round(dLivePctPass)}%</td><td>{changeArrow(dScoutPctPass, dLivePctPass)} Pass</td></tr>
            <tr><td>X-Run (10+)</td><td>{defenseScout.filter(isExplosiveRun).length}</td><td>{defenseLive.filter(isExplosiveRun).length}</td><td></td></tr>
            <tr><td>X-Pass (15+)</td><td>{defenseScout.filter(isExplosivePass).length}</td><td>{defenseLive.filter(isExplosivePass).length}</td><td></td></tr>
          </tbody></table></div>
        </Panel>
        
        <Panel><SectionTitle title="TOP FORMATIONS" detail="By Live usage" />
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Formation</th><th>Snaps</th><th>Live R/P</th><th>Scout R/P</th><th>Change (Run)</th></tr></thead>
          <tbody>{dFormations.map(f => <tr key={f.form}><td><strong>{f.form}</strong></td><td>{f.livePlays}</td><td>{Math.round(f.lRunPct)}R / {Math.round(f.lPassPct)}P</td><td>{Math.round(f.sRunPct)}% Run</td><td>{f.change}</td></tr>)}</tbody>
          </table></div>
        </Panel>
      </div>

      <Panel><SectionTitle title="DOWN/DISTANCE" detail="Situational shifts" />
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Situation</th><th>Live R/P</th><th>Scout R/P</th><th>Expected (Scout)</th></tr></thead>
        <tbody>{dSituations.map(s => {
          const lRun = s.live.filter(isRun).length; const lPass = s.live.filter(isPass).length;
          const sRun = s.scout.filter(isRun).length; const sPass = s.scout.filter(isPass).length;
          const lRP = s.live.length ? `${Math.round((lRun/s.live.length)*100)}% / ${Math.round((lPass/s.live.length)*100)}%` : '—';
          const sRP = s.scout.length ? `${Math.round((sRun/s.scout.length)*100)}% / ${Math.round((sPass/s.scout.length)*100)}%` : '—';
          return <tr key={s.sit}><td><strong>{s.sit}</strong></td><td>{lRP}</td><td>{sRP}</td><td>{s.scout.length ? (sRun >= sPass ? topPlaysStr(s.scout, true, 2) : topPlaysStr(s.scout, false, 2)) : '—'}</td></tr>;
        })}</tbody>
        </table></div>
      </Panel>
    </div>}
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


function HudlCsvExportBar() {
  const [location] = useLocation();
  const [busy, setBusy] = useState(false);

  const route = location.split('?')[0];
  const isLive = route === '/live';
  const isDataRoom = route === '/scout' || route === '/reports';
  if (!isLive && !isDataRoom) return null;

  function exportHudlCsv(kind: 'live' | 'scouting') {
    setBusy(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('coach-hudl-datasets-v1');
      if (!raw) return;
      const data = JSON.parse(raw) as Dataset;
      const game = data.schedule?.find(item => item.id === data.activeGameId);
      const gameData = data.gameData?.[data.activeGameId];
      const plays = kind === 'live' ? (gameData?.live ?? data.live ?? []) : (gameData?.scouting ?? data.scouting ?? []);
      if (!plays.length) {
        window.alert(kind === 'live' ? 'There are no live plays to export yet.' : 'There are no Data Room plays to export yet.');
        return;
      }
      const prefix = game
        ? (game.date || new Date().toISOString().slice(0, 10)) + '_' + (game.opponent || 'Game')
        : new Date().toISOString().slice(0, 10);
      download(hudlCsvFilename(prefix, kind === 'live' ? 'LiveGame' : 'DataRoom'), standardPlaysToHudlCsv(plays));
    } finally {
      window.setTimeout(() => setBusy(false), 250);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <button
        type="button"
        disabled={busy}
        onClick={() => exportHudlCsv(isLive ? 'live' : 'scouting')}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        title={isLive ? 'Export the current Live Game as Connect CSV' : 'Export the current Data Room plays as Connect CSV'}
      >
        <Download size={16} />
        {isLive ? 'Hudl CSV — Live Game' : 'Hudl CSV — Data Room'}
      </button>
    </div>
  );
}

function Router() {
  const [data, setDataState] = useState<Dataset>(safeLoad);
  const [loadingFromSupabase, setLoadingFromSupabase] = useState(isSupabaseConfigured);

  const setData = (next: Dataset) => {
    const gameData = {
      ...(next.gameData || {}),
      [next.activeGameId]: { scouting: next.scouting, live: next.live },
    };
    const synced: Dataset = { ...next, gameData };
    setDataState(synced);
    saveDataset(synced);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadSupabaseData() {
      if (!isSupabaseConfigured) {
        setLoadingFromSupabase(false);
        return;
      }

      try {
        const seasons = await getSeasons();

        if (!seasons.length) {
          setLoadingFromSupabase(false);
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

        let livePlays: Play[] = [];
        let scoutingPlays: Play[] = [];

        try {
          if (activeGameId) {
            const remoteLive = await getLivePlays(activeGameId);
            if (remoteLive.length > 0) {
              livePlays = remoteLive.map(livePlayToStandard);
            }
            const gameObj = schedule.find(g => g.id === activeGameId);
            if (currentSeason && gameObj) {
              const sessions = await getScoutingSessions(currentSeason.id);
              const matchedSession = sessions.find(
                s => s.game_id === activeGameId || (s.opponent && s.opponent.toLowerCase().trim() === gameObj.opponent.toLowerCase().trim())
              );
              if (matchedSession) {
                const remoteScout = await getScoutingPlays(matchedSession.id);
                if (remoteScout.length > 0) {
                  scoutingPlays = remoteScout.map(scoutingPlayToStandard);
                }
              }
            }
          }
        } catch (e) {
          console.warn('Could not fetch remote plays on load:', e);
        }

        setDataState(current => {
          // If we fetched new plays from Supabase, use them. Otherwise, keep whatever was locally cached (current.gameData[activeGameId]), or empty arrays.
          const localActiveGame = current.gameData?.[activeGameId] || { scouting: [], live: [] };
          
          const gameData = {
            ...(current.gameData || {}),
            [activeGameId]: {
              scouting: scoutingPlays.length > 0 ? scoutingPlays : localActiveGame.scouting,
              live: livePlays.length > 0 ? livePlays : localActiveGame.live,
            },
          };
          const nextDataset: Dataset = {
            ...current,
            schedule,
            activeGameId,
            scouting: gameData[activeGameId].scouting,
            live: gameData[activeGameId].live,
            gameData,
          };
          saveDataset(nextDataset);
          return nextDataset;
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
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={24} className="animate-spin" />
          <p style={{ marginTop: 12, color: 'hsl(var(--muted-foreground))' }}>Connecting football database…</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell data={data} setData={setData}>
      <HudlCsvExportBar />
      <Switch>
        <Route path="/"><Dashboard data={data} setData={setData} /></Route>
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
