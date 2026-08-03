import { Link } from 'react-router-dom';
import { Wallet, Users, TrendingUp } from 'lucide-react';

export default function AffiliateWelcome() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">Become a TechGrind Affiliate</h1>
      <p className="text-muted leading-relaxed mb-8">
        Over 40% of young Nigerians are unemployed — many just need a real path into an SME or startup. TechGrind
        gives students hands-on, practical training and pairs them with real startups, so instead of hunting for
        jobs, they become employers. As an affiliate, you help spread that opportunity and get paid for it.
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <div className="card">
          <Wallet className="text-tggreen mb-3" size={22} />
          <p className="font-semibold mb-1">₦1,500 per referral</p>
          <p className="text-muted text-sm">Earn for every student who completes registration using your link.</p>
        </div>
        <div className="card">
          <Users className="text-tggreen mb-3" size={22} />
          <p className="font-semibold mb-1">Your own link</p>
          <p className="text-muted text-sm">techgrind.ng/yourcode — share it anywhere.</p>
        </div>
        <div className="card">
          <TrendingUp className="text-tggreen mb-3" size={22} />
          <p className="font-semibold mb-1">Real impact</p>
          <p className="text-muted text-sm">Help someone become an employer, not a job seeker.</p>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Link to="/affiliate/register" className="btn-primary">Start Affiliate Registration</Link>
        <Link to="/affiliate/login" className="btn-secondary">Log in</Link>
      </div>
    </div>
  );
}
