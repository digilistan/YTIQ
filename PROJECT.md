# Project: YTIq YouTube Analytics & Content Creator Dashboard

## Architecture
YTIq is structured as a full-stack Node.js monorepo:
- **Client (Frontend)**: React 18 with Vite, Tailwind CSS v3, GSAP, and Framer Motion. Uses Recharts for data visualizations.
- **Server (Backend)**: Express.js REST API using SQLite (`better-sqlite3`) as the storage engine.
- **Data Flow**: React Client ↔ Express API ↔ SQLite DB / External APIs (YouTube Data API v3 & configurable OpenAI-compatible AI API at longcat.chat).

## Code Layout
```
YTIq/
├── client/                    # React + Vite frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── Layout/        # Sidebar, Header, ThemeToggle
│   │   │   ├── Dashboard/     # Stats cards, charts, top videos
│   │   │   ├── NicheExplorer/ # Niche analysis UI
│   │   │   ├── IdeaGenerator/ # Video idea generation
│   │   │   ├── ScriptWriter/  # Script creation & editing
│   │   │   ├── SEOOptimizer/  # Title, desc, tag optimizer
│   │   │   ├── ThumbnailIdeas/# Thumbnail concept generator
│   │   │   ├── Calendar/      # Content calendar
│   │   │   ├── Competitors/   # Competitor tracking
│   │   │   ├── Suggestions/   # Daily suggestions panel
│   │   │   └── Settings/      # API keys, channel config
│   │   ├── hooks/             # Custom React hooks
│   │   ├── context/           # Theme, Auth, Channel context
│   │   ├── services/          # API client functions
│   │   ├── utils/             # Helpers, formatters
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── server/                    # Express.js backend
│   ├── routes/                # Route definitions
│   │   ├── youtube.js
│   │   ├── ai.js
│   │   ├── channels.js
│   │   ├── scripts.js
│   │   ├── ideas.js
│   │   ├── calendar.js
│   │   ├── competitors.js
│   │   ├── suggestions.js
│   │   ├── settings.js
│   │   └── export.js
│   ├── services/              # Business logic
│   │   ├── youtubeService.js
│   │   ├── aiService.js
│   │   ├── statsService.js
│   │   └── schedulerService.js
│   ├── db/                    # DB connections & schemas
│   │   ├── database.js
│   │   ├── migrations.js
│   │   └── ytiq.db
│   ├── middleware/            # Custom middleware
│   │   └── errorHandler.js
│   ├── server.js              # Server entry
│   └── package.json
│
├── package.json               # Root monorepo configuration
├── .env.example               # Environment template
└── README.md
```

## Milestones
| # | Name | Scope | Dependencies | Status | Conversation ID |
|---|------|-------|--------------|--------|-----------------|
| 1 | Milestone 1: Project Setup & DB Schema | Root configuration, client/server scaffolding, SQLite integration | None | DONE | d22f7dde-451a-4726-887e-de2e4ec83f24 |
| 2 | Milestone 2: App Settings & Configuration | API settings logic, settings panel UI, validation | M1 | IN_PROGRESS | c8b76312-1e98-4de8-a31f-71caf95ca281 |
| 3 | Milestone 3: Core Channel Dashboard | Stats caching, switcher, Recharts, GSAP counters, YouTube API / Mock | M2 | PLANNED | - |
| 4 | Milestone 4: AI-Powered Research & Creation | Niche Explorer, Idea Gen, Script Writer (PDF/MD export), SEO / Thumbnail gen | M3 | PLANNED | - |
| 5 | Milestone 5: Calendar, Competitors & Suggestions | Calendar drag & drop, competitor tracking, daily suggestions, browser alerts | M4 | PLANNED | - |
| 6 | Milestone 6: Final Integration & E2E Verification | Final QA, pass E2E tests, Adversarial Hardening (Tier 5) | M5 & E2E Track | PLANNED | - |
| E2E | E2E Testing Track | Requirement-driven test suite (Tiers 1-4) & opaque-box runner | None | IN_PROGRESS | b2d94d10-7816-4f0d-8218-ddfb07fc9c86 |

## Interface Contracts
### Client ↔ Server API
All Express endpoints respond with JSON. Main API models:
- **Settings API**: GET/POST `/api/settings` -> Key-value configuration mapping.
- **Channels API**: GET/POST/DELETE `/api/channels` -> Channel records.
- **YouTube Stats API**: GET `/api/youtube/stats?channelId=xyz` -> Subscribers, views, watch time, top videos.
- **AI API**: POST `/api/ai/generate` -> Generates niches, ideas, scripts, SEO details, or thumbnails based on a prompt.
- **Ideas API**: CRUD `/api/ideas` -> Saved video ideas.
- **Scripts API**: CRUD `/api/scripts` -> Saved video script content (Markdown).
- **Calendar API**: CRUD `/api/calendar` -> Content scheduling events.
- **Competitors API**: CRUD `/api/competitors` -> Tracked competitor channels.
- **Suggestions API**: GET `/api/suggestions` -> Daily suggestions feed.
- **Export API**: POST `/api/export/pdf` or `/api/export/markdown` -> Trigger file exports.
