import { socketService } from '../services/socketService.js';
import { rtcService } from '../services/rtcService.js';

export class HostDashboard {
  constructor(containerId, assistant) {
    this.container = document.getElementById(containerId);
    this.assistant = assistant;
    this.sessionCode = null;
    this.passcode = null;
    this.isHosting = false;

    this.render();

    // Session Recovery on Refresh
    const savedSession = sessionStorage.getItem('orm_host_session');
    if (savedSession) {
      try {
        const { sessionCode, passcode } = JSON.parse(savedSession);
        this.sessionCode = sessionCode;
        this.passcode = passcode;
        this.isHosting = true;
        // Wait a tick for DOM to be ready
        setTimeout(() => this.recoverUIState(), 0);
      } catch (err) {}
    }
  }

  recoverUIState() {
    const startPanel = document.getElementById('host-start-panel');
    const activePanel = document.getElementById('host-active-panel');
    if (startPanel) startPanel.classList.add('hidden');
    if (activePanel) activePanel.classList.remove('hidden');

    const dispCode = document.getElementById('display-session-code');
    const dispPass = document.getElementById('display-passcode');
    if (dispCode) dispCode.innerText = this.sessionCode;
    if (dispPass) dispPass.innerText = this.passcode;
    document.getElementById('display-host-status').innerText = 'กำลังกู้คืน Session...';

    // If socket is already connected, emit recovery
    if (socketService.socket && socketService.socket.connected) {
      socketService.emit('host:recover-session', { sessionCode: this.sessionCode, passcode: this.passcode });
    }
  }

  render() {
    if (!document.getElementById('btn-start-hosting')) {
      this.container.innerHTML = `
      <div class="glass-card">
        <h2 class="card-title">
          <i class="fa-solid fa-desktop" style="color: var(--primary-cyan);"></i> แชร์หน้าจอเครื่องนี้ (Host My PC)
        </h2>
        <p class="card-subtitle">สร้างรหัสผ่านเพื่ออนุญาตให้เพื่อนหรือทีมงานรีโมทเข้ามาควบคุมเครื่องนี้</p>

        <!-- Initial State: Start Host Button -->
        <div id="host-start-panel">
          <div class="input-group">
            <label class="input-label">สิทธิ์การเข้าถึง (Access Permission)</label>
            <select id="host-permission-select" class="glass-input">
              <option value="full">ควบคุมได้เต็มรูปแบบ (Full Access - Mouse & Keyboard)</option>
              <option value="view-only">ให้ดูหน้าจอได้อย่างเดียว (View Only)</option>
            </select>
          </div>

          <button id="btn-start-hosting" class="btn-primary">
            <i class="fa-solid fa-play"></i> เริ่มสร้าง Session แชร์หน้าจอ
          </button>
        </div>

        <!-- Hosting Active Panel (Hidden by default) -->
        <div id="host-active-panel" class="hidden">
          <div class="input-group" style="text-align: center; margin: 1.5rem 0;">
            <label class="input-label">Your Remote Session ID</label>
            <div id="display-session-code" style="font-size: 2.2rem; font-weight: 700; color: var(--primary-cyan); letter-spacing: 2px;">
              --- --- ---
            </div>
          </div>

          <div class="grid-2-col" style="margin-bottom: 1.5rem;">
            <div style="background: rgba(255,255,255,0.04); padding: 0.8rem; border-radius: 8px; text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-muted);">Passcode ชั่วคราว</span>
              <div id="display-passcode" style="font-size: 1.4rem; font-weight: 700; color: var(--accent-emerald);">----</div>
            </div>
            <div style="background: rgba(255,255,255,0.04); padding: 0.8rem; border-radius: 8px; text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-muted);">สถานะห้อง</span>
              <div id="display-host-status" style="font-size: 0.95rem; font-weight: 600; color: var(--accent-amber); margin-top: 4px;">
                รอเพื่อนเชื่อมต่อ...
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem;">
            <button id="btn-copy-code" class="btn-secondary">
              <i class="fa-solid fa-copy"></i> คัดลอกรหัส
            </button>
            <button id="btn-manual-share" class="btn-primary" style="background: linear-gradient(135deg, #10b981, #059669);">
              <i class="fa-solid fa-display"></i> เริ่มแชร์หน้าจอ (Share Screen)
            </button>
            <button id="btn-stop-hosting" class="btn-danger">
              <i class="fa-solid fa-stop"></i> ปิด Session
            </button>
          </div>

          <!-- Incoming Connection Alert Card -->
          <div id="host-incoming-alert" class="hidden" style="margin-top: 1.5rem; background: rgba(0, 240, 255, 0.08); border: 2px dashed var(--primary-cyan); padding: 1.25rem; border-radius: 12px; text-align: center;">
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--primary-cyan); margin-bottom: 0.4rem;">
              <i class="fa-solid fa-user-check"></i> มีคำขอเชื่อมต่อเข้ามายังเครื่องนี้!
            </div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
              มีผู้ใช้กำลังขอสิทธิ์เข้าควบคุมและรับภาพสตรีมหน้าจอของคุณ
            </p>

            <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
              <button id="btn-accept-connection" class="btn-primary" style="width: auto; padding: 0.65rem 1.5rem; background: linear-gradient(135deg, #10b981, #059669); font-size: 1rem;">
                <i class="fa-solid fa-check"></i> อนุมัติ & เริ่มแชร์หน้าจอ (Accept & Share Screen)
              </button>
              <button id="btn-decline-connection" class="btn-danger" style="width: auto;">
                <i class="fa-solid fa-xmark"></i> ปฏิเสธ (Decline)
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    }

    this.bindEvents();
  }

  bindEvents() {
    const btnStart = document.getElementById('btn-start-hosting');
    const btnStop = document.getElementById('btn-stop-hosting');
    const btnCopy = document.getElementById('btn-copy-code');
    const permSelect = document.getElementById('host-permission-select');

    const btnManualShare = document.getElementById('btn-manual-share');
    const btnAccept = document.getElementById('btn-accept-connection');
    const btnDecline = document.getElementById('btn-decline-connection');
    const alertBox = document.getElementById('host-incoming-alert');

    const handleStartShare = async () => {
      try {
        if (alertBox) alertBox.classList.add('hidden');
        document.getElementById('display-host-status').innerText = 'กำลังสตรีมหน้าจอ (Active)';
        document.getElementById('display-host-status').style.color = 'var(--accent-emerald)';

        if (this.sessionCode) {
          socketService.emit('host:accept-connection', { sessionCode: this.sessionCode });
        }

        await rtcService.startScreenShare();
        this.assistant.speak('อนุมัติและเริ่มสตรีมมิ่งหน้าจอสำเร็จค่ะ! คุณสามารถกดปิด Session หรือซ่อนหน้าต่างได้ตลอดเวลานะคะ');
      } catch (err) {
        this.assistant.notifyError('คุณยกเลิกการเลือกแชร์หน้าจอค่ะ');
      }
    };

    if (btnManualShare) btnManualShare.addEventListener('click', handleStartShare);
    if (btnAccept) btnAccept.addEventListener('click', handleStartShare);
    if (btnDecline) {
      btnDecline.addEventListener('click', () => {
        if (alertBox) alertBox.classList.add('hidden');
        if (this.sessionCode) {
          socketService.emit('host:decline-connection', { sessionCode: this.sessionCode });
        }
        document.getElementById('display-host-status').innerText = 'ปฏิเสธคำขอแล้ว';
        document.getElementById('display-host-status').style.color = 'var(--accent-rose)';
        this.assistant.speak('ปฏิเสธคำขอเชื่อมต่อเรียบร้อยแล้วค่ะ');
      });
    }

    window.startHostSession = (presetCode, presetPass) => {
      console.log('[HostDashboard] startHostSession triggered!', { presetCode, presetPass });

      let sessionCode = presetCode;
      let passcode = presetPass;

      if (!sessionCode || !passcode) {
        const p1 = Math.floor(100 + Math.random() * 900);
        const p2 = Math.floor(100 + Math.random() * 900);
        const p3 = Math.floor(100 + Math.random() * 900);
        sessionCode = `${p1}-${p2}-${p3}`;
        passcode = Math.floor(1000 + Math.random() * 9000).toString();
      }

      this.sessionCode = sessionCode;
      this.passcode = passcode;
      this.isHosting = true;
      sessionStorage.setItem('orm_host_session', JSON.stringify({ sessionCode, passcode }));

      // Instantly update UI DOM (0ms response time)
      const startPanel = document.getElementById('host-start-panel');
      const activePanel = document.getElementById('host-active-panel');
      if (startPanel) startPanel.classList.add('hidden');
      if (activePanel) activePanel.classList.remove('hidden');

      const dispCode = document.getElementById('display-session-code');
      const dispPass = document.getElementById('display-passcode');
      if (dispCode) dispCode.innerText = sessionCode;
      if (dispPass) dispPass.innerText = passcode;

      const permSelectEl = document.getElementById('host-permission-select');
      const permissions = permSelectEl ? permSelectEl.value : 'full';

      // Initialize WebRTC as Host
      try {
        rtcService.initWebRTC(sessionCode, true);
      } catch (err) {
        console.warn('WebRTC init warning:', err);
      }

      // Register session on server
      socketService.emit('host:create-session', { customSessionCode: sessionCode, customPasscode: passcode, permissions });

      if (this.assistant) {
        this.assistant.notifySessionCreated(sessionCode, passcode);
      }
    };

    if (btnStart) {
      btnStart.addEventListener('click', window.startHostSession);
    }

    if (btnStop) {
      btnStop.addEventListener('click', () => {
        this.stopHosting();
      });
    }

    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        if (this.sessionCode && this.passcode) {
          navigator.clipboard.writeText(`ormConnect ID: ${this.sessionCode} | Passcode: ${this.passcode}`);
          this.assistant.speak('คัดลอกรหัสเรียบร้อยแล้วค่ะ! ส่งให้เพื่อนผ่านแชทได้เลยนะคะ 👍');
        }
      });
    }

    // Listen for Socket Events
    socketService.on('host:session-created', ({ sessionCode, passcode }) => {
      if (btnStart) {
        btnStart.disabled = false;
        btnStart.innerHTML = '<i class="fa-solid fa-play"></i> เริ่มสร้าง Session แชร์หน้าจอ';
      }

      this.sessionCode = sessionCode;
      this.passcode = passcode;
      this.isHosting = true;

      const startPanel = document.getElementById('host-start-panel');
      const activePanel = document.getElementById('host-active-panel');
      if (startPanel) startPanel.classList.add('hidden');
      if (activePanel) activePanel.classList.remove('hidden');

      const dispCode = document.getElementById('display-session-code');
      const dispPass = document.getElementById('display-passcode');
      if (dispCode) dispCode.innerText = sessionCode;
      if (dispPass) dispPass.innerText = passcode;

      // Initialize WebRTC as Host
      rtcService.initWebRTC(sessionCode, true);

      this.assistant.notifySessionCreated(sessionCode, passcode);
    });

    socketService.on('session:ended', ({ message }) => {
      this.stopHosting(false); // don't emit disconnect if server ended it
      this.assistant.notifyError(message || 'Session ถูกปิดแล้วค่ะ');
    });

    socketService.on('host:session-recovered', ({ sessionCode, hasViewer }) => {
      const activePanel = document.getElementById('host-active-panel');
      const startPanel = document.getElementById('host-start-panel');
      if (startPanel) startPanel.classList.add('hidden');
      if (activePanel) activePanel.classList.remove('hidden');
      document.getElementById('display-session-code').innerText = sessionCode;
      document.getElementById('display-passcode').innerText = this.passcode;

      document.getElementById('display-host-status').innerText = hasViewer ? 'กำลังถูกควบคุม (Active)' : 'รอเพื่อนเชื่อมต่อ...';
      document.getElementById('display-host-status').style.color = hasViewer ? 'var(--accent-emerald)' : 'var(--accent-amber)';
      this.assistant.speak('กู้คืน Session สำเร็จค่ะ');
      if (hasViewer) {
        rtcService.initWebRTC(sessionCode, true);
        rtcService.startScreenShare();
      }
    });

    socketService.on('status-change', ({ connected }) => {
      if (connected && this.isHosting && this.sessionCode) {
        socketService.emit('host:recover-session', { sessionCode: this.sessionCode, passcode: this.passcode });
      }
    });

    socketService.on('host:viewer-joined', async () => {
      document.getElementById('display-host-status').innerText = 'มีคำขอเชื่อมต่อเข้ามา (รอการอนุมัติ)...';
      document.getElementById('display-host-status').style.color = 'var(--accent-amber)';

      if (alertBox) alertBox.classList.remove('hidden');

      // Prompt with Nong Orm Assistant
      this.assistant.notifyIncomingConnection(this.sessionCode, () => {
        handleStartShare();
      });
    });

    // --- Simulated Interactive Cursor Overlay ---
    let fakeCursor = document.getElementById('fake-viewer-cursor');
    if (!fakeCursor) {
      fakeCursor = document.createElement('div');
      fakeCursor.id = 'fake-viewer-cursor';
      fakeCursor.style.position = 'fixed';
      fakeCursor.style.width = '20px';
      fakeCursor.style.height = '20px';
      fakeCursor.style.background = 'rgba(255, 50, 50, 0.7)';
      fakeCursor.style.border = '2px solid white';
      fakeCursor.style.borderRadius = '50%';
      fakeCursor.style.pointerEvents = 'none';
      fakeCursor.style.zIndex = '999999';
      fakeCursor.style.display = 'none';
      fakeCursor.style.transition = 'transform 0.1s, background 0.1s';
      fakeCursor.style.boxShadow = '0 0 10px rgba(255, 50, 50, 0.5)';
      document.body.appendChild(fakeCursor);
    }

    let fakeCursorLabel = document.getElementById('fake-viewer-cursor-label');
    if (!fakeCursorLabel) {
      fakeCursorLabel = document.createElement('div');
      fakeCursorLabel.id = 'fake-viewer-cursor-label';
      fakeCursorLabel.style.position = 'fixed';
      fakeCursorLabel.style.background = 'rgba(0,0,0,0.8)';
      fakeCursorLabel.style.color = '#00f0ff';
      fakeCursorLabel.style.padding = '4px 8px';
      fakeCursorLabel.style.borderRadius = '4px';
      fakeCursorLabel.style.fontSize = '12px';
      fakeCursorLabel.style.pointerEvents = 'none';
      fakeCursorLabel.style.zIndex = '999999';
      fakeCursorLabel.style.display = 'none';
      document.body.appendChild(fakeCursorLabel);
    }

    rtcService.on('input-event', (data) => {
      if (!this.isHosting) return;

      if (data.type === 'mousemove') {
        fakeCursor.style.display = 'block';
        fakeCursor.style.left = (data.payload.xRatio * window.innerWidth) + 'px';
        fakeCursor.style.top = (data.payload.yRatio * window.innerHeight) + 'px';
      } else if (data.type === 'mousedown') {
        fakeCursor.style.background = 'rgba(0, 240, 255, 0.9)';
        fakeCursor.style.transform = 'scale(0.8)';
        fakeCursor.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.8)';
      } else if (data.type === 'mouseup') {
        fakeCursor.style.background = 'rgba(255, 50, 50, 0.7)';
        fakeCursor.style.transform = 'scale(1)';
        fakeCursor.style.boxShadow = '0 0 10px rgba(255, 50, 50, 0.5)';
      } else if (data.type === 'keydown' || data.type === 'shortcut') {
        const key = data.type === 'keydown' ? data.payload.key : data.payload.combo;
        fakeCursorLabel.innerText = `[Viewer กดปุ่ม: ${key}]`;
        fakeCursorLabel.style.display = 'block';
        fakeCursorLabel.style.left = (parseInt(fakeCursor.style.left || 0) + 25) + 'px';
        fakeCursorLabel.style.top = fakeCursor.style.top;
        
        clearTimeout(this.keyLabelTimeout);
        this.keyLabelTimeout = setTimeout(() => {
          fakeCursorLabel.style.display = 'none';
        }, 2000);
      }
    });
  }

  stopHosting(emitDisconnect = true) {
    if (this.sessionCode && emitDisconnect) {
      socketService.emit('session:disconnect', { sessionCode: this.sessionCode });
    }
    rtcService.close();
    sessionStorage.removeItem('orm_host_session');

    this.sessionCode = null;
    this.passcode = null;
    this.isHosting = false;

    document.getElementById('host-start-panel').classList.remove('hidden');
    document.getElementById('host-active-panel').classList.add('hidden');
    this.assistant.speak('ปิด Session เรียบร้อยแล้วค่ะ');
  }
}
