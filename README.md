# Sonora

Sonora is a browser-based player for local audio files and YouTube music videos. Local files are read in the browser and are never uploaded to the app's server.

## Run locally

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add your `YOUTUBE_API_KEY` to enable online search locally. Open the URL printed by Vite. For a production build, run `npm run build`; run the unit tests with `npx vitest run` and lint with `npm run lint`.

## Deploy with Netlify

In Netlify, select **Add new site → Import an existing project**, authorize GitHub, and choose `gbinx0704-source/TallerReproductor`. Netlify reads `netlify.toml`: build command `npm run build`, publish directory `dist`, and functions directory `netlify/functions`. Set `YOUTUBE_API_KEY` in the site's environment variables with the **Functions** scope, then deploy. Connected Git deployments update automatically on pushes to `main`.

### YouTube search setup

Enable **YouTube Data API v3** in a Google Cloud project and create an API key. Add it locally to `.env.local` or in Netlify's site environment variables as `YOUTUBE_API_KEY`; the Function reads it server-side, so it is not embedded in the browser bundle. Restrict the key to YouTube Data API v3 and monitor its quota. Without the key, local playback still works but online search is unavailable.

Online search uses a Netlify Function and results play inside YouTube's embedded player. Playback remains subject to YouTube availability, region, age, and embedding restrictions. Local files and favorites are not uploaded or synchronized between devices.

## Use

- Select **Add music** or drop audio files onto the page to import them.
- Imported audio and track details are stored in the browser's IndexedDB and remain available in that browser profile.
- Play complete local tracks, seek through them, adjust volume, and move through the doubly linked library in either direction.
- Search by title, artist, or filename. Press `/` to focus search and `Escape` to clear it.
- Save favorites, shuffle playback, and choose repeat off, repeat all, or repeat one.
- Remove tracks from the local library with the delete control.

The browser must support the selected audio format and have enough local storage available. Clearing site data removes the saved library. Files are read locally and are not sent to a remote service.