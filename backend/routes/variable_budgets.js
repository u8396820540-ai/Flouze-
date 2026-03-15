const express = require('express');
const { db } = require('../db/database');
const auth = require('../middleware/auth');
const router = express.Router();
router.use(auth);

// GET all budget lines for a month, with total spent per line
router.get('/', (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'month requis' });
  const lines = db.prepare('SELECT * FROM variable_budget_lines WHERE user_id = ? AND month = ? ORDER BY sort_order ASC, id ASC').all(req.userId, month);
  // For each line, get expenses
  const result = lines.map(line => {
    const expenses = db.prepare('SELECT * FROM variable_expenses WHERE user_id = ? AND budget_line_id = ? AND month = ? ORDER BY sort_order ASC, date DESC').all(req.userId, line.id, month);
    const spent = expenses.reduce((s, e) => s + e.amount, 0);
    return { ...line, expenses, spent };
  });
  res.json(result);
});

router.post('/', (req, res) => {
  const { name, budget_amount, month } = req.body;
  if (!name || !month) return res.status(400).json({ error: 'Champs requis manquants' });
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM variable_budget_lines WHERE user_id = ? AND month = ?').get(req.userId, month);
  const sort_order = (maxOrder?.m ?? 0) + 1;
  const r = db.prepare('INSERT INTO variable_budget_lines (user_id, name, budget_amount, sort_order, month) VALUES (?,?,?,?,?)')
    .run(req.userId, name, budget_amount || 0, sort_order, month);
  const line = db.prepare('SELECT * FROM variable_budget_lines WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json({ ...line, expenses: [], spent: 0 });
});

router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM variable_budget_lines WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  const { name, budget_amount } = req.body;
  db.prepare('UPDATE variable_budget_lines SET name=?, budget_amount=? WHERE id=?')
    .run(name ?? row.name, budget_amount ?? row.budget_amount, req.params.id);
  const updated = db.prepare('SELECT * FROM variable_budget_lines WHERE id = ?').get(req.params.id);
  const expenses = db.prepare('SELECT * FROM variable_expenses WHERE budget_line_id = ? ORDER BY sort_order ASC, date DESC').all(req.params.id);
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  res.json({ ...updated, expenses, spent });
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM variable_budget_lines WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  // Unlink expenses (don't delete them, move them to orphan)
  db.prepare('UPDATE variable_expenses SET budget_line_id = NULL WHERE budget_line_id = ?').run(req.params.id);
  db.prepare('DELETE FROM variable_budget_lines WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/reorder', (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items requis' });
  const stmt = db.prepare('UPDATE variable_budget_lines SET sort_order = ? WHERE id = ? AND user_id = ?');
  db.transaction(() => { items.forEach(({ id, sort_order }) => stmt.run(sort_order, id, req.userId)); })();
  res.json({ success: true });
});

module.exports = router;
