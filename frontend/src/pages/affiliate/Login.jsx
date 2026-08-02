import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AffiliateLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.user.role !== 'affiliate') throw new Error('not-affiliate');
      login(data.token, data.user);
      navigate('/affiliate/dashboard');
    } catch (err) {
      setError(err.message === 'not-affiliate' ? 'This account is not an affiliate account.' : getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-5 py-24">
      <h1 className="font-display text-3xl font-bold mb-8">Affiliate Log In</h1>
      <form onSubmit={submit} className="space-y-5">
        <div><label className="label">Email</label><input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label">Password</label><input type="password" required className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Logging in…' : 'Log in'}</button>
      </form>
      <div className="flex justify-between text-sm text-muted mt-6">
        <Link to="/forgot-password" className="hover:text-tggreen">Forgot password?</Link>
        <Link to="/affiliate/register" className="hover:text-tggreen">Join instead</Link>
      </div>
    </div>
  );
}
