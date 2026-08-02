import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { Users, GraduationCap, Handshake, Wallet, Bell, Upload, ShieldAlert, Pencil, Trash2, Plus, FileCheck2 } from 'lucide-react';

const TABS = ['Overview', 'Cohorts', 'Lecturers', 'Students', 'Affiliates', 'Withdrawals', 'Videos', 'Assessments', 'Notifications'];
const WEEK_OPTIONS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const WEEK_OPTIONS_10 = Array.from({ length: 10 }, (_, i) => i + 1);
const CLASS_OPTIONS = [1, 2, 3];

export default function AdminDashboard() {
  const [tab, setTab] = useState('Overview');

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <h1 className="font-display text-2xl font-bold mb-1 flex items-center gap-2"><ShieldAlert className="text-tgamber" size={22} /> Admin Dashboard</h1>
      <p className="text-muted text-sm mb-8">Full platform control.</p>

      <div className="flex gap-2 mb-8 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${tab === t ? 'bg-tggreen text-ink font-semibold' : 'bg-surface text-muted'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && <Overview />}
      {tab === 'Cohorts' && <Cohorts />}
      {tab === 'Lecturers' && <Lecturers />}
      {tab === 'Students' && <UserList type="students" />}
      {tab === 'Affiliates' && <UserList type="affiliates" />}
      {tab === 'Withdrawals' && <Withdrawals />}
      {tab === 'Videos' && <VideosTab />}
      {tab === 'Assessments' && <AssessmentsTab />}
      {tab === 'Notifications' && <Notifications />}
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/admin/stats').then(({ data }) => setStats(data)); }, []);
  if (!stats) return <p className="text-muted">Loading stats…</p>;

  const cards = [
    { label: 'Total Students', value: stats.totalStudents, icon: GraduationCap },
    { label: 'Total Lecturers', value: stats.totalLecturers, icon: Users },
    { label: 'Total Affiliates', value: stats.totalAffiliates, icon: Handshake },
  ];

  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="card">
            <c.icon className="text-tggreen mb-3" size={20} />
            <p className="text-3xl font-bold">{c.value}</p>
            <p className="text-muted text-sm mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="card mb-6">
        <h3 className="font-semibold mb-4">Students by track</h3>
        <div className="space-y-2">
          {stats.studentsByTrack.map((t) => (
            <div key={t.name} className="flex justify-between text-sm border-b border-surfaceborder pb-2">
              <span className="text-muted">{t.name}</span><span className="font-semibold">{t.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-4">Payments (successful)</h3>
        <div className="space-y-2">
          {stats.payments.map((p) => (
            <div key={p.type} className="flex justify-between text-sm border-b border-surfaceborder pb-2">
              <span className="text-muted capitalize">{p.type} ({p.count})</span><span className="font-semibold">₦{Number(p.total).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Cohorts() {
  const [cohorts, setCohorts] = useState([]);
  const [form, setForm] = useState({ name: '', cohortNumber: '', startDate: '', registrationEndDate: '' });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api.get('/admin/cohorts').then(({ data }) => setCohorts(data.cohorts));
  useEffect(() => { load(); }, []);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api.post('/admin/cohorts', form);
      setMsg('Cohort created and set active.');
      setForm({ name: '', cohortNumber: '', startDate: '', registrationEndDate: '' });
      load();
    } catch (err) { setError(getErrorMessage(err)); }
  };

  const endCohort = async (id) => {
    if (!window.confirm('This permanently deletes ALL student data, videos, and assessments for this cohort. Continue?')) return;
    try {
      await api.post(`/admin/cohorts/${id}/end`, { confirm: true });
      load();
    } catch (err) { setError(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="card grid md:grid-cols-2 gap-4">
        <div><label className="label">Name</label><input required className="input-field" value={form.name} onChange={update('name')} placeholder="Cohort 2.0" /></div>
        <div><label className="label">Number</label><input required type="number" step="0.1" className="input-field" value={form.cohortNumber} onChange={update('cohortNumber')} placeholder="2.0" /></div>
        <div><label className="label">Start date</label><input required type="datetime-local" className="input-field" value={form.startDate} onChange={update('startDate')} /></div>
        <div><label className="label">Registration ends</label><input required type="datetime-local" className="input-field" value={form.registrationEndDate} onChange={update('registrationEndDate')} /></div>
        {error && <p className="text-red-400 text-sm md:col-span-2">{error}</p>}
        {msg && <p className="text-tggreen text-sm md:col-span-2">{msg}</p>}
        <button type="submit" className="btn-primary md:col-span-2">Create & Activate Cohort</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted text-left"><tr><th className="pb-3">Name</th><th className="pb-3">Status</th><th className="pb-3">Starts</th><th className="pb-3">Reg. Ends</th><th className="pb-3">Active</th><th className="pb-3"></th></tr></thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.id} className="border-t border-surfaceborder">
                <td className="py-3">{c.name}</td>
                <td className="py-3 capitalize">{c.status.replace('_', ' ')}</td>
                <td className="py-3">{new Date(c.start_date).toLocaleDateString()}</td>
                <td className="py-3">{new Date(c.registration_end_date).toLocaleDateString()}</td>
                <td className="py-3">{c.is_active ? '✅' : '—'}</td>
                <td className="py-3">{c.status !== 'ended' && <button onClick={() => endCohort(c.id)} className="text-red-400 text-xs">End Cohort</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Lecturers() {
  const [lecturers, setLecturers] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [form, setForm] = useState({ email: '', username: '', password: '', trackId: '', cohortId: '' });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api.get('/admin/lecturers').then(({ data }) => setLecturers(data.lecturers));
  useEffect(() => {
    load();
    api.get('/public/tracks').then(({ data }) => setTracks(data.tracks));
    api.get('/admin/cohorts').then(({ data }) => setCohorts(data.cohorts));
  }, []);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api.post('/admin/lecturers', form);
      setMsg('Lecturer created.');
      setForm({ email: '', username: '', password: '', trackId: '', cohortId: '' });
      load();
    } catch (err) { setError(getErrorMessage(err)); }
  };

  const revoke = async (id, isActive) => {
    await api.patch(`/admin/users/${id}/active`, { isActive: !isActive });
    load();
  };

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="card grid md:grid-cols-2 gap-4">
        <div><label className="label">Email</label><input required type="email" className="input-field" value={form.email} onChange={update('email')} /></div>
        <div><label className="label">Name</label><input className="input-field" value={form.username} onChange={update('username')} /></div>
        <div><label className="label">Password</label><input required type="password" className="input-field" value={form.password} onChange={update('password')} /></div>
        <div><label className="label">Track</label>
          <select required className="input-field" value={form.trackId} onChange={update('trackId')}>
            <option value="">Select track</option>
            {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Cohort</label>
          <select className="input-field" value={form.cohortId} onChange={update('cohortId')}>
            <option value="">Select cohort</option>
            {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {error && <p className="text-red-400 text-sm md:col-span-2">{error}</p>}
        {msg && <p className="text-tggreen text-sm md:col-span-2">{msg}</p>}
        <button type="submit" className="btn-primary md:col-span-2">Create Lecturer</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted text-left"><tr><th className="pb-3">Email</th><th className="pb-3">Track</th><th className="pb-3">Cohort</th><th className="pb-3">Status</th><th className="pb-3"></th></tr></thead>
          <tbody>
            {lecturers.map((l) => (
              <tr key={l.id} className="border-t border-surfaceborder">
                <td className="py-3">{l.email}</td>
                <td className="py-3">{l.track_name || '—'}</td>
                <td className="py-3">{l.cohort_name || '—'}</td>
                <td className="py-3">{l.is_active ? 'Active' : 'Revoked'}</td>
                <td className="py-3"><button onClick={() => revoke(l.id, l.is_active)} className="text-xs text-red-400">{l.is_active ? 'Revoke' : 'Restore'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserList({ type }) {
  const [users, setUsers] = useState([]);
  const load = () => api.get(`/admin/${type}`).then(({ data }) => setUsers(data[type]));
  useEffect(() => { load(); }, [type]);

  const revoke = async (id, isActive) => {
    await api.patch(`/admin/users/${id}/active`, { isActive: !isActive });
    load();
  };

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted text-left">
          <tr>
            <th className="pb-3">Email</th>
            {type === 'students' && <><th className="pb-3">Track</th><th className="pb-3">Cohort</th><th className="pb-3">Reg.</th><th className="pb-3">Startup</th></>}
            {type === 'affiliates' && <><th className="pb-3">Referral Code</th><th className="pb-3">Confirmed</th><th className="pb-3">Withdrawable</th></>}
            <th className="pb-3">Status</th><th className="pb-3"></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-surfaceborder">
              <td className="py-3">{u.email}</td>
              {type === 'students' && <><td className="py-3">{u.track_name}</td><td className="py-3">{u.cohort_name}</td><td className="py-3">{u.paid_registration ? '✅' : '⏳'}</td><td className="py-3">{u.paid_startup ? '✅' : '—'}</td></>}
              {type === 'affiliates' && <><td className="py-3">{u.referral_code}</td><td className="py-3">{u.confirmed_referrals}</td><td className="py-3">{u.withdrawable_count}</td></>}
              <td className="py-3">{u.is_active ? 'Active' : 'Revoked'}</td>
              <td className="py-3"><button onClick={() => revoke(u.id, u.is_active)} className="text-xs text-red-400">{u.is_active ? 'Revoke' : 'Restore'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Withdrawals() {
  const [list, setList] = useState([]);
  const [error, setError] = useState('');
  const load = () => api.get('/admin/withdrawals').then(({ data }) => setList(data.withdrawals));
  useEffect(() => { load(); }, []);

  const decide = async (id, action) => {
    setError('');
    try {
      await api.post(`/admin/withdrawals/${id}/decide`, { action });
      load();
    } catch (err) { setError(getErrorMessage(err)); }
  };

  return (
    <div className="card overflow-x-auto">
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      <table className="w-full text-sm">
        <thead className="text-muted text-left"><tr><th className="pb-3">Affiliate</th><th className="pb-3">Count</th><th className="pb-3">Amount</th><th className="pb-3">Account</th><th className="pb-3">Status</th><th className="pb-3"></th></tr></thead>
        <tbody>
          {list.map((w) => (
            <tr key={w.id} className="border-t border-surfaceborder">
              <td className="py-3">{w.affiliate_email}</td>
              <td className="py-3">{w.count_requested}</td>
              <td className="py-3">₦{Number(w.amount).toLocaleString()}</td>
              <td className="py-3">{w.account_name} · {w.account_number}</td>
              <td className="py-3 capitalize">{w.status}</td>
              <td className="py-3 flex gap-2">
                {w.status === 'pending' && (
                  <>
                    <button onClick={() => decide(w.id, 'approve')} className="text-xs text-tggreen">Approve</button>
                    <button onClick={() => decide(w.id, 'reject')} className="text-xs text-red-400">Reject</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VideosTab() {
  const [tracks, setTracks] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [videos, setVideos] = useState([]);
  const [form, setForm] = useState({ id: null, trackId: '', cohortId: '', week: '', classNumber: '', youtubeUrl: '', title: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const loadVideos = () => api.get('/admin/videos').then(({ data }) => setVideos(data.videos));

  useEffect(() => {
    api.get('/public/tracks').then(({ data }) => setTracks(data.tracks));
    api.get('/admin/cohorts').then(({ data }) => setCohorts(data.cohorts));
    loadVideos();
  }, []);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const resetForm = () => setForm({ id: null, trackId: '', cohortId: '', week: '', classNumber: '', youtubeUrl: '', title: '' });

  const editVideo = (v) => {
    setForm({ id: v.id, trackId: v.track_id, cohortId: v.cohort_id, week: v.week_number, classNumber: v.class_number, youtubeUrl: v.youtube_id, title: v.title });
    setMsg(''); setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteVideo = async (id) => {
    if (!window.confirm('Delete this video?')) return;
    await api.delete(`/admin/videos/${id}`);
    loadVideos();
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api.post('/admin/videos', form);
      setMsg(form.id ? 'Video updated.' : 'Video saved.');
      resetForm();
      loadVideos();
    } catch (err) { setError(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="card max-w-lg space-y-4">
        <p className="text-xs text-muted">{form.id ? 'Editing an existing video' : 'Add a new video'} — only admins can edit or delete existing entries.</p>
        <div><label className="label">Track</label>
          <select required className="input-field" value={form.trackId} onChange={update('trackId')}>
            <option value="">Select track</option>
            {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div><label className="label">Cohort</label>
          <select required className="input-field" value={form.cohortId} onChange={update('cohortId')}>
            <option value="">Select cohort</option>
            {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Week</label>
            <select required className="input-field" value={form.week} onChange={update('week')}>
              <option value="">Select week</option>
              {WEEK_OPTIONS_12.map((w) => <option key={w} value={w}>Week {w}</option>)}
            </select>
          </div>
          <div><label className="label">Class</label>
            <select required className="input-field" value={form.classNumber} onChange={update('classNumber')}>
              <option value="">Select class</option>
              {CLASS_OPTIONS.map((c) => <option key={c} value={c}>Class {c}</option>)}
            </select>
          </div>
        </div>
        <div><label className="label">YouTube URL or ID</label><input required className="input-field" value={form.youtubeUrl} onChange={update('youtubeUrl')} /></div>
        <div><label className="label">Title</label><input required className="input-field" value={form.title} onChange={update('title')} /></div>
        {msg && <p className="text-tggreen text-sm">{msg}</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" className="btn-primary inline-flex items-center gap-2"><Upload size={16} /> {form.id ? 'Update Video' : 'Save Video'}</button>
          {form.id && <button type="button" onClick={resetForm} className="btn-secondary">Cancel Edit</button>}
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted text-left"><tr><th className="pb-3">Track</th><th className="pb-3">Cohort</th><th className="pb-3">Week</th><th className="pb-3">Class</th><th className="pb-3">Title</th><th className="pb-3"></th></tr></thead>
          <tbody>
            {videos.map((v) => (
              <tr key={v.id} className="border-t border-surfaceborder">
                <td className="py-3">{v.track_name}</td>
                <td className="py-3">{v.cohort_name}</td>
                <td className="py-3">{v.week_number}</td>
                <td className="py-3">{v.class_number}</td>
                <td className="py-3">{v.title}</td>
                <td className="py-3 flex gap-3">
                  <button onClick={() => editVideo(v)}><Pencil size={14} className="text-tggreen" /></button>
                  <button onClick={() => deleteVideo(v.id)}><Trash2 size={14} className="text-red-400" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!videos.length && <p className="text-muted text-sm">No videos uploaded yet.</p>}
      </div>
    </div>
  );
}

function AssessmentsTab() {
  const [tracks, setTracks] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [trackId, setTrackId] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [week, setWeek] = useState('');
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [questions, setQuestions] = useState([{ questionText: '', options: ['', ''], correctIndex: 0 }]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const loadList = () => api.get('/admin/assessments').then(({ data }) => setAssessments(data.assessments));

  useEffect(() => {
    api.get('/public/tracks').then(({ data }) => setTracks(data.tracks));
    api.get('/admin/cohorts').then(({ data }) => setCohorts(data.cohorts));
    loadList();
  }, []);

  const resetForm = () => {
    setEditingId(null); setTrackId(''); setCohortId(''); setWeek(''); setOpensAt(''); setClosesAt('');
    setQuestions([{ questionText: '', options: ['', ''], correctIndex: 0 }]);
  };

  const editAssessment = async (a) => {
    const { data } = await api.get(`/admin/assessments/${a.id}`);
    setEditingId(a.id);
    setTrackId(data.assessment.track_id);
    setCohortId(data.assessment.cohort_id);
    setWeek(data.assessment.week_number);
    setOpensAt(data.assessment.opens_at?.slice(0, 16));
    setClosesAt(data.assessment.closes_at?.slice(0, 16));
    setQuestions(data.questions.map((q) => ({ questionText: q.question_text, options: q.options, correctIndex: q.correct_index })));
    setMsg(''); setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteAssessment = async (id) => {
    if (!window.confirm('Delete this assessment and all its questions? Student submissions already recorded are unaffected.')) return;
    await api.delete(`/admin/assessments/${id}`);
    loadList();
  };

  const addQuestion = () => setQuestions((q) => [...q, { questionText: '', options: ['', ''], correctIndex: 0 }]);
  const removeQuestion = (i) => setQuestions((q) => q.filter((_, idx) => idx !== i));
  const updateQ = (i, patch) => setQuestions((q) => q.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  const updateOption = (qi, oi, value) => setQuestions((q) => q.map((item, idx) => idx === qi ? { ...item, options: item.options.map((o, j) => j === oi ? value : o) } : item));
  const addOption = (qi) => setQuestions((q) => q.map((item, idx) => idx === qi ? { ...item, options: [...item.options, ''] } : item));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api.post('/admin/assessments', { trackId, cohortId, week, opensAt, closesAt, questions });
      setMsg(editingId ? 'Assessment updated.' : 'Assessment saved.');
      resetForm();
      loadList();
    } catch (err) { setError(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-6">
        <p className="text-xs text-muted">{editingId ? 'Editing an existing assessment' : 'Create a new assessment'} — only admins can edit or delete existing entries.</p>
        <div className="card grid md:grid-cols-2 gap-4">
          <div><label className="label">Track</label>
            <select required className="input-field" value={trackId} onChange={(e) => setTrackId(e.target.value)}>
              <option value="">Select track</option>
              {tracks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div><label className="label">Cohort</label>
            <select required className="input-field" value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
              <option value="">Select cohort</option>
              {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="label">Week</label>
            <select required className="input-field" value={week} onChange={(e) => setWeek(e.target.value)}>
              <option value="">Select week</option>
              {WEEK_OPTIONS_10.map((w) => <option key={w} value={w}>Week {w}</option>)}
            </select>
          </div>
          <div><label className="label">Opens at</label><input required type="datetime-local" className="input-field" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} /></div>
          <div><label className="label">Closes at</label><input required type="datetime-local" className="input-field" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} /></div>
        </div>

        {questions.map((q, qi) => (
          <div key={qi} className="card">
            <div className="flex justify-between items-start mb-3">
              <label className="label !mb-0">Question {qi + 1}</label>
              {questions.length > 1 && <button type="button" onClick={() => removeQuestion(qi)}><Trash2 size={16} className="text-red-400" /></button>}
            </div>
            <input required className="input-field mb-3" value={q.questionText} onChange={(e) => updateQ(qi, { questionText: e.target.value })} placeholder="Question text" />
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-3 mb-2">
                <input type="radio" checked={q.correctIndex === oi} onChange={() => updateQ(qi, { correctIndex: oi })} />
                <input required className="input-field" value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} placeholder={`Option ${oi + 1}`} />
              </div>
            ))}
            <button type="button" onClick={() => addOption(qi)} className="text-sm text-tggreen mt-2">+ Add option</button>
          </div>
        ))}

        <button type="button" onClick={addQuestion} className="btn-secondary inline-flex items-center gap-2"><Plus size={16} /> Add Question</button>

        {msg && <p className="text-tggreen text-sm">{msg}</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" className="btn-primary inline-flex items-center gap-2"><FileCheck2 size={16} /> {editingId ? 'Update Assessment' : 'Save Assessment'}</button>
          {editingId && <button type="button" onClick={resetForm} className="btn-secondary">Cancel Edit</button>}
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted text-left"><tr><th className="pb-3">Track</th><th className="pb-3">Cohort</th><th className="pb-3">Week</th><th className="pb-3">Questions</th><th className="pb-3"></th></tr></thead>
          <tbody>
            {assessments.map((a) => (
              <tr key={a.id} className="border-t border-surfaceborder">
                <td className="py-3">{a.track_name}</td>
                <td className="py-3">{a.cohort_name}</td>
                <td className="py-3">{a.week_number}</td>
                <td className="py-3">{a.question_count}</td>
                <td className="py-3 flex gap-3">
                  <button onClick={() => editAssessment(a)}><Pencil size={14} className="text-tggreen" /></button>
                  <button onClick={() => deleteAssessment(a.id)}><Trash2 size={14} className="text-red-400" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!assessments.length && <p className="text-muted text-sm">No assessments created yet.</p>}
      </div>
    </div>
  );
}

function Notifications() {
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' });
  const [msg, setMsg] = useState('');
  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/admin/notifications', form);
    setMsg('Notification sent.');
    setForm({ title: '', body: '', audience: 'all' });
  };

  return (
    <form onSubmit={submit} className="card max-w-lg space-y-4">
      <div><label className="label">Title</label><input required className="input-field" value={form.title} onChange={update('title')} /></div>
      <div><label className="label">Message</label><textarea required rows={4} className="input-field" value={form.body} onChange={update('body')} /></div>
      <div><label className="label">Audience</label>
        <select className="input-field" value={form.audience} onChange={update('audience')}>
          <option value="all">Everyone</option>
          <option value="students">Students</option>
          <option value="lecturers">Lecturers</option>
          <option value="affiliates">Affiliates</option>
        </select>
      </div>
      {msg && <p className="text-tggreen text-sm">{msg}</p>}
      <button type="submit" className="btn-primary inline-flex items-center gap-2"><Bell size={16} /> Send Notification</button>
    </form>
  );
}
