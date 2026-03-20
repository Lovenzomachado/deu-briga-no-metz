// ─── Character Select Screen — estilo Street Fighter 98 ──────────
// Renderizado inteiramente em Canvas 2D para ter controle total
// sobre a estética retrô arcade: fundo degradê escuro, grid de
// portraits com cursor piscante, banner VS animado, scanlines.
//
// Layout:
//   Topo:    título "SELECT YOUR FIGHTER" em fonte arcade
//   Centro:  portrait grande P1 (esquerda) | grid | portrait CPU (direita)
//   Baixo:   nome do personagem + barra de stats + hint de controles

const CharSelect = (() => {

  // ── Catálogo de personagens ────────────────────────────────────
  // Para adicionar personagens: empurre um objeto neste array.
  // charId: 1=Henrique moveset, 2=Fezo moveset
  // Personagens sem sprite usam o _drawPlaceholder do player.js
  const ROSTER = [
    {
      id: 'metz', name: 'HENRIQUE', subtitle: 'O FUNDADOR', charId: 1,
      folder: 'sprites/metz', portrait: 'sprites/metz/idle.png',
      color: [58, 140, 63], glow: '#00ff88',
      stats: { POWER: 7, SPEED: 8, DEFENSE: 5, SPECIAL: 7 },
      walkFrames: [
        'sprites/metz/walk/walk1.png','sprites/metz/walk/walk2.png',
        'sprites/metz/walk/walk3.png','sprites/metz/walk/walk4.png',
        'sprites/metz/walk/walk5.png','sprites/metz/walk/walk6.png',
        'sprites/metz/walk/walk7.png','sprites/metz/walk/walk8.png',
      ],
    },
    {
      id: 'mila', name: 'FEZO', subtitle: 'A BARISTA', charId: 2,
      folder: 'sprites/mila', portrait: 'sprites/mila/idle.png',
      color: [139, 58, 106], glow: '#ff88dd',
      stats: { POWER: 8, SPEED: 6, DEFENSE: 7, SPECIAL: 9 },
      walkFrames: [
        'sprites/mila/walk/walk1.png','sprites/mila/walk/walk2.png',
        'sprites/mila/walk/walk3.png','sprites/mila/walk/walk4.png',
        'sprites/mila/walk/walk5.png','sprites/mila/walk/walk6.png',
        'sprites/mila/walk/walk7.png','sprites/mila/walk/walk8.png',
      ],
    },
    // ── Personagens sem sprite (placeholder) ──────────────────────
    { id:'lovenzo',   name:'LOVENZO',    subtitle:'???', charId:1, folder:'sprites/lovenzo',   portrait:'', color:[220,80,60],   glow:'#ff4422', stats:{POWER:8,SPEED:7,DEFENSE:6,SPECIAL:5} },
    { id:'billy',     name:'BILLY',      subtitle:'???', charId:2, folder:'sprites/billy',     portrait:'', color:[60,120,220],  glow:'#3388ff', stats:{POWER:6,SPEED:9,DEFENSE:5,SPECIAL:7} },
    { id:'pande',     name:'PANDE',      subtitle:'???', charId:1, folder:'sprites/pande',     portrait:'', color:[180,60,200],  glow:'#cc44ff', stats:{POWER:7,SPEED:6,DEFENSE:8,SPECIAL:6} },
    { id:'navi',      name:'NAVI',       subtitle:'???', charId:2, folder:'sprites/navi',      portrait:'', color:[60,200,180],  glow:'#00ffcc', stats:{POWER:5,SPEED:10,DEFENSE:4,SPECIAL:8} },
    { id:'siririck',  name:'SIRIRICK',   subtitle:'???', charId:1, folder:'sprites/siririck',  portrait:'', color:[200,160,40],  glow:'#ffcc00', stats:{POWER:9,SPEED:5,DEFENSE:7,SPECIAL:6} },
    { id:'cxntia',    name:'CXNTIA',     subtitle:'???', charId:2, folder:'sprites/cxntia',    portrait:'', color:[220,100,140], glow:'#ff66aa', stats:{POWER:6,SPEED:8,DEFENSE:6,SPECIAL:9} },
    { id:'marea',     name:'MAREA',      subtitle:'???', charId:1, folder:'sprites/marea',     portrait:'', color:[40,140,200],  glow:'#22aaff', stats:{POWER:7,SPEED:7,DEFENSE:7,SPECIAL:7} },
    { id:'rod',       name:'ROD',        subtitle:'???', charId:2, folder:'sprites/rod',       portrait:'', color:[160,60,60],   glow:'#ff2244', stats:{POWER:10,SPEED:6,DEFENSE:8,SPECIAL:4} },
    { id:'carolis',   name:'CAROLIS',    subtitle:'???', charId:1, folder:'sprites/carolis',   portrait:'', color:[60,180,100],  glow:'#44ff88', stats:{POWER:6,SPEED:7,DEFENSE:9,SPECIAL:5} },
    { id:'otaviu',    name:'OTAVIU',     subtitle:'???', charId:2, folder:'sprites/otaviu',    portrait:'', color:[200,120,60],  glow:'#ff8833', stats:{POWER:8,SPEED:8,DEFENSE:5,SPECIAL:7} },
    { id:'duda',      name:'DUDA',       subtitle:'???', charId:1, folder:'sprites/duda',      portrait:'', color:[100,60,200],  glow:'#8844ff', stats:{POWER:7,SPEED:9,DEFENSE:4,SPECIAL:8} },
    { id:'anna',      name:'ANNA',       subtitle:'???', charId:2, folder:'sprites/anna',      portrait:'', color:[220,180,60],  glow:'#ffdd33', stats:{POWER:5,SPEED:8,DEFENSE:7,SPECIAL:9} },
    { id:'luffany',   name:'LUFFANY',    subtitle:'???', charId:1, folder:'sprites/luffany',   portrait:'', color:[60,200,220],  glow:'#00ddff', stats:{POWER:6,SPEED:10,DEFENSE:5,SPECIAL:7} },
    { id:'july',      name:'JULY',       subtitle:'???', charId:2, folder:'sprites/july',      portrait:'', color:[200,80,160],  glow:'#ff44cc', stats:{POWER:7,SPEED:7,DEFENSE:6,SPECIAL:8} },
    { id:'mec7',      name:'MEC7',       subtitle:'???', charId:1, folder:'sprites/mec7',      portrait:'', color:[80,80,80],    glow:'#aaaaaa', stats:{POWER:9,SPEED:6,DEFENSE:9,SPECIAL:4} },
    { id:'zeg',       name:'ZEG',        subtitle:'???', charId:2, folder:'sprites/zeg',       portrait:'', color:[140,200,60],  glow:'#aaff22', stats:{POWER:8,SPEED:8,DEFENSE:6,SPECIAL:6} },
    { id:'amandinha', name:'AMANDINHA',  subtitle:'???', charId:1, folder:'sprites/amandinha', portrait:'', color:[220,140,180], glow:'#ff99cc', stats:{POWER:5,SPEED:9,DEFENSE:6,SPECIAL:9} },
    { id:'dudablini', name:'DUDA BLINI', subtitle:'???', charId:2, folder:'sprites/dudablini', portrait:'', color:[60,100,180],  glow:'#4466ff', stats:{POWER:7,SPEED:6,DEFENSE:8,SPECIAL:7} },
    { id:'neves',     name:'NEVES',      subtitle:'???', charId:1, folder:'sprites/neves',     portrait:'', color:[180,220,220], glow:'#aaffff', stats:{POWER:8,SPEED:7,DEFENSE:7,SPECIAL:6} },
    { id:'isabela',   name:'ISA E BELA', subtitle:'???', charId:2, folder:'sprites/isabela',   portrait:'', color:[200,60,200],  glow:'#ff33ff', stats:{POWER:6,SPEED:8,DEFENSE:7,SPECIAL:8} },
    { id:'ujnior',    name:'UJNIOR',     subtitle:'???', charId:1, folder:'sprites/ujnior',    portrait:'', color:[220,160,60],  glow:'#ffaa22', stats:{POWER:9,SPEED:7,DEFENSE:6,SPECIAL:6} },
  ];

  // ── Pre-load de imagens ────────────────────────────────────────
  // _img = portrait pequeno para o card do grid
  // _splash = arte grande para o painel lateral (splash art separada)
  ROSTER.forEach(c => {
    c._img = null;
    c._splash = null;
    if (c.portrait) {
      const img = new Image(); img.src = c.portrait; c._img = img;
    }
    // Splash art: sprites/[id]/splash.png (opcional, carregada automaticamente)
    const splash = new Image();
    splash.src = `sprites/${c.id}/splash.png`;
    splash.onload = () => { c._splash = splash; };
    // Não seta se não carregar (usa placeholder)
  });

  // ── Canvas principal ───────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'charselect-overlay';
  overlay.innerHTML = `<canvas id="cs-canvas"></canvas>`;
  document.body.appendChild(overlay);

  const canvas = document.getElementById('cs-canvas');
  const ctx    = canvas.getContext('2d');

  // Dimensões internas fixas (escala via CSS como o canvas do jogo)
  const CW = 900, CH = 560;
  canvas.width  = CW;
  canvas.height = CH;

  // ── Estado ────────────────────────────────────────────────────
  let selectedIdx  = 0;
  let hoveredIdx   = -1; // mobile: card com hover sem confirmar
  let confirmedIdx = -1;
  let onConfirmCb  = null;
  let animFrame    = null;
  let playAgainFlag = false;
  let tick         = 0;

  // Dimensões do grid de cards
  const COLS     = 8;
  const ROWS     = Math.ceil(ROSTER.length / COLS);
  const CARD_W   = 62;
  const CARD_H   = 68;
  const CARD_GAP = 5;
  const GRID_W   = COLS * (CARD_W + CARD_GAP) - CARD_GAP;
  // Grid centralizado entre as zonas dos personagens grandes (195px cada lado)
  const SIDE_W   = 195;
  const GRID_X   = SIDE_W + (CW - SIDE_W*2 - GRID_W) / 2;
  const GRID_Y   = 75;

  // ── Fonte pixel (garante estética retrô) ─────────────────────
  const FONT_TITLE = "bold 22px 'Press Start 2P', 'Courier New', monospace";
  const FONT_NAME  = "bold 18px 'Press Start 2P', 'Courier New', monospace";
  const FONT_SMALL = "bold 8px 'Press Start 2P', 'Courier New', monospace";
  const FONT_TINY  = "7px 'Press Start 2P', 'Courier New', monospace";

  // ── Render principal ──────────────────────────────────────────
  function render() {
    if (!overlay.classList.contains('visible')) return;
    tick++;
    animFrame = requestAnimationFrame(render);

    ctx.clearRect(0, 0, CW, CH);

    drawBackground();
    drawTitle();
    drawGrid();
    drawPortraits();
    drawCharInfo();
    drawHint();
    drawScanlines();

    if (confirmedIdx !== -1) drawVSBanner();
    if (playAgainFlag)       drawPlayAgain();
  }

  // ── Background estilo SF98 ────────────────────────────────────
  function drawBackground() {
    // Degradê azul escuro → preto (fundo clássico de charselect arcade)
    const bg = ctx.createLinearGradient(0, 0, 0, CH);
    bg.addColorStop(0,   '#060818');
    bg.addColorStop(0.5, '#0a0f2e');
    bg.addColorStop(1,   '#000005');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CW, CH);

    // Grade de linhas finas azuis (estética de tela CRT/SF98)
    ctx.strokeStyle = 'rgba(30,60,180,0.12)';
    ctx.lineWidth   = 1;
    for (let x = 0; x < CW; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
    }
    for (let y = 0; y < CH; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
    }

    // Barra horizontal dourada no topo (como o header das arcades)
    const bar = ctx.createLinearGradient(0, 0, CW, 0);
    bar.addColorStop(0,    'transparent');
    bar.addColorStop(0.1,  '#b8860b');
    bar.addColorStop(0.5,  '#ffd700');
    bar.addColorStop(0.9,  '#b8860b');
    bar.addColorStop(1,    'transparent');
    ctx.fillStyle = bar;
    ctx.fillRect(0, 54, CW, 3);
    ctx.fillRect(0, 58, CW, 1);

    // Barra na base
    ctx.fillRect(0, CH - 62, CW, 3);
    ctx.fillRect(0, CH - 58, CW, 1);
  }

  // ── Título ────────────────────────────────────────────────────
  function drawTitle() {
    // "SELECT YOUR FIGHTER" com brilho pulsante
    const pulse = 0.85 + Math.sin(tick * 0.04) * 0.15;
    ctx.save();
    ctx.textAlign = 'center';

    // Sombra dourada
    ctx.shadowColor = `rgba(255, 200, 0, ${pulse * 0.8})`;
    ctx.shadowBlur  = 18;
    ctx.fillStyle   = `rgba(255, 220, 60, ${pulse})`;
    ctx.font        = FONT_TITLE;
    ctx.fillText('SELECT YOUR FIGHTER', CW / 2, 40);

    // Borda vermelha (estética SF98: texto com contorno)
    ctx.shadowBlur  = 0;
    ctx.strokeStyle = '#8b0000';
    ctx.lineWidth   = 2;
    ctx.strokeText('SELECT YOUR FIGHTER', CW / 2, 40);
    ctx.restore();
  }

  // ── Grid de portraits ─────────────────────────────────────────
  function drawGrid() {
    ROSTER.forEach((char, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x   = GRID_X + col * (CARD_W + CARD_GAP);
      const y   = GRID_Y + row * (CARD_H + CARD_GAP);

      const isSelected  = i === selectedIdx;
      const isConfirmed = i === confirmedIdx;

      // ── Fundo do card ─────────────────────────────────────────
      // SF98: fundo escuro com leve gradiente por personagem
      const [r, g, b] = char.color;
      const cardBg = ctx.createLinearGradient(x, y, x, y + CARD_H);
      cardBg.addColorStop(0, `rgba(${r},${g},${b},0.35)`);
      cardBg.addColorStop(1, `rgba(${r},${g},${b},0.08)`);
      ctx.fillStyle = cardBg;
      ctx.fillRect(x, y, CARD_W, CARD_H);

      // ── Portrait ──────────────────────────────────────────────
      if (char._img && char._img.complete && char._img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, CARD_W, CARD_H - 16);
        ctx.clip();
        const iw = char._img.naturalWidth;
        const ih = char._img.naturalHeight;
        const sc = Math.min(CARD_W / iw, (CARD_H - 16) / ih) * 0.92;
        const dw = iw * sc, dh = ih * sc;
        const dx = x + (CARD_W - dw) / 2;
        const dy = y + (CARD_H - 16 - dh);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(char._img, dx, dy, dw, dh);
        ctx.restore();
      } else {
        // Sem sprite: silhueta ? colorida
        const [r,g,b] = char.color;
        const cardCx = x + CARD_W / 2;
        const cardCy = y + (CARD_H - 16) / 2;
        ctx.save();
        ctx.fillStyle = `rgba(${r},${g},${b},0.25)`;
        ctx.fillRect(x, y, CARD_W, CARD_H - 16);
        ctx.fillStyle = char.glow;
        ctx.font = `bold ${isSelected ? 22 : 18}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = char.glow;
        ctx.shadowBlur = isSelected ? 10 : 4;
        ctx.fillText('?', cardCx, cardCy);
        ctx.shadowBlur = 0;
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
      }

      // ── Borda do card ─────────────────────────────────────────
      if (isSelected) {
        // Cursor piscante dourado (estilo arcade)
        const cursorOn = Math.floor(tick / 6) % 2 === 0;
        if (cursorOn || isConfirmed) {
          // Borda dupla: externa escura, interna dourada brilhante
          ctx.strokeStyle = '#000';
          ctx.lineWidth   = 4;
          ctx.strokeRect(x, y, CARD_W, CARD_H);

          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur  = 14;
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth   = 2;
          ctx.strokeRect(x + 1, y + 1, CARD_W - 2, CARD_H - 2);
          ctx.shadowBlur  = 0;

          // Cantos decorativos (estilo SF98)
          const cs = 8; // tamanho do canto
          ctx.strokeStyle = '#fff';
          ctx.lineWidth   = 2;
          [[x,y],[x+CARD_W,y],[x,y+CARD_H],[x+CARD_W,y+CARD_H]].forEach(([cx,cy]) => {
            const sx = cx === x ? 1 : -1;
            const sy = cy === y ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(cx + sx * cs, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy + sy * cs);
            ctx.stroke();
          });
        }
      } else {
        // Borda simples para cards não selecionados
        ctx.strokeStyle = `rgba(${char.color[0]},${char.color[1]},${char.color[2]},0.5)`;
        ctx.lineWidth   = 1;
        ctx.strokeRect(x, y, CARD_W, CARD_H);
      }

      // ── Nome embaixo do card ──────────────────────────────────
      ctx.fillStyle = isSelected ? '#ffd700' : 'rgba(180,180,180,0.8)';
      ctx.font      = FONT_TINY;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (isSelected) {
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur  = 6;
      }
      ctx.fillText(char.name.substring(0, 8), x + CARD_W / 2, y + CARD_H - 8);
      ctx.shadowBlur  = 0;
      ctx.textBaseline = 'alphabetic';
    });
  }

  // ── Portraits grandes P1 e CPU ────────────────────────────────
  // Aparecem nos cantos esquerdo e direito — estética SF98
  function drawPortraits() {
    const char   = ROSTER[selectedIdx];
    const cpuIdx = confirmedIdx !== -1
      ? (confirmedIdx + 1) % ROSTER.length
      : (selectedIdx + 1) % ROSTER.length;
    const cpuChar = ROSTER[cpuIdx];

    _drawBigPortrait(char,    30,  CH - 65, 120, 190, true);  // P1 esquerda
    _drawBigPortrait(cpuChar, CW - 150, CH - 65, 120, 190, false); // CPU direita
  }

  function _drawBigPortrait(char, x, y, maxW, maxH, flipRight) {
    if (!char._img || !char._img.complete || !char._img.naturalWidth) return;

    const iw = char._img.naturalWidth;
    const ih = char._img.naturalHeight;
    const sc = Math.min(maxW / iw, maxH / ih);
    const dw = iw * sc, dh = ih * sc;

    // Quadro estilo SF98 com gradiente lateral
    const [r, g, b] = char.color;
    const frameGrad = ctx.createLinearGradient(x - 10, 0, x + maxW + 10, 0);
    frameGrad.addColorStop(0,   `rgba(${r},${g},${b},0.6)`);
    frameGrad.addColorStop(0.5, `rgba(${r},${g},${b},0.15)`);
    frameGrad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = frameGrad;
    ctx.fillRect(x - 10, y - dh, maxW + 20, dh + 20);

    // Sombra na base
    const shadow = ctx.createLinearGradient(0, y - 20, 0, y + 4);
    shadow.addColorStop(0, 'rgba(0,0,0,0)');
    shadow.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = shadow;
    ctx.fillRect(x - 5, y - 20, maxW + 10, 24);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (flipRight) {
      ctx.translate(x + dw, y - dh);
      ctx.scale(-1, 1);
      ctx.drawImage(char._img, 0, 0, dw, dh);
    } else {
      ctx.drawImage(char._img, x, y - dh, dw, dh);
    }
    ctx.restore();
  }

  // ── Info do personagem selecionado ────────────────────────────
  function drawCharInfo() {
    const char = ROSTER[selectedIdx];
    const infoY = GRID_Y + ROWS * (CARD_H + CARD_GAP) + 18;
    const cx    = CW / 2;

    // Nome do personagem (grande, dourado, SF98)
    ctx.save();
    ctx.textAlign   = 'center';
    ctx.font        = FONT_NAME;
    ctx.fillStyle   = char.glow;
    ctx.shadowColor = char.glow;
    ctx.shadowBlur  = 16;
    ctx.fillText(char.name, cx, infoY);

    // Subtítulo
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = '#888';
    ctx.font        = FONT_TINY;
    ctx.fillText(char.subtitle, cx, infoY + 18);
    ctx.restore();

    // Barras de stats — linha horizontal abaixo do nome
    const barY     = infoY + 36;
    const barW     = 90;
    const barH     = 7;
    const barGap   = 14;
    const entries  = Object.entries(char.stats);
    const totalW   = entries.length * (barW + 40) - 4;
    let   startX   = cx - totalW / 2;

    entries.forEach(([label, val]) => {
      // Label
      ctx.fillStyle    = '#aaa';
      ctx.font         = FONT_TINY;
      ctx.textAlign    = 'left';
      ctx.fillText(label, startX, barY + barH - 1);

      // Fundo da barra
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(startX + 38, barY - barH + 2, barW, barH);

      // Preenchimento com cor do personagem
      const [r, g, b] = char.color;
      const fill = ctx.createLinearGradient(startX + 38, 0, startX + 38 + barW, 0);
      fill.addColorStop(0, `rgb(${r},${g},${b})`);
      fill.addColorStop(1, `rgba(${r},${g},${b},0.4)`);
      ctx.fillStyle = fill;
      ctx.fillRect(startX + 38, barY - barH + 2, barW * (val / 10), barH);

      // Borda da barra
      ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`;
      ctx.lineWidth   = 1;
      ctx.strokeRect(startX + 38, barY - barH + 2, barW, barH);

      startX += barW + 42;
    });
  }

  // ── Hint de controles ─────────────────────────────────────────
  function drawHint() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#444';
    ctx.font      = FONT_TINY;
    ctx.fillText('← → NAVEGAR    ENTER / CLICK  CONFIRMAR', CW / 2, CH - 12);
    ctx.restore();
  }

  // ── Scanlines (efeito CRT) ────────────────────────────────────
  function drawScanlines() {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let y = 0; y < CH; y += 3) {
      ctx.fillRect(0, y, CW, 1);
    }
  }

  // ── Banner VS ─────────────────────────────────────────────────
  function drawVSBanner() {
    const cpuIdx  = (confirmedIdx + 1) % ROSTER.length;
    const p1      = ROSTER[confirmedIdx];
    const cpu     = ROSTER[cpuIdx];

    // Fundo semitransparente
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, CW, CH);

    const cy = CH / 2;

    // Nome P1
    ctx.save();
    ctx.textAlign   = 'right';
    ctx.font        = "bold 42px 'Press Start 2P', monospace";
    ctx.fillStyle   = p1.glow;
    ctx.shadowColor = p1.glow;
    ctx.shadowBlur  = 24;
    ctx.fillText(p1.name, CW / 2 - 60, cy - 10);

    // "VS" central
    ctx.textAlign   = 'center';
    ctx.fillStyle   = '#ff2222';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur  = 30;
    ctx.font        = "bold 56px 'Press Start 2P', monospace";
    ctx.fillText('VS', CW / 2, cy + 10);

    // Nome CPU
    ctx.textAlign   = 'left';
    ctx.fillStyle   = cpu.glow;
    ctx.shadowColor = cpu.glow;
    ctx.shadowBlur  = 24;
    ctx.font        = "bold 42px 'Press Start 2P', monospace";
    ctx.fillText(cpu.name, CW / 2 + 60, cy - 10);

    // "CPU —" abaixo
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = '#666';
    ctx.font        = FONT_SMALL;
    ctx.textAlign   = 'left';
    ctx.fillText('CPU', CW / 2 + 60, cy + 28);
    ctx.restore();
  }

  // ── "PLAY AGAIN" ─────────────────────────────────────────────
  function drawPlayAgain() {
    const pulse = 0.7 + Math.sin(tick * 0.08) * 0.3;
    ctx.save();
    ctx.textAlign   = 'center';
    ctx.font        = FONT_SMALL;
    ctx.fillStyle   = `rgba(255,200,0,${pulse})`;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur  = 12 * pulse;
    ctx.fillText('▶  PLAY AGAIN', CW / 2, 72);
    ctx.restore();
  }

  // ── Input teclado ─────────────────────────────────────────────
  function onKey(e) {
    if (!overlay.classList.contains('visible')) return;
    if (confirmedIdx !== -1) return; // já confirmou
    const k = e.key.toLowerCase();
    if (k === 'arrowleft'  || k === 'a') {
      selectedIdx = (selectedIdx - 1 + ROSTER.length) % ROSTER.length;
    }
    if (k === 'arrowright' || k === 'd') {
      selectedIdx = (selectedIdx + 1) % ROSTER.length;
    }
    if (k === 'enter' || k === ' ') {
      confirmSelect();
      e.preventDefault();
    }
  }
  window.addEventListener('keydown', onKey);

  // ── Input mouse / touch ───────────────────────────────────────
  function getCanvasScale() {
    const rect = canvas.getBoundingClientRect();
    return { sx: CW / rect.width, sy: CH / rect.height, rect };
  }

  function getCardAt(clientX, clientY) {
    const { sx, sy, rect } = getCanvasScale();
    const cx = (clientX - rect.left) * sx;
    const cy = (clientY - rect.top)  * sy;
    for (let i = 0; i < ROSTER.length; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x   = GRID_X + col * (CARD_W + CARD_GAP);
      const y   = GRID_Y + row * (CARD_H + CARD_GAP);
      if (cx >= x && cx <= x + CARD_W && cy >= y && cy <= y + CARD_H) return i;
    }
    return -1;
  }

  canvas.addEventListener('mousemove', e => {
    if (confirmedIdx !== -1) return;
    const idx = getCardAt(e.clientX, e.clientY);
    if (idx !== -1) { selectedIdx = idx; canvas.style.cursor = 'pointer'; }
    else canvas.style.cursor = 'default';
  });

  canvas.addEventListener('click', e => {
    if (confirmedIdx !== -1) return;
    const idx = getCardAt(e.clientX, e.clientY);
    if (idx !== -1) { selectedIdx = idx; confirmSelect(); }
  });

  canvas.addEventListener('touchend', e => {
    if (confirmedIdx !== -1) return;
    const t   = e.changedTouches[0];
    const idx = getCardAt(t.clientX, t.clientY);
    if (idx !== -1) { selectedIdx = idx; confirmSelect(); }
  }, { passive: true });

  // ── Confirmar seleção ─────────────────────────────────────────
  function confirmSelect() {
    if (confirmedIdx !== -1) return;
    confirmedIdx = selectedIdx;

    // CPU = personagem oposto
    const cpuIdx  = (confirmedIdx + 1) % ROSTER.length;

    // Exibe banner VS por 1.4s depois chama callback
    setTimeout(() => {
      hide();
      if (onConfirmCb) {
        onConfirmCb({
          player: ROSTER[confirmedIdx],
          cpu:    ROSTER[cpuIdx],
        });
      }
    }, 1400);
  }

  // ── Show / Hide ───────────────────────────────────────────────
  // show(cb, playAgain): exibe a tela. cb = callback({ player, cpu })
  // hide(): esconde e restaura o HUD do jogo
  function show(cb, playAgain = false) {
    onConfirmCb   = cb;
    confirmedIdx  = -1;
    selectedIdx   = 0;
    hoveredIdx    = -1;
    playAgainFlag = playAgain;
    tick          = 0;

    // Escala o canvas como o canvas do jogo
    function resize() {
      const scale = Math.min(window.innerWidth / CW, window.innerHeight / CH);
      canvas.style.width  = CW * scale + 'px';
      canvas.style.height = CH * scale + 'px';
      canvas.style.left   = (window.innerWidth  - CW * scale) / 2 + 'px';
      canvas.style.top    = (window.innerHeight - CH * scale) / 2 + 'px';
    }
    resize();
    window.addEventListener('resize', resize);
    overlay._resizeFn = resize;

    overlay.style.display = 'block';
    overlay.getBoundingClientRect(); // força reflow
    overlay.classList.add('visible');

    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay) uiOverlay.style.display = 'none';

    animFrame = requestAnimationFrame(render);
  }

  function hide() {
    overlay.classList.remove('visible');
    overlay.style.display = 'none';
    cancelAnimationFrame(animFrame);
    if (overlay._resizeFn) window.removeEventListener('resize', overlay._resizeFn);

    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay) uiOverlay.style.display = '';
  }

  // ── Render principal ──────────────────────────────────────────
  // Layout SF98: personagens grandes nas laterais, grid central
  // Mobile: 1 toque = preview (hoveredIdx), 2 toques = confirma
  function render() {
    if (!overlay.classList.contains('visible')) return;
    tick++;
    animFrame = requestAnimationFrame(render);

    ctx.clearRect(0, 0, CW, CH);
    drawBackground();
    drawSideCharacters();
    drawGrid();
    drawNamePlate();
    drawTitle();
    drawHint();
    drawScanlines();
    if (confirmedIdx !== -1) drawVSBanner();
    if (playAgainFlag)       drawPlayAgain();
  }

  // ── Background estilo arcade anos 90 ──────────────────────────
  function drawBackground() {
    // Base escura vinho/roxo
    const bg = ctx.createRadialGradient(CW/2, CH/2, 0, CW/2, CH/2, CW*0.8);
    bg.addColorStop(0,   '#3a1228');
    bg.addColorStop(0.5, '#1e0a18');
    bg.addColorStop(1,   '#080308');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CW, CH);

    // Textura de grain (linhas diagonais sutis)
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let i = -CH; i < CW + CH; i += 7) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + CH, CH);
      ctx.stroke();
    }
    ctx.restore();

    // Faixa escura horizontal no centro (área do grid)
    const strip = ctx.createLinearGradient(0, GRID_Y - 20, 0, GRID_Y + ROWS*(CARD_H+CARD_GAP) + 30);
    strip.addColorStop(0,   'rgba(0,0,0,0)');
    strip.addColorStop(0.2, 'rgba(0,0,0,0.45)');
    strip.addColorStop(0.8, 'rgba(0,0,0,0.45)');
    strip.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = strip;
    ctx.fillRect(0, GRID_Y - 20, CW, ROWS*(CARD_H+CARD_GAP) + 50);

    // Borda decorativa dourada no topo e base
    _drawBorderBar(62);
    _drawBorderBar(CH - 38);
  }

  function _drawBorderBar(y) {
    // Linha dupla dourada estilo placa de metal
    const g = ctx.createLinearGradient(0, y-1, 0, y+8);
    g.addColorStop(0,   '#8b6914');
    g.addColorStop(0.4, '#d4a017');
    g.addColorStop(0.6, '#f5c842');
    g.addColorStop(1,   '#8b6914');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, CW, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, y + 4, CW, 2);
  }

  // ── Personagens grandes nas laterais (estilo SF2/KOF) ─────────
  function drawSideCharacters() {
    const char = ROSTER[hoveredIdx !== -1 ? hoveredIdx : selectedIdx];
    const cpuIdx = confirmedIdx !== -1
      ? (confirmedIdx + 1) % ROSTER.length
      : (selectedIdx + 1) % ROSTER.length;
    const cpuChar = ROSTER[cpuIdx];

    _drawLargeChar(char,    'left');
    _drawLargeChar(cpuChar, 'right');
  }

  function _drawLargeChar(char, side) {
    const [r, g, b] = char.color;
    const isLeft = side === 'left';

    // Zona do personagem grande
    const zoneW = 195;
    const zoneX = isLeft ? 0 : CW - zoneW;
    const zoneH = CH - 70;

    // Fundo do personagem — gradiente lateral
    const bgGrad = ctx.createLinearGradient(zoneX, 0, zoneX + zoneW, 0);
    if (isLeft) {
      bgGrad.addColorStop(0,   `rgba(${r},${g},${b},0.25)`);
      bgGrad.addColorStop(0.7, `rgba(${r},${g},${b},0.06)`);
      bgGrad.addColorStop(1,   'rgba(0,0,0,0)');
    } else {
      bgGrad.addColorStop(0,   'rgba(0,0,0,0)');
      bgGrad.addColorStop(0.3, `rgba(${r},${g},${b},0.06)`);
      bgGrad.addColorStop(1,   `rgba(${r},${g},${b},0.25)`);
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(zoneX, 0, zoneW, zoneH);

    // Splash art (se existir) ou placeholder estilizado
    const splashImg = char._splash;
    if (splashImg && splashImg.complete && splashImg.naturalWidth > 0) {
      ctx.save();
      // Clip suave na lateral oposta
      const clipGrad = ctx.createLinearGradient(
        isLeft ? zoneX : zoneX + zoneW, 0,
        isLeft ? zoneX + zoneW : zoneX, 0
      );
      clipGrad.addColorStop(0,   'rgba(0,0,0,1)');
      clipGrad.addColorStop(0.75,'rgba(0,0,0,1)');
      clipGrad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'source-over';
      const iw = splashImg.naturalWidth, ih = splashImg.naturalHeight;
      const sc = Math.min(zoneW / iw, zoneH / ih);
      const dw = iw * sc, dh = ih * sc;
      const dx = isLeft ? zoneX : zoneX + zoneW - dw;
      const dy = zoneH - dh;
      ctx.drawImage(splashImg, dx, dy, dw, dh);
      ctx.restore();
    } else {
      _drawSilhouette(char, zoneX, zoneW, zoneH, isLeft);
    }

    // Nome do personagem — letras grandes embaixo
    _drawCharName(char, zoneX, zoneW, isLeft);
  }

  function _drawSilhouette(char, zoneX, zoneW, zoneH, isLeft) {
    const [r, g, b] = char.color;
    const cx = isLeft ? zoneX + zoneW * 0.45 : zoneX + zoneW * 0.55;
    const baseY = zoneH - 30;
    const scale = 1.0;

    // Sombra projetada no chão
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, baseY + 5, 52 * scale, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Corpo principal — silhueta estilizada
    ctx.save();
    if (!isLeft) { ctx.translate(cx * 2, 0); ctx.scale(-1, 1); }

    const H = zoneH - 50;

    // Pernas
    ctx.fillStyle = `rgb(${Math.max(r-30,0)},${Math.max(g-30,0)},${Math.max(b-30,0)})`;
    // Perna esq
    ctx.beginPath();
    ctx.moveTo(cx - 18, baseY - H * 0.38);
    ctx.lineTo(cx - 28, baseY);
    ctx.lineTo(cx - 8,  baseY);
    ctx.lineTo(cx - 5,  baseY - H * 0.38);
    ctx.closePath(); ctx.fill();
    // Perna dir
    ctx.beginPath();
    ctx.moveTo(cx + 5,  baseY - H * 0.38);
    ctx.lineTo(cx + 8,  baseY);
    ctx.lineTo(cx + 30, baseY);
    ctx.lineTo(cx + 20, baseY - H * 0.38);
    ctx.closePath(); ctx.fill();

    // Tronco
    const torsoGrad = ctx.createLinearGradient(cx - 35, 0, cx + 35, 0);
    torsoGrad.addColorStop(0, `rgb(${Math.min(r+20,255)},${Math.min(g+20,255)},${Math.min(b+20,255)})`);
    torsoGrad.addColorStop(0.5, `rgb(${r},${g},${b})`);
    torsoGrad.addColorStop(1, `rgb(${Math.max(r-20,0)},${Math.max(g-20,0)},${Math.max(b-20,0)})`);
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 32, baseY - H * 0.38);
    ctx.lineTo(cx - 36, baseY - H * 0.7);
    ctx.lineTo(cx + 36, baseY - H * 0.7);
    ctx.lineTo(cx + 32, baseY - H * 0.38);
    ctx.closePath(); ctx.fill();

    // Braço esq (estendido / pose)
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.moveTo(cx - 36, baseY - H * 0.7);
    ctx.lineTo(cx - 60, baseY - H * 0.55);
    ctx.lineTo(cx - 52, baseY - H * 0.46);
    ctx.lineTo(cx - 28, baseY - H * 0.6);
    ctx.closePath(); ctx.fill();
    // Punho esq
    ctx.beginPath();
    ctx.arc(cx - 62, baseY - H * 0.52, 10, 0, Math.PI * 2);
    ctx.fill();

    // Braço dir (dobrado, pose de guarda)
    ctx.beginPath();
    ctx.moveTo(cx + 36, baseY - H * 0.7);
    ctx.lineTo(cx + 44, baseY - H * 0.58);
    ctx.lineTo(cx + 36, baseY - H * 0.5);
    ctx.lineTo(cx + 28, baseY - H * 0.62);
    ctx.closePath(); ctx.fill();

    // Cabeça
    const headY = baseY - H * 0.82;
    const headR = H * 0.1;
    ctx.fillStyle = '#c8956a'; // skin tone
    ctx.beginPath();
    ctx.ellipse(cx, headY, headR * 0.85, headR, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cabelo / detalhe da cabeça na cor do personagem
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.ellipse(cx, headY - headR * 0.5, headR * 0.88, headR * 0.55, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Contorno forte (estilo cel-shading)
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, headY, headR * 0.85, headR, 0, 0, Math.PI * 2);
    ctx.stroke();

    // ? se sem nome real
    if (!char.portrait && !char._splash) {
      ctx.fillStyle = char.glow;
      ctx.font = `bold ${Math.round(H*0.18)}px 'Press Start 2P', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', cx, baseY - H * 0.52);
      ctx.textBaseline = 'alphabetic';
    }

    ctx.restore();
  }

  function _drawCharName(char, zoneX, zoneW, isLeft) {
    const name = char.name;
    ctx.save();
    ctx.textAlign = isLeft ? 'left' : 'right';
    const tx = isLeft ? zoneX + 10 : zoneX + zoneW - 10;
    const ty = CH - 46;

    // Sombra preta espessa (estilo letreiro arcade)
    ctx.font = "bold 17px 'Press Start 2P', 'Courier New', monospace";
    ctx.fillStyle = '#000';
    for (let ox = -2; ox <= 2; ox++) {
      for (let oy = -2; oy <= 2; oy++) {
        if (ox === 0 && oy === 0) continue;
        ctx.fillText(name, tx + ox, ty + oy);
      }
    }
    // Texto principal dourado
    const nameGrad = ctx.createLinearGradient(0, ty - 16, 0, ty + 2);
    nameGrad.addColorStop(0, '#ffe066');
    nameGrad.addColorStop(0.5, '#f5c018');
    nameGrad.addColorStop(1, '#b8860b');
    ctx.fillStyle = nameGrad;
    ctx.fillText(name, tx, ty);
    ctx.restore();
  }

  // ── Grid de portraits (SF98 style) ────────────────────────────
  function drawGrid() {
    ROSTER.forEach((char, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x   = GRID_X + col * (CARD_W + CARD_GAP);
      const y   = GRID_Y + row * (CARD_H + CARD_GAP);

      const isHovered   = i === hoveredIdx;
      const isSelected  = i === selectedIdx;
      const isConfirmed = i === confirmedIdx;
      const isActive    = isHovered || isSelected;

      // ── Fundo do card ─────────────────────────────────────────
      const [r, g, b] = char.color;
      // SF98: fundo marrom/escuro com tom do personagem
      ctx.fillStyle = `rgb(${20+r*0.15|0},${15+g*0.1|0},${12+b*0.1|0})`;
      ctx.fillRect(x, y, CARD_W, CARD_H);

      // Vinheta interna
      const innerGrad = ctx.createRadialGradient(
        x+CARD_W/2, y+CARD_H*0.4, 4,
        x+CARD_W/2, y+CARD_H/2, CARD_W*0.7
      );
      innerGrad.addColorStop(0, `rgba(${r},${g},${b},0.18)`);
      innerGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = innerGrad;
      ctx.fillRect(x, y, CARD_W, CARD_H);

      // ── Portrait ──────────────────────────────────────────────
      if (char._img && char._img.complete && char._img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath(); ctx.rect(x+2, y+2, CARD_W-4, CARD_H-4); ctx.clip();
        const iw = char._img.naturalWidth, ih = char._img.naturalHeight;
        const sc = Math.max(CARD_W / iw, CARD_H / ih);
        const dw = iw * sc, dh = ih * sc;
        ctx.drawImage(char._img, x + (CARD_W-dw)/2, y + (CARD_H-dh)/2, dw, dh);
        ctx.restore();
      } else {
        // Placeholder: silhueta ? na cor
        ctx.fillStyle = `rgba(${r},${g},${b},0.22)`;
        ctx.fillRect(x+2, y+2, CARD_W-4, CARD_H-4);
        ctx.fillStyle = isActive ? char.glow : `rgba(${r},${g},${b},0.7)`;
        ctx.font = `bold ${isActive ? 20 : 17}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (isActive) {
          ctx.shadowColor = char.glow; ctx.shadowBlur = 8;
        }
        ctx.fillText('?', x + CARD_W/2, y + CARD_H/2);
        ctx.shadowBlur = 0; ctx.textBaseline = 'alphabetic';
      }

      // ── Moldura metálica estilo arcade ────────────────────────
      if (isConfirmed || (isActive && confirmedIdx === -1)) {
        // Borda selecionada: dourada, piscante
        const blink = Math.floor(tick / 5) % 2 === 0;
        if (blink || isConfirmed) {
          // Moldura dupla escura + dourada
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 4;
          ctx.strokeRect(x, y, CARD_W, CARD_H);
          ctx.strokeStyle = '#f5c018';
          ctx.lineWidth = 2;
          ctx.strokeRect(x+1, y+1, CARD_W-2, CARD_H-2);
          // Cantos brancos (L-shape)
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          const cs = 7;
          [[x,y],[x+CARD_W,y],[x,y+CARD_H],[x+CARD_W,y+CARD_H]].forEach(([cx,cy]) => {
            const sx = cx === x ? 1 : -1, sy = cy === y ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(cx + sx*cs, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy*cs);
            ctx.stroke();
          });
        }
      } else {
        // Moldura normal: cinza escuro metálico
        const metalGrad = ctx.createLinearGradient(x, y, x+CARD_W, y+CARD_H);
        metalGrad.addColorStop(0,   '#666');
        metalGrad.addColorStop(0.5, '#888');
        metalGrad.addColorStop(1,   '#444');
        ctx.strokeStyle = metalGrad;
        ctx.lineWidth = 2;
        ctx.strokeRect(x+1, y+1, CARD_W-2, CARD_H-2);
        // Rebite nos cantos
        ctx.fillStyle = '#777';
        [[x+3,y+3],[x+CARD_W-3,y+3],[x+3,y+CARD_H-3],[x+CARD_W-3,y+CARD_H-3]].forEach(([rx,ry]) => {
          ctx.beginPath(); ctx.arc(rx, ry, 2, 0, Math.PI*2); ctx.fill();
        });
      }

      // Indicador de hover (mobile: selecionar antes de confirmar)
      if (isHovered && hoveredIdx !== selectedIdx) {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(x, y, CARD_W, CARD_H);
      }
    });
  }

  // ── Placa do nome (centro, entre grid e borda) ─────────────────
  function drawNamePlate() {
    const char = ROSTER[hoveredIdx !== -1 ? hoveredIdx : selectedIdx];
    const plateY = GRID_Y + ROWS * (CARD_H + CARD_GAP) + 8;
    const plateH = 32;
    const plateX = GRID_X;
    const plateW = GRID_W;

    // Fundo da placa — estilo letreiro arcade
    const [r,g,b] = char.color;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(plateX, plateY, plateW, plateH);
    // Borda colorida
    ctx.strokeStyle = char.glow;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(plateX, plateY, plateW, plateH);
    // Detalhe lateral esquerdo e direito
    ctx.fillStyle = char.glow;
    ctx.fillRect(plateX, plateY, 4, plateH);
    ctx.fillRect(plateX + plateW - 4, plateY, 4, plateH);

    // Nome centralizado
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = "bold 13px 'Press Start 2P', 'Courier New', monospace";
    // Sombra
    ctx.fillStyle = '#000';
    ctx.fillText(char.name, CW/2 + 1, plateY + plateH*0.65 + 1);
    // Texto
    ctx.fillStyle = '#fff';
    ctx.shadowColor = char.glow; ctx.shadowBlur = 6;
    ctx.fillText(char.name, CW/2, plateY + plateH*0.65);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Título "SELECT YOUR FIGHTER" ──────────────────────────────
  function drawTitle() {
    const ty = 48;
    ctx.save();
    ctx.textAlign = 'center';

    // Sombra escura espessa (letreiro arcade)
    ctx.font = "bold 20px 'Press Start 2P', 'Courier New', monospace";
    ctx.fillStyle = '#000';
    for (let ox = -3; ox <= 3; ox++) {
      for (let oy = 0; oy <= 3; oy++) {
        ctx.fillText('SELECT YOUR FIGHTER', CW/2 + ox, ty + oy);
      }
    }
    // Texto principal: gradiente dourado como logo de arcade
    const tGrad = ctx.createLinearGradient(0, ty - 18, 0, ty + 4);
    tGrad.addColorStop(0, '#fff8cc');
    tGrad.addColorStop(0.3, '#ffe566');
    tGrad.addColorStop(0.6, '#f5c018');
    tGrad.addColorStop(1,   '#8b6914');
    ctx.fillStyle = tGrad;
    ctx.fillText('SELECT YOUR FIGHTER', CW/2, ty);
    ctx.restore();

    // Play again
    if (playAgainFlag) {
      const pulse = 0.65 + Math.sin(tick * 0.1) * 0.35;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = "bold 9px 'Press Start 2P', monospace";
      ctx.fillStyle = `rgba(255,220,60,${pulse})`;
      ctx.fillText('▶  PLAY AGAIN', CW/2, ty + 22);
      ctx.restore();
    }
  }

  // ── Hint de controles ─────────────────────────────────────────
  function drawHint() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(120,100,80,0.85)';
    ctx.font = "6px 'Press Start 2P', monospace";
    ctx.fillText('← → NAVEGAR    ENTER / TOQUE  SELECIONAR    ENTER / TOQUE  CONFIRMAR', CW/2, CH - 10);
    ctx.restore();
  }

  // ── Scanlines CRT ─────────────────────────────────────────────
  function drawScanlines() {
    ctx.fillStyle = 'rgba(0,0,0,0.055)';
    for (let y = 0; y < CH; y += 3) {
      ctx.fillRect(0, y, CW, 1);
    }
    // Vignette radial nas bordas
    const vig = ctx.createRadialGradient(CW/2, CH/2, CH*0.25, CW/2, CH/2, CH*0.82);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, CW, CH);
  }

  // ── Banner VS (após confirmação) ──────────────────────────────
  function drawVSBanner() {
    const cpuIdx  = (confirmedIdx + 1) % ROSTER.length;
    const p1      = ROSTER[confirmedIdx];
    const cpu     = ROSTER[cpuIdx];
    const cy      = CH / 2;

    // Fundo semitransparente
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, CW, CH);

    // Linha decorativa
    ctx.fillStyle = '#8b6914';
    ctx.fillRect(0, cy - 60, CW, 3);
    ctx.fillRect(0, cy + 40, CW, 3);

    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = "bold 34px 'Press Start 2P', monospace";
    // P1
    ctx.fillStyle = '#000';
    ctx.fillText(p1.name, CW/2 - 45, cy + 5);
    ctx.fillStyle = p1.glow;
    ctx.fillText(p1.name, CW/2 - 46, cy + 4);
    // VS
    ctx.textAlign = 'center';
    ctx.font = "bold 50px 'Press Start 2P', monospace";
    ctx.fillStyle = '#000';
    ctx.fillText('VS', CW/2, cy + 10);
    ctx.fillStyle = '#cc1111';
    ctx.fillText('VS', CW/2, cy + 8);
    // CPU
    ctx.textAlign = 'left';
    ctx.font = "bold 34px 'Press Start 2P', monospace";
    ctx.fillStyle = '#000';
    ctx.fillText(cpu.name, CW/2 + 45, cy + 5);
    ctx.fillStyle = cpu.glow;
    ctx.fillText(cpu.name, CW/2 + 44, cy + 4);
    ctx.restore();
  }

  function drawPlayAgain() {} // já integrado no drawTitle

  // ── Input teclado ─────────────────────────────────────────────
  function onKey(e) {
    if (!overlay.classList.contains('visible')) return;
    if (confirmedIdx !== -1) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowleft'  || k === 'a') selectedIdx = (selectedIdx - 1 + ROSTER.length) % ROSTER.length;
    if (k === 'arrowright' || k === 'd') selectedIdx = (selectedIdx + 1) % ROSTER.length;
    if (k === 'arrowup')                  selectedIdx = Math.max(0, selectedIdx - COLS);
    if (k === 'arrowdown')                selectedIdx = Math.min(ROSTER.length-1, selectedIdx + COLS);
    if (k === 'enter' || k === ' ')      { confirmSelect(); e.preventDefault(); }
    hoveredIdx = -1;
  }
  window.addEventListener('keydown', onKey);

  // ── Input mouse / touch ───────────────────────────────────────
  // Mobile: 1 toque = hover/preview, 2 toques no mesmo = confirma
  function getCanvasScale() {
    const rect = canvas.getBoundingClientRect();
    return { sx: CW / rect.width, sy: CH / rect.height, rect };
  }

  function getCardAt(clientX, clientY) {
    const { sx, sy, rect } = getCanvasScale();
    const cx = (clientX - rect.left) * sx;
    const cy = (clientY - rect.top)  * sy;
    for (let i = 0; i < ROSTER.length; i++) {
      const col = i % COLS, row = Math.floor(i / COLS);
      const x = GRID_X + col * (CARD_W + CARD_GAP);
      const y = GRID_Y + row * (CARD_H + CARD_GAP);
      if (cx >= x && cx <= x+CARD_W && cy >= y && cy <= y+CARD_H) return i;
    }
    return -1;
  }

  canvas.addEventListener('mousemove', e => {
    if (confirmedIdx !== -1) return;
    const idx = getCardAt(e.clientX, e.clientY);
    hoveredIdx = idx;
    if (idx !== -1) { selectedIdx = idx; canvas.style.cursor = 'pointer'; }
    else canvas.style.cursor = 'default';
  });

  canvas.addEventListener('click', e => {
    if (confirmedIdx !== -1) return;
    const idx = getCardAt(e.clientX, e.clientY);
    if (idx === -1) return;
    if (selectedIdx === idx) {
      // Segundo clique no mesmo card → confirma
      confirmSelect();
    } else {
      // Primeiro clique → apenas faz preview
      selectedIdx = idx;
      hoveredIdx  = -1;
    }
  });

  canvas.addEventListener('touchend', e => {
    if (confirmedIdx !== -1) return;
    const t   = e.changedTouches[0];
    const idx = getCardAt(t.clientX, t.clientY);
    if (idx === -1) return;
    if (selectedIdx === idx) {
      confirmSelect();
    } else {
      selectedIdx = idx;
      hoveredIdx  = -1;
    }
    e.preventDefault();
  }, { passive: false });

  // ── Confirmar seleção ─────────────────────────────────────────
  function confirmSelect() {
    if (confirmedIdx !== -1) return;
    confirmedIdx = selectedIdx;
    const cpuIdx = (confirmedIdx + 1) % ROSTER.length;
    setTimeout(() => {
      hide();
      if (onConfirmCb) onConfirmCb({ player: ROSTER[confirmedIdx], cpu: ROSTER[cpuIdx] });
    }, 1400);
  }
  return { show, ROSTER };
})();
