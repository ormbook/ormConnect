import { socketService } from '../services/socketService.js';
import { rtcService } from '../services/rtcService.js';

export class HostDashboard {
  constructor(containerId, assistant) {
    this.container = document.getElementById(containerId);
    this.assistant = assistant;
    this.sessionCode = null;
    this.passcode = null;
    this.isHosting = false;
    this._eventsRegistered = false;

    this.render();
    this._registerSocketEvents();
    this._tryRecoverSession();
  }

  // ──────────────────────────────────────────────────────
  // Session Recovery on Refresh
  // ──────────────────────────────────────────────────────
  _tryRecoverSession() {
    const savedSession = sessionStorage.getItem('orm_host_session');
    if (!savedSession) return;
    try {
      const { sessionCode, passcode } = JSON.parse(savedSession);
      this.sessionCode = sessionCode;
      this.passcode = passcode;
      this.isHosting = true;
      this._showActivePanel(sessionCode, passcode, 'กำลังกู้คืน Session...');
      // Emit recovery — socket.io will buffer if not yet connected
      socketService.emit('host:recover-session', { sessionCode, passcode });
    } catch (err) {
      sessionStorage.removeItem('orm_host_session');
    }
  }

  // ──────────────────────────────────────────────────────
  // UI Helpers
  // ──────────────────────────────────────────────────────
  _showActivePanel(sessionCode, passcode, statusText = 'รอเพื่อนเชื่อมต่อ...') {
    const startPanel = document.getElementById('host-start-panel');
    const activePanel = document.getElementById('host-active-panel');
    if (startPanel) startPanel.classList.add('hidden');
    if (activePanel) activePanel.classList.remove('hidden');
    const dispCode = document.getElementById('display-session-code');
    const dispPass = document.getElementById('display-passcode');
    const dispStatus = document.getElementById('display-host-status');
    if (dispCode) dispCode.innerText = sessionCode;
    if (dispPass) dispPass.innerText = passcode;
    if (dispStatus) {
      dispStatus.innerText = statusText;
      dispStatus.style.color = 'var(--accent-amber)';
    }
  }

  _setStatus(text, color = 'var(--accent-amber)') {
    const el = document.getElementById('display-host-status');
    if (el) { el.innerText = text; el.style.color = color; }
  }

  // ──────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────
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

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button id="btn-copy-code" class="btn-secondary">
              <i class="fa-solid fa-copy"></i> คัดลอกรหัส
            </button>
            <button id="btn-manual-share" class="btn-primary" style="background: linear-gradient(135deg, #10b981, #059669);">
              <i class="fa-solid fa-display"></i> เริ่มแชร์หน้าจอ
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
                <i class="fa-solid fa-check"></i> อนุมัติ & เริ่มแชร์หน้าจอ
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

    this._bindButtonEvents();
  }

  // ──────────────────────────────────────────────────────
  // Button Event Listeners (called once after render)
  // ──────────────────────────────────────────────────────
  _bindButtonEvents() {
    const btnStart = document.getElementById('btn-start-hosting');
    const btnStop = document.getElementById('btn-stop-hosting');
    const btnCopy = document.getElementById('btn-copy-code');
    const btnManualShare = document.getElementById('btn-manual-share');
    const btnAccept = document.getElementById('btn-accept-connection');
    const btnDecline = document.getElementById('btn-decline-connection');

    const handleStartShare = async () => {
      const alertBox = document.getElementById('host-incoming-alert');
      try {
        if (alertBox) alertBox.classList.add('hidden');
        this._setStatus('กำลังสตรีมหน้าจอ (Active)', 'var(--accent-emerald)');

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
        const alertBox = document.getElementById('host-incoming-alert');
        if (alertBox) alertBox.classList.add('hidden');
        if (this.sessionCode) {
          socketService.emit('host:decline-connection', { sessionCode: this.sessionCode });
        }
        this._setStatus('ปฏิเสธคำขอแล้ว', 'var(--accent-rose)');
        this.assistant.speak('ปฏิเสธคำขอเชื่อมต่อเรียบร้อยแล้วค่ะ');
      });
    }

    if (btnStart) {
      btnStart.addEventListener('click', () => {
        const p1 = Math.floor(100 + Math.random() * 900);
        const p2 = Math.floor(100 + Math.random() * 900);
        const p3 = Math.floor(100 + Math.random() * 900);
        const sessionCode = `${p1}-${p2}-${p3}`;
        const passcode = Math.floor(1000 + Math.random() * 9000).toString();
        const permSelectEl = document.getElementById('host-permission-select');
        const permissions = permSelectEl ? permSelectEl.value : 'full';

        this.sessionCode = sessionCode;
        this.passcode = passcode;
        this.isHosting = true;
        sessionStorage.setItem('orm_host_session', JSON.stringify({ sessionCode, passcode }));

        this._showActivePanel(sessionCode, passcode);
        rtcService.initWebRTC(sessionCode, true);
        socketService.emit('host:create-session', { customSessionCode: sessionCode, customPasscode: passcode, permissions });
        this.assistant.notifySessionCreated(sessionCode, passcode);
      });
    }

    if (btnStop) {
      btnStop.addEventListener('click', () => this.stopHosting());
    }

    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        if (this.sessionCode && this.passcode) {
          navigator.clipboard.writeText(`ormConnect ID: ${this.sessionCode} | Passcode: ${this.passcode}`).then(() => {
            this.assistant.speak('คัดลอกรหัสเรียบร้อยแล้วค่ะ! ส่งให้เพื่อนผ่านแชทได้เลยนะคะ 👍');
          });
        }
      });
    }

    // Store handleStartShare ref for use in socket events
    this._handleStartShare = handleStartShare;

    // Setup fake cursor overlay for Host to see Viewer's pointer
    this._setupFakeCursor();
  }

  // ──────────────────────────────────────────────────────
  // Resume or Prompt Share
  // If stream still active → reuse automatically (no user gesture needed)
  // If stream gone (host refreshed) → show button for user to click
  // ──────────────────────────────────────────────────────
  async _resumeOrPromptShare(assistantMsg) {
    const streamActive = rtcService.localStream && rtcService.localStream.active;

    if (streamActive) {
      // Stream still alive — can share automatically without user gesture
      this._setStatus('กำลังส่งสัญญาณภาพ (Active)', 'var(--accent-emerald)');
      this.assistant.speak('ผู้เชื่อมต่อกลับมาแล้วค่ะ กำลังส่งสัญญาณภาพต่อ...');
      try {
        await rtcService.startScreenShare();
      } catch (err) {
        console.warn('[HostDashboard] Auto-resume failed, prompting user:', err);
        this._showSharePrompt(assistantMsg);
      }
    } else {
      // Stream gone — must prompt user to click (browser security requirement)
      this._showSharePrompt(assistantMsg);
    }
  }

  _showSharePrompt(assistantMsg) {
    this._setStatus('กรุณากด "เริ่มแชร์หน้าจอ" เพื่อส่งภาพให้ผู้เชื่อมต่อ', 'var(--accent-amber)');

    // Show a prominent alert to Host
    const alertBox = document.getElementById('host-incoming-alert');
    if (alertBox) {
      alertBox.innerHTML = `
        <div style="font-size: 1.1rem; font-weight: 700; color: var(--accent-amber); margin-bottom: 0.4rem;">
          <i class="fa-solid fa-display"></i> ผู้เชื่อมต่อรอรับหน้าจออยู่ค่ะ!
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">${assistantMsg}</p>
        <button id="btn-accept-connection" class="btn-primary" style="width: auto; padding: 0.65rem 1.5rem; background: linear-gradient(135deg, #10b981, #059669); font-size: 1rem;">
          <i class="fa-solid fa-display"></i> เริ่มแชร์หน้าจอ (Share Screen)
        </button>
      `;
      alertBox.classList.remove('hidden');

      // Re-bind accept button (because innerHTML replaced it)
      document.getElementById('btn-accept-connection')?.addEventListener('click', () => {
        if (this._handleStartShare) this._handleStartShare();
      });
    }

    this.assistant.speak(assistantMsg);
  }

  // ──────────────────────────────────────────────────────
  // Socket Event Listeners (registered once in constructor)
  // ──────────────────────────────────────────────────────
  _registerSocketEvents() {
    if (this._eventsRegistered) return;
    this._eventsRegistered = true;

    // Session created confirmation from server
    socketService.on('host:session-created', ({ sessionCode, passcode }) => {
      this.sessionCode = sessionCode;
      this.passcode = passcode;
      this.isHosting = true;
      sessionStorage.setItem('orm_host_session', JSON.stringify({ sessionCode, passcode }));
      this._showActivePanel(sessionCode, passcode);
      rtcService.initWebRTC(sessionCode, true);
      this.assistant.notifySessionCreated(sessionCode, passcode);
    });

    // Session recovered after refresh
    socketService.on('host:session-recovered', ({ sessionCode, passcode, hasViewer }) => {
      this.sessionCode = sessionCode;
      this.passcode = passcode;
      this.isHosting = true;

      this._showActivePanel(sessionCode, passcode, 'กู้คืน Session สำเร็จค่ะ');
      this.assistant.speak('กู้คืน Session สำเร็จค่ะ');

      rtcService.initWebRTC(sessionCode, true);

      if (hasViewer) {
        // Try to reuse existing stream (if Host didn't refresh)
        this._resumeOrPromptShare('ผู้เชื่อมต่อยังอยู่ใน Session กรุณากด เริ่มแชร์หน้าจอ อีกครั้งค่ะ');
      } else {
        this._setStatus('รอเพื่อนเชื่อมต่อ...', 'var(--accent-amber)');
      }
    });

    // Session expired — clear storage
    socketService.on('host:session-expired', () => {
      sessionStorage.removeItem('orm_host_session');
      this.sessionCode = null;
      this.passcode = null;
      this.isHosting = false;
      document.getElementById('host-start-panel')?.classList.remove('hidden');
      document.getElementById('host-active-panel')?.classList.add('hidden');
      this.assistant.notifyError('Session หมดอายุแล้วค่ะ กรุณาสร้าง Session ใหม่');
    });

    // Re-connect on socket reconnect
    socketService.on('status-change', ({ connected }) => {
      if (connected && this.isHosting && this.sessionCode && this.passcode) {
        socketService.emit('host:recover-session', { sessionCode: this.sessionCode, passcode: this.passcode });
      }
    });

    // Viewer joined and waiting for approval
    socketService.on('host:viewer-joined', () => {
      this._setStatus('มีคำขอเชื่อมต่อเข้ามา (รอการอนุมัติ)...', 'var(--accent-amber)');
      const alertBox = document.getElementById('host-incoming-alert');
      if (alertBox) alertBox.classList.remove('hidden');

      this.assistant.notifyIncomingConnection(this.sessionCode, () => {
        if (this._handleStartShare) this._handleStartShare();
      });
    });

    // Viewer recovered after their refresh
    socketService.on('host:viewer-recovered', () => {
      this._setStatus('ผู้เชื่อมต่อกลับมาแล้ว!', 'var(--accent-emerald)');
      rtcService.initWebRTC(this.sessionCode, true);
      // Try to reuse existing stream automatically; if gone, prompt Host to click
      this._resumeOrPromptShare('ผู้เชื่อมต่อกลับมาแล้วค่ะ กรุณากดปุ่มเพื่อส่งสัญญาณภาพให้เขาด้วยนะคะ');
    });

    // Viewer disconnected
    socketService.on('host:viewer-disconnected', () => {
      this._setStatus('ผู้เชื่อมต่อออกไปแล้ว', 'var(--accent-amber)');
      this.assistant.speak('ผู้เชื่อมต่อออกจาก Session แล้วค่ะ');
    });

    // Session ended by server
    socketService.on('session:ended', ({ message }) => {
      this.stopHosting(false);
      this.assistant.notifyError(message || 'Session ถูกปิดแล้วค่ะ');
    });

    // Screen share ended by user clicking browser stop button
    rtcService.on('screen-share-ended', () => {
      this._setStatus('หยุดแชร์หน้าจอแล้ว', 'var(--accent-amber)');
      this.assistant.speak('คุณหยุดแชร์หน้าจอแล้วค่ะ');
    });
  }

  // ──────────────────────────────────────────────────────
  // Fake Cursor Overlay (Host sees Viewer's mouse)
  // ──────────────────────────────────────────────────────
  _setupFakeCursor() {
    let fakeCursor = document.getElementById('fake-viewer-cursor');
    if (!fakeCursor) {
      fakeCursor = document.createElement('div');
      fakeCursor.id = 'fake-viewer-cursor';
      Object.assign(fakeCursor.style, {
        position: 'fixed', width: '16px', height: '16px',
        background: 'rgba(255, 50, 50, 0.85)',
        border: '2px solid rgba(255,255,255,0.8)',
        borderRadius: '50%', pointerEvents: 'none',
        zIndex: '999999', display: 'none',
        transition: 'background 0.1s',
        boxShadow: '0 0 8px rgba(255, 50, 50, 0.6)',
        transform: 'translate(-50%, -50%)'
      });
      document.body.appendChild(fakeCursor);
    }

    let fakeCursorLabel = document.getElementById('fake-viewer-cursor-label');
    if (!fakeCursorLabel) {
      fakeCursorLabel = document.createElement('div');
      fakeCursorLabel.id = 'fake-viewer-cursor-label';
      Object.assign(fakeCursorLabel.style, {
        position: 'fixed', background: 'rgba(0,0,0,0.85)',
        color: '#00f0ff', padding: '3px 8px',
        borderRadius: '4px', fontSize: '11px',
        fontFamily: 'monospace', pointerEvents: 'none',
        zIndex: '999999', display: 'none',
        transform: 'translateY(-50%)'
      });
      document.body.appendChild(fakeCursorLabel);
    }

    rtcService.on('input-event', (data) => {
      if (!this.isHosting) return;
      if (data.type === 'mousemove') {
        fakeCursor.style.display = 'block';
        fakeCursor.style.left = (data.payload.xRatio * window.innerWidth) + 'px';
        fakeCursor.style.top = (data.payload.yRatio * window.innerHeight) + 'px';
      } else if (data.type === 'mousedown') {
        fakeCursor.style.background = 'rgba(0, 240, 255, 0.95)';
        fakeCursor.style.boxShadow = '0 0 14px rgba(0, 240, 255, 0.8)';
      } else if (data.type === 'mouseup') {
        fakeCursor.style.background = 'rgba(255, 50, 50, 0.85)';
        fakeCursor.style.boxShadow = '0 0 8px rgba(255, 50, 50, 0.6)';
      } else if (data.type === 'keydown' || data.type === 'shortcut') {
        const key = data.type === 'keydown' ? data.payload.key : data.payload.combo;
        fakeCursorLabel.innerText = `[${key}]`;
        fakeCursorLabel.style.display = 'block';
        fakeCursorLabel.style.left = (parseFloat(fakeCursor.style.left || 0) + 20) + 'px';
        fakeCursorLabel.style.top = fakeCursor.style.top;
        clearTimeout(this._keyLabelTimeout);
        this._keyLabelTimeout = setTimeout(() => {
          fakeCursorLabel.style.display = 'none';
        }, 1500);
      }
    });
  }

  // ──────────────────────────────────────────────────────
  // Stop Hosting
  // ──────────────────────────────────────────────────────
  stopHosting(emitDisconnect = true) {
    if (this.sessionCode && emitDisconnect) {
      socketService.emit('session:disconnect', { sessionCode: this.sessionCode });
    }
    rtcService.close();
    sessionStorage.removeItem('orm_host_session');

    // Hide fake cursor
    const fakeCursor = document.getElementById('fake-viewer-cursor');
    if (fakeCursor) fakeCursor.style.display = 'none';

    this.sessionCode = null;
    this.passcode = null;
    this.isHosting = false;

    document.getElementById('host-start-panel')?.classList.remove('hidden');
    document.getElementById('host-active-panel')?.classList.add('hidden');
    document.getElementById('host-incoming-alert')?.classList.add('hidden');
    this.assistant.speak('ปิด Session เรียบร้อยแล้วค่ะ');
  }
}
