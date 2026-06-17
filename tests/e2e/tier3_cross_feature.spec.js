const { test, expect } = require('@playwright/test');
const { getDb, clearDatabase } = require('../helpers/testDbHelper');

test.describe('Tier 3: Cross-Feature Combinations', () => {

  test.beforeEach(async () => {
    // Clean database before each test to maintain state isolation
    clearDatabase();
  });

  // ==========================================
  // T3.1: F4 (Niche Explorer) & F5 (Video Idea Generator)
  // ==========================================
  test('T3.1: Search niche and generate ideas from saved niche', async ({ page }) => {
    // Mock Niche Explorer search response
    await page.route('**/api/ai/niche-explorer', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ topic: 'Machine Learning', subNiches: ['Deep Learning', 'Computer Vision'] })
      });
    });

    // Mock Niches save response
    await page.route('**/api/niches', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, topic: 'Machine Learning' })
      });
    });

    // Mock Video Ideas generation response
    await page.route('**/api/ai/video-ideas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, title: 'Intro to Machine Learning', difficulty: 'Medium', viralScore: '85%', format: 'Tutorial' }
        ])
      });
    });

    await page.goto('/');

    // 1. Search niche
    await page.getByTestId('niche-topic-input').fill('Machine Learning');
    await page.getByTestId('niche-analyze-btn').click();
    await expect(page.getByTestId('niche-results-container')).toBeVisible();

    // 2. Click Save Niche
    await page.getByTestId('save-niche-btn').click();

    // Verify niche saved in DB
    const db = getDb();
    const niche = db.prepare('SELECT * FROM niches WHERE topic = ?').get('Machine Learning');
    expect(niche).toBeDefined();

    // 3. Go to Idea Gen, select the saved niche, and generate ideas
    await page.getByTestId('idea-niche-select').selectOption({ label: 'Machine Learning' });
    await page.getByTestId('generate-ideas-btn').click();

    // Verify generated ideas are loaded
    await expect(page.getByTestId('idea-card')).toHaveCount(1);
    await expect(page.getByTestId('idea-title').first()).toContainText('Intro to Machine Learning');
  });

  // ==========================================
  // T3.2: F5 (Video Idea Generator) & F6 (Script Writer)
  // ==========================================
  test('T3.2: Create and save script from a generated video idea', async ({ page }) => {
    // Seed a video idea in SQLite
    const db = getDb();
    db.prepare('INSERT INTO ideas (id, title, status) VALUES (?, ?, ?)')
      .run(1, 'Intro to ML', 'idea');

    // Mock script save response
    await page.route('**/api/scripts/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.goto('/');

    // Click "Create Script" from the idea card
    await page.getByTestId('create-script-btn').click();
    await expect(page.getByTestId('script-editor-container')).toBeVisible();

    // Type custom text and save
    await page.getByTestId('script-cta-input').fill('Subscribe to ML Academy!');
    await page.getByTestId('save-script-btn').click();

    // Verify script database record exists and contains content
    const script = db.prepare('SELECT content FROM scripts WHERE idea_id = 1').get();
    expect(script).toBeDefined();
    expect(script.content).toContain('Subscribe to ML Academy!');
  });

  // ==========================================
  // T3.3: F5 (Video Idea Generator) & F7 (SEO Optimizer)
  // ==========================================
  test('T3.3: Select saved video idea in SEO Optimizer and generate tags', async ({ page }) => {
    // Seed video idea in SQLite
    const db = getDb();
    db.prepare('INSERT INTO ideas (id, title) VALUES (?, ?)')
      .run(1, 'ML Tutorial');

    // Mock SEO optimization API response
    await page.route('**/api/ai/seo', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          original_title: 'ML Tutorial',
          titles: ['Machine Learning for Beginners', 'Complete ML Guide'],
          tags: ['machine learning', 'ml', 'ai'],
          seoScore: 90
        })
      });
    });

    await page.goto('/');

    // Select idea using load dropdown in SEO Optimizer
    await page.getByTestId('seo-idea-select').selectOption('1');
    await page.getByTestId('seo-optimize-btn').click();

    // Check tags and scores are generated in UI
    await expect(page.getByTestId('seo-score-meter')).toContainText('90');
    await expect(page.getByTestId('seo-tag-pill')).toHaveCount(3);

    // Verify SEO data persisted in DB
    const seo = db.prepare('SELECT * FROM seo_data WHERE idea_id = 1').get();
    expect(seo).toBeDefined();
    expect(seo.seo_score).toBe(90);
  });

  // ==========================================
  // T3.4: F5 (Video Idea Generator) & F8 (Thumbnail Concept Generator)
  // ==========================================
  test('T3.4: Select saved idea in Thumbnail Generator and save favorite concept', async ({ page }) => {
    // Seed video idea and thumbnail placeholder in SQLite
    const db = getDb();
    db.prepare('INSERT INTO ideas (id, title) VALUES (?, ?)')
      .run(1, 'ML Basics');
    db.prepare('INSERT INTO thumbnails (id, idea_id, concepts) VALUES (?, ?, ?)')
      .run(1, 1, JSON.stringify([{ id: 1, composition: 'Split screen' }]));

    // Mock Thumbnail generation response
    await page.route('**/api/ai/thumbnails', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          concepts: [{ id: 1, composition: 'Neural net diagram', textOverlay: 'AI Explained' }]
        })
      });
    });

    // Mock link/save thumbnail response
    await page.route('**/api/thumbnails/1/link', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.goto('/');

    // Select idea and generate concepts
    await page.getByTestId('link-idea-select').selectOption('1');
    await page.getByTestId('generate-thumbnails-btn').click();

    // Verify concept card renders
    await expect(page.getByTestId('thumbnail-concept-card')).toBeVisible();

    // Verify SQLite concept mapping exists
    const dbThumb = db.prepare('SELECT idea_id FROM thumbnails WHERE id = 1').get();
    expect(dbThumb.idea_id).toBe(1);
  });

  // ==========================================
  // T3.5: F5 (Video Idea Generator) & F9 (Content Calendar)
  // ==========================================
  test('T3.5: Drag a saved video idea onto the calendar date grid', async ({ page }) => {
    const db = getDb();
    db.prepare('INSERT INTO ideas (id, title, status) VALUES (?, ?, ?)')
      .run(1, 'Calendar Drag Idea', 'idea');

    // Mock calendar event creation
    await page.route('**/api/calendar/events', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, idea_id: 1, scheduled_date: '2026-06-20' })
      });
    });

    await page.goto('/');

    // Drag-and-drop simulation
    const dragSource = page.getByTestId('calendar-sidebar-idea-item').first();
    const dropTarget = page.locator('[data-date="2026-06-20"]');

    await dragSource.dragTo(dropTarget);

    // Verify calendar event saved in DB and status updated
    const dbEvent = db.prepare('SELECT * FROM calendar_events WHERE scheduled_date = ?').get('2026-06-20');
    expect(dbEvent).toBeDefined();

    const dbIdea = db.prepare('SELECT status FROM ideas WHERE id = 1').get();
    expect(dbIdea.status).toBe('planned');

    await expect(page.getByTestId('calendar-event-card')).toBeVisible();
  });

  // ==========================================
  // T3.6: F6 (Script Writer) & F9 (Content Calendar)
  // ==========================================
  test('T3.6: Edit script for planned event and mark as scripted', async ({ page }) => {
    const db = getDb();
    db.prepare('INSERT INTO ideas (id, title, status) VALUES (?, ?, ?)')
      .run(1, 'Calendar Script Idea', 'planned');
    db.prepare('INSERT INTO calendar_events (id, idea_id, scheduled_date, status) VALUES (?, ?, ?, ?)')
      .run(1, 1, '2026-06-20', 'planned');
    db.prepare('INSERT INTO scripts (idea_id, title, content) VALUES (?, ?, ?)')
      .run(1, 'Calendar Script Idea', 'Initial content');

    // Mock script update and calendar event status update
    await page.route('**/api/scripts/1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.route('**/api/calendar/events/1/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.goto('/');

    // Double click the calendar event card to open details
    await page.getByTestId('calendar-event-card').dblclick();
    await expect(page.getByTestId('event-detail-modal')).toBeVisible();

    // Click link to open script editor (assuming a link button inside modal)
    await page.getByTestId('edit-script-link').click();
    await expect(page.getByTestId('script-editor-container')).toBeVisible();

    // Update content and change status to scripted (Done)
    await page.getByTestId('script-cta-input').fill('Updated CTA text');
    await page.getByTestId('tone-select').selectOption('professional');
    await page.getByTestId('save-script-btn').click();

    // Set script status to Done or calendar event status to scripted
    await page.getByTestId('event-status-select').selectOption('scripted');

    // Verify SQLite updates
    const dbEvent = db.prepare('SELECT status FROM calendar_events WHERE id = 1').get();
    expect(dbEvent.status).toBe('scripted');
  });

  // ==========================================
  // T3.7: F10 (Competitor Tracker) & F5 (Video Idea Generator)
  // ==========================================
  test('T3.7: Use competitor upload as a video idea concept', async ({ page }) => {
    const db = getDb();
    db.prepare('INSERT INTO competitors (id, competitor_channel_id, competitor_name) VALUES (?, ?, ?)')
      .run(1, 'UC_COMP', 'CompChannel');

    // Mock competitor uploads
    await page.route('**/api/competitors/1/uploads', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'v1', title: 'Top Competitor Hack', tags: ['hack', 'code'] }])
      });
    });

    // Mock idea generator prefill/create response
    await page.route('**/api/ideas', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, title: 'Top Competitor Hack' })
      });
    });

    await page.goto('/');

    // Click competitor card to open timeline
    await page.getByTestId('competitor-card').click();
    await expect(page.getByTestId('competitor-timeline')).toBeVisible();

    // Click "Use as Idea Concept" button on competitor video
    await page.getByTestId('use-as-idea-btn').click();

    // Verify video idea generator pre-fills inputs
    await expect(page.getByTestId('idea-niche-select')).toBeVisible();
    
    // Verify SQLite has the new idea created or staged
    const dbIdea = db.prepare('SELECT title FROM ideas WHERE title = ?').get('Top Competitor Hack');
    expect(dbIdea).toBeDefined();
  });

  // ==========================================
  // T3.8: F10 (Daily Suggestions) & F4 (Niche Explorer)
  // ==========================================
  test('T3.8: Analyze trending topic from daily suggestions in Niche Explorer', async ({ page }) => {
    const db = getDb();
    db.prepare('INSERT INTO suggestions (id, content, is_read) VALUES (?, ?, ?)')
      .run(1, 'Vite 6 is trending', 0);

    // Mock niche explorer response
    await page.route('**/api/ai/niche-explorer', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ topic: 'Vite 6', competition: 'Low', monetizationTier: 'Tier 1' })
      });
    });

    await page.goto('/');

    // Verify daily suggestions card exists
    await expect(page.getByTestId('suggestion-card')).toContainText('Vite 6 is trending');

    // Click the trending suggestion link/button
    await page.getByTestId('analyze-suggestion-btn').click();

    // Expect Niche Explorer topic input to be filled with 'Vite 6' and analyzed
    await expect(page.getByTestId('niche-topic-input')).toHaveValue('Vite 6');
    await expect(page.getByTestId('niche-results-container')).toBeVisible();
  });

  // ==========================================
  // T3.9: F1 (Channel Switcher) & F9 (Content Calendar)
  // ==========================================
  test('T3.9: Switching channels filters the content calendar events', async ({ page }) => {
    const db = getDb();
    db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)')
      .run(1, 'UC-TECH', 'Tech Vlog');
    db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)')
      .run(2, 'UC-GAME', 'Gaming Channel');

    db.prepare('INSERT INTO ideas (id, title, channel_id) VALUES (?, ?, ?)').run(1, 'Tech Video', 1);
    db.prepare('INSERT INTO calendar_events (id, idea_id, channel_id, scheduled_date) VALUES (?, ?, ?, ?)')
      .run(1, 1, 1, '2026-06-20');

    db.prepare('INSERT INTO ideas (id, title, channel_id) VALUES (?, ?, ?)').run(2, 'Gaming Video', 2);
    db.prepare('INSERT INTO calendar_events (id, idea_id, channel_id, scheduled_date) VALUES (?, ?, ?, ?)')
      .run(2, 2, 2, '2026-06-21');

    await page.goto('/');

    // Initially select Tech Vlog
    await page.getByTestId('channel-switcher-select').selectOption({ label: 'Tech Vlog' });
    await expect(page.getByTestId('calendar-event-card')).toContainText('Tech Video');
    await expect(page.getByTestId('calendar-event-card')).not.toContainText('Gaming Video');

    // Switch to Gaming Channel
    await page.getByTestId('channel-switcher-select').selectOption({ label: 'Gaming Channel' });
    await expect(page.getByTestId('calendar-event-card')).toContainText('Gaming Video');
    await expect(page.getByTestId('calendar-event-card')).not.toContainText('Tech Video');
  });

  // ==========================================
  // T3.10: F10 (Daily Suggestions) & F9 (Content Calendar)
  // ==========================================
  test('T3.10: Click task reminder suggestion to highlight calendar event', async ({ page }) => {
    const db = getDb();
    db.prepare('INSERT INTO suggestions (id, content, is_read) VALUES (?, ?, ?)')
      .run(1, 'Film script today!', 0);

    db.prepare('INSERT INTO ideas (id, title) VALUES (?, ?)').run(1, 'Important Video');
    db.prepare('INSERT INTO calendar_events (id, idea_id, scheduled_date, notes) VALUES (?, ?, ?, ?)')
      .run(1, 1, '2026-06-17', 'Film script today!');

    await page.goto('/');

    // Click the scheduled task reminder suggestion
    await page.getByTestId('suggestion-card').locator('text=Film script today!').click();

    // Verify calendar view is active and event modal/highlight is open
    await expect(page.getByTestId('event-detail-modal')).toBeVisible();
    await expect(page.getByTestId('event-detail-modal')).toContainText('Film script today!');
  });

});
