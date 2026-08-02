import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Lands here right after Flutterwave's redirect. Immediately verifies the transaction
 * against Flutterwave (via our backend) instead of waiting for the separate webhook —
 * this is the fast path, the webhook is just a safety net for whichever gets there second.
 * As soon as it's confirmed, moves the person on automatically (no "click to continue").
 */
export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get('transaction_id');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState('checking'); // checking | success | failed | expired

  useEffect(() => {
    if (!transactionId) return setState('failed');

    let cancelled = false;
    let attempt = 0;

    const check = async () => {
      try {
        const { data } = await api.post('/public/verify-payment', { transactionId });
        if (cancelled) return;

        if (data.status === 'successful') {
          setState('success');
          const target = user ? dashboardPathFor(user.role) : '/login';
          setTimeout(() => navigate(target), 1200);
          return;
        }
        if (data.status === 'expired') return setState('expired');
        if (data.status === 'failed') return setState('failed');

        // 'not_found' can briefly happen right after redirect if Flutterwave is still
        // finalizing on their end — a couple of quick retries covers that gap.
        attempt += 1;
        if (attempt < 4) setTimeout(check, 1500);
        else setState('failed');
      } catch {
        if (!cancelled) setState('failed');
      }
    };

    check();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  return (
    <div className="max-w-md mx-auto px-5 py-24 text-center">
      {state === 'checking' && (
        <>
          <Loader2 className="animate-spin mx-auto mb-4 text-tggreen" size={40} />
          <p className="text-muted">Confirming your payment…</p>
        </>
      )}
      {state === 'success' && (
        <>
          <CheckCircle2 className="mx-auto mb-4 text-tggreen" size={48} />
          <h1 className="font-display text-2xl font-bold mb-2">Payment confirmed</h1>
          <p className="text-muted">Taking you {user ? 'to your dashboard' : 'to log in'}…</p>
        </>
      )}
      {state === 'expired' && (
        <>
          <XCircle className="mx-auto mb-4 text-tgamber" size={48} />
          <h1 className="font-display text-2xl font-bold mb-2">Registration window expired</h1>
          <p className="text-muted mb-6">This registration attempt timed out. Please register again.</p>
          <Link to="/register" className="btn-primary inline-block">Register Again</Link>
        </>
      )}
      {state === 'failed' && (
        <>
          <XCircle className="mx-auto mb-4 text-red-400" size={48} />
          <h1 className="font-display text-2xl font-bold mb-2">Payment not confirmed</h1>
          <p className="text-muted mb-6">If money left your account, contact support and we'll sort it out.</p>
          <Link to="/contact" className="btn-primary inline-block">Contact Support</Link>
        </>
      )}
    </div>
  );
}

function dashboardPathFor(role) {
  return { admin: '/admin', lecturer: '/lecturer/dashboard', student: '/dashboard', affiliate: '/affiliate/dashboard' }[role] || '/login';
}
