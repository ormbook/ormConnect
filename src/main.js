import { socketService } from './services/socketService.js';
import { NongOrmAssistant } from './components/NongOrmAssistant.js';
import { HostDashboard } from './components/HostDashboard.js';
import { ConnectForm } from './components/ConnectForm.js';
import { RemoteViewer } from './components/RemoteViewer.js';
import { Manual } from './components/Manual.js';
import { ChatDrawer } from './components/ChatDrawer.js';
import { FileTransferModal } from './components/FileTransferModal.js';

class App {
  constructor() {
    this.assistant = null;
    this.hostDashboard = null;
    this.connectForm = null;
    this.remoteViewer = null;
    this.manual = null;
    this.chatDrawer = null;
    this.fileTransferModal = null;

    this.init();
  }

  init() {
    console.log('🚀 Initializing ormConnect Application...');

    // 1. Connect Socket Signaling Service
    socketService.connect();

    // 2. Initialize Nong Orm AI Assistant
    this.assistant = new NongOrmAssistant('nong-orm-widget-container');

    // 3. Initialize Modals & Drawers
    this.chatDrawer = new ChatDrawer('chat-drawer-container');
    this.fileTransferModal = new FileTransferModal('file-transfer-modal-container', this.assistant);

    // 4. Initialize Remote Viewer Window
    this.remoteViewer = new RemoteViewer(
      'remote-viewer-overlay',
      this.assistant,
      () => this.chatDrawer.toggle(),
      () => this.fileTransferModal.toggle()
    );

    // 5. Initialize Connect Dashboard components
    this.hostDashboard = new HostDashboard('host-dashboard-container', this.assistant);
    this.connectForm = new ConnectForm('connect-form-container', this.assistant, (sessionCode, permissions) => {
      this.remoteViewer.openSession(sessionCode, permissions);
      this.chatDrawer.sessionCode = sessionCode;
      this.fileTransferModal.sessionCode = sessionCode;
    });

    // 6. Initialize Manual
    this.manual = new Manual('manual-container', this.assistant);

    // 7. Navigation Tabs Router
    this.setupNavigation();

    // 8. Socket Connection Status Listener
    socketService.on('status-change', ({ connected }) => {
      const statusText = document.getElementById('socket-status-text');
      const indicator = document.querySelector('.status-indicator');
      if (connected) {
        if (statusText) statusText.innerText = 'พร้อมใช้งาน (Online)';
        if (indicator) {
          indicator.className = 'status-indicator online';
        }
      } else {
        if (statusText) statusText.innerText = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (Offline)';
        if (indicator) {
          indicator.className = 'status-indicator offline';
        }
      }
    });
  }

  setupNavigation() {
    const navConnect = document.getElementById('nav-connect');
    const navManual = document.getElementById('nav-manual');

    const secConnect = document.getElementById('section-connect');
    const secManual = document.getElementById('section-manual');

    const switchTab = (activeNav, activeSec, assistantMsg) => {
      [navConnect, navManual].forEach(btn => btn.classList.remove('active'));
      [secConnect, secManual].forEach(sec => sec.classList.remove('active'));

      activeNav.classList.add('active');
      activeSec.classList.add('active');

      this.assistant.speak(assistantMsg);
    };

    navConnect.addEventListener('click', () => {
      switchTab(navConnect, secConnect, 'ยินดีต้อนรับสู่หน้าควบคุมรีโมทค่ะ! คุณสามารถสร้างรหัสแชร์หน้าจอ หรือใส่รหัส ID 9 หลักเพื่อเชื่อมต่อได้เลยนะคะ');
    });

    navManual.addEventListener('click', () => {
      switchTab(navManual, secManual, 'หน้าคู่มือการใช้งาน ormConnect ค่ะ! น้องออมเตรียมขั้นตอน รูปภาพประกอบ และวิดีโอสาธิตไว้ให้เรียบร้อยแล้วค่ะ');
    });
  }
}

// Launch application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
