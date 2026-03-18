// ═══════════════════════════════════════════════════════════════════
// PLAYER — Motor de combate e movimento
//
// Este arquivo contém tudo relacionado a um personagem:
//   • Física: gravidade, pulo, knockback, fast fall
//   • Movimento: walk, dash (double-tap), dodge (8 direções)
//   • Combate: 11 ataques (terra + ar), sistema de combos
//   • Animação: state machine com sprites por estado
//
// Combat + Combo System
// ═══════════════════════════════════════════════════════════════════
//
// ATAQUES (11 por personagem, estilo Brawlhalla):
//   Terra:  neutral_light / side_light / down_light
//           neutral_heavy / side_heavy / down_heavy  (Signatures)
//   Ar:     air_neutral_light / air_side_light / air_down_light
//           recovery (neutral air heavy) / ground_pound (down air heavy)
//
// COMBO SYSTEM (estilo KOF/SF):
//   • Cancel windows: ataques leves cancelam em outros dentro de X frames
//   • Hit reactions: light=grounded, heavy=knockback, launcher=airborne
//   • Juggle system: cada hit no ar reduz hitstun (scaling)
//   • Hitstop: pausa de frames no impacto (game feel)
//   • Combo counter: conta hits e exibe combo
//
// FORÇA VARIÁVEL (Brawlhalla):
//   force = baseForce * (dmgAccum/100 + dmgAccum²/20000)

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

    // Stats
    this.maxHP    = 500;
    this.hp       = this.maxHP;
    this.dmgAccum = 0;
    this.speed    = config.speed ?? 1.2;

    // ── Física ────────────────────────────────────────────────────
    this.vy        = 0;
    this.vx        = 0;
    this.gravity   = 0.52;
    this.jumpForce = -14;
    this.onGround  = true;

    // ── Brawlhalla Jump System ────────────────────────────────────
    // Máximo 4 ações aéreas (jumps + recoveries combinados)
    // Ex: 3 jumps + 1 recovery  /  2+2  /  1+3
    this.jumpsLeft     = 3;   // pulos restantes no ar
    this.recoveriesLeft= 1;   // recoveries restantes no ar
    this.totalAirActions = 0; // total usado (jumps+recoveries, max 4)
    this.walkedOffEdge = false; // andou da borda sem pular → só 3 totais

    // ── Fast Fall ─────────────────────────────────────────────────
    this.isFastFalling = false;
    this.fastFallSpeed = 1.8;  // multiplicador de gravidade no fast fall

    // ── Dodge System ──────────────────────────────────────────────
    // Dodge: L → dodge direcional, spot dodge, air dodge
    // Invulnerável por N frames, depois cooldown
    this.dodgeState    = 'ready'; // 'ready' | 'dodging' | 'cooldown'
    this.dodgeTimer    = 0;       // frames restantes do dodge atual
    this.dodgeCooldown = 0;       // cooldown após dodge
    this.dodgeInvul    = false;   // invulnerável durante dodge
    this.dodgeVx       = 0;       // velocidade horizontal do dodge
    this.dodgeVy       = 0;       // velocidade vertical do dodge
    this.spotDodge     = false;   // dodge no lugar

    // Gravity Cancel: atacar dentro de 18f de spot dodge aéreo
    this.gcWindow      = 0;       // frames restantes para GC

    // Chase Dodge: dodge rápido após ataque
    this.chaseDodgesLeft = 0;     // disponíveis após ataque aterrissar

    // ── State machine ─────────────────────────────────────────────
    this.state      = 'idle';
    this.stateTimer = 0;
    this.locked     = false;

    // ── Animação ──────────────────────────────────────────────────
    this.frame      = 0;
    this.frameTimer = 0;
    this.sprites    = {};

    // ── Combate base ──────────────────────────────────────────────
    this.hitstun        = 0;
    this.hitFlash       = 0;
    this.invincible     = 0;
    this.attackPriority = 0;
    this.hitstop        = 0;

    // ── Combo system ──────────────────────────────────────────────
    this.comboCount   = 0;
    this.comboTimer   = 0;
    this.cancelWindow = 0;
    this.lastAttack   = '';
    this.juggleCount  = 0;
    this.inputBuffer  = null;
    this.bufferTimer  = 0;

    // ── Hit reactions ─────────────────────────────────────────────
    this.hitReaction = 'grounded';
    this.isAirborne  = false;
    this.knockdown   = false;

    // ── Dash / double-tap ─────────────────────────────────────────
    this.dashTimer    = 0;
    this.dashLastDir  = '';
    this.dashCooldown = 0;
    this.isDashing    = false;
    this.dashFrames   = 0;

    // ── Heavy charge ──────────────────────────────────────────────
    this.heavyHeld    = 0;
    this.heavyCharged = false;

    // ── Especial ──────────────────────────────────────────────────
    this.specialUsed  = false;
    this.healPerFrame = 0;

    // Callbacks
    this.onHit   = null;
    this.onHeal  = null;
    this.onClash = null;
    this.onCombo = null;
  }

  // ── Sprites ───────────────────────────────────────────────────────
  // Aceita { estado: 'caminho.png' } ou { estado: ['frame1.png', ...] }
  // para animações multi-frame (ex: walk cycle).
  // Reseta sprites{} antes para não misturar personagens.
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
  // Muda o estado do personagem. duration > 0 = estado bloqueado
  // (não pode ser interrompido até stateTimer zerar).
  // Reseta frame e frameTimer para reiniciar a animação do novo estado.
  setState(name, duration = 0) {
    if (this.state === name && duration === 0) return;
    if (this.state === 'special' && name !== 'special') this.healPerFrame = 0;
    this.state      = name;
    this.stateTimer = duration;
    this.frame      = 0;
    this.frameTimer = 0;
    this.locked     = duration > 0;
  }

  // ── Sprite atual com fallback ──────────────────────────────────────
  // Tenta obter o sprite exato para o estado atual.
  // Se não existir, percorre a cadeia FB[] até encontrar um disponível.
  // Isso permite o jogo funcionar mesmo sem todos os sprites gerados.
  _getCurrentSprite() {
    // Fallback em cadeia: tenta sprite dedicado → fallback1 → fallback2 → idle
    // Ordem: sprite do nome exato → sprite legado (nomes antigos) → punch/kick → idle
    const FB = {
      // Terra leves
      neutral_light:     ['punch', 'ground_light'],
      side_light:        ['punch', 'ground_light'],
      down_light:        ['kick',  'down_attack'],
      // Terra pesados (Sigs)
      neutral_heavy:     ['kick',  'ground_heavy'],
      side_heavy:        ['kick',  'ground_heavy'],
      down_heavy:        ['kick',  'down_attack'],
      // Ar leves
      air_neutral_light: ['punch', 'air_light'],
      air_side_light:    ['punch', 'air_light'],
      air_down_light:    ['kick',  'down_air'],
      // Ar pesados
      recovery:          ['punch', 'anti_air'],
      ground_pound:      ['kick',  'down_air'],
      // Estados
      hitstun:           ['hitstun'],
      knockdown:         ['hitstun'],
      crouch:            ['idle'],
      dodge:             ['idle'],
    };
    const tryGet = (k) => {
      const e = this.sprites[k]; if (!e) return null;
      if (Array.isArray(e)) {
        // Array de frames de animação
        const img = e[this.frame % e.length];
        if (img?.complete && img.naturalWidth > 0) return img;
        const i0 = e[0]; return (i0?.complete && i0.naturalWidth > 0) ? i0 : null;
      }
      return (e.complete && e.naturalWidth > 0) ? e : null;
    };
    // Tenta: sprite exato → cadeia de fallbacks → stance → idle
    const result = tryGet(this.state);
    if (result) return result;
    const fallbacks = FB[this.state];
    if (fallbacks) {
      for (const fb of fallbacks) {
        const r = tryGet(fb); if (r) return r;
      }
    }
    return tryGet('stance') || tryGet('idle') || null;
  }

  // ── Update ────────────────────────────────────────────────────────
  // Chamado 1x por frame (ou step) pelo game loop.
  // Ordem: hitstop → animação → timers → combate → input → física → bounds
  update(opponent) {
    // ── Hitstop (freeze frames no impacto) ───────────────────────
    // Congela AMBOS os personagens por alguns frames ao acertar um golpe.
    // Cria a sensação de impacto "pesado" — técnica clássica de fighting games.
    if (this.hitstop > 0) { this.hitstop--; return; }

    // ── Animação ──────────────────────────────────────────────────
    this.frameTimer++;
    const fps = ANIM_FPS[this.state] || 8;
    if (this.frameTimer >= 60 / fps) { this.frame++; this.frameTimer = 0; }

    if (this.invincible > 0) this.invincible--;
    if (this.dodgeInvul)     this.invincible = Math.max(this.invincible, 1);
    if (this.hitFlash   > 0) this.hitFlash--;
    if (this.dashTimer    > 0) this.dashTimer--;
    if (this.dashCooldown > 0) this.dashCooldown--;

    // ── Dodge timer ───────────────────────────────────────────────
    // Processa o dodge frame a frame:
    //   dodging → move o personagem na direção do dodge
    //   cooldown → aguarda antes de permitir novo dodge
    // Cooldowns Brawlhalla: chão=60f, ar=163f
    if (this.dodgeTimer > 0) {
      this.dodgeTimer--;
      // Move durante o dodge
      if (!this.spotDodge) {
        this.x += this.dodgeVx;
        if (!this.onGround) {
          this.y  += this.dodgeVy;
          this.vy  = this.dodgeVy * 0.3; // amortece velocidade vertical
        }
      }
      if (this.dodgeTimer <= 0) {
        this.dodgeInvul  = false;
        this.dodgeState  = 'cooldown';
        // Cooldown: chão=60f, ar=163f
        this.dodgeCooldown = this.onGround ? 60 : 163;
        this.gcWindow = 0;
      }
    }
    if (this.dodgeCooldown > 0) {
      this.dodgeCooldown--;
      // Tocar o chão dentro de 75f do air dodge → remove cooldown restante
      if (this.onGround && this.dodgeState === 'cooldown') {
        if (this.dodgeCooldown > 163 - 75) this.dodgeCooldown = 75;
        else { this.dodgeState = 'ready'; this.dodgeCooldown = 0; }
      }
      if (this.dodgeCooldown <= 0) this.dodgeState = 'ready';
    }

    // Gravity Cancel window (18f após spot dodge aéreo)
    // Durante esse tempo, pressionar J ou K executa um ground attack no ar
    if (this.gcWindow > 0) this.gcWindow--;

    // ── Dash em andamento ─────────────────────────────────────────
    if (this.isDashing) {
      this.dashFrames--;
      if (this.dashFrames <= 0) { this.isDashing = false; this.vx = 0; }
    }

    // ── Combo timer ───────────────────────────────────────────────
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }

    // ── Cancel window ────────────────────────────────────────────
    if (this.cancelWindow > 0) {
      this.cancelWindow--;
      // Executa input buffered se existir
      if (this.inputBuffer && this.cancelWindow > 0) {
        const fn = this.inputBuffer;
        this.inputBuffer = null;
        fn();
        return;
      }
      if (this.cancelWindow <= 0) this.inputBuffer = null;
    }

    // ── Hitstun ───────────────────────────────────────────────────
    // Enquanto em hitstun, o personagem não pode agir.
    // Se ainda estiver se movendo rápido (knockback), decai mais lento
    // (simula o hitstun estendido por velocidade do Brawlhalla).
    if (this.hitstun > 0) {
      // Estendido por velocidade (knock em movimento = hitstun maior)
      if (Math.abs(this.vx) > 2) this.hitstun = Math.max(this.hitstun - 0.5, 0);
      else                        this.hitstun--;
      if (this.hitstun <= 0 && this.state === 'hitstun') {
        if (this.knockdown) {
          this.setState('knockdown', 40);
        } else {
          this.setState(this.onGround ? 'idle' : 'jump');
          this.locked   = false;
          this.isAirborne = false;
        }
      }
    }

    // ── Knockdown recovery ────────────────────────────────────────
    // Estado especial após ground_pound ou especial: personagem fica
    // prostrado no chão por 40 frames antes de poder agir novamente.
    if (this.state === 'knockdown') {
      this.stateTimer--;
      if (this.stateTimer <= 0) {
        this.setState('idle'); this.locked = false;
        this.knockdown = false; this.juggleCount = 0;
        this.isAirborne = false;
      }
    }

    // ── Decai velocidade horizontal ───────────────────────────────
    // Simula atrito/arrasto: knockback diminui 20% por frame.
    // O personagem aplica vx na posição mesmo em hitstun/knockdown.
    this.vx *= 0.80;
    if (!this.locked || this.state === 'hitstun' || this.state === 'knockdown')
      this.x += this.vx;

    // ── Estado de ataque bloqueado ────────────────────────────────
    if (this.locked && this.state !== 'hitstun' && this.state !== 'knockdown') {
      this.stateTimer--;
      if (this.stateTimer <= 0) {
        this.locked = false;
        this.cancelWindow = 0;
        this.inputBuffer  = null;
        this.setState(this.onGround ? 'idle' : 'jump');
        this.attackPriority = 0;
      }
    }

    // ── Cura do especial ──────────────────────────────────────────
    if (this.state === 'special' && this.healPerFrame > 0) {
      this.hp = Math.min(this.maxHP, this.hp + this.healPerFrame);
      if (this.onHeal) this.onHeal();
    }

    // ── Input (só humano, não em hitstun/knockdown) ───────────────
    if (this.isPlayer && this.hitstun <= 0 && this.state !== 'knockdown')
      this._handleInput(opponent);

    // ── Física vertical ───────────────────────────────────────────
    // Gravidade aplicada a cada frame quando no ar.
    // Fast fall: segurar ↓ com vy > 0 aumenta gravidade em 1.8x.
    // Ao tocar o chão: restaura todos os pulos/recoveries.
    if (!this.onGround) {
      // Fast fall: gravidade aumentada ao segurar ↓ (só após delay pós-pulo)
      const gravMult = this.isFastFalling ? this.fastFallSpeed : 1.0;
      this.vy += this.gravity * gravMult;
      this.y  += this.vy;

      if (this.y >= this.groundY) {
        this.y = this.groundY; this.vy = 0; this.onGround = true;
        this.isFastFalling = false;
        this.isAirborne    = false;
        this.juggleCount   = 0;
        // Restaura pulos ao tocar o chão
        this.jumpsLeft      = 3;
        this.recoveriesLeft = 1;
        this.totalAirActions = 0;
        this.walkedOffEdge  = false;
        this.chaseDodgesLeft = 0;
        if (!this.locked && this.state !== 'hitstun' && this.state !== 'knockdown')
          this.setState('idle');
      }
    } else {
      // No chão: fast fall se segura ↓ (andar da borda)
      this.isFastFalling = false;
    }

    if (opponent && !this.locked) this.facing = opponent.x > this.x ? 1 : -1;
    this.x = Math.max(50, Math.min(900 - 50, this.x));
  }

  // ── Input — Brawlhalla Movement System ──────────────────────────
  // Processa todos os inputs do jogador humano.
  // Ordem de prioridade (maior → menor):
  //   Dodge > Dash > Movimento > Recovery > Ataques > Block > Pulo > Idle
  _handleInput(opponent) {
    const down   = Input.isHeld('arrowdown')  || Input.isHeld('s');
    const up     = Input.isHeld('arrowup')    || Input.isHeld('w');
    const left   = Input.isHeld('arrowleft')  || Input.isHeld('a');
    const right  = Input.isHeld('arrowright') || Input.isHeld('d');
    const side   = left || right;
    const pressJ = Input.wasPressed('j');
    const pressK = Input.wasPressed('k');
    const holdK  = Input.isHeld('k');
    const relK   = Input.wasReleased('k');
    const pressL = Input.wasPressed('l');
    const holdL  = Input.isHeld('l');

    // Não processa movimento durante dodge (exceto fast fall)
    const inDodge = this.dodgeTimer > 0;

    // ─────────────────────────────────────────────────────────────
    // DODGE (tecla L)
    // Brawlhalla: dodge direcional (8 direções) ou spot dodge (sem direção)
    // Duração: direcional=12f, spot aéreo=20f, spot terrestre=16f
    // Cooldown: chão=60f, ar=163f
    // Gravity Cancel: atacar em 18f após spot dodge aéreo = ground attack no ar
    // Após ataque: Chase Dodge (mais rápido, pode cancelar em ataque)
    // ─────────────────────────────────────────────────────────────
    if (pressL && this.dodgeState === 'ready' && this.hitstun <= 0 && !this.locked) {
      this._doDodge(up, down, left, right, side);
      return;
    }

    if (inDodge) {
      // Gravity Cancel: atacar dentro de 18f de spot dodge aéreo
      if (this.gcWindow > 0 && !this.onGround) {
        if (pressJ || pressK) {
          this._cancelDodgeWithAttack(pressJ, pressK, side, down, up, opponent);
          return;
        }
      }
      return; // nenhum outro input durante dodge
    }

    // ─────────────────────────────────────────────────────────────
    // DASH (double-tap lateral)
    // Pressionar a mesma direção 2x dentro de 16 frames → dash.
    // Dash aplica vx=10 por 12 frames, depois decai normalmente.
    // ─────────────────────────────────────────────────────────────
    if (!this.locked && !this.isDashing && this.dashCooldown <= 0 && this.onGround) {
      const pressLeft  = Input.wasPressed('arrowleft')  || Input.wasPressed('a');
      const pressRight = Input.wasPressed('arrowright') || Input.wasPressed('d');
      if (pressLeft) {
        if (this.dashLastDir === 'left' && this.dashTimer > 0) {
          this._startDash(-1);
        } else { this.dashLastDir = 'left'; this.dashTimer = 16; }
      }
      if (pressRight) {
        if (this.dashLastDir === 'right' && this.dashTimer > 0) {
          this._startDash(1);
        } else { this.dashLastDir = 'right'; this.dashTimer = 16; }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // MOVIMENTO LATERAL (sempre disponível fora do dodge)
    // ─────────────────────────────────────────────────────────────
    if (!this.locked) {
      const moveSpeed = this.isDashing ? this.speed * 2.5 : this.speed;
      if (left)  this.x -= moveSpeed;
      if (right) this.x += moveSpeed;
    }

    // ─────────────────────────────────────────────────────────────
    // JUMP — Brawlhalla: máx 4 ações aéreas (jumps+recoveries)
    // Combinações possíveis: 3J+1R, 2J+2R, 1J+3R
    // Andar da borda sem pular (walkedOffEdge) → só 3 ações totais
    // Dash jump: pular logo após dash herda o vx do dash
    // ─────────────────────────────────────────────────────────────
    if ((Input.wasPressed(' ') || Input.wasPressed('arrowup')) && !this.locked) {
      if (this.onGround) {
        // Pulo do chão
        const jumpVx = this.isDashing ? (this.vx * 0.8) : 0; // dash jump
        this.vx = jumpVx;
        this.vy = this.jumpForce;
        this.onGround = false;
        this.jumpsLeft--;
        this.totalAirActions++;
        this.isFastFalling = false;
        this.setState('jump', 20);
      } else {
        // Pulo aéreo — usa um dos pulos restantes
        const maxActions = this.walkedOffEdge ? 3 : 4;
        if (this.jumpsLeft > 0 && this.totalAirActions < maxActions) {
          this.vy = this.jumpForce * 0.9; // pulo aéreo ligeiramente menor
          this.jumpsLeft--;
          this.totalAirActions++;
          this.isFastFalling = false;
          this.setState('jump', 16);
        }
      }
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // FAST FALL — segurar ↓ no ar
    // Só ativa quando vy > 0 (caindo). Aumenta gravidade × 1.8.
    // Torna o personagem mais imprevisível e permite hits mais precisos.
    // ─────────────────────────────────────────────────────────────
    if (!this.onGround && down && this.vy > 0 && !this.locked) {
      this.isFastFalling = true;
    }
    if (!down) this.isFastFalling = false;

    // ─────────────────────────────────────────────────────────────
    // HEAVY CHARGE
    // ─────────────────────────────────────────────────────────────
    if (holdK && !this.locked) {
      this.heavyHeld++;
      if (this.heavyHeld >= 18) this.heavyCharged = true;
    } else if (!holdK) {
      this.heavyHeld = 0;
    }

    // ─────────────────────────────────────────────────────────────
    // ESPECIAL (↓+J no chão)
    // ─────────────────────────────────────────────────────────────
    if (!this.specialUsed && pressJ && down && this.onGround && !this.locked) {
      this._activateSpecial(opponent); return;
    }

    const inCancel = this.locked && this.cancelWindow > 0;

    // ─────────────────────────────────────────────────────────────
    // RECOVERY (K no ar)
    // Usa um dos recoveriesLeft. Conta como ação aérea.
    // Neutro (K): dá impulso vertical + ataque recovery
    // Baixo (↓+K): ground_pound — bate no chão com launcher
    // ─────────────────────────────────────────────────────────────
    if (!this.onGround && (!this.locked || inCancel) && (pressK || (relK && this.heavyCharged))) {
      const maxActions = this.walkedOffEdge ? 3 : 4;
      const charged    = relK && this.heavyCharged;

      // Recovery conta como ação aérea
      if (this.recoveriesLeft > 0 && this.totalAirActions < maxActions) {
        const isExhausted = this.recoveriesLeft < 1; // depois do 1º
        // Recovery exausto: menos altura, mais dano
        const fn = () => {
          if (down) {
            this._doAttack('ground_pound', 32, charged?26:20, 115, opponent, PRIORITY.AERIAL, true, charged);
          } else {
            // Recovery move: dá um pequeno impulso para cima
            if (!down) { this.vy = Math.min(this.vy, -6); }
            this._doAttack('recovery', 30, charged?22:16, 105, opponent, PRIORITY.AERIAL, false, charged);
          }
          if (charged) { this.heavyCharged = false; this.heavyHeld = 0; }
        };
        this.recoveriesLeft--;
        this.totalAirActions++;
        if (inCancel) { this.inputBuffer = fn; return; }
        fn(); return;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ATAQUES NO AR
    // ─────────────────────────────────────────────────────────────
    if (!this.onGround && (!this.locked || inCancel)) {
      if (pressJ) {
        const fn = () => {
          if (down)      this._doAttack('air_down_light',   22, 10, 110, opponent, PRIORITY.LIGHT);
          else if (side) this._doAttack('air_side_light',   20,  9,  95, opponent, PRIORITY.LIGHT);
          else           this._doAttack('air_neutral_light',20,  9,  95, opponent, PRIORITY.LIGHT);
        };
        if (inCancel) { this.inputBuffer = fn; return; }
        fn(); return;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // ATAQUES NO CHÃO
    // ─────────────────────────────────────────────────────────────
    if (this.onGround && (!this.locked || inCancel)) {
      if (pressJ) {
        const fn = () => {
          if (up || (!down && !side))
                         this._doAttack('neutral_light',18,10, 90,opponent,PRIORITY.LIGHT);
          else if (side) this._doAttack('side_light',   20,11, 95,opponent,PRIORITY.LIGHT);
          else           this._doAttack('down_light',   22,12,100,opponent,PRIORITY.LIGHT,true);
        };
        if (inCancel) { this.inputBuffer = fn; return; }
        fn(); return;
      }
      if (relK && this.heavyCharged) {
        const fn = () => {
          if (side)      this._doAttack('side_heavy',   36,24,115,opponent,PRIORITY.HEAVY,false,true);
          else if (down) this._doAttack('down_heavy',   38,26,115,opponent,PRIORITY.HEAVY,false,true);
          else           this._doAttack('neutral_heavy',34,22,110,opponent,PRIORITY.HEAVY,false,true);
          this.heavyCharged = false; this.heavyHeld = 0;
        };
        if (inCancel) { this.inputBuffer = fn; return; }
        fn(); return;
      }
      if (pressK) {
        const fn = () => {
          if (side)      this._doAttack('side_heavy',   32,20,115,opponent,PRIORITY.HEAVY);
          else if (down) this._doAttack('down_heavy',   34,22,115,opponent,PRIORITY.HEAVY,false);
          else           this._doAttack('neutral_heavy',30,18,110,opponent,PRIORITY.HEAVY);
        };
        if (inCancel) { this.inputBuffer = fn; return; }
        fn(); return;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // BLOCK (segurar L no chão, sem dodge)
    // ─────────────────────────────────────────────────────────────
    if (holdL && this.onGround && !this.locked && this.dodgeState !== 'ready') {
      if (this.state !== 'block') this.setState('block');
      return;
    } else if (this.state === 'block' && !holdL) {
      this.setState('idle');
    }

    // ─────────────────────────────────────────────────────────────
    // IDLE / WALK / CROUCH
    // ─────────────────────────────────────────────────────────────
    if (!this.locked && this.onGround) {
      if (down)      { if (this.state !== 'crouch') this.setState('crouch'); }
      else if (side) this.setState(this.sprites['walk'] ? 'walk' : 'stance');
      else           this.setState('idle');
    }
  }

  // ── Inicia Dodge ──────────────────────────────────────────────────
  _doDodge(up, down, left, right, side) {
    const isAir = !this.onGround;

    // Duração por tipo (Brawlhalla exato)
    // Direcional aéreo=12f, Spot aéreo=20f, Spot terrestre=16f
    let dur, invulDur, dvx, dvy;
    const DODGE_SPEED = 6;

    if (!left && !right && !up && !down) {
      // Spot dodge
      dur      = isAir ? 20 : 16;
      invulDur = dur;
      dvx = 0; dvy = 0;
      this.spotDodge = true;
      // Gravity Cancel disponível por 18f após spot dodge aéreo
      if (isAir) this.gcWindow = 18;
    } else {
      // Dodge direcional
      dur      = 12;
      invulDur = 12;
      this.spotDodge = false;
      dvx = left ? -DODGE_SPEED : right ? DODGE_SPEED : 0;
      dvy = up   ? -DODGE_SPEED * 0.8 : down ? DODGE_SPEED * 0.6 : 0;
      // Dodge diagonal para baixo no ar → desliza no chão
      if (isAir && down) { dvx *= 0.8; }
    }

    this.dodgeState  = 'dodging';
    this.dodgeTimer  = dur + 2; // +2 frames de startup
    this.dodgeInvul  = true;
    this.invincible  = invulDur;
    this.dodgeVx     = dvx;
    this.dodgeVy     = dvy;
    this.setState('dodge', dur + 2);
  }

  // ── Gravity Cancel — ataca dentro de 18f de spot dodge aéreo ─────
  _cancelDodgeWithAttack(pressJ, pressK, side, down, up, opponent) {
    // Executa ground attack no ar (GC)
    this.dodgeTimer = 0;
    this.dodgeInvul = false;
    this.gcWindow   = 0;
    this.locked     = false;

    if (pressJ) {
      if (up || (!down && !side)) this._doAttack('neutral_light',18,10,90,opponent,PRIORITY.LIGHT);
      else if (side)              this._doAttack('side_light',   20,11,95,opponent,PRIORITY.LIGHT);
      else                        this._doAttack('down_light',   22,12,100,opponent,PRIORITY.LIGHT,true);
    } else if (pressK) {
      if (side)      this._doAttack('side_heavy',   32,20,115,opponent,PRIORITY.HEAVY);
      else if (down) this._doAttack('down_heavy',   34,22,115,opponent,PRIORITY.HEAVY,false);
      else           this._doAttack('neutral_heavy',30,18,110,opponent,PRIORITY.HEAVY);
    }
  }

  // ── Inicia Dash ───────────────────────────────────────────────────
  _startDash(dir) {
    this.isDashing    = true;
    this.dashFrames   = 12;
    this.vx           = dir * 10;
    this.dashTimer    = 0;
    this.dashLastDir  = '';
    this.dashCooldown = 22;
    // Chase Dodge disponível após ataque: 2 se no chão
    this.chaseDodgesLeft = 2;
  }
  // ── Executa ataque ────────────────────────────────────────────────
  // Centraliza toda a lógica de um ataque:
  //   1. Seta estado do atacante (animação + lock)
  //   2. Verifica clash (mesma prioridade) ou prioridade
  //   3. Calcula dano com charge multiplier
  //   4. Calcula knockback via força variável (dmgAccum do alvo)
  //   5. Aplica juggle scaling (anti-infinite)
  //   6. Aplica hitstop em ambos
  //   7. Incrementa combo counter
  _doAttack(stateName, lockFrames, baseDmg, range, opponent,
            priority = PRIORITY.LIGHT, launcher = false, charged = false) {

    // Define cancel window com base no tipo de ataque
    const cw = CANCEL_WINDOW[stateName] || 0;

    this.setState(stateName, lockFrames);
    this.attackPriority = priority;
    this.cancelWindow   = cw;
    this.lastAttack     = stateName;
    this.inputBuffer    = null;

    if (!opponent || !this._inRange(opponent, range)) return;

    // Clash check
    if (opponent.locked && opponent.attackPriority === priority) {
      this._doClash(opponent); return;
    }
    if (opponent.locked && opponent.attackPriority > priority) return;

    // ── Calcula dano ──────────────────────────────────────────────
    const chargeMulti = charged ? 1.35 : 1.0;
    const dmg = Math.round(baseDmg * chargeMulti);

    // ── Força variável (Brawlhalla) ───────────────────────────────
    const accum     = opponent.dmgAccum;
    const fScale    = Math.max(0.5, accum/100 + accum*accum/20000);
    const baseForce = ATTACK_BASE_FORCE[stateName] || 10;
    let   knockback = Math.round(baseForce * fScale * chargeMulti);

    // ── Juggle scaling (anti-infinite) ───────────────────────────
    // Cada hit no ar reduz hitstun e knockback do próximo
    let juggleScale = 1.0;
    if (opponent.isAirborne || !opponent.onGround) {
      opponent.juggleCount++;
      // Decai exponencialmente: hit1=100%, hit2=80%, hit3=64%, hit4=51%...
      juggleScale = Math.pow(0.80, opponent.juggleCount - 1);
      knockback   = Math.round(knockback * juggleScale);
    }

    // ── Hitstun ───────────────────────────────────────────────────
    const baseHitstun = HITSTUN_MS[stateName] || 170;
    const hitstunMs   = Math.round(baseHitstun * juggleScale);
    const hitstunF    = Math.max(4, Math.round(hitstunMs / (1000/60)));

    // ── Hit reaction ──────────────────────────────────────────────
    const reaction = HIT_REACTION[stateName] || 'grounded';

    // ── Hitstop (freeze no impacto — game feel) ───────────────────
    const stopFrames = HITSTOP_FRAMES[stateName] || 3;
    this.hitstop     = stopFrames;
    opponent.hitstop = stopFrames;

    // ── Combo counter ─────────────────────────────────────────────
    this.comboCount++;
    this.comboTimer = 90; // janela de 1.5s para continuar o combo
    if (this.onCombo) this.onCombo(this.comboCount, stateName);

    opponent.takeHit(dmg, this, hitstunF, knockback, launcher, reaction);
  }

  // ── Clash ─────────────────────────────────────────────────────────
  // Ocorre quando dois ataques de mesma prioridade se acertam no mesmo frame.
  // Ambos os personagens são afastados sem receber dano.
  _doClash(opponent) {
    const dir = this.x < opponent.x ? -1 : 1;
    this.vx = dir * 5; opponent.vx = -dir * 5;
    this.setState('idle'); this.locked = false; this.attackPriority = 0;
    this.cancelWindow = 0; this.inputBuffer = null;
    opponent.setState('idle'); opponent.locked = false; opponent.attackPriority = 0;
    opponent.cancelWindow = 0; opponent.inputBuffer = null;
    if (this.onClash) this.onClash();
  }

  // ── Especial ──────────────────────────────────────────────────────
  _activateSpecial(opponent) {
    this.specialUsed    = true;
    this.attackPriority = PRIORITY.HEAVY;

    if (this.charId === 1) {
      const F = 140;
      this.setState('special', F);
      this.healPerFrame = 60 / F;
      this.invincible   = F;
    } else {
      this.setState('special', 50);
      if (opponent && this._inRange(opponent, 180)) {
        const accum  = opponent.dmgAccum;
        const fscale = Math.max(0.5, accum/100 + accum*accum/20000);
        const kn     = Math.round(28 * fscale);
        this.hitstop = opponent.hitstop = 6;
        this.comboCount++; this.comboTimer = 90;
        if (this.onCombo) this.onCombo(this.comboCount, 'special');
        opponent.takeHit(45, this, Math.round(320/(1000/60)), kn, false, 'knockdown');
      }
    }
  }

  // ── Receber dano ──────────────────────────────────────────────────
  // Aplica dano, hitstun, knockback e reação visual.
  // Reações possíveis: grounded | knockback | airborne | knockdown
  // Block: reduz dano para 15% e reduz hitstun
  // knockback = força variável já calculada pelo _doAttack
  takeHit(damage, attacker, hitstunFrames, knockback, launcher = false,
          reaction = 'grounded') {
    if (this.invincible > 0) return;

    const blocked = this.state === 'block';

    // Alguns ataques quebram o block (heavies carregados)
    const blockBreak = launcher && blocked;
    const actualBlock = blocked && !blockBreak;
    const actual = actualBlock ? Math.floor(damage * 0.15) : damage;

    this.hp       = Math.max(0, this.hp - actual);
    this.hitFlash = actualBlock ? 4 : 12;

    if (!actualBlock) {
      this.dmgAccum += actual;
      this.cancelWindow = 0;
      this.inputBuffer  = null;

      // Determina reação ao hit
      this.hitReaction = reaction;
      this.hitstun     = hitstunFrames;
      this.locked      = true;
      this.setState('hitstun', hitstunFrames);

      // Knockback horizontal
      const dir = attacker.x < this.x ? 1 : -1;
      this.vx   = dir * Math.min(knockback, 32);

      // Reações específicas
      switch (reaction) {
        case 'airborne':
        case 'launcher':
          // Lança para cima — inicia juggle
          this.vy        = -15;
          this.onGround  = false;
          this.isAirborne = true;
          break;
        case 'knockdown':
          // Vai ao chão e fica derrubado
          this.knockdown = true;
          if (!this.onGround) { this.vy = -6; this.onGround = false; }
          break;
        case 'knockback':
          // Recuo forte horizontal, pode derrubar se na borda
          this.vx = dir * Math.min(knockback * 1.5, 40);
          break;
        // 'grounded': padrão — fica no chão em hitstun
      }

      if (launcher && reaction !== 'airborne') {
        this.vy = -15; this.onGround = false; this.isAirborne = true;
      }
    }

    this.invincible = actualBlock ? 6 : 14;
    if (this.onHit) this.onHit(actual, this.x, this.y - this.height * 0.6, reaction);
  }

  _inRange(o, r) { return Math.abs(this.x - o.x) < r; }

  // ── Reset (nova partida) ──────────────────────────────────────────
  // Chamado ao iniciar uma nova luta (applySelection) ou revanche.
  // Zera todos os estados de combate, física e movimento.
  resetCombat() {
    this.comboCount = 0; this.comboTimer = 0;
    this.cancelWindow = 0; this.inputBuffer = null;
    this.lastAttack = ''; this.juggleCount = 0;
    this.hitReaction = 'grounded';
    this.isAirborne = false; this.knockdown = false;
    this.hitstop = 0; this.hitstun = 0;
    this.heavyHeld = 0; this.heavyCharged = false;
    this.dashTimer = 0; this.dashLastDir = ''; this.dashCooldown = 0;
    this.isDashing = false; this.dashFrames = 0;
    this.jumpsLeft = 3; this.recoveriesLeft = 1;
    this.totalAirActions = 0; this.walkedOffEdge = false;
    this.isFastFalling = false;
    this.dodgeState = 'ready'; this.dodgeTimer = 0; this.dodgeCooldown = 0;
    this.dodgeInvul = false; this.gcWindow = 0; this.chaseDodgesLeft = 0;
    this.specialUsed = false; this.healPerFrame = 0;
    this.dmgAccum = 0; this.vx = 0; this.attackPriority = 0;
  }

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
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#111';
      ctx.fillRect(this.x - 24, this.y - h - 12, 48, 6);
      ctx.fillStyle = pct >= 1 ? '#ffe000' : '#aaaaff';
      ctx.fillRect(this.x - 24, this.y - h - 12, 48 * pct, 6);
      ctx.restore();
    }

    if (this.hitstun > 0) this._drawStars(ctx);
  }

  _drawStars(ctx) {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const a = Date.now()/200 + i*(Math.PI*2/3);
      ctx.fillStyle = '#ffe000'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('★', this.x + Math.cos(a)*18, this.y - this.height - 14 + Math.sin(a)*6);
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
    const LA = ['neutral_light','side_light','air_neutral_light','air_side_light','recovery','special'];
    const HA = ['neutral_heavy','side_heavy','down_heavy','down_light','air_down_light','ground_pound'];
    if (LA.includes(this.state)) {
      ctx.fillRect(cx+w*.22, y+h*.32, w*.28, h*.10);
      ctx.fillRect(cx-w*.28, y+h*.35, w*.16, h*.10);
    } else if (HA.includes(this.state)) {
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
      ctx.save(); ctx.globalAlpha = 0.45 + 0.25*Math.sin(Date.now()/70);
      const g = ctx.createRadialGradient(cx,y+h*.5,0,cx,y+h*.5,w*.7);
      g.addColorStop(0, isP1 ? '#00ff88' : '#ff88dd'); g.addColorStop(1,'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx,y+h*.5,w*.7,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    if (!this.onGround) {
      ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(cx,this.groundY+6,w*.32,7,0,0,Math.PI*2);
      ctx.fill(); ctx.restore();
    }
  }
}

// ── Prioridade de ataque (maior = vence clash) ────────────────────
// Quando dois ataques se acertam simultaneamente, o de maior prioridade
// causa dano. Mesma prioridade → Clash (ambos afastados).
const PRIORITY = { AERIAL: 1, LIGHT: 2, HEAVY: 3 };

// ── Hit Reactions por ataque ─────────────────────────────────────
// Define o tipo de reação que o alvo terá ao ser atingido.
// grounded  = fica no chão em hitstun (leve)
// knockback = recuo forte horizontal
// airborne  = lançado para cima (juggle)
// knockdown = derrubado ao chão
const HIT_REACTION = {
  neutral_light:     'grounded',
  side_light:        'grounded',
  down_light:        'airborne',    // launcher — lança para cima
  neutral_heavy:     'knockback',   // Sig — recua
  side_heavy:        'knockback',   // Sig — recua
  down_heavy:        'knockback',   // Sig — recuo forte
  air_neutral_light: 'grounded',
  air_side_light:    'knockback',
  air_down_light:    'grounded',
  recovery:          'grounded',
  ground_pound:      'knockdown',   // bate no chão — derruba
  special:           'knockdown',
};

// ── Cancel Windows (frames após ataque para cancelar em outro) ────
// Durante a cancel window, um novo input é aceito e bufferizado.
// O próximo ataque executa automaticamente ao terminar a janela.
// Leves: janela grande = fácil de encadear combos
// Pesados: janela menor = mais difícil, mais recompensador
const CANCEL_WINDOW = {
  neutral_light:     14,   // leve neutro → pode encadear facilmente
  side_light:        12,   // leve lateral
  down_light:        10,   // leve baixo
  neutral_heavy:      6,   // sig — janela pequena
  side_heavy:         5,
  down_heavy:         4,
  air_neutral_light: 12,
  air_side_light:    10,
  air_down_light:     8,
  recovery:           6,
  ground_pound:       4,
  special:            0,   // especial não cancela em nada
};

// ── Hitstop (freeze frames no impacto) ────────────────────────────
// Ambos os personagens ficam congelados por N frames ao acertar.
// Técnica universal em fighting games para dar "peso" aos golpes.
// Mais hitstop = golpe parece mais pesado
const HITSTOP_FRAMES = {
  neutral_light:      2,
  side_light:         2,
  down_light:         3,
  neutral_heavy:      6,
  side_heavy:         6,
  down_heavy:         7,
  air_neutral_light:  2,
  air_side_light:     2,
  air_down_light:     3,
  recovery:           5,
  ground_pound:       7,
  special:            8,
};

// ── Hitstun por ataque (ms) ───────────────────────────────────────
// Tempo que o alvo fica em hitstun após ser atingido.
// Leves: menos hitstun = janela menor para combo follow-up
// Pesados/Sigs: mais hitstun = mais tempo para combo
const HITSTUN_MS = {
  neutral_light:     170,
  side_light:        180,
  down_light:        190,
  neutral_heavy:     260,
  side_heavy:        260,
  down_heavy:        300,
  air_neutral_light: 165,
  air_side_light:    175,
  air_down_light:    185,
  recovery:          240,
  ground_pound:      280,
  special:           320,
};

// ── Força base (escala com dmgAccum via fórmula Brawlhalla) ───────
// Knockback final = baseForce × (dmgAccum/100 + dmgAccum²/20000)
// Quanto mais dano acumulado o alvo tem, mais longe ele voa.
const ATTACK_BASE_FORCE = {
  neutral_light:      7,
  side_light:         8,
  down_light:         6,
  neutral_heavy:     18,
  side_heavy:        20,
  down_heavy:        16,
  air_neutral_light:  6,
  air_side_light:     8,
  air_down_light:     5,
  recovery:          13,
  ground_pound:      11,
  special:           22,
};

// ── FPS de animação ───────────────────────────────────────────────
const ANIM_FPS = {
  idle: 6, walk: 4, stance: 8, crouch: 6,
  jump: 10, block: 4, hitstun: 12, knockdown: 8, dodge: 12,
  neutral_light: 20, side_light: 20, down_light: 18,
  neutral_heavy: 12, side_heavy: 12, down_heavy: 12,
  air_neutral_light: 20, air_side_light: 20, air_down_light: 18,
  recovery: 14, ground_pound: 14, special: 3,
};
