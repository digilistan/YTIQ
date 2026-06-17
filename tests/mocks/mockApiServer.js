const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// Load fixtures
const youtubeFixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'youtubeFixtures.json'), 'utf8'));
const aiFixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'aiFixtures.json'), 'utf8'));

// YouTube API stubs
app.get(['/youtube/v3/channels', '/v3/channels', '/channels'], (req, res) => {
  res.json(youtubeFixtures.channels);
});

app.get(['/youtube/v3/videos', '/v3/videos', '/videos'], (req, res) => {
  res.json(youtubeFixtures.videos);
});

app.get(['/youtube/v3/search', '/v3/search', '/search'], (req, res) => {
  res.json(youtubeFixtures.search);
});

// AI API completions stub
app.post(['/ai/v1/chat/completions', '/v1/chat/completions', '/chat/completions'], (req, res) => {
  res.json(aiFixtures.completions);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Graceful shutdown endpoint
app.get('/shutdown', (req, res) => {
  res.json({ success: true, message: 'Mock API Server shutting down...' });
  setTimeout(() => {
    process.exit(0);
  }, 200);
});

const PORT = process.env.MOCK_PORT || 5050;
app.listen(PORT, () => {
  console.log(`Mock API Server is running on port ${PORT}`);
});
