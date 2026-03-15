const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/income', require('./routes/income'));
app.use('/api/fixed', require('./routes/fixed'));
app.use('/api/savings', require('./routes/savings'));
app.use('/api/variable', require('./routes/variable'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/copy-month', require('./routes/copy'));

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Route introuvable' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

app.listen(PORT, () => {
  console.log(`✅ Budget API démarrée sur http://localhost:${PORT}`);
});

module.exports = app;
