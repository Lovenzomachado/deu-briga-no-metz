// ─── Input System (keyboard + touch) ─────────────────────────────
// Módulo centralizado de input. Unifica teclado e botões touch em
// uma única API. Todos os outros módulos usam Input.isHeld(),
// Input.wasPressed() etc. — nunca acessam eventos DOM diretamente.
//
// API pública (por instância — ver createInput):
//   isHeld(key)      → true enquanto a tecla está pressionada
//   wasPressed(key)  → true apenas no frame em que foi pressionada
//   wasReleased(key) → true apenas no frame em que foi solta
//   comboHeld(k1,k2) → true se todas as teclas estão seguradas
//   press(key)       → simula tecla pressionada (usado pelo mobile.js)
//   release(key)     → simula tecla solta (usado pelo mobile.js)
//   flush()          → limpa justPressed/justReleased (chamado 1x/step)
//   snapshot()       → {h,p,r} arrays p/ enviar pela rede (lockstep)
//   applySnapshot(s) → injeta snapshot remoto (limpa estado anterior)
//   reset()          → limpa tudo (início de luta online)
//
// Input = instância global do P1 local (teclado + touch).
// Instâncias remotas: createInput({bindKeyboard:false}) — sem listeners,
// alimentadas via applySnapshot() pelo netplay.js.

// ── Fábrica ─────────────────────────────────────────────────────
// bindKeyboard:true registra keydown/keyup do window nesta instância.
// Só a instância local usa true; a remota recebe tudo via rede.
function createInput({ bindKeyboard = false } = {}) {
  // held: teclas atualmente seguradas
  // justPressed: teclas pressionadas NESTE step (limpas no flush)
  // justReleased: teclas soltas NESTE step (limpas no flush)
  const held         = {};
  const justPressed  = {};
  const justReleased = {};

  if (bindKeyboard) {
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
  }

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

  // Limpa os estados de "apenas neste step". Deve ser chamado no
  // final de cada step pelo game loop.
  function flush() {
    for (const k in justPressed)  delete justPressed[k];
    for (const k in justReleased) delete justReleased[k];
  }

  function reset() {
    for (const k in held)         delete held[k];
    for (const k in justPressed)  delete justPressed[k];
    for (const k in justReleased) delete justReleased[k];
  }

  // Serializa o estado atual para envio (arrays compactos).
  function snapshot() {
    const h = [], p = [], r = [];
    for (const k in held)         if (held[k])         h.push(k);
    for (const k in justPressed)  if (justPressed[k])  p.push(k);
    for (const k in justReleased) if (justReleased[k]) r.push(k);
    return { h, p, r };
  }

  // Injeta um snapshot remoto, substituindo o estado anterior.
  // Chamado 1x por step antes de simular o lutador remoto.
  function applySnapshot(s) {
    if (!s) return;
    reset();
    for (const k of (s.h || [])) held[k] = true;
    for (const k of (s.p || [])) { justPressed[k] = true; held[k] = true; }
    for (const k of (s.r || [])) { justReleased[k] = true; held[k] = false; }
  }

  function isHeld(key)        { return !!held[key.toLowerCase()]; }
  function wasPressed(key)    { return !!justPressed[key.toLowerCase()]; }
  function wasReleased(key)   { return !!justReleased[key.toLowerCase()]; }
  // comboHeld: retorna true apenas se TODAS as teclas estão held simultaneamente
  function comboHeld(...keys) { return keys.every(k => held[k.toLowerCase()]); }

  return { isHeld, wasPressed, wasReleased, comboHeld, flush, press, release,
           snapshot, applySnapshot, reset };
}

// Instância global do jogador local (teclado + touch via mobile.js)
const Input = createInput({ bindKeyboard: true });
