import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Receipt, AlertTriangle, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { variableAPI, variableBudgetsAPI } from '../../services/api';
import { Modal, EmptyState, FormGrid, FormField } from '../UI';

const SUGGESTIONS = ['Courses','Restaurant','Loisirs','Transport','Shopping','Santé','Enfants','Animaux','Carburant','Cadeaux','Sport','Hygiène','Autres'];

function GaugeBar({ spent, budget }) {
  if (!budget) return null;
  const pct = Math.min((spent / budget) * 100, 100);
  const over = spent > budget;
  const near = pct >= 80 && !over;
  const color = over ? 'var(--danger)' : near ? 'var(--warning)' : 'var(--positive)';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
        <span style={{ color: over ? 'var(--danger)' : near ? 'var(--warning)' : 'var(--text)' }}>
          {spent.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
        </span>
        <span>/ {budget.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      {over && (
        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
          <AlertTriangle className="w-3 h-3" />
          Dépassé de {(spent - budget).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
        </p>
      )}
    </div>
  );
}

export default function VariableSection({ data, month, onRefresh }) {
  const [budgetLines, setBudgetLines] = useState([]);
  const [expanded, setExpanded] = useState({});

  // Tri
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'category'

  // Budget line forms
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetForm, setBudgetForm] = useState({ name: '', budget_amount: '' });

  // Expense forms
  const [showExpenseForm, setShowExpenseForm] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState({ date: new Date().toISOString().slice(0, 10), category: 'Courses', description: '', amount: '' });

  const [loading, setLoading] = useState(false);
  const [dragLineId, setDragLineId] = useState(null);
  const [dragOverLineId, setDragOverLineId] = useState(null);

  const fetchBudgetLines = useCallback(async () => {
    if (!month) return;
    try { const res = await variableBudgetsAPI.getAll(month); setBudgetLines(res.data); } catch (_) {}
  }, [month]);

  useEffect(() => { fetchBudgetLines(); }, [fetchBudgetLines]);
  useEffect(() => { fetchBudgetLines(); }, [data, fetchBudgetLines]);

  const refreshAll = () => { onRefresh(); fetchBudgetLines(); };

  // Budget line CRUD
  const openEditBudget = (line) => { setEditingBudget(line); setBudgetForm({ name: line.name, budget_amount: line.budget_amount }); setShowBudgetForm(true); };

  const submitBudget = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const payload = { name: budgetForm.name, budget_amount: parseFloat(budgetForm.budget_amount) || 0, month };
      if (editingBudget) await variableBudgetsAPI.update(editingBudget.id, payload);
      else { const res = await variableBudgetsAPI.create(payload); setExpanded(p => ({ ...p, [res.data.id]: true })); }
      setShowBudgetForm(false); setEditingBudget(null); setBudgetForm({ name: '', budget_amount: '' });
      refreshAll();
    } finally { setLoading(false); }
  };

  const removeBudget = async (id) => {
    if (!confirm('Supprimer cette enveloppe ?')) return;
    await variableBudgetsAPI.delete(id); refreshAll();
  };

  // Expense CRUD
  const openAddExpense = (budgetLineId) => {
    setEditingExpense(null);
    setExpenseForm({ date: new Date().toISOString().slice(0, 10), category: 'Courses', description: '', amount: '' });
    setShowExpenseForm(budgetLineId);
  };

  const openEditExpense = (item, budgetLineId) => {
    setEditingExpense(item);
    setExpenseForm({ date: item.date, category: item.category, description: item.description, amount: item.amount });
    setShowExpenseForm(budgetLineId ?? 'standalone');
  };

  const submitExpense = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const budgetLineId = showExpenseForm !== 'standalone' ? showExpenseForm : null;
      const payload = { ...expenseForm, amount: parseFloat(expenseForm.amount), month, budget_line_id: budgetLineId };
      if (editingExpense) await variableAPI.update(editingExpense.id, payload);
      else await variableAPI.create(payload);
      setShowExpenseForm(null); setEditingExpense(null);
      refreshAll();
    } finally { setLoading(false); }
  };

  const removeExpense = async (id) => {
    if (!confirm('Supprimer cette dépense ?')) return;
    await variableAPI.delete(id); refreshAll();
  };

  // Drag & drop
  const handleDropLine = async (targetId) => {
    if (!dragLineId || dragLineId === targetId) return;
    const lines = [...budgetLines];
    const fromIdx = lines.findIndex(l => l.id === dragLineId);
    const toIdx   = lines.findIndex(l => l.id === targetId);
    const [moved] = lines.splice(fromIdx, 1);
    lines.splice(toIdx, 0, moved);
    setDragLineId(null); setDragOverLineId(null);
    await variableBudgetsAPI.reorder(lines.map((l, idx) => ({ id: l.id, sort_order: idx })));
    fetchBudgetLines();
  };

  // Tri des dépenses standalone
  const allItems = data?.items || [];
  const standalone = allItems.filter(i => !i.budget_line_id);
  const sortedStandalone = [...standalone].sort((a, b) => {
    if (sortBy === 'category') return a.category.localeCompare(b.category, 'fr');
    return new Date(b.date) - new Date(a.date); // date décroissante par défaut
  });

  const totalVariable = data?.total || 0;

  return (
    <div className="card animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.1)' }}>
            <Receipt className="w-4 h-4" style={{ color: 'var(--danger)' }} />
          </div>
          <div>
            <h2 className="font-display font-semibold" style={{ color: 'var(--text)' }}>Dépenses variables</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Total : <span className="font-semibold font-display" style={{ color: 'var(--danger)' }}>
                −{totalVariable.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Tri */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {[['date','📅 Date'],['category','🏷 Catégorie']].map(([val, label]) => (
              <button key={val} onClick={() => setSortBy(val)}
                      className="px-3 py-1.5 text-xs transition-colors"
                      style={{ background: sortBy === val ? 'var(--accent)' : 'transparent', color: sortBy === val ? 'white' : 'var(--text-muted)' }}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => openAddExpense('standalone')} className="btn-primary flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Dépense
          </button>
        </div>
      </div>

      {budgetLines.length === 0 && standalone.length === 0 ? (
        <EmptyState icon={Receipt} text="Aucune dépense ce mois-ci"
          action={<button onClick={() => openAddExpense('standalone')} className="btn-primary text-xs px-3 py-1.5">+ Ajouter une dépense</button>} />
      ) : (
        <div className="space-y-3">
          {/* Envelopes */}
          {budgetLines.map((line) => (
            <div key={line.id}
                 draggable
                 onDragStart={() => setDragLineId(line.id)}
                 onDragOver={(e) => { e.preventDefault(); setDragOverLineId(line.id); }}
                 onDragLeave={() => setDragOverLineId(null)}
                 onDrop={() => handleDropLine(line.id)}
                 className="rounded-xl overflow-hidden"
                 style={{ border: `1px solid ${dragOverLineId === line.id ? 'var(--accent)' : 'var(--border)'}`, opacity: dragLineId === line.id ? 0.4 : 1 }}>
              <div className="flex items-center gap-3 px-4 py-3 group" style={{ background: 'var(--surface2)', cursor: 'grab' }}>
                <GripVertical className="w-3.5 h-3.5 opacity-30" style={{ color: 'var(--text-muted)' }} />
                <button className="flex-1 text-left" onClick={() => setExpanded(p => ({ ...p, [line.id]: !p[line.id] }))}>
                  <div className="flex items-center gap-2">
                    {expanded[line.id] ? <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /> : <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
                    <span className="font-display font-semibold text-sm" style={{ color: 'var(--text)' }}>{line.name}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({line.expenses?.length || 0} dépense{(line.expenses?.length || 0) > 1 ? 's' : ''})</span>
                  </div>
                </button>
                <div className="flex-1 max-w-[200px]">
                  <GaugeBar spent={line.total_spent || 0} budget={line.budget_amount} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openAddExpense(line.id)} className="btn-primary p-1.5 rounded-lg text-xs" title="Ajouter une dépense">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openEditBudget(line)} className="btn-ghost p-1.5 rounded-lg"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => removeBudget(line.id)} className="btn-danger p-1.5 rounded-lg"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              {expanded[line.id] && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {(!line.expenses || line.expenses.length === 0) ? (
                    <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>Aucune dépense dans cette enveloppe</p>
                  ) : (
                    <table className="w-full text-sm">
                      <tbody>
                        {[...line.expenses].sort((a, b) => {
                          if (sortBy === 'category') return a.category.localeCompare(b.category, 'fr');
                          return new Date(b.date) - new Date(a.date);
                        }).map((exp) => (
                          <tr key={exp.id} className="group" style={{ borderTop: '1px solid var(--border)' }}>
                            <td className="py-2.5 pl-10 pr-4 text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(exp.date).toLocaleDateString('fr-FR')}</td>
                            <td className="py-2.5 pr-4 font-medium text-sm" style={{ color: 'var(--text)' }}>{exp.description}</td>
                            <td className="py-2.5 pr-4 text-xs" style={{ color: 'var(--text-muted)' }}>{exp.category}</td>
                            <td className="py-2.5 pr-4 font-display font-semibold text-sm" style={{ color: 'var(--danger)' }}>
                              −{parseFloat(exp.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                            </td>
                            <td className="py-2.5 pr-4">
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditExpense(exp, line.id)} className="btn-ghost p-1"><Pencil className="w-3 h-3" /></button>
                                <button onClick={() => removeExpense(exp.id)} className="btn-danger p-1"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        <tr style={{ borderTop: '1px solid var(--border)' }}>
                          <td colSpan={5} className="py-2 pl-10">
                            <button onClick={() => openAddExpense(line.id)} className="text-xs flex items-center gap-1"
                                    style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                              <Plus className="w-3.5 h-3.5" /> Ajouter une dépense
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Dépenses standalone */}
          {sortedStandalone.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--surface2)' }}>
                <span className="font-display font-semibold text-sm" style={{ color: 'var(--text-muted)' }}>Dépenses diverses</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {sortBy === 'category' ? 'par catégorie' : 'par date'}
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {sortedStandalone.map((item) => (
                    <tr key={item.id} className="group" style={{ borderTop: '1px solid var(--border)' }}>
                      <td className="py-2.5 pl-4 pr-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(item.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-2.5 pr-4 font-medium" style={{ color: 'var(--text)' }}>{item.description}</td>
                      <td className="py-2.5 pr-4 text-xs" style={{ color: 'var(--text-muted)' }}>{item.category}</td>
                      <td className="py-2.5 pr-4 font-display font-semibold" style={{ color: 'var(--danger)' }}>
                        −{parseFloat(item.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditExpense(item, null)} className="btn-ghost p-1.5"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => removeExpense(item.id)} className="btn-danger p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Budget line form modal */}
      <Modal isOpen={showBudgetForm} onClose={() => { setShowBudgetForm(false); setEditingBudget(null); }}
             title={editingBudget ? "Modifier l'enveloppe" : "Créer une enveloppe de budget"}>
        <form onSubmit={submitBudget} className="space-y-4">
          <FormGrid>
            <FormField label="Nom de l'enveloppe" full>
              <input type="text" value={budgetForm.name} onChange={e => setBudgetForm({ ...budgetForm, name: e.target.value })}
                     placeholder="Ex: Essence, Courses, Loisirs..." required className="input-field" list="env-name-list" />
              <datalist id="env-name-list">{SUGGESTIONS.map(c => <option key={c} value={c} />)}</datalist>
            </FormField>
            <FormField label="Budget mensuel prévu (€)" full>
              <input type="number" value={budgetForm.budget_amount} onChange={e => setBudgetForm({ ...budgetForm, budget_amount: e.target.value })}
                     placeholder="0.00" min="0" step="0.01" className="input-field" />
            </FormField>
          </FormGrid>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowBudgetForm(false); setEditingBudget(null); }} className="btn-ghost flex-1 py-2.5">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-2.5">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" /> : editingBudget ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Expense form modal */}
      <Modal isOpen={showExpenseForm !== null} onClose={() => { setShowExpenseForm(null); setEditingExpense(null); }}
             title={editingExpense ? 'Modifier la dépense' : 'Ajouter une dépense'}>
        <form onSubmit={submitExpense} className="space-y-4">
          {showExpenseForm !== 'standalone' && showExpenseForm && (
            <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              Enveloppe : <span className="font-semibold" style={{ color: 'var(--text)' }}>
                {budgetLines.find(l => l.id === showExpenseForm)?.name}
              </span>
            </div>
          )}
          <FormGrid>
            <FormField label="Date">
              <input type="date" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} required className="input-field" />
            </FormField>
            <FormField label="Catégorie (libre)">
              <input type="text" value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                     placeholder="Ex: Carburant" list="var-cat-list" className="input-field" />
              <datalist id="var-cat-list">{SUGGESTIONS.map(c => <option key={c} value={c} />)}</datalist>
            </FormField>
            <FormField label="Description" full>
              <input type="text" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                     placeholder="Ex: Plein Station Total" required className="input-field" />
            </FormField>
            <FormField label="Montant (€)" full>
              <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                     placeholder="0.00" min="0" step="0.01" required className="input-field" />
            </FormField>
          </FormGrid>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowExpenseForm(null); setEditingExpense(null); }} className="btn-ghost flex-1 py-2.5">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-2.5">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" /> : editingExpense ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
