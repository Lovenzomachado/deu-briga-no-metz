// ─── Player / Character State Machine ────────────────────────────
//
// Suporte a dois tipos de sprite:
//   sprites[state] = HTMLImageElement        (frame único, ex: punch)
//   sprites[state] = HTMLImageElement[]      (array de frames, ex: walk)
//

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
    this.speed = config.speed ?? 3.2;   // ← mais lento (era 4.5 / 5)

    this.vy        = 0;
    this.gravity   = 0.72;
    this.jumpForce = -17;
    this.onGround  = true;

    this.state      = 'idle';
    this.stateTimer = 0;
    this.locked     = false;

    this.frame      = 0;
    this.frameTimer = 0;
    this.sprites    = {};   // string → Image ou Image[]

    this.hitFlash   = 0;
    this.invincible = 0;

    this.specialUsed = false;  // só pode usar 1x por partida
    this.healPerFrame = 0;     // vida regenerada por frame durante especial

    this.onHit = null;
  }

  // ── Carregamento de sprites ──────────────────────────────────────
  // spriteMap aceita:
  //   'state': 'caminho.png'              → frame único
  //   'state': ['frame1.png', 'frame2.png', ...] → animação multi-frame
  loadSprites(spriteMap) {
    // Reseta sprites antes de carregar novo set
    this.sprites = {};
    for (const [state, src] of Object.entries(spriteMap)) {
      if (Array.isArray(src)) {
        this.sprites[state] = src.map(s => {
          const img = new Image();
          img.src = s;
          return img;
        });
      } else {
        const img = new Image();
        img.src = src;
        this.sprites[state] = img;
      }
    }
  }

  // ── State helpers ────────────────────────────────────────────────
  setState(name, duration = 0) {
    if (this.state === name && duration === 0) return;
    // Para a cura ao sair do especial
    if (this.state === 'special' && name !== 'special') {
      this.healPerFrame = 0;
    }
    this.state      = name;
    this.stateTimer = duration;
    this.frame      = 0;
    this.frameTimer = 0;
    this.locked     = duration > 0;
  }

  // ── Retorna o sprite/frame atual para desenho ────────────────────
  _getCurrentSprite() {
    const tryGet = (state) => {
      const entry = this.sprites[state];
      if (!entry) return null;
      if (Array.isArray(entry)) {
        const img = entry[this.frame % entry.length];
        // Se este frame ainda não carregou, tenta o frame 0
        if (img && img.complete && img.naturalWidth > 0) return img;
        const img0 = entry[0];
        if (img0 && img0.complete && img0.naturalWidth > 0) return img0;
        return null; // nenhum frame do array carregou ainda
      }
      if (entry.complete && entry.naturalWidth > 0) return entry;
      return null;
    };

    // Tenta estado atual → stance → idle → null (placeholder)
    return tryGet(this.state)
        || tryGet('stance')
        || tryGet('idle')
        || null;
  }

  // ── Update ───────────────────────────────────────────────────────
  update(opponent) {
    this.frameTimer++;

    // Avança frame de animação
    const fps = ANIM_FPS[this.state] || 8;
    if (this.frameTimer >= 60 / fps) {
      this.frame++;
      this.frameTimer = 0;
    }

    // Deconta estado bloqueado
    if (this.locked) {
      this.stateTimer--;
      if (this.stateTimer <= 0) {
        this.locked = false;
        this.setState('idle');
      }
    }

    if (this.invincible > 0) this.invincible--;
    if (this.hitFlash   > 0) this.hitFlash--;

    // Regeneração de vida durante especial (P1 — METZ)
    if (this.state === 'special' && this.healPerFrame > 0) {
      this.hp = Math.min(this.maxHP, this.hp + this.healPerFrame);
      if (this.onHeal) this.onHeal(this.hp);
    }

    if (this.isPlayer) this._handleInput(opponent);

    // Física de salto
    if (!this.onGround) {
      this.vy += this.gravity;
      this.y  += this.vy;
      if (this.y >= this.groundY) {
        this.y        = this.groundY;
        this.vy       = 0;
        this.onGround = true;
        if (!this.locked) this.setState('idle');
      }
    }

    // Sempre olha para o oponente
    if (opponent) {
      this.facing = opponent.x > this.x ? 1 : -1;
    }

    // Limita ao palco
    this.x = Math.max(50, Math.min(900 - 50, this.x));
  }

  // ── Input do jogador ─────────────────────────────────────────────
  _handleInput(opponent) {
    if (this.locked) return;

    // Especial: S + J
    if (Input.isHeld('s') && Input.wasPressed('j')) {
      if (this.specialUsed) return; // só 1x por partida

      if (this.charId === 1) {
        // METZ — especial cura: 7 frames × ~8.5 hp = ~60 HP total
        // duração: 7 frames a 3fps = ~140 frames de jogo (~2.3s)
        const SPECIAL_FRAMES = 140;
        const HEAL_TOTAL     = 60;
        this.setState('special', SPECIAL_FRAMES);
        this.healPerFrame  = HEAL_TOTAL / SPECIAL_FRAMES;
        this.specialUsed   = true;
        this.invincible    = SPECIAL_FRAMES; // invencível durante o especial
      } else {
        // Outros personagens — especial de ataque padrão
        this.setState('special', 50);
        if (opponent && this._inRange(opponent, 180)) opponent.takeHit(45, this);
        this.specialUsed = true;
      }

      return;
    }

    // Soco
    if (Input.wasPressed('j')) {
      this.setState('punch', 22);
      if (opponent && this._inRange(opponent, 120)) opponent.takeHit(15, this);
      return;
    }

    // Chute
    if (Input.wasPressed('k')) {
      this.setState('kick', 28);
      if (opponent && this._inRange(opponent, 130)) opponent.takeHit(20, this);
      return;
    }

    // Bloquear
    if (Input.isHeld('l')) {
      if (this.state !== 'block') this.setState('block');
      return;
    } else if (this.state === 'block') {
      this.setState('idle');
    }

    // Pular
    if (Input.wasPressed(' ') && this.onGround) {
      this.vy       = this.jumpForce;
      this.onGround = false;
      this.setState('jump', 40);
      return;
    }

    // Movimento lateral
    let moving = false;
    if (Input.isHeld('arrowleft') || Input.isHeld('a')) {
      this.x -= this.speed;
      moving = true;
    }
    if (Input.isHeld('arrowright') || (Input.isHeld('d') && !Input.isHeld('s'))) {
      this.x += this.speed;
      moving = true;
    }

    if (!this.locked) {
      // Usa 'walk' se existir e estiver movendo; senão cai para 'stance' ou 'idle'
      if (moving) {
        this.setState(this.sprites['walk'] ? 'walk' : 'stance');
      } else {
        this.setState('idle');
      }
    }
  }

  // ── Receber dano ─────────────────────────────────────────────────
  takeHit(damage, attacker) {
    if (this.invincible > 0) return;
    const blocked = this.state === 'block';
    const actual  = blocked ? Math.floor(damage * 0.15) : damage;

    this.hp         = Math.max(0, this.hp - actual);
    this.hitFlash   = blocked ? 4 : 12;
    this.invincible = 20;

    if (this.onHit) this.onHit(actual, this.x, this.y - this.height * 0.6);
    if (!blocked) this.setState('idle');
  }

  _inRange(opponent, range) {
    return Math.abs(this.x - opponent.x) < range;
  }

  // ── Desenho ──────────────────────────────────────────────────────
  draw(ctx) {
    const w     = this.width;
    const h     = this.height;
    const drawX = this.x - w / 2;
    const drawY = this.y - h;

    ctx.save();

    // Flash de dano
    if (this.hitFlash > 0 && this.hitFlash % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    // Espelha se virado para esquerda
    if (this.facing === -1) {
      ctx.translate(this.x, 0);
      ctx.scale(-1, 1);
      ctx.translate(-this.x, 0);
    }

    const sprite = this._getCurrentSprite();

    if (sprite) {
      ctx.drawImage(sprite, drawX, drawY, w, h);
    } else {
      this._drawPlaceholder(ctx, drawX, drawY, w, h);
    }

    ctx.restore();
  }

  // ── Placeholder procedural ───────────────────────────────────────
  _drawPlaceholder(ctx, x, y, w, h) {
    const cx   = x + w / 2;
    const isP1 = this.charId === 1;
    const base = isP1 ? '#3a8c3f' : '#e8e8e8';
    const skin = isP1 ? '#c68642' : '#8B5E3C';

    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.roundRect(cx - w*0.22, y + h*0.28, w*0.44, h*0.38, 6);
    ctx.fill();

    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(cx, y + h*0.15, w*0.18, h*0.15, 0, 0, Math.PI*2);
    ctx.fill();

    if (isP1) {
      ctx.fillStyle = '#e67e00';
      ctx.beginPath();
      ctx.ellipse(cx, y + h*0.08, w*0.20, h*0.07, 0, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.fillStyle = '#333';
    ctx.fillRect(cx - w*0.20, y + h*0.60, w*0.18, h*0.32);
    ctx.fillRect(cx + w*0.02, y + h*0.60, w*0.18, h*0.32);

    ctx.fillStyle = isP1 ? '#c8d400' : '#222';
    ctx.fillRect(cx - w*0.24, y + h*0.88, w*0.22, h*0.08);
    ctx.fillRect(cx + w*0.02, y + h*0.88, w*0.22, h*0.08);

    ctx.fillStyle = skin;
    if (this.state === 'punch' || this.state === 'special') {
      ctx.fillRect(cx + w*0.22, y + h*0.32, w*0.28, h*0.10);
      ctx.fillRect(cx - w*0.28, y + h*0.35, w*0.16, h*0.10);
    } else if (this.state === 'kick') {
      ctx.fillRect(cx + w*0.22, y + h*0.48, w*0.24, h*0.10);
      ctx.fillRect(cx - w*0.24, y + h*0.35, w*0.16, h*0.10);
    } else if (this.state === 'block') {
      ctx.fillRect(cx - w*0.32, y + h*0.28, w*0.16, h*0.28);
      ctx.fillRect(cx + w*0.16, y + h*0.28, w*0.16, h*0.28);
    } else {
      ctx.fillRect(cx - w*0.34, y + h*0.32, w*0.14, h*0.26);
      ctx.fillRect(cx + w*0.20, y + h*0.32, w*0.14, h*0.26);
    }

    if (this.state === 'special') {
      ctx.save();
      ctx.globalAlpha = 0.45 + 0.25 * Math.sin(Date.now() / 70);
      const grd = ctx.createRadialGradient(cx, y+h*0.5, 0, cx, y+h*0.5, w*0.7);
      grd.addColorStop(0, isP1 ? '#00ff88' : '#ff88dd');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, y + h*0.5, w*0.7, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    if (!this.onGround) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(cx, this.groundY + 6, w*0.32, 7, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ── FPS de animação por estado ────────────────────────────────────
const ANIM_FPS = {
  idle:    6,
  walk:    4,    // walk cycle — lento, sincronizado com movimento
  stance:  8,
  punch:   14,
  kick:    14,
  jump:    10,
  block:   4,
  special: 3,    // 7 frames × ~20 frames cada = ~140 frames de duração
};
