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

// Serve static assets in production
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
  socket.on('host:create-session', ({ customPasscode, permissions }) => {
    const sessionCode = generateSessionCode();
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

    console.log(`[Host] Created Session ${sessionCode} (Passcode: ${passcode})`);

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

    console.log(`[Viewer] Socket ${socket.id} connected to session ${sessionCode}`);

    // Notify Host about incoming connection
    io.to(session.hostSocketId).emit('host:viewer-joined', {
      viewerSocketId: socket.id,
      permissions: session.permissions
    });

    // Notify Viewer connection accepted
    socket.emit('viewer:connect-success', {
      sessionCode,
      permissions: session.permissions
    });
  });

  // WebRTC Signaling: Relay Offer from Host to Viewer or vice versa
  socket.on('rtc:offer', ({ sessionCode, offer }) => {
    socket.to(sessionCode).emit('rtc:offer', { offer, fromSocketId: socket.id });
  });

  // WebRTC Signaling: Relay Answer
  socket.on('rtc:answer', ({ sessionCode, answer }) => {
    socket.to(sessionCode).emit('rtc:answer', { answer, fromSocketId: socket.id });
  });

  // WebRTC Signaling: Relay ICE Candidate
  socket.on('rtc:candidate', ({ sessionCode, candidate }) => {
    socket.to(sessionCode).emit('rtc:candidate', { candidate, fromSocketId: socket.id });
  });

  // Chat message relay
  socket.on('chat:message', ({ sessionCode, sender, text, timestamp }) => {
    io.to(sessionCode).emit('chat:message', { sender, text, timestamp });
  });

  // File Transfer meta relay
  socket.on('file:transfer-request', ({ sessionCode, fileName, fileSize, fileType }) => {
    socket.to(sessionCode).emit('file:transfer-request', { fileName, fileSize, fileType, senderId: socket.id });
  });

  socket.on('file:transfer-accept', ({ sessionCode }) => {
    socket.to(sessionCode).emit('file:transfer-accept');
  });

  socket.on('file:transfer-decline', ({ sessionCode }) => {
    socket.to(sessionCode).emit('file:transfer-decline');
  });

  // Disconnect session explicitly
  socket.on('session:disconnect', ({ sessionCode }) => {
    console.log(`[Session] User requested disconnect for ${sessionCode}`);
    io.to(sessionCode).emit('session:ended', { message: 'การเชื่อมต่อถูกตัดแล้วค่ะ' });
    sessions.delete(sessionCode);
  });

  // Socket disconnected
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    
    // Find and clean up any sessions associated with this socket
    for (const [code, session] of sessions.entries()) {
      if (session.hostSocketId === socket.id || session.viewerSocketId === socket.id) {
        io.to(code).emit('session:ended', { message: 'ผู้ใช้งานตัดการเชื่อมต่อแล้วค่ะ' });
        sessions.delete(code);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 ormConnect Signaling & Web Server Running!`);
  console.log(`📡 Local Access: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
