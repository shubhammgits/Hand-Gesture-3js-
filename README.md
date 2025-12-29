# Hand Gesture Three.js (Planetary Particles)

Live demo: https://shubhammgits.github.io/Hand-Gesture-3js-/

A browser-based interactive Three.js particle “planet” experience controlled with real-time hand gestures using MediaPipe Hands. Pinch to zoom, rotate your hand to rotate the planet, switch between planetary presets, and play background audio.

## Features

- Real-time hand tracking (MediaPipe Hands)
- Pinch gesture → zoom (scale)
- Hand rotation → rotate the particle planet
- Multiple presets: Sun, Earth, Jupiter, Saturn, Explosion
- Webcam preview and status indicator
- Background audio with play/pause control
- Mobile-friendly UI (hamburger menu + responsive overlays)

## Tech Stack

- HTML, CSS, JavaScript
- Three.js (WebGL rendering)
- MediaPipe Hands + Camera Utils (hand landmark detection)
- GitHub Pages (hosting)

## How to Use

1. Open the live demo link.
2. Allow **camera access** when the browser asks.
3. Show **one hand** in front of the camera with decent lighting.
4. Controls:
   - **Pinch** (thumb + index finger) to zoom in/out
   - **Rotate** your hand to rotate the planet
   - Use the Planet selector to change presets
   - Use **PLAY AUDIO / PAUSE AUDIO** to control music

Notes:
- Camera access requires **HTTPS** (or `http://localhost`). Opening the file directly (`file://`) may break webcam access.
- Some browsers block **audio autoplay**. If sound doesn’t start, tap once on the page or press **PLAY AUDIO**.

## Run Locally

Because webcam access is restricted on `file://`, run a local web server:

### Option A: Python

```bash
cd "Particle gesture three.js"
python -m http.server 5173
```

Then open:

- http://localhost:5173/

### Option B: VS Code Live Server

- Install the “Live Server” extension
- Right-click `index.html` → “Open with Live Server”

## Project Structure

- `index.html` — main page
- `style.css` — UI styling
- `script.js` — Three.js scene + MediaPipe Hands logic
- `music.mp3` — background audio

## Contact

- Email: shubhamm18.work@gmail.com
- GitHub: https://github.com/shubhammgits
- LinkedIn: https://www.linkedin.com/in/shhshubham/
