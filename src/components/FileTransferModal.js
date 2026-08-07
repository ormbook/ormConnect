import { socketService } from '../services/socketService.js';

export class FileTransferModal {
  constructor(containerId, assistant) {
    this.container = document.getElementById(containerId);
    this.assistant = assistant;
    this.sessionCode = null;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div id="file-modal" class="drawer-container">
        <div class="drawer-header">
          <span style="font-weight: 700; color: var(--primary-cyan);">
            <i class="fa-solid fa-folder-open"></i> File Transfer
          </span>
          <button id="btn-close-file" class="tool-btn">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div style="padding: 1.25rem; flex: 1; display: flex; flex-direction: column; gap: 1rem;">
          <div style="border: 2px dashed var(--border-active); border-radius: 12px; padding: 2rem 1rem; text-align: center; background: rgba(0,240,255,0.03);">
            <i class="fa-solid fa-cloud-arrow-up" style="font-size: 2.5rem; color: var(--primary-cyan); margin-bottom: 0.5rem;"></i>
            <p style="font-size: 0.9rem; font-weight: 600;">เลือกไฟล์ที่ต้องการส่ง</p>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 1rem;">รองรับทุกนามสกุลไฟล์ ขนาดไม่เกิน 500 MB</p>
            <input type="file" id="file-input-element" style="display: none;" />
            <button id="btn-select-file" class="btn-secondary" style="width: auto; margin: 0 auto;">
              <i class="fa-solid fa-plus"></i> เลือกไฟล์
            </button>
          </div>

          <div id="file-transfer-status" class="hidden" style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px;">
            <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.4rem;" id="file-name-label">
              Sending file...
            </div>
            <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
              <div id="file-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--primary-cyan), var(--accent-emerald)); transition: width 0.3s ease;"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const btnClose = document.getElementById('btn-close-file');
    const btnSelect = document.getElementById('btn-select-file');
    const fileInput = document.getElementById('file-input-element');

    btnClose.addEventListener('click', () => this.toggle(false));
    btnSelect.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file || !this.sessionCode) return;

      document.getElementById('file-transfer-status').classList.remove('hidden');
      document.getElementById('file-name-label').innerText = `กำลังส่ง: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;

      // Simulate Chunked Upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        document.getElementById('file-progress-bar').style.width = `${progress}%`;
        if (progress >= 100) {
          clearInterval(interval);
          this.assistant.speak(`ส่งไฟล์ ${file.name} สำเร็จเรียบร้อยค่ะ!`);
          setTimeout(() => {
            document.getElementById('file-transfer-status').classList.add('hidden');
          }, 2000);
        }
      }, 300);
    });
  }

  toggle(open = null, sessionCode = null) {
    if (sessionCode) this.sessionCode = sessionCode;
    const modal = document.getElementById('file-modal');
    const isOpen = open !== null ? open : !modal.classList.contains('open');
    modal.classList.toggle('open', isOpen);
  }
}
