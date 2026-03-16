// ─── Player / Character State Machine ────────────────────────────

class Player {
  constructor(config) {
    // Position & physics
    this.x       = config.x       ?? 200;
    this.y       = config.y       ?? 0;    // will be set to groundY in game
    this.groundY = config.groundY ?? 420;
    this.width   = config.width   ?? 96;
    this.height  = config.height  ?? 112;
    this.facing  = config.facing  ?? 1;    // 1 = right, -1 = left
    this.isPlayer = config.isPlayer ?? true;

    // Stats
    this.maxHP = 200;
    this.hp    = this.maxHP;
    this.speed = config.speed ?? 4.5;

    // Physics
    this.vy      = 0;
    this.gravity = 0.7;
    this.jumpForce = -16;
    this.onGround  = true;

    // State machine
    this.state    = 'idle';
    this.stateTimer = 0;   // frames remaining in timed state
    this.locked     = false; // if true, can't interrupt

    // Animation
    this.frame      = 0;
    this.frameTimer = 0;
    this.sprites    = {};  // { stateName: HTMLImageElement }
    this.loaded     = false;

    // Hit flash
    this.hitFlash   = 0;
    this.invincible = 0;  // invincibility frames

    // For hit-text spawning
    this.onHit = null; // callback(damage, x, y)
  }

  // ── Sprite loading ──────────────────────────────────────────────
  loadSprites(spriteMap) {
    // spriteMap: { idle: 'sprites/idle.png', punch: 'sprites/punch.png', ... }
    let total = Object.keys(spriteMap).length;
    let done  = 0;
    for (const [state, src] of Object.entries(spriteMap)) {
      const img = new Image();
      img.onload = () => { done++; if (done === total) this.loaded = true; };
      img.onerror = () => { done++; if (done === total) this.loaded = true; };
      img.src = src;
      this.sprites[state] = img;
    }
  }

  // ── State helpers ───────────────────────────────────────────────
  setState(name, duration = 0) {
    if (this.state === name) return;
    this.state      = name;
    this.stateTimer = duration;
    this.frame      = 0;
    this.frameTimer = 0;
    this.locked     = duration > 0;
  }

  // ── Update (called every frame) ─────────────────────────────────
  update(opponent) {
    this.frameTimer++;

    // Tick timed state
    if (this.locked) {
      this.stateTimer--;
      if (this.stateTimer <= 0) {
        this.locked = false;
        this.setState('idle');
      }
    }

    // Invincibility
    if (this.invincible > 0) this.invincible--;

    // Hit flash decay
    if (this.hitFlash > 0) this.hitFlash--;

    // Input handling (only for human player)
    if (this.isPlayer) this._handleInput(opponent);

    // Physics
    if (!this.onGround) {
      this.vy += this.gravity;
      this.y  += this.vy;
      if (this.y >= this.groundY) {
        this.y       = this.groundY;
        this.vy      = 0;
        this.onGround = true;
        if (!this.locked) this.setState('idle');
      }
    }

    // Face opponent
    if (opponent) {
      this.facing = opponent.x > this.x ? 1 : -1;
    }

    // Clamp to stage
    const stageW = 900;
    this.x = Math.max(40, Math.min(stageW - 40, this.x));

    // Cycle animation frame
    const fps = ANIM_FPS[this.state] || 8;
    if (this.frameTimer >= 60 / fps) {
      this.frame++;
      this.frameTimer = 0;
    }
  }

  _handleInput(opponent) {
    if (this.locked) return;

    // Special: S + D + J
    if (Input.comboHeld('s','d') && Input.wasPressed('j')) {
      this.setState('special', 50);
      if (opponent && this._inRange(opponent, 180)) opponent.takeHit(45, this);
      return;
    }

    // Punch
    if (Input.wasPressed('j')) {
      this.setState('punch', 22);
      if (opponent && this._inRange(opponent, 120)) opponent.takeHit(15, this);
      return;
    }

    // Kick
    if (Input.wasPressed('k')) {
      this.setState('kick', 28);
      if (opponent && this._inRange(opponent, 130)) opponent.takeHit(20, this);
      return;
    }

    // Block
    if (Input.isHeld('l')) {
      if (this.state !== 'block') this.setState('block');
      return;
    } else if (this.state === 'block') {
      this.setState('idle');
    }

    // Jump
    if (Input.wasPressed(' ') && this.onGround) {
      this.vy = this.jumpForce;
      this.onGround = false;
      this.setState('jump', 38);
      return;
    }

    // Move
    let moving = false;
    if (Input.isHeld('arrowleft') || Input.isHeld('a')) {
      this.x -= this.speed;
      moving = true;
    }
    if (Input.isHeld('arrowright') || Input.isHeld('d') && !Input.isHeld('s')) {
      this.x += this.speed;
      moving = true;
    }

    // Idle vs stance
    if (!this.locked) {
      this.setState(moving ? 'stance' : 'idle');
    }
  }

  takeHit(damage, attacker) {
    if (this.invincible > 0) return;

    // Block reduces damage
    const blocked = this.state === 'block';
    const actual  = blocked ? Math.floor(damage * 0.2) : damage;

    this.hp = Math.max(0, this.hp - actual);
    this.hitFlash   = blocked ? 4 : 10;
    this.invincible = 18;

    if (this.onHit) this.onHit(actual, this.x, this.y - this.height / 2);

    if (!blocked) {
      this.setState('idle'); // stagger
    }
  }

  _inRange(opponent, range) {
    return Math.abs(this.x - opponent.x) < range;
  }

  // ── Draw ─────────────────────────────────────────────────────────
  draw(ctx) {
    const w = this.width;
    const h = this.height;
    const drawX = this.x - w / 2;
    const drawY = this.y - h;

    ctx.save();

    // Hit flash
    if (this.hitFlash > 0 && this.hitFlash % 2 === 0) {
      ctx.globalAlpha = 0.3;
    }

    // Flip if facing left
    if (this.facing === -1) {
      ctx.translate(this.x, 0);
      ctx.scale(-1, 1);
      ctx.translate(-this.x, 0);
    }

    const sprite = this.sprites[this.state] || this.sprites['idle'];
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, drawX, drawY, w, h);
    } else {
      // Fallback: draw turtle placeholder
      this._drawPlaceholder(ctx, drawX, drawY, w, h);
    }

    ctx.restore();

    // State label (debug / showcase)
    // (shown in HUD badge instead)
  }

  _drawPlaceholder(ctx, x, y, w, h) {
    const cx = x + w / 2;

    // Shell body
    ctx.fillStyle = this.isPlayer ? '#4CAF50' : '#F44336';
    ctx.beginPath();
    ctx.ellipse(cx, y + h * 0.55, w * 0.38, h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shell pattern
    ctx.strokeStyle = this.isPlayer ? '#2e7d32' : '#b71c1c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, y + h * 0.55, w * 0.22, h * 0.18, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Head
    ctx.fillStyle = this.isPlayer ? '#66bb6a' : '#ef5350';
    ctx.beginPath();
    ctx.ellipse(cx, y + h * 0.22, w * 0.19, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - 5, y + h * 0.18, 4, 0, Math.PI * 2);
    ctx.arc(cx + 5, y + h * 0.18, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx - 4, y + h * 0.18, 2, 0, Math.PI * 2);
    ctx.arc(cx + 4, y + h * 0.18, 2, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = this.isPlayer ? '#4CAF50' : '#F44336';
    const legY = y + h * 0.82;
    // Left
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.22, legY, w * 0.1, h * 0.1, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Right
    ctx.beginPath();
    ctx.ellipse(cx + w * 0.22, legY, w * 0.1, h * 0.1, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Arms in different positions based on state
    const armY = y + h * 0.48;
    if (this.state === 'punch' || this.state === 'special') {
      // Extended punch arm
      ctx.beginPath();
      ctx.ellipse(cx + w * 0.42, armY, w * 0.16, h * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - w * 0.18, armY + 8, w * 0.1, h * 0.08, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.state === 'kick') {
      // Raised kick leg
      ctx.beginPath();
      ctx.ellipse(cx + w * 0.32, legY - 20, w * 0.1, h * 0.12, -0.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.state === 'block') {
      // Arms crossed
      ctx.beginPath();
      ctx.ellipse(cx - w * 0.28, armY, w * 0.1, h * 0.08, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + w * 0.28, armY, w * 0.1, h * 0.08, -0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.state === 'jump') {
      // Tucked arms up
      ctx.beginPath();
      ctx.ellipse(cx - w * 0.28, armY - 12, w * 0.1, h * 0.08, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + w * 0.28, armY - 12, w * 0.1, h * 0.08, 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Idle arms at sides
      ctx.beginPath();
      ctx.ellipse(cx - w * 0.28, armY + 6, w * 0.1, h * 0.08, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + w * 0.28, armY + 6, w * 0.1, h * 0.08, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Special glow
    if (this.state === 'special') {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(Date.now() / 80);
      const grd = ctx.createRadialGradient(cx, y + h * 0.5, 0, cx, y + h * 0.5, w * 0.7);
      grd.addColorStop(0, this.isPlayer ? '#00ff88' : '#ff3c3c');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, y + h * 0.5, w * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Jump shadow
    if (!this.onGround) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(cx, this.groundY + 6, w * 0.35, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// Animation FPS per state
const ANIM_FPS = {
  idle:    6,
  stance:  8,
  punch:   14,
  kick:    14,
  jump:    10,
  block:   4,
  special: 18,
};
