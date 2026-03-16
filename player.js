// ─── Player / Character State Machine ────────────────────────────

class Player {
  constructor(config) {
    this.x        = config.x        ?? 200;
    this.y        = config.y        ?? 0;
    this.groundY  = config.groundY  ?? 420;
    this.width    = config.width    ?? 96;
    this.height   = config.height   ?? 128;
    this.facing   = config.facing   ?? 1;
    this.isPlayer = config.isPlayer ?? true;
    this.charId   = config.charId   ?? 1; // 1 = guy, 2 = girl

    this.maxHP = 200;
    this.hp    = this.maxHP;
    this.speed = config.speed ?? 4.5;

    this.vy        = 0;
    this.gravity   = 0.72;
    this.jumpForce = -17;
    this.onGround  = true;

    this.state      = 'idle';
    this.stateTimer = 0;
    this.locked     = false;

    this.frame      = 0;
    this.frameTimer = 0;
    this.sprites    = {};

    this.hitFlash   = 0;
    this.invincible = 0;

    this.onHit = null;
  }

  loadSprites(spriteMap) {
    let total = Object.keys(spriteMap).length;
    let done  = 0;
    for (const [state, src] of Object.entries(spriteMap)) {
      const img = new Image();
      img.onload  = () => { done++; };
      img.onerror = () => { done++; };
      img.src = src;
      this.sprites[state] = img;
    }
  }

  setState(name, duration = 0) {
    if (this.state === name && duration === 0) return;
    this.state      = name;
    this.stateTimer = duration;
    this.frame      = 0;
    this.frameTimer = 0;
    this.locked     = duration > 0;
  }

  update(opponent) {
    this.frameTimer++;

    if (this.locked) {
      this.stateTimer--;
      if (this.stateTimer <= 0) {
        this.locked = false;
        this.setState('idle');
      }
    }

    if (this.invincible > 0) this.invincible--;
    if (this.hitFlash   > 0) this.hitFlash--;

    if (this.isPlayer) this._handleInput(opponent);

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

    if (opponent) {
      this.facing = opponent.x > this.x ? 1 : -1;
    }

    const stageW = 900;
    this.x = Math.max(50, Math.min(stageW - 50, this.x));

    const fps = ANIM_FPS[this.state] || 8;
    if (this.frameTimer >= 60 / fps) {
      this.frame++;
      this.frameTimer = 0;
    }
  }

  _handleInput(opponent) {
    if (this.locked) return;

    if (Input.comboHeld('s','d') && Input.wasPressed('j')) {
      this.setState('special', 50);
      if (opponent && this._inRange(opponent, 180)) opponent.takeHit(45, this);
      return;
    }

    if (Input.wasPressed('j')) {
      this.setState('punch', 22);
      if (opponent && this._inRange(opponent, 120)) opponent.takeHit(15, this);
      return;
    }

    if (Input.wasPressed('k')) {
      this.setState('kick', 28);
      if (opponent && this._inRange(opponent, 130)) opponent.takeHit(20, this);
      return;
    }

    if (Input.isHeld('l')) {
      if (this.state !== 'block') this.setState('block');
      return;
    } else if (this.state === 'block') {
      this.setState('idle');
    }

    if (Input.wasPressed(' ') && this.onGround) {
      this.vy       = this.jumpForce;
      this.onGround = false;
      this.setState('jump', 40);
      return;
    }

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
      this.setState(moving ? 'stance' : 'idle');
    }
  }

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

  draw(ctx) {
    const w     = this.width;
    const h     = this.height;
    const drawX = this.x - w / 2;
    const drawY = this.y - h;

    ctx.save();

    if (this.hitFlash > 0 && this.hitFlash % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    if (this.facing === -1) {
      ctx.translate(this.x, 0);
      ctx.scale(-1, 1);
      ctx.translate(-this.x, 0);
    }

    // Try to get sprite for current state, fall back to idle, then placeholder
    const spriteKey = this.sprites[this.state] ? this.state : 'idle';
    const sprite    = this.sprites[spriteKey];

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, drawX, drawY, w, h);
    } else {
      this._drawPlaceholder(ctx, drawX, drawY, w, h);
    }

    ctx.restore();
  }

  _drawPlaceholder(ctx, x, y, w, h) {
    const cx = x + w / 2;
    const isP1 = this.charId === 1;
    const base = isP1 ? '#3a8c3f' : '#e8e8e8';
    const dark = isP1 ? '#1e5220' : '#aaaaaa';
    const skin = isP1 ? '#c68642' : '#8B5E3C';

    // Body
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.roundRect(cx - w*0.22, y + h*0.28, w*0.44, h*0.38, 6);
    ctx.fill();

    // Head
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(cx, y + h*0.15, w*0.18, h*0.15, 0, 0, Math.PI*2);
    ctx.fill();

    // Hat (P1)
    if (isP1) {
      ctx.fillStyle = '#e67e00';
      ctx.beginPath();
      ctx.ellipse(cx, y + h*0.08, w*0.20, h*0.07, 0, 0, Math.PI*2);
      ctx.fill();
    }

    // Pants
    ctx.fillStyle = '#333';
    ctx.fillRect(cx - w*0.20, y + h*0.60, w*0.18, h*0.32);
    ctx.fillRect(cx + w*0.02, y + h*0.60, w*0.18, h*0.32);

    // Shoes
    ctx.fillStyle = isP1 ? '#c8d400' : '#222';
    ctx.fillRect(cx - w*0.24, y + h*0.88, w*0.22, h*0.08);
    ctx.fillRect(cx + w*0.02, y + h*0.88, w*0.22, h*0.08);

    // Arms
    ctx.fillStyle = skin;
    if (this.state === 'punch') {
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

    // Special glow
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

const ANIM_FPS = {
  idle:    6,
  stance:  8,
  punch:   14,
  kick:    14,
  jump:    10,
  block:   4,
  special: 18,
};
