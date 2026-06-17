const fs = require('fs');
const path = require('path');
const http = require('http');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function requestShutdown() {
  return new Promise((resolve) => {
    http.get('http://localhost:5000/api/shutdown', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('Global Teardown: Requested server shutdown. Response:', data.trim());
        resolve();
      });
    }).on('error', (err) => {
      console.log('Global Teardown: Could not request /api/shutdown (already stopped?):', err.message);
      resolve();
    });
  });
}

function requestMockShutdown() {
  return new Promise((resolve) => {
    http.get('http://localhost:5050/shutdown', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('Global Teardown: Requested mock API server shutdown. Response:', data.trim());
        resolve();
      });
    }).on('error', (err) => {
      console.log('Global Teardown: Could not request mock /shutdown (already stopped?):', err.message);
      resolve();
    });
  });
}

async function retryDelete(filePath, retries = 5, delayMs = 200) {
  for (let i = 1; i <= retries; i++) {
    if (!fs.existsSync(filePath)) {
      return;
    }
    try {
      fs.unlinkSync(filePath);
      console.log(`Successfully deleted ${filePath} on attempt ${i}`);
      return;
    } catch (err) {
      if (i === retries) {
        console.error(`Failed to delete ${filePath} after ${retries} attempts. Error: ${err.message}`);
      } else {
        console.log(`Attempt ${i} to delete ${filePath} failed. Retrying in ${delayMs}ms...`);
        await delay(delayMs);
      }
    }
  }
}

module.exports = async (config) => {
  const dbDir = path.join(__dirname, '../../server/db');
  const filesToDelete = ['ytiq_test.db', 'ytiq_test.db-wal', 'ytiq_test.db-shm'];

  console.log('Global Teardown: Cleaning up test database files...');

  // Gracefully request shutdown from servers
  await requestShutdown();
  await requestMockShutdown();
  await delay(2000); // Give both server processes 2 seconds to exit completely and release locks

  for (const file of filesToDelete) {
    const filePath = path.join(dbDir, file);
    await retryDelete(filePath, 5, 200);
  }
};
