// ─── Player — Brawlhalla-accurate Combat System ──────────────────
//
// 11 ataques por personagem (sem Aerial Side Heavy):
//   TERRA:  neutral_light, side_light, down_light
//           neutral_heavy (sig), side_heavy (sig), down_heavy (sig)
//   AR:     air_neutral_light, air_side_light, air_down_light
//           recovery (neutral heavy aéreo), ground_pound (down heavy aéreo)
//
// Força Variável: escala com dano acumulado do alvo
//   force = baseForce * (dmg/100 + dmg²/20000)
// Hitstun: estendido se o alvo se mover rápido o suficiente
// Prioridade: Heavies (Sigs) > Lights > Aerials
// Charge: segurar K por ≥18 frames = ataque carregado (mais força)
// Clash: mesma prioridade se atingirem ao mesmo tempo = afasta ambos

class Player {
  constructor(config) {
    this.x        = config.x        ?? 200;
    this.y        = config.y        ?? 0;
    this.groundY  = config.groundY  ?? 420;
    this.width    = config.width    ?? 96;
    this.height   = config.height   ?? 128;
    this.facing   = config.facing   ?? 1;
    this.isPlayer = config.isPlayer ?? true;
    this.charId   = config.charId   ?? 1;

    this.maxHP = 200;
    this.hp    = this.maxHP;
    this.dmgAccum = 0;   // dano acumulado — aumenta a força variável
    this.speed = config.speed ?? 1.2;

    // Física
    this.vy        = 0;
    this.vx        = 0;   // velocidade horizontal (knockback)
    this.gravity   = 0.52;
    this.jumpForce = -14;
    this.onGround  = true;

    // State machine
    this.state      = 'idle';
    this.stateTimer = 0;
    this.locked     = false;

    // Animação
    this.frame      = 0;
    this.frameTimer = 0;
    this.sprites    = {};

    // Combate
    this.hitstun      = 0;
    this.hitFlash     = 0;
    this.invincible   = 0;
    this.attackPriority = 0;   // prioridade do ataque atual em andamento

    // Heavy charge
    this.heavyHeld    = 0;
    this.heavyCharged = false;

    // Especial / Sig
    this.specialUsed  = false;
    this.healPerFrame = 0;

    // Callbacks
    this.onHit   = null;
    this.onHeal  = null;
    this.onClash = null;
  }

  // ── Sprites ───────────────────────────────────────────────────────
  loadSprites(map) {
    this.sprites = {};
    for (const [k, v] of Object.entries(map)) {
      if (Array.isArray(v)) {
        this.sprites[k] = v.map(s => { const i = new Image(); i.src = s; return i; });
      } else {
        const i = new Image(); i.src = v; this.sprites[k] = i;
      }
    }
  }

  // ── Estado ────────────────────────────────────────────────────────
  setState(name, duration = 0) {
    if (this.state === name && duration === 0) return;
    if (this.state === 'special' && name !== 'special') this.healPerFrame = 0;
    this.state = name; this.stateTimer = duration;
    this.frame = 0; this.frameTimer = 0;
    this.locked = duration > 0;
  }

  // ── Sprite atual com fallback ──────────────────────────────────────
  _getCurrentSprite() {
    // Mapeia estado → sprite mais próximo disponível
    const FB = {
      neutral_light:    'ground_light',
      side_light:       'ground_light',
      down_light:       'down_attack',
      neutral_heavy:    'ground_heavy',
      side_heavy:       'ground_heavy',
      down_heavy:       'down_attack',
      air_neutral_light:'air_light',
      air_side_light:   'air_light',
      air_down_light:   'down_air',
      recovery:         'anti_air',
      ground_pound:     'down_air',
      hitstun:          'hitstun',
      crouch:           'idle',
    };
    const tryGet = (k) => {
      const e = this.sprites[k]; if (!e) return null;
      if (Array.isArray(e)) {
        const img = e[this.frame % e.length];
        if (img?.complete && img.naturalWidth > 0) return img;
        const i0 = e[0]; return (i0?.complete && i0.naturalWidth > 0) ? i0 : null;
      }
      return (e.complete && e.naturalWidth > 0) ? e : null;
    };
    const fb = FB[this.state];
    return tryGet(this.state) || (fb ? tryGet(fb) : null)
        || tryGet('stance') || tryGet('idle') || null;
  }

  // ── Update ────────────────────────────────────────────────────────
  update(opponent) {
    this.frameTimer++;
    const fps = ANIM_FPS[this.state] || 8;
    if (this.frameTimer >= 60 / fps) { this.frame++; this.frameTimer = 0; }

    if (this.invincible > 0) this.invincible--;
    if (this.hitFlash   > 0) this.hitFlash--;

    // Hitstun — estendido por velocidade horizontal (>2 px/frame = movendo rápido)
    if (this.hitstun > 0) {
      if (Math.abs(this.vx) > 2) this.hitstun = Math.max(this.hitstun - 0.4, 0);
      else                       this.hitstun--;
      if (this.hitstun <= 0 && this.state === 'hitstun') {
        this.setState('idle'); this.locked = false;
      }
    }

    // Decai velocidade horizontal de knockback
    this.vx *= 0.82;
    if (!this.locked || this.state === 'hitstun') this.x += this.vx;

    if (this.locked && this.state !== 'hitstun') {
      this.stateTimer--;
      if (this.stateTimer <= 0) {
        this.locked = false;
        this.setState(this.onGround ? 'idle' : 'jump');
        this.attackPriority = 0;
      }
    }

    if (this.state === 'special' && this.healPerFrame > 0) {
      this.hp = Math.min(this.maxHP, this.hp + this.healPerFrame);
      if (this.onHeal) this.onHeal();
    }

    if (this.isPlayer && this.hitstun <= 0) this._handleInput(opponent);

    // Física vertical
    if (!this.onGround) {
      this.vy += this.gravity;
      this.y  += this.vy;
      if (this.y >= this.groundY) {
        this.y = this.groundY; this.vy = 0; this.onGround = true;
        if (!this.locked && this.state !== 'hitstun') this.setState('idle');
      }
    }

    if (opponent && !this.locked) this.facing = opponent.x > this.x ? 1 : -1;
    this.x = Math.max(50, Math.min(900 - 50, this.x));
  }

  // ── Input ─────────────────────────────────────────────────────────
  _handleInput(opponent) {
    const down  = Input.isHeld('arrowdown') || Input.isHeld('s');
    const up    = Input.isHeld('arrowup')   || Input.isHeld('w');
    const left  = Input.isHeld('arrowleft') || Input.isHeld('a');
    const right = Input.isHeld('arrowright')|| Input.isHeld('d');
    const side  = left || right;
    const pressJ = Input.wasPressed('j');
    const pressK = Input.wasPressed('k');
    const holdK  = Input.isHeld('k');
    const relK   = Input.wasReleased('k');

    // Movimento lateral — sempre disponível (inclusive no ar)
    if (!this.locked) {
      if (left)  this.x -= this.speed;
      if (right) this.x += this.speed;
    }

    // ── Heavy charge ─────────────────────────────────────────────
    if (holdK && !this.locked) {
      this.heavyHeld++;
      if (this.heavyHeld >= 18) this.heavyCharged = true;
    } else if (!holdK) {
      this.heavyHeld = 0;
    }

    // ── Especial/Signature = Down+J no chão ─────────────────────
    // (Signatures são os ground heavies únicos de cada personagem)
    if (!this.specialUsed && pressJ && down && this.onGround && !this.locked) {
      this._activateSpecial(opponent);
      return;
    }

    // ══ ATAQUES AÉREOS ════════════════════════════════════════════
    // Sem Side Air Heavy (igual Brawlhalla)
    if (!this.onGround && !this.locked) {

      // J leve no ar
      if (pressJ) {
        if (down)      this._doAttack('air_down_light',   22, 10, 110, opponent, PRIORITY.LIGHT);
        else if (side) this._doAttack('air_side_light',   20,  9,  95, opponent, PRIORITY.LIGHT);
        else           this._doAttack('air_neutral_light',20,  9,  95, opponent, PRIORITY.LIGHT);
        return;
      }

      // K pesado no ar — apenas Neutral (Recovery) e Down (Ground Pound)
      // Não existe Side Air Heavy
      if (relK && this.heavyCharged) {
        const charged = true;
        if (down) this._doAttack('ground_pound', 36, 22, 115, opponent, PRIORITY.AERIAL, true,  charged);
        else      this._doAttack('recovery',     34, 18, 105, opponent, PRIORITY.AERIAL, false, charged);
        this.heavyCharged = false; this.heavyHeld = 0;
        return;
      }
      if (pressK) {
        if (down) this._doAttack('ground_pound', 32, 20, 115, opponent, PRIORITY.AERIAL, true);
        else      this._doAttack('recovery',     30, 16, 105, opponent, PRIORITY.AERIAL, false);
        return;
      }
    }

    // ══ ATAQUES TERRESTRES ════════════════════════════════════════
    if (this.onGround && !this.locked) {

      // J leve no chão
      if (pressJ) {
        // Neutro (cima ou sem direção = neutro)
        if (up || (!down && !side))
                       this._doAttack('neutral_light', 18, 10,  90, opponent, PRIORITY.LIGHT);
        else if (side) this._doAttack('side_light',    20, 11,  95, opponent, PRIORITY.LIGHT);
        else           this._doAttack('down_light',    22, 12, 100, opponent, PRIORITY.LIGHT);
        return;
      }

      // K pesado no chão — são as SIGNATURES (únicas por personagem)
      // Suporta charge para mais força
      if (relK && this.heavyCharged) {
        const charged = true;
        if (side) this._doAttack('side_heavy',    36, 24, 115, opponent, PRIORITY.HEAVY, false, charged);
        else if (down) this._doAttack('down_heavy',38, 26, 115, opponent, PRIORITY.HEAVY, true,  charged);
        else           this._doAttack('neutral_heavy',34,22,110, opponent, PRIORITY.HEAVY, false, charged);
        this.heavyCharged = false; this.heavyHeld = 0;
        return;
      }
      if (pressK) {
        if (side)      this._doAttack('side_heavy',    32, 20, 115, opponent, PRIORITY.HEAVY);
        else if (down) this._doAttack('down_heavy',    34, 22, 115, opponent, PRIORITY.HEAVY, true);
        else           this._doAttack('neutral_heavy', 30, 18, 110, opponent, PRIORITY.HEAVY);
        return;
      }
    }

    // ── Block ─────────────────────────────────────────────────────
    if (Input.isHeld('l') && this.onGround && !this.locked) {
      if (this.state !== 'block') this.setState('block');
      return;
    } else if (this.state === 'block' && !Input.isHeld('l')) {
      this.setState('idle');
    }

    // ── Pular ────────────────────────────────────────────────────
    if (Input.wasPressed(' ') && this.onGround && !this.locked) {
      this.vy = this.jumpForce; this.onGround = false;
      this.setState('jump', 30); return;
    }

    // ── Idle / walk / crouch ─────────────────────────────────────
    if (!this.locked && this.onGround) {
      if (down)       { if (this.state !== 'crouch') this.setState('crouch'); }
      else if (side)  this.setState(this.sprites['walk'] ? 'walk' : 'stance');
      else            this.setState('idle');
    }
  }

  // ── Executa ataque com verificação de prioridade e clash ──────────
  // charged: força variável aumentada (×1.35)
  _doAttack(stateName, lockFrames, baseDmg, range, opponent,
            priority = PRIORITY.LIGHT, launcher = false, charged = false) {

    this.setState(stateName, lockFrames);
    this.attackPriority = priority;

    if (!opponent || !this._inRange(opponent, range)) return;

    // Verifica CLASH: oponente também atacando com mesma prioridade
    if (opponent.locked && opponent.attackPriority === priority) {
      this._doClash(opponent);
      return;
    }

    // Verifica PRIORIDADE: oponente atacando com prioridade maior → nossa perde
    if (opponent.locked && opponent.attackPriority > priority) return;

    // Calcula dano e força variável
    const chargeMulti = charged ? 1.35 : 1.0;
    const dmg = Math.round(baseDmg * chargeMulti);

    // Força variável: escala com dano acumulado do alvo
    //   f = base * (accum/100 + accum²/20000)
    const accum = opponent.dmgAccum;
    const forceScale = Math.max(0.5, accum / 100 + (accum * accum) / 20000);
    const baseForce  = ATTACK_BASE_FORCE[stateName] || 12;
    const knockback  = Math.round(baseForce * forceScale * chargeMulti);

    const hitstunMs  = HITSTUN_MS[stateName] || 180;
    const hitstunF   = Math.round(hitstunMs / (1000 / 60));

    opponent.takeHit(dmg, this, hitstunF, knockback, launcher);
  }

  // ── Clash: afasta ambos ───────────────────────────────────────────
  _doClash(opponent) {
    const dir = this.x < opponent.x ? -1 : 1;
    this.vx     =  dir * 5;
    opponent.vx = -dir * 5;
    this.setState('idle'); this.locked = false; this.attackPriority = 0;
    opponent.setState('idle'); opponent.locked = false; opponent.attackPriority = 0;
    if (this.onClash) this.onClash();
  }

  // ── Especial / Signature único ────────────────────────────────────
  _activateSpecial(opponent) {
    this.specialUsed = true;
    if (this.charId === 1) {
      // Henrique — entra no banheiro, se cura
      const F = 140;
      this.setState('special', F);
      this.healPerFrame = 60 / F;
      this.invincible   = F;
    } else {
      // Fezo — especial forte
      this.setState('special', 50);
      this.attackPriority = PRIORITY.HEAVY;
      if (opponent && this._inRange(opponent, 180)) {
        const accum  = opponent.dmgAccum;
        const fscale = Math.max(0.5, accum/100 + accum*accum/20000);
        opponent.takeHit(45, this, Math.round(320/(1000/60)), Math.round(28*fscale), false);
      }
    }
  }

  // ── Receber dano ──────────────────────────────────────────────────
  // knockback = força variável já calculada
  takeHit(damage, attacker, hitstunFrames, knockback, launcher = false) {
    if (this.invincible > 0) return;

    const blocked = this.state === 'block';
    const actual  = blocked ? Math.floor(damage * 0.15) : damage;

    this.hp       = Math.max(0, this.hp - actual);
    this.hitFlash = blocked ? 4 : 12;

    if (!blocked) {
      this.dmgAccum += actual;   // acumula para escalar força futura

      this.hitstun = hitstunFrames;
      this.locked  = true;
      this.setState('hitstun', hitstunFrames);

      // Knockback horizontal (força variável)
      const dir = attacker.x < this.x ? 1 : -1;
      this.vx   = dir * Math.min(knockback, 30); // cap para não sair da tela

      // Launcher
      if (launcher) { this.vy = -14; this.onGround = false; }
    }

    this.invincible = blocked ? 6 : 14;
    if (this.onHit) this.onHit(actual, this.x, this.y - this.height * 0.6);
  }

  _inRange(o, r) { return Math.abs(this.x - o.x) < r; }

  // ── Desenho ───────────────────────────────────────────────────────
  draw(ctx) {
    const w = this.width, h = this.height;
    const drawX = this.x - w/2, drawY = this.y - h;
    ctx.save();
    if (this.hitFlash > 0 && this.hitFlash % 2 === 0) ctx.globalAlpha = 0.35;
    if (this.facing === -1) {
      ctx.translate(this.x, 0); ctx.scale(-1, 1); ctx.translate(-this.x, 0);
    }
    const sprite = this._getCurrentSprite();
    if (sprite) ctx.drawImage(sprite, drawX, drawY, w, h);
    else        this._drawPlaceholder(ctx, drawX, drawY, w, h);
    ctx.restore();

    // Heavy charge bar
    if (this.isPlayer && this.heavyHeld > 0 && !this.locked) {
      const pct = Math.min(this.heavyHeld / 18, 1);
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#333';
      ctx.fillRect(this.x - 22, this.y - h - 10, 44, 5);
      ctx.fillStyle = pct >= 1 ? '#ffe000' : '#ffffff';
      ctx.fillRect(this.x - 22, this.y - h - 10, 44 * pct, 5);
      ctx.restore();
    }

    // Hitstun stars
    if (this.hitstun > 0) this._drawStars(ctx);
  }

  _drawStars(ctx) {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const a = Date.now()/200 + i*(Math.PI*2/3);
      ctx.fillStyle = '#ffe000'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('★', this.x + Math.cos(a)*16, this.y - this.height - 12 + Math.sin(a)*5);
    }
    ctx.restore();
  }

  _drawPlaceholder(ctx, x, y, w, h) {
    const cx = x+w/2, isP1 = this.charId === 1;
    ctx.fillStyle = isP1 ? '#3a8c3f' : '#e8e8e8';
    ctx.beginPath(); ctx.roundRect(cx-w*.22, y+h*.28, w*.44, h*.38, 6); ctx.fill();
    ctx.fillStyle = isP1 ? '#c68642' : '#8B5E3C';
    ctx.beginPath(); ctx.ellipse(cx, y+h*.15, w*.18, h*.15, 0, 0, Math.PI*2); ctx.fill();
    if (isP1) {
      ctx.fillStyle = '#e67e00';
      ctx.beginPath(); ctx.ellipse(cx, y+h*.08, w*.20, h*.07, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#333';
    ctx.fillRect(cx-w*.20, y+h*.60, w*.18, h*.32);
    ctx.fillRect(cx+w*.02, y+h*.60, w*.18, h*.32);
    ctx.fillStyle = isP1 ? '#c8d400' : '#222';
    ctx.fillRect(cx-w*.24, y+h*.88, w*.22, h*.08);
    ctx.fillRect(cx+w*.02, y+h*.88, w*.22, h*.08);
    const skin = isP1 ? '#c68642' : '#8B5E3C';
    ctx.fillStyle = skin;
    const LIGHT_ATK = ['neutral_light','side_light','air_neutral_light','air_side_light','recovery','special'];
    const HEAVY_ATK = ['neutral_heavy','side_heavy','down_heavy','down_light','air_down_light','ground_pound'];
    if (LIGHT_ATK.includes(this.state)) {
      ctx.fillRect(cx+w*.22, y+h*.32, w*.28, h*.10);
      ctx.fillRect(cx-w*.28, y+h*.35, w*.16, h*.10);
    } else if (HEAVY_ATK.includes(this.state)) {
      ctx.fillRect(cx+w*.22, y+h*.48, w*.24, h*.10);
      ctx.fillRect(cx-w*.24, y+h*.35, w*.16, h*.10);
    } else if (this.state === 'block') {
      ctx.fillRect(cx-w*.32, y+h*.28, w*.16, h*.28);
      ctx.fillRect(cx+w*.16, y+h*.28, w*.16, h*.28);
    } else {
      ctx.fillRect(cx-w*.34, y+h*.32, w*.14, h*.26);
      ctx.fillRect(cx+w*.20, y+h*.32, w*.14, h*.26);
    }
    if (this.state === 'special') {
      ctx.save();
      ctx.globalAlpha = 0.45 + 0.25*Math.sin(Date.now()/70);
      const g = ctx.createRadialGradient(cx, y+h*.5, 0, cx, y+h*.5, w*.7);
      g.addColorStop(0, isP1 ? '#00ff88' : '#ff88dd'); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, y+h*.5, w*.7, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    if (!this.onGround) {
      ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(cx, this.groundY+6, w*.32, 7, 0, 0, Math.PI*2);
      ctx.fill(); ctx.restore();
    }
  }
}

// ── Prioridade de ataque (maior = vence clash) ────────────────────
const PRIORITY = {
  AERIAL: 1,   // recoveries, ground pound, air lights
  LIGHT:  2,   // ground lights
  HEAVY:  3,   // signatures (ground heavies) — prioridade máxima
};

// ── Hitstun por ataque (ms) ───────────────────────────────────────
// Leves = hitstun menor mas fixo
// Pesados (sigs) = hitstun maior, ideal para combo setups
const HITSTUN_MS = {
  neutral_light:     170,
  side_light:        180,
  down_light:        190,
  neutral_heavy:     260,   // Sig
  side_heavy:        260,   // Sig
  down_heavy:        280,   // Sig
  air_neutral_light: 170,
  air_side_light:    175,
  air_down_light:    190,
  recovery:          240,   // Aerial Neutral Heavy
  ground_pound:      260,   // Aerial Down Heavy
  special:           300,
};

// ── Força base por ataque (escala com dmgAccum do alvo) ───────────
const ATTACK_BASE_FORCE = {
  neutral_light:     8,
  side_light:        9,
  down_light:        7,
  neutral_heavy:     18,   // Sig — força variável alta
  side_heavy:        20,   // Sig
  down_heavy:        16,   // Sig — mais hitstun, menos recuo
  air_neutral_light: 7,
  air_side_light:    8,
  air_down_light:    6,
  recovery:          14,
  ground_pound:      12,
  special:           22,
};

// ── FPS de animação ───────────────────────────────────────────────
const ANIM_FPS = {
  idle: 6, walk: 4, stance: 8, crouch: 6, jump: 10, block: 4, hitstun: 12,
  neutral_light: 18, side_light: 18, down_light: 16,
  neutral_heavy: 12, side_heavy: 12, down_heavy: 12,
  air_neutral_light: 18, air_side_light: 18, air_down_light: 16,
  recovery: 14, ground_pound: 14,
  special: 3,
};
