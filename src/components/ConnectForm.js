import { socketService } from '../services/socketService.js';
import { rtcService } from '../services/rtcService.js';

export class ConnectForm {
  constructor(containerId, assistant, onConnectSuccess) {
    this.container = document.getElementById(containerId);
    this.assistant = assistant;
    this.onConnectSuccess = onConnectSuccess;
    this.targetSessionCode = null;
    this.targetPermissions = 'full';
    this._eventsRegistered = false;

    this.render();
    this._registerSocketEvents();
    this._tryRecoverSession();
  }

  // ──────────────────────────────────────────────────────
  // Session Recovery on Refresh
  // ──────────────────────────────────────────────────────
  _tryRecoverSession() {
    const savedViewer = sessionStorage.getItem('orm_viewer_session');
    if (!savedViewer) return;
    try {
      const { sessionCode, permissions } = JSON.parse(savedViewer);
      this.targetSessionCode = sessionCode;
      this.targetPermissions = permissions || 'full';
      // Show recovering UI
      this._showStatus('recovering', 'กำลังกู้คืนการเชื่อมต่อ...');
      // socket.io will buffer this emit until connected
      socketService.emit('viewer:recover-session', { sessionCode });
    } catch (err) {
      sessionStorage.removeItem('orm_viewer_session');
    }
  }

  // ──────────────────────────────────────────────────────
  // UI Helpers
  // ──────────────────────────────────────────────────────
  _showStatus(type, message) {
    const statusBoxEl = document.getElementById('viewer-status-card');
    if (!statusBoxEl) return;

    let icon = '';
    if (type === 'loading' || type === 'recovering') {
      icon = `<i class="fa-solid fa-spinner fa-spin" style="color: var(--primary-cyan); font-size: 1.6rem; margin-bottom: 0.5rem;"></i>`;
    } else if (type === 'success') {
      icon = `<i class="fa-solid fa-circle-check" style="color: var(--accent-emerald); font-size: 1.6rem; margin-bottom: 0.5rem;"></i>`;
    } else if (type === 'error') {
      icon = `<i class="fa-solid fa-circle-xmark" style="color: var(--accent-rose); font-size: 1.6rem; margin-bottom: 0.5rem;"></i>`;
    }

    statusBoxEl.classList.remove('hidden');
    statusBoxEl.innerHTML = `
      ${icon}
      <div style="font-size: 1rem; font-weight: 700; color: #fff;">${message}</div>
    `;
  }

  _hideStatus() {
    const el = document.getElementById('viewer-status-card');
    if (el) el.classList.add('hidden');
  }

  _resetConnectButton() {
    const btn = document.getElementById('btn-connect-remote');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-plug"></i> เชื่อมต่อเข้าควบคุม (Connect)';
    }
  }

  // ──────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────
  render() {
    if (!document.getElementById('btn-connect-remote')) {
      this.container.innerHTML = `
        <div class="glass-card">
          <h2 class="card-title">
            <i class="fa-solid fa-link" style="color: var(--primary-cyan);"></i> เชื่อมต่อปลายทาง (Connect Remote PC)
          </h2>
          <p class="card-subtitle">กรอกรหัส Session ID 9 หลักของเครื่องเพื่อนที่คุณต้องการรีโมทไปควบคุม</p>

          <!-- Form Panel -->
          <div id="connect-input-panel">
            <div class="input-group">
              <label class="input-label">Remote Session ID (9 หลัก)</label>
              <input type="text" id="input-session-code" class="glass-input" 
                     placeholder="เช่น 384-912-705" maxlength="11" style="font-size: 1.2rem; font-weight: 600; letter-spacing: 1px;" />
            </div>

            <!-- Passcode Input (Hidden until session code entered) -->
            <div id="passcode-input-group" class="input-group hidden">
              <label class="input-label" style="color: var(--accent-emerald);">
                <i class="fa-solid fa-lock"></i> ใส่ Passcode 4 หลักของปลายทาง
              </label>
              <input type="password" id="input-passcode" class="glass-input" placeholder="****" maxlength="6" style="font-size: 1.2rem; text-align: center;" />
            </div>

            <button id="btn-connect-remote" class="btn-primary" style="margin-top: 0.5rem;">
              <i class="fa-solid fa-plug"></i> เชื่อมต่อเข้าควบคุม (Connect)
            </button>
          </div>

          <!-- Status / Feedback Card -->
          <div id="viewer-status-card" class="hidden" style="margin-top: 1.25rem; text-align: center; padding: 1rem; background: rgba(255,255,255,0.04); border-radius: 10px; border: 1px solid var(--border-glass);">
          </div>
        </div>
      `;
    }

    this._bindButtonEvents();
  }

  // ──────────────────────────────────────────────────────
  // Button Events
  // ──────────────────────────────────────────────────────
  _bindButtonEvents() {
    const inputCode = document.getElementById('input-session-code');
    const inputPasscode = document.getElementById('input-passcode');
    const btnConnect = document.getElementById('btn-connect-remote');
    const passcodeGroup = document.getElementById('passcode-input-group');

    if (!inputCode || !btnConnect) return;

    // Auto-hyphen formatting for 9-digit code: XXX-XXX-XXX
    inputCode.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 9) val = val.substring(0, 9);
      if (val.length > 6) {
        e.target.value = `${val.substring(0, 3)}-${val.substring(3, 6)}-${val.substring(6)}`;
      } else if (val.length > 3) {
        e.target.value = `${val.substring(0, 3)}-${val.substring(3)}`;
      } else {
        e.target.value = val;
      }
    });

    // Enter key support
    inputCode.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleConnect();
    });
    if (inputPasscode) {
      inputPasscode.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._handleConnect();
      });
    }

    btnConnect.addEventListener('click', () => this._handleConnect());
  }

  _handleConnect() {
    const inputCodeEl = document.getElementById('input-session-code');
    const inputPasscodeEl = document.getElementById('input-passcode');
    const passcodeGroupEl = document.getElementById('passcode-input-group');
    const btnConnectEl = document.getElementById('btn-connect-remote');

    const code = inputCodeEl ? inputCodeEl.value.trim() : '';
    if (!code || code.replace(/-/g, '').length < 9) {
      this.assistant.notifyError('กรุณากรอก Session ID 9 หลักให้ครบถ้วนก่อนนะคะ');
      return;
    }

    // First click: show passcode field
    if (passcodeGroupEl && passcodeGroupEl.classList.contains('hidden')) {
      passcodeGroupEl.classList.remove('hidden');
      if (inputPasscodeEl) inputPasscodeEl.focus();
      return;
    }

    const passcode = inputPasscodeEl ? inputPasscodeEl.value.trim() : '';
    if (!passcode) {
      this.assistant.notifyError('กรุณากรอก Passcode 4 หลักของปลายทางด้วยนะคะ');
      return;
    }

    // Show loading state
    if (btnConnectEl) {
      btnConnectEl.disabled = true;
      btnConnectEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังส่งคำขอ...';
    }
    this._showStatus('loading', 'กำลังส่งคำขอเชื่อมต่อ รอ Host อนุมัติ...');
    this.assistant.speak('กำลังส่งคำขอเชื่อมต่อ! รอฝั่ง Host กดปุ่มอนุมัตินะคะ...');

    socketService.emit('viewer:verify-passcode', { sessionCode: code, passcode });
  }

  // ──────────────────────────────────────────────────────
  // Socket Event Listeners (registered once)
  // ──────────────────────────────────────────────────────
  _registerSocketEvents() {
    if (this._eventsRegistered) return;
    this._eventsRegistered = true;

    socketService.on('viewer:waiting-host-approval', ({ message }) => {
      this._showStatus('loading', message || 'รอฝั่ง Host กดอนุมัติ...');
      this.assistant.speak(`⏳ ${message}`);
    });

    socketService.on('viewer:connect-approved', ({ sessionCode, permissions }) => {
      this.targetSessionCode = sessionCode;
      this.targetPermissions = permissions || 'full';
      sessionStorage.setItem('orm_viewer_session', JSON.stringify({ sessionCode, permissions: this.targetPermissions }));

      this._showStatus('success', 'Host อนุมัติแล้ว! กำลังเปิดหน้าต่าง Remote Viewer...');
      this.assistant.speak('ฝั่ง Host อนุมัติการเชื่อมต่อแล้วค่ะ! กำลังเปิดหน้าต่างสตรีมมิ่ง...');

      // Initialize WebRTC as Viewer
      rtcService.initWebRTC(sessionCode, false);

      setTimeout(() => {
        this._resetConnectButton();
        this._hideStatus();
        if (this.onConnectSuccess) {
          this.onConnectSuccess(sessionCode, this.targetPermissions);
        }
      }, 600);
    });

    socketService.on('viewer:connect-declined', ({ message }) => {
      this.targetSessionCode = null; // Clear so recovery doesn't re-send
      sessionStorage.removeItem('orm_viewer_session');

      this._showStatus('error', 'ฝั่ง Host ปฏิเสธคำขอเชื่อมต่อค่ะ');
      this._resetConnectButton();

      // Hide passcode field and clear
      const passcodeGroup = document.getElementById('passcode-input-group');
      const inputPasscode = document.getElementById('input-passcode');
      if (passcodeGroup) passcodeGroup.classList.add('hidden');
      if (inputPasscode) inputPasscode.value = '';

      setTimeout(() => this._hideStatus(), 3000);
      this.assistant.notifyError(message || 'ฝั่ง Host ปฏิเสธคำขอเชื่อมต่อค่ะ');
    });

    socketService.on('viewer:connect-error', ({ message }) => {
      this._resetConnectButton();
      this._hideStatus();
      this.assistant.notifyError(message);
    });

    socketService.on('viewer:session-expired', () => {
      this.targetSessionCode = null;
      sessionStorage.removeItem('orm_viewer_session');
      this._resetConnectButton();
      this._hideStatus();
      this.assistant.notifyError('Session หมดอายุแล้วค่ะ กรุณากรอกรหัสใหม่เพื่อเชื่อมต่ออีกครั้ง');
    });

    // Re-attempt recovery when socket reconnects
    socketService.on('status-change', ({ connected }) => {
      if (connected && this.targetSessionCode) {
        socketService.emit('viewer:recover-session', { sessionCode: this.targetSessionCode });
      }
    });
  }
}
