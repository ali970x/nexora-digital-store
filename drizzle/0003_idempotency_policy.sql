CREATE POLICY "deny_direct_idempotency_access" ON idempotency_keys FOR ALL TO authenticated
  USING (false) WITH CHECK (false);
