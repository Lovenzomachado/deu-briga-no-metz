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

// ── Combo Texts ──────────────────────────────────────────────────
const comboTexts = [];
function spawnComboText(count, x, y) {
  // Remove combo anterior se existir
  comboTexts.length = 0;
  comboTexts.push({ count, x, y, life: 50, maxLife: 50 });
}
function drawComboTexts() {
  comboTexts.forEach(c => {
    const t = 1 - c.life / c.maxLife;
    ctx.save();
    ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    const scale = 1 + (1 - t) * 0.3;
    ctx.translate(c.x, c.y - t * 20);
    ctx.scale(scale, scale);
    ctx.font = `bold 32px 'Bebas Neue', sans-serif`;
    ctx.fillStyle   = '#ff6600';
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur  = 16;
    ctx.textAlign   = 'center';
    ctx.fillText(`${c.count} HIT!`, 0, 0);
    ctx.restore();
  });
  for (let i = comboTexts.length - 1; i >= 0; i--) {
    comboTexts[i].life--;
    if (comboTexts[i].life <= 0) comboTexts.splice(i, 1);
  }
}
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
  width: 160, height: 200,
  facing: 1, isPlayer: true, speed: 1.2, charId: 1,
});

const cpu = new Player({
  x: 680, y: groundY, groundY,
  width: 160, height: 200,
  facing: -1, isPlayer: false, speed: 0.9, charId: 2,
});

player.onClash = () => { spawnHitText('CLASH!', (player.x+cpu.x)/2, GROUND_Y-80); };

// Combo counter display
player.onCombo = (count, atk) => {
  if (count >= 2) {
    const x = player.x + (player.facing * 60);
    const y = player.y - player.height - 20;
    spawnComboText(count, x, y);
  }
};
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
  jump: 'sprites/metz/jump.png', block: 'sprites/metz/idle.png',
  hitstun: 'sprites/metz/hitstun.png',
  neutral_light:     'sprites/metz/neutral_light.png',
  side_light:        'sprites/metz/side_light.png',
  down_light:        'sprites/metz/down_light.png',
  neutral_heavy:     'sprites/metz/neutral_heavy.png',
  side_heavy:        'sprites/metz/side_heavy.png',
  down_heavy:        'sprites/metz/down_heavy.png',
  air_neutral_light: 'sprites/metz/air_neutral_light.png',
  air_side_light:    'sprites/metz/air_side_light.png',
  air_down_light:    'sprites/metz/air_down_light.png',
  recovery:          'sprites/metz/recovery.png',
  ground_pound:      'sprites/metz/ground_pound.png',
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
  hitstun: 'sprites/mila/hitstun.png',
  neutral_light:     'sprites/mila/neutral_light.png',
  side_light:        'sprites/mila/side_light.png',
  down_light:        'sprites/mila/down_light.png',
  neutral_heavy:     'sprites/mila/neutral_heavy.png',
  side_heavy:        'sprites/mila/side_heavy.png',
  down_heavy:        'sprites/mila/down_heavy.png',
  air_neutral_light: 'sprites/mila/air_neutral_light.png',
  air_side_light:    'sprites/mila/air_side_light.png',
  air_down_light:    'sprites/mila/air_down_light.png',
  recovery:          'sprites/mila/recovery.png',
  ground_pound:      'sprites/mila/ground_pound.png',
  special: 'sprites/mila/punch.png',
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
  const r      = Math.random();
  const accum  = player.dmgAccum;
  const fscale = Math.max(0.5, accum/100 + accum*accum/20000);

  // Helper: CPU ataca usando sistema completo (com hitstop, reação, juggle scaling)
  const cpuHit = (state, lock, dmg, baseForce, range, hitstunMs, reaction='grounded', launcher=false) => {
    cpu.setState(state, lock);
    cpu.attackPriority = state.includes('heavy') || state === 'special' ? 3
                       : state.startsWith('air') ? 1 : 2;
    if (!cpu._inRange(player, range)) return;

    let juggleScale = 1.0;
    if (player.isAirborne || !player.onGround) {
      player.juggleCount++;
      juggleScale = Math.pow(0.80, player.juggleCount - 1);
    }
    const kn = Math.round(baseForce * fscale * juggleScale);
    const hf = Math.max(4, Math.round(hitstunMs * juggleScale / (1000/60)));

    cpu.hitstop    = HITSTOP_FRAMES[state] || 3;
    player.hitstop = cpu.hitstop;
    cpu.comboCount++; cpu.comboTimer = 90;

    player.takeHit(dmg, cpu, hf, kn, launcher, reaction);
  };

  if (!cpu.onGround) {
    if (r < 0.5) cpuHit('air_neutral_light', 20,  9,  7,  95, 165, 'grounded');
    else         cpuHit('recovery',          32, 16, 14, 105, 240, 'grounded', true);
    return;
  }
  if      (r < 0.28) cpuHit('neutral_light',18, 10,  7,  90, 170, 'grounded');
  else if (r < 0.50) cpuHit('side_light',   20, 11,  8,  95, 180, 'grounded');
  else if (r < 0.65) cpuHit('neutral_heavy',32, 18, 18, 110, 260, 'knockback');
  else if (r < 0.78) cpuHit('side_heavy',   32, 20, 20, 115, 260, 'knockback');
  else if (r < 0.87) cpuHit('down_heavy',   34, 22, 16, 115, 300, 'airborne', true);
  else if (!cpu.specialUsed && r < 0.95) {
    cpu.specialUsed = true;
    cpuHit('special', 50, 35, 22, 180, 320, 'knockdown');
  } else             cpuHit('down_light',   22, 12,  6, 100, 190, 'grounded');
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
    // Cada ataque tem seu sprite dedicado com nome exato.
    // O _getCurrentSprite() no player.js já tem fallback caso o arquivo não exista.
    const map = {
      idle:    folder+'/idle.png',
      stance:  folder+'/stance.png',
      punch:   folder+'/punch.png',
      kick:    folder+'/kick.png',
      jump:    folder+'/jump.png',
      block:   folder+'/idle.png',
      special: folder+'/punch.png',
      hitstun: folder+'/hitstun.png',
      knockdown: folder+'/hitstun.png',

      // ── 11 ataques — cada um com sprite próprio ────────────────
      // Terra — leves
      neutral_light:     folder+'/neutral_light.png',
      side_light:        folder+'/side_light.png',
      down_light:        folder+'/down_light.png',
      // Terra — pesados (Signatures)
      neutral_heavy:     folder+'/neutral_heavy.png',
      side_heavy:        folder+'/side_heavy.png',
      down_heavy:        folder+'/down_heavy.png',
      // Ar — leves
      air_neutral_light: folder+'/air_neutral_light.png',
      air_side_light:    folder+'/air_side_light.png',
      air_down_light:    folder+'/air_down_light.png',
      // Ar — pesados (Recovery + Ground Pound, sem Side Air Heavy)
      recovery:          folder+'/recovery.png',
      ground_pound:      folder+'/ground_pound.png',
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
    p.resetCombat();
  };
  resetPlayer(player, 220);
  resetPlayer(cpu, 680);
  cpu.facing = -1;

  timeLeft = TIMER_SEC; timerTick = 0; gameOver = false;
  hitTexts.length = 0; flashAlpha = 0;
  updateHUD(); updateSpecialHUD();
}

// ── Main Loop ────────────────────────────────────────────────────
// ── Delta time fixo — cap 60fps para igualar desktop e mobile ────
let lastTime = 0;
const TARGET_DT = 1000 / 60; // 16.67ms

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  // Acumula tempo e só processa quando tiver um frame completo
  const dt = timestamp - lastTime;
  if (dt < TARGET_DT * 0.9) return; // ainda não chegou o frame
  lastTime = timestamp - (dt % TARGET_DT); // corrige drift

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
  drawComboTexts();
  drawFlash();
  updateHUD();
  updateSpecialHUD();
  updateStateBadge();
  Input.flush();
}

// ── Start ────────────────────────────────────────────────────────
gameOver = true;
updateHUD(); updateSpecialHUD();
requestAnimationFrame(gameLoop);

// Fluxo: Intro → CharSelect → Luta
Intro.show(() => {
  CharSelect.show(applySelection, false);
});
