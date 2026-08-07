# 🚀 ormConnect - Remote Desktop & AI Secretary Nong Orm

<p align="center">
  <img src="public/nong_orm.jpg" width="140" alt="Nong Orm AI Assistant" style="border-radius: 50%; border: 3px solid #00f0ff;" />
  <br>
  <b>ormConnect</b> คือระบบควบคุมหน้าต่างคอมพิวเตอร์ระยะไกลแบบเรียลไทม์ (TeamViewer / AnyDesk Clone) ผ่าน WebRTC และ WebSockets <br>
  ทำงานบนเว็บแบบ <b>Zero-Installation</b> พร้อมดีไซน์ Glassmorphic สไตล์โมเดิร์น และมีเลขาผู้ช่วยดิจิทัล <b>"น้องออม (Nong Orm)"</b> คอยดูแล
</p>

<p align="center">
  <a href="#-feature-comparison"><img src="https://img.shields.io/badge/License-MIT-brightgreen.svg" alt="License MIT"></a>
  <a href="#-features"><img src="https://img.shields.io/badge/WebRTC-P2P_Stream-blue.svg" alt="WebRTC"></a>
  <a href="#-features"><img src="https://img.shields.io/badge/UI-Dark_Glassmorphism-purple.svg" alt="UI"></a>
  <a href="#-features"><img src="https://img.shields.io/badge/AI_Assistant-Nong_Orm-cyan.svg" alt="Nong Orm"></a>
</p>

---

## 🌟 ฟีเจอร์หลัก (Key Features)

1. **👩‍💼 ผู้ช่วยส่วนตัว "น้องออม" (Nong Orm AI Secretary)**:
   - คอยต้อนรับ แนะนำวิธีใส่รหัส ช่วยคัดลอกรหัสใน 1-Click และแจ้งเตือนความปลอดภัยเมื่อมีผู้ขอเชื่อมต่อ
2. **🔑 ระบบ 9-Digit Session ID & Temporary Passcode**:
   - สุ่ม ID 9 หลัก (เช่น `384-912-705`) และ Passcode 4 หลัก สุ่มใหม่ทุกครั้งเพื่อความปลอดภัยสูงสุด
3. **⚡ สตรีมมิ่งวิดีโอ & รีโมทคอนโทรลความเร็วสูง (WebRTC P2P)**:
   - สตรีมภาพหน้าจอ 60 FPS ความละเอียดสูงผ่านโปรโตคอล WebRTC Hardware-Accelerated
   - ส่งเหตุการณ์เมาส์ (Coordinates scaling) และ คีย์บอร์ด (Keydown, Keyup, Shortcuts) แบบ Real-time
4. **🎯 โหมดจำลองระบบปฏิบัติการ (Built-in OS Simulator)**:
   - สามารถทดสอบการควบคุมเมาส์ คลิก พิมพ์ข้อความ วาดรูป ในระบบจำลอง Windows บนเบราว์เซอร์เดียวได้ทันที
5. **📖 Web Manual & Video Walkthrough**:
   - คู่มือออนไลน์พร้อมรูปภาพประกอบ และวิดีโอสาธิตการใช้งานจริงแบบโต้ตอบได้
6. **💬 Remote Chat & File Transfer**:
   - พูดคุยแชตสดระหว่างเครื่องคุณกับเครื่องเพื่อน และรับส่งไฟล์ความเร็วสูง

---

## 📊 ตารางเปรียบเทียบฟีเจอร์ (Feature Comparison)

| คุณสมบัติ (Feature) | **ormConnect** 🚀 | **TeamViewer** 🔵 | **AnyDesk** 🔴 |
| :--- | :---: | :---: | :---: |
| **การติดตั้ง (Installation)** | **ไม่ต้องติดตั้ง** (ใช้งานผ่าน Web Browser ได้ทันที) | ต้องดาวน์โหลด & ติดตั้งโปรแกรม | ต้องดาวน์โหลด & ติดตั้งโปรแกรม |
| **ผู้ช่วยส่วนตัว (AI Assistant)** | **มี "น้องออม (Nong Orm)" คอยช่วยเหลือ** 👩‍💼 | ไม่มี | ไม่มี |
| **คู่มือการใช้งาน (Manual & Video)** | **มี Web Manual + รูปภาพ & วิดีโอสาธิต** 📖 | เอกสาร PDF | เอกสาร Help Center |
| **โปรโตคอลสตรีมมิ่งภาพ** | **WebRTC P2P** (ความเร็วสูง มี Hardware Accelerate) | Proprietary TV Protocol | DeskRT Proprietary Protocol |
| **ระบบเชื่อมต่อ (Session ID)** | **9-Digit ID + Passcode** | 9-10 Digit ID + Password | 9-Digit Address + Password |
| **โหมดจำลอง (Interactive OS Simulator)** | **มี (Built-in Simulator)** 🎯 *(ทดสอบควบคุมได้ทันทีในหน้าต่างเดียว)* | ไม่มี | ไม่มี |
| **การควบคุม เมาส์ & คีย์บอร์ด** | Real-time WebRTC DataChannel | Custom Input Driver | Custom Input Driver |
| **คีย์บอร์ดลัด (Shortcuts)** | Ctrl+Alt+Del, Alt+Tab, Win Key | มี | มี |
| **ระบบแชท (Remote Chat)** | มี (Real-time WebSockets/RTC) | มี | มี |
| **ระบบรับส่งไฟล์ (File Transfer)** | มี (Chunked ArrayBuffer Transfer) | มี | มี |
| **ความปลอดภัย & ความเป็นส่วนตัว** | DTLS / SRTP & TLS Encryption | RSA 2048 / AES 256 | TLS 1.2 / RSA 2048 |
| **ค่าใช้จ่าย (Cost/License)** | **100% ฟรี & Open-Source** | มีค่าบริการรายเดือน (สำหรับธุรกิจ) | มีค่าบริการรายเดือน (สำหรับธุรกิจ) |

---

## 🚀 วิธีการรันโปรเจกต์ (Quick Start)

### 🐳 รันด้วย Docker (แนะนำ - ง่ายที่สุดด้วยคำสั่งเดียว)

```bash
docker-compose up -d --build
```
เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

---

### 💻 รันแบบ Local Development (Node.js)

1. **ติดตั้ง Dependencies**:
```bash
npm install
```

2. **รันแอปพลิเคชัน**:
```bash
# Terminal 1: Backend Signaling Server
node server.js

# Terminal 2: Frontend Vite
npm run dev
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:5173` หรือ `http://localhost:3000`

---

## 🌐 การนำขึ้น Production (GitHub & Deployment)

- **Frontend Deployment**: นำโฟลเดอร์ขึ้น **Vercel** หรือ **Netlify** (ได้ SSL HTTPS ฟรีทันที ซึ่งจำเป็นสำหรับการเรียกใช้ Screen Sharing API)
- **Backend Deployment**: Deploy `server.js` ขึ้น **Render.com** หรือ **Railway.app** (รองรับ Node.js WebSocket 24 ชม.)

---

## 🛡️ ความปลอดภัยและข้อตกลงการใช้งาน (Security & Disclaimer)

1. **End-to-End Encryption**: สตรีมวิดีโอและคำสั่งทั้งหมดเข้ารหัสด้วยมาตรฐาน **DTLS-SRTP** แบบ Peer-to-Peer
2. **Disclaimer**: โปรแกรมนี้พัฒนาขึ้นเพื่อการช่วยเหลือทางเทคนิค การศึกษา และการใช้งานที่ได้รับการยินยอมเท่านั้น ห้ามนำไปใช้ในทางที่ผิดกฎหมาย

---

<p align="center">
  พัฒนาด้วย ❤️ โดยทีมงาน ormConnect | Licensed under MIT
</p>
