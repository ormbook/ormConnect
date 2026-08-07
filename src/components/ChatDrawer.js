import { socketService } from '../services/socketService.js';

export class ChatDrawer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.sessionCode = null;
    this.isOpen = false;
    this.myId = Math.random().toString(36).substr(2, 8); // Unique sender ID per session

    this.render();
    this._registerSocketEvents();
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
          <input type="text" id="chat-text-input" class="glass-input" placeholder="พิมพ์ข้อความ... (Enter เพื่อส่ง)" style="font-size: 0.85rem;" />
          <button id="btn-send-chat" class="btn-primary" style="width: auto; padding: 0.6rem 1rem;">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </div>
      </div>
    `;

    this._bindButtonEvents();
  }

  _bindButtonEvents() {
    const btnClose = document.getElementById('btn-close-chat');
    const btnSend = document.getElementById('btn-send-chat');
    const input = document.getElementById('chat-text-input');

    btnClose?.addEventListener('click', () => this.toggle(false));

    const sendMessage = () => {
      const text = input.value.trim();
      if (!text || !this.sessionCode) {
        if (!this.sessionCode) {
          this._appendMessage('System', 'ยังไม่ได้เชื่อมต่อ Session ค่ะ', 'peer');
        }
        return;
      }

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Show own message immediately
      this._appendMessage('Me', text, 'mine', timestamp);
      input.value = '';

      socketService.emit('chat:message', {
        sessionCode: this.sessionCode,
        senderId: this.myId,
        sender: 'Peer',
        text,
        timestamp
      });
    };

    btnSend?.addEventListener('click', sendMessage);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  _appendMessage(sender, text, type, timestamp = '') {
    const messagesBox = document.getElementById('chat-messages-box');
    if (!messagesBox) return;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type}`;
    bubble.innerHTML = `
      <span style="display: block; font-size: 0.75rem; opacity: 0.6; margin-bottom: 2px;">${sender}${timestamp ? ' · ' + timestamp : ''}</span>
      ${text}
    `;
    messagesBox.appendChild(bubble);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  _registerSocketEvents() {
    socketService.on('chat:message', ({ sender, text, timestamp }) => {
      this._appendMessage(sender || 'Peer', text, 'peer', timestamp);
      // Auto-open drawer if closed when message arrives
      if (!this.isOpen) {
        const drawer = document.getElementById('chat-drawer');
        const badge = document.createElement('span');
        badge.style.cssText = 'display:inline-block;width:8px;height:8px;background:#f43f5e;border-radius:50%;margin-left:4px;animation:pulse-ring 1.5s infinite;';
        badge.id = 'chat-notif-dot';
        if (drawer && !document.getElementById('chat-notif-dot')) {
          drawer.querySelector('.drawer-header span')?.appendChild(badge);
        }
      }
    });
  }

  toggle(open = null, sessionCode = null) {
    if (sessionCode) this.sessionCode = sessionCode;
    const drawer = document.getElementById('chat-drawer');
    this.isOpen = open !== null ? open : !this.isOpen;
    drawer?.classList.toggle('open', this.isOpen);

    // Remove notification dot when opened
    if (this.isOpen) {
      document.getElementById('chat-notif-dot')?.remove();
    }

    // Focus input when opened
    if (this.isOpen) {
      setTimeout(() => document.getElementById('chat-text-input')?.focus(), 150);
    }
  }
}
