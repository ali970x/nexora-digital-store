-- Keep every amount exactly representable across the Postgres/JSON/TypeScript boundary.

ALTER TABLE wallet_transactions
  ADD CONSTRAINT wallet_transactions_safe_integer_ck
  CHECK (amount <= 9007199254740991);

ALTER TABLE wallets
  ADD CONSTRAINT wallets_cached_balance_safe_integer_ck
  CHECK (cached_balance BETWEEN -9007199254740991 AND 9007199254740991);
