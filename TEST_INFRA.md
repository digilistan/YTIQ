# YTIq Test Infrastructure Specification

This document outlines the testing infrastructure, framework configurations, external API mocking strategy, and `data-testid` selectors defined for E2E testing of the YTIq platform.

---

## 1. Opaque-Box Test Runner (Playwright)

For driving end-to-end testing from an out-of-process, user-centric perspective, the project utilizes **Playwright**.

### Execution Rules
1. **Single-worker Execution (`workers: 1`)**: Set to run sequentially to avoid SQLite transaction locks and race conditions.
2. **Auto-waiting**: Utilizes Playwright's built-in wait mechanics to handle frontend rendering updates and GSAP transitions.
3. **Integrated Web Server Orchestration**: The `playwright.config.js` controls three services:
   - **Mock API Server** on Port `5050`
   - **Express Backend** on Port `5000` (driven by `NODE_ENV=test`, pointing to SQLite database `ytiq_test.db`)
   - **Vite React Client** on Port `5173`

---

## 2. API Mocking Setup

To support network isolation (CODE_ONLY mode) and deterministic testing, we redirect all external API requests to a local Express mock server.

### Configuration (`.env.test`)
During E2E runs, the backend loads the following mock values:
```env
PORT=5000
NODE_ENV=test
YOUTUBE_API_KEY=mock-yt-key
YOUTUBE_API_BASE_URL=http://localhost:5050/youtube
AI_API_KEY=mock-ai-key
AI_API_BASE_URL=http://localhost:5050/ai/v1
```

### Mock API Server (`tests/mocks/mockApiServer.js`)
Runs on port `5050` and provides:
- **YouTube Data API Stubs**: `/youtube/v3/channels`, `/youtube/v3/videos`, `/youtube/v3/search`
- **longcat.chat AI Stubs**: `/ai/v1/chat/completions`

---

## 3. Selector Specifications (`data-testid`)

The following tables define the selectors utilized by E2E test suites for each of the 10 features.

### F1: Channel Switcher & Channel Management
* **`channel-switcher-select`**: Select dropdown for switching between channels.
* **`settings-panel`**: Settings modal/container.
* **`add-channel-input`**: Text input field for YouTube Channel ID.
* **`add-channel-btn`**: Button to submit a new Channel ID.
* **`delete-channel-btn`**: Button to delete a channel from the settings list.
* **`api-mock-toggle`**: Toggle switch for using mock data vs. real API.
* **`user-profile-card`**: Profile container at the bottom of sidebar.
* **`user-pro-badge`**: Premium user status tag ("Pro" badge).

### F2: Dashboard - Key Stats Cards
* **`stats-subscribers-card`**: Metric card displaying total subscribers.
* **`stats-views-card`**: Metric card displaying total video views.
* **`stats-videos-card`**: Metric card displaying total video counts.
* **`stats-watch-time-card`**: Metric card displaying total watch hours.
* **`manual-sync-btn`**: Sync button to manually trigger statistics fetch.
* **`sync-loading-spinner`**: Loading indicator showing while sync is active.

### F3: Dashboard - Growth Charts & Top Videos
* **`growth-chart-container`**: Container/wrapper for Recharts AreaChart component.
* **`chart-monthly-toggle`**: Button/toggle to aggregate chart by months.
* **`top-videos-table`**: Table/list wrapper displaying highest performing videos.
* **`top-videos-row`**: Individual row containing performance stats of a video.
* **`top-video-title`**: Title element of a video in the performance list.
* **`top-video-overlay`**: Hover card or badge showing performance multiplier details.

### F4: Niche Explorer
* **`niche-topic-input`**: Text input for the main explorer search.
* **`niche-analyze-btn`**: Button to execute the AI analysis.
* **`niche-loading-spinner`**: Spinner shown during AI generation.
* **`niche-results-container`**: Main wrapper for search results.
* **`niche-competition-gauge`**: Graphical/numerical element indicating competition.
* **`niche-monetization-badge`**: Display representing estimated monetization tier.
* **`niche-competitor-link`**: Clickable competitor channel links inside explorer results.
* **`save-niche-btn`**: Button to persist a niche to SQLite.
* **`niche-library-list`**: List containing saved niche topics.
* **`delete-niche-btn`**: Trash/delete icon for a saved niche.

### F5: Video Idea Generator
* **`idea-niche-select`**: Dropdown to choose a saved niche topic.
* **`generate-ideas-btn`**: Button triggering generation.
* **`idea-card`**: Individual card showing generated video idea.
* **`idea-title`**: Title text of the generated idea.
* **`idea-star-btn`**: Favorite toggle button (star icon).
* **`idea-status-select`**: Dropdown selection to update idea status (Planned, Doing, etc).
* **`delete-idea-btn`**: Button to remove the video idea.

### F6: Script Writer
* **`create-script-btn`**: Button on idea card to create a new script.
* **`script-editor-container`**: Main text editor wrapper.
* **`generate-outline-btn`**: Button to pre-populate sections using AI.
* **`script-section-editor`**: Markdown editor section text area.
* **`script-cta-input`**: Specific textarea or input for the CTA section.
* **`save-script-btn`**: Button to save script content to SQLite.
* **`regenerate-section-btn`**: Action to regenerate a specific script component.
* **`tone-select`**: Selector for generating text with specific styles/tones.
* **`export-pdf-btn`**: Button triggering export to PDF format.

### F7: SEO Optimizer
* **`seo-title-input`**: Text input for draft video title.
* **`seo-description-input`**: Textarea for draft video description.
* **`seo-optimize-btn`**: Submit button for SEO optimization.
* **`seo-titles-list`**: Container listing AI title variations.
* **`copy-title-btn`**: Action to copy a title variant to the clipboard.
* **`seo-tags-container`**: Area containing generated keyword pills.
* **`seo-tag-pill`**: Individual keyword/tag badge.
* **`copy-all-tags-btn`**: Button to copy all generated tags at once.
* **`seo-score-meter`**: Visual indicator representing the SEO score (0-100).
* **`seo-checklist`**: Bulleted listing of improvement items.

### F8: Thumbnail Concept Generator
* **`thumbnail-topic-input`**: Text input for thumbnail concepts.
* **`generate-thumbnails-btn`**: Button to submit and run AI generation.
* **`thumbnail-concept-card`**: Individual concept result block.
* **`link-idea-select`**: Select dropdown to map thumbnail concept to a video idea.
* **`copy-overlay-btn`**: Button to copy text overlay suggestions.
* **`delete-concept-btn`**: Action button to delete a thumbnail suggestion.

### F9: Content Calendar
* **`calendar-month-grid`**: Grid panel representing the monthly schedule layout.
* **`calendar-event-card`**: Scheduled video idea calendar card.
* **`calendar-view-toggle`**: Toggle switch between month and week views.
* **`event-detail-modal`**: Popup details panel for a calendar event.
* **`event-status-select`**: Dropdown inside modal to update scheduled status.
* **`calendar-sidebar-ideas`**: Draggable sidebar containing unscheduled video ideas.
* **`calendar-sidebar-idea-item`**: Individual draggable item card.

### F10: Competitor Tracker & Daily Suggestions
* **`competitor-handle-input`**: Text input for competitor channel handle/username.
* **`add-competitor-btn`**: Submit button to add competitor.
* **`competitor-card`**: Card representing tracked channel.
* **`competitor-timeline`**: List/timeline displaying recent uploads.
* **`daily-suggestions-sidebar`**: Dashboard container for system recommendations.
* **`suggestion-card`**: Individual suggestion container.
* **`dismiss-suggestion-btn`**: Button to remove suggestions from display.
