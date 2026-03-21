const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ 
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000',
    'https://flouze-nine.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/income', require('./routes/income'));
app.use('/api/fixed', require('./routes/fixed'));
app.use('/api/savings', require('./routes/savings'));
app.use('/api/variable', require('./routes/variable'));
app.use('/api/variable-budgets', require('./routes/variable_budgets'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/copy-month', require('./routes/copy'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use((req, res) => res.status(404).json({ error: 'Route introuvable' }));
app.use((err, req, res, next) => { console.error(err.stack); res.status(500).json({ error: 'Erreur interne' }); });

app.listen(PORT, () => console.log(`✅ Budget API démarrée sur http://localhost:${PORT}`));
module.exports = app;
