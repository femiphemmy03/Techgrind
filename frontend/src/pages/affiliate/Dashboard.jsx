import { useEffect, useState } from 'react';
import { Copy, Wallet, RefreshCcw, AlertTriangle } from 'lucide-react';
import { api, getErrorMessage } from '../../services/api';
import NotificationsList from '../../components/NotificationsList';

const TABS = ['Overview', 'Withdraw', 'Referral Code'];

export default function AffiliateDashboard() {
  const [tab, setTab] = useState('Overview');
  const [data, setData] = useState(null);

  const load = () => api.get('/affiliate/dashboard').then(({ data }) => setData(data));
  useEffect(() => { load(); }, []);

  if (!data) return <div className="max-w-4xl mx-auto px-5 py-20 text-muted">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto px-5 py-10">
      <h1 className="font-display text-2xl font-bold mb-1">Welcome, {data.username || data.email.split('@')[0]} 👋</h1>
      <p className="text-muted text-sm mb-8">Affiliate dashboard</p>

      <NotificationsList />

      <div className="flex gap-2 mb-8">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-full text-sm ${tab === t ? 'bg-tggreen text-ink font-semibold' : 'bg-surface text-muted'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && <Overview data={data} />}
      {tab === 'Withdraw' && <Withdraw data={data} onDone={load} />}
      {tab === 'Referral Code' && <ChangeCode data={data} onDone={load} />}
    </div>
  );
}

function Overview({ data }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="card md:col-span-2">
        <h3 className="font-semibold mb-3">Your referral link</h3>
        <div className="flex items-center gap-3 bg-ink border border-surfaceborder rounded-lg px-4 py-3">
          <span className="text-tggreen text-sm font-mono flex-1 truncate">{data.referralLink}</span>
          <button onClick={copy}><Copy size={16} className="text-muted hover:text-offwhite" /></button>
        </div>
        {copied && <p className="text-xs text-tggreen mt-2">Copied!</p>}
      </div>
      <div className="card">
        <Wallet className="text-tgamber mb-2" size={20} />
        <p className="text-2xl font-bold">₦{data.withdrawableAmount.toLocaleString()}</p>
        <p className="text-muted text-xs">Withdrawable now</p>
      </div>
      <div className="card"><p className="text-3xl font-bold">{data.confirmedReferrals}</p><p className="text-muted text-sm">Lifetime confirmed referrals</p></div>
      <div className="card"><p className="text-3xl font-bold">{data.withdrawableCount}</p><p className="text-muted text-sm">Referrals available to withdraw</p></div>
      <div className="card"><p className="text-3xl font-bold">₦{data.payoutPerReferral}</p><p className="text-muted text-sm">Per successful referral</p></div>
      <div className="card md:col-span-3">
        <p className="text-xs text-muted">
          Withdrawals are automatic and immediate once confirmed — up to {data.maxWithdrawalsPerMonth} times per rolling
          30 days, at least {data.minDaysBetweenWithdrawals} days apart. There is no admin approval step.
        </p>
      </div>
    </div>
  );
}

function Withdraw({ data, onDone }) {
  const [banks, setBanks] = useState([]);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => { api.get('/affiliate/banks').then(({ data }) => setBanks(data.banks)); }, []);

  const resolve = async () => {
    setError(''); setAccountName('');
    if (!bankCode || accountNumber.length < 10) return;
    setResolving(true);
    try {
      const { data } = await api.post('/affiliate/resolve-account', { accountNumber, bankCode });
      setAccountName(data.accountName);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setResolving(false);
    }
  };

  const openConfirm = (e) => {
    e.preventDefault();
    if (!accountName) return;
    setAcknowledged(false);
    setShowConfirm(true);
  };

  const confirmAndSubmit = async () => {
    if (!acknowledged) return;
    setError('');
    setSubmitting(true);
    try {
      const bankName = banks.find((b) => b.code === bankCode)?.name;
      await api.post('/affiliate/withdrawals', { accountNumber, bankCode, bankName, confirm: true });
      setShowConfirm(false);
      setSuccess(true);
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (data.withdrawableCount <= 0) {
    return <p className="text-muted">You have no withdrawable referrals right now. Share your link to earn more.</p>;
  }

  if (success) {
    return (
      <div className="card">
        <p className="text-tggreen font-semibold mb-1">Transfer sent</p>
        <p className="text-muted text-sm">Your withdrawal has been processed automatically. It should reflect in your account shortly.</p>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={openConfirm} className="card max-w-md space-y-4">
        <p className="text-sm text-muted">
          Requesting withdrawal of <strong className="text-offwhite">{data.withdrawableCount} referrals</strong> = ₦{data.withdrawableAmount.toLocaleString()}
        </p>

        <div className="bg-tgamber/10 border border-tgamber/40 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="text-tgamber shrink-0" size={18} />
          <p className="text-xs text-tgamber">
            This withdrawal is processed automatically the moment you confirm — there is no manual review step.
            Double-check the account name shown below matches yours exactly before confirming. TechGrind is not
            liable for transfers sent to incorrect details you confirmed.
          </p>
        </div>

        <div>
          <label className="label">Bank</label>
          <select required className="input-field" value={bankCode} onChange={(e) => { setBankCode(e.target.value); setAccountName(''); }}>
            <option value="">Select bank</option>
            {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Account number</label>
          <input required maxLength={10} className="input-field" value={accountNumber} onChange={(e) => { setAccountNumber(e.target.value); setAccountName(''); }} onBlur={resolve} />
        </div>
        {resolving && <p className="text-xs text-muted">Verifying account…</p>}
        {accountName && <p className="text-sm text-tggreen">Account name: {accountName}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={!accountName} className="btn-primary w-full">Review & Withdraw</button>
      </form>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-5">
          <div className="card max-w-sm w-full">
            <h4 className="font-semibold mb-2">Confirm this is you</h4>
            <p className="text-sm text-muted mb-1">Account name:</p>
            <p className="text-offwhite font-semibold mb-4">{accountName}</p>
            <p className="text-sm text-muted mb-1">Bank:</p>
            <p className="text-offwhite font-semibold mb-4">{banks.find((b) => b.code === bankCode)?.name}</p>
            <p className="text-sm text-muted mb-1">Amount:</p>
            <p className="text-offwhite font-semibold mb-4">₦{data.withdrawableAmount.toLocaleString()}</p>

            <label className="flex items-start gap-3 text-xs text-muted mb-4">
              <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-1" />
              I confirm this is my account. Once confirmed, this transfer is sent immediately and cannot be undone.
              If the name above isn't mine, I will cancel and re-check my details.
            </label>

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={confirmAndSubmit} disabled={!acknowledged || submitting} className="btn-primary flex-1">
                {submitting ? 'Sending…' : 'Confirm & Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ChangeCode({ data, onDone }) {
  const [newCode, setNewCode] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!confirmChecked) return setError('You must confirm you understand the consequences.');
    setLoading(true);
    try {
      await api.post('/affiliate/referral-code', { newCode, confirm: true });
      setDone(true);
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="card max-w-md space-y-4">
      <p className="text-sm text-muted">Current code: <strong className="text-offwhite">{data.referralCode}</strong></p>
      <div className="bg-tgamber/10 border border-tgamber/40 rounded-lg p-4 flex gap-3">
        <RefreshCcw className="text-tgamber shrink-0" size={18} />
        <p className="text-xs text-tgamber">
          Changing your referral code permanently deletes your current code and resets your referral count to zero.
          This cannot be undone. Make sure you've withdrawn any pending earnings first.
        </p>
      </div>
      <div><label className="label">New referral code</label><input required className="input-field" value={newCode} onChange={(e) => setNewCode(e.target.value)} /></div>
      <label className="flex items-start gap-3 text-xs text-muted">
        <input type="checkbox" checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)} className="mt-1" />
        I understand this permanently resets my referral count and cannot be undone.
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {done && <p className="text-sm text-tggreen">Referral code updated.</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Updating…' : 'Change Referral Code'}</button>
    </form>
  );
}
