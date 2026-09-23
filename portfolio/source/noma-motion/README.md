# NOMA 15-second motion film

Original procedural 3D concept for a fictional room fragrance. Warm amber glass, cream paper label, stone plinth, olive leaves and animated camera/light. No external footage, music or image assets.

## Rebuild

Requires Node.js, Python 3, FFmpeg and a Chromium-capable environment.

1. In this directory run `npm install` and `npx playwright install chromium --only-shell`.
2. Run `npm run render` (starts a temporary local server on port 8765).
3. Convert poster: `ffmpeg -y -i poster.png ../../assets/noma-motion-poster.webp`.

Output: 720 × 960 (3D layer rendered at 540 × 720, text composited at output resolution), 30 fps, 15 seconds, H.264/yuv420p with fast-start metadata, silent. Opening scene.html on the local server shows the hero frame; `window.renderFrame(seconds)` deterministically renders any moment. Render dependencies are development-only. The live website only loads the exported MP4/WebP.

For browser compatibility, also export VP9: `ffmpeg -y -i ../../assets/noma-motion-15s.mp4 -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -cpu-used 4 ../../assets/noma-motion-15s.webm`. The website prefers WebM with MP4 fallback. 3D frames are rendered at 15 fps and motion-interpolated to 30 fps for delivery.
