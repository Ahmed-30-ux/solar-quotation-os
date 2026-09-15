import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/icons';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', companyName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(form);
      } else {
        await login(form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: 'zap', text: 'Instant solar quotations in seconds' },
    { icon: 'users', text: 'Track every lead through your pipeline' },
    { icon: 'trendUp', text: 'Live pricing, margins and profitability' },
  ];

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Brand panel */}
      <div className="hidden lg:flex w-[46%] flex-col justify-between bg-ink-900 text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-transparent to-orange-600/10" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Icon name="sun" size={24} strokeWidth={2} />
          </div>
          <span className="text-lg font-bold tracking-tight">Solar Quotation OS</span>
        </div>

        <div className="relative">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Quote faster.
            <br />
            Win more deals.
          </h1>
          <p className="mt-4 text-slate-300 text-[15px] leading-relaxed max-w-md">
            The sales operating system built for solar companies. Generate professional
            quotations, manage leads and follow up automatically — all in one place.
          </p>
          <ul className="mt-8 space-y-3">
            {features.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-sm text-slate-200">
                <span className="icon-tile w-8 h-8 rounded-lg bg-white/10 text-amber-400">
                  <Icon name={f.icon} size={16} />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} Solar Quotation OS</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                <Icon name="sun" size={22} strokeWidth={2} />
              </div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">Solar Quotation OS</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {isRegister ? 'Create your company account' : 'Welcome back'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 mb-7">
            {isRegister ? 'Start quoting in under two minutes.' : 'Sign in to your workspace.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-rose-50 text-rose-700 text-sm px-4 py-3 rounded-xl border border-rose-100">
                <Icon name="alert" size={16} className="shrink-0" />
                {error}
              </div>
            )}

            {isRegister && (
              <>
                <div>
                  <label className="label">Company Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Your Solar Company"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Your Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-brand w-full py-3">
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Please wait...
                </>
              ) : isRegister ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>

            <p className="text-center text-sm text-slate-500 pt-1">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-amber-600 hover:text-amber-700 font-semibold"
              >
                {isRegister ? 'Sign In' : 'Register'}
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}