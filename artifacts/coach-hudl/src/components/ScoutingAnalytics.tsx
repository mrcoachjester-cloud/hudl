import React, { useState, useMemo } from 'react';
import { Filter, TrendingUp, BarChart3, List } from 'lucide-react';
import type { ScoutingPlay } from '../lib/footballData';

interface FilterState {
  formation: string;
  personnel: string;
  down: string;
  playType: string;
  hash: string;
  backfield: string;
  scheme: string;
  motion: string;
}

interface Metrics {
  total: number;
  runCount: number;
  passCount: number;
  runPct: number;
  passPct: number;
  avgGain: number;
  successRate: number;
  explosiveRate: number;
}

interface FormationTendency {
  formation: string;
  snaps: number;
  pctOfTotal: number;
  runPct: number;
  passPct: number;
  avgGain: number;
  successPct: number;
}

interface DownSituation {
  label: string;
  snaps: number;
  runPct: number;
  passPct: number;
  avgGain: number;
  successPct: number;
}

export interface ScoutingAnalyticsProps {
  plays: ScoutingPlay[];
  onDrillDown?: (type: 'formation' | 'playByPlay', value: any) => void;
}

function isAll(val: string): boolean {
  if (!val) return true;
  const s = String(val).trim().toUpperCase();
  return s === '' || s === 'ALL' || s === '-' || s.startsWith('ALL') || s.includes('SELECT');
}

function classifyYardLine(yardLine: number | null): string {
  if (yardLine === null) return 'MIDFIELD';
  const abs = Math.abs(yardLine);
  if (abs <= 10) return 'BACKED UP';
  if (abs <= 39) return yardLine < 0 ? 'OWN TERRITORY' : 'RED ZONE';
  return 'MIDFIELD';
}

function isSuccessfulPlay(play: ScoutingPlay): boolean {
  const down = play.dn || 1;
  const dist = play.dist || 10;
  const gain = play.gnls || 0;

  if (down === 1) return gain >= 4;
  if (down === 2) return gain >= dist / 2;
  if (down >= 3) return gain >= dist;
  return gain >= 4;
}

function getUniqueValues(plays: ScoutingPlay[], field: keyof ScoutingPlay): string[] {
  return Array.from(new Set(
    plays
      .map(p => String(p[field] || '').trim())
      .filter(v => v && v !== '-' && v.toUpperCase() !== 'UNSPECIFIED')
  )).sort();
}

function calculateMetrics(plays: ScoutingPlay[]): Metrics {
  const total = plays.length;
  if (total === 0) {
    return { total: 0, runCount: 0, passCount: 0, runPct: 0, passPct: 0, avgGain: 0, successRate: 0, explosiveRate: 0 };
  }

  const runs = plays.filter(p => String(p.play_type || '').toUpperCase().startsWith('RUN'));
  const passes = plays.filter(p => String(p.play_type || '').toUpperCase().startsWith('PASS'));
  const runCount = runs.length;
  const passCount = passes.length;
  const runPct = runCount / total;
  const passPct = passCount / total;
  const avgGain = plays.reduce((sum, p) => sum + (p.gnls || 0), 0) / total;
  const successCount = plays.filter(isSuccessfulPlay).length;
  const successRate = successCount / total;
  const explosiveCount = plays.filter(p => (p.gnls || 0) >= 12).length;
  const explosiveRate = explosiveCount / total;

  return { total, runCount, passCount, runPct, passPct, avgGain, successRate, explosiveRate };
}

const MetricsCard: React.FC<{ label: string; value: string; note: string; highlighted?: boolean }> = ({
  label,
  value,
  note,
  highlighted,
}) => (
  <div
    className="metric-card"
    style={{
      background: highlighted ? '#f0f4ff' : '#fafbfc',
      border: highlighted ? '1px solid #4169E1' : '1px solid #e0e0e0',
    }}
  >
    <div className="metric-label">{label}</div>
    <div className="metric-value" style={{ color: highlighted ? '#4169E1' : '#1f1f1f' }}>
      {value}
    </div>
    <div className="metric-note">{note}</div>
  </div>
);

export const ScoutingAnalytics: React.FC<ScoutingAnalyticsProps> = ({ plays, onDrillDown }) => {
  const [view, setView] = useState<'overview' | 'formations' | 'downDistance' | 'playByPlay'>('overview');
  const [filters, setFilters] = useState<FilterState>({
    formation: 'ALL',
    personnel: 'ALL',
    down: 'ALL',
    playType: 'ALL',
    hash: 'ALL',
    backfield: 'ALL',
    scheme: 'ALL',
    motion: 'ALL',
  });
  const [selectedFormation, setSelectedFormation] = useState<string>('');

  const formationOptions = useMemo(() => getUniqueValues(plays, 'off_form'), [plays]);
  const personnelOptions = useMemo(() => getUniqueValues(plays, 'personnel'), [plays]);
  const backfieldOptions = useMemo(() => getUniqueValues(plays, 'backfield'), [plays]);
  const schemeOptions = useMemo(() => getUniqueValues(plays, 'scheme'), [plays]);
  const motionOptions = useMemo(() => getUniqueValues(plays, 'motion'), [plays]);
  const hashOptions = ['ALL', 'L', 'M', 'R'];
  const downOptions = ['ALL', '1', '2', '3', '4'];
  const playTypeOptions = ['ALL', 'RUN', 'PASS'];

  const filteredPlays = useMemo(() => {
    return plays.filter(p => {
      const formation = String(p.off_form || '').trim().toUpperCase();
      const personnel = String(p.personnel || '').trim().toUpperCase();
      const down = String(p.dn || '').trim();
      const playType = String(p.play_type || '').trim().toUpperCase();
      const hash = String(p.hash || '').trim().toUpperCase();
      const backfield = String(p.backfield || '').trim().toUpperCase();
      const scheme = String(p.scheme || '').trim().toUpperCase();
      const motion = String(p.motion || '').trim().toUpperCase();

      if (!isAll(filters.formation) && formation !== filters.formation.toUpperCase()) return false;
      if (!isAll(filters.personnel) && personnel !== filters.personnel.toUpperCase()) return false;
      if (!isAll(filters.down) && down !== filters.down) return false;
      if (!isAll(filters.playType) && !playType.startsWith(filters.playType.toUpperCase())) return false;
      if (!isAll(filters.hash) && !hash.includes(filters.hash.toUpperCase())) return false;
      if (!isAll(filters.backfield) && backfield !== filters.backfield.toUpperCase()) return false;
      if (!isAll(filters.scheme) && scheme !== filters.scheme.toUpperCase()) return false;
      if (!isAll(filters.motion) && motion !== filters.motion.toUpperCase()) return false;

      return true;
    });
  }, [plays, filters]);

  const allMetrics = useMemo(() => calculateMetrics(plays), [plays]);
  const metrics = useMemo(() => calculateMetrics(filteredPlays), [filteredPlays]);

  const formationTendencies = useMemo((): FormationTendency[] => {
    const map: Record<string, { snaps: number; runs: number; passes: number; gain: number; success: number }> = {};

    filteredPlays.forEach(p => {
      const form = String(p.off_form || 'UNSPECIFIED').trim().toUpperCase();
      if (!map[form]) map[form] = { snaps: 0, runs: 0, passes: 0, gain: 0, success: 0 };
      map[form].snaps++;
      map[form].gain += p.gnls || 0;
      if (String(p.play_type || '').toUpperCase().startsWith('RUN')) map[form].runs++;
      if (String(p.play_type || '').toUpperCase().startsWith('PASS')) map[form].passes++;
      if (isSuccessfulPlay(p)) map[form].success++;
    });

    return Object.keys(map)
      .map(form => ({
        formation: form,
        snaps: map[form].snaps,
        pctOfTotal: metrics.total ? map[form].snaps / metrics.total : 0,
        runPct: map[form].snaps ? map[form].runs / map[form].snaps : 0,
        passPct: map[form].snaps ? map[form].passes / map[form].snaps : 0,
        avgGain: map[form].snaps ? map[form].gain / map[form].snaps : 0,
        successPct: map[form].snaps ? map[form].success / map[form].snaps : 0,
      }))
      .sort((a, b) => b.snaps - a.snaps)
      .slice(0, 8);
  }, [filteredPlays, metrics.total]);

  const downDistanceTendencies = useMemo((): DownSituation[] => {
    const situations = [
      { label: '1ST & 10', filter: (p: ScoutingPlay) => p.dn === 1 },
      { label: '2ND & LONG (8+)', filter: (p: ScoutingPlay) => p.dn === 2 && (p.dist || 0) >= 8 },
      { label: '2ND & MED (4-7)', filter: (p: ScoutingPlay) => p.dn === 2 && (p.dist || 0) >= 4 && (p.dist || 0) <= 7 },
      { label: '2ND & SHORT (1-3)', filter: (p: ScoutingPlay) => p.dn === 2 && (p.dist || 0) <= 3 },
      { label: '3RD & LONG (7+)', filter: (p: ScoutingPlay) => p.dn === 3 && (p.dist || 0) >= 7 },
      { label: '3RD & MED (3-6)', filter: (p: ScoutingPlay) => p.dn === 3 && (p.dist || 0) >= 3 && (p.dist || 0) <= 6 },
      { label: '3RD & SHORT (1-3)', filter: (p: ScoutingPlay) => p.dn === 3 && (p.dist || 0) <= 3 },
    ];

    return situations.map(sit => {
      const subset = filteredPlays.filter(sit.filter);
      const m = calculateMetrics(subset);
      return {
        label: sit.label,
        snaps: m.total,
        runPct: m.runPct,
        passPct: m.passPct,
        avgGain: m.avgGain,
        successPct: m.successRate,
      };
    });
  }, [filteredPlays]);

  return (
    <div className="scouting-analytics">
      <div className="analytics-header">
        <div className="analytics-title">
          <BarChart3 size={20} />
          <h2>Scouting Analytics</h2>
          <span className="snap-count">{filteredPlays.length} of {plays.length} plays</span>
        </div>
        <div className="view-tabs">
          <button
            className={`tab ${view === 'overview' ? 'active' : ''}`}
            onClick={() => setView('overview')}
          >
            Overview
          </button>
          <button
            className={`tab ${view === 'formations' ? 'active' : ''}`}
            onClick={() => setView('formations')}
          >
            Formations
          </button>
          <button
            className={`tab ${view === 'downDistance' ? 'active' : ''}`}
            onClick={() => setView('downDistance')}
          >
            Down & Distance
          </button>
          <button
            className={`tab ${view === 'playByPlay' ? 'active' : ''}`}
            onClick={() => setView('playByPlay')}
          >
            Play-by-Play
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="filters-panel">
        <div className="filters-label">
          <Filter size={14} />
          Filters
        </div>
        <div className="filters-grid">
          <select
            value={filters.formation}
            onChange={e => setFilters({ ...filters, formation: e.target.value })}
            className="filter-select"
          >
            <option>ALL FORMATIONS</option>
            {formationOptions.map(opt => (
              <option key={opt}>{opt}</option>
            ))}
          </select>

          <select
            value={filters.playType}
            onChange={e => setFilters({ ...filters, playType: e.target.value })}
            className="filter-select"
          >
            <option>ALL TYPES</option>
            {playTypeOptions.slice(1).map(opt => (
              <option key={opt}>{opt}</option>
            ))}
          </select>

          <select
            value={filters.down}
            onChange={e => setFilters({ ...filters, down: e.target.value })}
            className="filter-select"
          >
            <option>ALL DOWNS</option>
            {downOptions.slice(1).map(opt => (
              <option key={opt}>{opt}</option>
            ))}
          </select>

          <select
            value={filters.personnel}
            onChange={e => setFilters({ ...filters, personnel: e.target.value })}
            className="filter-select"
          >
            <option>ALL PERSONNEL</option>
            {personnelOptions.map(opt => (
              <option key={opt}>{opt}</option>
            ))}
          </select>

          <select
            value={filters.backfield}
            onChange={e => setFilters({ ...filters, backfield: e.target.value })}
            className="filter-select"
          >
            <option>ALL BACKFIELDS</option>
            {backfieldOptions.map(opt => (
              <option key={opt}>{opt}</option>
            ))}
          </select>

          <select
            value={filters.scheme}
            onChange={e => setFilters({ ...filters, scheme: e.target.value })}
            className="filter-select"
          >
            <option>ALL SCHEMES</option>
            {schemeOptions.map(opt => (
              <option key={opt}>{opt}</option>
            ))}
          </select>

          <button
            onClick={() =>
              setFilters({
                formation: 'ALL',
                personnel: 'ALL',
                down: 'ALL',
                playType: 'ALL',
                hash: 'ALL',
                backfield: 'ALL',
                scheme: 'ALL',
                motion: 'ALL',
              })
            }
            className="btn btn-ghost btn-sm"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* OVERVIEW */}
      {view === 'overview' && (
        <div className="analytics-view">
          {/* DASHBOARD: ALL PLAYS vs FILTERED PLAYS */}
          <div className="dashboard-section">
            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 14, fontWeight: 600, color: '#333' }}>
              Baseline Comparison (All Plays vs Filtered)
            </h3>
            <div className="paired-metrics-grid">
              <div className="paired-metric">
                <div className="metric-pair-label all-label">TOTAL PLAYS (ALL)</div>
                <div className="metric-pair-label filtered-label">TOTAL PLAYS (FILTERED)</div>
                <div className="metric-pair-value">
                  <span className="all-value">{allMetrics.total}</span>
                  <span className="filtered-value">{metrics.total}</span>
                </div>
              </div>

              <div className="paired-metric">
                <div className="metric-pair-label all-label">RUN % (ALL)</div>
                <div className="metric-pair-label filtered-label">RUN % (FILTERED)</div>
                <div className="metric-pair-value">
                  <span className="all-value">{(allMetrics.runPct * 100).toFixed(1)}%</span>
                  <span className="filtered-value" style={{ color: metrics.runPct >= 0.6 ? '#276A3C' : '#333', fontWeight: metrics.runPct >= 0.6 ? 'bold' : 'normal' }}>
                    {(metrics.runPct * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="paired-metric">
                <div className="metric-pair-label all-label">PASS % (ALL)</div>
                <div className="metric-pair-label filtered-label">PASS % (FILTERED)</div>
                <div className="metric-pair-value">
                  <span className="all-value">{(allMetrics.passPct * 100).toFixed(1)}%</span>
                  <span className="filtered-value" style={{ color: metrics.passPct >= 0.6 ? '#1F4E78' : '#333', fontWeight: metrics.passPct >= 0.6 ? 'bold' : 'normal' }}>
                    {(metrics.passPct * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="paired-metric">
                <div className="metric-pair-label all-label">AVG GAIN (ALL)</div>
                <div className="metric-pair-label filtered-label">AVG GAIN (FILTERED)</div>
                <div className="metric-pair-value">
                  <span className="all-value">{allMetrics.avgGain.toFixed(1)}</span>
                  <span className="filtered-value">{metrics.avgGain.toFixed(1)}</span>
                </div>
              </div>

              <div className="paired-metric">
                <div className="metric-pair-label all-label">SUCCESS RATE (ALL)</div>
                <div className="metric-pair-label filtered-label">SUCCESS RATE (FILTERED)</div>
                <div className="metric-pair-value">
                  <span className="all-value">{(allMetrics.successRate * 100).toFixed(1)}%</span>
                  <span className="filtered-value" style={{ color: metrics.successRate >= 0.5 ? '#276A3C' : '#D32F2F', fontWeight: 'bold' }}>
                    {(metrics.successRate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="paired-metric">
                <div className="metric-pair-label all-label">EXPLOSIVE RATE (ALL)</div>
                <div className="metric-pair-label filtered-label">EXPLOSIVE RATE (FILTERED)</div>
                <div className="metric-pair-value">
                  <span className="all-value">{(allMetrics.explosiveRate * 100).toFixed(1)}%</span>
                  <span className="filtered-value">{(metrics.explosiveRate * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* ORIGINAL METRICS GRID */}
          <div className="metrics-grid" style={{ marginTop: 32 }}>
            <MetricsCard label="TOTAL PLAYS" value={String(metrics.total)} note="in current filters" />
            <MetricsCard label="RUN %" value={`${(metrics.runPct * 100).toFixed(1)}%`} note="run tendencies" />
            <MetricsCard
              label="PASS %"
              value={`${(metrics.passPct * 100).toFixed(1)}%`}
              note="pass tendencies"
            />
            <MetricsCard label="AVG GAIN" value={`${metrics.avgGain.toFixed(1)}`} note="yards per play" />
            <MetricsCard
              label="SUCCESS RATE"
              value={`${(metrics.successRate * 100).toFixed(1)}%`}
              note="by down & distance"
              highlighted={metrics.successRate >= 0.5}
            />
            <MetricsCard
              label="EXPLOSIVE RATE"
              value={`${(metrics.explosiveRate * 100).toFixed(1)}%`}
              note="12+ yard plays"
            />
          </div>

          {/* Verdict Banner */}
          <div className="verdict-banner" style={{
            background: metrics.runPct >= 0.65 ? '#E2EFDA' : metrics.passPct >= 0.65 ? '#DDEBF7' : '#F5F5F5',
            borderLeft: metrics.runPct >= 0.65 ? '4px solid #276A3C' : metrics.passPct >= 0.65 ? '4px solid #1F4E78' : '4px solid #999'
          }}>
            <TrendingUp size={16} />
            <div>
              <strong>
                {metrics.runPct >= 0.65
                  ? `🚨 RUN-HEAVY (${(metrics.runPct * 100).toFixed(0)}%) — LOAD THE BOX`
                  : metrics.passPct >= 0.65
                    ? `🚨 PASS-HEAVY (${(metrics.passPct * 100).toFixed(0)}%) — PASS COVERAGE`
                    : 'BALANCED ATTACK'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* FORMATIONS */}
      {view === 'formations' && (
        <div className="analytics-view">
          <h3>Formation Tendencies</h3>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Formation</th>
                <th>Snaps</th>
                <th>% Offense</th>
                <th>Run %</th>
                <th>Pass %</th>
                <th>Avg Yds</th>
                <th>Success %</th>
              </tr>
            </thead>
            <tbody>
              {formationTendencies.map((row, i) => (
                <tr
                  key={row.formation}
                  style={{ background: i % 2 === 1 ? '#f9f9f9' : '#fff' }}
                  onClick={() => {
                    setSelectedFormation(row.formation);
                    onDrillDown?.('formation', row.formation);
                  }}
                  className="clickable-row"
                >
                  <td>
                    <strong>{row.formation}</strong>
                  </td>
                  <td>{row.snaps}</td>
                  <td>{(row.pctOfTotal * 100).toFixed(1)}%</td>
                  <td style={{ color: row.runPct >= 0.7 ? '#276A3C' : '#333', fontWeight: row.runPct >= 0.7 ? 'bold' : 'normal' }}>
                    {(row.runPct * 100).toFixed(1)}%
                  </td>
                  <td style={{ color: row.passPct >= 0.7 ? '#1F4E78' : '#333', fontWeight: row.passPct >= 0.7 ? 'bold' : 'normal' }}>
                    {(row.passPct * 100).toFixed(1)}%
                  </td>
                  <td>{row.avgGain.toFixed(1)}</td>
                  <td>{(row.successPct * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* DOWN & DISTANCE */}
      {view === 'downDistance' && (
        <div className="analytics-view">
          <h3>Down & Distance Tendencies</h3>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Situation</th>
                <th>Snaps</th>
                <th>Run %</th>
                <th>Pass %</th>
                <th>Avg Yards</th>
                <th>Success %</th>
              </tr>
            </thead>
            <tbody>
              {downDistanceTendencies.map((row, i) => (
                <tr key={row.label} style={{ background: i % 2 === 1 ? '#f9f9f9' : '#fff' }}>
                  <td>
                    <strong>{row.label}</strong>
                  </td>
                  <td>{row.snaps}</td>
                  <td style={{ color: row.runPct >= 0.7 ? '#276A3C' : '#333', fontWeight: row.runPct >= 0.7 ? 'bold' : 'normal' }}>
                    {(row.runPct * 100).toFixed(1)}%
                  </td>
                  <td style={{ color: row.passPct >= 0.7 ? '#1F4E78' : '#333', fontWeight: row.passPct >= 0.7 ? 'bold' : 'normal' }}>
                    {(row.passPct * 100).toFixed(1)}%
                  </td>
                  <td>{row.avgGain.toFixed(1)}</td>
                  <td>{(row.successPct * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PLAY-BY-PLAY */}
      {view === 'playByPlay' && (
        <div className="analytics-view">
          <h3>Play-by-Play Log ({filteredPlays.length} plays)</h3>
          <table className="analytics-table small-table">
            <thead>
              <tr>
                <th>Play</th>
                <th>Down</th>
                <th>Distance</th>
                <th>Type</th>
                <th>Formation</th>
                <th>Call</th>
                <th>Gain</th>
                <th>Success</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlays.slice(0, 50).map((play, i) => (
                <tr
                  key={i}
                  style={{
                    background: i % 2 === 1 ? '#f9f9f9' : '#fff',
                    borderLeft: (play.gnls || 0) >= 12 ? '3px solid #FFC107' : 'none',
                  }}
                >
                  <td>
                    <strong>#{play.play_no}</strong>
                  </td>
                  <td>{play.dn || '-'}</td>
                  <td>{play.dist || '-'}</td>
                  <td
                    style={{
                      color: String(play.play_type || '').toUpperCase().startsWith('RUN') ? '#276A3C' : '#1F4E78',
                      fontWeight: 'bold',
                    }}
                  >
                    {String(play.play_type || '').toUpperCase()[0]}
                  </td>
                  <td>{play.off_form || '-'}</td>
                  <td>{play.off_play || '-'}</td>
                  <td style={{ fontWeight: 'bold' }}>{play.gnls || '-'}</td>
                  <td>{isSuccessfulPlay(play) ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPlays.length > 50 && <p className="text-muted">Showing 50 of {filteredPlays.length} plays</p>}
        </div>
      )}

      <style jsx>{`
        .scouting-analytics {
          padding: 20px;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .analytics-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .analytics-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .analytics-title h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .snap-count {
          background: #f0f4ff;
          color: #4169E1;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
        }

        .view-tabs {
          display: flex;
          gap: 8px;
        }

        .tab {
          background: none;
          border: 1px solid #e0e0e0;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .tab:hover {
          border-color: #4169E1;
          color: #4169E1;
        }

        .tab.active {
          background: #4169E1;
          border-color: #4169E1;
          color: white;
        }

        .filters-panel {
          background: #f8f9fa;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .filters-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 12px;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
        }

        .filter-select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 13px;
          background: white;
          cursor: pointer;
        }

        .filter-select:focus {
          outline: none;
          border-color: #4169E1;
          box-shadow: 0 0 0 2px rgba(65, 105, 225, 0.1);
        }

        .analytics-view {
          animation: fadeIn 0.2s ease-in;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .metric-card {
          padding: 16px;
          border-radius: 6px;
          text-align: center;
          transition: all 0.2s;
        }

        .metric-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .metric-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: #999;
          margin-bottom: 8px;
        }

        .metric-value {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .metric-note {
          font-size: 11px;
          color: #aaa;
        }

        .verdict-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 6px;
          margin-bottom: 24px;
        }

        .verdict-banner strong {
          font-size: 14px;
          font-weight: 600;
        }

        .analytics-view h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .analytics-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }

        .analytics-table thead {
          background: #f5f5f5;
        }

        .analytics-table th {
          padding: 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: #666;
          border-bottom: 2px solid #e0e0e0;
        }

        .analytics-table td {
          padding: 12px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 13px;
        }

        .clickable-row {
          cursor: pointer;
          transition: background 0.2s;
        }

        .clickable-row:hover {
          background: #f5f5f5 !important;
        }

        .small-table td {
          padding: 8px 10px;
          font-size: 12px;
        }

        .text-muted {
          color: #999;
          font-size: 12px;
          margin-top: 12px;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }

        @media (max-width: 768px) {
          .analytics-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .view-tabs {
            width: 100%;
            flex-wrap: wrap;
          }

          .filters-grid {
            grid-template-columns: 1fr;
          }

          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .analytics-table {
            font-size: 11px;
          }

          .analytics-table th,
          .analytics-table td {
            padding: 8px 6px;
          }
        }

        .dashboard-section {
          background: #fafbfc;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .paired-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }

        .paired-metric {
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 16px;
          text-align: center;
        }

        .metric-pair-label {
          display: block;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }

        .all-label {
          color: #999;
        }

        .filtered-label {
          color: #4169E1;
          font-weight: 700;
        }

        .metric-pair-value {
          display: flex;
          justify-content: space-around;
          align-items: center;
          gap: 12px;
        }

        .all-value {
          font-size: 20px;
          font-weight: 700;
          color: #666;
          flex: 1;
        }

        .filtered-value {
          font-size: 20px;
          font-weight: 700;
          color: #4169E1;
          flex: 1;
        }
      `}</style>
    </div>
  );
};
