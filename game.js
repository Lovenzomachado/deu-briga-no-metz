// ─── Game Loop & Stage ────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

// ── Resize ──────────────────────────────────────────────────────
const GAME_W = 900;
const GAME_H = 560;

function resize() {
  const scale = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
  canvas.width  = GAME_W;
  canvas.height = GAME_H;
  canvas.style.width  = GAME_W * scale + 'px';
  canvas.style.height = GAME_H * scale + 'px';
  canvas.style.left   = (window.innerWidth  - GAME_W * scale) / 2 + 'px';
  canvas.style.top    = (window.innerHeight - GAME_H * scale) / 2 + 'px';
}
resize();
window.addEventListener('resize', resize);

// ── Constants ───────────────────────────────────────────────────
const GROUND_Y  = 430;
const TIMER_SEC = 99;

// ── Background ──────────────────────────────────────────────────
const bgImg = new Image();
bgImg.src = 'background/stage.png';

// Procedural fallback stage
function drawStageFallback() {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, GAME_H);
  sky.addColorStop(0,   '#0d0d1a');
  sky.addColorStop(0.6, '#1a0a2e');
  sky.addColorStop(1,   '#0a0a0f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  STARS.forEach(s => {
    ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(Date.now() / 1000 + s.phase));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Moon
  ctx.fillStyle = '#e8e0c8';
  ctx.beginPath();
  ctx.arc(740, 80, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a0a2e';
  ctx.beginPath();
  ctx.arc(757, 74, 38, 0, Math.PI * 2);
  ctx.fill();

  // Back buildings (silhouette)
  ctx.fillStyle = '#0f0f1e';
  const bldgs = [
    [0,   GROUND_Y - 160, 55,  160],
    [60,  GROUND_Y - 220, 70,  220],
    [140, GROUND_Y - 140, 45,  140],
    [195, GROUND_Y - 200, 60,  200],
    [600, GROUND_Y - 180, 65,  180],
    [670, GROUND_Y - 260, 80,  260],
    [760, GROUND_Y - 190, 55,  190],
    [820, GROUND_Y - 150, 80,  150],
  ];
  bldgs.forEach(([bx, by, bw, bh]) => {
    ctx.fillRect(bx, by, bw, bh);
    // windows
    ctx.fillStyle = 'rgba(255,230,80,0.18)';
    for (let wy = by + 12; wy < by + bh - 12; wy += 22) {
      for (let wx = bx + 8; wx < bx + bw - 8; wx += 16) {
        if (Math.random() < 0.0015) continue; // flicker rarely
        ctx.fillRect(wx, wy, 7, 10);
      }
    }
    ctx.fillStyle = '#0f0f1e';
  });

  // Neon grid floor
  const floorGrd = ctx.createLinearGradient(0, GROUND_Y, 0, GAME_H);
  floorGrd.addColorStop(0,   '#0d1a2a');
  floorGrd.addColorStop(0.4, '#050d14');
  floorGrd.addColorStop(1,   '#020508');
  ctx.fillStyle = floorGrd;
  ctx.fillRect(0, GROUND_Y, GAME_W, GAME_H - GROUND_Y);

  // Grid lines
  ctx.strokeStyle = 'rgba(0, 200, 120, 0.18)';
  ctx.lineWidth = 1;
  const vp = { x: GAME_W / 2, y: GROUND_Y };
  const gridLines = 16;
  for (let i = 0; i <= gridLines; i++) {
    const t = i / gridLines;
    const fx = t * GAME_W;
    ctx.beginPath();
    ctx.moveTo(vp.x + (fx - vp.x) * 0.15, vp.y);
    ctx.lineTo(fx, GAME_H);
    ctx.stroke();
  }
  const hLines = 10;
  for (let j = 1; j <= hLines; j++) {
    const fy = GROUND_Y + (j / hLines) * (GAME_H - GROUND_Y);
    const alpha = 0.18 * (1 - j / hLines);
    ctx.strokeStyle = `rgba(0,200,120,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(0, fy);
    ctx.lineTo(GAME_W, fy);
    ctx.stroke();
  }

  // Ground line glow
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur  = 16;
  ctx.strokeStyle = '#00ff8866';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(GAME_W, GROUND_Y);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Crowd silhouette strip
  ctx.fillStyle = 'rgba(20,10,30,0.85)';
  ctx.fillRect(0, GROUND_Y - 42, GAME_W, 42);
  for (let hx = 10; hx < GAME_W; hx += 24) {
    const hh = 20 + 12 * Math.sin(hx * 0.3 + Date.now() * 0.001);
    ctx.fillStyle = 'rgba(30,15,50,0.9)';
    ctx.beginPath();
    ctx.arc(hx, GROUND_Y - 4, 9, Math.PI, 0);
    ctx.rect(hx - 9, GROUND_Y - 4 - hh, 18, hh);
    ctx.fill();
  }
}

// Pre-generate star positions
const STARS = Array.from({ length: 80 }, () => ({
  x:     Math.random() * GAME_W,
  y:     Math.random() * GROUND_Y * 0.8,
  r:     0.5 + Math.random() * 1.5,
  phase: Math.random() * Math.PI * 2,
}));

// ── Hit Texts ───────────────────────────────────────────────────
const hitTexts = [];
function spawnHitText(text, x, y) {
  hitTexts.push({ text, x, y, life: 35, maxLife: 35 });
}

function drawHitTexts() {
  hitTexts.forEach(h => {
    const t = 1 - h.life / h.maxLife;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.font = `bold ${44 - t * 10}px 'Bebas Neue', sans-serif`;
    ctx.fillStyle = '#ffe000';
    ctx.shadowColor = '#ffe000';
    ctx.shadowBlur  = 12;
    ctx.textAlign   = 'center';
    ctx.fillText(h.text, h.x, h.y - t * 30);
    ctx.restore();
  });
  for (let i = hitTexts.length - 1; i >= 0; i--) {
    hitTexts[i].life--;
    if (hitTexts[i].life <= 0) hitTexts.splice(i, 1);
  }
}

// ── Screen Flash ────────────────────────────────────────────────
let flashAlpha = 0;
function triggerFlash() { flashAlpha = 0.5; }
function drawFlash() {
  if (flashAlpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = flashAlpha;
  ctx.fillStyle   = '#ffffff';
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  ctx.restore();
  flashAlpha = Math.max(0, flashAlpha - 0.04);
}

// ── Players ─────────────────────────────────────────────────────
const groundY = GROUND_Y;

const player = new Player({
  x: 220, y: groundY, groundY,
  width: 96, height: 112,
  facing: 1, isPlayer: true, speed: 5,
});

const cpu = new Player({
  x: 680, y: groundY, groundY,
  width: 96, height: 112,
  facing: -1, isPlayer: false, speed: 3.2,
});

// Hit callbacks
player.onHit = (dmg, x, y) => {
  const labels = ['HIT!', 'OOF!', 'CRACK!'];
  spawnHitText(labels[Math.floor(Math.random() * labels.length)], x, y);
  triggerFlash();
  updateHUD();
};
cpu.onHit = (dmg, x, y) => {
  const labels = ['POW!', 'WHAM!', 'SMASH!', 'ZAP!'];
  spawnHitText(labels[Math.floor(Math.random() * labels.length)], x, y);
  triggerFlash();
  updateHUD();
};

// Load sprites (fallback to procedural if missing)
const spriteStates = ['idle','stance','punch','kick','jump','block','special'];
const makeMap = prefix => Object.fromEntries(spriteStates.map(s => [s, `sprites/${s}.png`]));
player.loadSprites(makeMap('sprites/'));
cpu.loadSprites(makeMap('sprites/'));

// ── CPU AI ───────────────────────────────────────────────────────
let cpuActionTimer = 0;
const CPU_THINK_MIN = 25;
const CPU_THINK_MAX = 70;

function updateCPU() {
  if (cpu.locked || gameOver) return;

  cpuActionTimer--;
  if (cpuActionTimer > 0) return;

  cpuActionTimer = CPU_THINK_MIN + Math.floor(Math.random() * (CPU_THINK_MAX - CPU_THINK_MIN));

  const dist = Math.abs(cpu.x - player.x);
  const roll = Math.random();

  if (dist > 250) {
    // Move toward player
    cpu.x += (player.x > cpu.x ? 1 : -1) * cpu.speed * 12;
    cpu.setState('stance');
  } else if (dist < 80) {
    // Too close – back off or attack
    if (roll < 0.35) {
      cpu.x -= (player.x > cpu.x ? 1 : -1) * cpu.speed * 8;
      cpu.setState('stance');
    } else {
      cpuAttack();
    }
  } else {
    // In range
    if (roll < 0.45) {
      cpuAttack();
    } else if (roll < 0.65) {
      cpu.setState('block', 22);
    } else {
      // Advance
      cpu.x += (player.x > cpu.x ? 1 : -1) * cpu.speed * 6;
      cpu.setState('stance');
    }
  }
}

function cpuAttack() {
  const r = Math.random();
  if (r < 0.4) {
    cpu.setState('punch', 22);
    if (cpu._inRange(player, 120)) player.takeHit(15, cpu);
  } else if (r < 0.75) {
    cpu.setState('kick', 28);
    if (cpu._inRange(player, 130)) player.takeHit(20, cpu);
  } else {
    // CPU special
    cpu.setState('special', 50);
    if (cpu._inRange(player, 180)) player.takeHit(35, cpu);
  }
}

// ── HUD ──────────────────────────────────────────────────────────
const playerHealthBar = document.getElementById('player-health-bar');
const cpuHealthBar    = document.getElementById('cpu-health-bar');
const stateBadge      = document.getElementById('state-badge');
const timerEl         = document.getElementById('timer');

let badgeTimeout;
function updateHUD() {
  const pPct = player.hp / player.maxHP * 100;
  const cPct = cpu.hp    / cpu.maxHP    * 100;

  playerHealthBar.style.width = pPct + '%';
  cpuHealthBar.style.width    = cPct + '%';

  if (pPct < 25) playerHealthBar.setAttribute('data-pct','low');
  else           playerHealthBar.removeAttribute('data-pct');
  if (cPct < 25) cpuHealthBar.setAttribute('data-pct','low');
  else           cpuHealthBar.removeAttribute('data-pct');
}

let lastState = '';
function updateStateBadge() {
  if (player.state !== lastState) {
    lastState = player.state;
    stateBadge.textContent = player.state.toUpperCase().replace('_', ' ');
    stateBadge.classList.remove('hidden');
    clearTimeout(badgeTimeout);
    badgeTimeout = setTimeout(() => stateBadge.classList.add('hidden'), 900);
  }
}

// ── Timer ────────────────────────────────────────────────────────
let timeLeft   = TIMER_SEC;
let timerTick  = 0;
const TIMER_FRAMES = 60; // 1 second at 60fps

// ── KO Overlay ───────────────────────────────────────────────────
let gameOver = false;

const koOverlay = document.createElement('div');
koOverlay.id = 'ko-overlay';
koOverlay.innerHTML = `
  <div id="ko-text">K.O.</div>
  <div id="ko-sub">PLAYER</div>
  <button id="restart-btn" onclick="restartGame()">▶ PLAY AGAIN</button>
`;
document.body.appendChild(koOverlay);

function showKO(winner) {
  gameOver = true;
  koOverlay.classList.add('visible');
  document.getElementById('ko-sub').textContent = winner + ' WINS!';
}

function restartGame() {
  player.hp = player.maxHP;
  cpu.hp    = cpu.maxHP;
  player.x  = 220; player.y = groundY;
  cpu.x     = 680; cpu.y    = groundY;
  player.setState('idle');
  cpu.setState('idle');
  player.vy = 0; cpu.vy = 0;
  player.onGround = true; cpu.onGround = true;
  timeLeft  = TIMER_SEC;
  timerTick = 0;
  gameOver  = false;
  koOverlay.classList.remove('visible');
  updateHUD();
}

// ── Main Loop ────────────────────────────────────────────────────
function gameLoop() {
  requestAnimationFrame(gameLoop);

  // Draw background
  if (bgImg.complete && bgImg.naturalWidth > 0) {
    ctx.drawImage(bgImg, 0, 0, GAME_W, GAME_H);
  } else {
    drawStageFallback();
  }

  if (!gameOver) {
    // Timer
    timerTick++;
    if (timerTick >= TIMER_FRAMES) {
      timerTick = 0;
      timeLeft  = Math.max(0, timeLeft - 1);
      timerEl.textContent = String(timeLeft).padStart(2, '0');
      if (timeLeft <= 0) {
        // Time out: whoever has more HP wins
        const winner = player.hp >= cpu.hp ? 'PLAYER' : 'CPU';
        showKO(winner);
      }
    }

    // Update
    player.update(cpu);
    updateCPU();
    cpu.update(player);

    // Check KO
    if (player.hp <= 0) showKO('CPU');
    if (cpu.hp    <= 0) showKO('PLAYER');
  }

  // Draw characters
  cpu.draw(ctx);
  player.draw(ctx);

  drawHitTexts();
  drawFlash();

  updateHUD();
  updateStateBadge();
  Input.flush();
}

updateHUD();
gameLoop();
