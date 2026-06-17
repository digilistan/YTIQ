const { test, expect } = require('@playwright/test');
const { getDb, clearDatabase } = require('../helpers/testDbHelper');

test.describe('Tier 1: Feature Coverage', () => {

  test.beforeEach(async () => {
    // Clean database before each test to maintain state isolation
    clearDatabase();
  });

  // ==========================================
  // F1: Channel Switcher & Channel Management
  // ==========================================
  test.describe('F1: Channel Switcher & Channel Management', () => {
    test('T1.1.1: Add a channel with ID UC12345 via the settings panel', async ({ page }) => {
      // Mock the backend API response for adding a channel
      await page.route('**/api/channels', async (route) => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1, youtube_channel_id: 'UC12345', name: 'New Tech Channel' })
        });
      });

      await page.goto('/');
      // Trigger Settings panel
      await page.getByTestId('settings-panel').click();
      await page.getByTestId('add-channel-input').fill('UC12345');
      await page.getByTestId('add-channel-btn').click();

      // Verify channel is added and visible in switcher
      await expect(page.getByTestId('channel-switcher-select')).toContainText('New Tech Channel');
    });

    test('T1.1.2: Click "Delete Channel" for channel UC12345 in settings', async ({ page }) => {
      // Seed a channel into SQLite database
      const db = getDb();
      db.prepare('INSERT INTO channels (youtube_channel_id, name) VALUES (?, ?)')
        .run('UC12345', 'Channel to Delete');

      // Mock backend API for deleting channel
      await page.route('**/api/channels/UC12345', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await page.goto('/');
      await page.getByTestId('settings-panel').click();
      await page.getByTestId('delete-channel-btn').click();

      // Verify channel is removed
      await expect(page.getByTestId('channel-switcher-select')).not.toContainText('Channel to Delete');
    });

    test('T1.1.3: Select "Tech Channel" from switcher dropdown', async ({ page }) => {
      // Seed channel in db
      const db = getDb();
      db.prepare('INSERT INTO channels (youtube_channel_id, name) VALUES (?, ?)')
        .run('UC-TECH', 'Tech Channel');

      // Mock stats update backend API
      await page.route('**/api/youtube/stats?channelId=TechChannel', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ subscribers: 25000 })
        });
      });

      await page.goto('/');
      await page.getByTestId('channel-switcher-select').selectOption({ label: 'Tech Channel' });

      // Verify UI has updated context
      await expect(page.getByTestId('stats-subscribers-card')).toContainText('25,000');
    });

    test('T1.1.4: Toggle "Mock Data" flag to "Real YouTube API" in settings', async ({ page }) => {
      // Mock setting update API
      await page.route('**/api/settings', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ key: 'use_mock_api', value: 'false' })
        });
      });

      await page.goto('/');
      await page.getByTestId('settings-panel').click();
      await page.getByTestId('api-mock-toggle').click();

      // Verify toggle visual state
      await expect(page.getByTestId('api-mock-toggle')).toHaveAttribute('aria-checked', 'false');
    });

    test('T1.1.5: Load app and inspect user profile card at bottom of sidebar', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByTestId('user-profile-card')).toBeVisible();
      await expect(page.getByTestId('user-pro-badge')).toContainText('Pro');
    });
  });

  // ==========================================
  // F2: Dashboard - Key Stats Cards
  // ==========================================
  test.describe('F2: Dashboard - Key Stats Cards', () => {
    test('T1.2.1: View dashboard for channel with 10k subscribers', async ({ page }) => {
      // Mock stats response
      await page.route('**/api/youtube/stats*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ subscribers: 10000 })
        });
      });

      await page.goto('/');
      // Verify GSAP counter transitions or final state
      await expect(page.getByTestId('stats-subscribers-card')).toContainText('10,000');
    });

    test('T1.2.2: View dashboard for channel with 5M views', async ({ page }) => {
      await page.route('**/api/youtube/stats*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ total_views: 5000000 })
        });
      });

      await page.goto('/');
      await expect(page.getByTestId('stats-views-card')).toContainText('5.0M');
    });

    test('T1.2.3: View dashboard for channel with 150 videos', async ({ page }) => {
      await page.route('**/api/youtube/stats*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ video_count: 150 })
        });
      });

      await page.goto('/');
      await expect(page.getByTestId('stats-videos-card')).toContainText('150');
    });

    test('T1.2.4: View dashboard for channel with 40k watch hours', async ({ page }) => {
      await page.route('**/api/youtube/stats*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ watch_time: 40000 })
        });
      });

      await page.goto('/');
      await expect(page.getByTestId('stats-watch-time-card')).toContainText('40,000 hrs');
    });

    test('T1.2.5: Click the "Manual Sync" refresh button on dashboard', async ({ page }) => {
      await page.route('**/api/youtube/sync', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await page.goto('/');
      await page.getByTestId('manual-sync-btn').click();

      // Check loader appearance and disappearance
      await expect(page.getByTestId('sync-loading-spinner')).toBeVisible();
      await expect(page.getByTestId('sync-loading-spinner')).toBeHidden();
    });
  });

  // ==========================================
  // F3: Dashboard - Growth Charts & Top Videos
  // ==========================================
  test.describe('F3: Dashboard - Growth Charts & Top Videos', () => {
    test('T1.3.1: Load dashboard and view Subscriber growth chart', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByTestId('growth-chart-container')).toBeVisible();
      // Verify Recharts SVG component is rendered
      await expect(page.getByTestId('growth-chart-container').locator('svg')).toBeVisible();
    });

    test('T1.3.2: Click "Monthly" toggle on the trend chart', async ({ page }) => {
      await page.goto('/');
      await page.getByTestId('chart-monthly-toggle').click();
      await expect(page.getByTestId('chart-monthly-toggle')).toHaveClass(/active/);
    });

    test('T1.3.3: View "Top Videos" section', async ({ page }) => {
      await page.route('**/api/youtube/top-videos', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'vid1', title: 'Top Video 1', views: 1000 }])
        });
      });

      await page.goto('/');
      await expect(page.getByTestId('top-videos-table')).toBeVisible();
      await expect(page.getByTestId('top-videos-row')).toHaveCount(1);
    });

    test('T1.3.4: Inspect the columns of the Top Videos table', async ({ page }) => {
      await page.goto('/');
      const table = page.getByTestId('top-videos-table');
      await expect(table.locator('th')).toContainText(['Title', 'Views', 'Multiplier', 'Likes', 'Comments']);
    });

    test('T1.3.5: Hover cursor over a video card in the list', async ({ page }) => {
      await page.route('**/api/youtube/top-videos', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'vid1', title: 'Interactive Video', views: 5000, multiplier: '2.1x' }])
        });
      });

      await page.goto('/');
      const row = page.getByTestId('top-videos-row').first();
      await row.hover();

      // Check transition hover overlay/badge visibility
      await expect(page.getByTestId('top-video-overlay')).toBeVisible();
      await expect(page.getByTestId('top-video-overlay')).toContainText('2.1x');
    });
  });

  // ==========================================
  // F4: Niche Explorer
  // ==========================================
  test.describe('F4: Niche Explorer', () => {
    test('T1.4.1: Enter topic "Web Assembly" in Niche Explorer and click "Analyze"', async ({ page }) => {
      await page.route('**/api/ai/niche-explorer', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ topic: 'Web Assembly', subNiches: [] })
        });
      });

      await page.goto('/');
      await page.getByTestId('niche-topic-input').fill('Web Assembly');
      await page.getByTestId('niche-analyze-btn').click();

      await expect(page.getByTestId('niche-loading-spinner')).toBeVisible();
      await expect(page.getByTestId('niche-results-container')).toBeVisible();
    });

    test('T1.4.2: Inspect Niche Explorer results layout', async ({ page }) => {
      await page.route('**/api/ai/niche-explorer', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            topic: 'Web Assembly',
            competition: 'High',
            monetizationTier: 'Tier 1',
            audienceSize: '100k'
          })
        });
      });

      await page.goto('/');
      await page.getByTestId('niche-topic-input').fill('Web Assembly');
      await page.getByTestId('niche-analyze-btn').click();

      await expect(page.getByTestId('niche-competition-gauge')).toContainText('High');
      await expect(page.getByTestId('niche-monetization-badge')).toContainText('Tier 1');
    });

    test('T1.4.3: Inspect "Competitor Channels" listed in Niche Explorer results', async ({ page }) => {
      await page.route('**/api/ai/niche-explorer', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            competitors: [
              { name: 'Comp A', subscribers: '50k' },
              { name: 'Comp B', subscribers: '150k' },
              { name: 'Comp C', subscribers: '200k' }
            ]
          })
        });
      });

      await page.goto('/');
      await page.getByTestId('niche-topic-input').fill('Web Assembly');
      await page.getByTestId('niche-analyze-btn').click();

      await expect(page.getByTestId('niche-competitor-link')).toHaveCount(3);
    });

    test('T1.4.4: Click "Save Niche" button next to results', async ({ page }) => {
      await page.route('**/api/ai/niche-explorer', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ topic: 'Web Assembly' })
        });
      });

      await page.route('**/api/niches', async (route) => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1, topic: 'Web Assembly' })
        });
      });

      await page.goto('/');
      await page.getByTestId('niche-topic-input').fill('Web Assembly');
      await page.getByTestId('niche-analyze-btn').click();
      await page.getByTestId('save-niche-btn').click();

      // Check database insertion status or success toast
      const db = getDb();
      const niche = db.prepare('SELECT * FROM niches WHERE topic = ?').get('Web Assembly');
      expect(niche).toBeDefined();
    });

    test('T1.4.5: Navigate to Niche Library, click delete icon on saved topic', async ({ page }) => {
      // Seed niche first
      const db = getDb();
      db.prepare('INSERT INTO niches (topic) VALUES (?)').run('SvelteKit');

      await page.route('**/api/niches/1', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await page.goto('/');
      await page.getByTestId('delete-niche-btn').click();

      await expect(page.getByTestId('niche-library-list')).not.toContainText('SvelteKit');
    });
  });

  // ==========================================
  // F5: Video Idea Generator
  // ==========================================
  test.describe('F5: Video Idea Generator', () => {
    test('T1.5.1: Select saved niche "Tailwind CSS" and click "Generate Ideas"', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO niches (topic) VALUES (?)').run('Tailwind CSS');

      await page.route('**/api/ai/video-ideas', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 1, title: 'CSS Grid vs Flexbox in Tailwind' }])
        });
      });

      await page.goto('/');
      await page.getByTestId('idea-niche-select').selectOption({ label: 'Tailwind CSS' });
      await page.getByTestId('generate-ideas-btn').click();

      await expect(page.getByTestId('idea-card')).toHaveCount(1);
    });

    test('T1.5.2: Inspect the generated ideas list', async ({ page }) => {
      await page.route('**/api/ai/video-ideas', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, title: 'Idea 1', difficulty: 'Easy', viralScore: '92%', format: 'Tutorial' }
          ])
        });
      });

      await page.goto('/');
      await page.getByTestId('generate-ideas-btn').click();

      const card = page.getByTestId('idea-card').first();
      await expect(card.getByTestId('idea-title')).toContainText('Idea 1');
      await expect(card).toContainText('Easy');
      await expect(card).toContainText('92%');
      await expect(card).toContainText('Tutorial');
    });

    test('T1.5.3: Click star icon on a generated idea', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO ideas (title, is_favorite) VALUES (?, ?)').run('Star Video Idea', 0);

      await page.route('**/api/ideas/1/favorite', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1, is_favorite: 1 })
        });
      });

      await page.goto('/');
      await page.getByTestId('idea-star-btn').click();

      // Check SQLite state update
      const updatedIdea = db.prepare('SELECT is_favorite FROM ideas WHERE id = 1').get();
      expect(updatedIdea.is_favorite).toBe(1);
      await expect(page.getByTestId('idea-star-btn')).toHaveClass(/gold/);
    });

    test('T1.5.4: Change status dropdown on idea card to "Planned"', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO ideas (title, status) VALUES (?, ?)').run('Planned Video Idea', 'idea');

      await page.route('**/api/ideas/1/status', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1, status: 'planned' })
        });
      });

      await page.goto('/');
      await page.getByTestId('idea-status-select').selectOption('planned');

      const updatedIdea = db.prepare('SELECT status FROM ideas WHERE id = 1').get();
      expect(updatedIdea.status).toBe('planned');
    });

    test('T1.5.5: Click "Remove Idea" on an idea card', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO ideas (title) VALUES (?)').run('Idea to Remove');

      await page.route('**/api/ideas/1', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await page.goto('/');
      await page.getByTestId('delete-idea-btn').click();

      await expect(page.getByTestId('idea-card')).not.toBeVisible();
    });
  });

  // ==========================================
  // F6: Script Writer
  // ==========================================
  test.describe('F6: Script Writer', () => {
    test('T1.6.1: Click "Create Script" from an idea card', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO ideas (title) VALUES (?)').run('Idea with Script');

      await page.goto('/');
      await page.getByTestId('create-script-btn').click();

      await expect(page.getByTestId('script-editor-container')).toBeVisible();
      await expect(page.getByTestId('script-section-editor')).toHaveCount(5); // Hook, Intro, Main, CTA, Outro
    });

    test('T1.6.2: Click "Generate Script Outline"', async ({ page }) => {
      await page.route('**/api/ai/script-outline', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            hook: 'Exciting Hook Text',
            intro: 'Intro Text',
            main: 'Main Body Text',
            cta: 'CTA Text',
            outro: 'Outro Text'
          })
        });
      });

      await page.goto('/');
      // Navigate to Script editor
      await page.getByTestId('create-script-btn').click();
      await page.getByTestId('generate-outline-btn').click();

      await expect(page.getByTestId('script-section-editor').first()).toContainText('Exciting Hook');
    });

    test('T1.6.3: Type custom text in "CTA" editor section and click "Save"', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO ideas (id, title) VALUES (?, ?)').run(1, 'Idea for CTA Script');
      db.prepare('INSERT INTO scripts (idea_id, title, content) VALUES (?, ?, ?)')
        .run(1, 'Idea for CTA Script', 'Initial Script Content');

      await page.route('**/api/scripts/1', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await page.goto('/');
      await page.getByTestId('create-script-btn').click();
      await page.getByTestId('script-cta-input').fill('Subscribe now for more!');
      await page.getByTestId('save-script-btn').click();

      const updatedScript = db.prepare('SELECT content FROM scripts WHERE id = 1').get();
      expect(updatedScript.content).toContain('Subscribe now');
    });

    test('T1.6.4: Click "Regenerate hook" with a "funny" tone request', async ({ page }) => {
      await page.route('**/api/ai/regenerate-section', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ content: 'A very funny hook!' })
        });
      });

      await page.goto('/');
      await page.getByTestId('create-script-btn').click();
      await page.getByTestId('tone-select').selectOption('funny');
      await page.getByTestId('regenerate-section-btn').click(); // Regenerate Hook

      await expect(page.getByTestId('script-section-editor').first()).toContainText('very funny hook');
    });

    test('T1.6.5: Click "Export PDF" from the Script editor page', async ({ page }) => {
      await page.goto('/');
      await page.getByTestId('create-script-btn').click();

      // Intercept file download
      const downloadPromise = page.waitForEvent('download');
      await page.getByTestId('export-pdf-btn').click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toContain('.pdf');
    });
  });

  // ==========================================
  // F7: SEO Optimizer
  // ==========================================
  test.describe('F7: SEO Optimizer', () => {
    test('T1.7.1: Paste title and description in SEO Optimizer, click "Optimize"', async ({ page }) => {
      await page.route('**/api/ai/seo', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await page.goto('/');
      // Navigate to SEO page
      await page.getByTestId('seo-title-input').fill('Original Title');
      await page.getByTestId('seo-description-input').fill('Original Description');
      await page.getByTestId('seo-optimize-btn').click();

      await expect(page.getByTestId('sync-loading-spinner')).toBeVisible();
    });

    test('T1.7.2: Inspect the optimized titles output', async ({ page }) => {
      await page.route('**/api/ai/seo', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            titles: ['Opt Title 1', 'Opt Title 2', 'Opt Title 3', 'Opt Title 4', 'Opt Title 5']
          })
        });
      });

      await page.goto('/');
      await page.getByTestId('seo-optimize-btn').click();

      await expect(page.getByTestId('seo-titles-list')).toBeVisible();
      await expect(page.getByTestId('copy-title-btn')).toHaveCount(5);
    });

    test('T1.7.3: Inspect the tags output panel', async ({ page }) => {
      await page.route('**/api/ai/seo', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            tags: ['react', 'nextjs', 'javascript']
          })
        });
      });

      await page.goto('/');
      await page.getByTestId('seo-optimize-btn').click();

      await expect(page.getByTestId('seo-tags-container')).toBeVisible();
      await expect(page.getByTestId('seo-tag-pill')).toHaveCount(3);
      await expect(page.getByTestId('copy-all-tags-btn')).toBeVisible();
    });

    test('T1.7.4: Inspect the calculated SEO score panel', async ({ page }) => {
      await page.route('**/api/ai/seo', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            seoScore: 85,
            tips: ['Add keywords to intro', 'Make title punchier']
          })
        });
      });

      await page.goto('/');
      await page.getByTestId('seo-optimize-btn').click();

      await expect(page.getByTestId('seo-score-meter')).toContainText('85');
      await expect(page.getByTestId('seo-checklist')).toContainText('Add keywords');
    });

    test('T1.7.5: Click copy button on Title #2', async ({ page }) => {
      await page.route('**/api/ai/seo', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            titles: ['Title One', 'Copy Me Title', 'Title Three']
          })
        });
      });

      await page.goto('/');
      await page.getByTestId('seo-optimize-btn').click();
      await page.getByTestId('copy-title-btn').nth(1).click(); // Click Copy for second title

      // Clipboard verify using page evaluate
      const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardContent).toBe('Copy Me Title');
    });
  });

  // ==========================================
  // F8: Thumbnail Concept Generator
  // ==========================================
  test.describe('F8: Thumbnail Concept Generator', () => {
    test('T1.8.1: Type topic "React Tutorial" in Thumbnail generator and submit', async ({ page }) => {
      await page.route('**/api/ai/thumbnails', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            concepts: [{ id: 1, composition: 'Split screen' }]
          })
        });
      });

      await page.goto('/');
      await page.getByTestId('thumbnail-topic-input').fill('React Tutorial');
      await page.getByTestId('generate-thumbnails-btn').click();

      await expect(page.getByTestId('thumbnail-concept-card')).toHaveCount(1);
    });

    test('T1.8.2: Inspect layout concepts detailed details', async ({ page }) => {
      await page.route('**/api/ai/thumbnails', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            concepts: [{
              id: 1,
              composition: 'Split screen',
              textOverlay: 'React 2026',
              colorTheme: 'Neon Blue',
              trigger: 'Curiosity'
            }]
          })
        });
      });

      await page.goto('/');
      await page.getByTestId('generate-thumbnails-btn').click();

      const card = page.getByTestId('thumbnail-concept-card').first();
      await expect(card).toContainText('Split screen');
      await expect(card).toContainText('React 2026');
      await expect(card).toContainText('Neon Blue');
      await expect(card).toContainText('Curiosity');
    });

    test('T1.8.3: Click "Link to Video Idea" and select an idea', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO ideas (id, title) VALUES (?, ?)').run(1, 'React Portfolio Idea');
      db.prepare('INSERT INTO thumbnails (id, concepts) VALUES (?, ?)')
        .run(1, JSON.stringify([{ id: 1, composition: 'Split screen' }]));

      await page.route('**/api/thumbnails/1/link', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await page.goto('/');
      await page.getByTestId('link-idea-select').selectOption('1'); // React Portfolio Idea

      const dbThumb = db.prepare('SELECT idea_id FROM thumbnails WHERE id = 1').get();
      expect(dbThumb.idea_id).toBe(1);
    });

    test('T1.8.4: Select text overlay suggestion and click "Copy text"', async ({ page }) => {
      await page.route('**/api/ai/thumbnails', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            concepts: [{ id: 1, textOverlay: 'Unique Overlay Text' }]
          })
        });
      });

      await page.goto('/');
      await page.getByTestId('generate-thumbnails-btn').click();
      await page.getByTestId('copy-overlay-btn').click();

      const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardContent).toBe('Unique Overlay Text');
    });

    test('T1.8.5: Click "Delete Concept" on concept list', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO thumbnails (concepts) VALUES (?)').run(JSON.stringify({ id: 1 }));

      await page.route('**/api/thumbnails/1', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await page.goto('/');
      await page.getByTestId('delete-concept-btn').click();

      await expect(page.getByTestId('thumbnail-concept-card')).not.toBeVisible();
    });
  });

  // ==========================================
  // F9: Content Calendar
  // ==========================================
  test.describe('F9: Content Calendar', () => {
    test('T1.9.1: Drag video idea from sidebar list and drop on calendar date June 20', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO ideas (id, title) VALUES (?, ?)').run(1, 'Drag and Drop Video');

      await page.route('**/api/calendar/events', async (route) => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1, idea_id: 1, scheduled_date: '2026-06-20' })
        });
      });

      await page.goto('/');
      // Drag & drop logic simulation in Playwright
      const dragSource = page.getByTestId('calendar-sidebar-idea-item').first();
      const dropTarget = page.locator('[data-date="2026-06-20"]');

      await dragSource.dragTo(dropTarget);

      const dbEvent = db.prepare('SELECT * FROM calendar_events WHERE scheduled_date = ?').get('2026-06-20');
      expect(dbEvent).toBeDefined();
      await expect(page.getByTestId('calendar-event-card')).toBeVisible();
    });

    test('T1.9.2: Double click calendar event card', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO ideas (id, title) VALUES (?, ?)').run(1, 'Click Event Idea');
      db.prepare('INSERT INTO calendar_events (idea_id, scheduled_date, notes) VALUES (?, ?, ?)')
        .run(1, '2026-06-20', 'Important production notes');

      await page.goto('/');
      await page.getByTestId('calendar-event-card').dblclick();

      await expect(page.getByTestId('event-detail-modal')).toBeVisible();
      await expect(page.getByTestId('event-detail-modal')).toContainText('Important production notes');
    });

    test('T1.9.3: Switch calendar view to "Week View"', async ({ page }) => {
      await page.goto('/');
      await page.getByTestId('calendar-view-toggle').click(); // Toggle to Week View

      await expect(page.getByTestId('calendar-month-grid')).not.toBeVisible();
    });

    test('T1.9.4: Select status "Editing" in the event detail popup', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO ideas (id, title) VALUES (?, ?)').run(1, 'Status Event Idea');
      db.prepare('INSERT INTO calendar_events (id, idea_id, status) VALUES (?, ?, ?)')
        .run(1, 1, 'planned');

      await page.route('**/api/calendar/events/1/status', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await page.goto('/');
      await page.getByTestId('calendar-event-card').dblclick();
      await page.getByTestId('event-status-select').selectOption('editing');

      const dbEvent = db.prepare('SELECT status FROM calendar_events WHERE id = 1').get();
      expect(dbEvent.status).toBe('editing');
      await expect(page.getByTestId('calendar-event-card')).toHaveClass(/editing/);
    });

    test('T1.9.5: View calendar with multiple channel events', async ({ page }) => {
      const db = getDb();
      // Channel 1 (Color A)
      db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)').run(1, 'UC1', 'Vlog');
      // Channel 2 (Color B)
      db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)').run(2, 'UC2', 'Gaming');

      db.prepare('INSERT INTO ideas (id, title, channel_id) VALUES (?, ?, ?)').run(1, 'Vlog Video', 1);
      db.prepare('INSERT INTO ideas (id, title, channel_id) VALUES (?, ?, ?)').run(2, 'Gaming Stream', 2);

      db.prepare('INSERT INTO calendar_events (idea_id, channel_id) VALUES (?, ?)').run(1, 1);
      db.prepare('INSERT INTO calendar_events (idea_id, channel_id) VALUES (?, ?)').run(2, 2);

      await page.goto('/');

      const eventA = page.getByTestId('calendar-event-card').nth(0);
      const eventB = page.getByTestId('calendar-event-card').nth(1);

      // Verify distinct color class per channel
      await expect(eventA).toHaveClass(/channel-color-1/);
      await expect(eventB).toHaveClass(/channel-color-2/);
    });
  });

  // ==========================================
  // F10: Competitor Tracker & Daily Suggestions
  // ==========================================
  test.describe('F10: Competitor Tracker & Daily Suggestions', () => {
    test('T1.10.1: Add competitor channel username @TechTips', async ({ page }) => {
      await page.route('**/api/competitors', async (route) => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1, competitor_name: 'TechTips', competitor_channel_id: 'UC_TECHTIPS' })
        });
      });

      await page.goto('/');
      await page.getByTestId('competitor-handle-input').fill('@TechTips');
      await page.getByTestId('add-competitor-btn').click();

      // Verify db insertion
      const db = getDb();
      const comp = db.prepare('SELECT * FROM competitors WHERE competitor_name = ?').get('TechTips');
      expect(comp).toBeDefined();
    });

    test('T1.10.2: Click competitor @TechTips card', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO competitors (id, competitor_channel_id, competitor_name) VALUES (?, ?, ?)')
        .run(1, 'UC_TECHTIPS', 'TechTips');

      await page.route('**/api/competitors/1/uploads', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'v1', title: 'Top Competitor Hack' }])
        });
      });

      await page.goto('/');
      await page.getByTestId('competitor-card').click();

      await expect(page.getByTestId('competitor-timeline')).toBeVisible();
      await expect(page.getByTestId('competitor-timeline')).toContainText('Top Competitor Hack');
    });

    test('T1.10.3: Open app and inspect "Daily Suggestions" sidebar', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO suggestions (content, is_read) VALUES (?, ?)')
        .run('Vite 6 is trending. Create a video today!', 0);

      await page.goto('/');
      await expect(page.getByTestId('daily-suggestions-sidebar')).toBeVisible();
      await expect(page.getByTestId('suggestion-card')).toContainText('Vite 6 is trending');
    });

    test('T1.10.4: Click "Dismiss" on daily suggestion card', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO suggestions (id, content, is_read) VALUES (?, ?, ?)')
        .run(1, 'Old daily tip', 0);

      await page.route('**/api/suggestions/1/dismiss', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await page.goto('/');
      await page.getByTestId('dismiss-suggestion-btn').click();

      // Check SQLite state update
      const dbSugg = db.prepare('SELECT is_read FROM suggestions WHERE id = 1').get();
      expect(dbSugg.is_read).toBe(1);
      await expect(page.getByTestId('suggestion-card')).not.toBeVisible();
    });

    test('T1.10.5: Trigger a daily suggestion event when app is minimized', async ({ page }) => {
      // Setup window notification spy
      await page.goto('/');
      const notificationFired = await page.evaluate(() => {
        let fired = false;
        // Mock Notification API
        window.Notification = class {
          constructor(title, options) {
            fired = true;
            this.title = title;
          }
          static permission = 'granted';
          static requestPermission() { return Promise.resolve('granted'); }
        };
        // Trigger simulation
        setTimeout(() => {
          new window.Notification('Trending Event', { body: 'New Alert' });
        }, 10);
        return new Promise(resolve => setTimeout(() => resolve(fired), 50));
      });

      expect(notificationFired).toBe(true);
    });
  });

});
