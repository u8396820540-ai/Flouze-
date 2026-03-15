const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'budget.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    dark_mode INTEGER DEFAULT 1,
    budget_period TEXT DEFAULT 'month',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income','fixed','savings','variable')),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#4ADE80',
    is_custom INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS income (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    source TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Salaire',
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    notes TEXT DEFAULT '',
    month TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS fixed_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    debit_day INTEGER,
    notes TEXT DEFAULT '',
    month TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS savings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Urgence',
    monthly_amount REAL NOT NULL DEFAULT 0,
    target_amount REAL NOT NULL DEFAULT 0,
    current_amount REAL NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    month TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS variable_budget_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    budget_amount REAL NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    month TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS variable_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    month TEXT NOT NULL,
    budget_line_id INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Migrations for existing DBs
const migrations = [
  'ALTER TABLE income ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE fixed_expenses ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE savings ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE variable_expenses ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE variable_expenses ADD COLUMN budget_line_id INTEGER',
];
migrations.forEach(sql => { try { db.exec(sql); } catch (_) {} });
// Init sort_order from id for existing rows that have sort_order=0
['income','fixed_expenses','savings','variable_expenses'].forEach(t => {
  try { db.exec(`UPDATE ${t} SET sort_order = id WHERE sort_order = 0`); } catch(_) {}
});

function insertDefaultCategories(userId) {
  const defaults = [
    {type:'income',name:'Salaire'},{type:'income',name:'Freelance'},{type:'income',name:'Prime'},
    {type:'income',name:'Aides'},{type:'income',name:'Autres'},
    {type:'fixed',name:'Logement'},{type:'fixed',name:'Électricité'},{type:'fixed',name:'Eau'},
    {type:'fixed',name:'Internet'},{type:'fixed',name:'Téléphone'},{type:'fixed',name:'Assurance'},
    {type:'fixed',name:'Crédit'},{type:'fixed',name:'Transport'},{type:'fixed',name:'Abonnements'},
    {type:'fixed',name:'Impôts'},
    {type:'savings',name:'Urgence'},{type:'savings',name:'Vacances'},{type:'savings',name:'Voiture'},
    {type:'savings',name:'Maison'},{type:'savings',name:'Impôts'},{type:'savings',name:'Taxe foncière'},
    {type:'savings',name:'Projet personnel'},
    {type:'variable',name:'Courses'},{type:'variable',name:'Restaurant'},{type:'variable',name:'Loisirs'},
    {type:'variable',name:'Transport'},{type:'variable',name:'Shopping'},{type:'variable',name:'Santé'},
    {type:'variable',name:'Enfants'},{type:'variable',name:'Animaux'},{type:'variable',name:'Cadeaux'},
    {type:'variable',name:'Autres'},
  ];
  const stmt = db.prepare('INSERT OR IGNORE INTO categories (user_id, type, name, is_custom) VALUES (?,?,?,0)');
  defaults.forEach(({type,name}) => stmt.run(userId, type, name));
}

module.exports = { db, insertDefaultCategories };

// Migration: add is_paid to fixed_expenses
try { db.exec('ALTER TABLE fixed_expenses ADD COLUMN is_paid INTEGER NOT NULL DEFAULT 0'); } catch(_) {}

// Migration: savings movements history
db.exec(`
  CREATE TABLE IF NOT EXISTS savings_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    savings_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('+','-')),
    label TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (savings_id) REFERENCES savings(id) ON DELETE CASCADE
  );
`);

// Migration: is_progressive flag on fixed_expenses
try { db.exec('ALTER TABLE fixed_expenses ADD COLUMN is_progressive INTEGER NOT NULL DEFAULT 0'); } catch(_) {}

// Migration: fixed_expense_items for progressive tracking
db.exec(`
  CREATE TABLE IF NOT EXISTS fixed_expense_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixed_expense_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    label TEXT DEFAULT '',
    amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (fixed_expense_id) REFERENCES fixed_expenses(id) ON DELETE CASCADE
  );
`);
