import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// POST /api/pov-coordinator/start-run
router.post('/start-run', async (req, res) => {
  const runId = `pov_run_${Date.now()}`;
  const targetDir = path.resolve(__dirname, '../../pov/audio_image_video_generator_local/local_output', runId);
  try {
    await fs.mkdir(targetDir, { recursive: true });
    res.json({ status: 'success', runId, path: targetDir });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize POV run directory', details: error.message });
  }
});

// POST /api/pov-coordinator/save-scene
router.post('/save-scene', async (req, res) => {
  const { runId, index, imageUrl } = req.body;
  if (!runId || index === undefined || !imageUrl) {
    return res.status(400).json({ error: 'Missing runId, index, or imageUrl' });
  }

  const targetDir = path.resolve(__dirname, '../../pov/audio_image_video_generator_local/local_output', runId);
  try {
    // Check if directory exists
    await fs.access(targetDir);

    // Download the image
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
    if (!imgRes.ok) {
      throw new Error(`Failed to download image from URL: ${imageUrl}`);
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    // Name it numerically e.g. 1.png, 2.png etc.
    const fileName = `${index}.png`;
    const filePath = path.join(targetDir, fileName);

    await fs.writeFile(filePath, buffer);
    res.json({ status: 'success', fileName, path: filePath });
  } catch (error) {
    res.status(500).json({ error: 'Failed to download or save POV scene image', details: error.message });
  }
});

export default router;
