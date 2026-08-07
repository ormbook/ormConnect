export class VirtualDesktop {
  constructor(containerId, assistant) {
    this.container = document.getElementById(containerId);
    this.assistant = assistant;
    this.activeApps = new Set(['notepad', 'terminal']);

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="glass-card" style="padding: 1.25rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--primary-cyan);">
              <i class="fa-solid fa-gamepad"></i> โหมดจำลองระบบปฏิบัติการ (Built-in Interactive Remote OS Simulator)
            </h3>
            <p style="font-size: 0.8rem; color: var(--text-muted);">
              ทดสอบลองใช้เมาส์คลิก ลาก วาดรูป และพิมพ์ข้อความในระบบจำลอง Windows OS ได้ทันที!
            </p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <span class="badge badge-emerald"><i class="fa-solid fa-circle"></i> Simulator Online</span>
          </div>
        </div>

        <!-- Simulated OS Container -->
        <div class="sim-os-container" id="sim-desktop-screen">

          <!-- Wallpaper Branding -->
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; opacity: 0.15; pointer-events: none;">
            <i class="fa-solid fa-desktop" style="font-size: 8rem; color: var(--primary-cyan);"></i>
            <h1 style="font-size: 3rem; font-weight: 700; color: #fff; margin-top: 1rem;">ormConnect OS</h1>
          </div>

          <!-- App Window 1: Notepad -->
          <div class="sim-app-window" id="win-notepad" style="top: 40px; left: 40px; width: 380px; height: 260px; z-index: 10;">
            <div class="sim-win-titlebar">
              <span><i class="fa-solid fa-file-lines" style="color: var(--primary-cyan);"></i> Notepad - RemoteText.txt</span>
              <div class="sim-win-controls">
                <span class="sim-win-dot dot-yellow"></span>
                <span class="sim-win-dot dot-green"></span>
                <span class="sim-win-dot dot-red" onclick="document.getElementById('win-notepad').style.display='none'"></span>
              </div>
            </div>
            <div class="sim-win-body" style="padding: 0.5rem; background: #0f172a;">
              <textarea id="sim-notepad-area" style="width: 100%; height: 100%; background: transparent; border: none; color: #38bdf8; font-family: monospace; font-size: 0.9rem; outline: none; resize: none;" 
                        placeholder="พิมพ์ข้อความทดสอบคีย์บอร์ดรีโมทที่นี่..."></textarea>
            </div>
          </div>

          <!-- App Window 2: Interactive Terminal -->
          <div class="sim-app-window" id="win-terminal" style="top: 80px; left: 450px; width: 440px; height: 280px; z-index: 12;">
            <div class="sim-win-titlebar">
              <span><i class="fa-solid fa-terminal" style="color: var(--accent-emerald);"></i> Command Prompt - ormConnect Agent</span>
              <div class="sim-win-controls">
                <span class="sim-win-dot dot-yellow"></span>
                <span class="sim-win-dot dot-green"></span>
                <span class="sim-win-dot dot-red" onclick="document.getElementById('win-terminal').style.display='none'"></span>
              </div>
            </div>
            <div class="sim-win-body" style="background: #090d16; font-family: monospace; font-size: 0.82rem; color: #4ade80;">
              <div>ormConnect Remote Agent v1.0.0 [Windows 11 x64]</div>
              <div>Type 'help', 'systeminfo', 'ping', or 'clear'</div>
              <br>
              <div id="sim-term-output">
                <div>C:\ormConnect> agent status</div>
                <div style="color: #38bdf8;">[OK] WebRTC P2P DataChannel listening...</div>
              </div>
              <div style="display: flex; align-items: center; margin-top: 0.5rem;">
                <span style="color: #f43f5e;">C:\ormConnect&gt;&nbsp;</span>
                <input type="text" id="sim-term-input" style="flex: 1; background: transparent; border: none; color: #fff; font-family: monospace; outline: none;" placeholder="พิมพ์คำสั่ง..." />
              </div>
            </div>
          </div>

          <!-- App Window 3: Paint Canvas -->
          <div class="sim-app-window" id="win-paint" style="top: 240px; left: 120px; width: 460px; height: 310px; z-index: 15;">
            <div class="sim-win-titlebar">
              <span><i class="fa-solid fa-palette" style="color: var(--accent-purple);"></i> Paint - Remote Cursor Drawing Canvas</span>
              <div class="sim-win-controls">
                <span class="sim-win-dot dot-yellow"></span>
                <span class="sim-win-dot dot-green"></span>
                <span class="sim-win-dot dot-red" onclick="document.getElementById('win-paint').style.display='none'"></span>
              </div>
            </div>
            <div class="sim-win-body" style="padding: 0; position: relative; background: #fff;">
              <canvas id="sim-paint-canvas" width="458" height="260" style="cursor: crosshair; display: block;"></canvas>
            </div>
          </div>

          <!-- Taskbar -->
          <div class="sim-taskbar">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <button class="sim-start-btn" title="Start Menu">
                <i class="fa-brands fa-windows"></i>
              </button>
              <button class="btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="document.getElementById('win-notepad').style.display='flex'">
                <i class="fa-solid fa-file-lines"></i> Notepad
              </button>
              <button class="btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="document.getElementById('win-terminal').style.display='flex'">
                <i class="fa-solid fa-terminal"></i> Terminal
              </button>
              <button class="btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="document.getElementById('win-paint').style.display='flex'">
                <i class="fa-solid fa-palette"></i> Paint
              </button>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">
              <i class="fa-solid fa-clock"></i> 11:55 AM | ormConnect OS
            </div>
          </div>

        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Setup Paint Canvas Interactive Drawing
    const canvas = document.getElementById('sim-paint-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      let isDrawing = false;

      // Default canvas background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
      });

      canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
      });

      canvas.addEventListener('mouseup', () => { isDrawing = false; });
      canvas.addEventListener('mouseleave', () => { isDrawing = false; });
    }

    // Terminal Input Handling
    const termInput = document.getElementById('sim-term-input');
    const termOutput = document.getElementById('sim-term-output');

    if (termInput) {
      termInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const cmd = termInput.value.trim().toLowerCase();
          termInput.value = '';

          let response = `C:\\ormConnect> ${cmd}<br>`;
          if (cmd === 'help') {
            response += 'Available commands: agent status, ping, systeminfo, clear';
          } else if (cmd === 'ping') {
            response += 'Pinging 127.0.0.1 with 32 bytes of data:<br>Reply from 127.0.0.1: time<1ms TTL=128 (WebRTC P2P Active)';
          } else if (cmd === 'systeminfo') {
            response += 'Host OS: Windows 11 Pro<br>Processor: x86_64 High-Speed Multi-Core<br>WebRTC Agent: Active';
          } else if (cmd === 'clear') {
            termOutput.innerHTML = '';
            return;
          } else {
            response += `'${cmd}' is not recognized. Type 'help' for commands.`;
          }

          termOutput.innerHTML += `<div>${response}</div>`;
          termOutput.scrollTop = termOutput.scrollHeight;
        }
      });
    }
  }
}
