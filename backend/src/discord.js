const axios = require('axios');

const DISCORD_API = 'https://discord.com/api/v10';

// Scambia il code OAuth2 con un access token utente.
async function exchangeCode(code) {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    client_secret: process.env.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
  });

  const { data } = await axios.post(`${DISCORD_API}/oauth2/token`, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  return data; // { access_token, token_type, ... }
}

// Recupera il profilo Discord dell'utente autenticato.
async function getUser(accessToken) {
  const { data } = await axios.get(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data; // { id, username, avatar, ... }
}

// Verifica se l'utente ha il ruolo admin richiesto nel server Discord,
// usando il bot token (l'utente non deve concedere lo scope guilds.members.read).
async function memberHasAdminRole(userId) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const roleId = process.env.DISCORD_ADMIN_ROLE_ID;

  try {
    const { data: member } = await axios.get(
      `${DISCORD_API}/guilds/${guildId}/members/${userId}`,
      { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
    );
    return Array.isArray(member.roles) && member.roles.includes(roleId);
  } catch (err) {
    if (err.response && err.response.status === 404) return false;
    throw err;
  }
}

module.exports = { exchangeCode, getUser, memberHasAdminRole };
