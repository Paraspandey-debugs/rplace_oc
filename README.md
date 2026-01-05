# OpenCode IIITA - Pixel Canvas

A collaborative, real-time pixel art canvas inspired by Reddit's r/place experiment. Built for OpenCode IIITA with a cyberpunk synthwave theme.

## Features

- **Collaborative Painting**: Users place pixels on a shared 1600x1000 canvas
- **Real-time Updates**: Polling-based updates every second for live collaboration
- **Authentication**: GitHub OAuth via NextAuth.js
- **Tools**: Pencil, eraser, line tool with color palettes
- **Cooldown System**: 5-minute cooldown per user to prevent spam
- **Bot Support**: Admin API key for automated image placement
- **Responsive Design**: Pixelated retro UI with video background
- **Data Persistence**: MongoDB for placements, Redis for caching/cooldowns

## Architecture

### Frontend
- **Next.js 14** with React 18 and TypeScript
- **Canvas Component**: HTML5 Canvas for pixel painting with grid overlay
- **Real-time Polling**: Fetches canvas diffs every second
- **UI Theme**: Cyberpunk synthwave with pixel fonts and neon colors

### Backend
- **API Routes**:
  - `/api/place`: Place pixels (POST)
  - `/api/canvas/snapshot`: Get canvas data (GET, supports diff via ?since)
  - `/api/me`: User stats (GET)
  - `/api/leaderboard`: Top users (GET)
- **Authentication**: NextAuth.js with GitHub provider
- **Rate Limiting**: Express rate limiter for API protection
- **Logging**: Winston for error and performance logging

### Data Storage
- **MongoDB**: User data, placements, daily snapshots
- **Redis**: Cooldown tracking, snapshot caching (10s TTL), pub/sub (future)

### Infrastructure
- **Deployment**: Next.js production build
- **Environment**: Configurable via env vars (canvas size, colors, etc.)
- **Security**: Input validation, CORS, bot key authentication

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- MongoDB instance
- Redis instance
- GitHub OAuth app

### Setup

1. **Clone and install**:
   ```bash
   git clone <repo>
   cd rplace_oc
   npm install
   ```

2. **Environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with:
   # - GITHUB_ID, GITHUB_SECRET (from GitHub OAuth app)
   # - NEXTAUTH_SECRET, NEXTAUTH_URL
   # - REDIS_URL
   # - BOT_API_KEY (optional, for admin bot access)
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

### Configuration
Override defaults with environment variables:
- `NEXT_PUBLIC_CANVAS_WIDTH/HEIGHT`: Canvas dimensions (default 1600x1000)
- `NEXT_PUBLIC_CANVAS_GRID`: Grid size in pixels (default 20)
- `CANVAS_COOLDOWN_SECONDS`: Placement cooldown (default 300)

## Usage

### For Users
1. Sign in with GitHub
2. Select a tool (pencil/eraser/line)
3. Choose a color from the palette
4. Click on the canvas to place pixels
5. Wait 5 minutes between placements

### For Admins/Bots
Use the bot script to place images automatically:

```bash
node scripts/run_bot.js \
  --image ./art.png \
  --api http://localhost:3000/api/place \
  --botKey "your_bot_key" \
  --delay 300
```

Bot options:
- `--image`: Image file path (required)
- `--api`: API endpoint URL
- `--botKey`: Admin bot API key
- `--delay`: Milliseconds between placements (default 200)
- `--grid`: Grid size (default 20)
- `--canvasWidth/Height`: Canvas dimensions
- `--random`: Randomize placement order

## API Reference

### POST /api/place
Place pixels on the canvas.

**Request Body**:
```json
{
  "x": 10,
  "y": 20,
  "color": "#ff0000"
}
```
Or for multiple (line tool):
```json
[
  {"x": 10, "y": 20, "color": "#ff0000"},
  {"x": 11, "y": 20, "color": "#ff0000"}
]
```

**Headers**:
- `Authorization: Bearer <bot_key>` (for admin bypass)
- `X-Bot-Key: <bot_key>`

**Response**:
```json
{"ok": true}
```

### GET /api/canvas/snapshot
Get canvas data.

**Query Params**:
- `since`: Timestamp for diff (optional)

**Response**:
```json
{
  "placements": [
    {"x": 10, "y": 20, "color": "#ff0000", "createdAt": "2023-..."}
  ]
}
```

### GET /api/me
Get current user stats.

**Response**:
```json
{
  "pixels": 42,
  "cooldownSeconds": 120
}
```

### GET /api/leaderboard
Get top users by pixel count.

**Response**:
```json
{
  "leaderboard": [
    {"userId": "user123", "pixels": 1000}
  ]
}
```

## Development

### Project Structure
```
├── components/
│   └── Canvas.tsx          # Main painting component
├── pages/
│   ├── _app.tsx            # App wrapper with providers
│   ├── index.tsx           # Home page
│   └── api/                # API routes
│       ├── place.ts        # Pixel placement
│       ├── canvas/
│       │   └── snapshot.ts # Canvas data
│       ├── me.ts           # User stats
│       └── auth/[...nextauth].ts
├── scripts/
│   └── run_bot.js          # Image placement bot
├── styles/
│   └── globals.css         # Global styles
└── utils/
    ├── logger.ts           # Logging utility
    └── rateLimit.ts        # Rate limiting
```

### Key Technologies
- **Frontend**: Next.js, React, TypeScript, HTML5 Canvas
- **Backend**: Next.js API routes, NextAuth.js
- **Database**: MongoDB with Mongoose
- **Cache**: Redis
- **Styling**: CSS with pixelated rendering
- **Deployment**: Vercel/Netlify compatible

### Contributing
1. Fork the repo
2. Create a feature branch
3. Make changes with proper TypeScript types
4. Add tests if applicable
5. Submit a PR

## Deployment

1. **Build**:
   ```bash
   npm run build
   ```

2. **Environment**: Set production env vars

3. **Run**:
   ```bash
   npm start
   ```

For Docker deployment, see `docker-compose.yml`.

## License

MIT License - see LICENSE file for details.

## Credits

Inspired by Reddit's r/place experiment. Built for OpenCode IIITA.

