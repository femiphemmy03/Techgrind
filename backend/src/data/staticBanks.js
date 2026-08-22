/**
 * Absolute last-resort bank list for the withdrawal form dropdown.
 *
 * This is ONLY ever served when bankCache.service.js has no cached rows in the database
 * AND a live call to Flutterwave's /banks/NG also fails (e.g. first-ever deploy before the
 * startup refresh has landed, hitting a cold database, during a Flutterwave outage).
 * In every normal case the cache (backed by real Flutterwave data, refreshed every 24h) is
 * what gets served — see bankCache.service.js.
 *
 * Deliberately a short list of the highest-traffic Nigerian banks/fintechs so withdrawals
 * aren't fully blocked in that edge case. Codes below are Flutterwave's NG bank codes as of
 * this writing — double-check against a live /banks/NG response if this list is ever actually
 * hit in production, since Flutterwave can renumber codes.
 */
export const STATIC_BANKS = [
  { id: 0, code: '044', name: 'Access Bank' },
  { id: 0, code: '023', name: 'Citibank Nigeria' },
  { id: 0, code: '050', name: 'Ecobank Nigeria' },
  { id: 0, code: '011', name: 'First Bank of Nigeria' },
  { id: 0, code: '214', name: 'First City Monument Bank' },
  { id: 0, code: '058', name: 'Guaranty Trust Bank' },
  { id: 0, code: '030', name: 'Heritage Bank' },
  { id: 0, code: '301', name: 'Jaiz Bank' },
  { id: 0, code: '082', name: 'Keystone Bank' },
  { id: 0, code: '076', name: 'Polaris Bank' },
  { id: 0, code: '221', name: 'Stanbic IBTC Bank' },
  { id: 0, code: '068', name: 'Standard Chartered Bank' },
  { id: 0, code: '232', name: 'Sterling Bank' },
  { id: 0, code: '032', name: 'Union Bank of Nigeria' },
  { id: 0, code: '033', name: 'United Bank For Africa' },
  { id: 0, code: '215', name: 'Unity Bank' },
  { id: 0, code: '035', name: 'Wema Bank' },
  { id: 0, code: '057', name: 'Zenith Bank' },
  { id: 0, code: '50211', name: 'Kuda Microfinance Bank' },
  { id: 0, code: '999992', name: 'OPay' },
  { id: 0, code: '999991', name: 'PalmPay' },
  { id: 0, code: '50515', name: 'Moniepoint Microfinance Bank' },
  { id: 0, code: '090267', name: 'Kuda Bank' },
  { id: 0, code: '100004', name: 'Paga' },
];
