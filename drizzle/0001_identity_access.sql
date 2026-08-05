CREATE TYPE "user_role" AS ENUM (
  'customer', 'reseller', 'affiliate', 'support', 'fulfiller', 'finance', 'admin', 'owner'
);
CREATE TYPE "kyc_status" AS ENUM (
  'not_required', 'not_started', 'pending', 'approved', 'rejected'
);
CREATE TYPE "notification_channel" AS ENUM (
  'email', 'whatsapp', 'telegram', 'push', 'in_app'
);

ALTER TABLE "locales"
  ADD COLUMN "fallback_code" text REFERENCES "locales"("code") ON DELETE SET NULL,
  ADD COLUMN "intl_locale" text;
UPDATE "locales" SET "intl_locale" = "code" WHERE "intl_locale" IS NULL;
ALTER TABLE "locales" ALTER COLUMN "intl_locale" SET NOT NULL;
ALTER TABLE "locales" ADD CONSTRAINT "locales_no_self_fallback_ck"
  CHECK (fallback_code IS NULL OR fallback_code <> code);

ALTER TABLE "currencies"
  ADD COLUMN "exchange_rate_minor" bigint NOT NULL DEFAULT 1000000,
  ADD COLUMN "rate_scale" integer NOT NULL DEFAULT 6,
  ADD COLUMN "rate_updated_at" timestamptz,
  ADD COLUMN "manual_rate_override" boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT "currencies_exchange_rate_ck" CHECK (exchange_rate_minor > 0),
  ADD CONSTRAINT "currencies_rate_scale_ck" CHECK (rate_scale BETWEEN 0 AND 12);

ALTER TABLE "profiles"
  ADD COLUMN "phone_verified" boolean NOT NULL DEFAULT false,
  ADD COLUMN "marketing_consent" boolean NOT NULL DEFAULT false,
  ADD COLUMN "marketing_consent_at" timestamptz,
  ADD COLUMN "referred_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  ADD COLUMN "kyc_status" kyc_status NOT NULL DEFAULT 'not_required',
  ADD CONSTRAINT "profiles_not_self_referred_ck" CHECK (referred_by IS NULL OR referred_by <> id),
  ADD CONSTRAINT "profiles_marketing_consent_ck"
    CHECK (marketing_consent = false OR marketing_consent_at IS NOT NULL);
CREATE INDEX "profiles_referred_by_idx" ON "profiles"("referred_by");

CREATE TABLE "profile_roles" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "role" user_role NOT NULL,
  "granted_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "expires_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "profile_roles_pk" PRIMARY KEY ("profile_id", "role")
);
CREATE UNIQUE INDEX "profile_roles_id_uidx" ON "profile_roles"("id");
CREATE INDEX "profile_roles_role_idx" ON "profile_roles"("role", "profile_id");

CREATE TABLE "role_permissions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "role" user_role NOT NULL,
  "permission" text NOT NULL,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "role_permissions_pk" PRIMARY KEY ("role", "permission"),
  CONSTRAINT "role_permissions_name_ck" CHECK (permission ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$')
);
CREATE UNIQUE INDEX "role_permissions_id_uidx" ON "role_permissions"("id");
CREATE INDEX "role_permissions_permission_idx" ON "role_permissions"("permission", "role");

CREATE TABLE "notification_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "channel" notification_channel NOT NULL,
  "transactional" boolean NOT NULL DEFAULT true,
  "order_updates" boolean NOT NULL DEFAULT true,
  "security_alerts" boolean NOT NULL DEFAULT true,
  "promotions" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "notification_preferences_security_ck" CHECK (security_alerts = true)
);
CREATE UNIQUE INDEX "notification_preferences_profile_channel_uidx"
  ON "notification_preferences"("profile_id", "channel");
CREATE INDEX "notification_preferences_profile_idx" ON "notification_preferences"("profile_id");

CREATE TABLE "user_sessions" (
  "id" uuid PRIMARY KEY,
  "profile_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "user_agent" text,
  "device_name" text NOT NULL DEFAULT 'unknown',
  "ip_hash" text,
  "country_code" text,
  "last_seen_at" timestamptz NOT NULL DEFAULT now(),
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "user_sessions_country_ck" CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$')
);
CREATE INDEX "user_sessions_profile_active_idx" ON "user_sessions"("profile_id", "revoked_at");
CREATE INDEX "user_sessions_last_seen_idx" ON "user_sessions"("last_seen_at" DESC);

INSERT INTO profile_roles (profile_id, role)
  SELECT id, 'customer' FROM profiles ON CONFLICT DO NOTHING;
INSERT INTO notification_preferences (profile_id, channel)
  SELECT profiles.id, channels.channel
  FROM profiles CROSS JOIN unnest(enum_range(NULL::notification_channel)) AS channels(channel)
  ON CONFLICT DO NOTHING;

CREATE TRIGGER profile_roles_updated_at BEFORE UPDATE ON profile_roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER role_permissions_updated_at BEFORE UPDATE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER user_sessions_updated_at BEFORE UPDATE ON user_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION app_has_role(required_role user_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM profile_roles
    WHERE profile_id = auth.uid()
      AND role = required_role
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;
REVOKE ALL ON FUNCTION app_has_role(user_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_has_role(user_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_can(required_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profile_roles pr
    JOIN role_permissions rp ON rp.role = pr.role
    WHERE pr.profile_id = auth.uid()
      AND rp.permission = required_permission
      AND (pr.expires_at IS NULL OR pr.expires_at > now())
  );
$$;
REVOKE ALL ON FUNCTION app_can(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_can(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE requested_locale text;
DECLARE requested_currency text;
BEGIN
  requested_locale := COALESCE(NEW.raw_user_meta_data ->> 'locale', 'en');
  requested_currency := COALESCE(NEW.raw_user_meta_data ->> 'currency', 'USD');

  IF NOT EXISTS (SELECT 1 FROM locales WHERE code = requested_locale AND enabled) THEN
    requested_locale := 'en';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM currencies WHERE code = requested_currency AND enabled) THEN
    requested_currency := 'USD';
  END IF;

  INSERT INTO profiles (
    id, display_name, phone, phone_verified, locale_code, currency_code, timezone,
    country_code, marketing_consent, marketing_consent_at
  ) VALUES (
    NEW.id,
    NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''),
    NEW.phone,
    NEW.phone_confirmed_at IS NOT NULL,
    requested_locale,
    requested_currency,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'timezone', ''), 'UTC'),
    NULLIF(upper(NEW.raw_user_meta_data ->> 'country'), ''),
    COALESCE((NEW.raw_user_meta_data ->> 'marketing_consent')::boolean, false),
    CASE WHEN COALESCE((NEW.raw_user_meta_data ->> 'marketing_consent')::boolean, false)
      THEN now() ELSE NULL END
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO profile_roles (profile_id, role) VALUES (NEW.id, 'customer')
    ON CONFLICT DO NOTHING;
  INSERT INTO notification_preferences (profile_id, channel)
    SELECT NEW.id, channel FROM unnest(enum_range(NULL::notification_channel)) AS channel
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

CREATE OR REPLACE FUNCTION touch_user_session(
  p_device_name text,
  p_user_agent text DEFAULT NULL,
  p_ip_hash text DEFAULT NULL,
  p_country_code text DEFAULT NULL
) RETURNS user_sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE session_uuid uuid;
DECLARE touched user_sessions;
BEGIN
  session_uuid := NULLIF(auth.jwt() ->> 'session_id', '')::uuid;
  IF auth.uid() IS NULL OR session_uuid IS NULL THEN RAISE EXCEPTION 'authenticated session required'; END IF;
  INSERT INTO user_sessions (id, profile_id, device_name, user_agent, ip_hash, country_code, last_seen_at)
  VALUES (session_uuid, auth.uid(), left(p_device_name, 120), left(p_user_agent, 512), p_ip_hash, p_country_code, now())
  ON CONFLICT (id) DO UPDATE SET last_seen_at = now(), device_name = EXCLUDED.device_name,
    user_agent = EXCLUDED.user_agent, ip_hash = COALESCE(EXCLUDED.ip_hash, user_sessions.ip_hash),
    country_code = COALESCE(EXCLUDED.country_code, user_sessions.country_code), revoked_at = NULL,
    updated_at = now()
  RETURNING * INTO touched;
  RETURN touched;
END;
$$;
REVOKE ALL ON FUNCTION touch_user_session(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION touch_user_session(text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION revoke_user_session(p_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_sessions WHERE id = p_session_id AND profile_id = auth.uid() AND revoked_at IS NULL
  ) THEN RAISE EXCEPTION 'session not found'; END IF;
  UPDATE user_sessions SET revoked_at = now(), updated_at = now() WHERE id = p_session_id;
  DELETE FROM auth.sessions WHERE id = p_session_id AND user_id = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION revoke_user_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION revoke_user_session(uuid) TO authenticated;

INSERT INTO role_permissions (role, permission, description) VALUES
  ('customer', 'account.read', 'Read the current account'),
  ('customer', 'account.update', 'Update the current account'),
  ('reseller', 'reseller.access', 'Access the reseller portal'),
  ('affiliate', 'affiliate.access', 'Access affiliate reporting'),
  ('support', 'support.manage', 'Manage support tickets and customer conversations'),
  ('fulfiller', 'fulfillment.manage', 'Claim and fulfill manual orders'),
  ('finance', 'finance.manage', 'Review payments, refunds, and financial reports'),
  ('admin', 'admin.access', 'Access administration'),
  ('admin', 'identity.manage', 'Manage users and role assignments'),
  ('admin', 'settings.manage', 'Manage platform locales and currencies'),
  ('owner', 'admin.access', 'Access administration'),
  ('owner', 'identity.manage', 'Manage users and role assignments'),
  ('owner', 'settings.manage', 'Manage platform locales and currencies'),
  ('owner', 'platform.own', 'Full platform ownership')
ON CONFLICT DO NOTHING;

ALTER TABLE profile_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_enabled_locales" ON locales;
CREATE POLICY "read_enabled_or_manage_locales" ON locales FOR SELECT
  USING (enabled OR app_can('settings.manage'));
CREATE POLICY "manage_locales" ON locales FOR ALL TO authenticated
  USING (app_can('settings.manage')) WITH CHECK (app_can('settings.manage'));

DROP POLICY IF EXISTS "public_read_enabled_currencies" ON currencies;
CREATE POLICY "read_enabled_or_manage_currencies" ON currencies FOR SELECT
  USING (enabled OR app_can('settings.manage'));
CREATE POLICY "manage_currencies" ON currencies FOR ALL TO authenticated
  USING (app_can('settings.manage')) WITH CHECK (app_can('settings.manage'));

CREATE POLICY "staff_read_profiles" ON profiles FOR SELECT TO authenticated
  USING (app_can('identity.manage') OR app_can('support.manage'));
CREATE POLICY "users_insert_own_profile" ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_read_own_roles" ON profile_roles FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
CREATE POLICY "identity_manage_roles" ON profile_roles FOR ALL TO authenticated
  USING (app_can('identity.manage')) WITH CHECK (app_can('identity.manage'));

CREATE POLICY "authenticated_read_permissions" ON role_permissions FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "owner_manage_permissions" ON role_permissions FOR ALL TO authenticated
  USING (app_has_role('owner')) WITH CHECK (app_has_role('owner'));

CREATE POLICY "users_manage_notification_preferences" ON notification_preferences FOR ALL TO authenticated
  USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "users_read_own_sessions" ON user_sessions FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
CREATE POLICY "deny_direct_session_mutation" ON user_sessions FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "staff_read_audit_logs" ON audit_logs FOR SELECT TO authenticated
  USING (app_can('identity.manage') OR app_can('finance.manage'));
CREATE POLICY "deny_direct_audit_mutation" ON audit_logs FOR ALL TO authenticated
  USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_idempotency_access" ON idempotency_keys FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
CREATE POLICY "users_read_own_avatars" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users_upload_own_avatars" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users_update_own_avatars" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users_delete_own_avatars" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (
  display_name, phone, locale_code, currency_code, timezone, country_code, avatar_path,
  marketing_consent, marketing_consent_at, updated_at
) ON profiles TO authenticated;

COMMENT ON FUNCTION app_can(text) IS 'Live permission check used by RLS and trusted server guards.';
COMMENT ON FUNCTION revoke_user_session(uuid) IS 'Revokes a single owned refresh session; existing access JWT expires naturally.';
