import { useState } from 'react';
import { Plus, Pencil, Trash2, Shield, GripVertical, X, CheckCircle2, Circle, ChevronDown, ChevronUp, Trash } from 'lucide-react';
import { fixedAPI } from '../../services/api';
import { Modal, CategoryBadge, EmptyState, FormGrid, FormField } from '../UI';

const SUGGESTIONS = ['Logement','Électricité','Eau','Internet','Téléphone','Assurance','Crédit','Transport','Abonnements','Impôts','Mutuelle','Nourriture','Essence','Autres'];

// Jauge de progression pour les charges progressives
function ProgressGauge({ spent, budget }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const color = pct >= 100 ? 'var(--danger)' : pct >= 80 ? 'var(--warning)' : 'var(--positive)';
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
        <span style={{ color }}>{spent.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € dépensés</span>
        <span>{budget.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € budget</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all duration-500"
             style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="text-right text-xs mt-0.5" style={{ color }}>
        {pct >= 100 ? '🎯 Budget atteint !' : `${Math.round(pct)}% consommé · ${(budget - spent).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € restants`}
      </div>
    </div>
  );
}

// Ligne de dépense dans une charge progressive
function ProgressiveRow({ item, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    if (!confirm(`Supprimer "${item.label || item.amount + ' €'}" ?`)) return;
    setDeleting(true);
    try { await onDelete(item.id); } finally { setDeleting(false); }
  };
  return (
    <div className="flex items-center justify-between text-xs py-1 group/item">
      <span className="truncate flex-1" style={{ color: 'var(--text-muted)' }}>
        {item.label || '—'}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="font-display font-semibold" style={{ color: 'var(--warning)' }}>
          {parseFloat(item.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
        </span>
        <span style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
          {new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
        </span>
        <button onClick={handleDelete} disabled={deleting}
                className="opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-500/10"
                style={{ color: 'var(--danger)' }}>
          {deleting
            ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin block" />
            : <Trash className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}

// Carte progressive dépliable
function ProgressiveCard({ item, onRefresh }) {
  const [open, setOpen]         = useState(false);
  const [label, setLabel]       = useState('');
  const [amount, setAmount]     = useState('');
  const [adding, setAdding]     = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!amount) return;
    setAdding(true);
    try {
      await fixedAPI.addItem(item.id, label, parseFloat(amount));
      setLabel(''); setAmount('');
      onRefresh();
    } finally { setAdding(false); }
  };

  const handleDelete = async (itemId) => {
    await fixedAPI.deleteItem(itemId);
    onRefresh();
  };

  const spent    = item.total_spent || 0;
  const budget   = item.amount;
  const isFull   = spent >= budget;

  return (
    <div className="rounded-xl overflow-hidden" style={{
      border: `1px solid ${isFull ? 'var(--danger)' : 'var(--border)'}`,
      background: 'var(--surface2)'
    }}>
      {/* Header cliquable */}
      <button className="w-full flex items-center justify-between px-4 py-3 text-left"
              onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <CategoryBadge name={item.category} />
          <span className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>{item.name}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-display font-semibold text-sm" style={{ color: isFull ? 'var(--danger)' : 'var(--warning)' }}>
            {spent.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} / {budget.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </span>
          {open ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
        </div>
      </button>

      {/* Jauge toujours visible */}
      <div className="px-4 pb-3">
        <ProgressGauge spent={spent} budget={budget} />
      </div>

      {/* Dépenses dépliables */}
      {open && (
        <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          {/* Liste des dépenses */}
          {item.items && item.items.length > 0 ? (
            <div className="space-y-0.5">
              {item.items.map(i => (
                <ProgressiveRow key={i.id} item={i} onDelete={handleDelete} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>Aucune dépense ajoutée</p>
          )}

          {/* Formulaire ajout rapide */}
          {!isFull && (
            <form onSubmit={handleAdd} className="flex gap-2 items-center pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              <input type="text" value={label} onChange={e => setLabel(e.target.value)}
                     placeholder="Libellé (ex: Leclerc)" className="input-field flex-1"
                     style={{ fontSize: '12px', padding: '6px 10px' }} />
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                     placeholder="€" min="0" step="0.01" required className="input-field w-20"
                     style={{ fontSize: '12px', padding: '6px 10px' }} />
              <button type="submit" disabled={adding || !amount}
                      className="btn-primary px-3 py-1.5 text-xs flex-shrink-0">
                {adding
                  ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
                  : <Plus className="w-3.5 h-3.5" />}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default function FixedSection({ data, month, onRefresh }) {
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState({ name: '', category: 'Logement', amount: '', debit_day: '', notes: '', is_progressive: false });
  const [loading, setLoading]     = useState(false);
  const [toggling, setToggling]   = useState(null);
  const [dragId, setDragId]       = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const resetForm = () => { setForm({ name: '', category: 'Logement', amount: '', debit_day: '', notes: '', is_progressive: false }); setEditing(null); };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, category: item.category, amount: item.amount, debit_day: item.debit_day ?? '', notes: item.notes || '', is_progressive: !!item.is_progressive });
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const payload = { name: form.name, category: form.category, amount: parseFloat(form.amount), debit_day: form.debit_day !== '' ? parseInt(form.debit_day) : null, notes: form.notes, month, is_progressive: form.is_progressive };
      if (editing) await fixedAPI.update(editing.id, payload);
      else await fixedAPI.create(payload);
      onRefresh(); setShowForm(false); resetForm();
    } finally { setLoading(false); }
  };

  const togglePaid = async (item) => {
    setToggling(item.id);
    try { await fixedAPI.togglePaid(item.id); onRefresh(); }
    finally { setToggling(null); }
  };

  const remove = async (id) => {
    if (!confirm('Supprimer cette charge ?')) return;
    await fixedAPI.delete(id); onRefresh();
  };

  const handleDrop = async (targetId) => {
    if (!dragId || dragId === targetId) return;
    const items = [...(data?.items || [])];
    const fromIdx = items.findIndex(i => i.id === dragId);
    const toIdx   = items.findIndex(i => i.id === targetId);
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    setDragId(null); setDragOverId(null);
    await fixedAPI.reorder(items.map((item, idx) => ({ id: item.id, sort_order: idx })));
    onRefresh();
  };

  const totalPaid      = data?.totalPaid || 0;
  const total          = data?.total || 0;
  const remaining      = total - totalPaid;

  // Séparer charges normales et progressives
  const normalItems      = (data?.items || []).filter(i => !i.is_progressive);
  const progressiveItems = (data?.items || []).filter(i => i.is_progressive);

  return (
    <div className="card animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(251,146,60,0.15)' }}>
            <Shield className="w-4 h-4" style={{ color: 'var(--warning)' }} />
          </div>
          <div>
            <h2 className="font-display font-semibold" style={{ color: 'var(--text)' }}>Charges fixes</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Total : <span className="font-semibold font-display" style={{ color: 'var(--warning)' }}>
                −{total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </span>
              {totalPaid > 0 && (
                <span className="ml-2">
                  · Passées : <span className="font-semibold" style={{ color: 'var(--positive)' }}>
                    {totalPaid.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </span>
                  {remaining > 0 && <span className="ml-1 opacity-60">· {remaining.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € restantes</span>}
                </span>
              )}
            </p>
          </div>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Ajouter
        </button>
      </div>

      {!data?.items?.length ? (
        <EmptyState icon={Shield} text="Aucune charge fixe ce mois-ci"
          action={<button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-xs px-3 py-1.5">+ Ajouter une charge</button>} />
      ) : (
        <div className="space-y-4">

          {/* ── Charges normales (checkbox) ── */}
          {normalItems.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                Prélèvements fixes
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['','✔','Nom','Catégorie','Montant','Prélèvement','Notes',''].map((h,i) => (
                      <th key={i} className="text-left pb-3 pr-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {normalItems.map((item) => (
                    <tr key={item.id} className="group"
                        draggable
                        onDragStart={() => setDragId(item.id)}
                        onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id); }}
                        onDragLeave={() => setDragOverId(null)}
                        onDrop={() => handleDrop(item.id)}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          opacity: dragId === item.id ? 0.4 : 1,
                          background: item.is_paid ? 'rgba(74,222,128,0.04)' : dragOverId === item.id ? 'var(--surface2)' : 'transparent',
                          cursor: 'grab'
                        }}>
                      <td className="py-3 pr-2 w-6">
                        <GripVertical className="w-3.5 h-3.5 opacity-20 group-hover:opacity-60" style={{ color: 'var(--text-muted)' }} />
                      </td>
                      <td className="py-3 pr-4 w-8">
                        <button onClick={() => togglePaid(item)} disabled={toggling === item.id}
                                className="transition-all hover:scale-110" title={item.is_paid ? 'Marquer non passée' : 'Marquer passée'}>
                          {toggling === item.id
                            ? <span className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin block" style={{ color: 'var(--text-muted)' }} />
                            : item.is_paid
                              ? <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--positive)' }} />
                              : <Circle className="w-5 h-5 opacity-30 group-hover:opacity-60" style={{ color: 'var(--text-muted)' }} />
                          }
                        </button>
                      </td>
                      <td className="py-3 pr-4 font-medium" style={{ color: item.is_paid ? 'var(--text-muted)' : 'var(--text)', textDecoration: item.is_paid ? 'line-through' : 'none' }}>
                        {item.name}
                      </td>
                      <td className="py-3 pr-4"><CategoryBadge name={item.category} /></td>
                      <td className="py-3 pr-4">
                        <span className="font-display font-semibold" style={{ color: item.is_paid ? 'var(--positive)' : 'var(--warning)' }}>
                          −{parseFloat(item.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {item.debit_day ? `Le ${item.debit_day}` : '—'}
                      </td>
                      <td className="py-3 pr-4 text-xs max-w-[140px] truncate" style={{ color: 'var(--text-muted)' }}>{item.notes}</td>
                      <td className="py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(item)} className="btn-ghost p-1.5"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => remove(item.id)} className="btn-danger p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Charges progressives (jauge) ── */}
          {progressiveItems.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                Budgets progressifs
              </p>
              <div className="space-y-2">
                {progressiveItems.map(item => (
                  <div key={item.id} className="relative group">
                    <ProgressiveCard item={item} onRefresh={onRefresh} />
                    {/* Edit/Delete au survol */}
                    <div className="absolute top-3 right-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button onClick={() => openEdit(item)} className="btn-ghost p-1.5 rounded-lg bg-opacity-80" style={{ background: 'var(--surface)' }}><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => remove(item.id)} className="btn-danger p-1.5 rounded-lg" style={{ background: 'var(--surface)' }}><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modale ajout/édition */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }} title={editing ? 'Modifier la charge' : 'Ajouter une charge fixe'}>
        <form onSubmit={submit} className="space-y-4">
          {/* Toggle type de charge */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button type="button" onClick={() => setForm({ ...form, is_progressive: false })}
                    className="flex-1 px-3 py-2.5 text-sm transition-colors"
                    style={{ background: !form.is_progressive ? 'var(--accent)' : 'transparent', color: !form.is_progressive ? 'white' : 'var(--text-muted)' }}>
              ✔ Prélèvement fixe
            </button>
            <button type="button" onClick={() => setForm({ ...form, is_progressive: true })}
                    className="flex-1 px-3 py-2.5 text-sm transition-colors"
                    style={{ background: form.is_progressive ? 'var(--accent)' : 'transparent', color: form.is_progressive ? 'white' : 'var(--text-muted)' }}>
              📊 Budget progressif
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {form.is_progressive
              ? 'Tu pourras ajouter les dépenses au fur et à mesure (courses, essence…)'
              : 'Charge cochée manuellement quand elle est passée (Netflix, loyer…)'}
          </p>

          <FormGrid>
            <FormField label="Nom" full>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                     placeholder={form.is_progressive ? 'Ex: Nourriture, Essence…' : 'Ex: Netflix, EDF…'}
                     required className="input-field" />
            </FormField>
            <FormField label="Catégorie (libre)">
              <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                     placeholder="Ex: Alimentation" list="fixed-cat-list" className="input-field" />
              <datalist id="fixed-cat-list">{SUGGESTIONS.map(c => <option key={c} value={c} />)}</datalist>
            </FormField>
            <FormField label={form.is_progressive ? 'Budget total (€)' : 'Montant (€)'}>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                     placeholder="0.00" min="0" step="0.01" required className="input-field" />
            </FormField>
            {!form.is_progressive && (
              <FormField label="Jour de prélèvement">
                <div className="flex gap-2 items-center">
                  <input type="number" value={form.debit_day} onChange={e => setForm({ ...form, debit_day: e.target.value })}
                         placeholder="1-31" min="1" max="31" className="input-field flex-1" />
                  {form.debit_day !== '' && (
                    <button type="button" onClick={() => setForm({ ...form, debit_day: '' })} className="btn-ghost p-2 rounded-lg flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </FormField>
            )}
            <FormField label="Notes" full>
              <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optionnel…" className="input-field" />
            </FormField>
          </FormGrid>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-ghost flex-1 py-2.5">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-2.5">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" /> : editing ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
