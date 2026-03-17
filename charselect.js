// ─── Character Select Screen ──────────────────────────────────────
// Gerencia a tela de seleção antes do jogo começar.
// Exporta: CharSelect.show(onConfirm)
// onConfirm recebe { p1: 'p1'|'p2', cpu: 'p1'|'p2' }

const CharSelect = (() => {

  // ── Catálogo de personagens ────────────────────────────────────
  // Para adicionar novos personagens, basta empurrar aqui.
  const ROSTER = [
    {
      id:       'metz',
      name:     'HENRIQUE',
      subtitle: 'O Fundador',
      folder:   'sprites/metz',
      portrait: 'sprites/metz/idle.png',
      color:    '#3a8c3f',
      glow:     '#00ff88',
      stats: { poder: 7, velocidade: 8, defesa: 5, especial: 7 },
      walkFrames: [
        'sprites/metz/walk/walk1.png',
        'sprites/metz/walk/walk2.png',
        'sprites/metz/walk/walk3.png',
        'sprites/metz/walk/walk4.png',
        'sprites/metz/walk/walk5.png',
        'sprites/metz/walk/walk6.png',
        'sprites/metz/walk/walk7.png',
        'sprites/metz/walk/walk8.png',
      ],
      specialFrames: [
        'sprites/metz/special/special1.png',
        'sprites/metz/special/special2.png',
        'sprites/metz/special/special3.png',
        'sprites/metz/special/special4.png',
        'sprites/metz/special/special5.png',
        'sprites/metz/special/special6.png',
        'sprites/metz/special/special7.png',
      ],
    },
    {
      id:       'mila',
      name:     'FEZO',
      subtitle: 'A Barista',
      folder:   'sprites/mila',
      portrait: 'sprites/mila/idle.png',
      color:    '#8B3a6a',
      glow:     '#ff88dd',
      stats: { poder: 8, velocidade: 6, defesa: 7, especial: 9 },
      walkFrames: [
        'sprites/mila/walk/walk1.png',
        'sprites/mila/walk/walk2.png',
        'sprites/mila/walk/walk3.png',
        'sprites/mila/walk/walk4.png',
        'sprites/mila/walk/walk5.png',
        'sprites/mila/walk/walk6.png',
        'sprites/mila/walk/walk7.png',
        'sprites/mila/walk/walk8.png',
      ],
    },
  ];

  // ── Estado interno ─────────────────────────────────────────────
  let selectedIdx = 0;       // índice no ROSTER que o cursor está
  let confirmedIdx = -1;     // -1 = ainda não confirmou
  let onConfirmCb  = null;
  let animFrame    = null;
  let cursorPulse  = 0;

  // Pre-load portraits
  ROSTER.forEach(c => {
    const img = new Image();
    img.src = c.portrait;
    c._img = img;
  });

  // ── Overlay HTML ───────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'charselect-overlay';
  overlay.innerHTML = `
    <div id="cs-bg"></div>

    <div id="cs-header">
      <div id="cs-title">SELECIONE SEU LUTADOR</div>
      <div id="cs-subtitle">ESCOLHA O PERSONAGEM</div>
    </div>

    <div id="cs-stage">
      <!-- Preview grande do personagem selecionado -->
      <div id="cs-preview-wrap">
        <div id="cs-preview-glow"></div>
        <canvas id="cs-preview-canvas" width="280" height="340"></canvas>
      </div>

      <!-- Grid de personagens -->
      <div id="cs-right">
        <div id="cs-grid"></div>
        <div id="cs-info">
          <div id="cs-char-name">—</div>
          <div id="cs-char-sub">—</div>
          <div id="cs-stats"></div>
        </div>
        <div id="cs-confirm-hint">
          <span class="cs-key">ENTER</span> Confirmar &nbsp;
          <span class="cs-key">← →</span> Navegar
        </div>
      </div>
    </div>

    <div id="cs-vs-banner" class="hidden">
      <div class="cs-vs-name" id="cs-vs-p1name"></div>
      <div class="cs-vs-text">VS</div>
      <div class="cs-vs-name" id="cs-vs-cpuname">CPU</div>
    </div>
  `;
  document.body.appendChild(overlay);

  // ── Referências ────────────────────────────────────────────────
  const grid         = overlay.querySelector('#cs-grid');
  const charName     = overlay.querySelector('#cs-char-name');
  const charSub      = overlay.querySelector('#cs-char-sub');
  const statsEl      = overlay.querySelector('#cs-stats');
  const previewCanvas= overlay.querySelector('#cs-preview-canvas');
  const previewGlow  = overlay.querySelector('#cs-preview-glow');
  const vsBanner     = overlay.querySelector('#cs-vs-banner');
  const previewCtx   = previewCanvas.getContext('2d');

  // ── Montar grid ───────────────────────────────────────────────
  ROSTER.forEach((char, i) => {
    const card = document.createElement('div');
    card.className = 'cs-card';
    card.dataset.idx = i;
    card.innerHTML = `
      <div class="cs-card-portrait">
        <img src="${char.portrait}" alt="${char.name}" draggable="false"/>
      </div>
      <div class="cs-card-label">${char.name}</div>
    `;
    card.addEventListener('click', () => { selectedIdx = i; confirmSelect(); });
    card.addEventListener('mouseenter', () => { selectedIdx = i; updateUI(); });
    grid.appendChild(card);
  });

  // ── Teclado ───────────────────────────────────────────────────
  function onKey(e) {
    if (!overlay.classList.contains('visible')) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowleft'  || k === 'a') { selectedIdx = (selectedIdx - 1 + ROSTER.length) % ROSTER.length; updateUI(); }
    if (k === 'arrowright' || k === 'd') { selectedIdx = (selectedIdx + 1) % ROSTER.length; updateUI(); }
    if (k === 'enter' || k === ' ')      { confirmSelect(); e.preventDefault(); }
  }
  window.addEventListener('keydown', onKey);

  // ── Touch nos cards (mobile) ──────────────────────────────────
  // (já coberto pelo click listener acima)

  // ── UI update ────────────────────────────────────────────────
  function updateUI() {
    const char = ROSTER[selectedIdx];

    // Cards
    grid.querySelectorAll('.cs-card').forEach((card, i) => {
      card.classList.toggle('selected', i === selectedIdx);
      card.style.setProperty('--char-glow', ROSTER[i].glow);
    });

    // Info
    charName.textContent = char.name;
    charSub.textContent  = char.subtitle;
    charName.style.color = char.glow;
    charName.style.textShadow = `0 0 12px ${char.glow}`;

    // Stats
    const statLabels = { poder: 'PODER', velocidade: 'VEL', defesa: 'DEF', especial: 'ESP' };
    statsEl.innerHTML = Object.entries(char.stats).map(([k, v]) => `
      <div class="cs-stat">
        <span class="cs-stat-label">${statLabels[k]}</span>
        <div class="cs-stat-bar">
          <div class="cs-stat-fill" style="width:${v * 10}%; background:${char.glow}; box-shadow: 0 0 6px ${char.glow}"></div>
        </div>
      </div>
    `).join('');

    // Glow cor
    previewGlow.style.background = `radial-gradient(ellipse at center, ${char.glow}33 0%, transparent 70%)`;

    drawPreview();
  }

  // ── Preview canvas ────────────────────────────────────────────
  function drawPreview() {
    const char = ROSTER[selectedIdx];
    const pw = previewCanvas.width;
    const ph = previewCanvas.height;
    previewCtx.clearRect(0, 0, pw, ph);

    if (char._img && char._img.complete && char._img.naturalWidth > 0) {
      // Desenha centralizado e com leve bounce
      const bounce = Math.sin(Date.now() / 600) * 5;
      const iw = char._img.naturalWidth;
      const ih = char._img.naturalHeight;
      const scale = Math.min(pw / iw, ph / ih) * 0.85;
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (pw - dw) / 2;
      const dy = (ph - dh) / 2 + bounce;

      // Sombra no chão
      previewCtx.save();
      previewCtx.globalAlpha = 0.25;
      previewCtx.fillStyle = '#000';
      previewCtx.beginPath();
      previewCtx.ellipse(pw / 2, ph - 14, dw * 0.38, 10, 0, 0, Math.PI * 2);
      previewCtx.fill();
      previewCtx.restore();

      previewCtx.drawImage(char._img, dx, dy, dw, dh);
    } else {
      // Placeholder
      previewCtx.fillStyle = char.glow + '44';
      previewCtx.fillRect(60, 40, 160, 260);
      previewCtx.fillStyle = char.glow;
      previewCtx.font = 'bold 14px monospace';
      previewCtx.textAlign = 'center';
      previewCtx.fillText(char.name, pw / 2, ph / 2);
    }
  }

  // ── Loop de animação da preview ───────────────────────────────
  function previewLoop() {
    if (!overlay.classList.contains('visible')) return;
    drawPreview();
    cursorPulse = (cursorPulse + 1) % 60;
    animFrame = requestAnimationFrame(previewLoop);
  }

  // ── Confirmar seleção ─────────────────────────────────────────
  function confirmSelect() {
    if (confirmedIdx !== -1) return; // já confirmou
    confirmedIdx = selectedIdx;

    // Feedback visual
    const card = grid.querySelectorAll('.cs-card')[confirmedIdx];
    card.classList.add('confirmed');

    // CPU escolhe aleatoriamente (ou sempre o oposto)
    const cpuIdx = (confirmedIdx + 1) % ROSTER.length;
    const cpuChar = ROSTER[cpuIdx];

    // Mostra banner VS
    overlay.querySelector('#cs-vs-p1name').textContent  = ROSTER[confirmedIdx].name;
    overlay.querySelector('#cs-vs-cpuname').textContent = 'CPU — ' + cpuChar.name;
    overlay.querySelector('#cs-vs-p1name').style.color  = ROSTER[confirmedIdx].glow;
    overlay.querySelector('#cs-vs-cpuname').style.color = cpuChar.glow;
    vsBanner.classList.remove('hidden');

    // Após animação, chama callback
    setTimeout(() => {
      hide();
      if (onConfirmCb) {
        onConfirmCb({
          player: ROSTER[confirmedIdx],
          cpu:    cpuChar,
        });
      }
    }, 1400);
  }

  // ── Show / Hide ───────────────────────────────────────────────
  function show(cb) {
    onConfirmCb  = cb;
    confirmedIdx = -1;
    selectedIdx  = 0;

    // Força display antes de adicionar classe (evita flash de display:none)
    overlay.style.display = 'flex';
    // Força reflow para a transition de opacity funcionar
    overlay.getBoundingClientRect();
    overlay.classList.add('visible');

    // Esconde o HUD do jogo enquanto está na seleção
    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay) uiOverlay.style.display = 'none';

    updateUI();
    previewLoop();
  }

  function hide() {
    overlay.classList.remove('visible');
    overlay.style.display = 'none';
    cancelAnimationFrame(animFrame);

    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay) uiOverlay.style.display = '';
  }

  return { show, ROSTER };
})();
