// ─── Game Loop & Stage ────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

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

const GROUND_Y  = 430;
const TIMER_SEC = 99;

// ── Background ──────────────────────────────────────────────────
const bgImg = new Image();
bgImg.src = 'background/stage.png';

// Procedural fallback stage
const STARS = Array.from({ length: 80 }, () => ({
  x:     Math.random() * GAME_W,
  y:     Math.random() * GROUND_Y * 0.8,
  r:     0.5 + Math.random() * 1.5,
  phase: Math.random() * Math.PI * 2,
}));

function drawStageFallback() {
  const sky = ctx.createLinearGradient(0, 0, 0, GAME_H);
  sky.addColorStop(0,   '#0d0d1a');
  sky.addColorStop(0.6, '#1a0a2e');
  sky.addColorStop(1,   '#0a0a0f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  STARS.forEach(s => {
    ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(Date.now() / 1000 + s.phase));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  const floorGrd = ctx.createLinearGradient(0, GROUND_Y, 0, GAME_H);
  floorGrd.addColorStop(0,   '#0d1a2a');
  floorGrd.addColorStop(1,   '#020508');
  ctx.fillStyle = floorGrd;
  ctx.fillRect(0, GROUND_Y, GAME_W, GAME_H - GROUND_Y);

  ctx.strokeStyle = 'rgba(0, 200, 120, 0.18)';
  ctx.lineWidth = 1;
  const vp = { x: GAME_W / 2, y: GROUND_Y };
  for (let i = 0; i <= 16; i++) {
    const fx = (i / 16) * GAME_W;
    ctx.beginPath();
    ctx.moveTo(vp.x + (fx - vp.x) * 0.15, vp.y);
    ctx.lineTo(fx, GAME_H);
    ctx.stroke();
  }

  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur  = 16;
  ctx.strokeStyle = '#00ff8866';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(GAME_W, GROUND_Y);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// ── Hit Texts ───────────────────────────────────────────────────
const hitTexts = [];
function spawnHitText(text, x, y) {
  hitTexts.push({ text, x, y, life: 38, maxLife: 38 });
}
function drawHitTexts() {
  hitTexts.forEach(h => {
    const t = 1 - h.life / h.maxLife;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.font = `bold ${46 - t * 12}px 'Bebas Neue', sans-serif`;
    ctx.fillStyle   = '#ffe000';
    ctx.shadowColor = '#ffe000';
    ctx.shadowBlur  = 14;
    ctx.textAlign   = 'center';
    ctx.fillText(h.text, h.x, h.y - t * 34);
    ctx.restore();
  });
  for (let i = hitTexts.length - 1; i >= 0; i--) {
    hitTexts[i].life--;
    if (hitTexts[i].life <= 0) hitTexts.splice(i, 1);
  }
}

// ── Screen Flash ────────────────────────────────────────────────
let flashAlpha = 0;
function triggerFlash() { flashAlpha = 0.45; }
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
  width: 108, height: 136,
  facing: 1, isPlayer: true, speed: 1.2, charId: 1,
});

const cpu = new Player({
  x: 680, y: groundY, groundY,
  width: 108, height: 136,
  facing: -1, isPlayer: false, speed: 0.9, charId: 2,
});

// Hit callbacks
player.onHit = (dmg, x, y) => {
  const labels = ['HIT!', 'OOF!', 'CRACK!', 'UGH!'];
  spawnHitText(labels[Math.floor(Math.random() * labels.length)], x, y);
  triggerFlash();
  updateHUD();
};
cpu.onHit = (dmg, x, y) => {
  const labels = ['POW!', 'WHAM!', 'SMASH!', 'ZAP!', 'BANG!'];
  spawnHitText(labels[Math.floor(Math.random() * labels.length)], x, y);
  triggerFlash();
  updateHUD();
};

// ── Load sprites ─────────────────────────────────────────────────
// P1 — guy with cap
player.loadSprites({
  idle:    'sprites/p1/idle.png',
  stance:  'sprites/p1/stance.png',
  punch:   'sprites/p1/punch.png',
  kick:    'sprites/p1/kick.png',
  jump:    'sprites/p1/jump.png',
  block:   'sprites/p1/stance.png',
  special: 'sprites/p1/punch.png',
  // Walk cycle — 8 frames
  walk: [
    'sprites/p1/walk/walk1.png',
    'sprites/p1/walk/walk2.png',
    'sprites/p1/walk/walk3.png',
    'sprites/p1/walk/walk4.png',
    'sprites/p1/walk/walk5.png',
    'sprites/p1/walk/walk6.png',
    'sprites/p1/walk/walk7.png',
    'sprites/p1/walk/walk8.png',
  ],
});

// P2 — girl (sprites/p2/)
cpu.loadSprites({
  idle:    'sprites/p2/idle.png',
  stance:  'sprites/p2/stance.png',
  punch:   'sprites/p2/punch.png',
  kick:    'sprites/p2/kick.png',
  jump:    'sprites/p2/jump.png',
  block:   'sprites/p2/idle.png',    // reuse idle for block
  special: 'sprites/p2/punch.png',   // reuse punch for special
});

// ── CPU AI ───────────────────────────────────────────────────────
let cpuActionTimer = 0;
const CPU_THINK_MIN = 28;
const CPU_THINK_MAX = 72;

function updateCPU() {
  if (cpu.locked || gameOver) return;
  cpuActionTimer--;
  if (cpuActionTimer > 0) return;
  cpuActionTimer = CPU_THINK_MIN + Math.floor(Math.random() * (CPU_THINK_MAX - CPU_THINK_MIN));

  const dist = Math.abs(cpu.x - player.x);
  const roll = Math.random();

  if (dist > 260) {
    cpu.x += (player.x > cpu.x ? 1 : -1) * cpu.speed * 3;
    cpu.setState('stance');
  } else if (dist < 80) {
    if (roll < 0.4) {
      cpu.x -= (player.x > cpu.x ? 1 : -1) * cpu.speed * 2;
      cpu.setState('stance');
    } else {
      cpuAttack();
    }
  } else {
    if (roll < 0.45)      cpuAttack();
    else if (roll < 0.65) cpu.setState('block', 22);
    else {
      cpu.x += (player.x > cpu.x ? 1 : -1) * cpu.speed * 2;
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
    stateBadge.textContent = player.state.toUpperCase().replace('_',' ');
    stateBadge.classList.remove('hidden');
    clearTimeout(badgeTimeout);
    badgeTimeout = setTimeout(() => stateBadge.classList.add('hidden'), 900);
  }
}

// ── Timer ────────────────────────────────────────────────────────
let timeLeft  = TIMER_SEC;
let timerTick = 0;
const TIMER_FRAMES = 60;

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
  koOverlay.classList.remove('visible');
  CharSelect.show(applySelection);
}

// ── Aplica a seleção e começa a luta ─────────────────────────────
function applySelection(sel) {
  function makeSprites(folder, walkFrames) {
    const map = {
      idle:    folder + '/idle.png',
      stance:  folder + '/stance.png',
      punch:   folder + '/punch.png',
      kick:    folder + '/kick.png',
      jump:    folder + '/jump.png',
      block:   folder + '/idle.png',
      special: folder + '/punch.png',
    };
    // Adiciona walk cycle se fornecido
    if (walkFrames && walkFrames.length > 0) {
      map.walk = walkFrames;
    }
    return map;
  }

  player.loadSprites(makeSprites(sel.player.folder, sel.player.walkFrames));
  cpu.loadSprites(makeSprites(sel.cpu.folder, sel.cpu.walkFrames));

  document.querySelector('#player-hud .hud-name').textContent = sel.player.name;

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
  updateHUD();
}

// ── Main Loop ────────────────────────────────────────────────────
function gameLoop() {
  requestAnimationFrame(gameLoop);

  // Background
  if (bgImg.complete && bgImg.naturalWidth > 0) {
    // Draw background scaled to fill, cropped top if needed
    const bw = bgImg.naturalWidth;
    const bh = bgImg.naturalHeight;
    const scale = Math.max(GAME_W / bw, GAME_H / bh);
    const dw = bw * scale;
    const dh = bh * scale;
    const dx = (GAME_W - dw) / 2;
    const dy = (GAME_H - dh) / 2;
    ctx.drawImage(bgImg, dx, dy, dw, dh);

    // Darken slightly for readability
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    // Ground shadow strip
    const grd = ctx.createLinearGradient(0, GROUND_Y - 2, 0, GROUND_Y + 20);
    grd.addColorStop(0, 'rgba(0,0,0,0.5)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, GROUND_Y - 2, GAME_W, 22);
  } else {
    drawStageFallback();
  }

  if (!gameOver) {
    timerTick++;
    if (timerTick >= TIMER_FRAMES) {
      timerTick = 0;
      timeLeft  = Math.max(0, timeLeft - 1);
      timerEl.textContent = String(timeLeft).padStart(2, '0');
      if (timeLeft <= 0) {
        showKO(player.hp >= cpu.hp ? 'PLAYER' : 'CPU');
      }
    }

    player.update(cpu);
    updateCPU();
    cpu.update(player);

    if (player.hp <= 0) showKO('CPU');
    if (cpu.hp    <= 0) showKO('PLAYER');
  }

  cpu.draw(ctx);
  player.draw(ctx);

  drawHitTexts();
  drawFlash();

  updateHUD();
  updateStateBadge();
  Input.flush();
}

// ── Inicia via tela de seleção ───────────────────────────────────
// gameOver começa true para o loop não processar input antes da seleção
gameOver = true;
updateHUD();
gameLoop();

// Abre a tela de seleção; applySelection vai setar gameOver = false
CharSelect.show(applySelection);
