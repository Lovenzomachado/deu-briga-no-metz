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

const STARS = Array.from({ length: 80 }, () => ({
  x: Math.random() * GAME_W, y: Math.random() * GROUND_Y * 0.8,
  r: 0.5 + Math.random() * 1.5, phase: Math.random() * Math.PI * 2,
}));

function drawStageFallback() {
  const sky = ctx.createLinearGradient(0, 0, 0, GAME_H);
  sky.addColorStop(0, '#0d0d1a'); sky.addColorStop(0.6, '#1a0a2e'); sky.addColorStop(1, '#0a0a0f');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, GAME_W, GAME_H);
  STARS.forEach(s => {
    ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(Date.now() / 1000 + s.phase));
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha = 1;
  const flr = ctx.createLinearGradient(0, GROUND_Y, 0, GAME_H);
  flr.addColorStop(0, '#0d1a2a'); flr.addColorStop(1, '#020508');
  ctx.fillStyle = flr; ctx.fillRect(0, GROUND_Y, GAME_W, GAME_H - GROUND_Y);
  ctx.strokeStyle = 'rgba(0,200,120,0.18)'; ctx.lineWidth = 1;
  for (let i = 0; i <= 16; i++) {
    const fx = (i/16)*GAME_W;
    ctx.beginPath(); ctx.moveTo(GAME_W/2+(fx-GAME_W/2)*0.15, GROUND_Y); ctx.lineTo(fx, GAME_H); ctx.stroke();
  }
  ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 16;
  ctx.strokeStyle = '#00ff8866'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(GAME_W, GROUND_Y); ctx.stroke();
  ctx.shadowBlur = 0;
}

// ── Hit Texts ───────────────────────────────────────────────────
const hitTexts = [];
function spawnHitText(text, x, y) { hitTexts.push({ text, x, y, life: 38, maxLife: 38 }); }
function drawHitTexts() {
  hitTexts.forEach(h => {
    const t = 1 - h.life / h.maxLife;
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.font = `bold ${46 - t*12}px 'Bebas Neue', sans-serif`;
    ctx.fillStyle = '#ffe000'; ctx.shadowColor = '#ffe000'; ctx.shadowBlur = 14;
    ctx.textAlign = 'center';
    ctx.fillText(h.text, h.x, h.y - t*34);
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
  ctx.save(); ctx.globalAlpha = flashAlpha; ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, GAME_W, GAME_H); ctx.restore();
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

player.onClash = () => { spawnHitText('CLASH!', (player.x+cpu.x)/2, GROUND_Y-80); };
player.onHit = (dmg, x, y) => {
  spawnHitText(['HIT!','OOF!','CRACK!','UGH!'][Math.floor(Math.random()*4)], x, y);
  triggerFlash(); updateHUD();
};
cpu.onHit = (dmg, x, y) => {
  spawnHitText(['POW!','WHAM!','SMASH!','ZAP!','BANG!'][Math.floor(Math.random()*5)], x, y);
  triggerFlash(); updateHUD();
};

// ── Load sprites ─────────────────────────────────────────────────
player.loadSprites({
  idle: 'sprites/metz/idle.png', stance: 'sprites/metz/stance.png',
  punch: 'sprites/metz/punch.png', kick: 'sprites/metz/kick.png',
  jump: 'sprites/metz/jump.png', block: 'sprites/metz/stance.png',
  special: ['sprites/metz/special/special1.png','sprites/metz/special/special2.png',
            'sprites/metz/special/special3.png','sprites/metz/special/special4.png',
            'sprites/metz/special/special5.png','sprites/metz/special/special6.png',
            'sprites/metz/special/special7.png'],
  walk: ['sprites/metz/walk/walk1.png','sprites/metz/walk/walk2.png',
         'sprites/metz/walk/walk3.png','sprites/metz/walk/walk4.png',
         'sprites/metz/walk/walk5.png','sprites/metz/walk/walk6.png',
         'sprites/metz/walk/walk7.png','sprites/metz/walk/walk8.png'],
});

cpu.loadSprites({
  idle: 'sprites/mila/idle.png', stance: 'sprites/mila/stance.png',
  punch: 'sprites/mila/punch.png', kick: 'sprites/mila/kick.png',
  jump: 'sprites/mila/jump.png', block: 'sprites/mila/idle.png',
  special: 'sprites/mila/punch.png',
  hitstun: 'sprites/mila/hitstun.png',
  ground_light: 'sprites/mila/ground_light.png',
  ground_heavy: 'sprites/mila/ground_heavy.png',
  down_attack:  'sprites/mila/down_attack.png',
  anti_air:     'sprites/mila/anti_air.png',
  air_light:    'sprites/mila/air_light.png',
  air_heavy:    'sprites/mila/air_heavy.png',
  down_air:     'sprites/mila/down_air.png',
  walk: ['sprites/mila/walk/walk1.png','sprites/mila/walk/walk2.png',
         'sprites/mila/walk/walk3.png','sprites/mila/walk/walk4.png',
         'sprites/mila/walk/walk5.png','sprites/mila/walk/walk6.png',
         'sprites/mila/walk/walk7.png','sprites/mila/walk/walk8.png'],
});

// ── CPU AI ───────────────────────────────────────────────────────
let cpuActionTimer = 0;

function updateCPU() {
  if (cpu.locked || cpu.hitstun > 0 || gameOver) return;
  cpuActionTimer--;
  if (cpuActionTimer > 0) return;
  cpuActionTimer = 28 + Math.floor(Math.random() * 44);

  const dist = Math.abs(cpu.x - player.x);
  const roll = Math.random();

  if (dist > 260) {
    cpu.x += (player.x > cpu.x ? 1 : -1) * cpu.speed * 3;
    cpu.setState('stance');
  } else if (dist < 80) {
    if (roll < 0.4) { cpu.x -= (player.x > cpu.x ? 1 : -1) * cpu.speed * 2; cpu.setState('stance'); }
    else cpuAttack();
  } else {
    if (roll < 0.45) cpuAttack();
    else if (roll < 0.65) cpu.setState('block', 22);
    else { cpu.x += (player.x > cpu.x ? 1 : -1) * cpu.speed * 2; cpu.setState('stance'); }
  }
}

function cpuAttack() {
  const r     = Math.random();
  const accum = player.dmgAccum;
  const fscale = Math.max(0.5, accum/100 + accum*accum/20000);

  // Helper: cpu ataca com força variável calculada
  const cpuHit = (state, lock, dmg, baseForce, range, hitstunMs, launcher=false) => {
    cpu.setState(state, lock);
    cpu.attackPriority = state.includes('heavy') || state === 'special' ? 3 : state.startsWith('air') ? 1 : 2;
    if (cpu._inRange(player, range)) {
      const kn = Math.round(baseForce * fscale);
      player.takeHit(dmg, cpu, Math.round(hitstunMs/(1000/60)), kn, launcher);
    }
  };

  if (!cpu.onGround) {
    if (r < 0.5) cpuHit('air_neutral_light', 20,  9,  7, 95,  170);
    else         cpuHit('recovery',          32, 16, 14, 105, 240, true);
    return;
  }
  if      (r < 0.30) cpuHit('neutral_light', 18, 10,  8,  90, 170);
  else if (r < 0.55) cpuHit('side_light',    20, 11,  9,  95, 180);
  else if (r < 0.70) cpuHit('neutral_heavy', 32, 18, 18, 110, 260);
  else if (r < 0.82) cpuHit('side_heavy',    32, 20, 20, 115, 260);
  else if (!cpu.specialUsed && r < 0.92) {
    cpu.specialUsed = true;
    cpuHit('special', 50, 35, 22, 180, 300);
  } else             cpuHit('down_light',    22, 12,  7, 100, 190);
}

// ── HUD ──────────────────────────────────────────────────────────
const playerHealthBar = document.getElementById('player-health-bar');
const cpuHealthBar    = document.getElementById('cpu-health-bar');
const stateBadge      = document.getElementById('state-badge');
const timerEl         = document.getElementById('timer');
let badgeTimeout;

function updateSpecialHUD() {
  const el = document.getElementById('special-indicator');
  if (!el) return;
  if (player.specialUsed) { el.classList.add('used'); }
  else                    { el.classList.remove('used'); }
}
player.onHeal = () => updateHUD();

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
    stateBadge.textContent = player.state.toUpperCase().replace(/_/g,' ');
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
  <div id="ko-sub">PLAYER WINS!</div>
`;
document.body.appendChild(koOverlay);

function showKO(winner) {
  gameOver = true;
  koOverlay.classList.add('visible');
  document.getElementById('ko-sub').textContent = winner + ' WINS!';
  // Após 2s, vai para a charselect com "PLAY AGAIN"
  setTimeout(() => {
    koOverlay.classList.remove('visible');
    CharSelect.show(applySelection, true); // true = show "play again"
  }, 2000);
}

// ── Apply selection ───────────────────────────────────────────────
function applySelection(sel) {
  function makeSprites(folder, walkFrames, specialFrames) {
    const map = {
      idle: folder+'/idle.png', stance: folder+'/stance.png',
      punch: folder+'/punch.png', kick: folder+'/kick.png',
      jump: folder+'/jump.png', block: folder+'/idle.png',
      special: folder+'/punch.png',
      hitstun:          folder+'/hitstun.png',
      // Ground attacks
      neutral_light:    folder+'/ground_light.png',
      side_light:       folder+'/ground_light.png',
      down_light:       folder+'/down_attack.png',
      neutral_heavy:    folder+'/ground_heavy.png',
      side_heavy:       folder+'/ground_heavy.png',
      down_heavy:       folder+'/down_attack.png',
      // Air attacks (no Side Air Heavy)
      air_neutral_light: folder+'/air_light.png',
      air_side_light:    folder+'/air_light.png',
      air_down_light:    folder+'/down_air.png',
      recovery:          folder+'/anti_air.png',
      ground_pound:      folder+'/down_air.png',
    };
    if (walkFrames    && walkFrames.length    > 0) map.walk    = walkFrames;
    if (specialFrames && specialFrames.length > 0) map.special = specialFrames;
    return map;
  }

  player.charId = sel.player.id === 'metz' ? 1 : 2;
  cpu.charId    = sel.cpu.id    === 'metz' ? 1 : 2;

  player.loadSprites(makeSprites(sel.player.folder, sel.player.walkFrames, sel.player.specialFrames));
  cpu.loadSprites(makeSprites(sel.cpu.folder, sel.cpu.walkFrames, sel.cpu.specialFrames));

  document.querySelector('#player-hud .hud-name').textContent = sel.player.name;

  const resetPlayer = (p, px, py) => {
    p.hp = p.maxHP; p.x = px; p.y = groundY;
    p.setState('idle'); p.vy = 0; p.onGround = true;
    p.specialUsed = false; p.healPerFrame = 0;
    p.hitstun = 0; p.locked = false;
    p.heavyHeld = 0; p.heavyCharged = false;
    p.dmgAccum = 0; p.vx = 0; p.attackPriority = 0;
  };
  resetPlayer(player, 220);
  resetPlayer(cpu, 680);
  cpu.facing = -1;

  timeLeft = TIMER_SEC; timerTick = 0; gameOver = false;
  hitTexts.length = 0; flashAlpha = 0;
  updateHUD(); updateSpecialHUD();
}

// ── Main Loop ────────────────────────────────────────────────────
function gameLoop() {
  requestAnimationFrame(gameLoop);

  if (bgImg.complete && bgImg.naturalWidth > 0) {
    const bw = bgImg.naturalWidth, bh = bgImg.naturalHeight;
    const sc = Math.max(GAME_W/bw, GAME_H/bh);
    ctx.drawImage(bgImg, (GAME_W-bw*sc)/2, (GAME_H-bh*sc)/2, bw*sc, bh*sc);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0,0,GAME_W,GAME_H);
    const grd = ctx.createLinearGradient(0,GROUND_Y-2,0,GROUND_Y+20);
    grd.addColorStop(0,'rgba(0,0,0,0.5)'); grd.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.fillRect(0,GROUND_Y-2,GAME_W,22);
  } else {
    drawStageFallback();
  }

  if (!gameOver) {
    timerTick++;
    if (timerTick >= TIMER_FRAMES) {
      timerTick = 0;
      timeLeft = Math.max(0, timeLeft - 1);
      timerEl.textContent = String(timeLeft).padStart(2,'0');
      if (timeLeft <= 0) showKO(player.hp >= cpu.hp ? 'PLAYER' : 'CPU');
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
  updateSpecialHUD();
  updateStateBadge();
  Input.flush();
}

// ── Start ────────────────────────────────────────────────────────
gameOver = true;
updateHUD(); updateSpecialHUD();
gameLoop();
CharSelect.show(applySelection, false);
