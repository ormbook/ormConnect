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

    btnConnect.addEventListener('click', () => {
      const code = inputCode.value.trim();
      if (!code) {
        return this.assistant.notifyError('กรุณากรอก Session ID 9 หลักก่อนนะคะ');
      }

      if (passcodeGroup.classList.contains('hidden')) {
        // Step 1: Submit code to check if session exists
        this.targetSessionCode = code;
        socketService.emit('viewer:request-connect', { sessionCode: code });
        this.assistant.speak(`น้องออมกำลังค้นหา Session ID <b>${code}</b>...`);
      } else {
        // Step 2: Submit passcode
        const passcode = inputPasscode.value.trim();
        if (!passcode) {
          return this.assistant.notifyError('กรุณากรอก Passcode ด้วยนะคะ');
        }
        socketService.emit('viewer:verify-passcode', {
          sessionCode: this.targetSessionCode,
          passcode
        });
      }
    });

    // Socket Response Events
    socketService.on('viewer:require-passcode', () => {
      passcodeGroup.classList.remove('hidden');
      inputPasscode.focus();
      this.assistant.speak('พบ Session แล้วค่ะ! กรุณากรอกรหัสผ่าน Passcode 4 หลักของเพื่อนลงในช่องด้านล่างแล้วกด Connect นะคะ');
    });

    socketService.on('viewer:waiting-host-approval', ({ message }) => {
      this.assistant.speak(`⏳ ${message}`);
    });

    socketService.on('viewer:connect-approved', ({ sessionCode, permissions }) => {
      this.assistant.speak('ฝั่ง Host อนุมัติการเชื่อมต่อแล้วค่ะ! กำลังเปิดหน้าต่างสตรีมมิ่ง...');
      
      // Initialize WebRTC as Viewer
      rtcService.initWebRTC(sessionCode, false);

      if (this.onConnectSuccess) {
        this.onConnectSuccess(sessionCode, permissions);
      }
    });

    socketService.on('viewer:connect-declined', ({ message }) => {
      passcodeGroup.classList.add('hidden');
      inputPasscode.value = '';
      this.assistant.notifyError(message || 'ฝั่ง Host ปฏิเสธคำขอเชื่อมต่อค่ะ');
    });

    socketService.on('viewer:connect-error', ({ message }) => {
      this.assistant.notifyError(message);
    });
  }
}
