// ─── Game Loop & Stage ────────────────────────────────────────────
// Arquivo principal do jogo. Inicializa e conecta todos os sistemas:
//   • Canvas e resize responsivo
//   • Background (imagem ou fallback procedural)
//   • Instâncias dos dois personagens (player e cpu)
//   • Callbacks de eventos (hit, combo, clash)
//   • CPU AI com estados e sequências de combo
//   • HUD (barras de HP, timer, badge de estado)
//   • KO overlay com botões de revanche
//   • Game loop com fixed timestep (60 steps/s em qualquer Hz)

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const GAME_W = 900;
const GAME_H = 560;

// Mantém o canvas em proporção 900×560 centralizado na janela.
// Usa CSS width/height para escalar sem perder resolução de pixels.
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

// Renderiza um stage procedural (céu estrelado + chão neon) quando
// background/stage.png não está disponível ou ainda carregando.
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
// Textos flutuantes de impacto (POW!, WHAM!, etc.) que sobem e
// desaparecem em 38 frames. Spawnam na posição do golpe.
const hitTexts = [];
function spawnHitText(text, x, y) { hitTexts.push({ text, x, y, life: 38, maxLife: 38 }); }

// ── Combo Texts ──────────────────────────────────────────────────
// Exibe "N HIT!" em laranja ao encadear combos (≥2 hits).
// Só existe um combo text por vez — o anterior é substituído.
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
// Flash branco rápido ao acertar um golpe — feedback visual de impacto.
// flashAlpha decai 0.04 por frame até zero.
let flashAlpha = 0;
function triggerFlash() { flashAlpha = 0.45; }
function drawFlash() {
  if (flashAlpha <= 0) return;
  ctx.save(); ctx.globalAlpha = flashAlpha; ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, GAME_W, GAME_H); ctx.restore();
  flashAlpha = Math.max(0, flashAlpha - 0.04);
}

// ── Players ─────────────────────────────────────────────────────
// Instâncias dos dois personagens. player = humano, cpu = IA.
// isPlayer:true habilita o _handleInput(). isPlayer:false = só física.
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

// ── Callbacks de eventos ─────────────────────────────────────────
// Conectam os eventos do player.js ao sistema visual do game.js.
// onClash: exibe "CLASH!" no centro quando dois ataques se cancelam
// onCombo: exibe contador de hits ao encadear combos
// onHit: exibe texto de impacto e dispara flash de tela
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

// ── Load sprites iniciais ────────────────────────────────────────
// Carrega as sprites dos personagens padrão (metz e mila).
// Ao selecionar personagens na charselect, makeSprites() recarrega.
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
  walk: ['sprites/mila/walk/walk1.png','sprites/mila/walk/walk2.png',
         'sprites/mila/walk/walk3.png','sprites/mila/walk/walk4.png',
         'sprites/mila/walk/walk5.png','sprites/mila/walk/walk6.png',
         'sprites/mila/walk/walk7.png','sprites/mila/walk/walk8.png'],
});

// ── CPU AI — Advanced Combo System ──────────────────────────────
// Estados internos da IA:
//   'idle'    → decidindo o que fazer
//   'approach'→ se aproximando para atacar
//   'combo'   → executando sequência de combo
//   'juggle'  → perseguindo oponente no ar
//   'retreat' → recuando para se defender
//   'bait'    → esperando o player errar

let cpuActionTimer  = 0;
let cpuAIState      = 'idle';
let cpuComboStep    = 0;    // passo atual da sequência de combo
let cpuComboSeq     = [];   // sequência de ataques planejada
let cpuReactionTimer = 0;   // tempo de reação após tomar dano

// ── Sequências de combo do CPU ────────────────────────────────────
// Cada entrada: [state, lockFrames, dmg, baseForce, range, hitstunMs, reaction, launcher]
const CPU_COMBOS = {
  // Combo básico em terra: 2 leves → pesado neutro
  basic: [
    ['neutral_light', 18, 10,  7,  90, 170, 'grounded',  false],
    ['side_light',    20, 11,  8,  95, 180, 'grounded',  false],
    ['neutral_heavy', 32, 18, 18, 110, 260, 'knockback', false],
  ],
  // Combo launcher: leve → down_light (lança) → juggle
  launcher: [
    ['side_light',  20, 11,  8,  95, 180, 'grounded', false],
    ['down_light',  22, 12,  6, 100, 190, 'airborne', true ],
  ],
  // Combo aéreo: juggle com 3 hits no ar
  juggle: [
    ['air_neutral_light', 20,  9,  7,  95, 165, 'grounded', false],
    ['air_side_light',    20,  9,  8,  95, 175, 'knockback', false],
    ['recovery',          32, 16, 14, 105, 240, 'grounded', false],
  ],
  // Punish pesado: usado quando o player erra
  punish: [
    ['side_heavy',   32, 20, 20, 115, 260, 'knockback', false],
    ['neutral_heavy',32, 18, 18, 110, 260, 'knockback', false],
  ],
  // Ender de combo: fecha com down_heavy (sig)
  ender: [
    ['down_heavy', 34, 22, 16, 115, 300, 'knockdown', false],
  ],
  // Pressão rápida: 3 leves consecutivos
  pressure: [
    ['neutral_light', 18, 10,  7,  90, 170, 'grounded', false],
    ['neutral_light', 18, 10,  7,  90, 170, 'grounded', false],
    ['side_light',    20, 11,  8,  95, 180, 'grounded', false],
  ],
};

// updateCPU: chamado 1x por gameStep. Gerencia a máquina de estados da IA.
// Não age quando em hitstun ou no meio de um ataque (locked).
function updateCPU() {
  if (gameOver) return;
  if (cpu.hitstun > 0) { cpuReactionTimer = 20; return; }
  if (cpu.locked) return;

  cpuActionTimer--;
  const dist       = Math.abs(cpu.x - player.x);
  const playerHurt = player.hitstun > 0 || player.isAirborne || player.knockdown;
  const playerLow  = player.hp / player.maxHP < 0.30;
  const cpuLow     = cpu.hp / cpu.maxHP < 0.25;

  // ── Continua combo em andamento ──────────────────────────────
  if (cpuAIState === 'combo' && cpuComboStep < cpuComboSeq.length) {
    if (cpuActionTimer > 0) return;
    _cpuExecuteComboStep();
    return;
  }

  // ── Continua juggle ───────────────────────────────────────────
  if (cpuAIState === 'juggle') {
    if (!player.isAirborne && player.onGround) {
      cpuAIState = 'idle'; cpuComboStep = 0;
    } else if (!cpu.onGround) {
      if (cpuActionTimer <= 0) {
        cpuActionTimer = 8;
        _cpuStartCombo('juggle');
      }
      return;
    }
  }

  if (cpuActionTimer > 0) return;

  // ── Decide próxima ação ───────────────────────────────────────
  const r = Math.random();

  // Reação: se player está no ar por launcher do CPU, persegue
  if (player.isAirborne && cpu.onGround && dist < 140) {
    // Pula para continuar o juggle
    cpu.vy = cpu.jumpForce;
    cpu.onGround = false;
    cpu.setState('jump', 20);
    cpuAIState = 'juggle';
    cpuActionTimer = 18;
    return;
  }

  // Se player está em hitstun e perto → aproveita para combo
  if (playerHurt && dist < 130 && cpu.onGround) {
    if (r < 0.75) {
      _cpuStartCombo(playerLow ? 'ender' : (r < 0.4 ? 'pressure' : 'punish'));
      return;
    }
  }

  // Gerencia distância
  if (dist > 280) {
    // Longe demais → se aproxima, às vezes dá dash
    const dashChance = r < 0.25;
    if (dashChance) {
      // Simula dash do CPU
      cpu.vx = (player.x > cpu.x ? 1 : -1) * 9;
      cpu.isDashing = true; cpu.dashFrames = 10;
    } else {
      cpu.x += (player.x > cpu.x ? 1 : -1) * cpu.speed * 4;
    }
    cpu.setState('stance');
    cpuAIState = 'approach';
    cpuActionTimer = 14 + Math.floor(Math.random() * 16);

  } else if (dist < 70) {
    // Muito perto → recua ou ataca imediatamente
    if (r < 0.35) {
      cpu.x -= (player.x > cpu.x ? 1 : -1) * cpu.speed * 3;
      cpu.setState('stance');
      cpuAIState = 'retreat';
      cpuActionTimer = 12;
    } else if (r < 0.55) {
      // Ataque rápido de perto
      _cpuStartCombo('pressure');
    } else {
      _cpuStartCombo('basic');
    }

  } else {
    // Range ideal → decide estratégia
    cpuAIState = 'idle';

    if (r < 0.30) {
      // Bloqueia para baitar
      cpu.setState('block', 18 + Math.floor(Math.random() * 14));
      cpuAIState = 'bait';
      cpuActionTimer = 22;
    } else if (r < 0.55) {
      // Combo launcher
      _cpuStartCombo('launcher');
    } else if (r < 0.72) {
      // Combo básico
      _cpuStartCombo('basic');
    } else if (r < 0.84) {
      // Punish (como se lesse o input do player)
      cpuActionTimer = 6; // reage rápido
      _cpuStartCombo('punish');
    } else {
      // Avança
      cpu.x += (player.x > cpu.x ? 1 : -1) * cpu.speed * 2;
      cpu.setState('stance');
      cpuActionTimer = 10 + Math.floor(Math.random() * 12);
    }
  }
}

// Inicia uma sequência de combo pelo nome (ex: 'basic', 'launcher').
// Reseta o passo para 0 e executa o primeiro ataque imediatamente.
function _cpuStartCombo(name) {
  cpuComboSeq  = CPU_COMBOS[name] || CPU_COMBOS.basic;
  cpuComboStep = 0;
  cpuAIState   = 'combo';
  cpuActionTimer = 0; // executa o primeiro passo imediatamente
  _cpuExecuteComboStep();
}

// Executa o próximo passo da sequência de combo do CPU.
// Aplica juggle scaling automaticamente se o player estiver no ar.
// Se o golpe lança o player → troca para estado 'juggle'.
function _cpuExecuteComboStep() {
  if (cpuComboStep >= cpuComboSeq.length) {
    cpuAIState = 'idle';
    cpuComboStep = 0;
    cpuActionTimer = 18 + Math.floor(Math.random() * 20);
    return;
  }

  const [state, lock, dmg, baseForce, range, hitstunMs, reaction, launcher]
    = cpuComboSeq[cpuComboStep];

  const accum  = player.dmgAccum;
  const fscale = Math.max(0.5, accum/100 + accum*accum/20000);

  cpu.setState(state, lock);
  cpu.attackPriority = state.includes('heavy') ? 3
                     : state.startsWith('air') ? 1 : 2;

  if (cpu._inRange(player, range)) {
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

    // Se lançou o player para o ar → troca para estado juggle
    if (reaction === 'airborne' || launcher) {
      cpuAIState = 'juggle';
      cpuComboStep = 0;
      cpuActionTimer = 16;
      return;
    }
  }

  cpuComboStep++;
  // Janela entre hits do combo (simula cancel window)
  cpuActionTimer = 10 + Math.floor(Math.random() * 6);
}



// ── HUD ──────────────────────────────────────────────────────────
// Atualiza os elementos HTML do HUD:
//   updateHUD(): barras de HP (ficam vermelhas abaixo de 25%)
//   updateStateBadge(): mostra o estado atual do player por 900ms
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
    stateBadge.textContent = player.state.toUpperCase().replace(/_/g,' ');
    stateBadge.classList.remove('hidden');
    clearTimeout(badgeTimeout);
    badgeTimeout = setTimeout(() => stateBadge.classList.add('hidden'), 900);
  }
}

// ── Timer ────────────────────────────────────────────────────────
// Timer baseado em tempo real (ms), não em frames.
// timerLastMs rastreia quando foi o último decremento — garante
// que 1 segundo de jogo = 1 segundo real em qualquer framerate.
let timeLeft    = TIMER_SEC;
let timerLastMs = 0;   // timestamp do último decremento do timer

// ── KO Overlay ───────────────────────────────────────────────────
// Overlay que aparece ao fim da luta com dois botões:
//   ▶ REVANCHE: reinicia com os mesmos personagens (_lastSelection)
//   ⚔ TROCAR: abre a charselect para escolher novos personagens
// Controles mobile ficam com pointer-events:none durante o KO
// para evitar que botões do jogo sejam tocados acidentalmente.
let gameOver = false;

const koOverlay = document.createElement('div');
koOverlay.id = 'ko-overlay';
koOverlay.innerHTML = `
  <div id="ko-text">K.O.</div>
  <div id="ko-sub">PLAYER WINS!</div>
  <div id="ko-buttons">
    <button class="ko-btn" id="ko-rematch">▶ REVANCHE</button>
    <button class="ko-btn" id="ko-charsel">⚔ TROCAR PERSONAGEM</button>
  </div>
`;
document.body.appendChild(koOverlay);

function _closeKO() {
  koOverlay.classList.remove('visible');
  const mob = document.getElementById('mobile-controls');
  if (mob) mob.style.pointerEvents = 'all';
}
document.getElementById('ko-rematch').addEventListener('click', () => {
  _closeKO();
  applySelection(_lastSelection);
});
document.getElementById('ko-charsel').addEventListener('click', () => {
  _closeKO();
  CharSelect.show(sel => { _lastSelection = sel; applySelection(sel); }, false);
});

// Guarda a última seleção para revanche
let _lastSelection = null;

function showKO(winner) {
  if (gameOver) return;
  gameOver = true;
  document.getElementById('ko-sub').textContent = winner + ' WINS!';
  koOverlay.classList.add('visible');
  // Esconde controles mobile durante o KO para não interferir nos botões
  const mob = document.getElementById('mobile-controls');
  if (mob) mob.style.pointerEvents = 'none';
}

// ── Apply selection ───────────────────────────────────────────────
// Chamado pela charselect ao confirmar personagens.
// Recarrega sprites, reseta posições, HP, combate e timer.
// makeSprites() monta o mapa de sprites usando o folder do personagem.
function applySelection(sel) {
  _lastSelection = sel;
  function makeSprites(folder, walkFrames) {
    // Cada ataque tem seu sprite dedicado com nome exato.
    // O _getCurrentSprite() no player.js já tem fallback caso o arquivo não exista.
    const map = {
      idle:    folder+'/idle.png',
      stance:  folder+'/stance.png',
      punch:   folder+'/punch.png',
      kick:    folder+'/kick.png',
      jump:    folder+'/jump.png',
      block:   folder+'/idle.png',
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
    return map;
  }

  player.charId = sel.player.id === 'metz' ? 1 : 2;
  cpu.charId    = sel.cpu.id    === 'metz' ? 1 : 2;

  player.loadSprites(makeSprites(sel.player.folder, sel.player.walkFrames));
  cpu.loadSprites(makeSprites(sel.cpu.folder, sel.cpu.walkFrames));

  document.querySelector('#player-hud .hud-name').textContent = sel.player.name;

  const resetPlayer = (p, px, py) => {
    p.hp = p.maxHP; p.x = px; p.y = groundY;
    p.setState('idle'); p.vy = 0; p.onGround = true;
    p.resetCombat();
  };
  resetPlayer(player, 220);
  resetPlayer(cpu, 680);
  cpuAIState = 'idle'; cpuComboStep = 0; cpuComboSeq = []; cpuActionTimer = 0;
  cpu.facing = -1;

  timeLeft = TIMER_SEC; timerLastMs = 0; gameOver = false;
  hitTexts.length = 0; flashAlpha = 0;
  updateHUD();
}

// ── Main Loop ────────────────────────────────────────────────────
// ── Game loop com fixed timestep ─────────────────────────────────
// Física roda sempre a 60 steps/segundo em qualquer dispositivo.
// - 30fps mobile: 2 steps por frame  (2 × 16.67ms = 33ms ✓)
// - 60fps desktop: 1 step por frame  (1 × 16.67ms = 16.67ms ✓)
// - 120hz desktop: 1 step por frame  (acumulador drena gradual ✓)
// Timer usa tempo real em ms — nunca afetado pelo framerate.
let lastTime = 0;
const FIXED_DT = 1000 / 60; // 16.67ms por step
let accumulator = 0;

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  if (lastTime === 0) { lastTime = timestamp; return; }
  const elapsed = Math.min(timestamp - lastTime, 100); // cap 100ms (tab em bg)
  lastTime = timestamp;
  accumulator += elapsed;

  // Máximo 3 steps por frame — evita spiral of death em lag spikes
  // mas garante que 30fps rode 2 steps (cobrindo os 33ms do frame)
  let steps = 0;
  while (accumulator >= FIXED_DT && steps < 3) {
    accumulator -= FIXED_DT;
    gameStep();
    steps++;
  }

  // ── RENDER + checagens únicas por frame ───────────────────────
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

  cpu.draw(ctx);
  player.draw(ctx);
  drawHitTexts();
  drawComboTexts();
  drawFlash();

  // Timer baseado em tempo real (ms) — funciona igual em qualquer framerate
  if (!gameOver) {
    if (timerLastMs === 0) timerLastMs = lastTime;
    if (lastTime - timerLastMs >= 1000) {
      timerLastMs += 1000; // avança exatamente 1s (sem drift)
      timeLeft = Math.max(0, timeLeft - 1);
      timerEl.textContent = String(timeLeft).padStart(2, '0');
      if (timeLeft <= 0) showKO(player.hp >= cpu.hp ? 'PLAYER' : 'CPU');
    }
    if (player.hp <= 0) showKO('CPU');
    if (cpu.hp    <= 0) showKO('PLAYER');
  }

  updateHUD();
  updateStateBadge();
}

// gameStep: física, input e AI — roda a 60 steps/segundo fixos.
// NÃO contém timer nem checagem de HP (essas ficam no render loop,
// 1x por frame) para não acelerar em telas de alta frequência.
function gameStep() {
  if (!gameOver) {
    player.update(cpu);
    updateCPU();
    cpu.update(player);
  }
  Input.flush();
}

// ── Start ────────────────────────────────────────────────────────
// gameOver começa true para o loop não processar input antes da seleção.
// Fluxo de inicialização: Intro → CharSelect → applySelection → Luta
gameOver = true;
updateHUD();
requestAnimationFrame(gameLoop);

// Fluxo: Intro → CharSelect → Luta
Intro.show(() => {
  CharSelect.show(applySelection, false);
});
