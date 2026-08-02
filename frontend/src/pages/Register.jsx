import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api, getErrorMessage } from '../services/api';

export default function Register() {
  const { referralCode: routeRef } = useParams();
  const [searchParams] = useSearchParams();

  const [tracks, setTracks] = useState([]);
  const [form, setForm] = useState({
    email: '',
    username: '',
    trackSlug: '',
    referralCode: routeRef || searchParams.get('ref') || '',
    password: '',
    confirmPassword: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/public/tracks').then(({ data }) => setTracks(data.tracks));
  }, []);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!agreed) return setError('Please accept the Privacy Policy and Terms of Service.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register/student', form);
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError('Could not start payment. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-5 py-16">
      <h1 className="font-display text-3xl font-bold mb-2">Register for TechGrind</h1>
      <p className="text-muted text-sm mb-8">
        Learning is free — the <strong className="text-offwhite">₦6,500 commitment fee</strong> below simply keeps
        every student accountable to finish the full 12 weeks. Your account is created the moment payment succeeds.
      </p>

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label">Email address *</label>
          <input type="email" required className="input-field" value={form.email} onChange={update('email')} placeholder="you@example.com" />
          <p className="text-xs text-muted mt-1">We don't verify emails, so please use one you actually check — it's the only way we can help you recover your account.</p>
        </div>

        <div>
          <label className="label">Username (optional)</label>
          <input className="input-field" value={form.username} onChange={update('username')} placeholder="How should we greet you?" />
        </div>

        <div>
          <label className="label">Track *</label>
          <select required className="input-field" value={form.trackSlug} onChange={update('trackSlug')}>
            <option value="">Select a track</option>
            {tracks.map((t) => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Referral code (optional)</label>
          <input className="input-field" value={form.referralCode} onChange={update('referralCode')} placeholder="e.g. adelove" />
        </div>

        <div>
          <label className="label">Password *</label>
          <input type="password" required className="input-field" value={form.password} onChange={update('password')} />
        </div>
        <div>
          <label className="label">Confirm password *</label>
          <input type="password" required className="input-field" value={form.confirmPassword} onChange={update('confirmPassword')} />
        </div>

        <label className="flex items-start gap-3 text-xs text-muted">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
          <span>
            I agree to the <Link to="/privacy-policy" className="text-tggreen underline">Privacy Policy</Link> and{' '}
            <Link to="/terms-of-service" className="text-tggreen underline">Terms of Service</Link>.
          </span>
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Processing…' : 'Continue to Payment — ₦6,500'}
        </button>
      </form>

      <p className="text-sm text-muted mt-6 text-center">
        Already have an account? <Link to="/login" className="text-tggreen">Log in</Link>
      </p>
    </div>
  );
}
