# 🐢 Turtle Fighter — Web Demo

A browser-based 2D fighting game character showcase, deployable on GitHub Pages.

## 🎮 Controls

| Key | Action |
|-----|--------|
| `J` | Punch |
| `K` | Kick |
| `L` | Block (hold) |
| `SPACE` | Jump |
| `← / A` | Move Left |
| `→ / D` | Move Right |
| `S` + `D` + `J` | **Special Move** |

## 🏗️ Project Structure

```
turtle-fighter/
├── index.html          # Entry point
├── style.css           # HUD, overlays, scanlines, arcade aesthetic
├── game.js             # Main loop, stage rendering, CPU AI, timer
├── player.js           # Character state machine, physics, drawing
├── input.js            # Keyboard input system
├── sprites/            # PNG sprite images (one per state)
│   ├── idle.png
│   ├── stance.png
│   ├── punch.png
│   ├── kick.png
│   ├── jump.png
│   ├── block.png
│   └── special.png
└── background/
    └── stage.png       # Stage background (optional)
```

## 🎨 Adding Real Sprites

Replace the placeholder PNGs in `sprites/` with your actual art:
- Recommended size: **96×112 px** per frame
- Format: **PNG with transparency**
- The game draws the sprite centered on the character's position

For animated sprites, you can expand `player.js` to support sprite sheets with frame offsets.

## 🚀 Deploy to GitHub Pages

1. Push this folder to a GitHub repository
2. Go to **Settings → Pages**
3. Set source to `main` branch, root `/`
4. Your game will be live at `https://yourusername.github.io/turtle-fighter/`

## 🔮 Future Expansion Ideas

- [ ] Sprite sheet animations (frame strips)
- [ ] Hitboxes & hurtboxes
- [ ] Health regen / super meter
- [ ] Combo system with detection window
- [ ] Multiple special moves (quarter-circle inputs)
- [ ] Two-player local mode
- [ ] Sound effects & music via Web Audio API
- [ ] More characters / character select screen

## ⚙️ Tech Stack

- Vanilla HTML/CSS/JavaScript
- HTML5 Canvas API
- `requestAnimationFrame` game loop
- Zero dependencies — no build step needed
