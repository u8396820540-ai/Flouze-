import { useState } from 'react';
import { Plus, Pencil, Trash2, TrendingUp, GripVertical } from 'lucide-react';
import { incomeAPI } from '../../services/api';
import { Modal, CategoryBadge, EmptyState, FormGrid, FormField } from '../UI';

const SUGGESTIONS = ['Salaire', 'Freelance', 'Prime', 'Aides', 'Loyer perçu', 'Dividendes', 'Autres'];

export default function IncomeSection({ data, month, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ source: '', category: 'Salaire', amount: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  const [loading, setLoading] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const resetForm = () => { setForm({ source: '', category: 'Salaire', amount: '', date: new Date().toISOString().slice(0, 10), notes: '' }); setEditing(null); };

  const openEdit = (item) => {
    setEditing(item);
    setForm({ source: item.source, category: item.category, amount: item.amount, date: item.date, notes: item.notes || '' });
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount), month };
      if (editing) await incomeAPI.update(editing.id, payload);
      else await incomeAPI.create(payload);
      onRefresh(); setShowForm(false); resetForm();
    } finally { setLoading(false); }
  };

  const remove = async (id) => {
    if (!confirm('Supprimer ce revenu ?')) return;
    await incomeAPI.delete(id); onRefresh();
  };

  const handleDrop = async (targetId) => {
    if (!dragId || dragId === targetId) return;
    const items = [...(data?.items || [])];
    const fromIdx = items.findIndex(i => i.id === dragId);
    const toIdx   = items.findIndex(i => i.id === targetId);
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    setDragId(null); setDragOverId(null);
    await incomeAPI.reorder(items.map((item, idx) => ({ id: item.id, sort_order: idx })));
    onRefresh();
  };

  return (
    <div className="card animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.15)' }}>
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--positive)' }} />
          </div>
          <div>
            <h2 className="font-display font-semibold" style={{ color: 'var(--text)' }}>Revenus</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Total : <span className="font-semibold font-display" style={{ color: 'var(--positive)' }}>
                +{(data?.total || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </p>
          </div>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Ajouter
        </button>
      </div>

      {!data?.items?.length ? (
        <EmptyState icon={TrendingUp} text="Aucun revenu ce mois-ci"
          action={<button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-xs px-3 py-1.5">+ Ajouter un revenu</button>} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['', 'Source', 'Catégorie', 'Montant', 'Date', 'Notes', ''].map((h, i) => (
                  <th key={i} className="text-left pb-3 pr-4 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className="group"
                    draggable
                    onDragStart={() => setDragId(item.id)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id); }}
                    onDragLeave={() => setDragOverId(null)}
                    onDrop={() => handleDrop(item.id)}
                    style={{ borderBottom: '1px solid var(--border)', opacity: dragId === item.id ? 0.4 : 1, background: dragOverId === item.id ? 'var(--surface2)' : 'transparent', cursor: 'grab' }}>
                  <td className="py-3 pr-2 w-6"><GripVertical className="w-3.5 h-3.5 opacity-20 group-hover:opacity-60" style={{ color: 'var(--text-muted)' }} /></td>
                  <td className="py-3 pr-4 font-medium" style={{ color: 'var(--text)' }}>{item.source}</td>
                  <td className="py-3 pr-4"><CategoryBadge name={item.category} /></td>
                  <td className="py-3 pr-4">
                    <span className="font-display font-semibold" style={{ color: item.amount > 0 ? 'var(--positive)' : 'var(--text-muted)' }}>
                      {item.amount > 0 ? '+' : ''}{parseFloat(item.amount).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(item.date).toLocaleDateString('fr-FR')}</td>
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

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }} title={editing ? 'Modifier le revenu' : 'Ajouter un revenu'}>
        <form onSubmit={submit} className="space-y-4">
          <FormGrid>
            <FormField label="Source du revenu" full>
              <input type="text" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                     placeholder="Ex: Salaire Entreprise X" required className="input-field" />
            </FormField>
            <FormField label="Catégorie (libre)">
              <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                     placeholder="Ex: Salaire" list="income-cat-list" className="input-field" />
              <datalist id="income-cat-list">{SUGGESTIONS.map(c => <option key={c} value={c} />)}</datalist>
            </FormField>
            <FormField label="Montant (€)">
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                     placeholder="0.00" min="0" step="0.01" required className="input-field" />
            </FormField>
            <FormField label="Date">
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required className="input-field" />
            </FormField>
            <FormField label="Notes" full>
              <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optionnel..." className="input-field" />
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
