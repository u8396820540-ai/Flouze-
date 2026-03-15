import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Modal
export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  const ref = useRef();

  useEffect(() => {
    if (!isOpen) return;
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    setTimeout(() => document.addEventListener('mousedown', handle), 100);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div ref={ref}
           className={`w-full ${maxWidth} rounded-2xl shadow-2xl animate-slide-up`}
           style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-6 py-4"
             style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-display font-semibold text-base" style={{ color: 'var(--text)' }}>{title}</h3>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// Category badge
export function CategoryBadge({ name, color }) {
  const colors = {
    Salaire: '#4ade80', Freelance: '#60a5fa', Prime: '#fbbf24', Aides: '#a78bfa', Autres: '#94a3b8',
    Logement: '#f87171', Électricité: '#fb923c', Eau: '#38bdf8', Internet: '#818cf8', Téléphone: '#c084fc',
    Assurance: '#f472b6', Crédit: '#ef4444', Transport: '#fbbf24', Abonnements: '#34d399', Impôts: '#94a3b8',
    Urgence: '#f87171', Vacances: '#fbbf24', Voiture: '#60a5fa', Maison: '#4ade80', Projet: '#c084fc',
    Courses: '#4ade80', Restaurant: '#fb923c', Loisirs: '#818cf8', Shopping: '#f472b6', Santé: '#38bdf8',
    Enfants: '#fbbf24', Animaux: '#a78bfa', Cadeaux: '#f87171',
  };
  const bg = color || colors[name] || '#94a3b8';
  return (
    <span className="tag" style={{ background: bg + '22', color: bg, border: `1px solid ${bg}44` }}>
      {name}
    </span>
  );
}

// Amount display
export function Amount({ value, positive = true, size = 'normal' }) {
  const color = positive
    ? 'var(--positive)'
    : value > 0 ? 'var(--danger)' : 'var(--text-muted)';
  const sizeClass = size === 'lg' ? 'text-2xl font-bold' : size === 'xl' ? 'text-3xl font-bold' : 'text-sm font-medium';
  return (
    <span className={`font-display ${sizeClass}`} style={{ color }}>
      {(positive ? '+' : '−')}{Math.abs(value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
    </span>
  );
}

// Progress bar
export function ProgressBar({ current, target, color = 'var(--positive)' }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isWarning = pct >= 80 && pct < 100;
  const isComplete = pct >= 100;
  const barColor = isComplete ? 'var(--positive)' : isWarning ? 'var(--warning)' : color;

  return (
    <div className="space-y-1">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>{current.toLocaleString('fr-FR')} €</span>
        <span className="font-medium" style={{ color: barColor }}>{Math.round(pct)}%</span>
        <span>{target.toLocaleString('fr-FR')} €</span>
      </div>
    </div>
  );
}

// Empty state
export function EmptyState({ icon: Icon, text, action }) {
  return (
    <div className="py-12 flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
           style={{ background: 'var(--surface2)' }}>
        <Icon className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
      </div>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{text}</p>
      {action}
    </div>
  );
}

// Form row
export function FormGrid({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

export function FormField({ label, children, full = false }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  );
}
