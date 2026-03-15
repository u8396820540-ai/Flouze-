const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, insertDefaultCategories } = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'budget_secret_key_2024_secure';

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email déjà utilisé' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
    ).run(name, email, hash);

    insertDefaultCategories(result.lastInsertRowid);

    const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({
      token,
      user: { id: result.lastInsertRowid, name, email, darkMode: true, budgetPeriod: 'month' }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        darkMode: !!user.dark_mode,
        budgetPeriod: user.budget_period
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, email, dark_mode, budget_period FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    darkMode: !!user.dark_mode,
    budgetPeriod: user.budget_period
  });
});

// Update user preferences
router.put('/preferences', authMiddleware, (req, res) => {
  const { darkMode, budgetPeriod } = req.body;
  db.prepare('UPDATE users SET dark_mode = ?, budget_period = ? WHERE id = ?')
    .run(darkMode ? 1 : 0, budgetPeriod, req.userId);
  res.json({ success: true });
});

module.exports = router;
