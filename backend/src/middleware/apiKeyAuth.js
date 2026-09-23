const bcrypt = require('bcryptjs');
const db = require('../db');

// Autenticazione server-to-server: ogni server FiveM collegato ha la propria
// chiave API, inviata nell'header X-Api-Key.
async function apiKeyAuth(req, res, next) {
  const apiKey = req.header('X-Api-Key');
  if (!apiKey || apiKey.length < 12) {
    return res.status(401).json({ error: 'Missing or invalid X-Api-Key header' });
  }

  const prefix = apiKey.slice(0, 12);

  try {
    const { rows } = await db.query(
      'SELECT id, name, api_key_hash FROM servers WHERE api_key_prefix = $1',
      [prefix]
    );

    for (const row of rows) {
      // eslint-disable-next-line no-await-in-loop
      const match = await bcrypt.compare(apiKey, row.api_key_hash);
      if (match) {
        req.server = { id: row.id, name: row.name };
        db.query('UPDATE servers SET last_seen_at = now() WHERE id = $1', [row.id]).catch(() => {});
        return next();
      }
    }

    return res.status(401).json({ error: 'Invalid API key' });
  } catch (err) {
    console.error('[apiKeyAuth]', err);
    return res.status(500).json({ error: 'Internal error during authentication' });
  }
}

module.exports = apiKeyAuth;
