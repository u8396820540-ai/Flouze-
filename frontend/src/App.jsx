import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './components/Auth/AuthPage';
import DashboardSummary from './components/Dashboard/Summary';
import IncomeSection from './components/Sections/IncomeSection';
import FixedSection from './components/Sections/FixedSection';
import SavingsSection from './components/Sections/SavingsSection';
import VariableSection from './components/Sections/VariableSection';
import { incomeAPI, fixedAPI, savingsAPI, variableAPI, copyMonthAPI } from './services/api';
import { TrendingUp, Moon, Sun, LogOut, ChevronLeft, ChevronRight, Download, Copy, CheckCircle } from 'lucide-react';

const monthName = (m) => new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

function AppContent() {
  const { user, loading, logout, toggleDarkMode, updateBudgetPeriod } = useAuth();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [income, setIncome] = useState(null);
  const [fixed, setFixed] = useState(null);
  const [savings, setSavings] = useState(null);
  const [variable, setVariable] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [fetching, setFetching] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyFromMonth, setCopyFromMonth] = useState('');

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    try {
      const [i, f, s, v, h] = await Promise.all([
        incomeAPI.getAll(month),
        fixedAPI.getAll(month),
        savingsAPI.getAll(month),
        variableAPI.getAll(month),
        variableAPI.history(),
      ]);
      setIncome(i.data);
      setFixed(f.data);
      setSavings(s.data);
      setVariable(v.data);
      setHistory(h.data);
    } finally {
      setFetching(false);
    }
  }, [user, month]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const prevMonth = () => {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() - 1);
    setMonth(d.toISOString().slice(0, 7));
  };

  const nextMonth = () => {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() + 1);
    setMonth(d.toISOString().slice(0, 7));
  };

  const prevMonthStr = () => {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  };

  // Générer les 24 derniers mois (hors mois courant)
  const availableMonths = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(month + '-01');
    d.setMonth(d.getMonth() - (i + 1));
    return d.toISOString().slice(0, 7);
  });

  const openCopyModal = () => {
    setCopyFromMonth(availableMonths[0]);
    setShowCopyModal(true);
  };

  const copyFromSelectedMonth = async () => {
    const from = copyFromMonth;
    if (!from) return;
    const isEmpty = !income?.items?.length && !fixed?.items?.length && !savings?.items?.length;
    if (!isEmpty) {
      if (!confirm(`Ce mois (${monthName(month)}) contient déjà des données.\nSeules les sections vides seront copiées depuis ${monthName(from)}.\nContinuer ?`)) return;
    }
    setShowCopyModal(false);
    setCopying(true);
    try {
      const res = await copyMonthAPI.copy(from, month);
      const { results } = res.data;
      await fetchAll();
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
      let msg = `✅ Copié depuis ${monthName(from)} :\n`;
      if (results.income > 0) msg += `• ${results.income} revenu(s) copié(s) — montants à remplir\n`;
      if (results.fixed > 0) msg += `• ${results.fixed} charge(s) fixe(s) copiée(s)\n`;
      if (results.savings > 0) msg += `• ${results.savings} objectif(s) d'épargne copié(s)\n`;
      if (results.skipped.length > 0) msg += `\n⚠️ Déjà rempli (non écrasé) : ${results.skipped.join(', ')}`;
      alert(msg);
    } catch (err) {
      alert('Erreur lors de la copie. Vérifiez que le mois sélectionné contient des données.');
    } finally {
      setCopying(false);
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Type', 'Nom/Source', 'Catégorie', 'Montant', 'Date', 'Notes'],
      ...(income?.items || []).map(i => ['Revenu', i.source, i.category, i.amount, i.date, i.notes]),
      ...(fixed?.items || []).map(i => ['Charge fixe', i.name, i.category, -i.amount, '', i.notes]),
      ...(savings?.items || []).map(i => ['Épargne', i.name, i.category, -i.monthly_amount, '', i.notes]),
      ...(variable?.items || []).map(i => ['Dépense', i.description, i.category, -i.amount, i.date, '']),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `budget_${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const tabs = [
    { id: 'dashboard', label: 'Vue d\'ensemble' },
    { id: 'income', label: 'Revenus' },
    { id: 'fixed', label: 'Charges fixes' },
    { id: 'savings', label: 'Épargne' },
    { id: 'variable', label: 'Dépenses' },
  ];

  const remaining = (income?.total || 0) - (fixed?.total || 0) - (savings?.totalMonthly || 0);
  const variableBudget = remaining;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                   style={{ background: 'var(--accent)' }}>
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display font-bold text-lg" style={{ color: 'var(--text)' }}>Flouze</span>
            </div>

            {/* Month navigator — menu déroulant */}
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="input-field text-xs font-medium capitalize py-1 px-2"
              style={{ minWidth: '130px', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              {Array.from({ length: 24 }, (_, i) => {
                const d = new Date();
                d.setDate(1);
                d.setMonth(d.getMonth() - i);
                const val = d.toISOString().slice(0, 7);
                return <option key={val} value={val}>{monthName(val)}</option>;
              })}
            </select>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={openCopyModal}
                disabled={copying}
                title="Copier depuis un autre mois"
                className="btn-ghost p-2 rounded-xl flex items-center gap-1.5 text-xs font-medium"
                style={{ color: copySuccess ? 'var(--positive)' : 'var(--text-muted)' }}>
                {copying
                  ? <span className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                  : copySuccess
                    ? <CheckCircle className="w-4 h-4" />
                    : <Copy className="w-4 h-4" />
                }
                <span className="hidden sm:inline">
                  {copySuccess ? 'Copié !' : 'Copier mois préc.'}
                </span>
              </button>
              <button onClick={exportCSV} title="Exporter CSV" className="btn-ghost p-2 rounded-xl">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={toggleDarkMode} className="btn-ghost p-2 rounded-xl">
                {user.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                   style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                     style={{ background: 'var(--accent)' }}>
                  {user.name[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--text)' }}>{user.name}</span>
              </div>
              <button onClick={logout} className="btn-ghost p-2 rounded-xl" title="Se déconnecter">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 pb-0 -mb-px overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className="px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2"
                      style={{
                        color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                        borderColor: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                        background: 'transparent'
                      }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {fetching && (
          <div className="flex items-center gap-2 mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            Mise à jour...
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardSummary
            income={income} fixed={fixed} savings={savings} variable={variable}
            history={history} month={month} onMonthChange={setMonth}
          />
        )}
        {activeTab === 'income' && (
          <IncomeSection data={income} month={month} onRefresh={fetchAll} />
        )}
        {activeTab === 'fixed' && (
          <FixedSection data={fixed} month={month} onRefresh={fetchAll} />
        )}
        {activeTab === 'savings' && (
          <SavingsSection data={savings} month={month} onRefresh={fetchAll} />
        )}
        {activeTab === 'variable' && (
          <VariableSection data={variable} month={month} onRefresh={fetchAll} budget={variableBudget} />
        )}
      </main>

      {/* ── Modale copier un mois ── */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.6)' }}
             onClick={() => setShowCopyModal(false)}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4"
               style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
               onClick={e => e.stopPropagation()}>
            <h3 className="font-display font-semibold text-lg" style={{ color: 'var(--text)' }}>
              Copier vers {monthName(month)}
            </h3>
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-muted)' }}>
                Copier depuis quel mois ?
              </label>
              <select
                value={copyFromMonth}
                onChange={e => setCopyFromMonth(e.target.value)}
                className="input-field w-full"
                style={{ fontSize: '14px' }}>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{monthName(m)}</option>
                ))}
              </select>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Les revenus, charges fixes et épargne seront copiés. Les sections déjà remplies ne seront pas écrasées.
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowCopyModal(false)}
                      className="btn-ghost flex-1 py-2.5">Annuler</button>
              <button onClick={copyFromSelectedMonth}
                      className="btn-primary flex-1 py-2.5">Copier</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
