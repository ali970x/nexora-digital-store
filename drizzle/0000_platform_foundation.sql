CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TYPE "wallet_account_type" AS ENUM ('customer', 'platform_cash', 'platform_revenue', 'platform_liability', 'supplier', 'affiliate');
CREATE TYPE "wallet_transaction_type" AS ENUM ('top_up', 'purchase', 'refund', 'admin_adjustment', 'affiliate_commission', 'cashback', 'hold', 'release');
CREATE TYPE "wallet_transaction_status" AS ENUM ('posted', 'reversed');

CREATE TABLE "locales" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "code" text NOT NULL, "name" text NOT NULL,
  "native_name" text NOT NULL, "direction" text NOT NULL, "enabled" boolean NOT NULL DEFAULT true,
  "is_default" boolean NOT NULL DEFAULT false, "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "locales_code_ck" CHECK (code ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  CONSTRAINT "locales_direction_ck" CHECK (direction IN ('ltr', 'rtl'))
);
CREATE UNIQUE INDEX "locales_code_uidx" ON "locales" ("code");
CREATE UNIQUE INDEX "locales_one_default_uidx" ON "locales" ((is_default)) WHERE is_default;

CREATE TABLE "currencies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "code" text NOT NULL, "name" text NOT NULL,
  "symbol" text NOT NULL, "minor_unit" integer NOT NULL DEFAULT 2, "rounding_increment" bigint NOT NULL DEFAULT 1,
  "enabled" boolean NOT NULL DEFAULT true, "is_base" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "currencies_code_ck" CHECK (code ~ '^[A-Z]{3}$'), CONSTRAINT "currencies_minor_unit_ck" CHECK (minor_unit BETWEEN 0 AND 3),
  CONSTRAINT "currencies_rounding_ck" CHECK (rounding_increment > 0)
);
CREATE UNIQUE INDEX "currencies_code_uidx" ON "currencies" ("code");
CREATE UNIQUE INDEX "currencies_one_base_uidx" ON "currencies" ((is_base)) WHERE is_base;

CREATE TABLE "profiles" (
  "id" uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, "display_name" text, "phone" text,
  "locale_code" text NOT NULL DEFAULT 'en' REFERENCES locales(code), "currency_code" text NOT NULL DEFAULT 'USD' REFERENCES currencies(code),
  "timezone" text NOT NULL DEFAULT 'UTC', "country_code" text, "avatar_path" text, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "deleted_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "profiles_country_ck" CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$')
);
CREATE INDEX "profiles_phone_idx" ON "profiles" ("phone");
CREATE INDEX "profiles_deleted_at_idx" ON "profiles" ("deleted_at");

CREATE TABLE "wallets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "owner_id" uuid REFERENCES profiles(id), "account_type" wallet_account_type NOT NULL,
  "currency_code" text NOT NULL REFERENCES currencies(code), "cached_balance" bigint NOT NULL DEFAULT 0, "locked" boolean NOT NULL DEFAULT false,
  "label" text, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "wallets_owner_ck" CHECK (owner_id IS NOT NULL OR account_type <> 'customer')
);
CREATE UNIQUE INDEX "wallets_owner_currency_uidx" ON "wallets" ("owner_id", "currency_code") WHERE owner_id IS NOT NULL;
CREATE INDEX "wallets_account_type_idx" ON "wallets" ("account_type");

CREATE TABLE "wallet_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "debit_wallet_id" uuid NOT NULL REFERENCES wallets(id), "credit_wallet_id" uuid NOT NULL REFERENCES wallets(id),
  "type" wallet_transaction_type NOT NULL, "status" wallet_transaction_status NOT NULL DEFAULT 'posted', "amount" bigint NOT NULL,
  "currency_code" text NOT NULL REFERENCES currencies(code), "idempotency_key" text NOT NULL, "reference_type" text NOT NULL, "reference_id" uuid,
  "reason" text, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, "reversal_of_id" uuid REFERENCES wallet_transactions(id), "created_by" uuid REFERENCES profiles(id),
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "wallet_transactions_amount_ck" CHECK (amount > 0), CONSTRAINT "wallet_transactions_distinct_accounts_ck" CHECK (debit_wallet_id <> credit_wallet_id),
  CONSTRAINT "wallet_transactions_adjustment_reason_ck" CHECK (type <> 'admin_adjustment' OR reason IS NOT NULL)
);
CREATE UNIQUE INDEX "wallet_transactions_idempotency_uidx" ON "wallet_transactions" ("idempotency_key");
CREATE UNIQUE INDEX "wallet_transactions_reversal_uidx" ON "wallet_transactions" ("reversal_of_id") WHERE reversal_of_id IS NOT NULL;
CREATE INDEX "wallet_transactions_debit_created_idx" ON "wallet_transactions" ("debit_wallet_id", "created_at" DESC);
CREATE INDEX "wallet_transactions_credit_created_idx" ON "wallet_transactions" ("credit_wallet_id", "created_at" DESC);
CREATE INDEX "wallet_transactions_reference_idx" ON "wallet_transactions" ("reference_type", "reference_id");

CREATE TABLE "idempotency_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "scope" text NOT NULL, "key" text NOT NULL, "actor_id" uuid REFERENCES profiles(id),
  "request_hash" text NOT NULL, "response_status" integer, "response_body" jsonb, "locked_until" timestamptz, "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "idempotency_keys_scope_key_uidx" ON "idempotency_keys" ("scope", "key");
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys" ("expires_at");

CREATE TABLE "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "actor_id" uuid REFERENCES profiles(id), "actor_type" text NOT NULL, "action" text NOT NULL,
  "resource_type" text NOT NULL, "resource_id" uuid, "before" jsonb, "after" jsonb, "reason" text, "request_id" text,
  "ip_hash" text, "user_agent_hash" text, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" ("resource_type", "resource_id", "created_at" DESC);
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" ("actor_id", "created_at" DESC);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER locales_updated_at BEFORE UPDATE ON locales FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER currencies_updated_at BEFORE UPDATE ON currencies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION forbid_wallet_transaction_mutation() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'wallet_transactions is append-only'; END; $$;
CREATE TRIGGER wallet_transactions_append_only BEFORE UPDATE OR DELETE ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION forbid_wallet_transaction_mutation();

CREATE OR REPLACE FUNCTION post_wallet_transaction(
  p_debit_wallet_id uuid, p_credit_wallet_id uuid, p_type wallet_transaction_type, p_amount bigint,
  p_currency_code text, p_idempotency_key text, p_reference_type text, p_reference_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL, p_created_by uuid DEFAULT auth.uid(), p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS wallet_transactions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing wallet_transactions; debit_wallet wallets; credit_wallet wallets; posted wallet_transactions;
BEGIN
  IF p_amount <= 0 OR p_debit_wallet_id = p_credit_wallet_id THEN RAISE EXCEPTION 'invalid wallet transfer'; END IF;
  SELECT * INTO existing FROM wallet_transactions WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN existing; END IF;
  SELECT * INTO debit_wallet FROM wallets WHERE id = p_debit_wallet_id FOR UPDATE;
  SELECT * INTO credit_wallet FROM wallets WHERE id = p_credit_wallet_id FOR UPDATE;
  IF debit_wallet.currency_code <> p_currency_code OR credit_wallet.currency_code <> p_currency_code THEN RAISE EXCEPTION 'currency mismatch'; END IF;
  IF debit_wallet.cached_balance < p_amount AND debit_wallet.account_type IN ('customer', 'supplier', 'affiliate') THEN RAISE EXCEPTION 'insufficient funds'; END IF;
  INSERT INTO wallet_transactions (debit_wallet_id, credit_wallet_id, type, amount, currency_code, idempotency_key, reference_type, reference_id, reason, created_by, metadata)
  VALUES (p_debit_wallet_id, p_credit_wallet_id, p_type, p_amount, p_currency_code, p_idempotency_key, p_reference_type, p_reference_id, p_reason, p_created_by, p_metadata)
  RETURNING * INTO posted;
  UPDATE wallets SET cached_balance = cached_balance - p_amount, updated_at = now() WHERE id = p_debit_wallet_id;
  UPDATE wallets SET cached_balance = cached_balance + p_amount, updated_at = now() WHERE id = p_credit_wallet_id;
  RETURN posted;
END; $$;
REVOKE ALL ON FUNCTION post_wallet_transaction(uuid, uuid, wallet_transaction_type, bigint, text, text, text, uuid, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION post_wallet_transaction(uuid, uuid, wallet_transaction_type, bigint, text, text, text, uuid, text, uuid, jsonb) TO service_role;

ALTER TABLE locales ENABLE ROW LEVEL SECURITY; ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY; ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_enabled_locales" ON locales FOR SELECT USING (enabled);
CREATE POLICY "public_read_enabled_currencies" ON currencies FOR SELECT USING (enabled);
CREATE POLICY "users_read_own_profile" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "users_read_own_wallets" ON wallets FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "users_read_own_wallet_transactions" ON wallet_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM wallets w WHERE w.owner_id = auth.uid() AND w.id IN (debit_wallet_id, credit_wallet_id)));

INSERT INTO locales (code, name, native_name, direction, is_default, sort_order) VALUES
  ('ar', 'Arabic', 'العربية', 'rtl', false, 10), ('en', 'English', 'English', 'ltr', true, 20);
INSERT INTO currencies (code, name, symbol, minor_unit, rounding_increment, is_base) VALUES
  ('USD', 'US Dollar', '$', 2, 1, true), ('LBP', 'Lebanese Pound', 'ل.ل', 0, 1000, false),
  ('EUR', 'Euro', '€', 2, 1, false), ('SAR', 'Saudi Riyal', 'ر.س', 2, 5, false), ('AED', 'UAE Dirham', 'د.إ', 2, 5, false);
