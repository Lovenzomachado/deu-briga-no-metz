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

  // ── Terra — Pesados ───────────────────────────────────────────────
  // PADRÃO: neutral_heavy e side_heavy são CORPO A CORPO (alcance ~115px).
  // O ÚNICO golpe com magia é o down_heavy (padrão Fezo, área ampla).
  // Valores padrão aqui; movesets por personagem herdam deste base.

  neutral_heavy: {
    totalFrames: 30,
    // Soco direto corpo a corpo — 1 círculo frontal, sem magia
    frames: {
      8:  { hitboxes: [ createCircle(65, -100, 28) ] },
      9:  { hitboxes: [ createCircle(72, -98,  30) ] },
      10: { hitboxes: [ createCircle(70, -95,  28) ] },
    }
  },

  side_heavy: {
    totalFrames: 32,
    // Gancho/chute lateral corpo a corpo — alcance curto, sem raio
    frames: {
      8:  { hitboxes: [ createCircle(70, -90, 26), createCircle(90, -85, 22) ] },
      9:  { hitboxes: [ createCircle(85, -88, 28), createCircle(105,-82, 20) ] },
      10: { hitboxes: [ createCircle(90, -86, 26) ] },
    }
  },

  down_heavy: {
    // ── ÚNICO ESPECIAL COM MAGIA (padrão Fezo p/ todos) ──────────
    // 3 fases: load (frames 1-10 sem hitbox) + golpe + fx (frames 11-14).
    // Área ampla rente ao chão, ambos os lados (~250px).
    totalFrames: 38,
    frames: {
      11: { hitboxes: [
              createCircle(60,  -30, 28),
              createCircle(110, -22, 30),
              createCircle(160, -18, 26),
            ] },
      12: { hitboxes: [
              createCircle(70,  -28, 30),
              createCircle(130, -20, 32),
              createCircle(200, -15, 28),
              createCircle(250, -12, 22),
              // Lado oposto (magia abre para ambos os lados)
              createCircle(-60, -30, 26),
              createCircle(-110,-22, 26),
            ] },
      13: { hitboxes: [
              createCircle(80,  -26, 28),
              createCircle(150, -18, 30),
              createCircle(230, -12, 26),
              createCircle(-70, -28, 24),
              createCircle(-130,-20, 24),
            ] },
      14: { hitboxes: [
              createCircle(100, -24, 26),
              createCircle(180, -16, 24),
              createCircle(-80, -26, 22),
              createCircle(-150,-18, 22),
            ] },
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
// PADRÃO: heavies neutro/lateral corpo a corpo; down_heavy usa magia padrão Fezo (herda do base).
const MOVESET_HENRIQUE = {
  ...BASE_MOVESET,

  // Neutro corpo a corpo: soco direto forte
  neutral_heavy: {
    totalFrames: 30,
    frames: {
      8:  { hitboxes: [ createCircle(70, -105, 30) ] },
      9:  { hitboxes: [ createCircle(80, -102, 34) ] },
      10: { hitboxes: [ createCircle(82, -100, 32) ] },
      11: { hitboxes: [ createCircle(78, -98,  28) ] },
    }
  },

  // Lateral corpo a corpo: gancho largo
  side_heavy: {
    totalFrames: 32,
    frames: {
      8:  { hitboxes: [ createCircle(65, -95, 28), createCircle(88, -88, 22) ] },
      9:  { hitboxes: [ createCircle(80, -92, 30), createCircle(105,-84, 24) ] },
      10: { hitboxes: [ createCircle(95, -90, 28) ] },
    }
  },

  // down_heavy: NÃO sobrescreve — usa o padrão Fezo do BASE_MOVESET (única magia).
};

// Fezo (charId = 2)
// PADRÃO NOVO — só down_heavy tem magia:
//   neutral_light:     jab direto curto (alcance ~60px)
//   side_light:        soco lateral estendido (alcance ~90px)
//   down_light:        chute lateral com perna alta (alcance ~100px)
//   neutral_heavy:     CORPO A CORPO — soco direto curto (~110px, sem esfera)
//   side_heavy:        CORPO A CORPO — gancho lateral curto (~115px, sem raio)
//   down_heavy:        ÚNICA MAGIA — área ampla no chão (~250px, ambos lados)
//   air_neutral_light: joelhos levantados no ar (próximo)
//   air_side_light:    chute alto voador (alcance ~90px)
//   air_down_light:    split aéreo (hitbox horizontal ampla)
//   recovery:          CORPO A CORPO — braços p/ cima + impulso (sem asa mágica)
//   ground_pound:      CORPO A CORPO — despenca de cima p/ baixo (sem raios)
const MOVESET_FEZO = {
  ...BASE_MOVESET,

  // ── Neutro corpo a corpo ──────────────────────────────────────
  // Sem esfera: soco direto curto, mesmo alcance do Henrique
  neutral_heavy: {
    totalFrames: 30,
    frames: {
      8:  { hitboxes: [ createCircle(70, -105, 30) ] },
      9:  { hitboxes: [ createCircle(80, -102, 34) ] },
      10: { hitboxes: [ createCircle(82, -100, 32) ] },
      11: { hitboxes: [ createCircle(78, -98,  28) ] },
    }
  },

  // ── Lateral corpo a corpo ─────────────────────────────────────
  // Sem raio: gancho curto, alcance 115px
  side_heavy: {
    totalFrames: 32,
    frames: {
      8:  { hitboxes: [ createCircle(65, -95, 28), createCircle(88, -88, 22) ] },
      9:  { hitboxes: [ createCircle(80, -92, 30), createCircle(105,-84, 24) ] },
      10: { hitboxes: [ createCircle(95, -90, 28) ] },
    }
  },

  // ── ÚNICA MAGIA: down_heavy (referência padrão p/ os 23) ────
  // down_heavy_load.png: agachado carregando (sem hitbox)
  // down_heavy.png: golpe agachado soltando p/ os lados
  // down_heavy_fx.png: magia se espalhando no chão (elemento separado)
  // range: ~250px em ambas as direções, hitbox baixa (perto do chão)
  down_heavy: {
    totalFrames: 38,
    // Frames 1-10: carregamento (sem hitbox — sprite down_heavy_load)
    // Frames 11+: liberação da magia
    frames: {
      11: { hitboxes: [
              createCircle(60,  -30, 28),
              createCircle(110, -22, 30),
              createCircle(160, -18, 26),
            ] },
      12: { hitboxes: [
              createCircle(70,  -28, 30),
              createCircle(130, -20, 32),
              createCircle(200, -15, 28),
              createCircle(250, -12, 22),
              // Lado oposto (magia abre para ambos os lados)
              createCircle(-60, -30, 26),
              createCircle(-110,-22, 26),
            ] },
      13: { hitboxes: [
              createCircle(80,  -26, 28),
              createCircle(150, -18, 30),
              createCircle(230, -12, 26),
              createCircle(-70, -28, 24),
              createCircle(-130,-20, 24),
            ] },
      14: { hitboxes: [
              createCircle(100, -24, 26),
              createCircle(180, -16, 24),
              createCircle(-80, -26, 22),
              createCircle(-150,-18, 22),
            ] },
    }
  },
};
// Mapa charId → moveset (hitbox idêntica p/ 1 e 2 agora; diferença é só visual)
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
