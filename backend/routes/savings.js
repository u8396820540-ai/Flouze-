const express = require('express');
const { db } = require('../db/database');
const auth = require('../middleware/auth');
const router = express.Router();
router.use(auth);

function withMovements(rows, userId) {
  return rows.map(row => {
    const movements = db.prepare(
      'SELECT * FROM savings_movements WHERE savings_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 3'
    ).all(row.id, userId);
    return { ...row, movements };
  });
}

router.get('/', (req, res) => {
  const { month } = req.query;
  const where = month ? 'WHERE user_id = ? AND month = ?' : 'WHERE user_id = ?';
  const params = month ? [req.userId, month] : [req.userId];
  const rows = db.prepare(`SELECT * FROM savings ${where} ORDER BY sort_order ASC, id ASC`).all(...params);

  const totalMonthly  = rows.reduce((s, r) => s + r.monthly_amount, 0);
  const totalAcquired = rows.reduce((s, r) => s + r.current_amount, 0);

  // totalDeposited = somme des + (sortent du compte vers l'épargne)
  // totalWithdrawn = somme des - (reviennent de l'épargne vers le compte)
  let totalDeposited = 0;
  let totalWithdrawn = 0;
  if (month) {
    const ids = rows.map(r => r.id);
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      const depositRows = db.prepare(
        `SELECT SUM(amount) as total FROM savings_movements
         WHERE savings_id IN (${placeholders}) AND user_id = ? AND type = '+'
         AND strftime('%Y-%m', created_at) = ?`
      ).get(...ids, req.userId, month);
      totalDeposited = depositRows?.total || 0;

      const withdrawRows = db.prepare(
        `SELECT SUM(amount) as total FROM savings_movements
         WHERE savings_id IN (${placeholders}) AND user_id = ? AND type = '-'
         AND strftime('%Y-%m', created_at) = ?`
      ).get(...ids, req.userId, month);
      totalWithdrawn = withdrawRows?.total || 0;
    }
  }

  res.json({ items: withMovements(rows, req.userId), totalMonthly, totalAcquired, totalDeposited, totalWithdrawn });
});

router.post('/', (req, res) => {
  const { name, category, monthly_amount, target_amount, current_amount, notes, month } = req.body;
  if (!name || !month) return res.status(400).json({ error: 'Champs requis manquants' });
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM savings WHERE user_id = ? AND month = ?').get(req.userId, month);
  const sort_order = (maxOrder?.m ?? 0) + 1;
  const r = db.prepare('INSERT INTO savings (user_id, name, category, monthly_amount, target_amount, current_amount, notes, month, sort_order) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(req.userId, name, category || 'Urgence', monthly_amount || 0, target_amount || 0, current_amount || 0, notes || '', month, sort_order);
  const row = db.prepare('SELECT * FROM savings WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json({ ...row, movements: [] });
});

router.put('/:id', (req, res) => {
  const { name, category, monthly_amount, target_amount, current_amount, notes } = req.body;
  const row = db.prepare('SELECT * FROM savings WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  db.prepare('UPDATE savings SET name=?, category=?, monthly_amount=?, target_amount=?, current_amount=?, notes=? WHERE id=?')
    .run(name ?? row.name, category ?? row.category, monthly_amount ?? row.monthly_amount,
        target_amount ?? row.target_amount, current_amount ?? row.current_amount, notes ?? row.notes, req.params.id);
  const updated = db.prepare('SELECT * FROM savings WHERE id = ?').get(req.params.id);
  const movements = db.prepare('SELECT * FROM savings_movements WHERE savings_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 3').all(req.params.id, req.userId);
  res.json({ ...updated, movements });
});

// PATCH /:id/add — versement (+) ou retrait (-) sur l'acquis
router.patch('/:id/add', (req, res) => {
  const { amount, label } = req.body;
  const val = parseFloat(amount);
  if (!val || isNaN(val)) return res.status(400).json({ error: 'Montant requis' });
  const row = db.prepare('SELECT * FROM savings WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Introuvable' });

  // Met à jour l'acquis dans les deux cas (+/-)
  const newAmount = row.current_amount + val;
  db.prepare('UPDATE savings SET current_amount = ? WHERE id = ?').run(newAmount, req.params.id);

  // Enregistre le mouvement — type '+' = versement (sort du compte), '-' = retrait (ne sort pas du compte)
  db.prepare('INSERT INTO savings_movements (savings_id, user_id, amount, type, label) VALUES (?,?,?,?,?)')
    .run(req.params.id, req.userId, Math.abs(val), val > 0 ? '+' : '-', label || '');

  const updated  = db.prepare('SELECT * FROM savings WHERE id = ?').get(req.params.id);
  const movements = db.prepare('SELECT * FROM savings_movements WHERE savings_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 3').all(req.params.id, req.userId);
  res.json({ ...updated, movements });
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM savings WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  db.prepare('DELETE FROM savings WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/reorder', (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items requis' });
  const stmt = db.prepare('UPDATE savings SET sort_order = ? WHERE id = ? AND user_id = ?');
  db.transaction(() => { items.forEach(({ id, sort_order }) => stmt.run(sort_order, id, req.userId)); })();
  res.json({ success: true });
});

module.exports = router;

// DELETE /movements/:movementId — annule un mouvement et inverse l'acquis
router.delete('/movements/:movementId', (req, res) => {
  const movement = db.prepare(
    'SELECT * FROM savings_movements WHERE id = ? AND user_id = ?'
  ).get(req.params.movementId, req.userId);
  if (!movement) return res.status(404).json({ error: 'Mouvement introuvable' });

  const row = db.prepare('SELECT * FROM savings WHERE id = ?').get(movement.savings_id);
  if (!row) return res.status(404).json({ error: 'Objectif introuvable' });

  // Inverse : si c'était un + on retire, si c'était un - on remet
  const delta = movement.type === '+' ? -movement.amount : movement.amount;
  db.prepare('UPDATE savings SET current_amount = ? WHERE id = ?')
    .run(row.current_amount + delta, movement.savings_id);

  db.prepare('DELETE FROM savings_movements WHERE id = ?').run(movement.id);

  const updated   = db.prepare('SELECT * FROM savings WHERE id = ?').get(movement.savings_id);
  const movements = db.prepare(
    'SELECT * FROM savings_movements WHERE savings_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 3'
  ).all(movement.savings_id, req.userId);

  res.json({ ...updated, movements });
});
