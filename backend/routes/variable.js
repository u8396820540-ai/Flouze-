const express = require('express');
const { db } = require('../db/database');
const auth = require('../middleware/auth');
const router = express.Router();
router.use(auth);

router.get('/', (req, res) => {
  const { month } = req.query;
  const where = month ? 'WHERE user_id = ? AND month = ?' : 'WHERE user_id = ?';
  const params = month ? [req.userId, month] : [req.userId];
  const rows = db.prepare(`SELECT * FROM variable_expenses ${where} ORDER BY sort_order ASC, date DESC`).all(...params);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const byCategory = rows.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + r.amount;
    return acc;
  }, {});
  res.json({ items: rows, total, byCategory });
});

router.post('/', (req, res) => {
  const { date, category, description, amount, month, budget_line_id } = req.body;
  if (!date || !category || !description || amount === undefined || !month) return res.status(400).json({ error: 'Champs requis manquants' });
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM variable_expenses WHERE user_id = ? AND month = ?').get(req.userId, month);
  const sort_order = (maxOrder?.m ?? 0) + 1;
  const r = db.prepare('INSERT INTO variable_expenses (user_id, date, category, description, amount, month, budget_line_id, sort_order) VALUES (?,?,?,?,?,?,?,?)')
    .run(req.userId, date, category, description, amount, month, budget_line_id || null, sort_order);
  res.status(201).json(db.prepare('SELECT * FROM variable_expenses WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { date, category, description, amount, budget_line_id } = req.body;
  const row = db.prepare('SELECT * FROM variable_expenses WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  const newBudgetLineId = 'budget_line_id' in req.body ? (req.body.budget_line_id || null) : row.budget_line_id;
  db.prepare('UPDATE variable_expenses SET date=?, category=?, description=?, amount=?, budget_line_id=? WHERE id=?')
    .run(date ?? row.date, category ?? row.category, description ?? row.description, amount ?? row.amount, newBudgetLineId, req.params.id);
  res.json(db.prepare('SELECT * FROM variable_expenses WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM variable_expenses WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  db.prepare('DELETE FROM variable_expenses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/reorder', (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items requis' });
  const stmt = db.prepare('UPDATE variable_expenses SET sort_order = ? WHERE id = ? AND user_id = ?');
  db.transaction(() => { items.forEach(({ id, sort_order }) => stmt.run(sort_order, id, req.userId)); })();
  res.json({ success: true });
});

// Monthly history
router.get('/history', (req, res) => {
  const rows = db.prepare(`SELECT month, SUM(amount) as total FROM variable_expenses WHERE user_id = ? GROUP BY month ORDER BY month DESC LIMIT 12`).all(req.userId);
  res.json(rows);
});

module.exports = router;
