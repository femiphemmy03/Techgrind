import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { api, getErrorMessage } from '../services/api';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const verify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { email, code });
      setResetToken(data.resetToken);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { resetToken, newPassword, confirmPassword });
      setDone(true);
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-bold mb-2">Password reset ✅</h1>
        <p className="text-muted">Redirecting you to log in…</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-5 py-24">
      <h1 className="font-display text-3xl font-bold mb-8">Reset password</h1>

      {!resetToken ? (
        <form onSubmit={verify} className="space-y-5">
          <div>
            <label className="label">Email</label>
            <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Reset code</label>
            <input required className="input-field" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code from your email" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Verifying…' : 'Verify code'}</button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-5">
          <div>
            <label className="label">New password</label>
            <input type="password" required className="input-field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input type="password" required className="input-field" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving…' : 'Set new password'}</button>
        </form>
      )}

      <p className="text-sm text-muted mt-6 text-center"><Link to="/login" className="hover:text-tggreen">Back to login</Link></p>
    </div>
  );
}
