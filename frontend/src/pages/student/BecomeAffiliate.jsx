import { useState } from 'react';
import { Wallet, Users, TrendingUp } from 'lucide-react';
import { api, getErrorMessage } from '../../services/api';

// Same intro content/offer as the standalone affiliate landing page (/affiliate), reused here so
// a student sees the same pitch — but opted in on their existing account, no second login.
export default function BecomeAffiliate({ onDone }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!code.trim()) { setError('Please choose a referral code.'); return; }
    setLoading(true);
    try {
      await api.post('/student/become-affiliate', { referralCode: code });
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-2xl font-bold mb-3">Become a TechGrind Affiliate</h2>
      <p className="text-muted leading-relaxed mb-8">
        Over 40% of young Nigerians are unemployed - many just need a real path into an SME or startup. TechGrind
        gives students hands-on, practical training and pairs them with real startups. As an affiliate, you help
        spread that opportunity and get paid for it — right from this same account, no separate sign-up.
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <Wallet className="text-tggreen mb-3" size={22} />
          <p className="font-semibold mb-1">₦1,500 per referral</p>
          <p className="text-muted text-sm">Earn for every student who completes registration using your link.</p>
        </div>
        <div className="card">
          <Users className="text-tggreen mb-3" size={22} />
          <p className="font-semibold mb-1">Your own link</p>
          <p className="text-muted text-sm">techgrind.ng/yourcode - share it anywhere.</p>
        </div>
        <div className="card">
          <TrendingUp className="text-tggreen mb-3" size={22} />
          <p className="font-semibold mb-1">Real impact</p>
          <p className="text-muted text-sm">Help someone become an employer, not a job seeker.</p>
        </div>
      </div>

      <form onSubmit={submit} className="card">
        <label className="block text-sm font-medium mb-2">Choose your referral code</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. your-name"
            className="flex-1 bg-ink border border-surfaceborder rounded-lg px-4 py-2.5 text-sm"
          />
          <button type="submit" disabled={loading} className="btn-primary whitespace-nowrap">
            {loading ? 'Activating…' : 'Become an Affiliate'}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </form>
    </div>
  );
}
