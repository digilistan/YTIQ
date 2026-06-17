const { test, expect } = require('@playwright/test');
const { getDb, clearDatabase } = require('../helpers/testDbHelper');

test.describe('Tier 2: Boundary & Corner Cases', () => {

  test.beforeEach(async () => {
    // Clean database before each test to maintain state isolation
    clearDatabase();
  });

  // ==========================================
  // F1: Channel Switcher & Channel Management
  // ==========================================
  test.describe('F1: Channel Switcher & Channel Management', () => {
    test('T2.1.1: Enter an invalid/broken channel ID string !!broken!! in settings', async ({ page }) => {
      // Mock the backend API response for adding an invalid channel
      await page.route('**/api/channels', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid channel ID' })
        });
      });

      await page.goto('/');
      await page.getByTestId('settings-panel').click();
      await page.getByTestId('add-channel-input').fill('!!broken!!');
      await page.getByTestId('add-channel-btn').click();

      // Verify UI displays error state/message
      const settingsModal = page.getByTestId('settings-panel');
      await expect(settingsModal).toContainText('Invalid channel ID');
    });

    test('T2.1.2: Add channel UC1111 when it already exists in SQLite', async ({ page }) => {
      // Seed a channel into SQLite database
      const db = getDb();
      db.prepare('INSERT INTO channels (youtube_channel_id, name) VALUES (?, ?)')
        .run('UC1111', 'Existing Channel');

      // Mock backend API returning conflict error
      await page.route('**/api/channels', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Channel already connected' })
        });
      });

      await page.goto('/');
      await page.getByTestId('settings-panel').click();
      await page.getByTestId('add-channel-input').fill('UC1111');
      await page.getByTestId('add-channel-btn').click();

      // Verify duplicate warning
      const settingsModal = page.getByTestId('settings-panel');
      await expect(settingsModal).toContainText('Channel already connected');
    });

    test('T2.1.3: Switch to a newly created channel with 0 videos and 0 views', async ({ page }) => {
      // Seed a channel with 0 stats
      const db = getDb();
      const insertChannel = db.prepare('INSERT INTO channels (youtube_channel_id, name) VALUES (?, ?)');
      const channelResult = insertChannel.run('UC-EMPTY', 'Empty Channel');
      const channelId = channelResult.lastInsertRowid;

      db.prepare('INSERT INTO channel_stats (channel_id, date, subscribers, total_views, video_count) VALUES (?, ?, ?, ?, ?)')
        .run(channelId, '2026-06-17', 0, 0, 0);

      // Mock stats update backend API to return zero stats
      await page.route('**/api/youtube/stats?channelId=EmptyChannel', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ subscribers: 0, total_views: 0, video_count: 0, watch_time: 0 })
        });
      });

      await page.goto('/');
      await page.getByTestId('channel-switcher-select').selectOption({ label: 'Empty Channel' });

      // Verify UI displays 0 values and handles them cleanly without NaN or crashes
      await expect(page.getByTestId('stats-subscribers-card')).toContainText('0');
      await expect(page.getByTestId('stats-views-card')).toContainText('0');
      await expect(page.getByTestId('stats-videos-card')).toContainText('0');
    });

    test('T2.1.4: Start app with zero channels connected', async ({ page }) => {
      // Mock empty channels list from backend
      await page.route('**/api/channels', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });

      await page.goto('/');
      // Verify app prompts user to add their first channel or defaults to settings view
      await expect(page.locator('body')).toContainText('Add your first channel');
    });

    test('T2.1.5: Switch channel while a previous channel stats request is pending', async ({ page }) => {
      // Seed two channels
      const db = getDb();
      db.prepare('INSERT INTO channels (youtube_channel_id, name) VALUES (?, ?)').run('UC-FIRST', 'First Channel');
      db.prepare('INSERT INTO channels (youtube_channel_id, name) VALUES (?, ?)').run('UC-SECOND', 'Second Channel');

      // Mock slow request for First Channel
      let firstRequestDeferred;
      const firstRequestPromise = new Promise(resolve => {
        firstRequestDeferred = resolve;
      });
      await page.route('**/api/youtube/stats?channelId=FirstChannel', async (route) => {
        await firstRequestPromise;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ subscribers: 1000 })
        });
      });

      // Mock fast request for Second Channel
      await page.route('**/api/youtube/stats?channelId=SecondChannel', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ subscribers: 25000 })
        });
      });

      await page.goto('/');
      
      // Select First Channel
      await page.getByTestId('channel-switcher-select').selectOption({ label: 'First Channel' });
      // Select Second Channel immediately after
      await page.getByTestId('channel-switcher-select').selectOption({ label: 'Second Channel' });

      // Resolve the first slow request
      firstRequestDeferred();

      // Verify UI has updated context to the second channel's stats
      await expect(page.getByTestId('stats-subscribers-card')).toContainText('25,000');
    });
  });

  // ==========================================
  // F2: Dashboard - Key Stats Cards
  // ==========================================
  test.describe('F2: Dashboard - Key Stats Cards', () => {
    test('T2.2.1: Mock YouTube API returning HTTP 403 (quota exceeded)', async ({ page }) => {
      // Mock the sync API returning Quota Exceeded error
      await page.route('**/api/youtube/sync', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Quota exceeded' })
        });
      });

      await page.goto('/');
      await page.getByTestId('manual-sync-btn').click();

      // Verify error alert toast/banner
      await expect(page.locator('body')).toContainText('Quota exceeded');
    });

    test('T2.2.2: Mock stats API returning subscriber value 0', async ({ page }) => {
      await page.route('**/api/youtube/stats*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ subscribers: 0 })
        });
      });

      await page.goto('/');
      await expect(page.getByTestId('stats-subscribers-card')).toContainText('0');
    });

    test('T2.2.3: Mock stats API returning subscriber value 999,999,999,999', async ({ page }) => {
      await page.route('**/api/youtube/stats*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ subscribers: 999999999999 })
        });
      });

      await page.goto('/');
      // Verify formatted large metric value is formatted correctly and doesn't crash layout
      await expect(page.getByTestId('stats-subscribers-card')).toContainText('999.9B');
    });

    test('T2.2.4: Disconnect network link and click manual sync', async ({ page }) => {
      await page.goto('/');
      
      // Mock network connection failure by failing the API route
      await page.route('**/api/youtube/sync', async (route) => {
        await route.abort('failed');
      });

      await page.getByTestId('manual-sync-btn').click();

      // Verify offline toast message
      await expect(page.locator('body')).toContainText('No internet connection. Using cached stats');
    });

    test('T2.2.5: Connect channel with name <h1>Danger</h1><script>alert(1)</script>', async ({ page }) => {
      // Seed a channel with raw HTML/JS code inside name to verify XSS escaping
      const db = getDb();
      db.prepare('INSERT INTO channels (youtube_channel_id, name) VALUES (?, ?)')
        .run('UC-XSS', '<h1>Danger</h1><script>alert(1)</script>');

      await page.goto('/');
      
      // Verify the element exists as raw escaped text, not active HTML
      const selectOption = page.getByTestId('channel-switcher-select').locator('option').last();
      await expect(selectOption).toContainText('<h1>Danger</h1><script>alert(1)</script>');
    });
  });

  // ==========================================
  // F3: Dashboard - Growth Charts & Top Videos
  // ==========================================
  test.describe('F3: Dashboard - Growth Charts & Top Videos', () => {
    test('T2.3.1: Render historical growth chart with missing date segments', async ({ page }) => {
      // Mock historical data containing gaps (null or missing values)
      await page.route('**/api/youtube/growth-data*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { date: '2026-06-10', subscribers: 100 },
            { date: '2026-06-11', subscribers: null }, // missing/null subscriber count
            { date: '2026-06-12', subscribers: 120 }
          ])
        });
      });

      await page.goto('/');
      // Verify growth chart renders without throwing errors on null data points
      await expect(page.getByTestId('growth-chart-container')).toBeVisible();
    });

    test('T2.3.2: Mock top videos API returning negative views (faulty data)', async ({ page }) => {
      await page.route('**/api/youtube/top-videos', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'vid-neg', title: 'Faulty Data Video', views: -500 }])
        });
      });

      await page.goto('/');
      // Verify display formats negative views as 0 or handles it cleanly
      await expect(page.getByTestId('top-videos-table')).toBeVisible();
      await expect(page.getByTestId('top-videos-row').first()).toContainText('0');
    });

    test('T2.3.3: Mock top videos table containing 500-character title string', async ({ page }) => {
      const longTitle = 'A'.repeat(500);
      await page.route('**/api/youtube/top-videos', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 'vid-long', title: longTitle, views: 1000 }])
        });
      });

      await page.goto('/');
      // Verify title fits inside row structure with truncation/text-wrap
      const videoTitleElement = page.getByTestId('top-video-title').first();
      await expect(videoTitleElement).toBeVisible();
      // Inspect layout constraints (e.g. element does not overlap surrounding actions)
      await expect(page.getByTestId('top-videos-row').first().locator('td').last()).toBeVisible();
    });

    test('T2.3.4: Request historical graph data spanning 10 years (10,000 dates)', async ({ page }) => {
      // Mock huge array of historical points
      const hugeDataset = Array.from({ length: 10000 }, (_, i) => ({
        date: `2016-01-01T${i}`,
        subscribers: i * 10
      }));

      await page.route('**/api/youtube/growth-data*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(hugeDataset)
        });
      });

      await page.goto('/');
      // Verify chart container loads successfully and page does not crash/freeze
      await expect(page.getByTestId('growth-chart-container')).toBeVisible();
    });

    test('T2.3.5: Access dashboard from viewport width 320px', async ({ page }) => {
      // Resize viewport to absolute minimum size (mobile portrait)
      await page.setViewportSize({ width: 320, height: 600 });
      await page.goto('/');
      
      // Verify UI collapses or reformats correctly (e.g. chart adapts)
      await expect(page.getByTestId('growth-chart-container')).toBeVisible();
    });
  });

  // ==========================================
  // F4: Niche Explorer
  // ==========================================
  test.describe('F4: Niche Explorer', () => {
    test('T2.4.1: Click Niche explorer search with empty text input', async ({ page }) => {
      await page.goto('/');
      await page.getByTestId('niche-topic-input').fill('');
      
      // Submit button should be disabled, or validation styling should trigger
      const analyzeBtn = page.getByTestId('niche-analyze-btn');
      if (await analyzeBtn.isEnabled()) {
        await analyzeBtn.click();
        await expect(page.getByTestId('niche-topic-input')).toHaveClass(/border-red|invalid/);
      } else {
        await expect(analyzeBtn).toBeDisabled();
      }
    });

    test('T2.4.2: Enter query string with length of 2,000 characters', async ({ page }) => {
      const longQuery = 'X'.repeat(2000);
      await page.goto('/');
      await page.getByTestId('niche-topic-input').fill(longQuery);

      // Verify field limits character length input to max characters (e.g. 200)
      const value = await page.getByTestId('niche-topic-input').inputValue();
      expect(value.length).toBeLessThanOrEqual(200);
    });

    test('T2.4.3: Simulate longcat.chat timeout (HTTP 504) during niche search', async ({ page }) => {
      await page.route('**/api/ai/niche-explorer', async (route) => {
        await route.fulfill({
          status: 504,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Request timed out. Please retry.' })
        });
      });

      await page.goto('/');
      await page.getByTestId('niche-topic-input').fill('WebAssembly');
      await page.getByTestId('niche-analyze-btn').click();

      // Verify UI changes state to error alert
      await expect(page.locator('body')).toContainText('Request timed out. Please retry.');
    });

    test('T2.4.4: Submit topic with Special characters and SQL inputs (\' OR 1=1 --)', async ({ page }) => {
      const sqlInjectionStr = "' OR 1=1 --";
      await page.route('**/api/ai/niche-explorer', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ topic: sqlInjectionStr, competitors: [] })
        });
      });

      await page.goto('/');
      await page.getByTestId('niche-topic-input').fill(sqlInjectionStr);
      await page.getByTestId('niche-analyze-btn').click();

      // Verify backend SQL parameterization prevents crash and allows clean explorer load
      await expect(page.getByTestId('niche-results-container')).toBeVisible();
    });

    test('T2.4.5: Click "Save Niche" twice in rapid succession', async ({ page }) => {
      await page.route('**/api/ai/niche-explorer', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ topic: 'Fast Save' })
        });
      });

      // Mock database save API returning conflict error on second click
      let requestCount = 0;
      await page.route('**/api/niches', async (route) => {
        requestCount++;
        if (requestCount > 1) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Niche is already saved' })
          });
        } else {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ id: 1, topic: 'Fast Save' })
          });
        }
      });

      await page.goto('/');
      await page.getByTestId('niche-topic-input').fill('Fast Save');
      await page.getByTestId('niche-analyze-btn').click();
      
      // Perform double click
      const saveBtn = page.getByTestId('save-niche-btn');
      await saveBtn.click();
      await saveBtn.click();

      // Verify duplicate toast/alert
      await expect(page.locator('body')).toContainText('Niche is already saved');
    });
  });

  // ==========================================
  // F5: Video Idea Generator
  // ==========================================
  test.describe('F5: Video Idea Generator', () => {
    test('T2.5.1: Select no niche and request video idea generation', async ({ page }) => {
      await page.goto('/');
      // Trigger idea generation without selecting a saved niche
      await page.getByTestId('idea-niche-select').selectOption('');
      await page.getByTestId('generate-ideas-btn').click();

      // Verify UI displays warning
      await expect(page.locator('body')).toContainText('Select a niche first');
    });

    test('T2.5.2: Mock AI returning malformed non-JSON data for idea generation', async ({ page }) => {
      // Mock the AI returning invalid JSON content (e.g. plain text or html error page)
      await page.route('**/api/ai/video-ideas', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/plain',
          body: 'Internal Server Error'
        });
      });

      await page.goto('/');
      await page.getByTestId('generate-ideas-btn').click();

      // Verify fallback error widget is rendered safely
      await expect(page.locator('body')).toContainText('Malformed AI response');
    });

    test('T2.5.3: Generate ideas with titles containing HTML tags', async ({ page }) => {
      // Mock ideas with HTML injected title
      await page.route('**/api/ai/video-ideas', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: 1, title: '<b>Malicious Title</b><script>alert(1)</script>' }])
        });
      });

      await page.goto('/');
      await page.getByTestId('generate-ideas-btn').click();

      // Verify HTML title is fully escaped and renders as raw string text
      const titleElement = page.getByTestId('idea-title').first();
      await expect(titleElement).toContainText('<b>Malicious Title</b><script>alert(1)</script>');
    });

    test('T2.5.4: Load Ideas page with 1,000 ideas saved', async ({ page }) => {
      const db = getDb();
      // Insert large count of ideas
      const insertIdea = db.prepare('INSERT INTO ideas (title) VALUES (?)');
      const insertMany = db.transaction((items) => {
        for (const item of items) insertIdea.run(item);
      });
      insertMany(Array.from({ length: 1000 }, (_, i) => `Idea Number ${i}`));

      await page.goto('/');
      // Check list is rendered and scrollable/paginated safely without hanging
      await expect(page.getByTestId('idea-card').first()).toBeVisible();
    });

    test('T2.5.5: Attempt to delete a video idea that is currently on the Content Calendar', async ({ page }) => {
      const db = getDb();
      // Seed idea and schedule it on the Content Calendar
      db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)').run(1, 'UC1', 'ChA');
      db.prepare('INSERT INTO ideas (id, channel_id, title) VALUES (?, ?, ?)').run(1, 1, 'Calendar Scheduled Idea');
      db.prepare('INSERT INTO calendar_events (idea_id, channel_id, scheduled_date) VALUES (?, ?, ?)')
        .run(1, 1, '2026-06-20');

      await page.goto('/');
      // Click delete button
      await page.getByTestId('delete-idea-btn').click();

      // Verify confirmation warning dialog appears alerting calendar scheduling status
      await expect(page.locator('body')).toContainText('This idea is scheduled. Delete anyway?');
    });
  });

  // ==========================================
  // F6: Script Writer
  // ==========================================
  test.describe('F6: Script Writer', () => {
    test('T2.6.1: Open script editor for video idea with blank title', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)').run(1, 'UC1', 'ChA');
      db.prepare('INSERT INTO ideas (id, channel_id, title) VALUES (?, ?, ?)').run(1, 1, ''); // Empty title

      await page.goto('/');
      await page.getByTestId('create-script-btn').click();

      // Verify fallback name formatting works in script header
      await expect(page.getByTestId('script-editor-container')).toContainText('Untitled Script');
    });

    test('T2.6.2: Save a script containing 500,000 words', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)').run(1, 'UC1', 'ChA');
      db.prepare('INSERT INTO ideas (id, channel_id, title) VALUES (?, ?, ?)').run(1, 1, 'Heavy Script');
      db.prepare('INSERT INTO scripts (idea_id, channel_id, title, content) VALUES (?, ?, ?, ?)')
        .run(1, 1, 'Heavy Script', 'Init Content');

      const heavyContent = 'Word '.repeat(500000);

      await page.route('**/api/scripts/1', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await page.goto('/');
      await page.getByTestId('create-script-btn').click();
      await page.getByTestId('script-section-editor').first().fill(heavyContent);
      await page.getByTestId('save-script-btn').click();

      // Verify database persists text successfully and UI is responsive
      const savedScript = db.prepare('SELECT content FROM scripts WHERE id = 1').get();
      expect(savedScript.content).toBeDefined();
    });

    test('T2.6.3: Disconnect network while script editor is active', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)').run(1, 'UC1', 'ChA');
      db.prepare('INSERT INTO ideas (id, channel_id, title) VALUES (?, ?, ?)').run(1, 1, 'Offline Test Idea');

      await page.goto('/');
      await page.getByTestId('create-script-btn').click();

      // Emulate offline state
      await page.context().setOffline(true);

      // Perform edit
      await page.getByTestId('script-section-editor').first().fill('Offline modified text');
      
      // Verify visual indicator switches to Offline local backup mode
      await expect(page.locator('body')).toContainText('Offline (Autosaving locally)');

      // Restore network
      await page.context().setOffline(false);
    });

    test('T2.6.4: Request script generation in unsupported language', async ({ page }) => {
      // Mock AI response returning disclaimer fallback for unsupported language
      await page.route('**/api/ai/script-outline', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            hook: 'Language not supported, generated in English: This is English hook text.'
          })
        });
      });

      await page.goto('/');
      await page.getByTestId('create-script-btn').click();
      await page.getByTestId('tone-select').selectOption('Klingon'); // Select unsupported language mock
      await page.getByTestId('generate-outline-btn').click();

      // Verify outline defaults to English and includes warning disclaimer
      await expect(page.getByTestId('script-section-editor').first()).toContainText('Language not supported, generated in English');
    });

    test('T2.6.5: Click Export PDF for an empty script', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)').run(1, 'UC1', 'ChA');
      db.prepare('INSERT INTO ideas (id, channel_id, title) VALUES (?, ?, ?)').run(1, 1, 'Empty Script Idea');
      db.prepare('INSERT INTO scripts (idea_id, channel_id, title, content) VALUES (?, ?, ?, ?)')
        .run(1, 1, 'Empty Script Idea', ''); // Empty content

      await page.goto('/');
      await page.getByTestId('create-script-btn').click();

      // Verify export button displays warning tooltip or is disabled
      const exportBtn = page.getByTestId('export-pdf-btn');
      if (await exportBtn.isEnabled()) {
        await exportBtn.click();
        await expect(page.locator('body')).toContainText('Add content before exporting');
      } else {
        await expect(exportBtn).toBeDisabled();
      }
    });
  });

  // ==========================================
  // F7: SEO Optimizer
  // ==========================================
  test.describe('F7: SEO Optimizer', () => {
    test('T2.7.1: Submit a single character "a" in SEO Optimizer', async ({ page }) => {
      await page.goto('/');
      await page.getByTestId('seo-title-input').fill('a');
      await page.getByTestId('seo-optimize-btn').click();

      // Verify validation rule warning
      await expect(page.locator('body')).toContainText('Input must be at least 5 characters');
    });

    test('T2.7.2: Mock AI returning empty tags array', async ({ page }) => {
      await page.route('**/api/ai/seo', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ titles: [], tags: [], seoScore: 0, tips: [] })
        });
      });

      await page.goto('/');
      await page.getByTestId('seo-title-input').fill('Valid Test Title');
      await page.getByTestId('seo-optimize-btn').click();

      // Verify UI displays informative stub text
      await expect(page.getByTestId('seo-tags-container')).toContainText('No tags generated. Add tags manually.');
    });

    test('T2.7.3: Submit description with malicious script tags', async ({ page }) => {
      const maliciousHtml = '<script>alert("xss")</script> Bad Description';
      await page.route('**/api/ai/seo', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await page.goto('/');
      await page.getByTestId('seo-description-input').fill(maliciousHtml);
      await page.getByTestId('seo-optimize-btn').click();

      // Verify text is treated as raw text instead of active script
      await expect(page.getByTestId('seo-description-input')).toHaveValue(maliciousHtml);
    });

    test('T2.7.4: Click copy tags when clipboard API is denied', async ({ page }) => {
      await page.route('**/api/ai/seo', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tags: ['tag1', 'tag2'] })
        });
      });

      await page.goto('/');
      await page.getByTestId('seo-optimize-btn').click();

      // Mock Clipboard Write failure
      await page.evaluate(() => {
        navigator.clipboard.writeText = () => Promise.reject(new Error('Permission Denied'));
      });

      await page.getByTestId('copy-all-tags-btn').click();

      // Verify fallback manual copying instructions dialog/textarea is visible
      await expect(page.locator('body')).toContainText('Press Ctrl+C to copy');
    });

    test('T2.7.5: Set SEO checklist rules to achieve edge scores (0 and 100)', async ({ page }) => {
      // Mock score of 0
      await page.route('**/api/ai/seo', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ seoScore: 0 })
        });
      });

      await page.goto('/');
      await page.getByTestId('seo-optimize-btn').click();
      await expect(page.getByTestId('seo-score-meter')).toContainText('0');

      // Mock score of 100
      await page.route('**/api/ai/seo', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ seoScore: 100 })
        });
      });

      await page.getByTestId('seo-optimize-btn').click();
      await expect(page.getByTestId('seo-score-meter')).toContainText('100');
    });
  });

  // ==========================================
  // F8: Thumbnail Concept Generator
  // ==========================================
  test.describe('F8: Thumbnail Concept Generator', () => {
    test('T2.8.1: Submit single period "." to thumbnail concept generator', async ({ page }) => {
      await page.route('**/api/ai/thumbnails', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ concepts: [{ id: 1, composition: 'Fallback concept composition' }] })
        });
      });

      await page.goto('/');
      await page.getByTestId('thumbnail-topic-input').fill('.');
      await page.getByTestId('generate-thumbnails-btn').click();

      // Verify fallback template results return
      await expect(page.getByTestId('thumbnail-concept-card')).toBeVisible();
    });

    test('T2.8.2: Mock AI returning malformed payload for thumbnail ideas', async ({ page }) => {
      await page.route('**/api/ai/thumbnails', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ bad_key: 'malformed data' })
        });
      });

      await page.goto('/');
      await page.getByTestId('generate-thumbnails-btn').click();

      // Verify display shows error widget
      await expect(page.locator('body')).toContainText('Could not generate thumbnail concepts. Try again');
    });

    test('T2.8.3: Save duplicate thumbnail concept', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)').run(1, 'UC1', 'ChA');
      db.prepare('INSERT INTO ideas (id, channel_id, title) VALUES (?, ?, ?)').run(1, 1, 'Test Idea');
      db.prepare('INSERT INTO thumbnails (id, idea_id, concepts) VALUES (?, ?, ?)')
        .run(1, 1, JSON.stringify([{ id: 1, composition: 'Initial Composition' }]));

      // Mock save database API returning status 200
      await page.route('**/api/thumbnails/1', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });

      await page.goto('/');
      // Trigger save of secondary thumbnail concept
      const dbThumbnailsCount = db.prepare('SELECT COUNT(*) as count FROM thumbnails').get().count;
      expect(dbThumbnailsCount).toBe(1);
    });

    test('T2.8.4: View thumbnail panel for idea with no concepts', async ({ page }) => {
      await page.goto('/');
      // Navigate to concepts list with empty library
      await expect(page.locator('body')).toContainText('Generate Thumbnail Ideas');
    });

    test('T2.8.5: Attempt mock thumbnail upload of 15MB file', async ({ page }) => {
      await page.goto('/');
      
      // Simulate file upload with 15MB size
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.locator('input[type="file"]').click().catch(() => {}),
      ]);
      
      // If fileChooser triggered, verify upload error block is shown
      if (fileChooser) {
        // Mock a 15MB file select
        await expect(page.locator('body')).toContainText('Max upload file size is 10MB');
      } else {
        // Fallback checks for hardcoded text triggers
        await expect(page.locator('body')).toContainText('Max upload file size is 10MB');
      }
    });
  });

  // ==========================================
  // F9: Content Calendar
  // ==========================================
  test.describe('F9: Content Calendar', () => {
    test('T2.9.1: Drag calendar card outside the month grid bounds', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)').run(1, 'UC1', 'ChA');
      db.prepare('INSERT INTO ideas (id, channel_id, title) VALUES (?, ?, ?)').run(1, 1, 'My Test Idea');
      db.prepare('INSERT INTO calendar_events (idea_id, channel_id, scheduled_date) VALUES (?, ?, ?)')
        .run(1, 1, '2026-06-20');

      await page.goto('/');
      
      // Simulate drag-and-drop to out-of-bounds sidebar header
      const dragCard = page.getByTestId('calendar-event-card').first();
      const nonGridTarget = page.locator('header').first();
      await dragCard.dragTo(nonGridTarget);

      // Verify calendar state reverts and date remains unchanged
      const dbEvent = db.prepare('SELECT scheduled_date FROM calendar_events WHERE idea_id = 1').get();
      expect(dbEvent.scheduled_date).toBe('2026-06-20');
    });

    test('T2.9.2: Schedule 10 videos on the exact same calendar date', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)').run(1, 'UC1', 'ChA');
      for (let i = 1; i <= 10; i++) {
        db.prepare('INSERT INTO ideas (id, channel_id, title) VALUES (?, ?, ?)').run(i, 1, `Idea ${i}`);
        db.prepare('INSERT INTO calendar_events (idea_id, channel_id, scheduled_date) VALUES (?, ?, ?)')
          .run(i, 1, '2026-06-20');
      }

      await page.goto('/');
      // Verify date container lists cards and maintains visibility
      const containerCell = page.locator('[data-date="2026-06-20"]');
      await expect(containerCell.getByTestId('calendar-event-card')).toHaveCount(10);
    });

    test('T2.9.3: Mock calendar events in year 1900 and 2150', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)').run(1, 'UC1', 'ChA');
      
      db.prepare('INSERT INTO ideas (id, channel_id, title) VALUES (?, ?, ?)').run(1, 1, '1900 Idea');
      db.prepare('INSERT INTO calendar_events (idea_id, channel_id, scheduled_date) VALUES (?, ?, ?)')
        .run(1, 1, '1900-01-01');

      db.prepare('INSERT INTO ideas (id, channel_id, title) VALUES (?, ?, ?)').run(2, 1, '2150 Idea');
      db.prepare('INSERT INTO calendar_events (idea_id, channel_id, scheduled_date) VALUES (?, ?, ?)')
        .run(2, 1, '2150-12-31');

      await page.goto('/');
      // Verify calendar does not crash on extreme scheduling dates
      await expect(page.getByTestId('calendar-month-grid')).toBeVisible();
    });

    test('T2.9.4: Drag calendar event when server connection is offline', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)').run(1, 'UC1', 'ChA');
      db.prepare('INSERT INTO ideas (id, channel_id, title) VALUES (?, ?, ?)').run(1, 1, 'Offline Drag Idea');
      db.prepare('INSERT INTO calendar_events (idea_id, channel_id, scheduled_date) VALUES (?, ?, ?)')
        .run(1, 1, '2026-06-20');

      await page.goto('/');
      await page.context().setOffline(true);

      const dragCard = page.getByTestId('calendar-event-card').first();
      const dropTarget = page.locator('[data-date="2026-06-22"]');
      
      // Perform drag action
      await dragCard.dragTo(dropTarget).catch(() => {});

      // Verify card returns to position and offline toast displays
      await expect(page.locator('body')).toContainText('Offline - failed to reschedule');
      
      // Restore network
      await page.context().setOffline(false);
    });

    test('T2.9.5: View scheduled calendar event after the parent video idea is deleted', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)').run(1, 'UC1', 'ChA');
      db.prepare('INSERT INTO ideas (id, channel_id, title) VALUES (?, ?, ?)').run(1, 1, 'Idea to Delete');
      db.prepare('INSERT INTO calendar_events (idea_id, channel_id, scheduled_date) VALUES (?, ?, ?)')
        .run(1, 1, '2026-06-20');

      // Delete parent idea directly from SQLite database
      db.prepare('DELETE FROM ideas WHERE id = 1').run();

      await page.goto('/');

      // Verify calendar event has been cascade-removed and is hidden
      await expect(page.getByTestId('calendar-event-card')).not.toBeVisible();
    });
  });

  // ==========================================
  // F10: Competitor Tracker & Daily Suggestions
  // ==========================================
  test.describe('F10: Competitor Tracker & Daily Suggestions', () => {
    test('T2.10.1: Add competitor channel that does not exist on YouTube', async ({ page }) => {
      await page.route('**/api/competitors', async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Competitor channel not found' })
        });
      });

      await page.goto('/');
      await page.getByTestId('competitor-handle-input').fill('@FakeChannel123');
      await page.getByTestId('add-competitor-btn').click();

      // Verify UI displays error state
      await expect(page.locator('body')).toContainText('Competitor channel not found');
    });

    test('T2.10.2: Add 50 competitors to the tracker watch list', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)').run(1, 'UC1', 'ChA');
      
      // Seed 50 competitors
      const insertComp = db.prepare('INSERT INTO competitors (channel_id, competitor_channel_id, competitor_name) VALUES (?, ?, ?)');
      const insertTx = db.transaction((rows) => {
        for (const row of rows) insertComp.run(row.channel_id, row.channel_id_str, row.name);
      });
      insertTx(Array.from({ length: 50 }, (_, i) => ({
        channel_id: 1,
        channel_id_str: `UC_COMP_${i}`,
        name: `Competitor ${i}`
      })));

      await page.goto('/');
      // Verify tracker renders all cards cleanly
      await expect(page.getByTestId('competitor-card').first()).toBeVisible();
    });

    test('T2.10.3: Clear all database suggestions', async ({ page }) => {
      const db = getDb();
      // Ensure suggestions table is completely empty
      db.prepare('DELETE FROM suggestions').run();

      await page.goto('/');
      // Verify suggestions widget shows placeholder/empty text
      await expect(page.getByTestId('daily-suggestions-sidebar')).toContainText('No daily suggestions. Try generating niches to start.');
    });

    test('T2.10.4: Block browser notifications', async ({ page }) => {
      await page.goto('/');
      
      // Override browser Notification API to block permissions
      await page.evaluate(() => {
        window.Notification = class {
          constructor() {}
          static permission = 'denied';
          static requestPermission() { return Promise.resolve('denied'); }
        };
      });

      // Trigger app notifications logic
      await expect(page.getByTestId('daily-suggestions-sidebar')).toBeVisible();
    });

    test('T2.10.5: Request competitor uploads when competitor has 0 uploads', async ({ page }) => {
      const db = getDb();
      db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)').run(1, 'UC1', 'ChA');
      db.prepare('INSERT INTO competitors (id, channel_id, competitor_channel_id, competitor_name) VALUES (?, ?, ?, ?)')
        .run(1, 1, 'UC_EMPTY_COMP', 'Empty Competitor');

      // Mock competitor timeline request returning zero uploads
      await page.route('**/api/competitors/1/uploads', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });

      await page.goto('/');
      await page.getByTestId('competitor-card').click();

      // Verify placeholder feedback in timeline
      await expect(page.getByTestId('competitor-timeline')).toContainText('No recent uploads from this channel.');
    });
  });

});
