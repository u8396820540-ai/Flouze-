const express = require('express');
const { db } = require('../db/database');
const auth = require('../middleware/auth');
const router = express.Router();
router.use(auth);

router.get('/', (req, res) => {
  const { month } = req.query;
  const where = month ? 'WHERE user_id = ? AND month = ?' : 'WHERE user_id = ?';
  const params = month ? [req.userId, month] : [req.userId];
  const rows = db.prepare(`SELECT * FROM income ${where} ORDER BY sort_order ASC, id ASC`).all(...params);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  res.json({ items: rows, total });
});

router.post('/', (req, res) => {
  const { source, category, amount, date, notes, month } = req.body;
  if (!source || amount === undefined || !date || !month) return res.status(400).json({ error: 'Champs requis manquants' });
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM income WHERE user_id = ? AND month = ?').get(req.userId, month);
  const sort_order = (maxOrder?.m ?? 0) + 1;
  const r = db.prepare('INSERT INTO income (user_id, source, category, amount, date, notes, month, sort_order) VALUES (?,?,?,?,?,?,?,?)')
    .run(req.userId, source, category || 'Salaire', amount, date, notes || '', month, sort_order);
  res.status(201).json(db.prepare('SELECT * FROM income WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { source, category, amount, date, notes } = req.body;
  const row = db.prepare('SELECT * FROM income WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  db.prepare('UPDATE income SET source=?, category=?, amount=?, date=?, notes=? WHERE id=?')
    .run(source ?? row.source, category ?? row.category, amount ?? row.amount, date ?? row.date, notes ?? row.notes, req.params.id);
  res.json(db.prepare('SELECT * FROM income WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM income WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  db.prepare('DELETE FROM income WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/reorder', (req, res) => {
  const { items } = req.body; // [{id, sort_order}]
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items requis' });
  const stmt = db.prepare('UPDATE income SET sort_order = ? WHERE id = ? AND user_id = ?');
  db.transaction(() => { items.forEach(({ id, sort_order }) => stmt.run(sort_order, id, req.userId)); })();
  res.json({ success: true });
});

module.exports = router;
