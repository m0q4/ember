require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const bansRoutes = require('./routes/bans');
const playersRoutes = require('./routes/players');
const statsRoutes = require('./routes/stats');
const serversRoutes = require('./routes/servers');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' })); // 2mb per contenere i replay keyframes

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', (req, res) => res.json({ ok: true, service: 'ember-backend' }));

app.use('/auth', authRoutes);
app.use('/', bansRoutes); // espone /identify, /ban, /unban, /check/:identifier, /bans
app.use('/players', playersRoutes);
app.use('/stats', statsRoutes);
app.use('/servers', serversRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[ember-backend] listening on port ${PORT}`);
});
