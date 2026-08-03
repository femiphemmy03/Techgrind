import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { Users, Upload, FileCheck2, BarChart3, Plus, Trash2, Check } from 'lucide-react';
import NotificationsList from '../../components/NotificationsList';

const TABS = ['Students', 'Upload Video', 'Create Assessment', 'Grades'];
const WEEK_OPTIONS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const WEEK_OPTIONS_10 = Array.from({ length: 10 }, (_, i) => i + 1);
const CLASS_OPTIONS = [1, 2, 3];

export default function LecturerDashboard() {
  const [tab, setTab] = useState('Students');
  const [info, setInfo] = useState(null);

  useEffect(() => {
    api.get('/lecturer/dashboard').then(({ data }) => setInfo(data)).catch(() => setInfo(false));
  }, []);

  if (info === false) {
    return <div className="max-w-3xl mx-auto px-5 py-20 text-center text-muted">You haven't been assigned to a track/cohort yet. Contact the admin.</div>;
  }
  if (!info) return <div className="max-w-5xl mx-auto px-5 py-20 text-muted">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <h1 className="font-display text-2xl font-bold mb-1">Lecturer Dashboard</h1>
      <p className="text-muted text-sm mb-8">{info.track.name} · {info.cohort.name} · {info.studentCount} students</p>

      <NotificationsList />

      <div className="flex gap-2 mb-8 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${tab === t ? 'bg-tggreen text-ink font-semibold' : 'bg-surface text-muted'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Students' && <StudentsTab />}
      {tab === 'Upload Video' && <UploadVideoTab />}
      {tab === 'Create Assessment' && <CreateAssessmentTab />}
      {tab === 'Grades' && <GradesTab />}
    </div>
  );
}

function StudentsTab() {
  const [students, setStudents] = useState([]);
  useEffect(() => { api.get('/lecturer/students').then(({ data }) => setStudents(data.students)); }, []);

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted text-left">
          <tr><th className="pb-3">Email</th><th className="pb-3">Username</th><th className="pb-3">Registered</th><th className="pb-3">Startup</th></tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-t border-surfaceborder">
              <td className="py-3">{s.email}</td>
              <td className="py-3">{s.username || '—'}</td>
              <td className="py-3">{s.paid_registration ? '✅' : '⏳'}</td>
              <td className="py-3">{s.paid_startup ? '✅' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!students.length && <p className="text-muted text-sm flex items-center gap-2 mt-2"><Users size={16} /> No students yet.</p>}
    </div>
  );
}

function UploadVideoTab() {
  const [form, setForm] = useState({ week: '', classNumber: '', youtubeUrl: '', title: '' });
  const [existing, setExisting] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const loadExisting = () => api.get('/lecturer/videos').then(({ data }) => setExisting(data.videos));
  useEffect(() => { loadExisting(); }, []);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api.post('/lecturer/videos', form);
      setMsg('Video saved.');
      setForm({ week: '', classNumber: '', youtubeUrl: '', title: '' });
      loadExisting();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-8">
      <div className="card overflow-x-auto">
        <p className="text-xs text-muted mb-3">Already uploaded — only an admin can edit or delete these.</p>
        <table className="w-full text-sm">
          <thead className="text-muted text-left"><tr><th className="pb-2">Week</th><th className="pb-2">Class</th><th className="pb-2">Title</th></tr></thead>
          <tbody>
            {existing.map((v) => (
              <tr key={v.id} className="border-t border-surfaceborder">
                <td className="py-2">{v.week_number}</td>
                <td className="py-2">{v.class_number}</td>
                <td className="py-2">{v.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!existing.length && <p className="text-muted text-sm">Nothing uploaded yet.</p>}
      </div>

      <form onSubmit={submit} className="card max-w-lg space-y-4">
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
        <button type="submit" className="btn-primary inline-flex items-center gap-2"><Upload size={16} /> Save Video</button>
      </form>
    </div>
  );
}

function CreateAssessmentTab() {
  const [week, setWeek] = useState('');
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [questions, setQuestions] = useState([{ questionText: '', options: ['', ''], correctIndex: null }]);
  const [existing, setExisting] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const loadExisting = () => api.get('/lecturer/assessments').then(({ data }) => setExisting(data.assessments));
  useEffect(() => { loadExisting(); }, []);

  const addQuestion = () => setQuestions((q) => [...q, { questionText: '', options: ['', ''], correctIndex: null }]);
  const removeQuestion = (i) => setQuestions((q) => q.filter((_, idx) => idx !== i));
  const updateQ = (i, patch) => setQuestions((q) => q.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  const updateOption = (qi, oi, value) => setQuestions((q) => q.map((item, idx) => idx === qi ? { ...item, options: item.options.map((o, j) => j === oi ? value : o) } : item));
  const addOption = (qi) => setQuestions((q) => q.map((item, idx) => idx === qi ? { ...item, options: [...item.options, ''] } : item));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');

    const missingIndex = questions.findIndex((q) => q.correctIndex === null);
    if (missingIndex !== -1) {
      setError(`Please mark the correct answer for question ${missingIndex + 1}.`);
      return;
    }

    try {
      await api.post('/lecturer/assessments', { week, opensAt, closesAt, questions });
      setMsg('Assessment saved.');
      setWeek(''); setOpensAt(''); setClosesAt('');
      setQuestions([{ questionText: '', options: ['', ''], correctIndex: null }]);
      loadExisting();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-8">
      <div className="card overflow-x-auto">
        <p className="text-xs text-muted mb-3">Already created — only an admin can edit or delete these.</p>
        <table className="w-full text-sm">
          <thead className="text-muted text-left"><tr><th className="pb-2">Week</th><th className="pb-2">Questions</th><th className="pb-2">Opens</th><th className="pb-2">Closes</th></tr></thead>
          <tbody>
            {existing.map((a) => (
              <tr key={a.id} className="border-t border-surfaceborder">
                <td className="py-2">{a.week_number}</td>
                <td className="py-2">{a.question_count}</td>
                <td className="py-2">{new Date(a.opens_at).toLocaleString()}</td>
                <td className="py-2">{new Date(a.closes_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!existing.length && <p className="text-muted text-sm">Nothing created yet.</p>}
      </div>

      <form onSubmit={submit} className="space-y-6">
        <div className="card grid md:grid-cols-3 gap-4">
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

            <p className="text-xs text-muted mb-2">
              {q.correctIndex === null ? '⚠️ Tap the circle next to the correct answer — any option can be correct:' : 'Correct answer marked below:'}
            </p>
            {q.options.map((opt, oi) => (
              <div
                key={oi}
                className={`flex items-center gap-3 mb-2 p-2 rounded-lg border transition-colors ${q.correctIndex === oi ? 'border-tggreen bg-tggreen/10' : 'border-surfaceborder'}`}
              >
                <button
                  type="button"
                  onClick={() => updateQ(qi, { correctIndex: oi })}
                  aria-pressed={q.correctIndex === oi}
                  aria-label={`Mark option ${oi + 1} as the correct answer`}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${q.correctIndex === oi ? 'bg-tggreen border-tggreen' : 'border-surfaceborder hover:border-tggreen/60'}`}
                >
                  {q.correctIndex === oi && <Check size={15} className="text-ink" strokeWidth={3} />}
                </button>
                <input required className="input-field flex-1" value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} placeholder={`Option ${oi + 1}`} />
                {q.correctIndex === oi && <span className="text-xs text-tggreen font-semibold whitespace-nowrap">Correct</span>}
              </div>
            ))}
            <button type="button" onClick={() => addOption(qi)} className="text-sm text-tggreen mt-2">+ Add option</button>
          </div>
        ))}

        <button type="button" onClick={addQuestion} className="btn-secondary inline-flex items-center gap-2"><Plus size={16} /> Add Question</button>

        {msg && <p className="text-tggreen text-sm">{msg}</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div><button type="submit" className="btn-primary inline-flex items-center gap-2"><FileCheck2 size={16} /> Save Assessment</button></div>
      </form>
    </div>
  );
}

function GradesTab() {
  const [week, setWeek] = useState('');
  const [grades, setGrades] = useState([]);

  const fetchGrades = () => api.get('/lecturer/grades', { params: week ? { week } : {} }).then(({ data }) => setGrades(data.grades));
  useEffect(() => { fetchGrades(); }, []);

  return (
    <div>
      <div className="flex gap-3 mb-6">
        <select className="input-field max-w-[180px]" value={week} onChange={(e) => setWeek(e.target.value)}>
          <option value="">All weeks</option>
          {WEEK_OPTIONS_10.map((w) => <option key={w} value={w}>Week {w}</option>)}
        </select>
        <button onClick={fetchGrades} className="btn-secondary inline-flex items-center gap-2 !py-2"><BarChart3 size={16} /> Fetch</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted text-left"><tr><th className="pb-3">Student</th><th className="pb-3">Week</th><th className="pb-3">Score</th></tr></thead>
          <tbody>
            {grades.map((g, i) => (
              <tr key={i} className="border-t border-surfaceborder">
                <td className="py-3">{g.email}</td>
                <td className="py-3">{g.week_number}</td>
                <td className="py-3">{g.score}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!grades.length && <p className="text-muted text-sm">No submissions yet.</p>}
      </div>
    </div>
  );
}
