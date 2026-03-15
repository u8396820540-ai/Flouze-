const express = require('express');
const { db } = require('../db/database');
const auth = require('../middleware/auth');
const router = express.Router();
router.use(auth);

function withItems(rows, userId) {
  return rows.map(row => {
    if (!row.is_progressive) return { ...row, items: [], total_spent: 0 };
    const items = db.prepare(
      'SELECT * FROM fixed_expense_items WHERE fixed_expense_id = ? AND user_id = ? ORDER BY created_at DESC'
    ).all(row.id, userId);
    const total_spent = items.reduce((s, i) => s + i.amount, 0);
    return { ...row, items, total_spent };
  });
}

router.get('/', (req, res) => {
  const { month } = req.query;
  const where  = month ? 'WHERE user_id = ? AND month = ?' : 'WHERE user_id = ?';
  const params = month ? [req.userId, month] : [req.userId];
  const rows   = db.prepare(`SELECT * FROM fixed_expenses ${where} ORDER BY sort_order ASC, id ASC`).all(...params);
  const enriched = withItems(rows, req.userId);
  const total     = enriched.reduce((s, r) => s + r.amount, 0);
  // Pour les progressives, on compte comme "paid" au prorata dépensé
  const totalPaid = enriched.reduce((s, r) => {
    if (r.is_progressive) return s + Math.min(r.total_spent, r.amount);
    return r.is_paid ? s + r.amount : s;
  }, 0);
  res.json({ items: enriched, total, totalPaid });
});

router.post('/', (req, res) => {
  const { name, category, amount, debit_day, notes, month, is_progressive } = req.body;
  if (!name || amount === undefined || !month) return res.status(400).json({ error: 'Champs requis manquants' });
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM fixed_expenses WHERE user_id = ? AND month = ?').get(req.userId, month);
  const sort_order = (maxOrder?.m ?? 0) + 1;
  const r = db.prepare('INSERT INTO fixed_expenses (user_id, name, category, amount, debit_day, notes, month, sort_order, is_paid, is_progressive) VALUES (?,?,?,?,?,?,?,?,0,?)')
    .run(req.userId, name, category || 'Autres', amount, debit_day || null, notes || '', month, sort_order, is_progressive ? 1 : 0);
  const row = db.prepare('SELECT * FROM fixed_expenses WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json({ ...row, items: [], total_spent: 0 });
});

router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM fixed_expenses WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  const { name, category, amount, notes, is_paid, is_progressive } = req.body;
  const debit_day  = 'debit_day'      in req.body ? (req.body.debit_day || null) : row.debit_day;
  const paid       = is_paid          !== undefined ? (is_paid ? 1 : 0) : row.is_paid;
  const progressive = is_progressive  !== undefined ? (is_progressive ? 1 : 0) : row.is_progressive;
  db.prepare('UPDATE fixed_expenses SET name=?, category=?, amount=?, debit_day=?, notes=?, is_paid=?, is_progressive=? WHERE id=?')
    .run(name ?? row.name, category ?? row.category, amount ?? row.amount, debit_day, notes ?? row.notes, paid, progressive, req.params.id);
  const updated = db.prepare('SELECT * FROM fixed_expenses WHERE id = ?').get(req.params.id);
  const items   = db.prepare('SELECT * FROM fixed_expense_items WHERE fixed_expense_id = ? AND user_id = ? ORDER BY created_at DESC').all(req.params.id, req.userId);
  res.json({ ...updated, items, total_spent: items.reduce((s,i)=>s+i.amount,0) });
});

// PATCH /:id/toggle-paid — toggle is_paid (charges normales uniquement)
router.patch('/:id/toggle-paid', (req, res) => {
  const row = db.prepare('SELECT * FROM fixed_expenses WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  db.prepare('UPDATE fixed_expenses SET is_paid = ? WHERE id = ?').run(row.is_paid ? 0 : 1, req.params.id);
  const updated = db.prepare('SELECT * FROM fixed_expenses WHERE id = ?').get(req.params.id);
  res.json({ ...updated, items: [], total_spent: 0 });
});

// POST /:id/items — ajouter une dépense sur une charge progressive
router.post('/:id/items', (req, res) => {
  const row = db.prepare('SELECT * FROM fixed_expenses WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  const { label, amount } = req.body;
  if (!amount || isNaN(parseFloat(amount))) return res.status(400).json({ error: 'Montant requis' });
  db.prepare('INSERT INTO fixed_expense_items (fixed_expense_id, user_id, label, amount) VALUES (?,?,?,?)')
    .run(req.params.id, req.userId, label || '', parseFloat(amount));
  const items = db.prepare('SELECT * FROM fixed_expense_items WHERE fixed_expense_id = ? AND user_id = ? ORDER BY created_at DESC').all(req.params.id, req.userId);
  const total_spent = items.reduce((s,i)=>s+i.amount,0);
  res.status(201).json({ items, total_spent });
});

// DELETE /items/:itemId — supprimer une dépense
router.delete('/items/:itemId', (req, res) => {
  const item = db.prepare('SELECT * FROM fixed_expense_items WHERE id = ? AND user_id = ?').get(req.params.itemId, req.userId);
  if (!item) return res.status(404).json({ error: 'Introuvable' });
  db.prepare('DELETE FROM fixed_expense_items WHERE id = ?').run(item.id);
  const items = db.prepare('SELECT * FROM fixed_expense_items WHERE fixed_expense_id = ? AND user_id = ? ORDER BY created_at DESC').all(item.fixed_expense_id, req.userId);
  res.json({ items, total_spent: items.reduce((s,i)=>s+i.amount,0) });
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM fixed_expenses WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  db.prepare('DELETE FROM fixed_expenses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/reorder', (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items requis' });
  const stmt = db.prepare('UPDATE fixed_expenses SET sort_order = ? WHERE id = ? AND user_id = ?');
  db.transaction(() => { items.forEach(({ id, sort_order }) => stmt.run(sort_order, id, req.userId)); })();
  res.json({ success: true });
});

module.exports = router;
