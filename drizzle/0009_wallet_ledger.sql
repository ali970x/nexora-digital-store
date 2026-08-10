CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DROP INDEX IF EXISTS wallets_owner_currency_uidx;
CREATE UNIQUE INDEX wallets_owner_currency_type_uidx
  ON wallets(owner_id, currency_code, account_type)
  WHERE owner_id IS NOT NULL;
CREATE UNIQUE INDEX wallets_system_currency_label_uidx
  ON wallets(account_type, currency_code, label)
  WHERE owner_id IS NULL;

ALTER TABLE wallets
  ADD COLUMN frozen_at timestamptz,
  ADD COLUMN frozen_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN freeze_reason text;
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_owner_ck;
ALTER TABLE wallets ADD CONSTRAINT wallets_owner_ck CHECK (
  (account_type IN ('customer', 'customer_hold') AND owner_id IS NOT NULL)
  OR account_type NOT IN ('customer', 'customer_hold')
);
ALTER TABLE wallets ADD CONSTRAINT wallets_customer_nonnegative_ck CHECK (
  account_type NOT IN ('customer', 'customer_hold', 'supplier', 'affiliate')
  OR cached_balance >= 0
);
ALTER TABLE wallets ADD CONSTRAINT wallets_freeze_reason_ck CHECK (
  (locked = false AND frozen_at IS NULL AND frozen_by IS NULL AND freeze_reason IS NULL)
  OR (locked = true AND frozen_at IS NOT NULL AND nullif(trim(freeze_reason), '') IS NOT NULL)
);
CREATE INDEX wallets_owner_currency_idx ON wallets(owner_id, currency_code, account_type);
CREATE INDEX wallets_frozen_idx ON wallets(locked, updated_at DESC) WHERE locked;
CREATE INDEX wallets_frozen_by_idx ON wallets(frozen_by) WHERE frozen_by IS NOT NULL;

ALTER TABLE wallet_transactions ADD COLUMN idempotency_scope text NOT NULL DEFAULT 'wallet.legacy';
DROP INDEX IF EXISTS wallet_transactions_idempotency_uidx;
CREATE UNIQUE INDEX wallet_transactions_idempotency_scope_key_uidx
  ON wallet_transactions(idempotency_scope, idempotency_key);
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_adjustment_reason_ck;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_adjustment_reason_ck CHECK (
  type <> 'admin_adjustment' OR nullif(trim(reason), '') IS NOT NULL
);
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_idempotency_fk
  FOREIGN KEY (idempotency_scope, idempotency_key)
  REFERENCES idempotency_keys(scope, key);

CREATE INDEX idempotency_keys_actor_idx ON idempotency_keys(actor_id, created_at DESC)
  WHERE actor_id IS NOT NULL;
CREATE UNIQUE INDEX audit_logs_request_id_uidx ON audit_logs(request_id)
  WHERE request_id IS NOT NULL;

CREATE TABLE wallet_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  derived_balance bigint NOT NULL,
  cached_balance bigint NOT NULL,
  difference bigint NOT NULL,
  status text NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wallet_reconciliations_difference_ck
    CHECK (difference = cached_balance - derived_balance),
  CONSTRAINT wallet_reconciliations_status_ck
    CHECK (status IN ('matched', 'mismatch'))
);
CREATE INDEX wallet_reconciliations_wallet_checked_idx
  ON wallet_reconciliations(wallet_id, checked_at DESC);
CREATE INDEX wallet_reconciliations_mismatch_idx
  ON wallet_reconciliations(checked_at DESC) WHERE status = 'mismatch';

CREATE TABLE admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL,
  alert_type text NOT NULL,
  title jsonb NOT NULL,
  message jsonb NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  fingerprint text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_alerts_severity_ck CHECK (severity IN ('info', 'warning', 'critical')),
  CONSTRAINT admin_alerts_status_ck CHECK (status IN ('open', 'acknowledged', 'resolved'))
);
CREATE UNIQUE INDEX admin_alerts_open_fingerprint_uidx
  ON admin_alerts(fingerprint) WHERE status <> 'resolved';
CREATE INDEX admin_alerts_status_created_idx ON admin_alerts(status, created_at DESC);
CREATE INDEX admin_alerts_resource_idx ON admin_alerts(resource_type, resource_id, created_at DESC);
CREATE INDEX admin_alerts_acknowledged_by_idx ON admin_alerts(acknowledged_by)
  WHERE acknowledged_by IS NOT NULL;
CREATE INDEX admin_alerts_resolved_by_idx ON admin_alerts(resolved_by)
  WHERE resolved_by IS NOT NULL;

DROP TRIGGER IF EXISTS wallet_transactions_append_only ON wallet_transactions;
DROP FUNCTION IF EXISTS forbid_wallet_transaction_mutation();

CREATE OR REPLACE FUNCTION private.block_wallet_transaction_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = 'wallet_ledger_append_only',
    HINT = 'Post a compensating transaction instead of changing ledger history.';
END;
$$;
REVOKE ALL ON FUNCTION private.block_wallet_transaction_mutation() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER wallet_transactions_append_only
  BEFORE UPDATE OR DELETE ON wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION private.block_wallet_transaction_mutation();

CREATE OR REPLACE FUNCTION private.protect_wallet_cache()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.cached_balance IS DISTINCT FROM OLD.cached_balance AND pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'wallet_cache_trigger_only';
  END IF;
  IF (NEW.owner_id, NEW.currency_code, NEW.account_type)
      IS DISTINCT FROM (OLD.owner_id, OLD.currency_code, OLD.account_type)
    AND EXISTS (
      SELECT 1 FROM public.wallet_transactions transaction
      WHERE transaction.debit_wallet_id = OLD.id OR transaction.credit_wallet_id = OLD.id
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'wallet_identity_immutable_after_posting';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.protect_wallet_cache() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER wallets_protect_cache
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION private.protect_wallet_cache();

CREATE OR REPLACE FUNCTION private.apply_wallet_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  debit public.wallets%ROWTYPE;
  credit public.wallets%ROWTYPE;
BEGIN
  IF NEW.status <> 'posted' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'wallet_transaction_must_be_posted';
  END IF;

  PERFORM 1 FROM public.wallets
  WHERE id IN (NEW.debit_wallet_id, NEW.credit_wallet_id)
  ORDER BY id FOR UPDATE;
  SELECT * INTO debit FROM public.wallets WHERE id = NEW.debit_wallet_id;
  SELECT * INTO credit FROM public.wallets WHERE id = NEW.credit_wallet_id;

  IF debit.id IS NULL OR credit.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'wallet_not_found';
  END IF;
  IF debit.currency_code <> NEW.currency_code OR credit.currency_code <> NEW.currency_code THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'wallet_currency_mismatch';
  END IF;
  IF debit.locked THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'wallet_frozen';
  END IF;
  IF debit.account_type IN ('customer', 'customer_hold', 'supplier', 'affiliate')
    AND debit.cached_balance < NEW.amount THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'wallet_insufficient_funds';
  END IF;

  UPDATE public.wallets
  SET cached_balance = cached_balance - NEW.amount, updated_at = statement_timestamp()
  WHERE id = NEW.debit_wallet_id;
  UPDATE public.wallets
  SET cached_balance = cached_balance + NEW.amount, updated_at = statement_timestamp()
  WHERE id = NEW.credit_wallet_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.apply_wallet_transaction() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER wallet_transactions_apply_balance
  AFTER INSERT ON wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION private.apply_wallet_transaction();

CREATE OR REPLACE FUNCTION private.wallet_caller_is_finance()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT
    session_user IN ('postgres', 'supabase_admin')
    OR coalesce((SELECT auth.jwt() ->> 'role' = 'service_role'), false)
    OR coalesce((SELECT private.app_can('finance.manage')), false);
$$;
REVOKE ALL ON FUNCTION private.wallet_caller_is_finance() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.ensure_wallet(
  p_owner_id uuid,
  p_currency_code text,
  p_account_type public.wallet_account_type,
  p_label text DEFAULT NULL
) RETURNS public.wallets LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result public.wallets;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.currencies WHERE code = p_currency_code AND enabled
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'wallet_currency_disabled';
  END IF;

  IF p_owner_id IS NOT NULL THEN
    INSERT INTO public.wallets(owner_id, account_type, currency_code, label)
    VALUES (p_owner_id, p_account_type, p_currency_code, p_label)
    ON CONFLICT (owner_id, currency_code, account_type) WHERE owner_id IS NOT NULL DO NOTHING;
    SELECT * INTO result FROM public.wallets
    WHERE owner_id = p_owner_id AND currency_code = p_currency_code
      AND account_type = p_account_type FOR UPDATE;
  ELSE
    INSERT INTO public.wallets(owner_id, account_type, currency_code, label)
    VALUES (NULL, p_account_type, p_currency_code, p_label)
    ON CONFLICT (account_type, currency_code, label) WHERE owner_id IS NULL DO NOTHING;
    SELECT * INTO result FROM public.wallets
    WHERE owner_id IS NULL AND currency_code = p_currency_code
      AND account_type = p_account_type AND label = p_label FOR UPDATE;
  END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION private.ensure_wallet(uuid, text, wallet_account_type, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.post_wallet_transfer(
  p_scope text,
  p_idempotency_key text,
  p_debit_wallet_id uuid,
  p_credit_wallet_id uuid,
  p_type public.wallet_transaction_type,
  p_amount bigint,
  p_currency_code text,
  p_reference_type text,
  p_reference_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS public.wallet_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  request_digest text;
  claimed public.idempotency_keys%ROWTYPE;
  previous public.wallet_transactions%ROWTYPE;
  posted public.wallet_transactions%ROWTYPE;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'wallet_amount_must_be_positive';
  END IF;
  IF p_debit_wallet_id = p_credit_wallet_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'wallet_accounts_must_differ';
  END IF;
  IF nullif(trim(p_scope), '') IS NULL OR nullif(trim(p_idempotency_key), '') IS NULL
    OR char_length(p_idempotency_key) > 160 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'wallet_idempotency_key_invalid';
  END IF;
  IF p_type = 'admin_adjustment' AND nullif(trim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'wallet_adjustment_reason_required';
  END IF;

  request_digest := encode(extensions.digest(
    concat_ws('|', p_scope, p_debit_wallet_id::text, p_credit_wallet_id::text,
      p_type::text, p_amount::text, p_currency_code, p_reference_type,
      coalesce(p_reference_id::text, ''), coalesce(p_reason, ''), coalesce(p_metadata, '{}'::jsonb)::text),
    'sha256'
  ), 'hex');

  INSERT INTO public.idempotency_keys(
    scope, key, actor_id, request_hash, locked_until, expires_at
  ) VALUES (
    p_scope, p_idempotency_key, p_actor_id, request_digest,
    statement_timestamp() + interval '30 seconds', statement_timestamp() + interval '7 days'
  ) ON CONFLICT (scope, key) DO NOTHING;

  SELECT * INTO claimed FROM public.idempotency_keys
  WHERE scope = p_scope AND key = p_idempotency_key FOR UPDATE;
  IF claimed.request_hash <> request_digest THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'wallet_idempotency_conflict';
  END IF;
  IF claimed.response_body ? 'transaction_id' THEN
    SELECT * INTO previous FROM public.wallet_transactions
    WHERE id = (claimed.response_body ->> 'transaction_id')::uuid;
    IF previous.id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'XX000', MESSAGE = 'wallet_idempotency_result_missing';
    END IF;
    RETURN previous;
  END IF;

  PERFORM 1 FROM public.wallets
  WHERE id IN (p_debit_wallet_id, p_credit_wallet_id)
  ORDER BY id FOR UPDATE;

  INSERT INTO public.wallet_transactions(
    debit_wallet_id, credit_wallet_id, type, amount, currency_code,
    idempotency_scope, idempotency_key, reference_type, reference_id,
    reason, metadata, created_by
  ) VALUES (
    p_debit_wallet_id, p_credit_wallet_id, p_type, p_amount, p_currency_code,
    p_scope, p_idempotency_key, p_reference_type, p_reference_id,
    nullif(trim(p_reason), ''), coalesce(p_metadata, '{}'::jsonb), p_actor_id
  ) RETURNING * INTO posted;

  UPDATE public.idempotency_keys
  SET response_status = 200,
      response_body = jsonb_build_object('transaction_id', posted.id),
      locked_until = NULL,
      updated_at = statement_timestamp()
  WHERE id = claimed.id;
  RETURN posted;
END;
$$;
REVOKE ALL ON FUNCTION private.post_wallet_transfer(
  text, text, uuid, uuid, wallet_transaction_type, bigint, text, text, uuid, text, uuid, jsonb
) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION wallet_credit(
  p_owner_id uuid,
  p_currency_code text,
  p_amount bigint,
  p_type wallet_transaction_type,
  p_idempotency_key text,
  p_reference_type text,
  p_reference_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS wallet_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE source public.wallets; destination public.wallets;
BEGIN
  IF NOT private.wallet_caller_is_finance() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'wallet_finance_permission_required';
  END IF;
  IF p_type::text NOT IN ('topup', 'refund', 'commission', 'cashback', 'bonus', 'admin_adjustment', 'chargeback') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'wallet_credit_type_invalid';
  END IF;
  source := private.ensure_wallet(NULL, p_currency_code, 'platform_cash', 'cash:' || p_currency_code);
  destination := private.ensure_wallet(p_owner_id, p_currency_code, 'customer', 'available');
  RETURN private.post_wallet_transfer(
    'wallet.credit', p_idempotency_key, source.id, destination.id, p_type, p_amount,
    p_currency_code, p_reference_type, p_reference_id, p_reason, auth.uid(), p_metadata
  );
END;
$$;

CREATE OR REPLACE FUNCTION wallet_debit(
  p_owner_id uuid,
  p_currency_code text,
  p_amount bigint,
  p_type wallet_transaction_type,
  p_idempotency_key text,
  p_reference_type text,
  p_reference_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS wallet_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE source public.wallets; destination public.wallets; destination_type public.wallet_account_type;
BEGIN
  IF NOT private.wallet_caller_is_finance() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'wallet_finance_permission_required';
  END IF;
  IF p_type::text NOT IN ('purchase', 'payout', 'fee', 'chargeback', 'admin_adjustment') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'wallet_debit_type_invalid';
  END IF;
  source := private.ensure_wallet(p_owner_id, p_currency_code, 'customer', 'available');
  destination_type := CASE WHEN p_type = 'payout' THEN 'platform_cash' ELSE 'platform_revenue' END;
  destination := private.ensure_wallet(
    NULL, p_currency_code, destination_type,
    CASE WHEN p_type = 'payout' THEN 'cash:' || p_currency_code ELSE 'revenue:' || p_currency_code END
  );
  RETURN private.post_wallet_transfer(
    'wallet.debit', p_idempotency_key, source.id, destination.id, p_type, p_amount,
    p_currency_code, p_reference_type, p_reference_id, p_reason, auth.uid(), p_metadata
  );
END;
$$;

CREATE OR REPLACE FUNCTION wallet_hold(
  p_owner_id uuid,
  p_currency_code text,
  p_amount bigint,
  p_idempotency_key text,
  p_reference_type text,
  p_reference_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS wallet_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE available public.wallets; held public.wallets;
BEGIN
  IF NOT private.wallet_caller_is_finance() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'wallet_finance_permission_required';
  END IF;
  available := private.ensure_wallet(p_owner_id, p_currency_code, 'customer', 'available');
  held := private.ensure_wallet(p_owner_id, p_currency_code, 'customer_hold', 'held');
  RETURN private.post_wallet_transfer(
    'wallet.hold', p_idempotency_key, available.id, held.id, 'hold', p_amount,
    p_currency_code, p_reference_type, p_reference_id, NULL, auth.uid(), p_metadata
  );
END;
$$;

CREATE OR REPLACE FUNCTION wallet_release(
  p_owner_id uuid,
  p_currency_code text,
  p_amount bigint,
  p_idempotency_key text,
  p_reference_type text,
  p_reference_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS wallet_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE available public.wallets; held public.wallets;
BEGIN
  IF NOT private.wallet_caller_is_finance() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'wallet_finance_permission_required';
  END IF;
  available := private.ensure_wallet(p_owner_id, p_currency_code, 'customer', 'available');
  held := private.ensure_wallet(p_owner_id, p_currency_code, 'customer_hold', 'held');
  RETURN private.post_wallet_transfer(
    'wallet.release', p_idempotency_key, held.id, available.id, 'release', p_amount,
    p_currency_code, p_reference_type, p_reference_id, NULL, auth.uid(), p_metadata
  );
END;
$$;

CREATE OR REPLACE FUNCTION wallet_admin_adjust(
  p_owner_id uuid,
  p_currency_code text,
  p_signed_amount bigint,
  p_idempotency_key text,
  p_reason text
) RETURNS wallet_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result public.wallet_transactions;
BEGIN
  IF NOT private.wallet_caller_is_finance() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'wallet_finance_permission_required';
  END IF;
  IF p_signed_amount = 0 OR nullif(trim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'wallet_adjustment_invalid';
  END IF;
  IF p_signed_amount > 0 THEN
    result := public.wallet_credit(
      p_owner_id, p_currency_code, p_signed_amount, 'admin_adjustment',
      p_idempotency_key, 'admin_adjustment', NULL, p_reason,
      jsonb_build_object('direction', 'credit')
    );
  ELSE
    result := public.wallet_debit(
      p_owner_id, p_currency_code, abs(p_signed_amount), 'admin_adjustment',
      p_idempotency_key, 'admin_adjustment', NULL, p_reason,
      jsonb_build_object('direction', 'debit')
    );
  END IF;
  INSERT INTO public.audit_logs(
    actor_id, actor_type, action, resource_type, resource_id, after, reason, request_id
  ) VALUES (
    auth.uid(), 'user', 'wallet.admin_adjustment', 'wallet_transaction', result.id,
    jsonb_build_object('owner_id', p_owner_id, 'currency_code', p_currency_code,
      'signed_amount', p_signed_amount), p_reason, 'wallet-adjust:' || p_idempotency_key
  ) ON CONFLICT (request_id) WHERE request_id IS NOT NULL DO NOTHING;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION wallet_set_frozen(
  p_wallet_id uuid,
  p_frozen boolean,
  p_reason text,
  p_request_id text
) RETURNS wallets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE previous public.wallets; result public.wallets;
BEGIN
  IF NOT private.wallet_caller_is_finance() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'wallet_finance_permission_required';
  END IF;
  IF nullif(trim(p_reason), '') IS NULL OR nullif(trim(p_request_id), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'wallet_freeze_reason_required';
  END IF;
  SELECT * INTO previous FROM public.wallets WHERE id = p_wallet_id FOR UPDATE;
  IF previous.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'wallet_not_found';
  END IF;
  UPDATE public.wallets SET
    locked = p_frozen,
    frozen_at = CASE WHEN p_frozen THEN statement_timestamp() ELSE NULL END,
    frozen_by = CASE WHEN p_frozen THEN auth.uid() ELSE NULL END,
    freeze_reason = CASE WHEN p_frozen THEN trim(p_reason) ELSE NULL END,
    updated_at = statement_timestamp()
  WHERE id = p_wallet_id RETURNING * INTO result;
  INSERT INTO public.audit_logs(
    actor_id, actor_type, action, resource_type, resource_id, before, after, reason, request_id
  ) VALUES (
    auth.uid(), 'user', CASE WHEN p_frozen THEN 'wallet.freeze' ELSE 'wallet.unfreeze' END,
    'wallet', p_wallet_id, to_jsonb(previous), to_jsonb(result), p_reason,
    'wallet-freeze:' || p_request_id
  ) ON CONFLICT (request_id) WHERE request_id IS NOT NULL DO NOTHING;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION wallet_credit(uuid, text, bigint, wallet_transaction_type, text, text, uuid, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION wallet_debit(uuid, text, bigint, wallet_transaction_type, text, text, uuid, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION wallet_hold(uuid, text, bigint, text, text, uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION wallet_release(uuid, text, bigint, text, text, uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION wallet_admin_adjust(uuid, text, bigint, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION wallet_set_frozen(uuid, boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION wallet_credit(uuid, text, bigint, wallet_transaction_type, text, text, uuid, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION wallet_debit(uuid, text, bigint, wallet_transaction_type, text, text, uuid, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION wallet_hold(uuid, text, bigint, text, text, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION wallet_release(uuid, text, bigint, text, text, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION wallet_admin_adjust(uuid, text, bigint, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION wallet_set_frozen(uuid, boolean, text, text) TO authenticated, service_role;

DROP FUNCTION IF EXISTS post_wallet_transaction(
  uuid, uuid, wallet_transaction_type, bigint, text, text, text, uuid, text, uuid, jsonb
);

CREATE OR REPLACE FUNCTION private.block_reconciliation_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'wallet_reconciliation_append_only';
END;
$$;
REVOKE ALL ON FUNCTION private.block_reconciliation_mutation() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER wallet_reconciliations_append_only
  BEFORE UPDATE OR DELETE ON wallet_reconciliations
  FOR EACH ROW EXECUTE FUNCTION private.block_reconciliation_mutation();

CREATE OR REPLACE FUNCTION private.reconcile_wallets()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE mismatch_count integer;
BEGIN
  WITH derived AS (
    SELECT wallet.id AS wallet_id, wallet.cached_balance,
      coalesce(sum(CASE
        WHEN transaction.credit_wallet_id = wallet.id THEN transaction.amount
        WHEN transaction.debit_wallet_id = wallet.id THEN -transaction.amount
        ELSE 0 END), 0)::bigint AS derived_balance
    FROM public.wallets wallet
    LEFT JOIN public.wallet_transactions transaction
      ON transaction.status = 'posted'
      AND wallet.id IN (transaction.debit_wallet_id, transaction.credit_wallet_id)
    GROUP BY wallet.id, wallet.cached_balance
  ), inserted AS (
    INSERT INTO public.wallet_reconciliations(
      wallet_id, derived_balance, cached_balance, difference, status
    ) SELECT wallet_id, derived_balance, cached_balance,
      cached_balance - derived_balance,
      CASE WHEN cached_balance = derived_balance THEN 'matched' ELSE 'mismatch' END
    FROM derived
    RETURNING *
  )
  SELECT count(*)::integer INTO mismatch_count FROM inserted WHERE status = 'mismatch';

  INSERT INTO public.admin_alerts(
    severity, alert_type, title, message, resource_type, resource_id, fingerprint, metadata
  )
  SELECT 'critical', 'wallet_reconciliation_mismatch',
    '{"en":"Wallet balance mismatch","ar":"عدم تطابق رصيد المحفظة"}'::jsonb,
    '{"en":"Cached and ledger-derived balances differ.","ar":"الرصيد المخبأ لا يطابق الرصيد المشتق من دفتر القيود."}'::jsonb,
    'wallet', reconciliation.wallet_id,
    'wallet-reconciliation:' || reconciliation.wallet_id::text,
    jsonb_build_object(
      'derived_balance', reconciliation.derived_balance,
      'cached_balance', reconciliation.cached_balance,
      'difference', reconciliation.difference,
      'checked_at', reconciliation.checked_at
    )
  FROM public.wallet_reconciliations reconciliation
  WHERE reconciliation.status = 'mismatch'
    AND reconciliation.checked_at >= statement_timestamp() - interval '1 minute'
  ON CONFLICT DO NOTHING;

  IF mismatch_count > 0 THEN
    RAISE WARNING 'wallet_reconciliation_mismatch: % wallet(s)', mismatch_count;
  END IF;
  RETURN mismatch_count;
END;
$$;
REVOKE ALL ON FUNCTION private.reconcile_wallets() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION run_wallet_reconciliation()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT private.wallet_caller_is_finance() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'wallet_finance_permission_required';
  END IF;
  RETURN private.reconcile_wallets();
END;
$$;
REVOKE ALL ON FUNCTION run_wallet_reconciliation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION run_wallet_reconciliation() TO authenticated, service_role;

ALTER TABLE wallet_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_read_own_wallets ON wallets;
CREATE POLICY wallets_read_owner_or_finance ON wallets FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR (SELECT private.app_can('finance.manage')));
DROP POLICY IF EXISTS users_read_own_wallet_transactions ON wallet_transactions;
CREATE POLICY wallet_transactions_read_owner_or_finance ON wallet_transactions FOR SELECT TO authenticated
  USING (
    (SELECT private.app_can('finance.manage')) OR EXISTS (
      SELECT 1 FROM wallets wallet
      WHERE wallet.owner_id = (SELECT auth.uid())
        AND wallet.id IN (debit_wallet_id, credit_wallet_id)
    )
  );
CREATE POLICY wallet_reconciliations_finance_read ON wallet_reconciliations FOR SELECT TO authenticated
  USING ((SELECT private.app_can('finance.manage')));
CREATE POLICY admin_alerts_finance_read ON admin_alerts FOR SELECT TO authenticated
  USING ((SELECT private.app_can('finance.manage')));

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON wallets FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON wallet_transactions FROM anon, authenticated;
REVOKE ALL ON wallet_reconciliations FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON wallet_reconciliations FROM authenticated;
REVOKE ALL ON admin_alerts FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON admin_alerts FROM authenticated;
GRANT SELECT ON wallets, wallet_transactions TO authenticated;
GRANT SELECT ON wallet_reconciliations, admin_alerts TO authenticated;

INSERT INTO wallets(owner_id, account_type, currency_code, label)
SELECT profile.id, account_type.value::wallet_account_type, currency.code,
  CASE account_type.value WHEN 'customer' THEN 'available' ELSE 'held' END
FROM profiles profile
CROSS JOIN currencies currency
CROSS JOIN (VALUES ('customer'), ('customer_hold')) account_type(value)
WHERE currency.enabled
ON CONFLICT (owner_id, currency_code, account_type) WHERE owner_id IS NOT NULL DO NOTHING;

INSERT INTO wallets(owner_id, account_type, currency_code, label)
SELECT NULL, account.value::wallet_account_type, currency.code,
  CASE account.value
    WHEN 'platform_cash' THEN 'cash:' || currency.code
    ELSE 'revenue:' || currency.code
  END
FROM currencies currency
CROSS JOIN (VALUES ('platform_cash'), ('platform_revenue')) account(value)
WHERE currency.enabled
ON CONFLICT (account_type, currency_code, label) WHERE owner_id IS NULL DO NOTHING;

CREATE OR REPLACE FUNCTION private.create_profile_wallets()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.wallets(owner_id, account_type, currency_code, label)
  SELECT NEW.id, account.value::public.wallet_account_type, currency.code,
    CASE account.value WHEN 'customer' THEN 'available' ELSE 'held' END
  FROM public.currencies currency
  CROSS JOIN (VALUES ('customer'), ('customer_hold')) account(value)
  WHERE currency.enabled
  ON CONFLICT (owner_id, currency_code, account_type) WHERE owner_id IS NOT NULL DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.create_profile_wallets() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER profiles_create_wallets
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION private.create_profile_wallets();

INSERT INTO role_permissions(role, permission, description)
VALUES
  ('finance', 'wallet.manage', 'View, freeze, adjust, export, and reconcile wallets'),
  ('admin', 'finance.manage', 'Manage finance operations'),
  ('admin', 'wallet.manage', 'View, freeze, adjust, export, and reconcile wallets'),
  ('owner', 'wallet.manage', 'View, freeze, adjust, export, and reconcile wallets')
ON CONFLICT (role, permission) DO NOTHING;

DO $$
DECLARE existing_job bigint;
BEGIN
  SELECT jobid INTO existing_job FROM cron.job
  WHERE jobname = 'wallet-nightly-reconciliation' LIMIT 1;
  IF existing_job IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job);
  END IF;
  PERFORM cron.schedule(
    'wallet-nightly-reconciliation',
    '17 2 * * *',
    'SELECT private.reconcile_wallets();'
  );
END;
$$;

COMMENT ON TABLE wallet_transactions IS
  'Append-only double-entry ledger. UPDATE and DELETE are blocked by trigger.';
COMMENT ON COLUMN wallets.cached_balance IS
  'Derived cache maintained only by wallet_transactions_apply_balance trigger.';
COMMENT ON FUNCTION wallet_credit(uuid, text, bigint, wallet_transaction_type, text, text, uuid, text, jsonb) IS
  'Idempotent atomic credit using ordered row locks and a balancing platform account.';
COMMENT ON FUNCTION wallet_debit(uuid, text, bigint, wallet_transaction_type, text, text, uuid, text, jsonb) IS
  'Idempotent atomic debit; constrained accounts cannot overdraw.';
COMMENT ON FUNCTION wallet_hold(uuid, text, bigint, text, text, uuid, jsonb) IS
  'Moves available funds into the same user currency hold sub-wallet.';
COMMENT ON FUNCTION wallet_release(uuid, text, bigint, text, text, uuid, jsonb) IS
  'Moves held funds back into the same user currency available sub-wallet.';
