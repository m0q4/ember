const express = require('express');
const db = require('../db');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// Il resource FiveM invia periodicamente la lista dei player online sul proprio server.
router.post('/sync', apiKeyAuth, async (req, res) => {
  const { players } = req.body || {};
  if (!Array.isArray(players)) {
    return res.status(400).json({ error: 'players must be an array' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM online_players WHERE server_id = $1', [req.server.id]);

    for (const p of players) {
      if (!p.sourceId) continue;
      // eslint-disable-next-line no-await-in-loop
      await client.query(
        `INSERT INTO online_players (server_id, source_id, name, steam, license, discord, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())`,
        [req.server.id, p.sourceId, p.name || null, p.steam || null, p.license || null, p.discord || null]
      );
    }

    await client.query('COMMIT');
    return res.json({ ok: true, count: players.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[POST /players/sync]', err);
    return res.status(500).json({ error: 'Failed to sync players' });
  } finally {
    client.release();
  }
});

// Lista aggregata dei player online su tutta la rete Ember, per la dashboard.
router.get('/online', adminAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT op.server_id, s.name AS server_name, op.source_id, op.name, op.steam, op.license, op.discord, op.updated_at
       FROM online_players op
       LEFT JOIN servers s ON s.id = op.server_id
       WHERE op.updated_at > now() - interval '2 minutes'
       ORDER BY s.name, op.name`
    );
    return res.json({ players: rows });
  } catch (err) {
    console.error('[GET /players/online]', err);
    return res.status(500).json({ error: 'Failed to fetch online players' });
  }
});

module.exports = router;
