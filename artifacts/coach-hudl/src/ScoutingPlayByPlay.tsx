import { useMemo, useState } from 'react';
import { Download, Film, Search } from 'lucide-react';
import type { StandardPlay } from './lib/footballData';

type Play = StandardPlay;
const ALL = 'ALL FORMATIONS';

const text = (value: unknown, fallback = '—') => {
  const result = String(value ?? '').trim();
  return result || fallback;
};
const number = (value: unknown) => {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
};
const runPlay = (play: Play) => {
  const type = text(play.type, '').toUpperCase();
  return type === 'R' || type.startsWith('RUN');
};
const passPlay = (play: Play) => {
  const type = text(play.type, '').toUpperCase();
  return type === 'P' || type.startsWith('PASS');
};
const meaningful = (value: unknown) => {
  const normalized = text(value, '').toUpperCase();
  return Boolean(normalized) && !['—', '-', '0', 'UNSPECIFIED'].includes(normalized) && !normalized.includes('SELECT');
};
const optionsFor = (plays: Play[], get: (play: Play) => unknown) =>
  Array.from(new Set(plays.map(play => text(get(play), '')).filter(meaningful)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

function situation(play: Play) {
  const down = number(play.dn);
  const distance = number(play.dist);
  if (down === 1) return '1ST & 10';
  if (down === 2 || down === 3) {
    const prefix = down === 2 ? '2ND' : '3RD';
    if (distance <= 3) return prefix + ' & SHORT (1-3)';
    if (distance <= 7) return prefix + ' & MEDIUM (4-7)';
    return prefix + ' & LONG (8+)';
  }
  if (down === 4) return '4TH DOWN';
  return 'OTHER';
}

function Filter({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return <label className="filter-field">
    <span>{label}</span>
    <select value={value} onChange={event => onChange(event.target.value)}>
      <option value="ALL">All</option>
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>;
}

export default function ScoutingPlayByPlay({ data }: { data: { scouting?: Play[]; activeTeam?: string } }) {
  const source = Array.isArray(data.scouting) ? data.scouting : [];
  const [formation, setFormation] = useState(ALL);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    odk: 'ALL', down: 'ALL', type: 'ALL', backfield: 'ALL', motion: 'ALL',
    call: 'ALL', scheme: 'ALL', direction: 'ALL', hash: 'ALL',
  });

  const formations = useMemo(() => optionsFor(source, play => play.form), [source]);
  const updateFilter = (key: string, value: string) => setFilters(current => ({ ...current, [key]: value }));
  const filtered = useMemo(() => source.filter(play => {
    if (formation !== ALL && text(play.form, '').toLowerCase() !== formation.toLowerCase()) return false;
    const lookup: Record<string, unknown> = {
      odk: play.odk,
      down: number(play.dn) ? String(number(play.dn)) : '',
      type: runPlay(play) ? 'RUN' : passPlay(play) ? 'PASS' : text(play.type, '').toUpperCase(),
      backfield: play.backfield,
      motion: play.motion,
      call: play.offPlay,
      scheme: play.scheme,
      direction: play.dir,
      hash: play.hash,
    };
    for (const [key, selected] of Object.entries(filters)) {
      if (selected !== 'ALL' && text(lookup[key], '').toUpperCase() !== selected.toUpperCase()) return false;
    }
    if (search.trim()) {
      const haystack = Object.values(play).map(value => String(value ?? '')).join(' ').toLowerCase();
      if (!haystack.includes(search.trim().toLowerCase())) return false;
    }
    return true;
  }).slice().sort((a, b) => number(a.playNo) - number(b.playNo)), [source, formation, filters, search]);

  const reset = () => {
    setFormation(ALL);
    setSearch('');
    setFilters({ odk: 'ALL', down: 'ALL', type: 'ALL', backfield: 'ALL', motion: 'ALL', call: 'ALL', scheme: 'ALL', direction: 'ALL', hash: 'ALL' });
  };

  const exportCsv = () => {
    const headers = ['PLAY #', 'DOWN & DIST', 'SITUATION', 'PLAY CALL', 'TYPE', 'DIR', 'GAIN', 'SCHEME', 'BACKFIELD', 'MOTION', 'HASH / FIELD'];
    const rows = filtered.map(play => [
      text(play.playNo), number(play.dn) > 0 ? number(play.dn) + ' & ' + number(play.dist) : '—',
      situation(play), text(play.offPlay), text(play.type).toUpperCase(), text(play.dir).toUpperCase(),
      String(number(play.gnls)), text(play.scheme), text(play.backfield), text(play.motion), text(play.hash),
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = (data.activeTeam || 'scouting').trim().replace(/[^a-z0-9_-]+/gi, '-') + '-formation-play-by-play.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="content">
    <div className="page-head">
      <div>
        <div className="eyebrow">SCOUTING · FORMATION PLAY-BY-PLAY</div>
        <h1>{text(data.activeTeam, 'Opponent')} scouting log</h1>
        <p>Choose a formation to review every snap in order. Filter values are built from the selected team's scouting file.</p>
      </div>
      <div className="actions">
        <button className="btn btn-ghost" onClick={reset}>Reset filters</button>
        <button className="btn btn-primary" onClick={exportCsv} disabled={!filtered.length}><Download /> Export CSV</button>
      </div>
    </div>

    <section className="panel">
      <div style={{ padding: '21px 21px 0' }}>
        <div className="section-title"><div><h3>Select formation to view</h3><span>Dynamic lookup values from the loaded scouting plays</span></div></div>
      </div>
      <div className="panel-pad">
        <div className="form-grid">
          <label className="filter-field">
            <span>Formation</span>
            <select value={formation} onChange={event => setFormation(event.target.value)}>
              <option value={ALL}>ALL FORMATIONS</option>
              {formations.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <Filter label="ODK" value={filters.odk} options={optionsFor(source, play => play.odk)} onChange={value => updateFilter('odk', value)} />
          <Filter label="Down" value={filters.down} options={['1', '2', '3', '4']} onChange={value => updateFilter('down', value)} />
          <Filter label="Play type" value={filters.type} options={['RUN', 'PASS']} onChange={value => updateFilter('type', value)} />
          <Filter label="Backfield" value={filters.backfield} options={optionsFor(source, play => play.backfield)} onChange={value => updateFilter('backfield', value)} />
          <Filter label="Motion" value={filters.motion} options={optionsFor(source, play => play.motion)} onChange={value => updateFilter('motion', value)} />
          <Filter label="Play call" value={filters.call} options={optionsFor(source, play => play.offPlay)} onChange={value => updateFilter('call', value)} />
          <Filter label="Scheme" value={filters.scheme} options={optionsFor(source, play => play.scheme)} onChange={value => updateFilter('scheme', value)} />
          <Filter label="Direction" value={filters.direction} options={optionsFor(source, play => play.dir)} onChange={value => updateFilter('direction', value)} />
          <Filter label="Hash / field" value={filters.hash} options={optionsFor(source, play => play.hash)} onChange={value => updateFilter('hash', value)} />
        </div>
        <div className="filters" style={{ marginTop: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 420 }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: 10, color: '#77758a' }} />
            <input className="input" style={{ paddingLeft: 33, width: '100%' }} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search any scouting field…" aria-label="Search scouting plays" />
          </div>
          <span className="eyebrow" style={{ marginLeft: 'auto' }}>{filtered.length} of {source.length} plays</span>
        </div>
      </div>
    </section>

    <section className="panel" style={{ marginTop: 14 }} data-testid="scouting-play-by-play">
      <div style={{ padding: '21px 21px 0' }}>
        <div className="section-title"><div><h3>Play-by-play log — {formation === ALL ? 'ALL FORMATIONS' : formation.toUpperCase()}</h3><span>{filtered.length} total plays · sorted by play number</span></div></div>
      </div>
      {filtered.length ? <div className="table-wrap">
        <table className="data-table" style={{ minWidth: 1100 }}>
          <thead><tr><th>Play #</th><th>Down & dist</th><th>Situation</th><th>Play call</th><th>Type</th><th>Dir</th><th>Gain</th><th>Scheme</th><th>Backfield</th><th>Motion</th><th>Hash / field</th></tr></thead>
          <tbody>{filtered.map((play, index) => {
            const gain = number(play.gnls);
            const type = text(play.type).toUpperCase();
            return <tr key={String(play.playNo) + '-' + index}>
              <td><strong>#{text(play.playNo)}</strong></td>
              <td>{number(play.dn) > 0 ? number(play.dn) + ' & ' + number(play.dist) : '—'}</td>
              <td>{situation(play)}</td>
              <td><strong>{text(play.offPlay)}</strong></td>
              <td><span className={'tag ' + (runPlay(play) ? 'green' : '')}>{type}</span></td>
              <td>{text(play.dir).toUpperCase()}</td>
              <td style={gain >= 12 ? { background: '#FFF2CC', color: '#5f4b16', fontWeight: 700 } : { color: gain >= 0 ? '#62dfae' : '#ef8f88' }}>{gain}</td>
              <td>{text(play.scheme)}</td>
              <td>{text(play.backfield)}</td>
              <td>{text(play.motion)}</td>
              <td>{text(play.hash).toUpperCase()}</td>
            </tr>;
          })}</tbody>
        </table>
      </div> : <div className="empty"><Film size={28} /><h3>{source.length ? 'No plays found for these selections' : 'No scouting plays loaded'}</h3><p>{source.length ? 'Change the formation or clear a filter to see more snaps.' : 'Choose the correct team at the top of the app, or import a Scout File in the Data Room.'}</p></div>}
    </section>
  </div>;
}
