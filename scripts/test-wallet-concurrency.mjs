import {randomUUID} from 'node:crypto';
import pg from 'pg';

if (process.env.WALLET_TEST_DATABASE !== '1') {
  throw new Error(
    'Refusing to post ledger entries outside a disposable database. Set WALLET_TEST_DATABASE=1.'
  );
}
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const pool = new pg.Pool({connectionString: process.env.DATABASE_URL, max: 100});
const ownerResult = process.env.WALLET_TEST_OWNER_ID
  ? {rows: [{id: process.env.WALLET_TEST_OWNER_ID}]}
  : await pool.query('select id from profiles order by created_at limit 1');
const ownerId = ownerResult.rows[0]?.id;
if (!ownerId) throw new Error('A disposable test profile is required.');

const currency = 'TST';
await pool.query(
  `insert into currencies(code, name, symbol, enabled)
   values ($1, 'Wallet concurrency test', 'T', true)
   on conflict (code) do update set enabled = true`,
  [currency]
);

const before = await pool.query(
  `select cached_balance from wallets
   where owner_id = $1 and currency_code = $2 and account_type = 'customer'`,
  [ownerId, currency]
);
if (before.rows[0] && BigInt(before.rows[0].cached_balance) !== 0n) {
  throw new Error('The TST wallet is not empty; use a freshly migrated disposable database.');
}

const creditKey = `test-credit-${randomUUID()}`;
const credit = await pool.query(
  `select (wallet_credit($1, $2, 50, 'bonus', $3, 'concurrency_test')).id`,
  [ownerId, currency, creditKey]
);
const replay = await pool.query(
  `select (wallet_credit($1, $2, 50, 'bonus', $3, 'concurrency_test')).id`,
  [ownerId, currency, creditKey]
);
if (credit.rows[0].id !== replay.rows[0].id)
  throw new Error('Idempotency replay returned a new row.');

const attempts = Array.from({length: 100}, (_, index) =>
  pool
    .query(`select (wallet_debit($1, $2, 1, 'purchase', $3, 'concurrency_test')).id`, [
      ownerId,
      currency,
      `test-debit-${index}-${randomUUID()}`
    ])
    .then(() => ({ok: true}))
    .catch((error) => ({ok: false, error: String(error.message)}))
);
const results = await Promise.all(attempts);
const succeeded = results.filter((result) => result.ok).length;
const rejected = results.filter(
  (result) => !result.ok && result.error.includes('wallet_insufficient_funds')
).length;
const finalBalance = await pool.query(
  `select cached_balance from wallets
   where owner_id = $1 and currency_code = $2 and account_type = 'customer'`,
  [ownerId, currency]
);
const reconciliation = await pool.query('select private.reconcile_wallets() as mismatches');

if (succeeded !== 50 || rejected !== 50) {
  throw new Error(`Expected 50 successful and 50 rejected debits; got ${succeeded}/${rejected}.`);
}
if (BigInt(finalBalance.rows[0].cached_balance) !== 0n)
  throw new Error('Final balance is not zero.');
if (Number(reconciliation.rows[0].mismatches) !== 0) throw new Error('Reconciliation found drift.');

console.log(
  JSON.stringify({parallelDebits: 100, succeeded, rejected, finalBalance: 0, replayStable: true})
);
await pool.end();
