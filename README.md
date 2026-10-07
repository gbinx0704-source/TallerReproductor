# Sonora

Sonora is a browser-based personal audio player for music files stored on your computer or phone. It does not stream from a catalog or upload your audio to a server.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. For a production build, run `npm run build`; run the unit tests with `npx vitest run` and lint with `npm run lint`.

## Use

- Select **Add music** or drop audio files onto the page to import them.
- Imported audio and track details are stored in the browser's IndexedDB and remain available in that browser profile.
- Play complete local tracks, seek through them, adjust volume, and move through the doubly linked library in either direction.
- Search by title, artist, or filename. Press `/` to focus search and `Escape` to clear it.
- Save favorites, shuffle playback, and choose repeat off, repeat all, or repeat one.
- Remove tracks from the local library with the delete control.

The browser must support the selected audio format and have enough local storage available. Clearing site data removes the saved library. Files are read locally and are not sent to a remote service.