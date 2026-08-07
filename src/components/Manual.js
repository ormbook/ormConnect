export class Manual {
  constructor(containerId, assistant) {
    this.container = document.getElementById(containerId);
    this.assistant = assistant;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="manual-header">
        <h1 class="manual-hero-title">
          <i class="fa-solid fa-book-open"></i> คู่มือการใช้งาน ormConnect
        </h1>
        <p class="manual-hero-desc">
          เรียนรู้วิธีการแชร์หน้าจอ เชื่อมต่อควบคุมเครื่องปลายทาง และระบบรักษาความปลอดภัยกับเลขาผู้ช่วย น้องออม
        </p>
      </div>

      <!-- Step Cards Grid -->
      <div class="manual-grid">
        <!-- Step 1: Start Sharing -->
        <div class="manual-card">
          <div class="manual-img-wrap">
            <span class="manual-step-badge">ขั้นตอนที่ 1</span>
            <img src="/manual_host.jpg" alt="แชร์หน้าจอ Host My PC" class="manual-img" />
          </div>
          <div class="manual-card-body">
            <h3 class="manual-card-title">1. สร้าง Session แชร์หน้าจอ</h3>
            <p class="manual-card-text">
              กดปุ่ม <b>"เริ่มสร้าง Session"</b> ที่ฝั่งแชร์หน้าจอ ระบบจะสร้าง <b>Session ID 9 หลัก</b> และ <b>Passcode ชั่วคราว</b> ขึ้นมาบนหน้าจอของคุณ
            </p>
            <div class="nong-orm-tip">
              <i class="fa-solid fa-sparkles"></i>
              <span><b>คำแนะนำจากน้องออม:</b> คุณสามารถคลิกปุ่ม "คัดลอกรหัส" เพื่อส่งต่อให้เพื่อนผ่าน LINE หรือ Facebook Messenger ได้ทันทีค่ะ!</span>
            </div>
          </div>
        </div>

        <!-- Step 2: Connect Remote -->
        <div class="manual-card">
          <div class="manual-img-wrap">
            <span class="manual-step-badge">ขั้นตอนที่ 2</span>
            <img src="/manual_viewer.jpg" alt="เชื่อมต่อควบคุมปลายทาง" class="manual-img" />
          </div>
          <div class="manual-card-body">
            <h3 class="manual-card-title">2. ใส่ ID 9 หลักและ Passcode</h3>
            <p class="manual-card-text">
              ฝั่งคนควบคุมนำ <b>Session ID 9 หลัก</b> มากรอกในช่อง <i>"Connect Remote PC"</i> แล้วกด Connect จากนั้นใส่ Passcode 4 หลักเพื่อยืนยันสิทธิ์
            </p>
            <div class="nong-orm-tip">
              <i class="fa-solid fa-shield-halved"></i>
              <span><b>ความปลอดภัย:</b> รหัส Passcode จะสุ่มใหม่ทุกครั้งที่เปิดโปรแกรม มั่นใจได้ว่าไม่มีใครแอบเข้าควบคุมซ้ำค่ะ!</span>
            </div>
          </div>
        </div>

        <!-- Step 3: Remote Control & Shortcuts -->
        <div class="manual-card">
          <div class="manual-img-wrap">
            <span class="manual-step-badge">ขั้นตอนที่ 3</span>
            <img src="/manual_viewer.jpg" alt="ควบคุมรีโมทและคีย์บอร์ดลัด" class="manual-img" />
          </div>
          <div class="manual-card-body">
            <h3 class="manual-card-title">3. ควบคุมเมาส์ คีย์บอร์ด และส่งไฟล์</h3>
            <p class="manual-card-text">
              เมื่อเชื่อมต่อสำเร็จ หน้าจอปลายทางจะปรากฏแบบเต็มจอเรียลไทม์ 60 FPS คุณสามารถขยับเมาส์ คลิก พิมพ์ข้อความ แชท และส่งไฟล์ได้ทันที
            </p>
            <div class="nong-orm-tip">
              <i class="fa-solid fa-bolt"></i>
              <span><b>ปุ่มคีย์บอร์ดพิเศษ:</b> ใช้แถบ Toolbar ด้านบนส่งคำสั่งพิเศษ เช่น <code>Ctrl+Alt+Del</code> หรือ <code>Alt+Tab</code> ได้สะดวกมากๆ ค่ะ!</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Video Walkthrough & Interactive Demo Player -->
      <div class="manual-video-section">
        <h2 style="font-size: 1.4rem; font-weight: 700; color: var(--primary-cyan); margin-bottom: 0.5rem;">
          <i class="fa-solid fa-circle-play"></i> วิดีโอสาธิตการใช้งานจริง (Interactive Video Walkthrough)
        </h2>
        <p style="font-size: 0.9rem; color: var(--text-muted);">
          ชมวิดีโอจำลองกระบวนการเชื่อมต่อ 9-Digit ID และการควบคุมหน้าจอข้ามเครื่อง
        </p>

        <div class="video-container">
          <canvas id="manual-demo-canvas" class="demo-interactive-canvas"></canvas>
          <div style="position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%); background: rgba(15,23,42,0.85); padding: 0.5rem 1.25rem; border-radius: 20px; font-size: 0.85rem; color: var(--primary-cyan); border: 1px solid var(--border-glass);">
            <i class="fa-solid fa-clapperboard"></i> กำลังเล่นวิดีโอสาธิตการใช้งาน ormConnect (Loop Demo)
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.startVideoAnimation();
  }

  bindEvents() {
    // Add interactions if needed
  }

  startVideoAnimation() {
    const canvas = document.getElementById('manual-demo-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 850;
    canvas.height = 480;

    let frame = 0;
    let cursorX = 100;
    let cursorY = 200;

    const animate = () => {
      frame++;
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Mock Desktop Windows
      ctx.fillStyle = '#1e293b';
      ctx.roundRect(40, 40, 770, 400, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.stroke();

      // Title bar
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(40, 40, 770, 40);
      ctx.fillStyle = '#00f0ff';
      ctx.font = '700 16px Outfit, sans-serif';
      ctx.fillText('ormConnect Remote Session [ID: 384-912-705] - 60 FPS', 60, 66);

      // Simulated Screen Contents
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(70, 100, 340, 220);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '14px monospace';
      ctx.fillText('> Host: Windows 11 Desktop', 85, 130);
      ctx.fillText('> Status: Connected via WebRTC', 85, 155);
      ctx.fillText('> Latency: 12ms (P2P Low Latency)', 85, 180);

      // Animated Mouse Cursor moving
      const angle = frame * 0.05;
      cursorX = 400 + Math.sin(angle) * 180;
      cursorY = 240 + Math.cos(angle * 0.8) * 100;

      // Draw Cursor
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(cursorX, cursorY, 8, 0, Math.PI * 2);
      ctx.fill();

      // Cursor Ripple effect
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cursorX, cursorY, 12 + (frame % 20), 0, Math.PI * 2);
      ctx.stroke();

      requestAnimationFrame(animate);
    };

    animate();
  }
}
