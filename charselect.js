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
  const ROSTER = [
    {
      id:       'metz',
      name:     'HENRIQUE',
      subtitle: 'O FUNDADOR',
      folder:   'sprites/metz',
      portrait: 'sprites/metz/idle.png',
      color:    [58, 140, 63],    // RGB para gradientes
      glow:     '#00ff88',
      stats: { POWER: 7, SPEED: 8, DEFENSE: 5, SPECIAL: 7 },
      walkFrames: [
        'sprites/metz/walk/walk1.png','sprites/metz/walk/walk2.png',
        'sprites/metz/walk/walk3.png','sprites/metz/walk/walk4.png',
        'sprites/metz/walk/walk5.png','sprites/metz/walk/walk6.png',
        'sprites/metz/walk/walk7.png','sprites/metz/walk/walk8.png',
      ],
    },
    {
      id:       'mila',
      name:     'FEZO',
      subtitle: 'A BARISTA',
      folder:   'sprites/mila',
      portrait: 'sprites/mila/idle.png',
      color:    [139, 58, 106],
      glow:     '#ff88dd',
      stats: { POWER: 8, SPEED: 6, DEFENSE: 7, SPECIAL: 9 },
      walkFrames: [
        'sprites/mila/walk/walk1.png','sprites/mila/walk/walk2.png',
        'sprites/mila/walk/walk3.png','sprites/mila/walk/walk4.png',
        'sprites/mila/walk/walk5.png','sprites/mila/walk/walk6.png',
        'sprites/mila/walk/walk7.png','sprites/mila/walk/walk8.png',
      ],
    },
  ];

  // ── Pre-load de imagens ────────────────────────────────────────
  ROSTER.forEach(c => {
    const img = new Image();
    img.src = c.portrait;
    c._img = img;
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
  let confirmedIdx = -1;
  let onConfirmCb  = null;
  let animFrame    = null;
  let playAgainFlag = false;
  let tick         = 0;  // contador de frames para animações

  // Dimensões do grid de cards
  const COLS     = Math.min(ROSTER.length, 8);
  const ROWS     = Math.ceil(ROSTER.length / COLS);
  const CARD_W   = 84;
  const CARD_H   = 84;
  const CARD_GAP = 6;
  const GRID_W   = COLS * (CARD_W + CARD_GAP) - CARD_GAP;
  const GRID_X   = (CW - GRID_W) / 2;
  const GRID_Y   = 180;

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
        // Clip para ficar dentro do card
        ctx.beginPath();
        ctx.rect(x, y, CARD_W, CARD_H - 16);
        ctx.clip();

        const iw = char._img.naturalWidth;
        const ih = char._img.naturalHeight;
        const sc = Math.min(CARD_W / iw, (CARD_H - 16) / ih) * 0.92;
        const dw = iw * sc, dh = ih * sc;
        const dx = x + (CARD_W - dw) / 2;
        const dy = y + (CARD_H - 16 - dh); // alinha na base do card

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(char._img, dx, dy, dw, dh);
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

  return { show, ROSTER };
})();
