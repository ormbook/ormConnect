/**
 * ormConnect - Windows Native Agent Helper
 * 
 * รันไฟล์นี้บนเครื่อง Host เพื่อขยับเมาส์และพิมพ์คีย์บอร์ดระดับ Windows OS จริง
 * ใช้งาน: node agent.js [SERVER_URL] [SESSION_CODE]
 */

import { exec } from 'child_process';
import { io } from 'socket.io-client';

const serverUrl = process.argv[2] || 'http://localhost:3000';
const sessionCode = process.argv[3] || '384-912-705';

console.log(`=======================================================`);
console.log(`🚀 ormConnect Windows Agent v1.0.0`);
console.log(`📡 Server: ${serverUrl}`);
console.log(`🔑 Target Session: ${sessionCode}`);
console.log(`=======================================================`);

const socket = io(serverUrl);

socket.on('connect', () => {
  console.log('[Agent] Connected to signaling server with ID:', socket.id);
  socket.emit('viewer:request-connect', { sessionCode });
});

// Helper function to execute PowerShell mouse move on Windows
function moveMouseWindows(x, y) {
  const psCommand = `Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);' -Name "Win32SetCursorPos" -Namespace Win32Functions; [Win32Functions.Win32SetCursorPos]::SetCursorPos(${Math.round(x)}, ${Math.round(y)})`;
  exec(`powershell -Command "${psCommand}"`, (err) => {
    if (err) console.warn('[Agent Mouse Move Error]', err.message);
  });
}

socket.on('rtc:input-event', (event) => {
  const { type, payload } = event;
  if (type === 'mousemove') {
    const screenWidth = 1920;
    const screenHeight = 1080;
    const absX = payload.xRatio * screenWidth;
    const absY = payload.yRatio * screenHeight;
    moveMouseWindows(absX, absY);
  }
});
