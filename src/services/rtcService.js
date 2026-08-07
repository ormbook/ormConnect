import { socketService } from './socketService.js';

class RTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.dataChannel = null;
    this.sessionCode = null;
    this.isHost = false;
    this._signalListenersAttached = false;

    this.listeners = new Map();

    // Standard STUN servers configuration
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };
  }

  initWebRTC(sessionCode, isHost) {
    // Close any existing peer connection first (clean slate)
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
      this.dataChannel = null;
      this.remoteStream = null;
    }

    this.sessionCode = sessionCode;
    this.isHost = isHost;

    this.peerConnection = new RTCPeerConnection(this.rtcConfig);

    // ICE Candidates forwarding
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('rtc:candidate', {
          sessionCode: this.sessionCode,
          candidate: event.candidate
        });
      }
    };

    // Receive Remote Stream (Viewer side)
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Received remote stream track:', event.track.kind);
      this.remoteStream = event.streams[0];
      this.trigger('remote-stream', this.remoteStream);
    };

    // If Host, create DataChannel for input events
    if (this.isHost) {
      this.dataChannel = this.peerConnection.createDataChannel('inputChannel');
      this.setupDataChannel(this.dataChannel);
    } else {
      // Viewer receives DataChannel created by Host
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };
    }

    // Attach socket signaling listeners ONCE
    if (!this._signalListenersAttached) {
      this._signalListenersAttached = true;
      this._attachSignalListeners();
    }

    console.log(`[WebRTC] Initialized as ${isHost ? 'HOST' : 'VIEWER'} for session ${sessionCode}`);
  }

  _attachSignalListeners() {
    socketService.on('rtc:offer', async ({ offer }) => {
      if (!this.isHost && this.peerConnection) {
        console.log('[WebRTC] Received offer, creating answer...');
        try {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          socketService.emit('rtc:answer', {
            sessionCode: this.sessionCode,
            answer
          });
        } catch (err) {
          console.error('[WebRTC] Error processing offer:', err);
        }
      }
    });

    socketService.on('rtc:answer', async ({ answer }) => {
      if (this.isHost && this.peerConnection) {
        console.log('[WebRTC] Received answer, setting remote description...');
        try {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('[WebRTC] Error setting answer:', err);
        }
      }
    });

    socketService.on('rtc:candidate', async ({ candidate }) => {
      if (this.peerConnection && this.peerConnection.remoteDescription) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] Add ICE candidate error:', err);
        }
      }
    });
  }

  // Host starts sharing display screen (with fallback canvas stream)
  async startScreenShare() {
    try {
      if (!this.localStream || !this.localStream.active) {
        // Detect iOS / iPhone / iPad Safari
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        const constraints = isIOS ? {
          video: true,
          audio: false
        } : {
          video: {
            cursor: 'always',
            frameRate: { ideal: 30, max: 60 }
          },
          audio: false
        };

        console.log('[WebRTC] Requesting getDisplayMedia...');
        this.localStream = await navigator.mediaDevices.getDisplayMedia(constraints);

        // Auto-stop sharing when user stops via browser UI
        this.localStream.getTracks().forEach(track => {
          track.onended = () => {
            console.log('[WebRTC] Screen share ended by user');
            this.trigger('screen-share-ended');
          };
        });
      } else {
        console.log('[WebRTC] Reusing existing local stream for new peer connection');
      }
    } catch (err) {
      console.warn('[WebRTC] getDisplayMedia cancelled or unsupported. Generating fallback stream:', err);
      this.localStream = this.createFallbackCanvasStream();
    }

    // Add tracks to new PeerConnection
    if (this.peerConnection && this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Create and send offer to Viewer
      try {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        socketService.emit('rtc:offer', {
          sessionCode: this.sessionCode,
          offer
        });
        console.log('[WebRTC] Offer sent to viewer');
      } catch (err) {
        console.error('[WebRTC] Error creating offer:', err);
      }
    }

    return this.localStream;
  }

  // Generates an interactive fallback canvas stream (60 FPS) 
  createFallbackCanvasStream() {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    let frame = 0;

    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;
    let isMouseDown = false;
    let lastKey = '';
    let lastKeyTimer = null;

    // Listen to input events to make the simulation interactive
    this.on('input-event', (data) => {
      if (data.type === 'mousemove') {
        mouseX = data.payload.xRatio * canvas.width;
        mouseY = data.payload.yRatio * canvas.height;
      } else if (data.type === 'mousedown') {
        isMouseDown = true;
      } else if (data.type === 'mouseup') {
        isMouseDown = false;
      } else if (data.type === 'keydown') {
        lastKey = data.payload.key;
        clearTimeout(lastKeyTimer);
        lastKeyTimer = setTimeout(() => { lastKey = ''; }, 2000);
      } else if (data.type === 'shortcut') {
        lastKey = data.payload.combo;
        clearTimeout(lastKeyTimer);
        lastKeyTimer = setTimeout(() => { lastKey = ''; }, 2000);
      }
    });

    const draw = () => {
      if (!this.localStream || !this.localStream.active) return;
      frame++;

      // Background
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#070a12');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Header
      ctx.fillStyle = 'rgba(0, 240, 255, 0.06)';
      ctx.fillRect(0, 0, canvas.width, 56);
      ctx.fillStyle = '#00f0ff';
      ctx.font = '700 20px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('ormConnect Remote Desktop — Simulation Mode', 24, 36);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '13px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`Session: ${this.sessionCode}  |  Input: ${isMouseDown ? 'CLICK' : 'Move'}`, canvas.width - 24, 36);

      // Notepad window
      ctx.fillStyle = '#1e293b';
      ctx.roundRect(60, 80, 520, 340, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(60, 80, 520, 38);
      ctx.fillStyle = '#00f0ff';
      ctx.font = '600 13px Outfit, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('📝 Notepad — RemoteText.txt', 80, 104);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(68, 126, 504, 286);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px monospace';
      ctx.fillText('ormConnect P2P DataChannel Active', 80, 158);
      ctx.fillStyle = '#4ade80';
      ctx.fillText('Mouse & Keyboard events are received in real-time.', 80, 182);
      if (lastKey) {
        ctx.fillStyle = '#fde047';
        ctx.fillText(`Key Pressed: [${lastKey}]`, 80, 210);
      }

      // Terminal window
      ctx.fillStyle = '#090d16';
      ctx.roundRect(620, 100, 600, 300, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)'; ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(620, 100, 600, 38);
      ctx.fillStyle = '#10b981';
      ctx.font = '600 13px Outfit, sans-serif';
      ctx.fillText(`💻 Terminal — Remote Session ${this.sessionCode}`, 640, 124);
      ctx.fillStyle = '#4ade80';
      ctx.font = '13px monospace';
      ctx.fillText('C:\\ormConnect> agent status', 640, 166);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('[OK] DataChannel Latency: <10ms', 640, 190);
      ctx.fillText('[OK] WebRTC P2P Stream: 60 FPS Active', 640, 214);
      ctx.fillStyle = '#fff';
      ctx.fillText(`C:\\ormConnect> ${(frame % 60 < 30) ? '_' : ''}`, 640, 252);

      // Taskbar
      ctx.fillStyle = 'rgba(15, 23, 42, 0.97)';
      ctx.fillRect(0, canvas.height - 48, canvas.width, 48);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath(); ctx.moveTo(0, canvas.height - 48); ctx.lineTo(canvas.width, canvas.height - 48); ctx.stroke();
      ctx.fillStyle = '#00f0ff';
      ctx.font = '700 14px Outfit, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('❖ Start', 20, canvas.height - 18);
      ctx.fillStyle = '#64748b';
      const now = new Date();
      ctx.fillText(`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')} — ormConnect`, canvas.width - 280, canvas.height - 18);

      // Interactive Cursor
      ctx.fillStyle = isMouseDown ? 'rgba(0, 240, 255, 0.95)' : 'rgba(255, 50, 50, 0.85)';
      ctx.beginPath(); ctx.arc(mouseX, mouseY, isMouseDown ? 10 : 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = isMouseDown ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 50, 50, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mouseX, mouseY, 16 + (frame % 20), 0, Math.PI * 2); ctx.stroke();

      requestAnimationFrame(draw);
    };

    draw();

    return canvas.captureStream(60);
  }

  setupDataChannel(channel) {
    channel.onopen = () => {
      console.log('[WebRTC DataChannel] Channel OPEN — input control ready!');
      this.trigger('channel-ready');
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.trigger('input-event', data);
      } catch (err) {
        console.warn('[DataChannel] Invalid JSON message:', event.data);
      }
    };

    channel.onclose = () => {
      console.log('[WebRTC DataChannel] Channel CLOSED');
    };
  }

  // Viewer sends Mouse/Keyboard input event to Host via DataChannel
  sendInputEvent(type, payload) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('[DataChannel] Cannot send — channel not open. State:', this.dataChannel?.readyState);
    }
  }

  close() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
    this.dataChannel = null;
    console.log('[WebRTC] Connection closed and cleaned up');
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const list = this.listeners.get(event).filter(cb => cb !== callback);
    this.listeners.set(event, list);
  }

  trigger(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }
}

export const rtcService = new RTCService();
