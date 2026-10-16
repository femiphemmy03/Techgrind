import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AffiliateRegister() {
  const [form, setForm] = useState({ email: '', referralCode: '', password: '', confirmPassword: '' });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!agreed) return setError('Please accept the Privacy Policy and Terms of Service.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register/affiliate', form);
      login(data.token, data.user);
      navigate('/affiliate/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-5 py-16">
      <h1 className="font-display text-3xl font-bold mb-8">Join the Affiliate Program</h1>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label">Email address *</label>
          <input type="email" required className="input-field" value={form.email} onChange={update('email')} />
        </div>
        <div>
          <label className="label">Preferred referral code *</label>
          <input required className="input-field" value={form.referralCode} onChange={update('referralCode')} placeholder="e.g. adelove" />
          <p className="text-xs text-muted mt-1">Your link will be techgrind.com/{form.referralCode || 'yourcode'}</p>
        </div>
        <div><label className="label">Password *</label><input type="password" required className="input-field" value={form.password} onChange={update('password')} /></div>
        <div><label className="label">Confirm password *</label><input type="password" required className="input-field" value={form.confirmPassword} onChange={update('confirmPassword')} /></div>

        <label className="flex items-start gap-3 text-xs text-muted">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
          <span>
            I agree to the <Link to="/privacy-policy" className="text-tggreen underline">Privacy Policy</Link> and{' '}
            <Link to="/terms-of-service" className="text-tggreen underline">Terms of Service</Link>.
          </span>
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Creating account…' : 'Create Affiliate Account'}</button>
      </form>
      <p className="text-sm text-muted mt-6 text-center">Already registered? <Link to="/affiliate/login" className="text-tggreen">Log in</Link></p>
    </div>
  );
}
