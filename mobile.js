// ─── Mobile Controls ─────────────────────────────────────────────
// Conecta os botões HTML on-screen ao sistema Input sem modificar
// game.js ou player.js. Funciona como uma "ponte" touch → Input.
//
// Só inicializa em dispositivos touch. Em desktop retorna imediatamente.
// Estrutura do controle na tela:
//   Esquerda: D-pad em cruz (▲ ▼ ◀ ▶)
//   Direita:  Botões de ação (LEVE, FORTE, DODGE)

(function () {
  // Detecta se é dispositivo touch — se não for, esconde controles mobile
  const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const mobileEl    = document.getElementById('mobile-controls');
  const controlsBar = document.getElementById('controls-bar'); // hint de teclado desktop

  if (isTouchDevice) {
    mobileEl.style.display    = 'flex';
    controlsBar.style.display = 'none'; // esconde hint de teclado no mobile
  } else {
    mobileEl.style.display = 'none'; // esconde botões no desktop
    return;
  }

  // Previne scroll/zoom acidental enquanto joga
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  document.addEventListener('touchstart', e => {
    if (e.target.closest('#mobile-controls')) e.preventDefault();
  }, { passive: false });

  // ── Botão Especial ────────────────────────────────────────────
  // Especial = ↓ + J (simula dois inputs simultâneos)
  function pressSpecial()   { Input.press('arrowdown'); Input.press('j'); }
  function releaseSpecial() { Input.release('arrowdown'); Input.release('j'); }

  // ── Botões de ação (LEVE, FORTE, DODGE) ──────────────────────
  // Cada botão tem data-key com a tecla que simula.
  // touchstart → Input.press, touchend/cancel → Input.release
  // mousedown/up também tratados para testes no desktop via mouse
  document.querySelectorAll('.action-btn').forEach(btn => {
    const key     = btn.dataset.key;
    const special = btn.dataset.special === 'true';

    const onStart = (e) => {
      e.preventDefault();
      btn.classList.add('active'); // feedback visual
      if (special) pressSpecial();
      else if (key) Input.press(key);
    };
    const onEnd = (e) => {
      e.preventDefault();
      btn.classList.remove('active');
      if (special) releaseSpecial();
      else if (key) Input.release(key);
    };

    btn.addEventListener('touchstart',  onStart, { passive: false });
    btn.addEventListener('touchend',    onEnd,   { passive: false });
    btn.addEventListener('touchcancel', onEnd,   { passive: false }); // toque interrompido
    btn.addEventListener('mousedown',   onStart);
    btn.addEventListener('mouseup',     onEnd);
    btn.addEventListener('mouseleave',  onEnd); // soltou fora do botão
  });

  // ── D-pad com multi-touch e 4 direções ───────────────────────────
  // O d-pad suporta múltiplos dedos simultâneos (ex: segurar ← e tocar ▲).
  // A cada evento touch, recalcula quais direções estão ativas comparando
  // as posições dos toques com os bounding rects dos botões.
  const DPAD_KEYS = {
    'btn-up':    'arrowup',
    'btn-down':  'arrowdown',
    'btn-left':  'arrowleft',
    'btn-right': 'arrowright',
  };

  const dpad = document.getElementById('dpad');
  const dpadBtns = {
    up:    document.getElementById('btn-up'),
    down:  document.getElementById('btn-down'),
    left:  document.getElementById('btn-left'),
    right: document.getElementById('btn-right'),
  };

  // Estado atual de cada direção — evita chamar press/release desnecessariamente
  const dpadActive = { up: false, down: false, left: false, right: false };

  // syncDpad: chamado em qualquer evento touch sobre o d-pad.
  // Verifica todos os toques ativos e determina quais botões estão cobertos.
  function syncDpad(e) {
    e.preventDefault();
    const newState = { up: false, down: false, left: false, right: false };

    // Para cada toque ativo, verifica se está dentro de algum botão do d-pad
    for (const touch of e.touches) {
      for (const [dir, btn] of Object.entries(dpadBtns)) {
        if (!btn) continue;
        const r = btn.getBoundingClientRect();
        if (touch.clientX >= r.left && touch.clientX <= r.right &&
            touch.clientY >= r.top  && touch.clientY <= r.bottom) {
          newState[dir] = true;
        }
      }
    }

    // Aplica apenas as mudanças (press se ficou ativo, release se ficou inativo)
    for (const [dir, active] of Object.entries(newState)) {
      const key = DPAD_KEYS['btn-' + dir];
      const btn = dpadBtns[dir];
      if (active && !dpadActive[dir]) {
        Input.press(key);
        btn?.classList.add('active');
      } else if (!active && dpadActive[dir]) {
        Input.release(key);
        btn?.classList.remove('active');
      }
      dpadActive[dir] = active;
    }
  }

  // Escuta todos os eventos touch no d-pad (start, move, end, cancel)
  dpad.addEventListener('touchstart',  syncDpad, { passive: false });
  dpad.addEventListener('touchmove',   syncDpad, { passive: false });
  dpad.addEventListener('touchend',    syncDpad, { passive: false });
  dpad.addEventListener('touchcancel', syncDpad, { passive: false });

})();
