/**
 * WebSocket Service
 * Provides low-latency, real-time bi-directional streaming between the backend,
 * the dashboard web clients, and IoT devices.
 */
const { WebSocketServer, WebSocket } = require('ws');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  init(server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      this.clients.add(ws);
      const clientIp = req.socket.remoteAddress;
      // console.log(`[WebSocket] Client connected: ${clientIp} (Total clients: ${this.clients.size})`);

      // Send initial connection acknowledgement
      ws.send(JSON.stringify({
        event: 'connected',
        timestamp: new Date().toISOString(),
        message: 'Connected to Real-Time IoT Telemetry Stream'
      }));

      ws.on('message', (message) => {
        try {
          const parsed = JSON.parse(message);
          // Handle dashboard ping/pong or client requests
          if (parsed.event === 'ping') {
            ws.send(JSON.stringify({ event: 'pong', timestamp: Date.now() }));
          }
        } catch (err) {
          // ignore malformed client frames
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        // console.log(`[WebSocket] Client disconnected (Total clients: ${this.clients.size})`);
      });

      ws.on('error', (err) => {
        console.error('[WebSocket] Socket error:', err.message);
        this.clients.delete(ws);
      });
    });

    // Heartbeat keep-alive every 30s to clean up dead sockets
    setInterval(() => {
      this.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          this.clients.delete(ws);
        }
      });
    }, 30000);

    console.log('[WebSocket] Server initialized on /ws');
  }

  /**
   * Broadcast an event to all connected dashboard frontends
   * @param {string} event - Event name (e.g. 'sensor_reading', 'alert_triggered')
   * @param {object} data - Payload data
   */
  broadcast(event, data) {
    if (!this.wss) return;

    const payload = JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  getClientCount() {
    return this.clients.size;
  }
}

const wsService = new WebSocketService();
module.exports = wsService;

