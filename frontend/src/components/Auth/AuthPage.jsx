import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TrendingUp, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2444 50%, #0a1628 100%)' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full"
               style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />
          <div className="absolute bottom-40 right-10 w-96 h-96 rounded-full"
               style={{ background: 'radial-gradient(circle, #4ade80, transparent)' }} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                 style={{ background: 'rgba(96, 165, 250, 0.2)', border: '1px solid rgba(96, 165, 250, 0.3)' }}>
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-2xl font-display font-bold text-white">Flouze</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-5xl font-display font-bold text-white leading-tight">
              Prenez le<br />
              <span style={{ color: '#4ade80' }}>contrôle</span><br />
              de votre argent
            </h1>
            <p className="mt-4 text-blue-200 text-lg leading-relaxed">
              Revenus, charges, épargne, dépenses — tout en un seul endroit. Simple, clair, efficace.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Revenus', value: '+3 800 €', color: '#4ade80' },
              { label: 'Charges', value: '−1 250 €', color: '#fb923c' },
              { label: 'Épargne', value: '−400 €', color: '#60a5fa' },
              { label: 'Disponible', value: '2 150 €', color: '#ffffff' },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-3"
                   style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="text-xs text-blue-300">{item.label}</div>
                <div className="text-lg font-bold font-display" style={{ color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-blue-400 text-sm">Gratuit · Sécurisé · Vos données vous appartiennent</p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                 style={{ background: 'var(--accent)', opacity: 0.9 }}>
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-display font-bold" style={{ color: 'var(--text)' }}>Flouze</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-display font-bold" style={{ color: 'var(--text)' }}>
              {mode === 'login' ? 'Bon retour 👋' : 'Commençons 🚀'}
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              {mode === 'login'
                ? 'Connectez-vous à votre espace budget'
                : 'Créez votre compte en quelques secondes'}
            </p>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm animate-slide-up"
                 style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handle} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Prénom
                </label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Thomas" required
                  className="input-field"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="thomas@example.com" required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={6}
                  className="input-field pr-10"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--text-muted)' }}>
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
                    className="w-full btn-primary flex items-center justify-center gap-2 py-3 mt-2">
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                    className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {mode === 'login' ? (
                <>Pas encore de compte ?{' '}
                  <span style={{ color: 'var(--accent)' }} className="font-medium hover:underline cursor-pointer">
                    S'inscrire gratuitement
                  </span>
                </>
              ) : (
                <>Déjà un compte ?{' '}
                  <span style={{ color: 'var(--accent)' }} className="font-medium hover:underline cursor-pointer">
                    Se connecter
                  </span>
                </>
              )}
            </button>
          </div>

          {mode === 'register' && (
            <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-xl"
                 style={{ background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
              <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--positive)' }} />
              <p className="text-xs" style={{ color: 'var(--positive)' }}>
                100% gratuit. Vos données restent sur votre serveur et ne sont jamais partagées.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
