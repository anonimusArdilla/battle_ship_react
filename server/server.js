import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3001;

// Map of session IDs to player connections
const sessions = new Map();

// Generate random session ID
function generateSessionId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  let sessionId = null;
  let playerRole = null; // 'host' or 'guest'

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      // CREATE SESSION - host creates and waits
      if (message.type === 'createSession') {
        sessionId = generateSessionId();
        playerRole = 'host';
        
        if (!sessions.has(sessionId)) {
          sessions.set(sessionId, { host: ws, guest: null });
        }

        ws.send(JSON.stringify({
          type: 'sessionCreated',
          sessionId,
          role: 'host',
        }));
        console.log(`[${sessionId}] Host connected`);
      }

      // JOIN SESSION - guest joins host
      if (message.type === 'joinSession') {
        sessionId = message.sessionId.toUpperCase();
        playerRole = 'guest';

        if (!sessions.has(sessionId)) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Session not found',
          }));
          return;
        }

        const session = sessions.get(sessionId);
        if (session.guest !== null) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Session is full',
          }));
          return;
        }

        session.guest = ws;
        
        // Notify both players they're connected
        session.host.send(JSON.stringify({
          type: 'sessionReady',
          role: 'host',
          opponent: 'connected',
        }));

        ws.send(JSON.stringify({
          type: 'sessionReady',
          role: 'guest',
          opponent: 'connected',
        }));

        console.log(`[${sessionId}] Guest connected - session ready`);
      }

      // Relay game messages
      if (message.type === 'ready' || message.type === 'attack' || 
          message.type === 'attackResult' || message.type === 'start') {
        if (!sessionId || !sessions.has(sessionId)) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not in session' }));
          return;
        }

        const session = sessions.get(sessionId);
        const opponent = playerRole === 'host' ? session.guest : session.host;

        if (opponent && opponent.readyState === 1) { // WebSocket.OPEN
          opponent.send(JSON.stringify(message));
        }
      }
    } catch (err) {
      console.error('Message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      
      // Notify opponent
      const opponent = playerRole === 'host' ? session.guest : session.host;
      if (opponent && opponent.readyState === 1) {
        opponent.send(JSON.stringify({
          type: 'opponentDisconnected',
        }));
      }

      // Clean up session
      if (playerRole === 'host') {
        session.host = null;
      } else {
        session.guest = null;
      }

      if (session.host === null && session.guest === null) {
        sessions.delete(sessionId);
        console.log(`[${sessionId}] Session closed`);
      }
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

console.log(`🚢 Battleship server listening on ws://localhost:${PORT}`);
