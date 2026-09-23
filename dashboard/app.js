(function () {
  const BACKEND_URL = window.EMBER_CONFIG.BACKEND_URL;
  const TOKEN_KEY = 'ember_token';

  const loginView = document.getElementById('loginView');
  const appView = document.getElementById('appView');
  const loginError = document.getElementById('loginError');
  const adminName = document.getElementById('adminName');
  const toast = document.getElementById('toast');

  // ---------- Auth ----------

  function parseHashParams() {
    const hash = window.location.hash.replace(/^#/, '');
    return new URLSearchParams(hash);
  }

  function decodeJwt(token) {
    try {
      const payload = token.split('.')[1];
      const json = decodeURIComponent(
        atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
          .split('')
          .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('')
      );
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function showToast(message, isSuccess) {
    toast.textContent = message;
    toast.classList.remove('hidden', 'success', 'error');
    toast.classList.add(isSuccess ? 'success' : 'error');
    setTimeout(() => toast.classList.add('hidden'), 3500);
  }

  async function api(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    if (res.status === 401) {
      clearToken();
      renderAuthState();
      throw new Error('Sessione scaduta, effettua di nuovo il login.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Errore ${res.status}`);
    }
    return data;
  }

  function renderAuthState() {
    const token = getToken();
    if (token) {
      const payload = decodeJwt(token);
      loginView.classList.add('hidden');
      appView.classList.remove('hidden');
      adminName.textContent = payload ? payload.username : 'Admin';
      loadAll();
    } else {
      appView.classList.add('hidden');
      loginView.classList.remove('hidden');
    }
  }

  document.getElementById('discordLoginBtn').addEventListener('click', () => {
    window.location.href = `${BACKEND_URL}/auth/discord/login`;
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    renderAuthState();
  });

  function handleAuthRedirect() {
    const params = parseHashParams();
    if (params.get('token')) {
      setToken(params.get('token'));
      window.history.replaceState(null, '', window.location.pathname);
    } else if (params.get('error')) {
      const errors = {
        not_authorized: 'Il tuo account Discord non ha il ruolo richiesto per accedere a Ember.',
        oauth_failed: 'Login con Discord fallito. Riprova.',
        missing_code: 'Login con Discord fallito. Riprova.',
      };
      loginError.textContent = errors[params.get('error')] || 'Errore durante il login.';
      loginError.classList.remove('hidden');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }

  // ---------- Navigation ----------

  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
      btn.classList.add('active');
      document.getElementById(`view-${btn.dataset.view}`).classList.remove('hidden');
    });
  });

  // ---------- Overview ----------

  async function loadStats() {
    try {
      const stats = await api('/stats');
      document.getElementById('statTotalBans').textContent = stats.totalBans;
      document.getElementById('statServers').textContent = stats.connectedServers;
      document.getElementById('statBansToday').textContent = stats.bansToday;
      document.getElementById('statOnline').textContent = stats.playersOnline;
    } catch (e) {
      showToast(e.message, false);
    }
  }

  // ---------- Player online ----------

  const onlineTableBody = document.getElementById('onlineTableBody');
  const onlineEmpty = document.getElementById('onlineEmpty');

  async function loadOnline() {
    try {
      const data = await api('/players/online');
      renderOnline(data.players);
    } catch (e) {
      showToast(e.message, false);
    }
  }

  function renderOnline(players) {
    onlineTableBody.innerHTML = '';
    if (!players || players.length === 0) {
      onlineEmpty.classList.remove('hidden');
      return;
    }
    onlineEmpty.classList.add('hidden');

    players.forEach((p) => {
      const tr = document.createElement('tr');

      const nameTd = document.createElement('td');
      nameTd.textContent = p.name || `#${p.source_id}`;

      const idTd = document.createElement('td');
      idTd.className = 'mono';
      idTd.textContent = p.steam || p.license || p.discord || 'n/d';

      const serverTd = document.createElement('td');
      serverTd.textContent = p.server_name || `Server #${p.server_id}`;

      const actionsTd = document.createElement('td');
      const banBtn = document.createElement('button');
      banBtn.className = 'btn btn-danger btn-sm';
      banBtn.textContent = 'Ban';
      banBtn.addEventListener('click', () => openBanModal(p));
      actionsTd.appendChild(banBtn);

      tr.appendChild(nameTd);
      tr.appendChild(idTd);
      tr.appendChild(serverTd);
      tr.appendChild(actionsTd);
      onlineTableBody.appendChild(tr);
    });
  }

  document.getElementById('refreshOnlineBtn').addEventListener('click', loadOnline);

  // ---------- Ban modal (da Player online) ----------

  const banModal = document.getElementById('banModal');
  const banModalPlayer = document.getElementById('banModalPlayer');
  const banModalReason = document.getElementById('banModalReason');
  let pendingBanTarget = null;

  function openBanModal(player) {
    pendingBanTarget = player;
    banModalPlayer.textContent = `${player.name || 'Player'} (${player.steam || player.license || 'n/d'})`;
    banModalReason.value = '';
    banModal.classList.remove('hidden');
    banModalReason.focus();
  }

  function closeBanModal() {
    pendingBanTarget = null;
    banModal.classList.add('hidden');
  }

  document.getElementById('banModalCancel').addEventListener('click', closeBanModal);

  document.getElementById('banModalConfirm').addEventListener('click', async () => {
    const reason = banModalReason.value.trim();
    if (!reason || !pendingBanTarget) return;

    try {
      await api('/admin/ban', {
        method: 'POST',
        body: JSON.stringify({
          serverId: pendingBanTarget.server_id,
          playerName: pendingBanTarget.name,
          identifiers: {
            steam: pendingBanTarget.steam,
            license: pendingBanTarget.license,
            discord: pendingBanTarget.discord,
          },
          reason,
        }),
      });
      showToast('Player bannato con successo.', true);
      closeBanModal();
      loadOnline();
      loadBans();
      loadStats();
    } catch (e) {
      showToast(e.message, false);
    }
  });

  // ---------- Bans ----------

  const bansList = document.getElementById('bansList');
  const bansEmpty = document.getElementById('bansEmpty');

  async function loadBans() {
    try {
      const data = await api('/bans');
      renderBans(data.bans);
    } catch (e) {
      showToast(e.message, false);
    }
  }

  function renderBans(bans) {
    bansList.innerHTML = '';
    if (!bans || bans.length === 0) {
      bansEmpty.classList.remove('hidden');
      return;
    }
    bansEmpty.classList.add('hidden');

    bans.forEach((b) => {
      const card = document.createElement('div');
      card.className = 'ban-card';

      const main = document.createElement('div');
      main.className = 'ban-card-main';

      const name = document.createElement('span');
      name.className = 'ban-card-name';
      name.textContent = b.player_name || (b.identifiers && b.identifiers[0]) || `Ban #${b.id}`;

      const meta = document.createElement('span');
      meta.className = 'ban-card-meta';
      meta.textContent = `${b.server_name || 'Server sconosciuto'} · ${b.admin_name} · ${new Date(b.created_at).toLocaleString('it-IT')}${b.active ? '' : ' · RIMOSSO'}`;

      const reason = document.createElement('span');
      reason.className = 'ban-card-reason';
      reason.textContent = b.reason;

      main.appendChild(name);
      main.appendChild(meta);
      main.appendChild(reason);

      const actions = document.createElement('div');
      actions.className = 'ban-card-actions';

      const replayBtn = document.createElement('button');
      replayBtn.className = 'btn btn-ghost btn-sm';
      replayBtn.textContent = 'Replay';
      replayBtn.disabled = !b.replay || b.replay.length === 0;
      replayBtn.addEventListener('click', () => openReplay(b));
      actions.appendChild(replayBtn);

      if (b.active) {
        const unbanBtn = document.createElement('button');
        unbanBtn.className = 'btn btn-accent btn-sm';
        unbanBtn.textContent = 'Unban';
        unbanBtn.addEventListener('click', () => unban(b));
        actions.appendChild(unbanBtn);
      }

      card.appendChild(main);
      card.appendChild(actions);
      bansList.appendChild(card);
    });
  }

  async function unban(ban) {
    try {
      await api('/unban', { method: 'POST', body: JSON.stringify({ banId: ban.id }) });
      showToast('Player sbannato.', true);
      loadBans();
      loadStats();
    } catch (e) {
      showToast(e.message, false);
    }
  }

  document.getElementById('refreshBansBtn').addEventListener('click', loadBans);

  // ---------- Replay reconstruction ----------

  const replayModal = document.getElementById('replayModal');
  const replayCanvas = document.getElementById('replayCanvas');
  const replayCtx = replayCanvas.getContext('2d');
  const replaySlider = document.getElementById('replaySlider');
  const replayPlayBtn = document.getElementById('replayPlay');
  const replayFrameLabel = document.getElementById('replayFrameLabel');
  const replayInfo = document.getElementById('replayInfo');

  let replayFrames = [];
  let replayIndex = 0;
  let replayTimer = null;

  function openReplay(ban) {
    replayFrames = ban.replay || [];
    replayIndex = 0;
    replaySlider.max = Math.max(0, replayFrames.length - 1);
    replaySlider.value = 0;
    stopReplayPlayback();
    drawReplayFrame(0);
    replayModal.classList.remove('hidden');
  }

  document.getElementById('replayClose').addEventListener('click', () => {
    stopReplayPlayback();
    replayModal.classList.add('hidden');
  });

  function computeBounds(frames) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    frames.forEach((f) => {
      minX = Math.min(minX, f.x);
      maxX = Math.max(maxX, f.x);
      minY = Math.min(minY, f.y);
      maxY = Math.max(maxY, f.y);
    });
    if (!isFinite(minX)) { minX = -10; maxX = 10; minY = -10; maxY = 10; }
    const pad = Math.max(5, (maxX - minX) * 0.15, (maxY - minY) * 0.15);
    return { minX: minX - pad, maxX: maxX + pad, minY: minY - pad, maxY: maxY + pad };
  }

  function worldToCanvas(x, y, bounds) {
    const w = replayCanvas.width;
    const h = replayCanvas.height;
    const nx = (x - bounds.minX) / (bounds.maxX - bounds.minX || 1);
    const ny = (y - bounds.minY) / (bounds.maxY - bounds.minY || 1);
    return { cx: nx * w, cy: h - ny * h };
  }

  function drawReplayFrame(index) {
    replayIndex = index;
    replaySlider.value = index;
    replayFrameLabel.textContent = `${index + 1} / ${replayFrames.length}`;

    replayCtx.fillStyle = '#251D14';
    replayCtx.fillRect(0, 0, replayCanvas.width, replayCanvas.height);

    if (replayFrames.length === 0) {
      replayInfo.textContent = 'Nessun keyframe di replay disponibile per questo ban.';
      return;
    }

    const bounds = computeBounds(replayFrames);

    // Traccia percorso fino al frame corrente
    replayCtx.strokeStyle = 'rgba(255,122,41,0.35)';
    replayCtx.lineWidth = 2;
    replayCtx.beginPath();
    for (let i = 0; i <= index; i++) {
      const { cx, cy } = worldToCanvas(replayFrames[i].x, replayFrames[i].y, bounds);
      if (i === 0) replayCtx.moveTo(cx, cy);
      else replayCtx.lineTo(cx, cy);
    }
    replayCtx.stroke();

    // Player corrente
    const frame = replayFrames[index];
    const { cx, cy } = worldToCanvas(frame.x, frame.y, bounds);

    replayCtx.fillStyle = '#FF7A29';
    replayCtx.beginPath();
    replayCtx.arc(cx, cy, 7, 0, Math.PI * 2);
    replayCtx.fill();

    // Direzione (heading)
    const headingRad = ((frame.heading || 0) * Math.PI) / 180;
    replayCtx.strokeStyle = '#FF7A29';
    replayCtx.lineWidth = 2;
    replayCtx.beginPath();
    replayCtx.moveTo(cx, cy);
    replayCtx.lineTo(cx + Math.sin(headingRad) * 16, cy - Math.cos(headingRad) * 16);
    replayCtx.stroke();

    const elapsedMs = frame.t - replayFrames[0].t;
    replayInfo.textContent = `t=+${(elapsedMs / 1000).toFixed(1)}s · pos=(${frame.x.toFixed(1)}, ${frame.y.toFixed(1)}, ${frame.z.toFixed(1)}) · arma=${frame.weapon || 'n/d'} · salute=${frame.health ?? 'n/d'} · armor=${frame.armor ?? 'n/d'}`;
  }

  replaySlider.addEventListener('input', () => {
    stopReplayPlayback();
    drawReplayFrame(parseInt(replaySlider.value, 10));
  });

  function stopReplayPlayback() {
    if (replayTimer) {
      clearInterval(replayTimer);
      replayTimer = null;
      replayPlayBtn.textContent = 'Play';
    }
  }

  replayPlayBtn.addEventListener('click', () => {
    if (replayTimer) {
      stopReplayPlayback();
      return;
    }
    if (replayIndex >= replayFrames.length - 1) replayIndex = 0;
    replayPlayBtn.textContent = 'Pausa';
    replayTimer = setInterval(() => {
      if (replayIndex >= replayFrames.length - 1) {
        stopReplayPlayback();
        return;
      }
      drawReplayFrame(replayIndex + 1);
    }, 200);
  });

  // ---------- Init ----------

  function loadAll() {
    loadStats();
    loadOnline();
    loadBans();
  }

  handleAuthRedirect();
  renderAuthState();
})();
