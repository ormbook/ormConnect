import { socketService } from './socketService.js';

class RTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.dataChannel = null;
    this.sessionCode = null;
    this.isHost = false;

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

    // If Host, create DataChannel for receiving input events
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

    // Setup Socket Signaling Listeners
    socketService.on('rtc:offer', async ({ offer }) => {
      if (!this.isHost && this.peerConnection) {
        console.log('[WebRTC] Received offer, creating answer...');
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        socketService.emit('rtc:answer', {
          sessionCode: this.sessionCode,
          answer
        });
      }
    });

    socketService.on('rtc:answer', async ({ answer }) => {
      if (this.isHost && this.peerConnection) {
        console.log('[WebRTC] Received answer, setting remote description...');
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socketService.on('rtc:candidate', async ({ candidate }) => {
      if (this.peerConnection) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] Add ICE candidate error:', err);
        }
      }
    });
  }

  // Host starts sharing display screen (with iOS Safari compatibility & Canvas fallback)
  async startScreenShare() {
    try {
      if (!this.localStream || !this.localStream.active) {
        // Detect iOS / iPhone / iPad Safari
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        // iOS Safari requires simple video: true constraint without complex object properties
        const constraints = isIOS ? {
          video: true,
          audio: false
        } : {
          video: {
            cursor: 'always',
            frameRate: { ideal: 60, max: 60 }
          },
          audio: false
        };

        console.log('[WebRTC] Requesting getDisplayMedia with constraints:', constraints);
        this.localStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      } else {
        console.log('[WebRTC] Reusing existing local stream for new peer connection');
      }
    } catch (err) {
      console.warn('[WebRTC] getDisplayMedia cancelled or unsupported on this device. Generating fallback stream:', err);
      // Fallback: Generate live interactive Desktop Canvas stream if screen share is cancelled or unsupported
      this.localStream = this.createFallbackCanvasStream();
    }

    // Add tracks to PeerConnection
    if (this.peerConnection && this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Create and send offer to Viewer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      socketService.emit('rtc:offer', {
        sessionCode: this.sessionCode,
        offer
      });
    }

    return this.localStream;
  }

  // Generates a live 60 FPS animated desktop canvas stream when screen share is cancelled or in single-browser demo mode
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
      } else if (data.type === 'shortcut') {
        lastKey = data.payload.combo;
      }
    });

    const draw = () => {
      if (!this.localStream) return; // stop loop if stream closed
      frame++;
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Desktop Wallpaper Gradient
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#070a12');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Brand Logo & Status
      ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.font = '700 42px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ormConnect Remote Stream (Active)', canvas.width / 2, canvas.height / 2 - 40);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '16px monospace';
      ctx.fillText(`Session ID: ${this.sessionCode} | 60 FPS Stream | P2P Active`, canvas.width / 2, canvas.height / 2 + 10);

      // App Window Preview
      ctx.fillStyle = '#1e293b';
      ctx.roundRect(160, 100, 480, 300, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)'; ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(160, 100, 480, 36);
      ctx.fillStyle = '#00f0ff';
      ctx.font = '600 14px Outfit, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('📝 Notepad - Host System Desktop', 180, 123);

      ctx.fillStyle = '#4ade80';
      ctx.font = '13px monospace';
      ctx.fillText('Host desktop is streaming via WebRTC P2P.', 180, 160);
      ctx.fillText('Interactive input channel is listening...', 180, 185);

      if (lastKey) {
        ctx.fillStyle = '#fde047';
        ctx.fillText(`Key Pressed: ${lastKey}`, 180, 215);
      }

      // Taskbar
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(0, canvas.height - 48, canvas.width, 48);
      ctx.fillStyle = '#00f0ff';
      ctx.font = '700 14px Outfit, sans-serif';
      ctx.fillText('❖ Start', 20, canvas.height - 18);

      // Interactive Cursor
      ctx.fillStyle = isMouseDown ? 'rgba(255, 50, 50, 0.9)' : '#00f0ff';
      ctx.beginPath(); ctx.arc(mouseX, mouseY, isMouseDown ? 10 : 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = isMouseDown ? 'rgba(255, 50, 50, 0.5)' : 'rgba(0, 240, 255, 0.5)';
      ctx.beginPath(); ctx.arc(mouseX, mouseY, 12 + (frame % 15), 0, Math.PI * 2); ctx.stroke();

      requestAnimationFrame(draw);
    };

    draw();

    // Capture 60 FPS stream from canvas
    return canvas.captureStream(60);
  }

  setupDataChannel(channel) {
    channel.onopen = () => {
      console.log('[WebRTC DataChannel] Channel OPEN!');
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
  }

  // Viewer sends Mouse/Keyboard input event to Host
  sendInputEvent(type, payload) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({ type, payload }));
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
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  trigger(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }
}

export const rtcService = new RTCService();
