import { useEffect, useState } from 'react';
import { Copy, Wallet, RefreshCcw, AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react';
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
        <p className="text-2xl font-bold">₦{data.availableBalanceNgn.toLocaleString()}</p>
        <p className="text-muted text-xs">Available to withdraw now</p>
      </div>
      <div className="card"><p className="text-3xl font-bold">₦{data.lifetimeEarnedNgn.toLocaleString()}</p><p className="text-muted text-sm">Lifetime earned ({data.lifetimeReferrals} referrals)</p></div>
      <div className="card"><p className="text-3xl font-bold">₦{data.totalWithdrawnNgn.toLocaleString()}</p><p className="text-muted text-sm">Total withdrawn so far</p></div>
      <div className="card"><p className="text-3xl font-bold">₦{data.payoutPerReferral}</p><p className="text-muted text-sm">Per successful referral</p></div>
      <div className="card md:col-span-3">
        <p className="text-xs text-muted">
          Withdrawals are always your full available balance — up to {data.maxWithdrawalsPerMonth} times per rolling
          30 days, at least {data.minDaysBetweenWithdrawals} days apart.
        </p>
      </div>
    </div>
  );
}

const STATUS_META = {
  pending: { label: 'Pending review', icon: Clock, color: 'text-tgamber' },
  processing: { label: 'Processing', icon: Clock, color: 'text-tgamber' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-tggreen' },
  failed: { label: 'Failed', icon: XCircle, color: 'text-red-400' },
};

function WithdrawalHistory() {
  const [list, setList] = useState([]);
  useEffect(() => { api.get('/affiliate/withdrawals').then(({ data }) => setList(data.withdrawals)); }, []);
  if (!list.length) return null;

  return (
    <div className="card mt-6">
      <h4 className="font-semibold mb-3 text-sm">Your withdrawal history</h4>
      <div className="space-y-3">
        {list.map((w) => {
          const meta = STATUS_META[w.status] || STATUS_META.pending;
          const Icon = meta.icon;
          return (
            <div key={w.id} className="flex items-center justify-between border-t border-surfaceborder pt-3 first:border-t-0 first:pt-0 text-sm">
              <div>
                <p className="font-medium">₦{Number(w.amount).toLocaleString()}</p>
                <p className="text-xs text-muted">{new Date(w.requested_at).toLocaleString()}</p>
              </div>
              <span className={`flex items-center gap-1 text-xs font-semibold ${meta.color}`}>
                <Icon size={14} /> {meta.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Withdraw({ data, onDone }) {
  const isManual = data.withdrawalMode === 'manual';
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
    if (isManual) return; // manual mode never calls Flutterwave's API — see backend note
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
      await api.post('/affiliate/withdrawals', { accountNumber, bankCode, bankName, accountName, confirm: true });
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

  if (data.availableCount <= 0) {
    return (
      <div>
        <p className="text-muted">You have no withdrawable balance right now. Share your link to earn more.</p>
        <WithdrawalHistory />
      </div>
    );
  }

  if (success) {
    return (
      <div>
        <div className="card">
          {isManual ? (
            <>
              <p className="text-tgamber font-semibold mb-1">Request received</p>
              <p className="text-muted text-sm">
                This confirms your withdrawal request was received — it does not mean payment has been sent yet.
                An admin will review and process it manually; check back here for status updates.
              </p>
            </>
          ) : (
            <>
              <p className="text-tggreen font-semibold mb-1">Transfer sent</p>
              <p className="text-muted text-sm">Your withdrawal has been processed automatically. It should reflect in your account shortly.</p>
            </>
          )}
        </div>
        <WithdrawalHistory />
      </div>
    );
  }

  return (
    <div>
      {isManual && (
        // TODO: exact wording to be confirmed before this ships to real users — placeholder draft below.
        <div className="bg-tgamber/10 border border-tgamber/40 rounded-lg p-4 flex gap-3 mb-6">
          <AlertTriangle className="text-tgamber shrink-0" size={18} />
          <p className="text-xs text-tgamber">
            Withdrawals are currently processed manually by our team and may take a few business days.
            You'll see a status update here and get an email once your transfer has been sent.
          </p>
        </div>
      )}

      <form onSubmit={openConfirm} className="card max-w-md space-y-4">
        <p className="text-sm text-muted">
          Requesting withdrawal of your full available balance: <strong className="text-offwhite">₦{data.availableBalanceNgn.toLocaleString()}</strong>
        </p>

        {!isManual && (
          <div className="bg-tgamber/10 border border-tgamber/40 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="text-tgamber shrink-0" size={18} />
            <p className="text-xs text-tgamber">
              This withdrawal is processed automatically the moment you confirm — there is no manual review step.
              Double-check the account name shown below matches yours exactly before confirming. TechGrind is not
              liable for transfers sent to incorrect details you confirmed.
            </p>
          </div>
        )}

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

        {isManual ? (
          <div>
            <label className="label">Account name</label>
            <input required className="input-field" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Exactly as it appears on your bank account" />
            <p className="text-xs text-muted mt-1">We can't auto-verify this in manual mode — please make sure it's exactly right.</p>
          </div>
        ) : (
          <>
            {resolving && <p className="text-xs text-muted">Verifying account…</p>}
            {accountName && <p className="text-sm text-tggreen">Account name: {accountName}</p>}
          </>
        )}

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
            <p className="text-offwhite font-semibold mb-4">₦{data.availableBalanceNgn.toLocaleString()}</p>

            <label className="flex items-start gap-3 text-xs text-muted mb-4">
              <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-1" />
              I confirm this is my account and these details are correct.
              {!isManual && ' Once confirmed, this transfer is sent immediately and cannot be undone.'}
            </label>

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={confirmAndSubmit} disabled={!acknowledged || submitting} className="btn-primary flex-1">
                {submitting ? 'Submitting…' : isManual ? 'Submit Request' : 'Confirm & Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}

      <WithdrawalHistory />
    </div>
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
