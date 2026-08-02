import { useState } from 'react';
import { Phone, Mail } from 'lucide-react';
import { api, getErrorMessage } from '../services/api';
import WhatsAppWidget from '../components/WhatsAppWidget';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', body: '' });
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const email = import.meta.env.VITE_CONTACT_EMAIL || 'techgrindng@gmail.com';
  const phone = import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER || '+2348055488895';

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/public/contact', form);
      setStatus('sent');
      setForm({ name: '', email: '', subject: '', body: '' });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <h1 className="font-display text-3xl font-bold mb-2">Contact Us</h1>
      <p className="text-muted mb-10">All student support happens in the Telegram community, but for anything else, reach us here.</p>

      <div className="grid md:grid-cols-2 gap-4 mb-10">
        <a href={`mailto:${email}`} className="card flex items-center gap-3 hover:border-tggreen/50">
          <Mail className="text-tggreen" /> <span className="text-sm">{email}</span>
        </a>
        <a href={`tel:${phone}`} className="card flex items-center gap-3 hover:border-tggreen/50">
          <Phone className="text-tggreen" /> <span className="text-sm">{phone} (Call or WhatsApp)</span>
        </a>
      </div>

      {status === 'sent' ? (
        <div className="card text-center">
          <p className="font-semibold">Message sent — we'll get back to you shortly.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5 card">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="label">Name</label>
              <input required className="input-field" value={form.name} onChange={update('name')} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" required className="input-field" value={form.email} onChange={update('email')} />
            </div>
          </div>
          <div>
            <label className="label">Subject</label>
            <input required className="input-field" value={form.subject} onChange={update('subject')} />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea required rows={5} className="input-field" value={form.body} onChange={update('body')} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Sending…' : 'Send message'}</button>
        </form>
      )}

      <WhatsAppWidget />
    </div>
  );
}
