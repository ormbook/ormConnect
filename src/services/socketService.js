import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connected = false;
  }

  connect() {
    if (this.socket) return;

    // Connect to current origin or fallback to localhost:3000
    const serverUrl = window.location.origin.includes('5173') 
      ? 'http://localhost:3000' 
      : window.location.origin;

    this.socket = io(serverUrl, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log(`[SocketService] Connected with ID: ${this.socket.id}`);
      this.connected = true;
      this.trigger('status-change', { connected: true });
    });

    this.socket.on('disconnect', () => {
      console.log('[SocketService] Disconnected');
      this.connected = false;
      this.trigger('status-change', { connected: false });
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[SocketService] Connection error:', err.message);
      this.trigger('status-change', { connected: false, error: err.message });
    });

    // Register forwarding for all socket events
    const events = [
      'host:session-created',
      'host:viewer-joined',
      'viewer:require-passcode',
      'viewer:connect-success',
      'viewer:connect-error',
      'rtc:offer',
      'rtc:answer',
      'rtc:candidate',
      'chat:message',
      'file:transfer-request',
      'file:transfer-accept',
      'file:transfer-decline',
      'session:ended'
    ];

    events.forEach(eventName => {
      this.socket.on(eventName, (data) => {
        this.trigger(eventName, data);
      });
    });
  }

  emit(eventName, data) {
    if (this.socket) {
      this.socket.emit(eventName, data);
    }
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
  }

  trigger(eventName, data) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName).forEach(cb => cb(data));
    }
  }
}

export const socketService = new SocketService();
