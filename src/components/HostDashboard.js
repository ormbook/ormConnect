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

    if (btnStart) {
      btnStart.addEventListener('click', () => {
        // Generate Instant Local Session Code & Passcode
        const p1 = Math.floor(100 + Math.random() * 900);
        const p2 = Math.floor(100 + Math.random() * 900);
        const p3 = Math.floor(100 + Math.random() * 900);
        const sessionCode = `${p1}-${p2}-${p3}`;
        const passcode = Math.floor(1000 + Math.random() * 9000).toString();

        this.sessionCode = sessionCode;
        this.passcode = passcode;
        this.isHosting = true;

        // Instantly update UI DOM (0ms response time)
        const startPanel = document.getElementById('host-start-panel');
        const activePanel = document.getElementById('host-active-panel');
        if (startPanel) startPanel.classList.add('hidden');
        if (activePanel) activePanel.classList.remove('hidden');

        const dispCode = document.getElementById('display-session-code');
        const dispPass = document.getElementById('display-passcode');
        if (dispCode) dispCode.innerText = sessionCode;
        if (dispPass) dispPass.innerText = passcode;

        // Check for LINE / FB In-App browser on iOS
        const ua = navigator.userAgent || '';
        const isIOS = /iPad|iPhone|iPod/.test(ua);
        const isInApp = /Line|FB_IAB|FB4A|Instagram/i.test(ua);

        if (isIOS && isInApp) {
          this.assistant.speak('💡 **ข้อแนะนำสำหรับ iPhone:** คุณเปิดลิงก์ผ่านแอป LINE/Facebook แนะนำให้กดปุ่ม 3 จุดแล้วเลือก **"Open in Safari (เปิดใน Safari)"** เพื่อให้ระบบรองรับการแชร์หน้าจอมือถือได้ 100% นะคะ');
        }

        const permissions = permSelect ? permSelect.value : 'full';

        // Initialize WebRTC as Host
        rtcService.initWebRTC(sessionCode, true);

        // Register session on server
        socketService.emit('host:create-session', { customSessionCode: sessionCode, customPasscode: passcode, permissions });

        this.assistant.notifySessionCreated(sessionCode, passcode);
      });
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

    socketService.on('host:viewer-joined', async () => {
      document.getElementById('display-host-status').innerText = 'มีคำขอเชื่อมต่อเข้ามา (รอการอนุมัติ)...';
      document.getElementById('display-host-status').style.color = 'var(--accent-amber)';

      if (alertBox) alertBox.classList.remove('hidden');

      // Prompt with Nong Orm Assistant
      this.assistant.notifyIncomingConnection(this.sessionCode, () => {
        handleStartShare();
      });
    });
  }

  stopHosting() {
    if (this.sessionCode) {
      socketService.emit('session:disconnect', { sessionCode: this.sessionCode });
      rtcService.close();
    }
    this.sessionCode = null;
    this.passcode = null;
    this.isHosting = false;

    document.getElementById('host-start-panel').classList.remove('hidden');
    document.getElementById('host-active-panel').classList.add('hidden');
    this.assistant.speak('ปิด Session เรียบร้อยแล้วค่ะ');
  }
}
