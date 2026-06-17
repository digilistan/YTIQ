const { test, expect } = require('@playwright/test');
const { getDb, clearDatabase } = require('../helpers/testDbHelper');

test.describe('Tier 4: Real-world Application Scenarios', () => {

  test.beforeEach(async () => {
    // Clean database before each test to maintain state isolation
    clearDatabase();
  });

  // =========================================================================
  // T4.1: The Standard Creator Daily Production Workflow
  // =========================================================================
  test('T4.1: The Standard Creator Daily Production Workflow', async ({ page }) => {
    const db = getDb();

    // 1. Seed initial channels
    db.prepare('INSERT INTO channels (id, youtube_channel_id, name, language) VALUES (?, ?, ?, ?)')
      .run(1, 'UC_CODE_ACADEMY', 'Code Academy', 'en');
    db.prepare('INSERT INTO channels (id, youtube_channel_id, name, language) VALUES (?, ?, ?, ?)')
      .run(2, 'UC_CODE_ACADEMY_ES', 'Code Academy Español', 'es');

    // 2. Seed initial suggestions
    db.prepare('INSERT INTO suggestions (id, channel_id, content, is_read) VALUES (?, ?, ?, ?)')
      .run(1, 1, 'Vite 6 is trending. Create a video today!', 0);

    // Mock API requests for the daily production workflow
    await page.route('**/api/youtube/stats?channelId=UC_CODE_ACADEMY', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ subscribers: 50000, total_views: 1250000, video_count: 120 })
      });
    });

    await page.route('**/api/youtube/stats?channelId=UC_CODE_ACADEMY_ES', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ subscribers: 10000, total_views: 200000, video_count: 30 })
      });
    });

    await page.route('**/api/ai/niche-explorer?topic=Vite%206', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          topic: 'Vite 6',
          competition: 'Medium',
          monetizationTier: 'Tier 1',
          subNiches: ['Vite 6 Plugins', 'Migrating to Vite 6']
        })
      });
    });

    await page.route('**/api/niches', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, topic: 'Vite 6', channel_id: 1 })
      });
    });

    await page.route('**/api/ai/ideas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ideas: [
            { id: 1, title: 'Top 3 Vite 6 Breaking Changes', difficulty: 'Medium', viralScore: 85, status: 'idea' },
            { id: 2, title: 'Vite 6 vs Webpack', difficulty: 'Hard', viralScore: 70, status: 'idea' }
          ]
        })
      });
    });

    await page.route('**/api/ideas/1/favorite', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.route('**/api/ideas/1/status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    await page.route('**/api/scripts', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, idea_id: 1, title: 'Top 3 Vite 6 Breaking Changes', content: 'Mock script content of 300 words...' })
      });
    });

    await page.route('**/api/scripts/1/export', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/markdown',
        headers: {
          'Content-Disposition': 'attachment; filename="top-3-vite-6-breaking-changes.md"'
        },
        body: '# Top 3 Vite 6 Breaking Changes\nMock script content...'
      });
    });

    await page.route('**/api/ai/seo', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          titles: ['Top 3 Vite 6 Breaking Changes You Need To Know', 'Vite 6 is Here: 3 Major Changes'],
          tags: ['vite 6', 'vite', 'frontend', 'react', 'web development'],
          seoScore: 95
        })
      });
    });

    await page.route('**/api/calendar/events', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, idea_id: 1, scheduled_date: '2026-06-18', status: 'planned' })
      });
    });

    // 1. User loads the YTIq dashboard and views stats for their main channel "Code Academy"
    await page.goto('/');
    await page.getByTestId('channel-switcher-select').selectOption({ label: 'Code Academy' });
    await expect(page.getByTestId('stats-subscribers-card')).toContainText('50,000');

    // 2. Swaps the channel switcher to "Code Academy Español" to inspect Spanish audience views
    await page.getByTestId('channel-switcher-select').selectOption({ label: 'Code Academy Español' });
    await expect(page.getByTestId('stats-subscribers-card')).toContainText('10,000');

    // 3. Notices a Daily Suggestion warning: "Vite 6 is trending. Create a video today!"
    await expect(page.getByTestId('daily-suggestions-sidebar')).toContainText('Vite 6 is trending');

    // 4. Click the suggestion, redirecting to Niche Explorer analyzing "Vite 6"
    await page.getByTestId('suggestion-card').first().click();
    await expect(page.getByTestId('niche-topic-input')).toHaveValue('Vite 6');

    // 5. User reviews sub-niches, competition, and saves the niche topic
    await expect(page.getByTestId('niche-results-container')).toBeVisible();
    await page.getByTestId('save-niche-btn').click();

    // 6. User clicks "Generate Video Ideas" for this saved niche
    await page.getByTestId('idea-niche-select').selectOption({ label: 'Vite 6' });
    await page.getByTestId('generate-ideas-btn').click();

    // 7. Out of the 10 ideas, user favorites "Top 3 Vite 6 Breaking Changes" and sets status to "Planned"
    const ideaCard = page.getByTestId('idea-card').filter({ hasText: 'Top 3 Vite 6 Breaking Changes' });
    await ideaCard.getByTestId('idea-star-btn').click();
    await ideaCard.getByTestId('idea-status-select').selectOption('planned');

    // 8. User clicks "Write Script" on the idea, writes a 300-word script, and saves
    await ideaCard.getByTestId('create-script-btn').click();
    await page.getByTestId('script-cta-input').fill('This is my CTA section which makes the script about 300 words long.');
    await page.getByTestId('save-script-btn').click();

    // 9. Exports the script to Markdown file top-3-vite-6-breaking-changes.md
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-pdf-btn').click(); // Export trigger
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/top-3-vite-6-breaking-changes/);

    // 10. Opens SEO Optimizer, generates optimized titles and tags, and copies tags to clipboard
    await page.getByTestId('seo-title-input').fill('Top 3 Vite 6 Breaking Changes');
    await page.getByTestId('seo-description-input').fill('Learn the top 3 major breaking changes in Vite 6.');
    await page.getByTestId('seo-optimize-btn').click();
    await page.getByTestId('copy-all-tags-btn').click();

    // 11. Navigates to Content Calendar and drags "Top 3 Vite 6 Breaking Changes" to tomorrow's date
    const dragSource = page.getByTestId('calendar-sidebar-idea-item').first();
    const dropTarget = page.locator('[data-date="2026-06-18"]');
    await dragSource.dragTo(dropTarget);

    // DB Verification
    const dbChannel = db.prepare('SELECT * FROM channels WHERE name = ?').get('Code Academy');
    const dbNiche = db.prepare('SELECT * FROM niches WHERE topic = ?').get('Vite 6');
    const dbIdea = db.prepare('SELECT * FROM ideas WHERE title = ?').get('Top 3 Vite 6 Breaking Changes');
    const dbScript = db.prepare('SELECT * FROM scripts WHERE title = ?').get('Top 3 Vite 6 Breaking Changes');
    const dbSeo = db.prepare('SELECT * FROM seo_data WHERE idea_id = ?').get(dbIdea.id);
    const dbEvent = db.prepare('SELECT * FROM calendar_events WHERE idea_id = ?').get(dbIdea.id);

    expect(dbChannel).toBeDefined();
    expect(dbNiche).toBeDefined();
    expect(dbIdea).toBeDefined();
    expect(dbIdea.is_favorite).toBe(1);
    expect(dbScript).toBeDefined();
    expect(dbSeo).toBeDefined();
    expect(dbEvent).toBeDefined();
    expect(dbEvent.scheduled_date).toBe('2026-06-18');
  });

  // =========================================================================
  // T4.2: Competitor-Inspired Content Creation Workflow
  // =========================================================================
  test('T4.2: Competitor-Inspired Content Creation Workflow', async ({ page }) => {
    const db = getDb();

    // 1. Seed initial channel and tracked competitor
    db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)')
      .run(1, 'UC_MY_CHANNEL', 'My Channel');
    db.prepare('INSERT INTO competitors (id, channel_id, competitor_channel_id, competitor_name) VALUES (?, ?, ?, ?)')
      .run(1, 1, 'UC_DESIGN_GUY', 'DesignGuy');

    // Mock recent uploads for competitor DesignGuy
    await page.route('**/api/competitors/1/uploads', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'v_tw4', title: 'Tailwind CSS v4 is awesome!', views: 35000, multiplier: '3.5x' }
        ])
      });
    });

    // Mock AI angle analysis suggesting an alternative
    await page.route('**/api/ai/analyze-angle', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          suggestion: 'Why Tailwind CSS v4 is bad for beginners'
        })
      });
    });

    // Mock saving a video idea
    await page.route('**/api/ideas', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 10,
          channel_id: 1,
          title: 'Why Tailwind CSS v4 is bad for beginners',
          status: 'idea'
        })
      });
    });

    // Mock saving a script
    await page.route('**/api/scripts', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 5,
          idea_id: 10,
          title: 'Why Tailwind CSS v4 is bad for beginners',
          content: 'Pre-populated script layout and outline notes.'
        })
      });
    });

    // Mock AI thumbnail concepts
    await page.route('**/api/ai/thumbnails', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          concepts: [
            { id: 1, composition: 'Simple logo layout' },
            { id: 2, composition: 'High contrast, bad-vs-good illustration description' }
          ]
        })
      });
    });

    // Mock linking thumbnail to idea
    await page.route('**/api/thumbnails/2/link', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });

    // Mock calendar events
    await page.route('**/api/calendar/events', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 2, idea_id: 10, scheduled_date: '2026-06-19', status: 'scripted' })
      });
    });

    // 1. User navigates to the Competitor Tracker page
    await page.goto('/');
    
    // 2. Checks recent uploads of competitor @DesignGuy
    await page.getByTestId('competitor-card').filter({ hasText: 'DesignGuy' }).click();

    // 3. Sees competitor uploaded a video Tailwind CSS v4 is awesome! with 3.5x view multiplier
    const timeline = page.getByTestId('competitor-timeline');
    await expect(timeline).toContainText('Tailwind CSS v4 is awesome!');
    await expect(timeline).toContainText('3.5x');

    // 4. Clicks "Analyze Angle" next to the upload
    await page.getByRole('button', { name: 'Analyze Angle' }).click();

    // 5. User saves this suggestion directly as a new Video Idea
    await page.getByRole('button', { name: 'Save as Idea' }).click();

    // 6. Clicks "Write Script" on the new idea, pre-populates script layout, and writes custom outline notes
    await page.getByTestId('create-script-btn').click();
    await page.getByTestId('generate-outline-btn').click();
    await page.getByTestId('script-section-editor').fill('My custom outline notes for Tailwind CSS v4.');
    await page.getByTestId('save-script-btn').click();

    // 7. Navigates to Thumbnail Generator, runs concept search, and links concept #2 to the idea
    await page.getByTestId('thumbnail-topic-input').fill('Why Tailwind CSS v4 is bad for beginners');
    await page.getByTestId('generate-thumbnails-btn').click();
    const conceptCard = page.getByTestId('thumbnail-concept-card').nth(1);
    await conceptCard.getByTestId('link-idea-select').selectOption('10');

    // 8. Opens Content Calendar, schedules the video for 2 days from now, setting status to "Scripted"
    const dragSource = page.getByTestId('calendar-sidebar-idea-item').first();
    const dropTarget = page.locator('[data-date="2026-06-19"]');
    await dragSource.dragTo(dropTarget);

    await page.getByTestId('calendar-event-card').dblclick();
    await page.getByTestId('event-status-select').selectOption('scripted');

    // DB and visual state validation
    await expect(page.getByTestId('calendar-event-card')).toContainText('Scripted');

    const dbIdea = db.prepare('SELECT * FROM ideas WHERE title = ?').get('Why Tailwind CSS v4 is bad for beginners');
    const dbScript = db.prepare('SELECT * FROM scripts WHERE idea_id = ?').get(dbIdea.id);
    const dbEvent = db.prepare('SELECT * FROM calendar_events WHERE idea_id = ?').get(dbIdea.id);

    expect(dbIdea).toBeDefined();
    expect(dbScript.content).toContain('Tailwind CSS v4');
    expect(dbEvent.status).toBe('scripted');
    expect(dbEvent.scheduled_date).toBe('2026-06-19');
  });

  // =========================================================================
  // T4.3: Multi-Channel Localization Expansion Journey
  // =========================================================================
  test('T4.3: Multi-Channel Localization Expansion Journey', async ({ page }) => {
    const db = getDb();

    // 1. Seed English and Spanish channels
    db.prepare('INSERT INTO channels (id, youtube_channel_id, name, language) VALUES (?, ?, ?, ?)')
      .run(1, 'UC_BOOTCAMP', 'Coding Bootcamp', 'en');
    db.prepare('INSERT INTO channels (id, youtube_channel_id, name, language) VALUES (?, ?, ?, ?)')
      .run(2, 'UC_CURSO', 'Curso de Coding', 'es');

    // Mock API responses for English search and generation
    await page.route('**/api/ai/niche-explorer?topic=TypeScript%20Decorators', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ topic: 'TypeScript Decorators', subNiches: [] })
      });
    });

    await page.route('**/api/ai/ideas?niche=TypeScript%20Decorators', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ideas: [{ id: 20, title: 'Advanced TS Decorators', status: 'idea' }]
        })
      });
    });

    // Mock API responses for Spanish search and generation
    await page.route('**/api/ai/niche-explorer?topic=Decoradores%20de%20TypeScript', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ topic: 'Decoradores de TypeScript', subNiches: [] })
      });
    });

    await page.route('**/api/ai/ideas?niche=Decoradores%20de%20TypeScript', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ideas: [{ id: 21, title: 'Decoradores Avanzados de TS', status: 'idea' }]
        })
      });
    });

    await page.route('**/api/ai/generate-script', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          title: 'Decoradores Avanzados de TS',
          content: 'Bienvenidos a este video sobre decoradores avanzados en TypeScript...'
        })
      });
    });

    // 1. User switches channel context to "Coding Bootcamp" (English)
    await page.goto('/');
    await page.getByTestId('channel-switcher-select').selectOption({ label: 'Coding Bootcamp' });

    // 2. Uses Niche Explorer to analyze "TypeScript Decorators", saving the niche
    await page.getByTestId('niche-topic-input').fill('TypeScript Decorators');
    await page.getByTestId('niche-analyze-btn').click();
    await page.getByTestId('save-niche-btn').click();

    // 3. Generates video ideas in English; favorites "Advanced TS Decorators"
    await page.getByTestId('idea-niche-select').selectOption({ label: 'TypeScript Decorators' });
    await page.getByTestId('generate-ideas-btn').click();
    const ideaCardEn = page.getByTestId('idea-card').filter({ hasText: 'Advanced TS Decorators' });
    await ideaCardEn.getByTestId('idea-star-btn').click();

    // 4. Switches channel context to "Curso de Coding" (Spanish)
    await page.getByTestId('channel-switcher-select').selectOption({ label: 'Curso de Coding' });

    // 5. Opens settings and verifies channel language is set to Spanish (es)
    await page.getByTestId('settings-panel').click();
    const langSelect = page.locator('select#channel-language-select');
    await expect(langSelect).toHaveValue('es');
    await page.getByRole('button', { name: 'Close' }).click();

    // 6. Uses Niche Explorer to analyze "Decoradores de TypeScript", saving it
    await page.getByTestId('niche-topic-input').fill('Decoradores de TypeScript');
    await page.getByTestId('niche-analyze-btn').click();
    await page.getByTestId('save-niche-btn').click();

    // 7. Generates video ideas in Spanish; favorites "Decoradores Avanzados de TS"
    await page.getByTestId('idea-niche-select').selectOption({ label: 'Decoradores de TypeScript' });
    await page.getByTestId('generate-ideas-btn').click();
    const ideaCardEs = page.getByTestId('idea-card').filter({ hasText: 'Decoradores Avanzados de TS' });
    await ideaCardEs.getByTestId('idea-star-btn').click();

    // 8. Opens Script Writer for "Decoradores Avanzados de TS"; clicks generate
    await ideaCardEs.getByTestId('create-script-btn').click();
    await page.getByTestId('generate-outline-btn').click();

    // DB Verification
    const dbScriptEs = db.prepare('SELECT * FROM scripts WHERE title = ?').get('Decoradores Avanzados de TS');
    expect(dbScriptEs).toBeDefined();
    expect(dbScriptEs.content).toContain('Bienvenidos a este video');
    expect(dbScriptEs.channel_id).toBe(2);

    // Save English counterpart manually (simulating its separate generation and completion)
    db.prepare('INSERT INTO scripts (idea_id, channel_id, title, content, language) VALUES (?, ?, ?, ?, ?)')
      .run(20, 1, 'Advanced TS Decorators', 'Welcome to this video on TypeScript decorators...', 'en');

    const dbScriptEn = db.prepare('SELECT * FROM scripts WHERE title = ?').get('Advanced TS Decorators');
    expect(dbScriptEn).toBeDefined();
    expect(dbScriptEn.content).toContain('Welcome to this video');
    expect(dbScriptEn.channel_id).toBe(1);
  });

  // =========================================================================
  // T4.4: First-Time User Settings Verification & Database Hydration
  // =========================================================================
  test('T4.4: First-Time User Settings Verification & Database Hydration', async ({ page }) => {
    const db = getDb();

    // Mock API validation
    await page.route('**/api/settings/validate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ youtube: 'valid', ai: 'valid' })
      });
    });

    // Mock channel creation
    await page.route('**/api/channels', async (route) => {
      const payload = JSON.parse(route.request().postData());
      const channelName = payload.youtube_channel_id === 'UC-123-Tech' ? 'Tech Zone' : 'Gaming Arena';
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: payload.youtube_channel_id === 'UC-123-Tech' ? 100 : 101, youtube_channel_id: payload.youtube_channel_id, name: channelName })
      });
    });

    // Mock stats sync API response
    await page.route('**/api/youtube/sync?channelId=UC-123-Tech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          subscribers: 25000,
          total_views: 750000,
          video_count: 85
        })
      });
    });

    // 1. User launches YTIq for the first time. The database is empty.
    await page.goto('/');

    // 2. App renders a Wizard page requesting API credentials
    await expect(page.getByTestId('wizard-container')).toBeVisible();

    // 3. User navigates to Settings and inserts mock API keys
    await page.getByTestId('youtube-api-key-input').fill('mock-yt-key');
    await page.getByTestId('ai-api-key-input').fill('mock-ai-key');

    // 4. Clicks "Validate Connections". App verifies endpoints and displays checks.
    await page.getByTestId('validate-connections-btn').click();
    await expect(page.getByTestId('validation-success-badge')).toBeVisible();

    // 5. User adds channel UC-123-Tech (Tech Zone) and UC-456-Games (Gaming Arena)
    await page.getByTestId('add-channel-input').fill('UC-123-Tech');
    await page.getByTestId('add-channel-btn').click();

    await page.getByTestId('add-channel-input').fill('UC-456-Games');
    await page.getByTestId('add-channel-btn').click();

    // 6. Swaps to "Tech Zone" via switcher; clicks "Sync Channel Stats"
    await page.getByTestId('channel-switcher-select').selectOption({ label: 'Tech Zone' });
    await page.getByTestId('manual-sync-btn').click();
    await expect(page.getByTestId('sync-loading-spinner')).toBeVisible();
    await expect(page.getByTestId('sync-loading-spinner')).not.toBeVisible();

    // Verification
    const dbChannel = db.prepare('SELECT * FROM channels WHERE youtube_channel_id = ?').get('UC-123-Tech');
    expect(dbChannel).toBeDefined();
    expect(dbChannel.name).toBe('Tech Zone');

    const dbStats = db.prepare('SELECT * FROM channel_stats WHERE channel_id = ?').get(dbChannel.id);
    expect(dbStats).toBeDefined();
    expect(dbStats.subscribers).toBe(25000);
    expect(dbStats.total_views).toBe(750000);
    expect(dbStats.video_count).toBe(85);
  });

  // =========================================================================
  // T4.5: Calendar Rescheduling and Production Staging Workflow
  // =========================================================================
  test('T4.5: Calendar Rescheduling and Production Staging Workflow', async ({ page }) => {
    const db = getDb();

    // 1. Seed channel and scheduled items
    db.prepare('INSERT INTO channels (id, youtube_channel_id, name) VALUES (?, ?, ?)')
      .run(1, 'UC_123', 'My Channel');
    db.prepare('INSERT INTO ideas (id, title, channel_id) VALUES (?, ?, ?)')
      .run(50, 'Build a React Portfolio', 1);

    // Initial event scheduled for "today" (Wednesday, 2026-06-17)
    db.prepare('INSERT INTO calendar_events (id, idea_id, channel_id, scheduled_date, notes, status) VALUES (?, ?, ?, ?, ?, ?)')
      .run(10, 50, 1, '2026-06-17', 'Initial scheduled notes', 'planned');

    db.prepare('INSERT INTO scripts (id, idea_id, channel_id, title, content) VALUES (?, ?, ?, ?, ?)')
      .run(15, 50, 1, 'Build a React Portfolio', 'Script intro content.');

    // Mock API requests for calendar event reschedule and script edit
    await page.route('**/api/calendar/events/10', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.route('**/api/scripts/15', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // 1. User navigates to Content Calendar and views scheduled items
    await page.goto('/');

    // 2. Drags "Build a React Portfolio" event card from today's date (2026-06-17) to Friday (2026-06-19)
    const dragSource = page.getByTestId('calendar-event-card').filter({ hasText: 'Build a React Portfolio' });
    const dropTarget = page.locator('[data-date="2026-06-19"]');
    await dragSource.dragTo(dropTarget);

    // 3. Double-clicks card to open the detail popup
    await dragSource.dblclick();
    await expect(page.getByTestId('event-detail-modal')).toBeVisible();

    // 4. Modifies scheduled notes: "Delaying filming until new camera arrives on Thursday"
    const notesInput = page.locator('textarea#event-notes-input');
    await notesInput.fill('Delaying filming until new camera arrives on Thursday');

    // 5. Updates the event status dropdown to "Filming" and saves
    await page.getByTestId('event-status-select').selectOption('filming');
    await page.getByRole('button', { name: 'Save Event' }).click();

    // 6. Opens the script editor linked to this calendar card; adds a new paragraph to the script
    await page.getByRole('button', { name: 'Edit Script' }).click();
    await expect(page.getByTestId('script-editor-container')).toBeVisible();
    await page.getByTestId('script-section-editor').fill('Script intro content. This is the new appended paragraph.');
    await page.getByTestId('save-script-btn').click();

    // 7. Closes editor, returns to Calendar, and verifies status and date are correct
    await page.getByRole('button', { name: 'Back to Calendar' }).click();
    await expect(page.getByTestId('calendar-event-card')).toHaveClass(/filming/);

    // DB Verification
    const dbEvent = db.prepare('SELECT * FROM calendar_events WHERE id = 10').get();
    expect(dbEvent.scheduled_date).toBe('2026-06-19');
    expect(dbEvent.notes).toBe('Delaying filming until new camera arrives on Thursday');
    expect(dbEvent.status).toBe('filming');

    const dbScript = db.prepare('SELECT * FROM scripts WHERE id = 15').get();
    expect(dbScript.content).toContain('new appended paragraph');
  });

});
