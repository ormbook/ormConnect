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
    this._sessionActive = false;

    this.render();
    this._registerSocketEvents();

    // Listen for remote stream from WebRTC (set up once)
    rtcService.on('remote-stream', (stream) => {
      this._showStream(stream);
    });
  }

  // ──────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────
  render() {
    this.overlay.innerHTML = `
      <!-- Top Floating Control Toolbar -->
      <div class="floating-toolbar">
        <div class="toolbar-group">
          <span style="font-weight: 700; color: var(--primary-cyan); font-size: 0.9rem; margin-right: 0.5rem;">
            ormConnect Remote
          </span>
          <span id="remote-session-badge" class="badge badge-emerald">---</span>
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
            เชื่อมต่อสำเร็จแล้วค่ะ! เมื่อเครื่องปลายทางกดอนุญาตแชร์หน้าจอ ภาพจะปรากฏขึ้นบนจอของคุณทันทีค่ะ
          </p>
        </div>

        <video id="remote-video-stream" autoplay playsinline style="display: none; width: 100%; height: 100%; object-fit: contain;"></video>
        <canvas id="remote-canvas-fallback" class="hidden" style="max-width: 100%; max-height: 100%; object-fit: contain;"></canvas>
      </div>
    `;

    this._bindButtonEvents();
  }

  // ──────────────────────────────────────────────────────
  // Open Session (called from ConnectForm on approval)
  // ──────────────────────────────────────────────────────
  openSession(sessionCode, permissions) {
    this.sessionCode = sessionCode;
    this.permissions = permissions || 'full';
    this._sessionActive = true;
    this.inputEnabled = true;

    this.overlay.classList.remove('hidden');

    const badgeEl = document.getElementById('remote-session-badge');
    if (badgeEl) badgeEl.innerText = sessionCode;

    const waitingEl = document.getElementById('remote-stream-waiting');
    const videoEl = document.getElementById('remote-video-stream');
    if (waitingEl) waitingEl.style.display = 'flex';
    if (videoEl) videoEl.style.display = 'none';

    // Update input button state based on permissions
    const btnInput = document.getElementById('tool-btn-input');
    if (btnInput) {
      if (permissions === 'view-only') {
        this.inputEnabled = false;
        btnInput.classList.remove('active');
        btnInput.title = 'View Only (ดูอย่างเดียว)';
      } else {
        this.inputEnabled = true;
        btnInput.classList.add('active');
      }
    }
  }

  // ──────────────────────────────────────────────────────
  // Show stream in video element
  // ──────────────────────────────────────────────────────
  _showStream(stream) {
    const waitingEl = document.getElementById('remote-stream-waiting');
    const videoEl = document.getElementById('remote-video-stream');

    if (!videoEl) return;

    videoEl.srcObject = stream;
    videoEl.style.display = 'block';
    if (waitingEl) waitingEl.style.display = 'none';

    videoEl.onloadedmetadata = () => {
      videoEl.play().catch(e => console.warn('Video play warning:', e));
    };
    videoEl.play().catch(e => console.warn('Video play warning:', e));
    console.log('[RemoteViewer] Remote stream video playing!');
  }

  // ──────────────────────────────────────────────────────
  // Button & Input Event Listeners
  // ──────────────────────────────────────────────────────
  _bindButtonEvents() {
    const btnInput = document.getElementById('tool-btn-input');
    const btnFullscreen = document.getElementById('tool-btn-fullscreen');
    const btnDisconnect = document.getElementById('tool-btn-disconnect');
    const btnChat = document.getElementById('tool-btn-chat');
    const btnFile = document.getElementById('tool-btn-file');
    const btnCAD = document.getElementById('shortcut-ctrl-alt-del');
    const btnTab = document.getElementById('shortcut-alt-tab');
    const btnWin = document.getElementById('shortcut-win-key');
    const screenWrap = document.getElementById('remote-screen-wrap');
    const videoEl = document.getElementById('remote-video-stream');

    // Toggle Input Control
    btnInput?.addEventListener('click', () => {
      if (this.permissions === 'view-only') {
        this.assistant.speak('โหมดนี้เป็น View Only ค่ะ ไม่สามารถควบคุมเมาส์และคีย์บอร์ดได้');
        return;
      }
      this.inputEnabled = !this.inputEnabled;
      btnInput.classList.toggle('active', this.inputEnabled);
      const status = this.inputEnabled ? 'เปิดการรีโมทเมาส์แล้วค่ะ' : 'ปิดการรีโมทเมาส์แล้วค่ะ (View Only)';
      this.assistant.speak(status);
    });

    // Fullscreen Toggle
    btnFullscreen?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        this.overlay.requestFullscreen().catch(err => console.warn(err));
        btnFullscreen.innerHTML = '<i class="fa-solid fa-compress"></i>';
      } else {
        document.exitFullscreen();
        btnFullscreen.innerHTML = '<i class="fa-solid fa-expand"></i>';
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (btnFullscreen) {
        btnFullscreen.innerHTML = document.fullscreenElement
          ? '<i class="fa-solid fa-compress"></i>'
          : '<i class="fa-solid fa-expand"></i>';
      }
    });

    // Disconnect
    btnDisconnect?.addEventListener('click', () => this.closeSession());

    // Chat & File drawers
    btnChat?.addEventListener('click', () => {
      if (this.onOpenChat) this.onOpenChat();
    });
    btnFile?.addEventListener('click', () => {
      if (this.onOpenFile) this.onOpenFile();
    });

    // Shortcuts
    btnCAD?.addEventListener('click', () => {
      rtcService.sendInputEvent('shortcut', { combo: 'CTRL_ALT_DEL' });
      this.assistant.speak('ส่งสัญญาณ Ctrl+Alt+Del ไปยังเครื่องปลายทางเรียบร้อยค่ะ');
    });
    btnTab?.addEventListener('click', () => {
      rtcService.sendInputEvent('shortcut', { combo: 'ALT_TAB' });
      this.assistant.speak('ส่งสัญญาณ Alt+Tab เรียบร้อยค่ะ');
    });
    btnWin?.addEventListener('click', () => {
      rtcService.sendInputEvent('shortcut', { combo: 'WIN_KEY' });
      this.assistant.speak('ส่งสัญญาณกดปุ่ม Windows Key เรียบร้อยค่ะ');
    });

    // Mouse Movement (ratio-based, relative to video element)
    screenWrap?.addEventListener('mousemove', (e) => {
      if (!this.inputEnabled || this.permissions === 'view-only' || !this._sessionActive) return;
      const targetEl = videoEl.style.display !== 'none' ? videoEl : document.getElementById('remote-canvas-fallback');
      const rect = targetEl?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      const xRatio = (e.clientX - rect.left) / rect.width;
      const yRatio = (e.clientY - rect.top) / rect.height;
      if (xRatio >= 0 && xRatio <= 1 && yRatio >= 0 && yRatio <= 1) {
        rtcService.sendInputEvent('mousemove', { xRatio, yRatio });
      }
    });

    // Mouse Clicks
    screenWrap?.addEventListener('mousedown', (e) => {
      if (!this.inputEnabled || this.permissions === 'view-only' || !this._sessionActive) return;
      const targetEl = videoEl.style.display !== 'none' ? videoEl : document.getElementById('remote-canvas-fallback');
      const rect = targetEl?.getBoundingClientRect();
      if (!rect) return;
      const xRatio = (e.clientX - rect.left) / rect.width;
      const yRatio = (e.clientY - rect.top) / rect.height;
      rtcService.sendInputEvent('mousedown', { button: e.button, xRatio, yRatio });
    });

    screenWrap?.addEventListener('mouseup', (e) => {
      if (!this.inputEnabled || this.permissions === 'view-only' || !this._sessionActive) return;
      const targetEl = videoEl.style.display !== 'none' ? videoEl : document.getElementById('remote-canvas-fallback');
      const rect = targetEl?.getBoundingClientRect();
      if (!rect) return;
      const xRatio = (e.clientX - rect.left) / rect.width;
      const yRatio = (e.clientY - rect.top) / rect.height;
      rtcService.sendInputEvent('mouseup', { button: e.button, xRatio, yRatio });
    });

    // Scroll wheel
    screenWrap?.addEventListener('wheel', (e) => {
      if (!this.inputEnabled || this.permissions === 'view-only' || !this._sessionActive) return;
      e.preventDefault();
      rtcService.sendInputEvent('scroll', { deltaX: e.deltaX, deltaY: e.deltaY });
    }, { passive: false });

    // Keyboard input when overlay is active
    document.addEventListener('keydown', (e) => {
      if (this.overlay.classList.contains('hidden') || !this.inputEnabled || !this._sessionActive) return;
      if (['Tab', 'F5', 'F11'].includes(e.key)) {
        e.preventDefault();
      }
      rtcService.sendInputEvent('keydown', {
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey
      });
    });
  }

  // ──────────────────────────────────────────────────────
  // Socket Events (registered once in constructor)
  // ──────────────────────────────────────────────────────
  _registerSocketEvents() {
    socketService.on('viewer:connect-declined', ({ message }) => {
      if (!this._sessionActive) return;
      this.closeSession(false);
      this.assistant.notifyError(message || 'ฝั่ง Host ปฏิเสธคำขอเชื่อมต่อค่ะ');
    });

    socketService.on('session:ended', ({ message }) => {
      if (!this._sessionActive) return;
      this.closeSession(false);
      this.assistant.notifyError(message || 'การเชื่อมต่อถูกตัดแล้วค่ะ');
    });
  }

  // ──────────────────────────────────────────────────────
  // Close Session
  // ──────────────────────────────────────────────────────
  closeSession(emitDisconnect = true) {
    if (!this._sessionActive && emitDisconnect) return;
    this._sessionActive = false;

    if (this.sessionCode && emitDisconnect) {
      socketService.emit('session:disconnect', { sessionCode: this.sessionCode });
    }
    rtcService.close();
    sessionStorage.removeItem('orm_viewer_session');

    // Exit fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    this.overlay.classList.add('hidden');
    this.sessionCode = null;
    this.assistant.speak('ตัดการเชื่อมต่อ Remote Session เรียบร้อยแล้วค่ะ');
  }
}
