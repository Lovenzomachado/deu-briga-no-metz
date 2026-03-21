// ─── Input System (keyboard + touch) ─────────────────────────────
// Módulo centralizado de input. Unifica teclado e botões touch em
// uma única API. Todos os outros módulos usam Input.isHeld(),
// Input.wasPressed() etc. — nunca acessam eventos DOM diretamente.
//
// API pública:
//   isHeld(key)      → true enquanto a tecla está pressionada
//   wasPressed(key)  → true apenas no frame em que foi pressionada
//   wasReleased(key) → true apenas no frame em que foi solta
//   comboHeld(k1,k2) → true se todas as teclas estão seguradas
//   press(key)       → simula tecla pressionada (usado pelo mobile.js)
//   release(key)     → simula tecla solta (usado pelo mobile.js)
//   flush()          → limpa justPressed/justReleased (chamado 1x/frame)

const Input = (() => {
  // held: teclas atualmente seguradas
  // justPressed: teclas pressionadas NESTE frame (limpas no flush)
  // justReleased: teclas soltas NESTE frame (limpas no flush)
  const held         = {};
  const justPressed  = {};
  const justReleased = {};

  // ── Keyboard ──────────────────────────────────────────────────
  // Registra keydown: marca como held e justPressed (se não estava held)
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (!held[k]) justPressed[k] = true;
    held[k] = true;
    if (k === ' ') e.preventDefault(); // evita scroll da página com espaço
  });

  // Registra keyup: remove de held, marca justReleased
  window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    held[k] = false;
    justReleased[k] = true;
  });

  // ── Touch API (called by on-screen buttons) ───────────────────
  // Chamado pelo mobile.js para simular teclas via toque na tela
  function press(key) {
    const k = key.toLowerCase();
    if (!held[k]) justPressed[k] = true;
    held[k] = true;
  }

  function release(key) {
    const k = key.toLowerCase();
    held[k] = false;
    justReleased[k] = true;
  }

  // ── Flush (called once per frame) ─────────────────────────────
  // Limpa os estados de "apenas neste frame". Deve ser chamado no
  // final de cada frame pelo game loop (Input.flush()).
  function flush() {
    for (const k in justPressed)  delete justPressed[k];
    for (const k in justReleased) delete justReleased[k];
  }

  function isHeld(key)        { return !!held[key.toLowerCase()]; }
  function wasPressed(key)    { return !!justPressed[key.toLowerCase()]; }
  function wasReleased(key)   { return !!justReleased[key.toLowerCase()]; }
  // comboHeld: retorna true apenas se TODAS as teclas estão held simultaneamente
  function comboHeld(...keys) { return keys.every(k => held[k.toLowerCase()]); }

  return { isHeld, wasPressed, wasReleased, comboHeld, flush, press, release };
})();
