import { socketService } from '../services/socketService.js';

export class ChatDrawer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.sessionCode = null;
    this.isOpen = false;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div id="chat-drawer" class="drawer-container">
        <div class="drawer-header">
          <span style="font-weight: 700; color: var(--primary-cyan);">
            <i class="fa-solid fa-comments"></i> Remote Chat
          </span>
          <button id="btn-close-chat" class="tool-btn">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div id="chat-messages-box" class="drawer-messages">
          <div class="chat-bubble peer">
            สวัสดีค่ะ! ยินดีต้อนรับสู่ห้องแชทของ Session ormConnect สามารถพิมพ์ข้อความสนทนากันได้ที่นี่ค่ะ
          </div>
        </div>

        <div class="drawer-input-bar">
          <input type="text" id="chat-text-input" class="glass-input" placeholder="พิมพ์ข้อความ..." style="font-size: 0.85rem;" />
          <button id="btn-send-chat" class="btn-primary" style="width: auto; padding: 0.6rem 1rem;">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const btnClose = document.getElementById('btn-close-chat');
    const btnSend = document.getElementById('btn-send-chat');
    const input = document.getElementById('chat-text-input');
    const messagesBox = document.getElementById('chat-messages-box');

    btnClose.addEventListener('click', () => this.toggle(false));

    const sendMessage = () => {
      const text = input.value.trim();
      if (!text || !this.sessionCode) return;

      socketService.emit('chat:message', {
        sessionCode: this.sessionCode,
        sender: 'Me',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      input.value = '';
    };

    btnSend.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    socketService.on('chat:message', ({ sender, text }) => {
      const isMine = sender === 'Me';
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble ${isMine ? 'mine' : 'peer'}`;
      bubble.innerText = text;
      messagesBox.appendChild(bubble);
      messagesBox.scrollTop = messagesBox.scrollHeight;
    });
  }

  toggle(open = null, sessionCode = null) {
    if (sessionCode) this.sessionCode = sessionCode;
    const drawer = document.getElementById('chat-drawer');
    this.isOpen = open !== null ? open : !this.isOpen;
    drawer.classList.toggle('open', this.isOpen);
  }
}
