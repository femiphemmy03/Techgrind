import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, FileCheck2, Award, ExternalLink, Lock } from 'lucide-react';
import { api, getErrorMessage } from '../../services/api';

const TABS = ['Overview', 'Videos', 'Assessments', 'Certificate'];

export default function StudentDashboard() {
  const [tab, setTab] = useState('Overview');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/student/dashboard').then(({ data }) => setDashboard(data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  if (loading) return <div className="max-w-5xl mx-auto px-5 py-20 text-muted">Loading dashboard…</div>;
  if (!dashboard) return null;

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <h1 className="font-display text-2xl font-bold mb-1">
        Welcome, {dashboard.username || dashboard.email.split('@')[0]} 👋
      </h1>
      <p className="text-muted text-sm mb-8">{dashboard.track.name} · {dashboard.cohort.name} · Week {dashboard.currentWeek} of 12</p>

      <div className="flex gap-2 mb-8 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${tab === t ? 'bg-tggreen text-ink font-semibold' : 'bg-surface text-muted'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <Overview dashboard={dashboard} onPaid={load} />}
      {tab === 'Videos' && <Videos />}
      {tab === 'Assessments' && <Assessments />}
      {tab === 'Certificate' && <Certificate />}
    </div>
  );
}

function Overview({ dashboard, onPaid }) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const payStartup = async () => {
    setError('');
    setPaying(true);
    try {
      const { data } = await api.post('/payments/startup');
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(getErrorMessage(err));
      setPaying(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-semibold mb-3">Your Class</h3>
        <p className="text-sm text-tggreen">✅ Registration confirmed</p>
        {dashboard.telegram.general && (
          <a href={dashboard.telegram.general} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2 mt-4 !py-2">
            Join Class Telegram <ExternalLink size={14} />
          </a>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3">Join a Startup — ₦10,000</h3>
        <p className="text-muted text-sm mb-4">
          A commitment fee to confirm your seriousness about joining a real startup team for the program.
        </p>
        {dashboard.paidStartup ? (
          <>
            <p className="text-tggreen text-sm mb-3">✅ You've joined a startup team</p>
            {dashboard.telegram.startup && (
              <a href={dashboard.telegram.startup} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2 !py-2">
                Startup Group Telegram <ExternalLink size={14} />
              </a>
            )}
          </>
        ) : (
          <button onClick={payStartup} disabled={paying} className="btn-primary">
            {paying ? 'Redirecting…' : 'Pay ₦10,000 to Join a Startup'}
          </button>
        )}
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>
    </div>
  );
}

function Videos() {
  const [videos, setVideos] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student/videos').then(({ data }) => setVideos(data.videos)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted">Loading videos…</p>;
  if (!videos.length) return <p className="text-muted">No videos have unlocked yet — check back as the week progresses.</p>;

  const byWeek = videos.reduce((acc, v) => {
    (acc[v.week] = acc[v.week] || []).push(v);
    return acc;
  }, {});

  return (
    <div>
      {active && (
        <div className="mb-8">
          <div className="aspect-video w-full rounded-xl2 overflow-hidden border border-surfaceborder">
            <iframe
              src={active.embedUrl}
              title={active.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <a href={active.watchUrl} target="_blank" rel="noreferrer" className="text-sm text-tggreen mt-2 inline-block">
            Watch on YouTube ↗
          </a>
        </div>
      )}

      {Object.entries(byWeek).map(([week, list]) => (
        <div key={week} className="mb-8">
          <h4 className="font-semibold mb-3 text-sm text-muted">Week {week}</h4>
          <div className="grid sm:grid-cols-3 gap-4">
            {list.map((v) => (
              <button key={v.id} onClick={() => setActive(v)} className="card text-left hover:border-tggreen/50">
                <img src={v.thumbnailUrl} alt={v.title} className="rounded-lg mb-3 aspect-video object-cover" />
                <p className="text-sm font-medium flex items-center gap-2"><PlayCircle size={16} className="text-tggreen shrink-0" /> Class {v.class}</p>
                <p className="text-xs text-muted mt-1">{v.title}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Assessments() {
  const [list, setList] = useState([]);
  const [active, setActive] = useState(null);

  const load = () => api.get('/student/assessments').then(({ data }) => setList(data.assessments));
  useEffect(() => { load(); }, []);

  if (active) return <AssessmentTaker assessmentId={active} onDone={() => { setActive(null); load(); }} />;

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {list.map((a) => (
        <div key={a.id} className="card">
          <p className="font-semibold mb-1 flex items-center gap-2">
            {a.status === 'locked' && <Lock size={14} className="text-muted" />}
            <FileCheck2 size={16} className="text-tggreen" /> Week {a.week} Assessment
          </p>
          <p className="text-xs text-muted mb-3">
            {a.status === 'submitted' && `Score: ${a.score}%`}
            {a.status === 'open' && 'Open now — attempt before it closes'}
            {a.status === 'closed' && 'Window closed'}
            {a.status === 'locked' && 'Not open yet'}
          </p>
          {a.status === 'open' && <button onClick={() => setActive(a.id)} className="btn-primary !py-2">Attempt Now</button>}
        </div>
      ))}
    </div>
  );
}

function AssessmentTaker({ assessmentId, onDone }) {
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get(`/student/assessments/${assessmentId}`).then(({ data }) => setData(data));
  }, [assessmentId]);

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post(`/student/assessments/${assessmentId}/submit`, { answers });
      setResult(data.score);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!data) return <p className="text-muted">Loading assessment…</p>;
  if (data.submitted || result !== null) {
    return (
      <div className="card text-center">
        <p className="font-semibold mb-2">Assessment submitted</p>
        <p className="text-tggreen text-2xl font-bold mb-4">{result !== null ? result : data.score}%</p>
        <button onClick={onDone} className="btn-secondary">Back to assessments</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.questions.map((q, qi) => (
        <div key={q.id} className="card">
          <p className="font-medium mb-4">{qi + 1}. {q.question_text}</p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <label key={oi} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${answers[q.id] === oi ? 'border-tggreen bg-tggreen/10' : 'border-surfaceborder'}`}>
                <input
                  type="radio"
                  name={q.id}
                  checked={answers[q.id] === oi}
                  onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button onClick={submit} disabled={submitting} className="btn-primary">{submitting ? 'Submitting…' : 'Submit Assessment'}</button>
    </div>
  );
}

function Certificate() {
  const [elig, setElig] = useState(null);
  const [fullName, setFullName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/student/certificate/eligibility').then(({ data }) => setElig(data));
  }, []);

  const download = async () => {
    setError('');
    setDownloading(true);
    try {
      const res = await api.post('/student/certificate', { fullName }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'techgrind-certificate.pdf';
      a.click();
      setShowModal(false);
    } catch (err) {
      setError('Could not generate certificate. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (!elig) return <p className="text-muted">Checking eligibility…</p>;

  return (
    <div className="card max-w-md">
      <Award className="text-tgamber mb-3" size={28} />
      <h3 className="font-semibold mb-2">Certificate of Completion</h3>
      <p className="text-muted text-sm mb-4">
        Attempted: {elig.attempted}/10 · Average: {elig.average}% (need ≥75%)
      </p>
      {elig.eligible ? (
        <button onClick={() => setShowModal(true)} className="btn-primary">Download Certificate</button>
      ) : (
        <p className="text-tgamber text-sm">Complete all 10 weekly assessments with an average of 75%+ to unlock.</p>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-5">
          <div className="card max-w-sm w-full">
            <h4 className="font-semibold mb-4">Enter your full name</h4>
            <input className="input-field mb-4" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="As it should appear on the certificate" />
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={download} disabled={downloading || fullName.trim().length < 3} className="btn-primary flex-1">
                {downloading ? 'Generating…' : 'Download'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
