const express = require('express');
const db = require('../db');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

function identifiersToArray(identifiers) {
  if (!identifiers) return [];
  if (Array.isArray(identifiers)) return identifiers.filter(Boolean);
  return Object.values(identifiers).filter(Boolean);
}

// Chiamato dal resource FiveM alla connessione di ogni player: cattura e registra
// gli identifier. Non blocca la connessione, serve solo per audit/tracciamento.
router.post('/identify', apiKeyAuth, async (req, res) => {
  const { name, identifiers } = req.body || {};
  if (!identifiers) {
    return res.status(400).json({ error: 'identifiers is required' });
  }
  console.log(`[identify] server=${req.server.name} name=${name} identifiers=${JSON.stringify(identifiers)}`);
  return res.json({ ok: true });
});

// Salva un nuovo ban, inclusi gli ultimi 20s di replay keyframes.
router.post('/ban', apiKeyAuth, async (req, res) => {
  const { playerName, identifiers, reason, admin, adminIdentifier, replay } = req.body || {};

  const idArray = identifiersToArray(identifiers);
  if (idArray.length === 0) {
    return res.status(400).json({ error: 'At least one identifier is required' });
  }
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'reason is required' });
  }
  if (!admin) {
    return res.status(400).json({ error: 'admin is required' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO bans (server_id, player_name, identifiers, reason, admin_name, admin_identifier, replay)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [
        req.server.id,
        playerName || null,
        idArray,
        reason.trim(),
        admin,
        adminIdentifier || null,
        JSON.stringify(replay || []),
      ]
    );

    return res.status(201).json({ ok: true, banId: rows[0].id, createdAt: rows[0].created_at });
  } catch (err) {
    console.error('[POST /ban]', err);
    return res.status(500).json({ error: 'Failed to save ban' });
  }
});

// Ban avviato direttamente dalla dashboard web (es. dalla sezione "Player online").
// A differenza del ban lato resource FiveM, qui non e' disponibile il replay-buffer
// live del server di gioco, quindi il ban viene salvato senza keyframe di replay.
router.post('/admin/ban', adminAuth, async (req, res) => {
  const { serverId, playerName, identifiers, reason } = req.body || {};

  const idArray = identifiersToArray(identifiers);
  if (idArray.length === 0) {
    return res.status(400).json({ error: 'At least one identifier is required' });
  }
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'reason is required' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO bans (server_id, player_name, identifiers, reason, admin_name, admin_identifier, replay)
       VALUES ($1, $2, $3, $4, $5, $6, '[]')
       RETURNING id, created_at`,
      [
        serverId || null,
        playerName || null,
        idArray,
        reason.trim(),
        req.admin.username || req.admin.sub,
        req.admin.sub,
      ]
    );

    return res.status(201).json({ ok: true, banId: rows[0].id, createdAt: rows[0].created_at });
  } catch (err) {
    console.error('[POST /admin/ban]', err);
    return res.status(500).json({ error: 'Failed to save ban' });
  }
});

// Rimuove (disattiva) il ban attivo per un identifier.
router.post('/unban', adminAuth, async (req, res) => {
  const { identifier, banId } = req.body || {};
  if (!identifier && !banId) {
    return res.status(400).json({ error: 'identifier or banId is required' });
  }

  try {
    const { rows } = await db.query(
      `UPDATE bans SET active = false, unbanned_at = now(), unbanned_by = $1
       WHERE active = true
         AND (($2::int IS NOT NULL AND id = $2) OR ($3::text IS NOT NULL AND $3 = ANY(identifiers)))
       RETURNING id`,
      [req.admin.username || req.admin.sub, banId || null, identifier || null]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No active ban found' });
    }

    return res.json({ ok: true, unbannedIds: rows.map((r) => r.id) });
  } catch (err) {
    console.error('[POST /unban]', err);
    return res.status(500).json({ error: 'Failed to unban' });
  }
});

// Usato dal resource FiveM alla connessione: se l'identifier e' bannato su
// QUALSIASI server della rete Ember, ritorna banned=true (ban condiviso cross-server).
router.get('/check/:identifier', apiKeyAuth, async (req, res) => {
  const { identifier } = req.params;

  try {
    const { rows } = await db.query(
      `SELECT id, reason, admin_name, created_at FROM bans
       WHERE active = true AND $1 = ANY(identifiers)
       ORDER BY created_at DESC LIMIT 1`,
      [identifier]
    );

    if (rows.length === 0) {
      return res.json({ banned: false });
    }

    const ban = rows[0];
    return res.json({
      banned: true,
      reason: ban.reason,
      admin: ban.admin_name,
      bannedAt: ban.created_at,
    });
  } catch (err) {
    console.error('[GET /check/:identifier]', err);
    return res.status(500).json({ error: 'Failed to check ban status' });
  }
});

// Lista dei ban attivi, per la dashboard.
router.get('/bans', adminAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.id, b.player_name, b.identifiers, b.reason, b.admin_name, b.replay,
              b.active, b.created_at, b.unbanned_at, b.unbanned_by, s.name AS server_name
       FROM bans b
       LEFT JOIN servers s ON s.id = b.server_id
       ORDER BY b.created_at DESC
       LIMIT 200`
    );
    return res.json({ bans: rows });
  } catch (err) {
    console.error('[GET /bans]', err);
    return res.status(500).json({ error: 'Failed to fetch bans' });
  }
});

module.exports = router;
