import { useState } from 'react';
import { Plus, Pencil, Trash2, PiggyBank, Target, GripVertical, PlusCircle, MinusCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { savingsAPI } from '../../services/api';
import { Modal, CategoryBadge, EmptyState, ProgressBar, FormGrid, FormField } from '../UI';

const SUGGESTIONS = ['Urgence','Vacances','Voiture','Maison','Impôts','Taxe foncière','Projet personnel','Retraite','Études','Autres'];

function MovementHistory({ movements }) {
  if (!movements || movements.length === 0) return null;
  return (
    <div className="mt-3 space-y-1.5" style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>3 derniers mouvements</p>
      {movements.map((m) => (
        <div key={m.id} className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            {m.type === '+'
              ? <TrendingUp  className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--positive)' }} />
              : <TrendingDown className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--danger)' }} />
            }
            <span className="truncate" style={{ color: 'var(--text-muted)' }}>
              {m.label || (m.type === '+' ? 'Versement' : 'Retrait')}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-display font-semibold" style={{ color: m.type === '+' ? 'var(--positive)' : 'var(--danger)' }}>
              {m.type === '+' ? '+' : '−'}{parseFloat(m.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </span>
            <span style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
              {new Date(m.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SavingsSection({ data, month, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'Urgence', monthly_amount: '', target_amount: '', current_amount: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('cards');
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [addAmounts, setAddAmounts] = useState({});
  const [addLabels, setAddLabels] = useState({});
  const [addingId, setAddingId] = useState(null);

  const resetForm = () => { setForm({ name: '', category: 'Urgence', monthly_amount: '', target_amount: '', current_amount: '', notes: '' }); setEditing(null); };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, category: item.category, monthly_amount: item.monthly_amount, target_amount: item.target_amount, current_amount: item.current_amount, notes: item.notes || '' });
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const payload = { ...form, monthly_amount: parseFloat(form.monthly_amount)||0, target_amount: parseFloat(form.target_amount)||0, current_amount: parseFloat(form.current_amount)||0, month };
      if (editing) await savingsAPI.update(editing.id, payload);
      else await savingsAPI.create(payload);
      onRefresh(); setShowForm(false); resetForm();
    } finally { setLoading(false); }
  };

  const remove = async (id) => {
    if (!confirm('Supprimer cet objectif ?')) return;
    await savingsAPI.delete(id); onRefresh();
  };

  const applyAmount = async (item, sign) => {
    const val = parseFloat(addAmounts[item.id]);
    if (!val || val <= 0) return;
    setAddingId(item.id + sign);
    try {
      await savingsAPI.addAmount(item.id, sign === '+' ? val : -val, addLabels[item.id] || '');
      setAddAmounts(prev => ({ ...prev, [item.id]: '' }));
      setAddLabels(prev => ({ ...prev, [item.id]: '' }));
      onRefresh();
    } finally { setAddingId(null); }
  };

  const handleDrop = async (targetId) => {
    if (!dragId || dragId === targetId) return;
    const items = [...(data?.items || [])];
    const fromIdx = items.findIndex(i => i.id === dragId);
    const toIdx   = items.findIndex(i => i.id === targetId);
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    setDragId(null); setDragOverId(null);
    await savingsAPI.reorder(items.map((item, idx) => ({ id: item.id, sort_order: idx })));
    onRefresh();
  };

  const totalAcquired = data?.totalAcquired || 0;

  return (
    <div className="card animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(96,165,250,0.15)' }}>
            <PiggyBank className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 className="font-display font-semibold" style={{ color: 'var(--text)' }}>Épargne</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Acquis total : <span className="font-semibold font-display" style={{ color: 'var(--accent)' }}>
                {totalAcquired.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
              {data?.totalMonthly > 0 && <span className="ml-2 opacity-60">({data.totalMonthly.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € ce mois)</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {['cards','table'].map(v => (
              <button key={v} onClick={() => setView(v)} className="px-3 py-1.5 text-xs transition-colors"
                      style={{ background: view === v ? 'var(--accent)' : 'transparent', color: view === v ? 'white' : 'var(--text-muted)' }}>
                {v === 'cards' ? 'Cartes' : 'Tableau'}
              </button>
            ))}
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>
      </div>

      {!data?.items?.length ? (
        <EmptyState icon={Target} text="Aucun objectif d'épargne ce mois-ci"
          action={<button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-xs px-3 py-1.5">+ Créer un objectif</button>} />
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.items.map((item) => (
            <div key={item.id}
                 draggable
                 onDragStart={() => setDragId(item.id)}
                 onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id); }}
                 onDragLeave={() => setDragOverId(null)}
                 onDrop={() => handleDrop(item.id)}
                 className="rounded-xl p-4 group relative"
                 style={{ background: 'var(--surface2)', border: `1px solid ${dragOverId === item.id ? 'var(--accent)' : 'var(--border)'}`, opacity: dragId === item.id ? 0.4 : 1, cursor: 'grab' }}>
              <GripVertical className="absolute top-3 left-3 w-3.5 h-3.5 opacity-20 group-hover:opacity-50" style={{ color: 'var(--text-muted)' }} />
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(item)} className="btn-ghost p-1.5 rounded-lg"><Pencil className="w-3 h-3" /></button>
                <button onClick={() => remove(item.id)} className="btn-danger p-1.5 rounded-lg"><Trash2 className="w-3 h-3" /></button>
              </div>
              <div className="mb-3 pl-5">
                <h4 className="font-display font-semibold text-sm pr-14" style={{ color: 'var(--text)' }}>{item.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <CategoryBadge name={item.category} />
                  <span className="text-xs" style={{ color: 'var(--accent)' }}>
                    {parseFloat(item.current_amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € acquis
                  </span>
                </div>
              </div>
              <div className="mb-3">
                <ProgressBar current={item.current_amount} target={item.target_amount} />
              </div>
              <div className="flex justify-between text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                <span>Mensuel : <span className="font-medium" style={{ color: 'var(--accent)' }}>
                  {parseFloat(item.monthly_amount).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </span></span>
                {item.notes && <span className="truncate max-w-[100px]">{item.notes}</span>}
              </div>

              {/* +/- avec label optionnel */}
              <div className="space-y-1.5">
                <input type="text"
                       value={addLabels[item.id] || ''}
                       onChange={e => setAddLabels(prev => ({ ...prev, [item.id]: e.target.value }))}
                       placeholder="Libellé (optionnel)"
                       className="input-field w-full"
                       style={{ fontSize: '11px', padding: '5px 10px' }} />
                <div className="flex gap-1.5 items-center">
                  <input type="number" min="0" step="0.01"
                         value={addAmounts[item.id] || ''}
                         onChange={e => setAddAmounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                         placeholder="Montant €"
                         className="input-field flex-1"
                         style={{ fontSize: '12px', padding: '6px 10px' }} />
                  <button onClick={() => applyAmount(item, '-')}
                          disabled={!!addingId || !addAmounts[item.id]}
                          title="Retirer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                          style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.3)' }}>
                    {addingId === item.id+'-' ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : <MinusCircle className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => applyAmount(item, '+')}
                          disabled={!!addingId || !addAmounts[item.id]}
                          title="Ajouter"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                          style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--positive)', border: '1px solid rgba(74,222,128,0.3)' }}>
                    {addingId === item.id+'+' ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Historique 3 mouvements */}
              <MovementHistory movements={item.movements} />
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['','Objectif','Catégorie','Mensuel','Objectif total','Acquis','Progression',''].map((h,i) => (
                  <th key={i} className="text-left pb-3 pr-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const pct = item.target_amount > 0 ? Math.min((item.current_amount/item.target_amount)*100,100) : 0;
                return (
                  <tr key={item.id} className="group"
                      draggable onDragStart={() => setDragId(item.id)}
                      onDragOver={e => { e.preventDefault(); setDragOverId(item.id); }}
                      onDragLeave={() => setDragOverId(null)} onDrop={() => handleDrop(item.id)}
                      style={{ borderBottom: '1px solid var(--border)', opacity: dragId===item.id?0.4:1, background: dragOverId===item.id?'var(--surface2)':'transparent', cursor:'grab' }}>
                    <td className="py-3 pr-2 w-6"><GripVertical className="w-3.5 h-3.5 opacity-20 group-hover:opacity-60" style={{color:'var(--text-muted)'}} /></td>
                    <td className="py-3 pr-4 font-medium" style={{color:'var(--text)'}}>{item.name}</td>
                    <td className="py-3 pr-4"><CategoryBadge name={item.category} /></td>
                    <td className="py-3 pr-4 font-display font-semibold" style={{color:'var(--accent)'}}>
                      {parseFloat(item.monthly_amount).toLocaleString('fr-FR',{minimumFractionDigits:2})} €
                    </td>
                    <td className="py-3 pr-4 text-xs" style={{color:'var(--text-muted)'}}>
                      {parseFloat(item.target_amount).toLocaleString('fr-FR',{minimumFractionDigits:2})} €
                    </td>
                    <td className="py-3 pr-4 text-xs font-medium" style={{color:'var(--accent)'}}>
                      {parseFloat(item.current_amount).toLocaleString('fr-FR',{minimumFractionDigits:2})} €
                    </td>
                    <td className="py-3 pr-4 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full" style={{background:'var(--border)'}}>
                          <div className="h-full rounded-full transition-all duration-700"
                               style={{width:`${pct}%`, background: pct>=100?'var(--positive)':pct>=80?'var(--warning)':'var(--accent)'}} />
                        </div>
                        <span className="text-xs font-medium w-8" style={{color:'var(--text-muted)'}}>{Math.round(pct)}%</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(item)} className="btn-ghost p-1.5"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => remove(item.id)} className="btn-danger p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }} title={editing ? "Modifier l'objectif" : "Créer un objectif d'épargne"}>
        <form onSubmit={submit} className="space-y-4">
          <FormGrid>
            <FormField label="Nom de l'objectif" full>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                     placeholder="Ex: Fonds d'urgence" required className="input-field" />
            </FormField>
            <FormField label="Catégorie (libre)">
              <input type="text" value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                     placeholder="Ex: Urgence" list="savings-cat-list" className="input-field" />
              <datalist id="savings-cat-list">{SUGGESTIONS.map(c => <option key={c} value={c}/>)}</datalist>
            </FormField>
            <FormField label="Montant mensuel (€)">
              <input type="number" value={form.monthly_amount} onChange={e => setForm({...form, monthly_amount: e.target.value})}
                     placeholder="0.00" min="0" step="0.01" className="input-field" />
            </FormField>
            <FormField label="Objectif total (€)">
              <input type="number" value={form.target_amount} onChange={e => setForm({...form, target_amount: e.target.value})}
                     placeholder="0.00" min="0" step="0.01" className="input-field" />
            </FormField>
            <FormField label="Montant déjà acquis (€)">
              <input type="number" value={form.current_amount} onChange={e => setForm({...form, current_amount: e.target.value})}
                     placeholder="0.00" min="0" step="0.01" className="input-field" />
            </FormField>
            <FormField label="Notes">
              <input type="text" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                     placeholder="Optionnel..." className="input-field" />
            </FormField>
          </FormGrid>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-ghost flex-1 py-2.5">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-2.5">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block"/> : editing ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
