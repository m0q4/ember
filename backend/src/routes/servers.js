const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

function generateApiKey() {
  return `emb_${crypto.randomBytes(24).toString('hex')}`;
}

// Registra un nuovo server FiveM nella rete Ember e genera la sua API key.
// La chiave in chiaro viene restituita SOLO in questa risposta: va copiata subito
// nel config.lua del resource sul server cliente.
router.post('/', adminAuth, async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const apiKey = generateApiKey();
  const apiKeyHash = await bcrypt.hash(apiKey, 10);
  const apiKeyPrefix = apiKey.slice(0, 12);

  try {
    const { rows } = await db.query(
      `INSERT INTO servers (name, api_key_hash, api_key_prefix) VALUES ($1, $2, $3)
       RETURNING id, name, created_at`,
      [name.trim(), apiKeyHash, apiKeyPrefix]
    );

    return res.status(201).json({ server: rows[0], apiKey });
  } catch (err) {
    console.error('[POST /servers]', err);
    return res.status(500).json({ error: 'Failed to create server' });
  }
});

router.get('/', adminAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, created_at, last_seen_at FROM servers ORDER BY created_at DESC'
    );
    return res.json({ servers: rows });
  } catch (err) {
    console.error('[GET /servers]', err);
    return res.status(500).json({ error: 'Failed to fetch servers' });
  }
});

module.exports = router;
