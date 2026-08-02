import axios from 'axios';
import { env } from '../config/env.js';

const FLW_BASE = 'https://api.flutterwave.com/v3';

const flwClient = axios.create({
  baseURL: FLW_BASE,
  headers: { Authorization: `Bearer ${env.FLW_SECRET_KEY}` },
  timeout: 15000,
});

/**
 * Initialize a hosted-payment-page transaction.
 * Returns the checkout link the frontend should redirect to.
 */
export async function initiatePayment({ txRef, amount, email, name, redirectUrl, meta }) {
  const { data } = await flwClient.post('/payments', {
    tx_ref: txRef,
    amount,
    currency: 'NGN',
    redirect_url: redirectUrl,
    customer: { email, name },
    customizations: {
      title: 'TechGrind',
      description: meta?.description || 'TechGrind payment',
      logo: `${env.FRONTEND_URL}/icons/icon-512.png`,
    },
    meta,
  });
  return data; // data.data.link is the checkout URL
}

/**
 * Verify a transaction by its Flutterwave transaction ID.
 * This — never the frontend redirect — is the source of truth for "paid".
 */
export async function verifyTransaction(transactionId) {
  const { data } = await flwClient.get(`/transactions/${transactionId}/verify`);
  return data;
}

/** Resolve an account number + bank code to an account name, for withdrawal confirmation. */
export async function resolveAccountName({ accountNumber, bankCode }) {
  const { data } = await flwClient.post('/accounts/resolve', {
    account_number: accountNumber,
    account_bank: bankCode,
  });
  return data;
}

/** Fetch the list of Nigerian banks + codes, for the withdrawal form dropdown. */
export async function listBanks() {
  const { data } = await flwClient.get('/banks/NG');
  return data;
}

/**
 * Initiate a payout transfer. Only called after an admin approves a withdrawal request —
 * never triggered directly by a marketer action.
 */
export async function initiateTransfer({ accountNumber, bankCode, amount, narration, reference }) {
  const { data } = await flwClient.post('/transfers', {
    account_bank: bankCode,
    account_number: accountNumber,
    amount,
    narration,
    currency: 'NGN',
    reference,
  });
  return data;
}
