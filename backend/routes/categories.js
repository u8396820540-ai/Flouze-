const express = require('express');
const { db } = require('../db/database');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

router.get('/', (req, res) => {
  const { type } = req.query;
  const where = type ? 'WHERE user_id = ? AND type = ?' : 'WHERE user_id = ?';
  const params = type ? [req.userId, type] : [req.userId];
  const rows = db.prepare(`SELECT * FROM categories ${where} ORDER BY is_custom ASC, name ASC`).all(...params);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { type, name } = req.body;
  if (!type || !name) return res.status(400).json({ error: 'Type et nom requis' });
  const existing = db.prepare('SELECT id FROM categories WHERE user_id=? AND type=? AND name=?').get(req.userId, type, name);
  if (existing) return res.status(409).json({ error: 'Catégorie déjà existante' });
  const r = db.prepare('INSERT INTO categories (user_id, type, name, is_custom) VALUES (?,?,?,1)')
    .run(req.userId, type, name);
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(r.lastInsertRowid));
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ? AND is_custom = 1').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Catégorie introuvable ou non supprimable' });
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
