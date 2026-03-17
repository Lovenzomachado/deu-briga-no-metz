// ─── Player — Sistema de Combate estilo Brawlhalla ───────────────
//
// Estados: idle, walk, crouch, jump, hitstun,
//          ground_light, ground_heavy, down_attack, anti_air,
//          air_light, air_heavy, down_air, block, special
//
// sprites[state] = Image  ou  Image[]  (array de frames)

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
    this.speed = config.speed ?? 1.2;

    // Física
    this.vy        = 0;
    this.gravity   = 0.72;
    this.jumpForce = -17;
    this.onGround  = true;

    // State machine
    this.state      = 'idle';
    this.stateTimer = 0;
    this.locked     = false;   // não pode interromper o estado

    // Animação
    this.frame      = 0;
    this.frameTimer = 0;
    this.sprites    = {};

    // Combate
    this.hitstun    = 0;       // frames de hitstun restantes
    this.hitFlash   = 0;
    this.invincible = 0;

    // Especial
    this.specialUsed  = false;
    this.healPerFrame = 0;

    // Callbacks
    this.onHit  = null;
    this.onHeal = null;
  }

  // ── Sprites ───────────────────────────────────────────────────────
  loadSprites(spriteMap) {
    this.sprites = {};
    for (const [state, src] of Object.entries(spriteMap)) {
      if (Array.isArray(src)) {
        this.sprites[state] = src.map(s => {
          const img = new Image(); img.src = s; return img;
        });
      } else {
        const img = new Image(); img.src = src;
        this.sprites[state] = img;
      }
    }
  }

  // ── Estado ────────────────────────────────────────────────────────
  setState(name, duration = 0) {
    if (this.state === name && duration === 0) return;
    if (this.state === 'special' && name !== 'special') this.healPerFrame = 0;
    this.state      = name;
    this.stateTimer = duration;
    this.frame      = 0;
    this.frameTimer = 0;
    this.locked     = duration > 0;
  }

  // ── Sprite atual (com fallback) ───────────────────────────────────
  _getCurrentSprite() {
    // Mapeia estados de ataque para sprites disponíveis
    const SPRITE_MAP = {
      ground_light:  'punch',
      ground_heavy:  'kick',
      down_attack:   'kick',
      anti_air:      'punch',
      air_light:     'punch',
      air_heavy:     'kick',
      down_air:      'kick',
      hitstun:       'idle',
      crouch:        'idle',
    };

    const tryGet = (key) => {
      const entry = this.sprites[key];
      if (!entry) return null;
      if (Array.isArray(entry)) {
        const img = entry[this.frame % entry.length];
        if (img?.complete && img.naturalWidth > 0) return img;
        const img0 = entry[0];
        if (img0?.complete && img0.naturalWidth > 0) return img0;
        return null;
      }
      return (entry.complete && entry.naturalWidth > 0) ? entry : null;
    };

    const mapped = SPRITE_MAP[this.state];
    return tryGet(this.state)
        || (mapped ? tryGet(mapped) : null)
        || tryGet('stance')
        || tryGet('idle')
        || null;
  }

  // ── Update ────────────────────────────────────────────────────────
  update(opponent) {
    // Animação
    this.frameTimer++;
    const fps = ANIM_FPS[this.state] || 8;
    if (this.frameTimer >= 60 / fps) {
      this.frame++;
      this.frameTimer = 0;
    }

    // Timers
    if (this.invincible > 0) this.invincible--;
    if (this.hitFlash   > 0) this.hitFlash--;

    // Hitstun
    if (this.hitstun > 0) {
      this.hitstun--;
      if (this.hitstun <= 0 && this.state === 'hitstun') {
        this.setState('idle');
        this.locked = false;
      }
    }

    // Estado bloqueado (animação de ataque)
    if (this.locked && this.state !== 'hitstun') {
      this.stateTimer--;
      if (this.stateTimer <= 0) {
        this.locked = false;
        this.setState(this.onGround ? 'idle' : 'jump');
      }
    }

    // Cura do especial
    if (this.state === 'special' && this.healPerFrame > 0) {
      this.hp = Math.min(this.maxHP, this.hp + this.healPerFrame);
      if (this.onHeal) this.onHeal();
    }

    // Input (só player humano, e não em hitstun)
    if (this.isPlayer && this.hitstun <= 0) this._handleInput(opponent);

    // Física
    if (!this.onGround) {
      this.vy += this.gravity;
      this.y  += this.vy;
      if (this.y >= this.groundY) {
        this.y        = this.groundY;
        this.vy       = 0;
        this.onGround = true;
        if (!this.locked && this.state !== 'hitstun') this.setState('idle');
      }
    }

    // Olha para o oponente
    if (opponent && !this.locked) {
      this.facing = opponent.x > this.x ? 1 : -1;
    }

    this.x = Math.max(50, Math.min(900 - 50, this.x));
  }

  // ── Input ─────────────────────────────────────────────────────────
  _handleInput(opponent) {
    const down  = Input.isHeld('arrowdown') || Input.isHeld('s');
    const up    = Input.isHeld('arrowup')   || Input.isHeld('w');
    const left  = Input.isHeld('arrowleft') || Input.isHeld('a');
    const right = Input.isHeld('arrowright')|| (Input.isHeld('d'));
    const pressJ = Input.wasPressed('j');
    const pressK = Input.wasPressed('k');

    // ── Especial (↓ + J) — só no chão, prioridade máxima ───────────
    if (!this.specialUsed && pressJ && down && this.onGround && !this.locked) {
      this._activateSpecial(opponent);
      return;
    }

    // ── Movimento lateral no ar (sempre disponível) ─────────────────
    if (!this.onGround) {
      if (left)  this.x -= this.speed;
      if (right) this.x += this.speed;
    }

    // ── Ataques no ar ────────────────────────────────────────────────
    if (!this.onGround && !this.locked) {
      if (pressJ && down) {
        this._doAttack('down_air', 26, 22, 110, opponent);
        return;
      }
      if (pressJ) {
        this._doAttack('air_light', 20, 12, 95, opponent);
        return;
      }
      if (pressK) {
        this._doAttack('air_heavy', 30, 20, 105, opponent);
        return;
      }
    }

    // ── Ataques no chão ──────────────────────────────────────────────
    if (this.onGround && !this.locked) {
      if (pressJ && down) {
        // Down attack
        this._doAttack('down_attack', 26, 18, 110, opponent);
        return;
      }
      if (pressJ && up) {
        // Anti-air — gancho que lança o oponente para cima
        this._doAttack('anti_air', 28, 18, 105, opponent, true);
        return;
      }
      if (pressJ) {
        this._doAttack('ground_light', 18, 15, 95, opponent);
        return;
      }
      if (pressK) {
        this._doAttack('ground_heavy', 30, 22, 115, opponent);
        return;
      }
    }

    // ── Bloquear ─────────────────────────────────────────────────────
    if (Input.isHeld('l') && this.onGround) {
      if (this.state !== 'block') this.setState('block');
      return;
    } else if (this.state === 'block') {
      this.setState('idle');
    }

    // ── Pular ────────────────────────────────────────────────────────
    if (Input.wasPressed(' ') && this.onGround && !this.locked) {
      this.vy       = this.jumpForce;
      this.onGround = false;
      this.setState('jump', 40);
      return;
    }

    // ── Crouch ───────────────────────────────────────────────────────
    if (down && this.onGround && !this.locked) {
      if (this.state !== 'crouch') this.setState('crouch');
      return;
    } else if (this.state === 'crouch') {
      this.setState('idle');
    }

    // ── Movimento ────────────────────────────────────────────────────
    if (!this.locked && !down) {
      let moving = false;
      if (left)  { this.x -= this.speed; moving = true; }
      if (right) { this.x += this.speed; moving = true; }

      if (this.onGround) {
        this.setState(moving
          ? (this.sprites['walk'] ? 'walk' : 'stance')
          : 'idle'
        );
      }
    }
  }

  // ── Executa ataque ───────────────────────────────────────────────
  // hitstunFrames: frames de hitstun no alvo (180ms=11f, 260ms=16f, 320ms=19f)
  _doAttack(stateName, lockFrames, damage, range, opponent, launcher = false) {
    this.setState(stateName, lockFrames);
    if (opponent && this._inRange(opponent, range)) {
      const hitstunMs = HITSTUN_MS[stateName] || 180;
      const hitstunFrames = Math.round(hitstunMs / (1000 / 60));
      opponent.takeHit(damage, this, hitstunFrames, launcher);
    }
  }

  // ── Especial ──────────────────────────────────────────────────────
  _activateSpecial(opponent) {
    this.specialUsed = true;

    if (this.charId === 1) {
      // Henrique — entra no banheiro e se cura
      const FRAMES = 140;
      this.setState('special', FRAMES);
      this.healPerFrame = 60 / FRAMES;
      this.invincible   = FRAMES;
    } else {
      // Fezo — ataque especial forte
      this.setState('special', 50);
      if (opponent && this._inRange(opponent, 180)) {
        opponent.takeHit(45, this, Math.round(320 / (1000/60)));
      }
    }
  }

  // ── Receber dano ──────────────────────────────────────────────────
  takeHit(damage, attacker, hitstunFrames = 11, launcher = false) {
    if (this.invincible > 0) return;

    const blocked = this.state === 'block';
    const actual  = blocked ? Math.floor(damage * 0.15) : damage;

    this.hp       = Math.max(0, this.hp - actual);
    this.hitFlash = blocked ? 4 : 12;

    if (!blocked) {
      // Aplica hitstun
      const stun    = blocked ? Math.floor(hitstunFrames * 0.3) : hitstunFrames;
      this.hitstun  = stun;
      this.locked   = true;
      this.setState('hitstun', stun);

      // Launcher sobe o personagem
      if (launcher) {
        this.vy       = -14;  // força de lançamento maior
        this.onGround = false;
      }

      // Knockback leve
      const dir  = attacker.x < this.x ? 1 : -1;
      this.x    += dir * 18;
    }

    this.invincible = blocked ? 6 : 14;
    if (this.onHit) this.onHit(actual, this.x, this.y - this.height * 0.6);
  }

  _inRange(opponent, range) {
    return Math.abs(this.x - opponent.x) < range;
  }

  // ── Desenho ───────────────────────────────────────────────────────
  draw(ctx) {
    const w     = this.width;
    const h     = this.height;
    const drawX = this.x - w / 2;
    const drawY = this.y - h;

    ctx.save();

    if (this.hitFlash > 0 && this.hitFlash % 2 === 0) ctx.globalAlpha = 0.35;

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

    // Hitstun indicator (estrelinhas acima do personagem)
    if (this.hitstun > 0) {
      this._drawStars(ctx);
    }
  }

  _drawStars(ctx) {
    const count = 3;
    const cx    = this.x;
    const cy    = this.y - this.height - 12;
    ctx.save();
    for (let i = 0; i < count; i++) {
      const angle = (Date.now() / 200 + i * (Math.PI * 2 / count));
      const sx    = cx + Math.cos(angle) * 16;
      const sy    = cy + Math.sin(angle) * 6;
      ctx.fillStyle = '#ffe000';
      ctx.font      = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', sx, sy);
    }
    ctx.restore();
  }

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
    const st = this.state;
    if (['ground_light','air_light','anti_air','special'].includes(st)) {
      ctx.fillRect(cx + w*0.22, y + h*0.32, w*0.28, h*0.10);
      ctx.fillRect(cx - w*0.28, y + h*0.35, w*0.16, h*0.10);
    } else if (['ground_heavy','air_heavy','down_attack','down_air'].includes(st)) {
      ctx.fillRect(cx + w*0.22, y + h*0.48, w*0.24, h*0.10);
      ctx.fillRect(cx - w*0.24, y + h*0.35, w*0.16, h*0.10);
    } else if (st === 'block') {
      ctx.fillRect(cx - w*0.32, y + h*0.28, w*0.16, h*0.28);
      ctx.fillRect(cx + w*0.16, y + h*0.28, w*0.16, h*0.28);
    } else if (st === 'crouch') {
      ctx.fillRect(cx - w*0.28, y + h*0.55, w*0.14, h*0.16);
      ctx.fillRect(cx + w*0.14, y + h*0.55, w*0.14, h*0.16);
    } else {
      ctx.fillRect(cx - w*0.34, y + h*0.32, w*0.14, h*0.26);
      ctx.fillRect(cx + w*0.20, y + h*0.32, w*0.14, h*0.26);
    }

    if (st === 'special') {
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

// ── Hitstun por tipo de ataque (em ms) ────────────────────────────
const HITSTUN_MS = {
  ground_light: 180,   // leve  → combos rápidos
  ground_heavy: 260,   // forte → janela maior
  down_attack:  200,
  anti_air:     320,   // launcher → tempo para subir e atacar no ar
  air_light:    180,
  air_heavy:    260,
  down_air:     220,
  special:      320,
};

// ── FPS de animação por estado ────────────────────────────────────
const ANIM_FPS = {
  idle:         6,
  walk:         4,
  stance:       8,
  crouch:       6,
  jump:         10,
  block:        4,
  hitstun:      12,
  ground_light: 16,
  ground_heavy: 12,
  down_attack:  14,
  anti_air:     14,
  air_light:    16,
  air_heavy:    12,
  down_air:     14,
  special:      3,
};
