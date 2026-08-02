import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, getErrorMessage } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      navigate('/reset-password', { state: { email } });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-5 py-24">
      <h1 className="font-display text-3xl font-bold mb-3">Forgot password</h1>
      <p className="text-muted text-sm mb-8">Enter the email on your account and we'll send a reset code.</p>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label">Email</label>
          <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Sending…' : 'Send reset code'}</button>
      </form>
      <p className="text-sm text-muted mt-6 text-center"><Link to="/login" className="hover:text-tggreen">Back to login</Link></p>
    </div>
  );
}
