import fs from 'node:fs';

const path = new URL('../src/App.tsx', import.meta.url);
let source = fs.readFileSync(path, 'utf8');

const oldImport = "import { getGames, getLivePlays, getScoutingSessions, getScoutingPlays, getSeasons, livePlayToStandard, scoutingPlayToStandard, type StandardPlay } from './lib/footballData';";
const newImport = "import { appendScoutingPlays, createScoutingSession, getGames, getLivePlays, getScoutingSessions, getScoutingPlays, getSeasons, livePlayToStandard, scoutingPlayToStandard, type StandardPlay } from './lib/footballData';";
if (source.includes(oldImport)) source = source.replace(oldImport, newImport);

const oldTeamEffect = `  useEffect(() => {
    let cancelled = false;
    if (!activeSeason) return () => { cancelled = true; };
    getScoutingTeamNames(activeSeason)
      .then(names => {
        if (!cancelled) setTeamOptions(names.length ? names : []);
      })
      .catch(() => {
        if (!cancelled) setTeamOptions([]);
      });
    return () => { cancelled = true; };
  }, [activeSeason]);`;
const newTeamEffect = `  useEffect(() => {
    const names = Array.from(new Set(seasonGames.map(game => game.opponent.trim()).filter(Boolean)));
    setTeamOptions(names);
  }, [activeSeason, data.schedule]);`;
if (source.includes(oldTeamEffect)) source = source.replace(oldTeamEffect, newTeamEffect);

const oldSelectTeam = `  const selectTeam = async (team: string) => {
    const normalizedTeam = team.trim();
    if (!normalizedTeam || normalizedTeam === activeTeam) return;
    try {
      const scouting = await getScoutingPlaysForTeam(activeSeason, normalizedTeam);
      setData({ ...data, activeTeam: normalizedTeam, scouting });
    } catch (error) {
      console.error('Could not load scouting data for team:', error);
      alert('Could not load scouting data for this team.');
    }
  };`;
const newSelectTeam = `  const selectTeam = async (team: string) => {
    const normalizedTeam = team.trim();
    if (!normalizedTeam) return;
    try {
      const scouting = await getScoutingPlaysForTeam(activeSeason, normalizedTeam);
      const teamGame = seasonGames.find(game => game.opponent.trim().toLowerCase() === normalizedTeam.toLowerCase());
      const nextLive = teamGame ? (data.gameData?.[teamGame.id]?.live ?? []) : [];
      setData({ ...data, activeTeam: normalizedTeam, activeGameId: teamGame?.id ?? data.activeGameId, scouting, live: nextLive });
    } catch (error) {
      console.error('Could not load scouting data for team:', error);
      alert('Could not load scouting data for this team.');
    }
  };`;
if (source.includes(oldSelectTeam)) source = source.replace(oldSelectTeam, newSelectTeam);

// The top bar is intentionally Season + Team only. Game is no longer a global selector.
const gameSelector = /\n\s*<div style=\{\{ display: 'flex', alignItems: 'center', gap: 8 \}\}>\n\s*<label htmlFor="global-game"[\s\S]*?<\/div>\n\s*\n\s*<div className="live-pill">/;
if (gameSelector.test(source)) source = source.replace(gameSelector, '\n\n            <div className="live-pill">');

const start = source.indexOf('function UploadPage(');
const end = source.indexOf('\nfunction ScoutPage(', start);
if (start === -1 || end === -1) throw new Error('Could not locate UploadPage boundaries');

const replacement = String.raw`function UploadPage({ data, setData }: { data: Dataset; setData: (data: Dataset) => void }) {
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
    if (!team) return;
    setTeam(current => current || team);
  }, [team]);

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
        const parsed = parseCsv(String(reader.result ?? ''));
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
`;
source = source.slice(0, start) + replacement + source.slice(end);

fs.writeFileSync(path, source);
console.log('Schedule-driven Team and Data Room patch applied.');
