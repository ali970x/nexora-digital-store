-- Phase 3 follow-up: finance visibility, complete FK indexes, and alert timestamps.

INSERT INTO role_permissions(role, permission, description)
VALUES ('owner', 'finance.manage', 'Manage finance operations')
ON CONFLICT (role, permission) DO NOTHING;

DROP POLICY IF EXISTS users_or_staff_read_profiles ON profiles;
CREATE POLICY users_or_staff_read_profiles ON profiles FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR (SELECT private.app_can('identity.manage'))
    OR (SELECT private.app_can('support.manage'))
    OR (SELECT private.app_can('finance.manage'))
  );

CREATE INDEX IF NOT EXISTS wallets_currency_code_idx
  ON wallets(currency_code);
CREATE INDEX IF NOT EXISTS wallet_transactions_currency_code_idx
  ON wallet_transactions(currency_code);
CREATE INDEX IF NOT EXISTS wallet_transactions_created_by_idx
  ON wallet_transactions(created_by)
  WHERE created_by IS NOT NULL;

DROP TRIGGER IF EXISTS admin_alerts_updated_at ON admin_alerts;
CREATE TRIGGER admin_alerts_updated_at
  BEFORE UPDATE ON admin_alerts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON POLICY users_or_staff_read_profiles ON profiles IS
  'Owners can read themselves; identity, support, and finance staff can locate customers for authorized workflows.';
