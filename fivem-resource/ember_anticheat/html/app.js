(function () {
  const RESOURCE_NAME = 'ember_anticheat';

  const app = document.getElementById('app');
  const playerListEl = document.getElementById('playerList');
  const emptyState = document.getElementById('emptyState');
  const toast = document.getElementById('toast');
  const confirmModal = document.getElementById('confirmModal');
  const confirmPlayerName = document.getElementById('confirmPlayerName');
  const banReason = document.getElementById('banReason');

  let pendingBanServerId = null;

  function nuiFetch(endpoint, data) {
    return fetch(`https://${RESOURCE_NAME}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(data || {}),
    }).catch(() => {});
  }

  function showToast(message, isSuccess) {
    toast.textContent = message;
    toast.classList.remove('hidden', 'success', 'error');
    toast.classList.add(isSuccess ? 'success' : 'error');
    setTimeout(() => toast.classList.add('hidden'), 3500);
  }

  function renderPlayers(players) {
    playerListEl.innerHTML = '';

    if (!players || players.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }
    emptyState.classList.add('hidden');

    players.forEach((p) => {
      const li = document.createElement('li');
      li.className = 'player-row';

      const name = document.createElement('span');
      name.className = 'player-name';
      name.textContent = p.name || `ID ${p.serverId}`;

      const id = document.createElement('span');
      id.className = 'player-id';
      id.textContent = p.steam || p.license || p.discord || 'n/d';
      id.title = id.textContent;

      const actions = document.createElement('span');
      actions.className = 'player-actions';
      const banBtn = document.createElement('button');
      banBtn.className = 'btn btn-ban';
      banBtn.textContent = 'Ban';
      banBtn.addEventListener('click', () => openConfirm(p));
      actions.appendChild(banBtn);

      li.appendChild(name);
      li.appendChild(id);
      li.appendChild(actions);
      playerListEl.appendChild(li);
    });
  }

  function openConfirm(player) {
    pendingBanServerId = player.serverId;
    confirmPlayerName.textContent = `${player.name || 'Player'} (${player.steam || player.license || 'n/d'})`;
    banReason.value = '';
    confirmModal.classList.remove('hidden');
    banReason.focus();
  }

  function closeConfirm() {
    pendingBanServerId = null;
    confirmModal.classList.add('hidden');
  }

  document.getElementById('closeBtn').addEventListener('click', () => {
    app.classList.add('hidden');
    nuiFetch('close');
  });

  document.getElementById('refreshBtn').addEventListener('click', () => {
    nuiFetch('refresh');
  });

  document.getElementById('cancelBanBtn').addEventListener('click', closeConfirm);

  document.getElementById('confirmBanBtn').addEventListener('click', () => {
    const reason = banReason.value.trim();
    if (!reason) {
      banReason.focus();
      return;
    }
    nuiFetch('banPlayer', { serverId: pendingBanServerId, reason });
    closeConfirm();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!confirmModal.classList.contains('hidden')) {
        closeConfirm();
      } else if (!app.classList.contains('hidden')) {
        app.classList.add('hidden');
        nuiFetch('close');
      }
    }
  });

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || !data.action) return;

    switch (data.action) {
      case 'open':
        app.classList.remove('hidden');
        renderPlayers(data.players);
        break;
      case 'close':
        app.classList.add('hidden');
        closeConfirm();
        break;
      case 'banResult':
        showToast(data.message, data.success);
        break;
      default:
        break;
    }
  });
})();
