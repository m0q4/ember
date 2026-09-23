const jwt = require('jsonwebtoken');

// Autenticazione admin dashboard: JWT emesso dopo il login OAuth2 Discord
// (rilasciato solo a chi ha il ruolo Discord richiesto, vedi routes/auth.js).
function adminAuth(req, res, next) {
  const header = req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = adminAuth;
