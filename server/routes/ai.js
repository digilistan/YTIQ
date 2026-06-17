import express from 'express';
import {
  generateNicheAnalysis,
  generateVideoIdeas,
  generateScript,
  generateSEO,
  generateThumbnailConcepts,
  generateAngleAnalysis
} from '../services/aiService.js';

const router = express.Router();

// GET /api/ai/niche-explorer?topic=X
router.get('/niche-explorer', async (req, res) => {
  try {
    const { topic } = req.query;
    if (!topic) {
      return res.status(400).json({ error: 'topic query parameter is required' });
    }
    const analysis = await generateNicheAnalysis(topic);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/ideas?niche=X
router.get('/ideas', async (req, res) => {
  try {
    const { niche } = req.query;
    if (!niche) {
      return res.status(400).json({ error: 'niche query parameter is required' });
    }
    const ideas = await generateVideoIdeas(niche);
    res.json({ ideas });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/generate-script?title=X
router.get('/generate-script', async (req, res) => {
  try {
    const { title } = req.query;
    if (!title) {
      return res.status(400).json({ error: 'title query parameter is required' });
    }
    const script = await generateScript(title);
    res.json(script);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/seo?title=X&description=Y
router.get('/seo', async (req, res) => {
  try {
    const { title, description } = req.query;
    if (!title) {
      return res.status(400).json({ error: 'title query parameter is required' });
    }
    const seo = await generateSEO(title, description);
    res.json(seo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/thumbnails?topic=X
router.get('/thumbnails', async (req, res) => {
  try {
    const { topic } = req.query;
    if (!topic) {
      return res.status(400).json({ error: 'topic query parameter is required' });
    }
    const concepts = await generateThumbnailConcepts(topic);
    res.json({ concepts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/analyze-angle?title=X
router.get('/analyze-angle', async (req, res) => {
  try {
    const { title } = req.query;
    if (!title) {
      return res.status(400).json({ error: 'title query parameter is required' });
    }
    const suggestion = await generateAngleAnalysis(title);
    res.json({ suggestion });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
