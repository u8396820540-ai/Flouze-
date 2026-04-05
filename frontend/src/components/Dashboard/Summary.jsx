import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, Shield, PiggyBank, Receipt, Wallet, Smile, CalendarDays } from 'lucide-react';

const COLORS = ['#4ade80','#60a5fa','#fb923c','#f87171','#a78bfa','#fbbf24','#34d399','#f472b6','#818cf8','#38bdf8'];
const fmt      = (n) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const fmtShort = (n) => (n >= 0 ? '+' : '') + n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

function BigCard({ icon: Icon, label, value, color, sublabel, note }) {
  return (
    <div className="card flex items-center gap-4" style={{ border: `1px solid ${color}33`, background: `${color}08` }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color+'22' }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="font-display font-bold text-2xl leading-tight" style={{ color }}>{value}</p>
        {sublabel && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sublabel}</p>}
        {note    && <p className="text-xs mt-0.5 font-medium" style={{ color: color+'cc' }}>{note}</p>}
      </div>
    </div>
  );
}

function SmallCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color+'22' }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="font-display font-bold text-lg leading-tight" style={{ color }}>{value}</p>
        {sub && <p className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardSummary({ income, fixed, savings, variable, history, month, onMonthChange }) {
  // Menu déroulant : 24 derniers mois
  const availableMonths = Array.from({ length: 24 }, (_, i) => {
    const d = new Date((month || new Date().toISOString().slice(0,7)) + '-01');
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });
  const monthName = (m) => new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const totalIncome    = income?.total    || 0;
  const totalFixed     = fixed?.total     || 0;
  const totalFixedPaid = fixed?.totalPaid || 0;
  const totalAcquired  = savings?.totalAcquired  || 0;
  const totalDeposited = savings?.totalDeposited || 0;
  const totalWithdrawn = savings?.totalWithdrawn || 0;
  const totalVariable  = variable?.total  || 0;

  // 🏦 Solde du compte
  const soldeCompte      = totalIncome - totalDeposited + totalWithdrawn - totalVariable;
  const chargesRestantes = totalFixed - totalFixedPaid;
  // 🎉 Pour kiffer
  const pourKiffer       = soldeCompte - chargesRestantes;

  // ── Calcul automatique jours restants dans le mois ──
  const today       = new Date();
  const lastDay     = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const joursRestants = lastDay - today.getDate() + 1; // inclut aujourd'hui
  const semainesRestantes = joursRestants / 7;

  const parJour    = joursRestants   > 0 ? pourKiffer / joursRestants   : 0;
  const parSemaine = semainesRestantes > 0 ? pourKiffer / semainesRestantes : 0;

  const periodColor = pourKiffer >= 0 ? 'var(--accent)' : 'var(--danger)';
  const soldeColor  = soldeCompte  >= 0 ? 'var(--positive)' : 'var(--danger)';
  const kifColor    = pourKiffer   >= 0 ? '#f59e0b'         : 'var(--danger)';

  const pieData = Object.entries(variable?.byCategory || {})
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));

  const barData = (history || []).slice(0, 6).reverse().map(h => ({
    month: h.month.slice(0, 7),
    Dépenses: parseFloat(h.total.toFixed(2))
  }));

  return (
    <div className="space-y-5">

      {/* ── SÉLECTEUR DE MOIS ── */}
      {onMonthChange && (
        <div className="flex items-center gap-3">
          <CalendarDays className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          <select
            value={month}
            onChange={e => onMonthChange(e.target.value)}
            className="input-field text-sm py-2 px-3 capitalize"
            style={{ minWidth: '180px' }}>
            {availableMonths.map(m => (
              <option key={m} value={m}>{monthName(m)}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── 2 GROS BLOCS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BigCard
          icon={Wallet} label="Solde du compte"
          value={`${soldeCompte >= 0 ? '+' : ''}${fmt(soldeCompte)}`}
          color={soldeColor}
          sublabel="Revenus − Épargne versée − Dépenses"
          note={soldeCompte < 0 ? '⚠️ Attention, solde négatif !' : undefined}
        />
        <BigCard
          icon={Smile} label="Pour kiffer 🎉"
          value={`${pourKiffer >= 0 ? '+' : ''}${fmt(pourKiffer)}`}
          color={kifColor}
          sublabel="Solde du compte − Charges encore à passer"
          note={chargesRestantes > 0
            ? `⏳ ${fmt(chargesRestantes)} de charges encore à passer`
            : '✅ Toutes les charges sont passées'}
        />
      </div>

      {/* ── BUDGET RESTANT JUSQU'À FIN DU MOIS ── */}
      <div className="card" style={{ border: `1px solid ${periodColor}33`, background: `${periodColor}08` }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: periodColor+'22' }}>
            <CalendarDays className="w-4 h-4" style={{ color: periodColor }} />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Budget restant jusqu'à fin du mois</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
              Aujourd'hui le {today.getDate()} · {joursRestants} jour{joursRestants > 1 ? 's' : ''} restant{joursRestants > 1 ? 's' : ''} (dont aujourd'hui)
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Par jour',    value: parJour,    sub: `sur ${joursRestants} jours` },
            { label: 'Par semaine', value: parSemaine, sub: `${semainesRestantes.toFixed(1)} semaines` },
            { label: 'Total mois',  value: pourKiffer, sub: 'pour kiffer' },
          ].map(({ label, value, sub }) => {
            const c = value >= 0 ? periodColor : 'var(--danger)';
            return (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="font-display font-bold text-lg leading-tight" style={{ color: c }}>{fmtShort(value)}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>{sub}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4 PETITS BLOCS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SmallCard icon={TrendingUp} label="Revenus"            value={`+${fmt(totalIncome)}`}   color="var(--positive)" />
        <SmallCard icon={Shield}     label="Charges fixes"      value={`−${fmt(totalFixedPaid)}`}
                   sub={chargesRestantes > 0 ? `${fmt(chargesRestantes)} restantes` : '✅ Tout passé'}
                   color="var(--warning)" />
        <SmallCard icon={PiggyBank}  label="Épargne acquise"    value={fmt(totalAcquired)}
                   sub={totalDeposited > 0 ? `+${fmt(totalDeposited)} ce mois` : undefined}
                   color="var(--accent)" />
        <SmallCard icon={Receipt}    label="Dépenses variables" value={`−${fmt(totalVariable)}`} color="var(--danger)" />
      </div>

      {/* ── CHARTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pieData.length > 0 && (
          <div className="card">
            <h3 className="font-display font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Dépenses par catégorie</h3>
            {/* Camembert */}
            <div className="flex items-center gap-4 mb-4">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v.toLocaleString('fr-FR',{minimumFractionDigits:2})} €`,'']}
                           contentStyle={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'12px', fontSize:'12px', color:'var(--text)' }}
                           itemStyle={{ color:'var(--text)' }}
                           labelStyle={{ color:'var(--text)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 min-w-[90px]">
                {pieData.slice(0,6).map((d,i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i%COLORS.length] }} />
                    <span className="truncate" style={{ color:'var(--text-muted)' }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Liste détaillée par catégorie */}
            <div className="space-y-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              {pieData.map((d, i) => {
                const pct = totalVariable > 0 ? (d.value / totalVariable) * 100 : 0;
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{Math.round(pct)}%</span>
                        <span className="font-display font-semibold text-xs" style={{ color: 'var(--danger)' }}>
                          −{d.value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Total</span>
                <span className="font-display font-semibold text-xs" style={{ color: 'var(--danger)' }}>
                  −{totalVariable.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </span>
              </div>
            </div>
          </div>
        )}
        {barData.length > 1 && (
          <div className="card">
            <h3 className="font-display font-semibold text-sm mb-4" style={{ color:'var(--text)' }}>Historique mensuel</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={barData} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize:10, fill:'var(--text-muted)' }} />
                <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'12px', fontSize:'12px', color:'var(--text)' }}
                         itemStyle={{ color:'var(--text)' }} labelStyle={{ color:'var(--text)' }} />
                <Bar dataKey="Dépenses" fill="var(--accent)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
