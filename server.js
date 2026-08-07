import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve static assets in production (No-Cache for instant live updates)
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(express.static(path.join(__dirname, 'dist')));

// Active Sessions Store
// Key: 9-digit session code (e.g., "384-912-705")
// Value: { hostSocketId, passcode, permissions, viewerSocketId, createdAt }
const sessions = new Map();

// Helper to generate 9-digit formatted session code: "XXX-XXX-XXX"
function generateSessionCode() {
  let code;
  do {
    const part1 = Math.floor(100 + Math.random() * 900);
    const part2 = Math.floor(100 + Math.random() * 900);
    const part3 = Math.floor(100 + Math.random() * 900);
    code = `${part1}-${part2}-${part3}`;
  } while (sessions.has(code));
  return code;
}

// Helper to generate 4-digit numeric passcode
function generatePasscode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Host registers a new remote session
  socket.on('host:create-session', ({ customSessionCode, customPasscode, permissions }) => {
    const sessionCode = customSessionCode || generateSessionCode();
    const passcode = customPasscode || generatePasscode();

    const sessionData = {
      hostSocketId: socket.id,
      passcode,
      permissions: permissions || 'full', // 'full', 'view-only', 'confirm'
      viewerSocketId: null,
      createdAt: Date.now()
    };

    sessions.set(sessionCode, sessionData);
    socket.join(sessionCode);

    console.log(`[Host] Registered Session ${sessionCode} (Passcode: ${passcode})`);

    socket.emit('host:session-created', {
      sessionCode,
      passcode,
      permissions: sessionData.permissions
    });
  });

  // Viewer attempts to connect to a host using session code
  socket.on('viewer:request-connect', ({ sessionCode }) => {
    const formattedCode = sessionCode.trim();
    const session = sessions.get(formattedCode);

    if (!session) {
      return socket.emit('viewer:connect-error', {
        message: 'ไม่พบ Session ID นี้ กรุณาตรวจสอบรหัสอีกครั้งค่ะ'
      });
    }

    if (session.viewerSocketId) {
      return socket.emit('viewer:connect-error', {
        message: 'Session นี้มีผู้เชื่อมต่ออยู่แล้วค่ะ'
      });
    }

    // Request passcode from viewer
    socket.emit('viewer:require-passcode', { sessionCode: formattedCode });
  });

  // Viewer submits passcode for verification
  socket.on('viewer:verify-passcode', ({ sessionCode, passcode }) => {
    const session = sessions.get(sessionCode);
    if (!session) {
      return socket.emit('viewer:connect-error', {
        message: 'Session หมดอายุแล้วค่ะ กรุณาลองใหม่อีกครั้ง'
      });
    }

    if (session.passcode !== passcode) {
      return socket.emit('viewer:connect-error', {
        message: 'รหัสผ่าน (Passcode) ไม่ถูกต้อง กรุณาลองใหม่อีกครั้งค่ะ'
      });
    }

    // Passcode correct! Link viewer to host session
    session.viewerSocketId = socket.id;
    socket.join(sessionCode);

    console.log(`[Viewer] Socket ${socket.id} verified passcode for session ${sessionCode}`);

    // Notify Host about incoming connection request
    io.to(session.hostSocketId).emit('host:viewer-joined', {
      viewerSocketId: socket.id,
      permissions: session.permissions
    });

    // Notify Viewer to wait for Host approval
    socket.emit('viewer:waiting-host-approval', {
      sessionCode,
      message: 'รหัสผ่านถูกต้องค่ะ กำลังรอฝั่ง Host กดอนุมัติ...'
    });
  });

  // Host accepts connection request
  socket.on('host:accept-connection', ({ sessionCode }) => {
    console.log(`[Host] Accepted connection for session ${sessionCode}`);
    const session = sessions.get(sessionCode);
    if (session && session.viewerSocketId) {
      io.to(session.viewerSocketId).emit('viewer:connect-approved', {
        sessionCode,
        permissions: session.permissions
      });
    }
  });

  // Host declines connection request
  socket.on('host:decline-connection', ({ sessionCode }) => {
    console.log(`[Host] Declined connection for session ${sessionCode}`);
    const session = sessions.get(sessionCode);
    if (session) {
      if (session.viewerSocketId) {
        io.to(session.viewerSocketId).emit('viewer:connect-declined', {
          message: 'ฝั่ง Host ปฏิเสธคำขอเชื่อมต่อค่ะ'
        });
      }
      io.to(sessionCode).emit('viewer:connect-declined', {
        message: 'ฝั่ง Host ปฏิเสธคำขอเชื่อมต่อค่ะ'
      });
      session.viewerSocketId = null;
    }
  });

  // WebRTC Signaling (Peer-to-Peer)
  socket.on('rtc:offer', ({ sessionCode, offer }) => {
    socket.to(sessionCode).emit('rtc:offer', { offer });
  });

  socket.on('rtc:answer', ({ sessionCode, answer }) => {
    socket.to(sessionCode).emit('rtc:answer', { answer });
  });

  socket.on('rtc:candidate', ({ sessionCode, candidate }) => {
    socket.to(sessionCode).emit('rtc:candidate', { candidate });
  });

  // Chat & File Transfer Signaling
  socket.on('chat:message', (data) => {
    socket.to(data.sessionCode).emit('chat:message', data);
  });

  socket.on('file:transfer-request', (data) => {
    socket.to(data.sessionCode).emit('file:transfer-request', data);
  });

  socket.on('file:transfer-accept', (data) => {
    socket.to(data.sessionCode).emit('file:transfer-accept', data);
  });

  socket.on('file:transfer-decline', (data) => {
    socket.to(data.sessionCode).emit('file:transfer-decline', data);
  });

  // Disconnect session explicitly
  socket.on('session:disconnect', ({ sessionCode }) => {
    console.log(`[Session] User requested disconnect for ${sessionCode}`);
    io.to(sessionCode).emit('session:ended', { message: 'การเชื่อมต่อถูกตัดแล้วค่ะ' });
    sessions.delete(sessionCode);
  });

  // Socket disconnected with 60-second grace period (supports mobile tab switching & screen lock)
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);

    for (const [code, session] of sessions.entries()) {
      if (session.hostSocketId === socket.id) {
        session.hostDisconnectedTimer = setTimeout(() => {
          console.log(`[Session] Host disconnected timeout for session ${code}. Removing.`);
          io.to(code).emit('session:ended', { message: 'ผู้ใช้งานฝั่ง Host ตัดการเชื่อมต่อแล้วค่ะ' });
          sessions.delete(code);
        }, 60000); // 60 seconds grace period for Host socket reconnect
      } else if (session.viewerSocketId === socket.id) {
        session.viewerDisconnectedTimer = setTimeout(() => {
          console.log(`[Session] Viewer disconnected timeout for session ${code}. Removing.`);
          io.to(code).emit('session:ended', { message: 'ผู้ใช้งานฝั่ง Viewer ตัดการเชื่อมต่อแล้วค่ะ' });
          session.viewerSocketId = null;
        }, 60000); // 60 seconds grace period for Viewer socket reconnect
      }
    }
  });
});

// Periodic cleanup for idle sessions older than 30 minutes (30 mins TTL)
setInterval(() => {
  const now = Date.now();
  const THIRTY_MINUTES = 30 * 60 * 1000;
  for (const [code, session] of sessions.entries()) {
    if (now - session.createdAt > THIRTY_MINUTES && !session.viewerSocketId) {
      console.log(`[Session] Session ${code} expired after 30 minutes idle.`);
      sessions.delete(code);
    }
  }
}, 60000);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 ormConnect Signaling & Web Server Running!`);
  console.log(`📡 Local Access: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
