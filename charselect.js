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
    drawSideCharacters();
    drawGrid();
    drawNameBanners();
    drawTitle();
    drawScanlines();
    if (confirmedIdx !== -1) drawVSBanner();
  }

  // ── Background ────────────────────────────────────────────────
  function drawBackground() {
    // Roxo escuro / vinho — igual à referência
    const bg = ctx.createRadialGradient(CW*0.5, CH*0.4, 40, CW*0.5, CH*0.5, CW*0.75);
    bg.addColorStop(0,   '#4a1535');
    bg.addColorStop(0.45,'#2d0c22');
    bg.addColorStop(1,   '#0a0308');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CW, CH);

    // Textura grain diagonal
    ctx.save();
    ctx.globalAlpha = 0.035;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    for (let i = -CH; i < CW + CH; i += 6) {
      ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+CH,CH); ctx.stroke();
    }
    ctx.restore();

    // Barra dourada topo
    const gold = ctx.createLinearGradient(0, 56, 0, 64);
    gold.addColorStop(0,   '#6b4a00');
    gold.addColorStop(0.3, '#c8940a');
    gold.addColorStop(0.6, '#f0c030');
    gold.addColorStop(1,   '#7a5500');
    ctx.fillStyle = gold;
    ctx.fillRect(0, 56, CW, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 61, CW, 2);

    // Barra dourada base
    ctx.fillStyle = gold;
    ctx.fillRect(0, CH-46, CW, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, CH-41, CW, 2);
  }

  // ── Personagens grandes laterais ──────────────────────────────
  // Estilo SF2: figura enorme ocupando toda a lateral, nome em baixo
  function drawSideCharacters() {
    const dispIdx = hoveredIdx !== -1 ? hoveredIdx : selectedIdx;
    const p1Char  = ROSTER[dispIdx];
    const cpuIdx  = confirmedIdx !== -1
      ? (confirmedIdx + 1) % ROSTER.length
      : (dispIdx + 1) % ROSTER.length;
    const cpuChar = ROSTER[cpuIdx];

    _drawSidePanel(p1Char,  0,        'left');
    _drawSidePanel(cpuChar, CW - SIDE_W, 'right');
  }

  function _drawSidePanel(char, panelX, side) {
    const [r,g,b] = char.color;
    const isLeft  = side === 'left';
    const panelW  = SIDE_W;
    const panelH  = CH - 45;

    // Fundo do painel — gradiente na cor do personagem vindo do lado
    const pgx0 = isLeft ? panelX : panelX + panelW;
    const pgx1 = isLeft ? panelX + panelW : panelX;
    const pg = ctx.createLinearGradient(pgx0, 0, pgx1, 0);
    pg.addColorStop(0,    `rgba(${r},${g},${b},0.30)`);
    pg.addColorStop(0.55, `rgba(${r},${g},${b},0.08)`);
    pg.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = pg;
    ctx.fillRect(panelX, 0, panelW, panelH);

    // Splash art ou silhueta gerada
    const splash = char._splash;
    if (splash && splash.complete && splash.naturalWidth > 0) {
      // Imagem splash: cobre o painel inteiro
      ctx.save();
      const iw = splash.naturalWidth, ih = splash.naturalHeight;
      const sc = Math.max(panelW / iw, (panelH * 0.88) / ih);
      const dw = iw * sc, dh = ih * sc;
      const dx = isLeft ? panelX + (panelW - dw) / 2 : panelX + panelW - dw + (dw - panelW) / 2;
      const dy = panelH - dh + 10;
      // Fade lateral
      const fadeGrad = ctx.createLinearGradient(
        isLeft ? panelX + panelW*0.65 : panelX,
        0,
        isLeft ? panelX + panelW : panelX + panelW*0.35,
        0
      );
      fadeGrad.addColorStop(0, 'rgba(0,0,0,0)');
      fadeGrad.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.drawImage(splash, isLeft ? panelX : panelX + panelW - dw, dy, dw, dh);
      ctx.fillStyle = fadeGrad;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(panelX, 0, panelW, panelH);
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    } else {
      // Sem splash: silhueta escura estilo "personagem bloqueado"
      _drawFighterSilhouette(char, panelX, panelW, panelH, isLeft);
    }
  }

  function _drawFighterSilhouette(char, panelX, panelW, panelH, isLeft) {
    const [r,g,b] = char.color;
    // Centro horizontal do personagem
    const cx   = panelX + (isLeft ? panelW * 0.52 : panelW * 0.48);
    const baseY = panelH - 30;
    const figH  = panelH * 0.80; // altura total da figura

    ctx.save();
    // Espelha se for o personagem direito (olhando para dentro)
    if (!isLeft) { ctx.translate(cx*2, 0); ctx.scale(-1,1); }

    // Sombra no chão
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, baseY+8, figH*0.22, figH*0.055, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Silhueta principal em cor mais escura do personagem
    const bodyColor = `rgba(${r*0.3|0},${g*0.3|0},${b*0.3|0},0.92)`;
    const hlColor   = `rgba(${Math.min(r+60,255)},${Math.min(g+60,255)},${Math.min(b+60,255)},0.7)`;

    // Perna esquerda
    ctx.fillStyle = bodyColor;
    _roundedPoly(ctx, [
      [cx-figH*0.18, baseY-figH*0.40],
      [cx-figH*0.26, baseY],
      [cx-figH*0.08, baseY],
      [cx-figH*0.04, baseY-figH*0.40],
    ], 4);

    // Perna direita
    _roundedPoly(ctx, [
      [cx+figH*0.04, baseY-figH*0.40],
      [cx+figH*0.06, baseY],
      [cx+figH*0.26, baseY],
      [cx+figH*0.18, baseY-figH*0.40],
    ], 4);

    // Tronco — com gradiente lateral (iluminação)
    const tGrad = ctx.createLinearGradient(cx-figH*0.3, 0, cx+figH*0.3, 0);
    tGrad.addColorStop(0,    hlColor);
    tGrad.addColorStop(0.45, bodyColor);
    tGrad.addColorStop(1,    'rgba(0,0,0,0.8)');
    ctx.fillStyle = tGrad;
    _roundedPoly(ctx, [
      [cx-figH*0.30, baseY-figH*0.42],
      [cx-figH*0.28, baseY-figH*0.72],
      [cx+figH*0.28, baseY-figH*0.72],
      [cx+figH*0.28, baseY-figH*0.42],
    ], 6);

    // Braço esquerdo estendido (pose de luta)
    ctx.fillStyle = bodyColor;
    _roundedPoly(ctx, [
      [cx-figH*0.28, baseY-figH*0.70],
      [cx-figH*0.55, baseY-figH*0.54],
      [cx-figH*0.50, baseY-figH*0.46],
      [cx-figH*0.22, baseY-figH*0.60],
    ], 5);
    // Punho
    ctx.beginPath();
    ctx.arc(cx-figH*0.58, baseY-figH*0.50, figH*0.065, 0, Math.PI*2);
    ctx.fill();

    // Braço direito dobrado (guarda)
    _roundedPoly(ctx, [
      [cx+figH*0.28, baseY-figH*0.70],
      [cx+figH*0.40, baseY-figH*0.60],
      [cx+figH*0.36, baseY-figH*0.50],
      [cx+figH*0.24, baseY-figH*0.60],
    ], 4);
    ctx.beginPath();
    ctx.arc(cx+figH*0.40, baseY-figH*0.56, figH*0.055, 0, Math.PI*2);
    ctx.fill();

    // Pescoço
    ctx.fillStyle = '#c8956a';
    ctx.beginPath();
    ctx.roundRect(cx-figH*0.055, baseY-figH*0.80, figH*0.11, figH*0.09, 3);
    ctx.fill();

    // Cabeça
    const headCy = baseY - figH*0.90;
    const headRx = figH*0.110, headRy = figH*0.128;
    ctx.fillStyle = '#c8956a';
    ctx.beginPath();
    ctx.ellipse(cx, headCy, headRx, headRy, 0, 0, Math.PI*2);
    ctx.fill();

    // Cabelo / boné na cor do personagem
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(cx, headCy - headRy*0.35, headRx*1.05, headRy*0.65, 0, Math.PI, Math.PI*2);
    ctx.fill();

    // Contorno ink (cel-shading)
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, headCy, headRx, headRy, 0, 0, Math.PI*2);
    ctx.stroke();

    ctx.restore();
  }

  // Helper: polígono com cantos arredondados
  function _roundedPoly(ctx, pts, r) {
    ctx.beginPath();
    ctx.moveTo((pts[0][0]+pts[1][0])/2, (pts[0][1]+pts[1][1])/2);
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[(i+1) % pts.length];
      const p2 = pts[(i+2) % pts.length];
      ctx.arcTo(p1[0], p1[1], p2[0], p2[1], r);
    }
    ctx.closePath();
    ctx.fill();
  }

  // ── Grid de cards (centro) ────────────────────────────────────
  function drawGrid() {
    ROSTER.forEach((char, i) => {
      const col = i % COLS, row = Math.floor(i / COLS);
      const x   = GRID_X + col * (CARD_W + CARD_GAP);
      const y   = GRID_Y + row * (CARD_H + CARD_GAP);
      const dispIdx    = hoveredIdx !== -1 ? hoveredIdx : selectedIdx;
      const isSelected  = i === dispIdx;
      const isConfirmed = i === confirmedIdx;
      const [r,g,b] = char.color;

      // Fundo do card — tom escuro da cor do personagem
      ctx.fillStyle = `rgb(${12+r*0.12|0},${8+g*0.08|0},${6+b*0.08|0})`;
      ctx.fillRect(x, y, CARD_W, CARD_H);

      // Portrait ou silhueta escura
      if (char._img && char._img.complete && char._img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath(); ctx.rect(x+2, y+2, CARD_W-4, CARD_H-4); ctx.clip();
        const iw = char._img.naturalWidth, ih = char._img.naturalHeight;
        const sc = Math.max(CARD_W / iw, CARD_H / ih);
        const dw = iw*sc, dh = ih*sc;
        ctx.drawImage(char._img, x+(CARD_W-dw)/2, y+(CARD_H-dh)/2, dw, dh);
        ctx.restore();
      } else {
        // Silhueta escura (personagem bloqueado / sem sprite)
        _drawMiniSilhouette(ctx, x, y, CARD_W, CARD_H, char, isSelected);
      }

      // Vinheta interna suave
      const vig = ctx.createRadialGradient(x+CARD_W/2,y+CARD_H*0.4,2, x+CARD_W/2,y+CARD_H/2,CARD_W*0.65);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.42)');
      ctx.fillStyle = vig;
      ctx.fillRect(x, y, CARD_W, CARD_H);

      // ── Moldura metálica parafusada ───────────────────────────
      if (isSelected || isConfirmed) {
        // Selecionado: dourado piscante com cantos em L
        const blink = Math.floor(tick / 5) % 2 === 0;
        if (blink || isConfirmed) {
          ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
          ctx.strokeRect(x, y, CARD_W, CARD_H);
          const gBorder = ctx.createLinearGradient(x, y, x+CARD_W, y+CARD_H);
          gBorder.addColorStop(0,   '#fff8cc');
          gBorder.addColorStop(0.5, '#f0c030');
          gBorder.addColorStop(1,   '#8b6914');
          ctx.strokeStyle = gBorder; ctx.lineWidth = 2;
          ctx.strokeRect(x+1, y+1, CARD_W-2, CARD_H-2);
          // Cantos em L brancos
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
          const cs = 8;
          [[x,y],[x+CARD_W,y],[x,y+CARD_H],[x+CARD_W,y+CARD_H]].forEach(([cx,cy]) => {
            const sx = cx===x?1:-1, sy = cy===y?1:-1;
            ctx.beginPath();
            ctx.moveTo(cx+sx*cs, cy); ctx.lineTo(cx,cy); ctx.lineTo(cx,cy+sy*cs);
            ctx.stroke();
          });
        }
      } else {
        // Normal: moldura cinza metálica com parafusos
        const m = ctx.createLinearGradient(x, y, x+CARD_W, y+CARD_H);
        m.addColorStop(0, '#777'); m.addColorStop(0.5,'#999'); m.addColorStop(1,'#555');
        ctx.strokeStyle = m; ctx.lineWidth = 2;
        ctx.strokeRect(x+1, y+1, CARD_W-2, CARD_H-2);
        // Parafusos nos cantos
        [[x+3,y+3],[x+CARD_W-3,y+3],[x+3,y+CARD_H-3],[x+CARD_W-3,y+CARD_H-3]].forEach(([bx,by]) => {
          ctx.fillStyle = '#888';
          ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#555';
          ctx.beginPath(); ctx.arc(bx, by, 1, 0, Math.PI*2); ctx.fill();
        });
      }
    });
  }

  // Silhueta pequena no card sem sprite — SF2 estilo "personagem oculto"
  function _drawMiniSilhouette(ctx, x, y, w, h, char, selected) {
    const [r,g,b] = char.color;
    const cx = x + w/2, cy = y + h*0.5;
    const scale = h * 0.012;

    ctx.save();
    // Corpo em silhueta escura semi-transparente
    ctx.fillStyle = selected
      ? `rgba(${r*0.5|0},${g*0.5|0},${b*0.5|0},0.85)`
      : 'rgba(20,12,16,0.90)';

    // Cabeça
    ctx.beginPath();
    ctx.ellipse(cx, cy - h*0.24, w*0.14, h*0.15, 0, 0, Math.PI*2);
    ctx.fill();
    // Tronco
    ctx.beginPath();
    ctx.roundRect(cx - w*0.18, cy - h*0.10, w*0.36, h*0.28, 3);
    ctx.fill();
    // Pernas
    ctx.fillRect(cx - w*0.16, cy + h*0.17, w*0.13, h*0.22);
    ctx.fillRect(cx + w*0.03, cy + h*0.17, w*0.13, h*0.22);

    // Brilho sutil na borda se selecionado
    if (selected) {
      ctx.strokeStyle = char.glow;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy - h*0.24, w*0.14, h*0.15, 0, 0, Math.PI*2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Banners de nome nas laterais ──────────────────────────────
  function drawNameBanners() {
    const dispIdx = hoveredIdx !== -1 ? hoveredIdx : selectedIdx;
    const p1      = ROSTER[dispIdx];
    const cpuIdx  = confirmedIdx !== -1
      ? (confirmedIdx + 1) % ROSTER.length
      : (dispIdx + 1) % ROSTER.length;
    const cpu     = ROSTER[cpuIdx];

    _drawNameBanner(p1,  0,          'left');
    _drawNameBanner(cpu, CW - SIDE_W, 'right');
  }

  function _drawNameBanner(char, panelX, side) {
    const isLeft = side === 'left';
    const banY = CH - 80;
    const banW = SIDE_W - 8;
    const banX = isLeft ? panelX + 4 : panelX + 4;

    // Fundo escuro com borda
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(banX, banY, banW, 38);
    ctx.strokeStyle = char.glow;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(banX, banY, banW, 38);

    // Nome em letras grandes, estilo arcade
    ctx.save();
    ctx.textAlign = isLeft ? 'left' : 'right';
    const tx = isLeft ? banX + 8 : banX + banW - 8;
    const ty = banY + 26;
    ctx.font = "bold 14px 'Press Start 2P', 'Courier New', monospace";
    // Sombra
    ctx.fillStyle = '#000';
    ctx.fillText(char.name, tx+1, ty+1);
    // Gradiente dourado
    const ng = ctx.createLinearGradient(0, ty-14, 0, ty+2);
    ng.addColorStop(0, '#ffe88a');
    ng.addColorStop(0.5,'#f5c018');
    ng.addColorStop(1,  '#9a6b00');
    ctx.fillStyle = ng;
    ctx.fillText(char.name, tx, ty);
    ctx.restore();
  }

  // ── Título ────────────────────────────────────────────────────
  function drawTitle() {
    const ty = 44;
    ctx.save();
    ctx.textAlign = 'center';
    // Sombra espessa
    ctx.font = "bold 22px 'Press Start 2P', 'Courier New', monospace";
    ctx.fillStyle = '#1a0010';
    for (let o = 1; o <= 3; o++) ctx.fillText('SELECT CHARACTER', CW/2+o, ty+o);
    // Gradiente dourado vibrante
    const tg = ctx.createLinearGradient(0, ty-20, 0, ty+4);
    tg.addColorStop(0,   '#fffbe0');
    tg.addColorStop(0.25,'#ffe55a');
    tg.addColorStop(0.6, '#f5c018');
    tg.addColorStop(1,   '#7a5500');
    ctx.fillStyle = tg;
    ctx.fillText('SELECT CHARACTER', CW/2, ty);
    ctx.restore();

    // Play again
    if (playAgainFlag) {
      const p = 0.6 + Math.sin(tick * 0.1) * 0.4;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = "bold 8px 'Press Start 2P', monospace";
      ctx.fillStyle = `rgba(255,220,60,${p})`;
      ctx.fillText('▶  PLAY AGAIN', CW/2, ty + 20);
      ctx.restore();
    }
  }

  // ── Scanlines + vignette ──────────────────────────────────────
  function drawScanlines() {
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let y = 0; y < CH; y += 3) ctx.fillRect(0, y, CW, 1);
    const vig = ctx.createRadialGradient(CW/2,CH/2,CH*0.2, CW/2,CH/2,CH*0.85);
    vig.addColorStop(0,'rgba(0,0,0,0)');
    vig.addColorStop(1,'rgba(0,0,0,0.60)');
    ctx.fillStyle = vig; ctx.fillRect(0,0,CW,CH);
  }

  // ── Banner VS ─────────────────────────────────────────────────
  function drawVSBanner() {
    const cpuIdx = (confirmedIdx + 1) % ROSTER.length;
    const p1 = ROSTER[confirmedIdx], cpu = ROSTER[cpuIdx];
    ctx.fillStyle = 'rgba(0,0,0,0.80)';
    ctx.fillRect(0,0,CW,CH);
    const cy = CH/2;
    ctx.save();
    // Decoração
    ctx.fillStyle = '#8b6914'; ctx.fillRect(0,cy-55,CW,3); ctx.fillRect(0,cy+42,CW,3);
    // P1
    ctx.textAlign = 'right';
    ctx.font = "bold 30px 'Press Start 2P', monospace";
    ctx.fillStyle='#000'; ctx.fillText(p1.name, CW/2-50, cy+6);
    ctx.fillStyle=p1.glow; ctx.fillText(p1.name, CW/2-51, cy+5);
    // VS
    ctx.textAlign='center';
    ctx.font="bold 48px 'Press Start 2P', monospace";
    ctx.fillStyle='#000'; ctx.fillText('VS',CW/2,cy+12);
    ctx.fillStyle='#cc1111'; ctx.fillText('VS',CW/2,cy+10);
    // CPU
    ctx.textAlign='left';
    ctx.font="bold 30px 'Press Start 2P', monospace";
    ctx.fillStyle='#000'; ctx.fillText(cpu.name, CW/2+50, cy+6);
    ctx.fillStyle=cpu.glow; ctx.fillText(cpu.name, CW/2+49, cy+5);
    ctx.restore();
  }

  // ── Input teclado ─────────────────────────────────────────────
  function onKey(e) {
    if (!overlay.classList.contains('visible')) return;
    if (confirmedIdx !== -1) return;
    const k = e.key.toLowerCase();
    if (k==='arrowleft'||k==='a')   selectedIdx=(selectedIdx-1+ROSTER.length)%ROSTER.length;
    if (k==='arrowright'||k==='d')  selectedIdx=(selectedIdx+1)%ROSTER.length;
    if (k==='arrowup')              selectedIdx=Math.max(0,selectedIdx-COLS);
    if (k==='arrowdown')            selectedIdx=Math.min(ROSTER.length-1,selectedIdx+COLS);
    if (k==='enter'||k===' ')      { confirmSelect(); e.preventDefault(); }
    hoveredIdx=-1;
  }
  window.addEventListener('keydown', onKey);

  // ── Mouse/touch ───────────────────────────────────────────────
  function getCanvasScale() {
    const rect = canvas.getBoundingClientRect();
    return { sx: CW/rect.width, sy: CH/rect.height, rect };
  }
  function getCardAt(clientX, clientY) {
    const {sx,sy,rect} = getCanvasScale();
    const cx=(clientX-rect.left)*sx, cy=(clientY-rect.top)*sy;
    for (let i=0;i<ROSTER.length;i++) {
      const col=i%COLS, row=Math.floor(i/COLS);
      const x=GRID_X+col*(CARD_W+CARD_GAP), y=GRID_Y+row*(CARD_H+CARD_GAP);
      if (cx>=x&&cx<=x+CARD_W&&cy>=y&&cy<=y+CARD_H) return i;
    }
    return -1;
  }
  canvas.addEventListener('mousemove', e => {
    if (confirmedIdx!==-1) return;
    const idx=getCardAt(e.clientX,e.clientY);
    hoveredIdx=idx;
    if (idx!==-1){selectedIdx=idx; canvas.style.cursor='pointer';}
    else canvas.style.cursor='default';
  });
  canvas.addEventListener('click', e => {
    if (confirmedIdx!==-1) return;
    const idx=getCardAt(e.clientX,e.clientY);
    if (idx===-1) return;
    if (selectedIdx===idx) confirmSelect();
    else { selectedIdx=idx; hoveredIdx=-1; }
  });
  canvas.addEventListener('touchend', e => {
    if (confirmedIdx!==-1) return;
    const t=e.changedTouches[0];
    const idx=getCardAt(t.clientX,t.clientY);
    if (idx===-1) return;
    if (selectedIdx===idx) confirmSelect();
    else { selectedIdx=idx; hoveredIdx=-1; }
    e.preventDefault();
  },{passive:false});

  // ── Confirmar ─────────────────────────────────────────────────
  function confirmSelect() {
    if (confirmedIdx!==-1) return;
    confirmedIdx=selectedIdx;
    const cpuIdx=(confirmedIdx+1)%ROSTER.length;
    setTimeout(()=>{
      hide();
      if (onConfirmCb) onConfirmCb({player:ROSTER[confirmedIdx],cpu:ROSTER[cpuIdx]});
    },1400);
  }
  // ── Show / Hide ───────────────────────────────────────────────
  function show(cb, playAgain = false) {
    onConfirmCb   = cb;
    confirmedIdx  = -1;
    selectedIdx   = 0;
    hoveredIdx    = -1;
    playAgainFlag = playAgain;
    tick          = 0;

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
    overlay.getBoundingClientRect();
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

  return { show, ROSTER };
})();
