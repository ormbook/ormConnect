import { socketService } from '../services/socketService.js';
import { rtcService } from '../services/rtcService.js';

export class ConnectForm {
  constructor(containerId, assistant, onConnectSuccess) {
    this.container = document.getElementById(containerId);
    this.assistant = assistant;
    this.onConnectSuccess = onConnectSuccess;
    this.targetSessionCode = null;

    this.render();
  }

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

            <!-- Passcode Input (Hidden until required) -->
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

          <!-- Recent Connections History -->
          <div style="margin-top: 2rem; border-top: 1px solid var(--border-glass); padding-top: 1rem;">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">
              <i class="fa-solid fa-history"></i> ประวัติการเชื่อมต่อล่าสุด
            </span>
            <div id="recent-connections-list" style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
              <span class="badge badge-cyan" style="cursor: pointer;" onclick="document.getElementById('input-session-code').value='384-912-705'">
                384-912-705 (Demo PC)
              </span>
            </div>
          </div>
        </div>
      `;
    }

    this.bindEvents();
  }

  bindEvents() {
    const inputCode = document.getElementById('input-session-code');
    const inputPasscode = document.getElementById('input-passcode');
    const btnConnect = document.getElementById('btn-connect-remote');
    const passcodeGroup = document.getElementById('passcode-input-group');

    // Auto-hyphen formatting for 9-digit code: XXX-XXX-XXX
    inputCode.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val.length > 9) val = val.substring(0, 9);
      
      let formatted = val;
      if (val.length > 3 && val.length <= 6) {
        formatted = `${val.substring(0, 3)}-${val.substring(3)}`;
      } else if (val.length > 6) {
        formatted = `${val.substring(0, 3)}-${val.substring(3, 6)}-${val.substring(6)}`;
      }
      e.target.value = formatted;
    });

    window.submitConnectRemote = () => {
      console.log('[ConnectForm] submitConnectRemote triggered!');
      const inputCodeEl = document.getElementById('input-session-code');
      const inputPasscodeEl = document.getElementById('input-passcode');
      const passcodeGroupEl = document.getElementById('passcode-input-group');
      const statusBoxEl = document.getElementById('viewer-status-card');
      const btnConnectEl = document.getElementById('btn-connect-remote');

      const code = inputCodeEl ? inputCodeEl.value.trim() : '';
      if (!code) {
        if (this.assistant) this.assistant.notifyError('กรุณากรอก Session ID 9 หลักก่อนนะคะ');
        return;
      }

      if (passcodeGroupEl && passcodeGroupEl.classList.contains('hidden')) {
        // Step 1: Reveal passcode group instantly and request connect
        this.targetSessionCode = code;
        passcodeGroupEl.classList.remove('hidden');
        if (inputPasscodeEl) inputPasscodeEl.focus();
        socketService.emit('viewer:request-connect', { sessionCode: code });
        if (this.assistant) this.assistant.speak(`พบ Session <b>${code}</b> แล้วค่ะ! กรุณากรอก Passcode 4 หลักแล้วกด Connect นะคะ`);
      } else {
        // Step 2: Submit passcode
        const passcode = inputPasscodeEl ? inputPasscodeEl.value.trim() : '';
        if (!passcode) {
          if (this.assistant) this.assistant.notifyError('กรุณากรอก Passcode ด้วยนะคะ');
          return;
        }

        // Show Instant Waiting Card & Loading Spinner
        if (btnConnectEl) {
          btnConnectEl.disabled = true;
          btnConnectEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังส่งคำขอไปยัง Host...';
        }
        if (statusBoxEl) {
          statusBoxEl.classList.remove('hidden');
          statusBoxEl.innerHTML = `
            <i class="fa-solid fa-clock fa-spin" style="color: var(--primary-cyan); font-size: 1.6rem; margin-bottom: 0.5rem;"></i>
            <div style="font-size: 1rem; font-weight: 700; color: #fff;">ส่งคำขอเชื่อมต่อสำเร็จแล้วค่ะ!</div>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.3rem;">กำลังรอให้ฝั่ง Host กดปุ่ม "อนุมัติ & เริ่มแชร์หน้าจอ"</p>
          `;
        }

        socketService.emit('viewer:verify-passcode', {
          sessionCode: this.targetSessionCode || code,
          passcode
        });
        if (this.assistant) this.assistant.speak('กำลังส่งคำขอเชื่อมต่อ! รอฝั่ง Host กดปุ่มอนุมัตินะคะ...');
      }
    };

    if (btnConnect) {
      btnConnect.addEventListener('click', window.submitConnectRemote);
    }

    // Socket Response Events
    socketService.on('viewer:require-passcode', () => {
      if (passcodeGroup) passcodeGroup.classList.remove('hidden');
      if (inputPasscode) inputPasscode.focus();
      this.assistant.speak('พบ Session แล้วค่ะ! กรุณากรอกรหัสผ่าน Passcode 4 หลักของเพื่อนลงในช่องด้านล่างแล้วกด Connect นะคะ');
    });

    socketService.on('viewer:waiting-host-approval', ({ message }) => {
      if (this.assistant) this.assistant.speak(`⏳ ${message}`);
    });

    socketService.on('viewer:connect-approved', ({ sessionCode, permissions }) => {
      const btnConnectEl = document.getElementById('btn-connect-remote');
      const statusBoxEl = document.getElementById('viewer-status-card');

      if (statusBoxEl) {
        statusBoxEl.innerHTML = `
          <i class="fa-solid fa-circle-check" style="color: var(--accent-emerald); font-size: 1.6rem; margin-bottom: 0.5rem;"></i>
          <div style="font-size: 1rem; font-weight: 700; color: var(--accent-emerald);">Host อนุมัติแล้ว!</div>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.3rem;">กำลังเปิดหน้าต่าง Remote Viewer...</p>
        `;
      }

      this.assistant.speak('ฝั่ง Host อนุมัติการเชื่อมต่อแล้วค่ะ! กำลังเปิดหน้าต่างสตรีมมิ่ง...');
      
      // Initialize WebRTC as Viewer
      rtcService.initWebRTC(sessionCode, false);

      setTimeout(() => {
        if (btnConnectEl) {
          btnConnectEl.disabled = false;
          btnConnectEl.innerHTML = '<i class="fa-solid fa-plug"></i> เชื่อมต่อเข้าควบคุม (Connect)';
        }
        if (statusBoxEl) statusBoxEl.classList.add('hidden');

        if (this.onConnectSuccess) {
          this.onConnectSuccess(sessionCode, permissions);
        }
      }, 600);
    });

    socketService.on('viewer:connect-declined', ({ message }) => {
      const btnConnectEl = document.getElementById('btn-connect-remote');
      const statusBoxEl = document.getElementById('viewer-status-card');

      if (btnConnectEl) {
        btnConnectEl.disabled = false;
        btnConnectEl.innerHTML = '<i class="fa-solid fa-plug"></i> เชื่อมต่อเข้าควบคุม (Connect)';
      }
      if (statusBoxEl) {
        statusBoxEl.innerHTML = `
          <i class="fa-solid fa-circle-xmark" style="color: var(--accent-rose); font-size: 1.6rem; margin-bottom: 0.5rem;"></i>
          <div style="font-size: 1rem; font-weight: 700; color: var(--accent-rose);">ฝั่ง Host ปฏิเสธคำขอเชื่อมต่อค่ะ</div>
        `;
        setTimeout(() => {
          statusBoxEl.classList.add('hidden');
        }, 3000);
      }

      if (passcodeGroup) passcodeGroup.classList.add('hidden');
      if (inputPasscode) inputPasscode.value = '';
      this.assistant.notifyError(message || 'ฝั่ง Host ปฏิเสธคำขอเชื่อมต่อค่ะ');
    });

    socketService.on('viewer:connect-error', ({ message }) => {
      const btnConnectEl = document.getElementById('btn-connect-remote');
      const statusBoxEl = document.getElementById('viewer-status-card');

      if (btnConnectEl) {
        btnConnectEl.disabled = false;
        btnConnectEl.innerHTML = '<i class="fa-solid fa-plug"></i> เชื่อมต่อเข้าควบคุม (Connect)';
      }
      if (statusBoxEl) statusBoxEl.classList.add('hidden');
      this.assistant.notifyError(message);
    });
  }
}
