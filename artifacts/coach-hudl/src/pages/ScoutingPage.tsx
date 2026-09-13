import React, { useState, useEffect } from 'react';
import { Download, Upload, Plus, Trash2, AlertCircle } from 'lucide-react';
import { ScoutingAnalytics } from '../components/ScoutingAnalytics';
import { getScoutingSessions, getScoutingPlays, type ScoutingSession, type ScoutingPlay } from '../lib/footballData';
import type { Dataset } from '../App';

interface ScoutingPageProps {
  data: Dataset;
  setData: (data: Dataset) => void;
}

export const ScoutingPage: React.FC<ScoutingPageProps> = ({ data, setData }) => {
  const [sessions, setSessions] = useState<ScoutingSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [plays, setPlays] = useState<ScoutingPlay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'sessions' | 'analytics' | 'upload'>('analytics');
  const [newSessionDraft, setNewSessionDraft] = useState({
    opponent: '',
    week: '',
    description: '',
  });
  const [renderError, setRenderError] = useState<string | null>(null);

  // Get current season from Supabase integration in App.tsx
  const currentSeason = data.schedule[0];
  const activeSeasonId = 'current-season'; // This would come from your Supabase context

  useEffect(() => {
    try {
      loadScoutingSessions();
    } catch (err) {
      setRenderError(`Initialization error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [activeSeasonId]);

  useEffect(() => {
    if (selectedSession) {
      loadScoutingPlays(selectedSession);
    }
  }, [selectedSession]);

  const loadScoutingSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      // This would fetch from Supabase - for now using demo data
      const mockSessions: ScoutingSession[] = data.scouting.length > 0
        ? [{
            id: 'session-1',
            season_id: activeSeasonId,
            game_id: data.activeGameId,
            opponent: data.schedule.find(g => g.id === data.activeGameId)?.opponent || 'Unknown',
            week: '1',
            description: 'Game film analysis',
            archived: false,
            uploaded_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          }]
        : [];
      setSessions(mockSessions);
      if (mockSessions.length > 0) {
        setSelectedSession(mockSessions[0].id);
      }
    } catch (err) {
      setError(`Failed to load scouting sessions: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadScoutingPlays = async (sessionId: string) => {
    try {
      setLoading(true);
      setError(null);
      // Convert demo scouting data to ScoutingPlay format
      const convertedPlays: ScoutingPlay[] = data.scouting.map((p, i) => ({
        id: `play-${i}`,
        scouting_session_id: sessionId,
        play_no: Number(p.playNo) || i + 1,
        odk: p.odk || 'O',
        dn: p.dn ? Number(p.dn) : null,
        dist: p.dist ? Number(p.dist) : null,
        hash: p.hash || null,
        gnls: p.gnls ? Number(p.gnls) : null,
        yard_ln: p.yardLn ? Number(p.yardLn) : null,
        play_type: p.type || null,
        result: p.result || null,
        off_form: p.form || null,
        personnel: p.personnel || null,
        scheme: p.scheme || null,
        motion: p.motion || null,
        off_play: p.offPlay || null,
        ball_carrier: p.carrier || null,
        defense: p.defense || null,
        direction: p.dir || null,
        backfield: p.backfield || null,
        created_at: new Date().toISOString(),
      }));
      setPlays(convertedPlays);
    } catch (err) {
      setError(`Failed to load plays: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = () => {
    if (!newSessionDraft.opponent.trim()) {
      setError('Please enter an opponent name');
      return;
    }
    const newSession: ScoutingSession = {
      id: `session-${Date.now()}`,
      season_id: activeSeasonId,
      game_id: null,
      opponent: newSessionDraft.opponent,
      week: newSessionDraft.week || null,
      description: newSessionDraft.description || null,
      archived: false,
      uploaded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    setSessions([newSession, ...sessions]);
    setSelectedSession(newSession.id);
    setNewSessionDraft({ opponent: '', week: '', description: '' });
    setError(null);
  };

  const handleExportCSV = () => {
    if (plays.length === 0) {
      setError('No plays to export');
      return;
    }
    const headers = ['Play #', 'ODK', 'Down', 'Distance', 'Type', 'Formation', 'Play Call', 'Gain', 'Result', 'Scheme'];
    const rows = plays.map(p => [
      p.play_no,
      p.odk,
      p.dn || '-',
      p.dist || '-',
      p.play_type || '-',
      p.off_form || '-',
      p.off_play || '-',
      p.gnls || '-',
      p.result || '-',
      p.scheme || '-',
    ]);
    const csv = [headers, ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scouting-${selectedSession}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeSession = sessions.find(s => s.id === selectedSession);

  return (
    <div className="content">
      {renderError && (
        <div className="alert alert-error">
          <AlertCircle size={16} />
          {renderError}
        </div>
      )}
      <div className="page-header">
        <div>
          <h1>Scouting System</h1>
          <p>Advanced opponent analysis with drill-down formations and play tendencies.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={() => setView(view === 'sessions' ? 'analytics' : 'sessions')}>
            {view === 'sessions' ? 'View Analytics' : 'Manage Sessions'}
          </button>
          {plays.length > 0 && (
            <button className="btn btn-primary" onClick={handleExportCSV}>
              <Download size={16} />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {view === 'sessions' ? (
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 0.3fr)' }}>
          <div className="panel">
            <h2>Create New Scouting Session</h2>
            <div className="form-group">
              <label>Opponent Name *</label>
              <input
                type="text"
                value={newSessionDraft.opponent}
                onChange={e => setNewSessionDraft({ ...newSessionDraft, opponent: e.target.value })}
                placeholder="e.g., Lincoln High"
                className="input"
              />
            </div>
            <div className="form-group">
              <label>Week / Week Number</label>
              <input
                type="text"
                value={newSessionDraft.week}
                onChange={e => setNewSessionDraft({ ...newSessionDraft, week: e.target.value })}
                placeholder="e.g., Week 4"
                className="input"
              />
            </div>
            <div className="form-group">
              <label>Description / Notes</label>
              <textarea
                value={newSessionDraft.description}
                onChange={e => setNewSessionDraft({ ...newSessionDraft, description: e.target.value })}
                placeholder="e.g., Film from last game vs this opponent"
                rows={3}
                className="input"
              />
            </div>
            <button className="btn btn-primary" onClick={handleCreateSession} disabled={!newSessionDraft.opponent.trim()}>
              <Plus size={16} />
              Create Session
            </button>
          </div>

          <div className="panel">
            <h2>Sessions ({sessions.length})</h2>
            <div className="session-list">
              {sessions.length === 0 ? (
                <p className="text-muted">No scouting sessions yet. Create one to get started.</p>
              ) : (
                sessions.map(session => (
                  <div
                    key={session.id}
                    className={`session-item ${selectedSession === session.id ? 'active' : ''}`}
                    onClick={() => setSelectedSession(session.id)}
                  >
                    <div className="session-info">
                      <strong>{session.opponent}</strong>
                      {session.week && <span className="tag">{session.week}</span>}
                    </div>
                    <p className="text-muted">{session.description || 'No description'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="panel">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              Loading scouting data...
            </div>
          ) : plays.length === 0 ? (
            <div className="empty-state">
              <Upload size={32} />
              <h3>No plays in this session</h3>
              <p>Upload a CSV or create plays manually to begin analysis.</p>
              <button className="btn btn-primary" onClick={() => setView('upload')}>
                <Upload size={16} />
                Upload Plays
              </button>
            </div>
          ) : (
            <>
              <div className="session-header">
                <div>
                  <h2>{activeSession?.opponent || 'Scouting Session'}</h2>
                  {activeSession?.description && <p>{activeSession.description}</p>}
                </div>
                <span className="snap-badge">{plays.length} plays recorded</span>
              </div>
              <ScoutingAnalytics plays={plays} />
            </>
          )}
        </div>
      )}

      <style jsx>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .page-header h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
        }

        .page-header p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .alert-error {
          background: #FFEBEE;
          border-left: 4px solid #D32F2F;
          color: #C62828;
        }

        .panel {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .panel h2 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: #666;
        }

        .input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 13px;
          font-family: inherit;
          box-sizing: border-box;
        }

        .input:focus {
          outline: none;
          border-color: #4169E1;
          box-shadow: 0 0 0 2px rgba(65, 105, 225, 0.1);
        }

        .input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .session-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .session-item {
          padding: 12px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .session-item:hover {
          border-color: #4169E1;
          background: #f9f9ff;
        }

        .session-item.active {
          background: #f0f4ff;
          border-color: #4169E1;
        }

        .session-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .session-info strong {
          font-size: 13px;
        }

        .tag {
          background: #f0f4ff;
          color: #4169E1;
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
        }

        .text-muted {
          color: #999;
          font-size: 12px;
        }

        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: #666;
        }

        .spinner {
          width: 30px;
          height: 30px;
          border: 3px solid #f0f0f0;
          border-top: 3px solid #4169E1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #666;
        }

        .empty-state h3 {
          margin: 12px 0 6px 0;
          font-size: 16px;
        }

        .empty-state p {
          margin: 0 0 20px 0;
          font-size: 13px;
          color: #999;
        }

        .session-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e0e0e0;
        }

        .session-header h2 {
          margin: 0 0 4px 0;
          font-size: 20px;
        }

        .session-header p {
          margin: 0;
          font-size: 13px;
          color: #666;
        }

        .snap-badge {
          background: #f0f4ff;
          color: #4169E1;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .grid {
          display: grid;
          gap: 20px;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: 12px;
          }

          .header-actions {
            width: 100%;
            flex-direction: column;
          }

          .header-actions button {
            width: 100%;
          }

          .grid {
            grid-template-columns: 1fr !important;
          }

          .session-header {
            flex-direction: column;
            gap: 12px;
          }

          .snap-badge {
            width: fit-content;
          }
        }
      `}</style>
    </div>
  );
};

export default ScoutingPage;
