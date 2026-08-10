\set ON_ERROR_STOP on
\if :{?owner_id}
\else
  \echo 'Run with: psql "$DATABASE_URL" -v owner_id=<disposable-profile-uuid> -f tests/database/wallet-ledger.sql'
  \quit 2
\endif

BEGIN;

SELECT set_config('app.test_owner_id', :'owner_id', true);

INSERT INTO currencies(code, name, symbol, enabled)
VALUES ('TST', 'Wallet test currency', 'T', true)
ON CONFLICT (code) DO UPDATE SET enabled = true;

DO $$
DECLARE
  owner uuid := current_setting('app.test_owner_id')::uuid;
  credit wallet_transactions;
  replay wallet_transactions;
  available wallets;
  blocked boolean := false;
BEGIN
  credit := wallet_credit(owner, 'TST', 1000, 'bonus', 'sql-test-credit', 'database_test');
  replay := wallet_credit(owner, 'TST', 1000, 'bonus', 'sql-test-credit', 'database_test');
  IF credit.id <> replay.id THEN RAISE EXCEPTION 'idempotency replay created a new row'; END IF;

  PERFORM wallet_debit(owner, 'TST', 400, 'purchase', 'sql-test-debit', 'database_test');
  PERFORM wallet_hold(owner, 'TST', 300, 'sql-test-hold', 'database_test');
  PERFORM wallet_release(owner, 'TST', 100, 'sql-test-release', 'database_test');
  SELECT * INTO available FROM wallets
  WHERE owner_id = owner AND currency_code = 'TST' AND account_type = 'customer';
  IF available.cached_balance <> 400 THEN RAISE EXCEPTION 'unexpected balance: %', available.cached_balance; END IF;

  BEGIN
    PERFORM wallet_debit(owner, 'TST', 401, 'purchase', 'sql-test-overdraft', 'database_test');
  EXCEPTION WHEN SQLSTATE 'P0001' THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'overdraft was not blocked'; END IF;

  blocked := false;
  BEGIN
    UPDATE wallet_transactions SET reason = 'forbidden' WHERE id = credit.id;
  EXCEPTION WHEN SQLSTATE '55000' THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'ledger update was not blocked'; END IF;

  blocked := false;
  BEGIN
    UPDATE wallets SET cached_balance = 999999 WHERE id = available.id;
  EXCEPTION WHEN SQLSTATE '55000' THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'direct cache update was not blocked'; END IF;

  IF private.reconcile_wallets() <> 0 THEN RAISE EXCEPTION 'reconciliation detected drift'; END IF;
END $$;

ROLLBACK;
\echo 'wallet-ledger.sql passed; all verification writes rolled back.'
