# Phase 3 — Wallet ledger and financial controls

**Status:** Complete on 2026-08-10

## Accounting model

- Every movement is one balanced transfer between a debit wallet and a credit wallet. There is no single-sided balance mutation and no mutable transaction amount.
- Each customer has separate `customer` (available) and `customer_hold` sub-wallets for every enabled currency. Platform cash and revenue wallets provide the balancing side of external credits/debits.
- Constrained wallets (`customer`, `customer_hold`, `supplier`, and `affiliate`) have a database non-negative check and the posting trigger performs a locked funds check before changing the cache.
- `wallet_transactions` is append-only. A database trigger raises SQLSTATE `55000` for every UPDATE or DELETE, including privileged direct SQL. Corrections require a compensating ledger entry.
- `wallets.cached_balance` is derived. A protection trigger blocks direct changes; only the nested ledger-posting trigger may update it.

## Atomic and idempotent operations

- `wallet_credit`, `wallet_debit`, `wallet_hold`, and `wallet_release` obtain deterministic row locks with `SELECT … FOR UPDATE` and post through one private transfer function.
- Each operation requires an idempotency key. `(scope, key)` is unique, the canonical request hash is stored, an exact replay returns the original transaction, and reuse with different parameters fails.
- Low-level money RPCs are executable only by the trusted service role. Authenticated finance staff receive only the guarded `wallet_admin_adjust` and `wallet_set_frozen` RPCs, which re-check database permissions.
- Manual adjustment requires a non-empty reason and creates an audit record in the same transaction. Freeze/unfreeze also requires a reason and request identifier and is audited.

## Reconciliation and alerts

- `private.reconcile_wallets()` derives every balance from the immutable ledger and compares it to the cache.
- A nightly `pg_cron` job runs at 02:17 UTC. Every checked wallet produces an append-only reconciliation row; mismatches produce a deduplicated critical `admin_alerts` record.
- Finance RLS permits inspection while direct mutation is revoked. Both tables have RLS and explicit policies.

## Product surface

- `/[locale]/account/wallet`: available and held balances per currency, freeze state, typed/date/currency filters, pagination, and localized statement rows.
- `/[locale]/account/wallet/transactions/[id]`: immutable transaction detail and copyable reference.
- CSV export is UTF-8 with BOM for Arabic/Excel compatibility. PDF export embeds Noto Naskh Arabic TTF and runs in the Node runtime.
- `/[locale]/admin/wallets`: customer lookup, cross-currency ledger, CSV/PDF export, audited signed adjustments, and reasoned freeze/unfreeze controls.

## Verification evidence

- Production migration verification: 20 initialized wallets, zero negative balances, zero reconciliation mismatches, one active nightly cron job, four wallet RLS policies, and all three safety triggers present.
- `tests/database/wallet-ledger.sql` proves exact idempotency replay, debit/hold/release arithmetic, overdraft rejection, ledger mutation rejection, cache mutation rejection, and zero reconciliation drift inside a transaction; all verification writes are rolled back. The same checks passed against the configured Supabase project.
- `scripts/test-wallet-concurrency.mjs` fires 100 parallel debit connections against a disposable `TST` currency. Starting from 50 minor units, exactly 50 must succeed, 50 must fail with `wallet_insufficient_funds`, the final balance must be zero, replay must return the same row, and reconciliation must report zero drift. It refuses to run unless `WALLET_TEST_DATABASE=1`.
- Unit tests execute both Arabic and English PDF generation, Arabic CSV generation, idempotency/reason validation, and filter validation.
- Production build, strict TypeScript, ESLint, Prettier, raw-color gate, and production dependency audit are release gates.

## Operational note

Run the 100-connection concurrency test only against a freshly migrated disposable database or Supabase preview branch. The append-only rule intentionally makes test ledger rows impossible to delete from production.
