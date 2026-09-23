const express = require('express');
const db = require('../db');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

router.get('/', adminAuth, async (req, res) => {
  try {
    const [totalBans, bansToday, servers, onlineNow] = await Promise.all([
      db.query('SELECT COUNT(*)::int AS count FROM bans WHERE active = true'),
      db.query(
        "SELECT COUNT(*)::int AS count FROM bans WHERE created_at >= date_trunc('day', now())"
      ),
      db.query('SELECT COUNT(*)::int AS count FROM servers'),
      db.query("SELECT COUNT(*)::int AS count FROM online_players WHERE updated_at > now() - interval '2 minutes'"),
    ]);

    return res.json({
      totalBans: totalBans.rows[0].count,
      bansToday: bansToday.rows[0].count,
      connectedServers: servers.rows[0].count,
      playersOnline: onlineNow.rows[0].count,
    });
  } catch (err) {
    console.error('[GET /stats]', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
