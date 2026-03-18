// ─── Intro Screen ─────────────────────────────────────────────────
// Mostra background + title animado antes da charselect.
// Intro.show(onDone) → chama onDone() quando o jogador pressiona qualquer tecla/toque

const Intro = (() => {

  // ── Carrega imagens ──────────────────────────────────────────────
  const bgImg    = new Image(); bgImg.src    = 'intro/background.png';
  const titleImg = new Image(); titleImg.src = 'intro/title.png';

  // ── Overlay HTML ─────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'intro-overlay';
  overlay.innerHTML = `
    <canvas id="intro-canvas"></canvas>
    <div id="intro-press">
      <span class="press-text">PRESSIONE QUALQUER TECLA</span>
    </div>
  `;
  document.body.appendChild(overlay);

  const canvas = document.getElementById('intro-canvas');
  const ctx    = canvas.getContext('2d');

  // Estado do módulo
  let animFrame = null;  // handle do requestAnimationFrame para cancelar
  let onDoneCb  = null;  // callback chamado quando o jogador pula a intro
  let startTime = 0;     // timestamp do início da animação
  let canSkip   = false; // evita skip acidental no primeiro frame (ativo após 1.2s)

  // ── Resize canvas ────────────────────────────────────────────────
  // O canvas da intro ocupa 100% da janela. Redimensiona ao girar o celular.
  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);

  // ── Animação principal ───────────────────────────────────────────
  // Loop de animação da intro. Roda independente do game loop principal.
  // t = segundos desde o início; usado para calcular todas as animações.
  function draw(ts) {
    animFrame = requestAnimationFrame(draw);
    const t = (ts - startTime) / 1000; // segundos desde o início

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // ── Background ────────────────────────────────────────────────
    if (bgImg.complete && bgImg.naturalWidth > 0) {
      const bw = bgImg.naturalWidth, bh = bgImg.naturalHeight;
      const sc = Math.max(W / bw, H / bh);
      const dw = bw * sc, dh = bh * sc;
      const dx = (W - dw) / 2, dy = (H - dh) / 2;
      ctx.drawImage(bgImg, dx, dy, dw, dh);
    } else {
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, W, H);
    }

    // Vinheta escura nas bordas
    const vignette = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.85);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    // ── Title animado ─────────────────────────────────────────────
    if (titleImg.complete && titleImg.naturalWidth > 0) {
      const tw = titleImg.naturalWidth, th = titleImg.naturalHeight;

      // Escala: ocupa ~55% da largura
      const scale   = (W * 0.55) / tw;
      const dw      = tw * scale;
      const dh      = th * scale;

      // Posição: centro horizontal, 30% do topo
      const baseX   = (W - dw) / 2;
      const baseY   = H * 0.08;

      // Animações combinadas:
      // 1. Float suave para cima/baixo (senoidal lento)
      const floatY  = Math.sin(t * 1.1) * 8;
      // 2. Leve rotação oscilatória
      const rot     = Math.sin(t * 0.7) * 0.012;
      // 3. Escala pulsante (respira)
      const pulse   = 1 + Math.sin(t * 1.8) * 0.015;
      // 4. Fade-in no início
      const fadeIn  = Math.min(1, t / 0.8);

      ctx.save();
      ctx.globalAlpha = fadeIn;

      // Aplica transformações centradas no título
      const cx = baseX + dw / 2;
      const cy = baseY + dh / 2 + floatY;
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(pulse, pulse);

      // Glow laranja por baixo
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur  = 28 + Math.sin(t * 2.2) * 10;

      ctx.drawImage(titleImg, -dw/2, -dh/2, dw, dh);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // ── "INSERT COINS" / "PRESSIONE" piscando ─────────────────────
    if (t > 1.2) {
      const blink = Math.floor(t * 2) % 2 === 0;
      if (blink) {
        const pressEl = document.getElementById('intro-press');
        if (pressEl) pressEl.style.opacity = '1';
      } else {
        const pressEl = document.getElementById('intro-press');
        if (pressEl) pressEl.style.opacity = '0';
      }
      canSkip = true;
    }
  }

  // ── Skip input ───────────────────────────────────────────────────
  // Qualquer tecla, toque ou clique pula a intro após canSkip = true (1.2s)
  function onKeyDown(e) {
    if (!canSkip) return;
    skip();
  }
  function onTouch(e) {
    if (!canSkip) return;
    skip();
  }

  function skip() {
    hide();
    if (onDoneCb) onDoneCb();
  }

  // ── Show / Hide ──────────────────────────────────────────────────
  // show(cb): exibe a intro e registra o callback para quando terminar
  // hide():   esconde com fade-out de 400ms e cancela o loop de animação
  function show(cb) {
    onDoneCb = cb;
    canSkip  = false;
    startTime = performance.now();

    resizeCanvas();
    overlay.style.display = 'block';
    // Força reflow para animação CSS funcionar
    overlay.getBoundingClientRect();
    overlay.classList.add('visible');

    animFrame = requestAnimationFrame(draw);

    window.addEventListener('keydown',   onKeyDown);
    window.addEventListener('touchstart', onTouch,  { passive: true });
    canvas.addEventListener('click',      skip);
  }

  function hide() {
    overlay.classList.remove('visible');
    setTimeout(() => { overlay.style.display = 'none'; }, 400);
    cancelAnimationFrame(animFrame);
    window.removeEventListener('keydown',    onKeyDown);
    window.removeEventListener('touchstart', onTouch);
    canvas.removeEventListener('click',      skip);
  }

  return { show };
})();
