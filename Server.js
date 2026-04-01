// ============================================
// SPY ESCAPE ROOM - BACKEND SERVER
// ============================================
// 
// SETUP:
// 1. npm install express ws cors
// 2. node server.js
// 3. Connect from multiple devices to http://localhost:3000 (or your IP)
//
// ============================================

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// ============ GAME STATE ============
let gameState = {
  teams: [],
  gameCode: '',
  gameActive: false,
  startTime: null,
  teamPenalties: {},
  hints: {},
};

// ============ WEBSOCKET BROADCAST ============
function broadcastGameState() {
  const message = JSON.stringify({ type: 'gameState', payload: gameState });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ============ WEBSOCKET HANDLERS ============
wss.on('connection', (ws) => {
  console.log('Client connected. Total clients:', wss.clients.size);
  
  // Send current state to new client
  ws.send(JSON.stringify({ type: 'gameState', payload: gameState }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'addTeam':
          const newTeam = { id: Date.now().toString(), name: message.teamName };
          gameState.teams.push(newTeam);
          gameState.hints[newTeam.id] = 0;
          gameState.teamPenalties[newTeam.id] = 0;
          broadcastGameState();
          break;

        case 'removeTeam':
          gameState.teams = gameState.teams.filter(t => t.id !== message.teamId);
          delete gameState.hints[message.teamId];
          delete gameState.teamPenalties[message.teamId];
          broadcastGameState();
          break;

        case 'setGameCode':
          gameState.gameCode = message.code;
          broadcastGameState();
          break;

        case 'startGame':
          gameState.gameActive = true;
          gameState.startTime = Date.now();
          gameState.teamPenalties = {};
          gameState.hints = {};
          gameState.teams.forEach(team => {
            gameState.hints[team.id] = 0;
            gameState.teamPenalties[team.id] = 0;
          });
          broadcastGameState();
          break;

        case 'stopGame':
          gameState.gameActive = false;
          gameState.teams = [];
          gameState.gameCode = '';
          gameState.teamPenalties = {};
          gameState.hints = {};
          broadcastGameState();
          break;

        case 'submitCode':
          if (message.code === gameState.gameCode) {
            ws.send(JSON.stringify({ type: 'codeCorrect' }));
          } else {
            gameState.teamPenalties[message.teamId] = 
              (gameState.teamPenalties[message.teamId] || 0) + 20;
            broadcastGameState();
            ws.send(JSON.stringify({ type: 'codeIncorrect' }));
          }
          break;

        case 'applyHint':
          gameState.hints[message.teamId] = (gameState.hints[message.teamId] || 0) + 1;
          gameState.teamPenalties[message.teamId] = 
            (gameState.teamPenalties[message.teamId] || 0) + 60;
          broadcastGameState();
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected. Total clients:', wss.clients.size);
  });
});

// ============ REST API ENDPOINTS ============

// Get current game state
app.get('/api/gamestate', (req, res) => {
  res.json(gameState);
});

// Reset game
app.post('/api/reset', (req, res) => {
  gameState = {
    teams: [],
    gameCode: '',
    gameActive: false,
    startTime: null,
    teamPenalties: {},
    hints: {},
  };
  broadcastGameState();
  res.json({ success: true });
});

// Export results as JSON
app.get('/api/results', (req, res) => {
  const results = gameState.teams.map(team => ({
    teamName: team.name,
    completed: gameState.teamPenalties[team.id] !== undefined,
    hintsUsed: gameState.hints[team.id] || 0,
    timeInSeconds: Math.floor((gameState.teamPenalties[team.id] || 0))
  }));
  res.json(results);
});

// Export to CSV format
app.get('/api/export-csv', (req, res) => {
  let csv = 'Team Name,Hints Used,Penalty Time (seconds)\n';
  gameState.teams.forEach(team => {
    const hintsUsed = gameState.hints[team.id] || 0;
    const penalty = gameState.teamPenalties[team.id] || 0;
    csv += `"${team.name}",${hintsUsed},${penalty}\n`;
  });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="escape-room-results.csv"');
  res.send(csv);
});

// ============ SERVER STARTUP ============
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   SPY ESCAPE ROOM - OPERATIONS SERVER                      ║
║   Server running on http://0.0.0.0:${PORT}                         ║
║   WebSocket: ws://0.0.0.0:${PORT}                            ║
║                                                            ║
║   For multi-device sync:                                 ║
║   - Get your computer's IP: ipconfig (Windows)           ║
║                             or ifconfig (Mac/Linux)      ║
║   - Connect from other devices to:                       ║
║     http://<YOUR_IP>:${PORT}                                ║
╚════════════════════════════════════════════════════════════╝
  `);
});
