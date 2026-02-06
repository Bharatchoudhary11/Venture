# Mobile Video Player Experience

A React + Vite application that recreates a YouTube-style mobile experience with gesture-driven playback, an in-player related list, and an in-app picture-in-picture dock. The bundled dataset (AI-focused video catalog) lets you demo all interactions out of the box.

## Features

### Home Feed
- Scrollable, mobile-first grid grouped by category (All, Social Media AI, AI Income, AI Essentials)
- Video cards with thumbnail, title, duration badge, and category chip
- Accent-themed sections with hover/touch feedback

### Full Player
- Autoplay when opened, with custom controls (play/pause, ±10s skip, seek bar, current/total time)
- Supports YouTube embeds, plain MP4 URLs, and HLS `.m3u8` streams (via `hls.js`)
- Animated transition from feed to player + keyboard shortcuts (space, arrows, M, F)
- Responsive fullscreen flow: phones auto-rotate to landscape on fullscreen, tablets/desktops respect native APIs, and the player resumes exactly where it left off when collapsing/expanding.

### In-Player Related List
- Swipe/scroll overlay listing only videos from the active category
- Selecting a video switches playback instantly, updates the list, and maintains scroll position
- Auto-opens on phones for quick context, stays collapsed by default on tablets/desktops until “Up next” is tapped
- Virtualization scaffold to handle large datasets smoothly

### Drag-to-Minimize (In-App PiP)
- Drag downward or tap the minimize button to dock the player above the feed
- Mini-player keeps playing with preview, title, play/pause, expand, and close actions
- State persists while browsing; tapping expand or full-screen restores playback without restarting

### Bonus Goodies
- Auto-next with 2-second countdown (cancelable by play/pause)
- Animated skip buttons and progress accents
- Playback snapshotting to resume video position when toggling PiP/fullscreen

## Setup

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173 by default)
npm run dev

# Build for production
npm run build

# Optional: preview the production bundle
npm run preview
```

### HTTPS tip
YouTube embeds require matching origins for some commands. For the smoothest PiP/minimize experience in Safari/Brave, run the dev server over HTTPS, e.g. `npm run dev -- --https` (or proxy via a local SSL tool) so `postMessage` isn’t blocked.

### Dataset
All sample content lives in `src/data/videos.js`. Each entry must provide `title`, `mediaUrl`, `thumbnailUrl`, `duration`, `slug`, and category metadata. Replace this file with your own catalog to retheme the experience—no other code changes are required unless you introduce new media providers.

## Folder Structure

```
src/
  components/
    VideoCard.jsx          # Reusable video card for the feed
    VideoPlayerOverlay.jsx # Full player, gestures, PiP logic
  data/videos.js          # Curated dataset grouped by category
  App.jsx / App.css       # Home feed + styling
```

## Future Enhancements
- TypeScript typing + state manager (Zustand, Redux Toolkit) for larger datasets
- Browser Picture-in-Picture API integration alongside the in-app dock
- HLS playback / quality selector
- Server-provided catalogs with caching + pagination

Feel free to fork and extend the UX—most interactions live in `VideoPlayerOverlay.jsx`, making it easy to plug in new gestures or data sources.
