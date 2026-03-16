// ─── Input System ────────────────────────────────────────────────
const Input = (() => {
  const held = {};
  const justPressed = {};
  const justReleased = {};

  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (!held[k]) justPressed[k] = true;
    held[k] = true;
    if (k === ' ') e.preventDefault();
  });

  window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    held[k] = false;
    justReleased[k] = true;
  });

  function flush() {
    for (const k in justPressed) delete justPressed[k];
    for (const k in justReleased) delete justReleased[k];
  }

  function isHeld(key)      { return !!held[key.toLowerCase()]; }
  function wasPressed(key)  { return !!justPressed[key.toLowerCase()]; }
  function wasReleased(key) { return !!justReleased[key.toLowerCase()]; }
  function comboHeld(...keys) { return keys.every(k => held[k.toLowerCase()]); }

  return { isHeld, wasPressed, wasReleased, comboHeld, flush };
})();
