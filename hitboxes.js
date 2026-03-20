// ═══════════════════════════════════════════════════════════════════
// HITBOXES.JS — Sistema de hitbox/hurtbox por frame
// ═══════════════════════════════════════════════════════════════════
//
// Cada ataque define quais frames têm hitbox ativa e onde.
// Coordenadas relativas ao personagem:
//   x positivo = à frente (facing direction)
//   y negativo = acima do pé (y=0 é o chão)
//
// Hurtbox: 3 círculos fixos (cabeça, tronco, pernas)
// Hitbox:  círculos ativos apenas nos frames de ataque especificados
//
// Uso:
//   createCircle(x, y, r)  → cria um círculo relativo ao personagem
//   getWorldHitboxes(p)    → converte para coordenadas do mundo (com flip)
//   getWorldHurtboxes(p)   → idem para hurtboxes
//   circleVsCircle(a, b)   → colisão entre dois círculos
//   drawDebugHitboxes(ctx, p) → visualiza hitboxes (vermelho) e hurtboxes (verde)

// ── Helpers ───────────────────────────────────────────────────────
function createCircle(x, y, r) {
  return { x, y, r };
}

// Converte lista de círculos relativos para coordenadas do mundo
// respeitando o facing do personagem (espelha x se facing === -1)
function getWorldCircles(player, circles) {
  return circles.map(c => ({
    x: player.x + (player.facing === 1 ? c.x : -c.x),
    y: player.y + c.y,
    r: c.r,
  }));
}

function getWorldHitboxes(player) {
  return getWorldCircles(player, player.activeHitboxes);
}

function getWorldHurtboxes(player) {
  return getWorldCircles(player, player.hurtboxes);
}

// Colisão círculo vs círculo
function circleVsCircle(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return (dx * dx + dy * dy) < (a.r + b.r) * (a.r + b.r);
}

// Testa se QUALQUER hitbox de 'attacker' acerta QUALQUER hurtbox de 'target'
function hitboxHitsTarget(attacker, target) {
  const hits = getWorldHitboxes(attacker);
  const hurts = getWorldHurtboxes(target);
  for (const h of hits) {
    for (const hb of hurts) {
      if (circleVsCircle(h, hb)) return true;
    }
  }
  return false;
}

// ── Debug visual ──────────────────────────────────────────────────
// Ativa com DEBUG_HITBOXES = true no game.js
function drawDebugHitboxes(ctx, player) {
  // Hurtboxes (verde)
  ctx.save();
  ctx.strokeStyle = 'rgba(0,255,80,0.7)';
  ctx.lineWidth = 1.5;
  getWorldHurtboxes(player).forEach(c => {
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.stroke();
  });

  // Hitboxes ativas (vermelho)
  ctx.strokeStyle = 'rgba(255,30,30,0.9)';
  ctx.lineWidth = 2;
  getWorldHitboxes(player).forEach(c => {
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.stroke();
    // Cruz no centro
    ctx.beginPath();
    ctx.moveTo(c.x - 4, c.y); ctx.lineTo(c.x + 4, c.y);
    ctx.moveTo(c.x, c.y - 4); ctx.lineTo(c.x, c.y + 4);
    ctx.stroke();
  });
  ctx.restore();
}

// ══════════════════════════════════════════════════════════════════
// MOVESET BASE — compartilhado por todos os personagens
// Heavies (neutral_heavy, side_heavy, down_heavy) são sobrescritos
// por cada personagem no seu moveset próprio (ver MOVESETS abaixo).
// ══════════════════════════════════════════════════════════════════
//
// Estrutura de cada ataque:
//   totalFrames : duração total da animação em frames de jogo
//   frames      : { [nFrame]: { hitboxes: [...] } }
//                 apenas os frames com hitbox ativa precisam ser listados
//
// Coordenadas típicas (personagem de 160×200px, y=0 no chão):
//   Cabeça:   y ≈ -180
//   Tronco:   y ≈ -120
//   Cintura:  y ≈ -80
//   Joelhos:  y ≈ -40
//   x: quanto mais longe da origem, mais à frente do personagem

const BASE_MOVESET = {

  // ── Terra — Leves ────────────────────────────────────────────────

  neutral_light: {
    totalFrames: 18,
    // Jab rápido: hitbox pequena e próxima, frames 4-6
    frames: {
      4: { hitboxes: [ createCircle(55, -100, 18) ] },
      5: { hitboxes: [ createCircle(60, -100, 20) ] },
      6: { hitboxes: [ createCircle(58, -98,  18) ] },
    }
  },

  side_light: {
    totalFrames: 20,
    // Soco lateral: hitbox média, avança um pouco, frames 5-7
    frames: {
      5: { hitboxes: [ createCircle(60, -95, 20), createCircle(78, -90, 16) ] },
      6: { hitboxes: [ createCircle(72, -88, 22), createCircle(88, -85, 16) ] },
      7: { hitboxes: [ createCircle(75, -86, 20) ] },
    }
  },

  down_light: {
    totalFrames: 22,
    // Uppercut/launcher: hitbox acima, lança para cima, frames 5-7
    frames: {
      5: { hitboxes: [ createCircle(40, -110, 22) ] },
      6: { hitboxes: [ createCircle(45, -125, 24) ] },
      7: { hitboxes: [ createCircle(42, -120, 20) ] },
    }
  },

  // ── Terra — Pesados (Sigs) ────────────────────────────────────────
  // Estes são sobrescritos por cada personagem. Valores padrão aqui.

  neutral_heavy: {
    totalFrames: 30,
    frames: {
      8:  { hitboxes: [ createCircle(65, -100, 28) ] },
      9:  { hitboxes: [ createCircle(72, -98,  30) ] },
      10: { hitboxes: [ createCircle(70, -95,  28) ] },
    }
  },

  side_heavy: {
    totalFrames: 32,
    frames: {
      8:  { hitboxes: [ createCircle(70, -90, 26), createCircle(90, -85, 22) ] },
      9:  { hitboxes: [ createCircle(85, -88, 28), createCircle(105,-82, 20) ] },
      10: { hitboxes: [ createCircle(90, -86, 26) ] },
    }
  },

  down_heavy: {
    totalFrames: 34,
    frames: {
      9:  { hitboxes: [ createCircle(50, -80, 28), createCircle(60, -55, 24) ] },
      10: { hitboxes: [ createCircle(55, -75, 30), createCircle(65, -50, 26) ] },
      11: { hitboxes: [ createCircle(52, -72, 26) ] },
    }
  },

  // ── Aéreos — Leves ───────────────────────────────────────────────

  air_neutral_light: {
    totalFrames: 20,
    frames: {
      4: { hitboxes: [ createCircle(50, -100, 18) ] },
      5: { hitboxes: [ createCircle(55, -98,  20) ] },
      6: { hitboxes: [ createCircle(52, -96,  18) ] },
    }
  },

  air_side_light: {
    totalFrames: 20,
    frames: {
      4: { hitboxes: [ createCircle(60, -90, 20), createCircle(78, -85, 16) ] },
      5: { hitboxes: [ createCircle(72, -88, 22) ] },
      6: { hitboxes: [ createCircle(68, -86, 18) ] },
    }
  },

  air_down_light: {
    totalFrames: 22,
    frames: {
      5: { hitboxes: [ createCircle(30, -60, 20), createCircle(30, -40, 22) ] },
      6: { hitboxes: [ createCircle(28, -55, 22), createCircle(28, -35, 24) ] },
      7: { hitboxes: [ createCircle(26, -50, 20) ] },
    }
  },

  // ── Aéreos — Pesados ──────────────────────────────────────────────

  recovery: {
    totalFrames: 30,
    // Recovery: hitbox grande acima, impulso para cima
    frames: {
      6: { hitboxes: [ createCircle(40, -130, 28), createCircle(50, -110, 24) ] },
      7: { hitboxes: [ createCircle(50, -125, 30), createCircle(60, -105, 26) ] },
      8: { hitboxes: [ createCircle(55, -120, 26) ] },
    }
  },

  ground_pound: {
    totalFrames: 32,
    // Ground pound: hitbox abaixo, área grande de impacto
    frames: {
      10: { hitboxes: [ createCircle(20, -30, 30), createCircle(-10, -20, 24) ] },
      11: { hitboxes: [ createCircle(15, -25, 34), createCircle(-15, -15, 28) ] },
      12: { hitboxes: [ createCircle(10, -20, 30) ] },
    }
  },
};

// ══════════════════════════════════════════════════════════════════
// MOVESETS POR PERSONAGEM
// Começa com BASE_MOVESET e sobrescreve os Sigs (heavies terrestres)
// ══════════════════════════════════════════════════════════════════

// Henrique (charId = 1)
const MOVESET_HENRIQUE = {
  ...BASE_MOVESET,

  // Sig neutro: soco direto forte
  neutral_heavy: {
    totalFrames: 30,
    frames: {
      8:  { hitboxes: [ createCircle(70, -105, 30) ] },
      9:  { hitboxes: [ createCircle(80, -102, 34) ] },
      10: { hitboxes: [ createCircle(82, -100, 32) ] },
      11: { hitboxes: [ createCircle(78, -98,  28) ] },
    }
  },

  // Sig lateral: gancho largo
  side_heavy: {
    totalFrames: 32,
    frames: {
      8:  { hitboxes: [ createCircle(65, -95, 28), createCircle(88, -88, 22) ] },
      9:  { hitboxes: [ createCircle(80, -92, 30), createCircle(105,-84, 24) ] },
      10: { hitboxes: [ createCircle(95, -90, 28) ] },
    }
  },

  // Sig baixo: golpe no chão com área
  down_heavy: {
    totalFrames: 34,
    frames: {
      9:  { hitboxes: [ createCircle(45, -45, 32), createCircle(70, -30, 26) ] },
      10: { hitboxes: [ createCircle(50, -40, 34), createCircle(75, -25, 28) ] },
      11: { hitboxes: [ createCircle(55, -35, 30) ] },
    }
  },
};

// Fezo (charId = 2)
const MOVESET_FEZO = {
  ...BASE_MOVESET,

  // Sig neutro: chute giratório
  neutral_heavy: {
    totalFrames: 30,
    frames: {
      7:  { hitboxes: [ createCircle(55, -110, 26), createCircle(70, -90, 22) ] },
      8:  { hitboxes: [ createCircle(65, -105, 30), createCircle(80, -85, 24) ] },
      9:  { hitboxes: [ createCircle(70, -100, 28) ] },
    }
  },

  // Sig lateral: chute voador com dois hits
  side_heavy: {
    totalFrames: 32,
    frames: {
      7:  { hitboxes: [ createCircle(60, -95, 24) ] },
      8:  { hitboxes: [ createCircle(80, -92, 28), createCircle(100,-88, 22) ] },
      9:  { hitboxes: [ createCircle(95, -90, 26), createCircle(115,-85, 20) ] },
      10: { hitboxes: [ createCircle(100,-88, 24) ] },
    }
  },

  // Sig baixo: rasteira
  down_heavy: {
    totalFrames: 34,
    frames: {
      8:  { hitboxes: [ createCircle(50, -30, 26), createCircle(75, -20, 22) ] },
      9:  { hitboxes: [ createCircle(60, -28, 28), createCircle(88, -18, 24) ] },
      10: { hitboxes: [ createCircle(65, -25, 26) ] },
    }
  },
};

// Mapa charId → moveset
const MOVESETS = {
  1: MOVESET_HENRIQUE,
  2: MOVESET_FEZO,
};

// ── Hurtbox padrão (3 círculos, relativa ao personagem 160×200) ───
// Valores negativos = acima do pé (origem y = chão)
const DEFAULT_HURTBOXES = [
  createCircle(0, -175, 22),  // cabeça
  createCircle(0, -120, 30),  // tronco
  createCircle(0,  -50, 24),  // pernas/quadril
];
