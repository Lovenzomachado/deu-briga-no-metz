// ─── Mobile Controls ─────────────────────────────────────────────
(function () {
  const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const mobileEl    = document.getElementById('mobile-controls');
  const controlsBar = document.getElementById('controls-bar');

  if (isTouchDevice) {
    mobileEl.style.display    = 'flex';
    controlsBar.style.display = 'none';
  } else {
    mobileEl.style.display = 'none';
    return;
  }

  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  document.addEventListener('touchstart', e => {
    if (e.target.closest('#mobile-controls')) e.preventDefault();
  }, { passive: false });

  // Especial = ↓ + J
  function pressSpecial()   { Input.press('arrowdown'); Input.press('j'); }
  function releaseSpecial() { Input.release('arrowdown'); Input.release('j'); }

  // Ação dos botões simples
  document.querySelectorAll('.action-btn').forEach(btn => {
    const key     = btn.dataset.key;
    const special = btn.dataset.special === 'true';

    const onStart = (e) => {
      e.preventDefault();
      btn.classList.add('active');
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
    btn.addEventListener('touchcancel', onEnd,   { passive: false });
    btn.addEventListener('mousedown',   onStart);
    btn.addEventListener('mouseup',     onEnd);
    btn.addEventListener('mouseleave',  onEnd);
  });

  // ── D-pad com multi-touch e 4 direções ───────────────────────────
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

  // Estado atual de cada direção
  const dpadActive = { up: false, down: false, left: false, right: false };

  function syncDpad(e) {
    e.preventDefault();
    const newState = { up: false, down: false, left: false, right: false };

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

    // Aplica mudanças
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

  dpad.addEventListener('touchstart',  syncDpad, { passive: false });
  dpad.addEventListener('touchmove',   syncDpad, { passive: false });
  dpad.addEventListener('touchend',    syncDpad, { passive: false });
  dpad.addEventListener('touchcancel', syncDpad, { passive: false });

})();
