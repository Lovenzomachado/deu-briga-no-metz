// ─── Mobile Controls ─────────────────────────────────────────────
// Conecta os botões touch ao sistema Input sem modificar game.js/player.js.
// Cada botão usa touchstart/touchend para simular press/release de tecla.

(function () {
  // Só inicializa se for dispositivo touch
  const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  const mobileEl     = document.getElementById('mobile-controls');
  const controlsBar  = document.getElementById('controls-bar');

  if (isTouchDevice) {
    mobileEl.style.display    = 'flex';
    controlsBar.style.display = 'none';
  } else {
    // Desktop: mantém controles de teclado, esconde mobile
    mobileEl.style.display = 'none';
    return;
  }

  // Previne scroll/zoom acidental durante o jogo
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  document.addEventListener('touchstart', e => {
    if (e.target.closest('#mobile-controls')) e.preventDefault();
  }, { passive: false });

  // ── Botão especial: simula S + D + J simultaneamente ──────────
  function pressSpecial()   { Input.press('s'); Input.press('j'); }
  function releaseSpecial() { Input.release('s'); Input.release('j'); }

  // ── Vincula cada botão ─────────────────────────────────────────
  document.querySelectorAll('.dpad-btn, .action-btn').forEach(btn => {
    const key     = btn.dataset.key;
    const special = btn.dataset.special === 'true';

    function onStart(e) {
      e.preventDefault();
      btn.classList.add('active');
      if (special) pressSpecial();
      else if (key) Input.press(key);
    }

    function onEnd(e) {
      e.preventDefault();
      btn.classList.remove('active');
      if (special) releaseSpecial();
      else if (key) Input.release(key);
    }

    btn.addEventListener('touchstart',  onStart, { passive: false });
    btn.addEventListener('touchend',    onEnd,   { passive: false });
    btn.addEventListener('touchcancel', onEnd,   { passive: false });

    // Suporte a mouse para testes no desktop (remover em prod se quiser)
    btn.addEventListener('mousedown', onStart);
    btn.addEventListener('mouseup',   onEnd);
    btn.addEventListener('mouseleave', onEnd);
  });

  // ── Suporte a multi-touch no D-pad ────────────────────────────
  // Permite segurar ← e depois tocar em ataque sem soltar o dedo
  const dpad = document.getElementById('dpad');
  dpad.addEventListener('touchstart', handleDpad, { passive: false });
  dpad.addEventListener('touchend',   handleDpad, { passive: false });
  dpad.addEventListener('touchmove',  handleDpad, { passive: false });
  dpad.addEventListener('touchcancel',handleDpad, { passive: false });

  function handleDpad(e) {
    e.preventDefault();
    const leftBtn  = document.getElementById('btn-left');
    const rightBtn = document.getElementById('btn-right');
    const leftRect  = leftBtn.getBoundingClientRect();
    const rightRect = rightBtn.getBoundingClientRect();

    let leftActive  = false;
    let rightActive = false;

    for (const touch of e.touches) {
      const tx = touch.clientX;
      const ty = touch.clientY;
      if (tx >= leftRect.left && tx <= leftRect.right && ty >= leftRect.top && ty <= leftRect.bottom)
        leftActive = true;
      if (tx >= rightRect.left && tx <= rightRect.right && ty >= rightRect.top && ty <= rightRect.bottom)
        rightActive = true;
    }

    // Sincroniza estado dos botões com Input
    if (leftActive)  { leftBtn.classList.add('active');    Input.press('arrowleft');   }
    else             { leftBtn.classList.remove('active');  Input.release('arrowleft'); }
    if (rightActive) { rightBtn.classList.add('active');   Input.press('arrowright');  }
    else             { rightBtn.classList.remove('active'); Input.release('arrowright');}
  }

})();
