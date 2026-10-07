# Sonora

Sonora is a browser-based personal audio player for music files stored on your computer or phone. It does not stream from a catalog or upload your audio to a server.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. For a production build, run `npm run build`; run the unit tests with `npx vitest run` and lint with `npm run lint`.

## Deploy

The `Deploy to GitHub Pages` workflow publishes the `main` branch to `https://gbinx0704-source.github.io/TallerReproductor/`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. The workflow runs on every push to `main`.

### YouTube search setup

Enable **YouTube Data API v3** in a Google Cloud project and create a browser API key. For local development, copy `.env.example` to `.env.local` and set `VITE_YOUTUBE_API_KEY`. For GitHub Pages, add a repository Actions secret named `YOUTUBE_API_KEY`. Restrict the key to the YouTube Data API and the site's HTTP referrer (`https://gbinx0704-source.github.io/*`); add localhost referrers for development. Browser API keys are visible in a client-side app, so referrer and API restrictions are essential. Without the key, local playback still works but online search is unavailable.

Online results play inside YouTube's embedded player and remain subject to YouTube availability, region, age, and embedding restrictions. Local files are not uploaded or synchronized between devices.

## Use

- Select **Add music** or drop audio files onto the page to import them.
- Imported audio and track details are stored in the browser's IndexedDB and remain available in that browser profile.
- Play complete local tracks, seek through them, adjust volume, and move through the doubly linked library in either direction.
- Search by title, artist, or filename. Press `/` to focus search and `Escape` to clear it.
- Save favorites, shuffle playback, and choose repeat off, repeat all, or repeat one.
- Remove tracks from the local library with the delete control.

The browser must support the selected audio format and have enough local storage available. Clearing site data removes the saved library. Files are read locally and are not sent to a remote service.