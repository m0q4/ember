const express = require('express');
const jwt = require('jsonwebtoken');
const { exchangeCode, getUser, memberHasAdminRole } = require('../discord');

const router = express.Router();

// Step 1: redirect verso Discord per l'autorizzazione OAuth2.
router.get('/discord/login', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify',
    prompt: 'consent',
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

// Step 2: callback Discord -> verifica ruolo admin -> emette JWT -> redirect dashboard.
router.get('/discord/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect(`${process.env.DASHBOARD_URL}/#error=missing_code`);
  }

  try {
    const tokenData = await exchangeCode(code);
    const user = await getUser(tokenData.access_token);
    const isAdmin = await memberHasAdminRole(user.id);

    if (!isAdmin) {
      return res.redirect(`${process.env.DASHBOARD_URL}/#error=not_authorized`);
    }

    const token = jwt.sign(
      {
        sub: user.id,
        username: user.username,
        avatar: user.avatar,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    return res.redirect(`${process.env.DASHBOARD_URL}/#token=${token}`);
  } catch (err) {
    console.error('[auth/discord/callback]', err.response ? err.response.data : err.message);
    return res.redirect(`${process.env.DASHBOARD_URL}/#error=oauth_failed`);
  }
});

module.exports = router;
