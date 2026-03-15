const express = require('express');
const { db } = require('../db/database');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

// POST /api/copy-month
// Body: { fromMonth: "2026-02", toMonth: "2026-03" }
router.post('/', (req, res) => {
  const { fromMonth, toMonth } = req.body;
  if (!fromMonth || !toMonth) {
    return res.status(400).json({ error: 'fromMonth et toMonth requis' });
  }
  if (fromMonth === toMonth) {
    return res.status(400).json({ error: 'Les mois doivent être différents' });
  }

  const userId = req.userId;
  const results = { income: 0, fixed: 0, savings: 0, skipped: [] };

  // ── Revenus : copier source + catégorie + notes, montant = 0 ──────────────
  const incomeRows = db.prepare(
    'SELECT * FROM income WHERE user_id = ? AND month = ?'
  ).all(userId, fromMonth);

  const existingIncome = db.prepare(
    'SELECT COUNT(*) as n FROM income WHERE user_id = ? AND month = ?'
  ).get(userId, toMonth);

  if (existingIncome.n > 0) {
    results.skipped.push('revenus');
  } else {
    const stmtIncome = db.prepare(
      'INSERT INTO income (user_id, source, category, amount, date, notes, month) VALUES (?,?,?,?,?,?,?)'
    );
    for (const row of incomeRows) {
      // Garder le nom/source mais montant = 0
      const day = row.date.slice(8, 10); // garder le même jour du mois
      const newDate = toMonth + '-' + day;
      stmtIncome.run(userId, row.source, row.category, 0, newDate, row.notes, toMonth);
      results.income++;
    }
  }

  // ── Charges fixes : copie complète ───────────────────────────────────────
  const fixedRows = db.prepare(
    'SELECT * FROM fixed_expenses WHERE user_id = ? AND month = ?'
  ).all(userId, fromMonth);

  const existingFixed = db.prepare(
    'SELECT COUNT(*) as n FROM fixed_expenses WHERE user_id = ? AND month = ?'
  ).get(userId, toMonth);

  if (existingFixed.n > 0) {
    results.skipped.push('charges fixes');
  } else {
    const stmtFixed = db.prepare(
      'INSERT INTO fixed_expenses (user_id, name, category, amount, debit_day, notes, month) VALUES (?,?,?,?,?,?,?)'
    );
    for (const row of fixedRows) {
      stmtFixed.run(userId, row.name, row.category, row.amount, row.debit_day, row.notes, toMonth);
      results.fixed++;
    }
  }

  // ── Épargne : copie complète ──────────────────────────────────────────────
  const savingsRows = db.prepare(
    'SELECT * FROM savings WHERE user_id = ? AND month = ?'
  ).all(userId, fromMonth);

  const existingSavings = db.prepare(
    'SELECT COUNT(*) as n FROM savings WHERE user_id = ? AND month = ?'
  ).get(userId, toMonth);

  if (existingSavings.n > 0) {
    results.skipped.push('épargne');
  } else {
    const stmtSavings = db.prepare(
      'INSERT INTO savings (user_id, name, category, monthly_amount, target_amount, current_amount, notes, month) VALUES (?,?,?,?,?,?,?,?)'
    );
    for (const row of savingsRows) {
      stmtSavings.run(
        userId, row.name, row.category,
        row.monthly_amount, row.target_amount, row.current_amount,
        row.notes, toMonth
      );
      results.savings++;
    }
  }

  res.json({
    success: true,
    message: `Copié depuis ${fromMonth} vers ${toMonth}`,
    results
  });
});

module.exports = router;
