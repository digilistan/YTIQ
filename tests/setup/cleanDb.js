const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dbDir = path.join(__dirname, '../../server/db');
const dbFiles = ['ytiq_test.db', 'ytiq_test.db-wal', 'ytiq_test.db-shm'];

console.log('Clean DB Script: Cleaning up database and E2E ports (5000, 5050, 5173)...');

// Kill processes on ports 5000, 5050, and 5173
try {
  const ports = ['5000', '5050', '5173'];
  let killedAny = false;
  
  for (const port of ports) {
    try {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      const pids = new Set();
      for (const line of lines) {
        if (!line.includes('TCP')) continue; // Target TCP only
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !isNaN(pid)) {
          pids.add(pid);
        }
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`);
          console.log(`Killed leftover process ${pid} listening on port ${port}`);
          killedAny = true;
        } catch (err) {}
      }
    } catch (e) {
      // No process matching this port
    }
  }

  if (killedAny) {
    console.log('Waiting 500ms for OS to release file locks...');
    try {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
    } catch (err) {
      execSync('powershell -Command "Start-Sleep -Milliseconds 500"');
    }
  }
} catch (e) {}

// Delete test database files
for (const file of dbFiles) {
  const filePath = path.join(dbDir, file);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`Deleted: ${filePath}`);
    } catch (err) {
      console.error(`Failed to delete ${filePath}:`, err.message);
    }
  }
}
