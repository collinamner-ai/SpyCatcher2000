import React, { useState, useEffect, useRef } from 'react';
import { Lock, Clock, AlertCircle, CheckCircle, LogOut, Plus, Trash2, Send, Gift } from 'lucide-react';

const SpyEscapeRoomApp = () => {
  const [gameState, setGameState] = useState({
    teams: [],
    gameCode: '',
    gameActive: false,
    startTime: null,
    elapsedTime: 0,
    hints: {},
  });

  const [userMode, setUserMode] = useState('select'); // select | admin | game | victory
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  const [teamPenalties, setTeamPenalties] = useState({});
  const [adminTeams, setAdminTeams] = useState([]);
  const [adminCode, setAdminCode] = useState('');
  const [newTeamName, setNewTeamName] = useState('');

  // WebSocket for multi-device sync (simulate with state sharing)
  const wsRef = useRef(null);

  // Main game timer
  useEffect(() => {
    if (!gameState.gameActive || userMode !== 'game') return;

    const interval = setInterval(() => {
      const now = Date.now();
      const baseElapsed = now - gameState.startTime;
      const totalPenalty = (teamPenalties[selectedTeam] || 0) * 1000;
      setGameState(prev => ({
        ...prev,
        elapsedTime: baseElapsed + totalPenalty
      }));
    }, 10);

    return () => clearInterval(interval);
  }, [gameState.gameActive, userMode, selectedTeam, teamPenalties]);

  // Lockout timer
  useEffect(() => {
    if (lockTimeRemaining <= 0) {
      setIsLocked(false);
      return;
    }

    const interval = setInterval(() => {
      setLockTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [lockTimeRemaining]);

  // Format time display
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const ms_display = Math.floor((ms % 1000) / 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms_display.toString().padStart(2, '0')}`;
  };

  // Handle code submission
  const handleCodeSubmit = () => {
    if (isLocked) return;

    if (codeInput === gameState.gameCode) {
      // Correct code!
      setUserMode('victory');
    } else {
      // Wrong code
      const newWrongAttempts = wrongAttempts + 1;
      setWrongAttempts(newWrongAttempts);

      // Add 20 second penalty
      setTeamPenalties(prev => ({
        ...prev,
        [selectedTeam]: (prev[selectedTeam] || 0) + 20
      }));

      setCodeInput('');

      if (newWrongAttempts >= 2) {
        // Lock for 10 seconds
        setIsLocked(true);
        setLockTimeRemaining(10);
        setWrongAttempts(0);
      }
    }
  };

  // Admin: Add team
  const handleAddTeam = () => {
    if (newTeamName.trim()) {
      const newTeamId = Date.now().toString();
      setAdminTeams(prev => [...prev, { id: newTeamId, name: newTeamName }]);
      setGameState(prev => ({
        ...prev,
        teams: [...prev.teams, { id: newTeamId, name: newTeamName }],
        hints: { ...prev.hints, [newTeamId]: 0 }
      }));
      setNewTeamName('');
    }
  };

  // Admin: Remove team
  const handleRemoveTeam = (teamId) => {
    setAdminTeams(prev => prev.filter(t => t.id !== teamId));
    setGameState(prev => ({
      ...prev,
      teams: prev.teams.filter(t => t.id !== teamId)
    }));
  };

  // Admin: Start game
  const handleStartGame = () => {
    if (adminCode.trim() && adminTeams.length > 0) {
      setGameState(prev => ({
        ...prev,
        gameCode: adminCode,
        gameActive: true,
        startTime: Date.now()
      }));
      setTeamPenalties({});
      setUserMode('select');
    }
  };

  // Admin: Apply hint
  const handleApplyHint = (teamId) => {
    setGameState(prev => ({
      ...prev,
      hints: { ...prev.hints, [teamId]: (prev.hints[teamId] || 0) + 1 }
    }));
    setTeamPenalties(prev => ({
      ...prev,
      [teamId]: (prev[teamId] || 0) + 60
    }));
  };

  // Admin: Stop game
  const handleStopGame = () => {
    setGameState(prev => ({ ...prev, gameActive: false }));
    setAdminTeams([]);
    setAdminCode('');
    setTeamPenalties({});
  };

  // Mission complete - reset
  const handleMissionComplete = () => {
    setUserMode('select');
    setSelectedTeam(null);
    setCodeInput('');
    setWrongAttempts(0);
    setIsLocked(false);
  };

  // ============ RENDER PAGES ============

  if (userMode === 'admin') {
    return (
      <div className="min-h-screen bg-black text-white p-8" style={{ fontFamily: "'Courier New', monospace" }}>
        {/* Admin Header */}
        <div className="mb-12">
          <div className="text-red-600 text-sm tracking-widest mb-2">⚠ CLASSIFIED OPERATIONS CENTER</div>
          <h1 className="text-5xl font-bold text-white mb-2" style={{ textShadow: '0 0 20px rgba(239, 68, 68, 0.5)' }}>
            ADMIN TERMINAL
          </h1>
          <div className="h-px bg-red-600 w-48 mb-6"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Setup Panel */}
          <div className="lg:col-span-2 bg-zinc-900 border border-red-600 p-8">
            <h2 className="text-2xl font-bold text-red-500 mb-6 tracking-wider">MISSION BRIEFING</h2>

            {!gameState.gameActive ? (
              <>
                {/* Add Teams */}
                <div className="mb-8">
                  <label className="text-sm text-red-400 tracking-wider block mb-3">ADD TEAM OPERATIVES</label>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTeam()}
                      placeholder="Team name..."
                      className="flex-1 bg-black border border-red-600 text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      onClick={handleAddTeam}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 font-bold flex items-center gap-2 transition"
                    >
                      <Plus size={18} /> ADD
                    </button>
                  </div>

                  {/* Teams List */}
                  <div className="space-y-2 mb-6 max-h-40 overflow-y-auto">
                    {adminTeams.map(team => (
                      <div key={team.id} className="flex justify-between items-center bg-black border border-red-600 p-3">
                        <span className="text-red-400">{team.name}</span>
                        <button
                          onClick={() => handleRemoveTeam(team.id)}
                          className="text-red-500 hover:text-red-400 transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Set Code */}
                <div className="mb-8">
                  <label className="text-sm text-red-400 tracking-wider block mb-3">MISSION CODE (4 DIGITS)</label>
                  <input
                    type="text"
                    maxLength="4"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="0000"
                    className="w-full bg-black border border-red-600 text-white px-4 py-3 text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Start Game Button */}
                <button
                  onClick={handleStartGame}
                  disabled={adminTeams.length === 0 || adminCode.length < 4}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:opacity-50 text-white font-bold py-4 text-xl transition"
                  style={{ textShadow: '0 0 10px rgba(0, 0, 0, 0.5)' }}
                >
                  INITIATE MISSION
                </button>
              </>
            ) : (
              <div className="space-y-6">
                <div className="bg-black border border-green-600 p-6">
                  <div className="text-green-600 text-sm tracking-wider mb-2">STATUS: ACTIVE</div>
                  <div className="text-white text-3xl font-bold">
                    {formatTime(gameState.elapsedTime)}
                  </div>
                </div>
                <button
                  onClick={handleStopGame}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 text-lg transition"
                >
                  END MISSION
                </button>
              </div>
            )}
          </div>

          {/* Control Panel */}
          {gameState.gameActive && (
            <div className="bg-zinc-900 border border-red-600 p-8">
              <h2 className="text-2xl font-bold text-red-500 mb-6 tracking-wider">TEAM STATUS</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {gameState.teams.map(team => (
                  <div key={team.id} className="bg-black border border-red-600 p-4">
                    <div className="text-red-400 font-bold mb-2">{team.name}</div>
                    <div className="text-white text-sm mb-3">
                      Time: <span className="font-mono">{formatTime(gameState.elapsedTime + (teamPenalties[team.id] || 0) * 1000)}</span>
                    </div>
                    <div className="text-yellow-600 text-xs mb-3">Hints Used: {gameState.hints[team.id] || 0}/3</div>
                    <button
                      onClick={() => handleApplyHint(team.id)}
                      disabled={(gameState.hints[team.id] || 0) >= 3}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-900 disabled:opacity-50 text-black font-bold py-2 text-sm flex items-center justify-center gap-2 transition"
                    >
                      <Gift size={14} /> GRANT HINT
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Back Button */}
        <button
          onClick={() => setUserMode('select')}
          className="text-red-600 hover:text-red-400 font-bold flex items-center gap-2 transition"
        >
          <LogOut size={18} /> EXIT ADMIN
        </button>
      </div>
    );
  }

  if (userMode === 'game') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4" style={{ fontFamily: "'Courier New', monospace" }}>
        {/* Mission Status */}
        <div className="text-center mb-12">
          <div className="text-red-600 text-sm tracking-widest mb-2">OPERATION IN PROGRESS</div>
          <div className="text-red-600 text-xl font-bold mb-8">{selectedTeam}</div>
        </div>

        {/* Main Clock */}
        <div className="mb-12">
          <div
            className="text-9xl font-mono font-bold text-center"
            style={{
              color: '#ef4444',
              textShadow: '0 0 40px rgba(239, 68, 68, 0.8), 0 0 80px rgba(239, 68, 68, 0.4)',
              letterSpacing: '0.1em'
            }}
          >
            {formatTime(gameState.elapsedTime + (teamPenalties[selectedTeam] || 0) * 1000)}
          </div>
          <div className="h-1 bg-red-600 mt-8 w-64 mx-auto"></div>
        </div>

        {/* Code Input */}
        <div className="w-full max-w-md mb-8">
          <label className="text-red-400 text-sm tracking-wider block mb-4">ENTER MISSION CODE</label>
          <input
            type="password"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            onKeyPress={(e) => e.key === 'Enter' && !isLocked && handleCodeSubmit()}
            disabled={isLocked}
            maxLength="4"
            placeholder="••••"
            className="w-full bg-black border-2 border-red-600 text-white text-center text-4xl font-mono tracking-widest py-4 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
          />
        </div>

        {/* Lockout Display */}
        {isLocked && (
          <div className="w-full max-w-md mb-8">
            <div className="bg-red-600 text-black font-bold text-center py-3 mb-4">
              LOCKED - {lockTimeRemaining}s
            </div>
            <div className="h-1 bg-red-600 relative overflow-hidden">
              <div
                className="h-full bg-black transition-all"
                style={{ width: `${(lockTimeRemaining / 10) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Wrong Attempts Display */}
        {wrongAttempts > 0 && !isLocked && (
          <div className="text-center mb-8">
            <div className="text-red-500 font-bold">⚠ FAILED ATTEMPTS: {wrongAttempts}/2</div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleCodeSubmit}
          disabled={isLocked || codeInput.length < 4}
          className="bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:opacity-50 text-white font-bold py-4 px-12 text-xl mb-8 transition flex items-center gap-2"
        >
          <Send size={20} /> SUBMIT CODE
        </button>

        {/* Back Button */}
        <button
          onClick={() => {
            setUserMode('select');
            setCodeInput('');
            setWrongAttempts(0);
          }}
          className="text-red-600 hover:text-red-400 font-bold flex items-center gap-2 transition mt-auto"
        >
          <LogOut size={18} /> ABORT MISSION
        </button>
      </div>
    );
  }

  if (userMode === 'victory') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4" style={{ fontFamily: "'Courier New', monospace" }}>
        <div
          className="text-center mb-12"
          style={{
            animation: 'pulse 2s infinite',
            textShadow: '0 0 30px rgba(34, 197, 94, 0.8)'
          }}
        >
          <CheckCircle size={120} className="mx-auto mb-8 text-green-500" style={{ filter: 'drop-shadow(0 0 20px rgba(34, 197, 94, 0.8))' }} />
          <h1 className="text-6xl font-bold text-green-500 mb-4 tracking-widest">MISSION COMPLETE</h1>
          <h2 className="text-4xl font-bold text-green-400 mb-8">ACCESS GRANTED</h2>
        </div>

        <div className="bg-green-900 border-2 border-green-500 p-8 mb-12 text-center max-w-md">
          <div className="text-green-400 text-sm tracking-wider mb-4">COMPLETION TIME</div>
          <div className="text-5xl font-mono font-bold text-green-500 mb-4">
            {formatTime(gameState.elapsedTime + (teamPenalties[selectedTeam] || 0) * 1000)}
          </div>
          <div className="text-green-400 text-sm tracking-wider">SEQUENCE TERMINATED</div>
        </div>

        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-green-400 mb-2">CONGRATULATIONS, AGENTS</h3>
          <p className="text-green-600">Operation successful. Returning to base...</p>
        </div>

        <button
          onClick={handleMissionComplete}
          className="bg-green-600 hover:bg-green-700 text-black font-bold py-4 px-12 text-xl transition"
        >
          CLOSE
        </button>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}</style>
      </div>
    );
  }

  // Team Selection Screen
  return (
    <div className="min-h-screen bg-black text-white p-8" style={{ fontFamily: "'Courier New', monospace" }}>
      {/* Header */}
      <div className="text-center mb-16">
        <div className="text-red-600 text-sm tracking-widest mb-4">FIELD OPERATIONS</div>
        <h1 className="text-6xl font-bold mb-4" style={{ textShadow: '0 0 30px rgba(239, 68, 68, 0.6)' }}>
          MISSION BRIEFING
        </h1>
        <p className="text-red-600 font-mono">Select your team and prepare for deployment</p>
      </div>

      {/* Game Status */}
      {gameState.gameActive ? (
        <div className="text-center mb-12">
          <div className="inline-block bg-green-900 border-2 border-green-500 px-8 py-4">
            <div className="text-green-400 text-sm tracking-widest mb-2">MISSION STATUS</div>
            <div className="text-3xl font-mono font-bold text-green-500">
              {formatTime(gameState.elapsedTime)}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center mb-12">
          <div className="text-red-600 font-bold tracking-wider">AWAITING MISSION START...</div>
        </div>
      )}

      {/* Team Selection Grid */}
      {gameState.gameActive && gameState.teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {gameState.teams.map(team => (
            <button
              key={team.id}
              onClick={() => {
                setSelectedTeam(team.name);
                setUserMode('game');
                setCodeInput('');
                setWrongAttempts(0);
              }}
              className="group relative h-32 bg-black border-2 border-red-600 hover:border-red-400 transition-all duration-300 hover:shadow-lg"
              style={{ boxShadow: 'inset 0 0 20px rgba(239, 68, 68, 0.1)' }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Lock className="mb-3 text-red-600 group-hover:text-red-400 transition" size={32} />
                <div className="text-2xl font-bold text-red-600 group-hover:text-red-400 transition text-center px-4">
                  {team.name}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-red-600">
          No mission active. Contact admin to initiate.
        </div>
      )}

      {/* Admin Access */}
      <div className="text-center mt-16 pt-8 border-t border-red-600">
        <button
          onClick={() => setUserMode('admin')}
          className="text-red-600 hover:text-red-400 font-bold tracking-wider transition text-sm"
        >
          [ADMIN ACCESS]
        </button>
      </div>
    </div>
  );
};

export default SpyEscapeRoomApp;
