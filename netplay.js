// ─── Netplay (PeerJS + lockstep com delay) ───────────────────────
// Multiplayer P2P: funciona no GitHub Pages (só soma um <script>).
// O servidor gratuito do PeerJS só apresenta os dois navegadores;
// a luta roda direta entre eles, com a simulação em lockstep:
//
//   • Ambos executam os MESMOS gameSteps (60/s, como no offline).
//   • A cada step, cada lado envia seu Input.snapshot() e só simula
//     o step quando o snapshot remoto do mesmo step já chegou.
//   • INPUT_DELAY (3 steps ≈ 50ms) dá margem para o pacote chegar
//     sem travar — o lutador local também age com esse atraso,
//     igual para os dois lados (justo).
//
// Mapeamento: host = lutador da esquerda (player), guest = direita (cpu).
// Cada um escolhe o seu personagem; a seleção é trocada via Peer.

const RemoteInput = createInput({ bindKeyboard: false });

const Netplay = (() => {
  const INPUT_DELAY = 3; // steps de atraso (≈50ms) — absorve o jitter

  let peer = null, conn = null;
  let active   = false;  // true durante a luta online
  let isHost   = false;
  let myId     = null;
  let step     = 0;      // step atual da simulação online
  let localQueue  = {};  // step → snapshot do meu input
  let remoteQueue = {};  // step → snapshot do input adversário
  let myPick = null, remotePick = null;
  let onlineSel = null;  // {player, cpu} idêntico nos dois lados
  let wantRematch = false, remoteRematch = false;

  let lobbyEl = null, waitEl = null, dropEl = null;
  let offlineFn = null;

  // ── Estado (lido pelo game.js) ──────────────────────────────────
  function isInMatch()  { return active; }
  function isLocalLeft(){ return isHost; } // host joga com o da esquerda
  function currentStep(){ return step; }
  function matchSeconds(){ return Math.floor(step / 60); }
  function getSelection(){ return onlineSel; }

  // ── Boot: lobby antes de tudo ───────────────────────────────────
  // offlineFn(): fluxo original (Intro → CharSelect → luta vs CPU).
  function boot(fn) {
    offlineFn = fn;
    _buildLobby();
  }

  function _buildLobby() {
    lobbyEl = document.createElement('div');
    lobbyEl.id = 'netplay-lobby';
    lobbyEl.innerHTML = `
      <div id="netplay-card">
        <div id="netplay-title">DEU BRIGA NO METZ</div>
        <div id="netplay-sub">ONLINE P2P · LOCKSTEP</div>
        <div id="netplay-row">
          <button class="ko-btn" id="net-offline">▶ OFFLINE (vs CPU)</button>
        </div>
        <div id="netplay-div">— OU —</div>
        <div id="netplay-row">
          <button class="ko-btn" id="net-create">⚡ CRIAR SALA</button>
        </div>
        <div id="netplay-row">
          <input id="net-peer-id" placeholder="ID da sala do amigo" autocomplete="off" />
          <button class="ko-btn" id="net-join">ENTRAR</button>
        </div>
        <div id="netplay-myid"></div>
        <div id="netplay-status"></div>
      </div>
    `;
    document.body.appendChild(lobbyEl);

    const noPeer = (typeof Peer === 'undefined');
    if (noPeer) _status('PeerJS não carregou — cheque a internet. Offline funciona normal.');

    document.getElementById('net-offline').addEventListener('click', () => {
      _destroyLobby();
      _cleanupPeer();
      offlineFn();
    });
    document.getElementById('net-create').addEventListener('click', () => {
      if (noPeer) return;
      _host();
    });
    document.getElementById('net-join').addEventListener('click', () => {
      if (noPeer) return;
      const id = document.getElementById('net-peer-id').value.trim();
      if (!id) { _status('Digite o ID da sala.'); return; }
      _guest(id);
    });
  }

  function _destroyLobby() {
    if (lobbyEl) { lobbyEl.remove(); lobbyEl = null; }
  }

  function _cleanupPeer() {
    try { if (conn) conn.close(); } catch (e) {}
    try { if (peer) peer.destroy(); } catch (e) {}
    peer = null; conn = null;
  }

  function _status(msg) {
    const el = document.getElementById('netplay-status');
    if (el) el.textContent = msg;
  }

  // ── Host / Guest ────────────────────────────────────────────────
  function _host() {
    isHost = true;
    _status('Criando sala…');
    peer = new Peer();
    peer.on('open', id => {
      myId = id;
      document.getElementById('netplay-myid').textContent = 'SALA: ' + id + ' (manda pro amigo)';
      _status('Aguardando o amigo entrar…');
    });
    peer.on('connection', c => {
      conn = c;
      _wireConn();
    });
    peer.on('error', e => _status('Erro: ' + (e && e.type ? e.type : e)));
  }

  function _guest(hostId) {
    isHost = false;
    _status('Entrando na sala…');
    peer = new Peer();
    peer.on('open', () => {
      conn = peer.connect(hostId, { reliable: true });
      _wireConn();
    });
    peer.on('error', e => {
      if (e && e.type === 'peer-unavailable') _status('Sala não encontrada. Confere o ID.');
      else _status('Erro: ' + (e && e.type ? e.type : e));
    });
  }

  function _wireConn() {
    conn.on('open', () => {
      _status('Conectado! Escolha seu lutador.');
      _destroyLobby();
      _pickPhase();
    });
    conn.on('data', _onMsg);
    conn.on('close', _onDrop);
    conn.on('error', _onDrop);
  }

  function _send(msg) {
    if (conn && conn.open) {
      try { conn.send(msg); } catch (e) {}
    }
  }

  // ── Escolha de personagens (cada um escolhe o seu) ─────────────
  function _pickPhase() {
    myPick = null; remotePick = null;
    _showWaiting('Escolha seu lutador…');
    CharSelect.show(sel => {
      onLocalPick(sel.player);
    }, false);
  }

  // Recebe a entrada COMPLETA do ROSTER e envia só dados puros
  // (Image não atravessa o structured clone da DataConnection).
  function onLocalPick(entry) {
    myPick = {
      id: entry.id, name: entry.name, subtitle: entry.subtitle,
      charId: entry.charId, folder: entry.folder, portrait: entry.portrait,
      color: entry.color, glow: entry.glow, stats: entry.stats,
      frameCounts: entry.frameCounts || {}, walkFrames: entry.walkFrames || [],
    };
    _send({ t: 'pick', pick: myPick });
    _showWaiting('Aguardando o oponente escolher…');
    _maybeStart();
  }

  function _maybeStart() {
    if (!myPick || !remotePick || active) return;
    // Montagem idêntica nos dois lados: host = esquerda.
    const hostPick  = isHost ? myPick : remotePick;
    const guestPick = isHost ? remotePick : myPick;
    onlineSel = { player: hostPick, cpu: guestPick };
    _hideWaiting();
    resetMatch();
    applySelection(onlineSel);
  }

  // ── Lockstep ────────────────────────────────────────────────────
  function resetMatch() {
    step = 0;
    localQueue = {}; remoteQueue = {};
    wantRematch = false; remoteRematch = false;
    Input.reset(); RemoteInput.reset();
    // Ambos humanos; cada lado pilota o seu via inputSrc próprio.
    player.isPlayer = true;
    cpu.isPlayer    = true;
    if (isHost) { player.inputSrc = Input;         cpu.inputSrc = RemoteInput; }
    else        { player.inputSrc = RemoteInput;   cpu.inputSrc = Input; }
    // Semeia os primeiros steps para destravar (senão ambos esperam
    // o pacote do outro para o step 0 e nada anda — deadlock).
    const snap = Input.snapshot();
    for (let s = 0; s < INPUT_DELAY; s++) {
      localQueue[s] = snap;
      _send({ t: 'in', s, snap });
    }
    active = true;
  }

  // game.js só consome tempo do acumulador quando há input remoto
  // para o step atual — stall NÃO gasta tempo (só desacelera um pouco).
  function canStep() {
    return active && !!remoteQueue[step] && !!localQueue[step];
  }

  // Amostra o input vivo p/ o futuro, envia, e injeta no presente
  // as amostras com INPUT_DELAY de idade (atraso igual pros dois).
  function beginStep() {
    const live = Input.snapshot();
    localQueue[step + INPUT_DELAY] = live;
    _send({ t: 'in', s: step + INPUT_DELAY, snap: live });
    Input.applySnapshot(localQueue[step]);
    RemoteInput.applySnapshot(remoteQueue[step]);
  }

  function endStep() {
    delete localQueue[step];
    delete remoteQueue[step];
    step++;
  }

  // ── Mensagens ───────────────────────────────────────────────────
  function _onMsg(msg) {
    if (!msg || !msg.t) return;
    if (msg.t === 'pick') {
      remotePick = msg.pick;
      _maybeStart();
    } else if (msg.t === 'in') {
      // Guarda por step; duplicado é ignorado.
      if (!(msg.s in remoteQueue)) remoteQueue[msg.s] = msg.snap;
    } else if (msg.t === 'rematch') {
      remoteRematch = true;
      _tryRematch();
    } else if (msg.t === 'repick') {
      _toPickPhase();
    }
  }

  // ── Revanche / trocar personagem (só reinicia de comum acordo) ──
  function requestRematch() {
    wantRematch = true;
    _send({ t: 'rematch' });
    _tryRematch();
  }

  function _tryRematch() {
    if (!wantRematch || !remoteRematch || !onlineSel) {
      // Mostra a intenção do outro lado sem fechar nada.
      if (remoteRematch && !wantRematch) {
        const sub = document.getElementById('ko-sub');
        if (sub) sub.textContent = 'OPONENTE QUER REVANCHE!';
      } else if (wantRematch && !remoteRematch) {
        const sub = document.getElementById('ko-sub');
        if (sub) sub.textContent = 'AGUARDANDO OPONENTE…';
      }
      return;
    }
    wantRematch = false; remoteRematch = false;
    resetMatch();
    _closeKO();
    applySelection(onlineSel);
  }

  function requestRepick() {
    _send({ t: 'repick' });
    _toPickPhase();
  }

  function _toPickPhase() {
    active = false;
    wantRematch = false; remoteRematch = false;
    _closeKO();
    _pickPhase();
  }

  // ── Queda de conexão ────────────────────────────────────────────
  function _onDrop() {
    if (!active && !myPick && !remotePick) {
      _status('Conexão fechada.');
      return;
    }
    active = false;
    _hideWaiting();
    if (!dropEl) {
      dropEl = document.createElement('div');
      dropEl.id = 'netplay-drop';
      dropEl.innerHTML = `
        <div id="netplay-card">
          <div id="netplay-title">OPONENTE SAIU</div>
          <div id="netplay-sub">A CONEXÃO CAIU</div>
          <div id="netplay-row">
            <button class="ko-btn" id="net-reload">↻ VOLTAR AO MENU</button>
          </div>
        </div>
      `;
      document.body.appendChild(dropEl);
      document.getElementById('net-reload').addEventListener('click', () => {
        location.reload();
      });
    }
    dropEl.style.display = 'flex';
  }

  // ── Overlays auxiliares ─────────────────────────────────────────
  function _showWaiting(msg) {
    _hideWaiting();
    waitEl = document.createElement('div');
    waitEl.id = 'netplay-wait';
    waitEl.textContent = msg;
    document.body.appendChild(waitEl);
  }
  function _hideWaiting() {
    if (waitEl) { waitEl.remove(); waitEl = null; }
  }

  return {
    boot, isInMatch, isLocalLeft, currentStep, matchSeconds, getSelection,
    onLocalPick, resetMatch, canStep, beginStep, endStep,
    requestRematch, requestRepick,
  };
})();
