import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Trophy, Laptop, Globe, Users, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import CountdownTimer from '../components/CountdownTimer';

const TRACK_ICONS = ['💼', '💻', '📱', '📊', '📣', '🎨', '🔐', '🤖'];

export default function Landing() {
  const [cohortData, setCohortData] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/public/cohort'), api.get('/public/tracks')])
      .then(([c, t]) => {
        setCohortData(c.data);
        setTracks(t.data.tracks);
      })
      .finally(() => setLoading(false));
  }, []);

  const phase = cohortData?.phase;
  const cohort = cohortData?.cohort;

  return (
    <div>
      {/* HERO */}
      <section className="max-w-6xl mx-auto px-5 pt-16 pb-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <span className="inline-block bg-tggreen/10 text-tggreen text-xs font-semibold px-3 py-1 rounded-full mb-5">
            12-Week Hands-On Cohort
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold leading-tight">
            Learn the skill. <span className="text-tggreen">Join a startup.</span> Become the employer.
          </h1>
          <p className="text-muted mt-5 text-lg leading-relaxed">
            TechGrind is a real, practical, hands-on tech cohort — 1 week introduction, 10 weeks of learning,
            1 week final assessment and capstone. Graduate paired with a real startup, not a job application.
          </p>

          {!loading && phase === 'registration_open' && cohort && (
            <div className="mt-8">
              <p className="text-sm text-muted mb-2">
                <strong className="text-offwhite">{cohort.name}</strong> starts {new Date(cohort.start_date).toLocaleDateString('en-NG', { dateStyle: 'long' })} · Registration ends {new Date(cohort.registration_end_date).toLocaleDateString('en-NG', { dateStyle: 'long' })}
              </p>
              <CountdownTimer target={cohort.registration_end_date} />
              <Link to="/register" className="btn-primary inline-block mt-6">Register Now!</Link>
            </div>
          )}

          {!loading && (phase === 'in_progress' || phase === 'waitlist' || phase === 'none') && (
            <div className="mt-8 card max-w-md">
              <p className="text-offwhite font-semibold mb-2">Classes are currently in session.</p>
              <p className="text-muted text-sm mb-4">
                You've just missed this cohort's registration window. Check back for the next cohort's dates,
                or register now to be ready the moment enrollment reopens.
              </p>
              <Link to="/waitlist" className="btn-secondary inline-block">See Next Cohort Info</Link>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Trophy className="text-tgamber" size={20} /> What's at stake
          </h3>
          <ul className="space-y-3 text-sm text-muted">
            <li className="flex gap-3"><Rocket className="text-tggreen shrink-0" size={18} /> Get paired with a real startup and build production experience</li>
            <li className="flex gap-3"><Trophy className="text-tgamber shrink-0" size={18} /> Best teams win up to <strong className="text-offwhite">₦5,000,000</strong> plus more prizes</li>
            <li className="flex gap-3"><Globe className="text-tggreen shrink-0" size={18} /> Free domain + hosting for high-ranking teams</li>
            <li className="flex gap-3"><Laptop className="text-tgamber shrink-0" size={18} /> Laptops for best students</li>
          </ul>
        </div>
      </section>

      {/* TRACKS */}
      <section id="tracks" className="max-w-6xl mx-auto px-5 py-16">
        <h2 className="font-display text-3xl font-bold mb-2">Choose your track</h2>
        <p className="text-muted mb-10">Eight in-demand tracks. Pick one and go deep for 12 weeks.</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {tracks.map((t, i) => (
            <div key={t.slug} className="card hover:border-tggreen/50 transition-colors">
              <div className="text-2xl mb-3">{TRACK_ICONS[i % TRACK_ICONS.length]}</div>
              <p className="font-semibold text-sm">{t.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY TECHGRIND WORKS */}
      <section id="prizes" className="max-w-6xl mx-auto px-5 py-16 grid md:grid-cols-3 gap-6">
        <div className="card">
          <TrendingUp className="text-tggreen mb-3" size={22} />
          <h3 className="font-semibold mb-2">Real startup pairing</h3>
          <p className="text-muted text-sm">Not a certificate mill. You join an actual startup team and ship real work during the program.</p>
        </div>
        <div className="card">
          <Users className="text-tggreen mb-3" size={22} />
          <h3 className="font-semibold mb-2">Commitment-based cohort</h3>
          <p className="text-muted text-sm">Learning itself is free. A small commitment fee keeps everyone accountable to finish what they start.</p>
        </div>
        <div className="card">
          <Trophy className="text-tgamber mb-3" size={22} />
          <h3 className="font-semibold mb-2">Prizes that matter</h3>
          <p className="text-muted text-sm">₦5,000,000 in startup funding, free domains and hosting, and laptops for standout students.</p>
        </div>
      </section>

      {/* AFFILIATE CTA */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="card md:flex items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-xl font-bold mb-2">Earn ₦1,500 per referral</h3>
            <p className="text-muted text-sm max-w-xl">
              With over 40% youth unemployment in Nigeria, TechGrind turns job seekers into employers. Become an
              affiliate marketer, share your link, and get paid for every student who joins.
            </p>
          </div>
          <Link to="/affiliate" className="btn-secondary inline-block mt-6 md:mt-0 shrink-0">Become an Affiliate</Link>
        </div>
      </section>
    </div>
  );
}
