// Script CLI per creare un server ed emettere la sua API key senza passare dalla
// dashboard (utile per il primo bootstrap, prima di aver configurato l'OAuth2 Discord).
//
// Uso: node src/scripts/createServer.js "Nome Server"

require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');

async function main() {
  const name = process.argv[2];
  if (!name) {
    console.error('Uso: node src/scripts/createServer.js "Nome Server"');
    process.exit(1);
  }

  const apiKey = `emb_${crypto.randomBytes(24).toString('hex')}`;
  const apiKeyHash = await bcrypt.hash(apiKey, 10);
  const apiKeyPrefix = apiKey.slice(0, 12);

  const { rows } = await db.query(
    `INSERT INTO servers (name, api_key_hash, api_key_prefix) VALUES ($1, $2, $3)
     RETURNING id, name, created_at`,
    [name.trim(), apiKeyHash, apiKeyPrefix]
  );

  console.log('Server creato:', rows[0]);
  console.log('API key (copiala nel config.lua del resource, non verra\' piu\' mostrata):');
  console.log(apiKey);

  await db.pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
