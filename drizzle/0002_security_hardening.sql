CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER EXTENSION citext SET SCHEMA extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

REVOKE ALL ON FUNCTION public.app_can(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_has_role(user_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.post_wallet_transaction(uuid, uuid, wallet_transaction_type, bigint, text, text, text, uuid, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_user_session(text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_user_session(uuid) FROM PUBLIC, anon;

ALTER FUNCTION public.app_can(text) SET SCHEMA private;
ALTER FUNCTION public.app_has_role(user_role) SET SCHEMA private;
ALTER FUNCTION public.handle_new_auth_user() SET SCHEMA private;

DROP POLICY IF EXISTS "public_read_enabled_locales" ON locales;
DROP POLICY IF EXISTS "read_enabled_or_manage_locales" ON locales;
DROP POLICY IF EXISTS "manage_locales" ON locales;
CREATE POLICY "read_enabled_or_manage_locales" ON locales FOR SELECT
  USING (enabled OR (SELECT private.app_can('settings.manage')));
CREATE POLICY "insert_locales" ON locales FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.app_can('settings.manage')));
CREATE POLICY "update_locales" ON locales FOR UPDATE TO authenticated
  USING ((SELECT private.app_can('settings.manage')))
  WITH CHECK ((SELECT private.app_can('settings.manage')));
CREATE POLICY "delete_locales" ON locales FOR DELETE TO authenticated
  USING ((SELECT private.app_can('settings.manage')));

DROP POLICY IF EXISTS "public_read_enabled_currencies" ON currencies;
DROP POLICY IF EXISTS "read_enabled_or_manage_currencies" ON currencies;
DROP POLICY IF EXISTS "manage_currencies" ON currencies;
CREATE POLICY "read_enabled_or_manage_currencies" ON currencies FOR SELECT
  USING (enabled OR (SELECT private.app_can('settings.manage')));
CREATE POLICY "insert_currencies" ON currencies FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.app_can('settings.manage')));
CREATE POLICY "update_currencies" ON currencies FOR UPDATE TO authenticated
  USING ((SELECT private.app_can('settings.manage')))
  WITH CHECK ((SELECT private.app_can('settings.manage')));
CREATE POLICY "delete_currencies" ON currencies FOR DELETE TO authenticated
  USING ((SELECT private.app_can('settings.manage')));

DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "staff_read_profiles" ON profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_or_staff_read_profiles" ON profiles FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR (SELECT private.app_can('identity.manage'))
    OR (SELECT private.app_can('support.manage'))
  );
CREATE POLICY "users_insert_own_profile" ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_read_own_roles" ON profile_roles;
DROP POLICY IF EXISTS "identity_manage_roles" ON profile_roles;
CREATE POLICY "users_or_staff_read_roles" ON profile_roles FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()) OR (SELECT private.app_can('identity.manage')));
CREATE POLICY "identity_insert_roles" ON profile_roles FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.app_can('identity.manage')));
CREATE POLICY "identity_update_roles" ON profile_roles FOR UPDATE TO authenticated
  USING ((SELECT private.app_can('identity.manage')))
  WITH CHECK ((SELECT private.app_can('identity.manage')));
CREATE POLICY "identity_delete_roles" ON profile_roles FOR DELETE TO authenticated
  USING ((SELECT private.app_can('identity.manage')));

DROP POLICY IF EXISTS "authenticated_read_permissions" ON role_permissions;
DROP POLICY IF EXISTS "owner_manage_permissions" ON role_permissions;
CREATE POLICY "authenticated_read_permissions" ON role_permissions FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "owner_insert_permissions" ON role_permissions FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.app_has_role('owner')));
CREATE POLICY "owner_update_permissions" ON role_permissions FOR UPDATE TO authenticated
  USING ((SELECT private.app_has_role('owner')))
  WITH CHECK ((SELECT private.app_has_role('owner')));
CREATE POLICY "owner_delete_permissions" ON role_permissions FOR DELETE TO authenticated
  USING ((SELECT private.app_has_role('owner')));

DROP POLICY IF EXISTS "users_manage_notification_preferences" ON notification_preferences;
CREATE POLICY "users_manage_notification_preferences" ON notification_preferences FOR ALL TO authenticated
  USING (profile_id = (SELECT auth.uid())) WITH CHECK (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_read_own_sessions" ON user_sessions;
DROP POLICY IF EXISTS "deny_direct_session_mutation" ON user_sessions;
CREATE POLICY "users_read_own_sessions" ON user_sessions FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "staff_read_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "deny_direct_audit_mutation" ON audit_logs;
CREATE POLICY "staff_read_audit_logs" ON audit_logs FOR SELECT TO authenticated
  USING (
    (SELECT private.app_can('identity.manage'))
    OR (SELECT private.app_can('finance.manage'))
  );

DROP POLICY IF EXISTS "deny_direct_idempotency_access" ON idempotency_keys;
CREATE POLICY "deny_direct_idempotency_access" ON idempotency_keys FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "users_read_own_wallets" ON wallets;
CREATE POLICY "users_read_own_wallets" ON wallets FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_read_own_wallet_transactions" ON wallet_transactions;
CREATE POLICY "users_read_own_wallet_transactions" ON wallet_transactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wallets w
      WHERE w.owner_id = (SELECT auth.uid())
        AND w.id IN (debit_wallet_id, credit_wallet_id)
    )
  );

DROP POLICY IF EXISTS "users_read_own_avatars" ON storage.objects;
DROP POLICY IF EXISTS "users_upload_own_avatars" ON storage.objects;
DROP POLICY IF EXISTS "users_update_own_avatars" ON storage.objects;
DROP POLICY IF EXISTS "users_delete_own_avatars" ON storage.objects;
CREATE POLICY "users_read_own_avatars" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "users_upload_own_avatars" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "users_update_own_avatars" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY "users_delete_own_avatars" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
