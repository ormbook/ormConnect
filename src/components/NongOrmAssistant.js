export class NongOrmAssistant {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentText = "สวัสดีค่ะ! น้องออมเป็นเลขาผู้ช่วยส่วนตัวพร้อมช่วยคุณเชื่อมต่อหน้าจอระยะไกลค่ะ ✨";
    this.currentAction = null;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="nong-orm-widget">
        <div class="nong-orm-dialogue" id="nong-orm-box">
          <div class="nong-orm-name">
            <i class="fa-solid fa-sparkles"></i> เลขาผู้ช่วย (น้องออม)
          </div>
          <div class="nong-orm-text" id="nong-orm-text-content">
            ${this.currentText}
          </div>
          <div id="nong-orm-action-area"></div>
        </div>

        <div class="nong-orm-avatar-wrap" id="nong-orm-avatar-btn" title="คลิกเพื่อคุยกับน้องออม">
          <img src="/nong_orm.jpg" alt="น้องออม AI Assistant" class="nong-orm-avatar" />
          <span class="nong-orm-badge"></span>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const avatarBtn = document.getElementById('nong-orm-avatar-btn');
    const dialogueBox = document.getElementById('nong-orm-box');

    avatarBtn.addEventListener('click', () => {
      dialogueBox.classList.toggle('hidden');
    });
  }

  speak(text, actionBtnText = null, onActionClick = null) {
    this.currentText = text;
    const textEl = document.getElementById('nong-orm-text-content');
    const actionArea = document.getElementById('nong-orm-action-area');
    const dialogueBox = document.getElementById('nong-orm-box');

    if (dialogueBox) dialogueBox.classList.remove('hidden');

    if (textEl) {
      textEl.innerHTML = text;
    }

    if (actionArea) {
      if (actionBtnText && onActionClick) {
        actionArea.innerHTML = `
          <button class="nong-orm-action-btn" id="nong-orm-btn-act">
            <i class="fa-solid fa-bolt"></i> ${actionBtnText}
          </button>
        `;
        document.getElementById('nong-orm-btn-act').addEventListener('click', () => {
          onActionClick();
        });
      } else {
        actionArea.innerHTML = '';
      }
    }
  }

  notifySessionCreated(code, passcode) {
    const text = `น้องออมสร้าง Session <b>${code}</b> เรียบร้อยค่ะ!<br>รหัสผ่านชั่วคราวคือ <b>${passcode}</b> ส่งรหัสนี้ให้เพื่อนเพื่อเริ่มเชื่อมต่อได้เลยนะคะ 🚀`;
    this.speak(text, 'คัดลอกรหัสส่งให้เพื่อน', () => {
      navigator.clipboard.writeText(`ormConnect Remote ID: ${code} | Passcode: ${passcode}`);
      this.speak('คัดลอกรหัสเรียบร้อยแล้วค่ะ! ส่งทาง Line หรือ Chat ได้เลยนะคะ 👍');
    });
  }

  notifyIncomingConnection(sessionCode, onApprove) {
    const text = `มีเพื่อนขอเชื่อมต่อเข้ามายัง Session <b>${sessionCode}</b> ค่ะ น้องออมขออนุญาตให้เข้าควบคุมหน้าจอนะคะ?`;
    this.speak(text, 'อนุมัติการเชื่อมต่อ', () => {
      if (onApprove) onApprove();
      this.speak('อนุมัติเรียบร้อยค่ะ! กำลังเริ่มสตรีมหน้าจอ...');
    });
  }

  notifyError(msg) {
    this.speak(`⚠️ แจ้งเตือนจากน้องออม: ${msg}`);
  }
}
