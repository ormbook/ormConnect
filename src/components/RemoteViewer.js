import { rtcService } from '../services/rtcService.js';
import { socketService } from '../services/socketService.js';

export class RemoteViewer {
  constructor(overlayId, assistant, onOpenChat, onOpenFile) {
    this.overlay = document.getElementById(overlayId);
    this.assistant = assistant;
    this.onOpenChat = onOpenChat;
    this.onOpenFile = onOpenFile;

    this.sessionCode = null;
    this.permissions = 'full';
    this.inputEnabled = true;

    this.render();
  }

  render() {
    this.overlay.innerHTML = `
      <!-- Top Floating Control Toolbar -->
      <div class="floating-toolbar">
        <div class="toolbar-group">
          <span style="font-weight: 700; color: var(--primary-cyan); font-size: 0.9rem; margin-right: 0.5rem;">
            ormConnect Remote
          </span>
          <span id="remote-session-badge" class="badge badge-emerald">384-912-705</span>
        </div>

        <div class="toolbar-divider"></div>

        <div class="toolbar-group">
          <button id="tool-btn-input" class="tool-btn active" title="เปิด/ปิดการรีโมทควบคุมเมาส์และคีย์บอร์ด">
            <i class="fa-solid fa-mouse-pointer"></i>
          </button>
          <button id="tool-btn-fullscreen" class="tool-btn" title="เต็มจอ (Fullscreen)">
            <i class="fa-solid fa-expand"></i>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- Quick Shortcuts -->
        <div class="toolbar-group">
          <button id="shortcut-ctrl-alt-del" class="tool-btn" title="ส่งคำสั่ง Ctrl+Alt+Del">
            <span style="font-size: 0.75rem; font-weight: 700;">CAD</span>
          </button>
          <button id="shortcut-alt-tab" class="tool-btn" title="ส่งคำสั่ง Alt+Tab">
            <span style="font-size: 0.75rem; font-weight: 700;">TAB</span>
          </button>
          <button id="shortcut-win-key" class="tool-btn" title="ส่งคำสั่ง Windows Key">
            <i class="fa-brands fa-windows"></i>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- Chat & File Drawer Buttons -->
        <div class="toolbar-group">
          <button id="tool-btn-chat" class="tool-btn" title="แชทพูดคุย">
            <i class="fa-solid fa-comment"></i>
          </button>
          <button id="tool-btn-file" class="tool-btn" title="ส่งไฟล์ (File Transfer)">
            <i class="fa-solid fa-folder-open"></i>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- Disconnect Button -->
        <button id="tool-btn-disconnect" class="btn-danger" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">
          <i class="fa-solid fa-phone-slash"></i> ตัดสาย
        </button>
      </div>

      <!-- Remote Video Display Container -->
      <div class="viewer-screen-container" id="remote-screen-wrap">
        <!-- Waiting / Loading Overlay when stream is connecting -->
        <div id="remote-stream-waiting" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: radial-gradient(circle at center, rgba(15, 23, 42, 0.95), #070a12); color: #fff; z-index: 10; text-align: center; padding: 2rem;">
          <div style="position: relative; width: 90px; height: 90px; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: 0; border: 3px solid var(--primary-cyan); border-radius: 50%; animation: pulse-ring 1.8s infinite; opacity: 0.5;"></div>
            <i class="fa-solid fa-signal-stream" style="font-size: 2.5rem; color: var(--primary-cyan);"></i>
          </div>

          <h2 style="font-size: 1.5rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem;">
            กำลังรอการสตรีมหน้าจอจากปลายทาง...
          </h2>
          <p style="font-size: 0.9rem; color: var(--text-muted); max-width: 480px; margin-bottom: 1.5rem; line-height: 1.6;">
            เชื่อมต่อ P2P DataChannel สำเร็จแล้ว! เมื่อเครื่องปลายทางกดอนุญาตแชร์หน้าจอ ภาพจะปรากฏขึ้นบนจอของคุณทันทีค่ะ
          </p>

          <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
            <button id="btn-demo-sim-screen" class="btn-primary" style="width: auto; padding: 0.6rem 1.25rem;">
              <i class="fa-solid fa-gamepad"></i> เปิดโหมดจำลอง OS (Interactive Simulator Screen)
            </button>
          </div>
        </div>

        <video id="remote-video-stream" autoplay playsinline muted class="hidden"></video>
        <!-- Canvas for Fallback / Simulator rendering inside viewer -->
        <canvas id="remote-canvas-fallback" class="hidden" style="max-width: 100%; max-height: 100%; object-fit: contain;"></canvas>
      </div>
    `;

    this.bindEvents();
  }

  openSession(sessionCode, permissions) {
    this.sessionCode = sessionCode;
    this.permissions = permissions;
    this.overlay.classList.remove('hidden');

    document.getElementById('remote-session-badge').innerText = sessionCode;
    const waitingOverlay = document.getElementById('remote-stream-waiting');
    const videoEl = document.getElementById('remote-video-stream');

    if (waitingOverlay) waitingOverlay.classList.remove('hidden');
    if (videoEl) videoEl.classList.add('hidden');

    // Handle Remote Stream from WebRTC
    rtcService.on('remote-stream', (stream) => {
      if (videoEl) {
        videoEl.srcObject = stream;
        videoEl.muted = true;
        videoEl.classList.remove('hidden');
        videoEl.style.display = 'block';
        if (waitingOverlay) waitingOverlay.classList.add('hidden');
        
        videoEl.onloadedmetadata = () => {
          videoEl.play().catch(e => console.warn('Video play warning:', e));
        };
        videoEl.play().catch(e => console.warn('Video play warning:', e));
        console.log('[RemoteViewer] Remote stream video playing!');
      }
    });

    // Listen for decline or disconnect events from socket
    socketService.on('viewer:connection-declined', ({ message }) => {
      this.closeSession();
      this.assistant.speak(message || 'ฝั่ง Host ปฏิเสธคำขอเชื่อมต่อค่ะ');
    });

    socketService.on('session:ended', ({ message }) => {
      if (!this.overlay.classList.contains('hidden')) {
        this.closeSession();
        this.assistant.speak(message || 'การเชื่อมต่อถูกตัดแล้วค่ะ');
      }
    });

    this.assistant.speak('กำลังรอสัญญาณสตรีมหน้าจอจากเครื่องปลายทางค่ะ! หากปลายทางเป็นเครื่องทดสอบ สามารถกดเปิดโหมดจำลอง OS ได้เลยนะคะ');
  }

  bindEvents() {
    const videoEl = document.getElementById('remote-video-stream');
    const screenWrap = document.getElementById('remote-screen-wrap');
    const btnDisconnect = document.getElementById('tool-btn-disconnect');
    const btnFullscreen = document.getElementById('tool-btn-fullscreen');
    const btnInput = document.getElementById('tool-btn-input');
    const btnChat = document.getElementById('tool-btn-chat');
    const btnFile = document.getElementById('tool-btn-file');

    const btnCAD = document.getElementById('shortcut-ctrl-alt-del');
    const btnTab = document.getElementById('shortcut-alt-tab');
    const btnWin = document.getElementById('shortcut-win-key');
    const btnDemoSim = document.getElementById('btn-demo-sim-screen');

    if (btnDemoSim) {
      btnDemoSim.addEventListener('click', () => {
        const waitingOverlay = document.getElementById('remote-stream-waiting');
        const canvas = document.getElementById('remote-canvas-fallback');
        if (waitingOverlay) waitingOverlay.classList.add('hidden');
        if (canvas) {
          canvas.classList.remove('hidden');
          this.startSimulatedCanvasScreen(canvas);
          this.assistant.speak('เปิดโหมดจำลอง OS บน Remote Viewer เรียบร้อยค่ะ! ลองเลื่อนเมาส์และพิมพ์คีย์บอร์ดได้เลยค่ะ');
        }
      });
    }

    // Toggle Input Control
    btnInput.addEventListener('click', () => {
      this.inputEnabled = !this.inputEnabled;
      btnInput.classList.toggle('active', this.inputEnabled);
      const status = this.inputEnabled ? 'เปิดการรีโมทเมาส์แล้วค่ะ' : 'ปิดการรีโมทเมาส์แล้วค่ะ (View Only)';
      this.assistant.speak(status);
    });

    // Fullscreen Toggle
    btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        this.overlay.requestFullscreen().catch(err => console.warn(err));
      } else {
        document.exitFullscreen();
      }
    });

    // Disconnect
    btnDisconnect.addEventListener('click', () => {
      this.closeSession();
    });

    // Chat & File drawers
    btnChat.addEventListener('click', () => {
      if (this.onOpenChat) this.onOpenChat();
    });
    btnFile.addEventListener('click', () => {
      if (this.onOpenFile) this.onOpenFile();
    });

    // Shortcuts
    btnCAD.addEventListener('click', () => {
      rtcService.sendInputEvent('shortcut', { combo: 'CTRL_ALT_DEL' });
      this.assistant.speak('ส่งสัญญาณ Ctrl+Alt+Del ไปยังเครื่องปลายทางเรียบร้อยค่ะ');
    });
    btnTab.addEventListener('click', () => {
      rtcService.sendInputEvent('shortcut', { combo: 'ALT_TAB' });
      this.assistant.speak('ส่งสัญญาณ Alt+Tab เรียบร้อยค่ะ');
    });
    btnWin.addEventListener('click', () => {
      rtcService.sendInputEvent('shortcut', { combo: 'WIN_KEY' });
      this.assistant.speak('ส่งสัญญาณกดปุ่ม Windows Key เรียบร้อยค่ะ');
    });

    // Mouse Movement Listener (Ratio scaled)
    screenWrap.addEventListener('mousemove', (e) => {
      if (!this.inputEnabled || this.permissions === 'view-only') return;

      const rect = videoEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const xRatio = (e.clientX - rect.left) / rect.width;
      const yRatio = (e.clientY - rect.top) / rect.height;

      if (xRatio >= 0 && xRatio <= 1 && yRatio >= 0 && yRatio <= 1) {
        rtcService.sendInputEvent('mousemove', { xRatio, yRatio });
      }
    });

    // Mouse Clicks Listener
    screenWrap.addEventListener('mousedown', (e) => {
      if (!this.inputEnabled || this.permissions === 'view-only') return;
      const rect = videoEl.getBoundingClientRect();
      const xRatio = (e.clientX - rect.left) / rect.width;
      const yRatio = (e.clientY - rect.top) / rect.height;

      rtcService.sendInputEvent('mousedown', { button: e.button, xRatio, yRatio });
    });

    screenWrap.addEventListener('mouseup', (e) => {
      if (!this.inputEnabled || this.permissions === 'view-only') return;
      const rect = videoEl.getBoundingClientRect();
      const xRatio = (e.clientX - rect.left) / rect.width;
      const yRatio = (e.clientY - rect.top) / rect.height;

      rtcService.sendInputEvent('mouseup', { button: e.button, xRatio, yRatio });
    });

    // Keyboard Shortcuts Listener when overlay active
    window.addEventListener('keydown', (e) => {
      if (this.overlay.classList.contains('hidden') || !this.inputEnabled) return;
      // Prevent browser default for Tab, Alt, Win key when remote controlling
      if (['Tab', 'Alt', 'Meta', 'F5', 'F11'].includes(e.key)) {
        e.preventDefault();
      }
      rtcService.sendInputEvent('keydown', { key: e.key, code: e.code, ctrlKey: e.ctrlKey, altKey: e.altKey, shiftKey: e.shiftKey });
    });
  }

  closeSession() {
    if (this.simCanvasAnimId) {
      cancelAnimationFrame(this.simCanvasAnimId);
      this.simCanvasAnimId = null;
    }
    if (this.sessionCode) {
      socketService.emit('session:disconnect', { sessionCode: this.sessionCode });
    }
    rtcService.close();
    this.overlay.classList.add('hidden');
    this.assistant.speak('ตัดการเชื่อมต่อ Remote Session เรียบร้อยแล้วค่ะ');
  }

  startSimulatedCanvasScreen(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 1280;
    canvas.height = 720;

    let frame = 0;
    let typedText = 'Welcome to ormConnect Remote Desktop!';
    
    const render = () => {
      frame++;
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Desktop Grid Pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Branding Logo Center
      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.font = '700 48px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ormConnect OS (Simulated Remote Desktop)', canvas.width / 2, canvas.height / 2 - 20);

      // App Window 1: Notepad
      ctx.fillStyle = '#1e293b';
      ctx.roundRect(100, 80, 500, 320, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)'; ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(100, 80, 500, 36);
      ctx.fillStyle = '#00f0ff';
      ctx.font = '600 14px Outfit, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('📝 Notepad - RemoteText.txt', 120, 103);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(108, 124, 484, 268);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '14px monospace';
      ctx.fillText(typedText + ((frame % 60 < 30) ? '|' : ''), 120, 150);

      // App Window 2: Command Prompt
      ctx.fillStyle = '#090d16';
      ctx.roundRect(640, 140, 520, 340, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)'; ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(640, 140, 520, 36);
      ctx.fillStyle = '#10b981';
      ctx.font = '600 14px Outfit, sans-serif';
      ctx.fillText('💻 Terminal - Remote Agent Session ' + (this.sessionCode || '212-989-871'), 660, 163);

      ctx.fillStyle = '#4ade80';
      ctx.font = '13px monospace';
      ctx.fillText('C:\\ormConnect> agent status', 660, 200);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('[OK] DataChannel Input Latency: 8ms', 660, 225);
      ctx.fillText('[OK] Display Media 60 FPS P2P Active', 660, 250);
      ctx.fillStyle = '#fff';
      ctx.fillText('C:\\ormConnect> _', 660, 285);

      // Taskbar
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(0, canvas.height - 48, canvas.width, 48);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath(); ctx.moveTo(0, canvas.height - 48); ctx.lineTo(canvas.width, canvas.height - 48); ctx.stroke();

      ctx.fillStyle = '#00f0ff';
      ctx.font = '700 14px Outfit, sans-serif';
      ctx.fillText('❖ Start', 20, canvas.height - 18);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('11:55 AM | ormConnect Remote OS', canvas.width - 240, canvas.height - 18);

      this.simCanvasAnimId = requestAnimationFrame(render);
    };

    render();
  }
}

