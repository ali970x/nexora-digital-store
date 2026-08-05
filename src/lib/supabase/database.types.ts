export type Json = string | number | boolean | null | {[key: string]: Json | undefined} | Json[];

export type UserRole =
  'customer' | 'reseller' | 'affiliate' | 'support' | 'fulfiller' | 'finance' | 'admin' | 'owner';
export type KycStatus = 'not_required' | 'not_started' | 'pending' | 'approved' | 'rejected';
export type NotificationChannel = 'email' | 'whatsapp' | 'telegram' | 'push' | 'in_app';

type ProfileRow = {
  id: string;
  display_name: string | null;
  phone: string | null;
  phone_verified: boolean;
  locale_code: string;
  currency_code: string;
  timezone: string;
  country_code: string | null;
  avatar_path: string | null;
  marketing_consent: boolean;
  marketing_consent_at: string | null;
  referred_by: string | null;
  kyc_status: KycStatus;
  metadata: Json;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type LocaleRow = {
  id: string;
  code: string;
  name: string;
  native_name: string;
  direction: 'ltr' | 'rtl';
  enabled: boolean;
  is_default: boolean;
  fallback_code: string | null;
  intl_locale: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type CurrencyRow = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  minor_unit: number;
  rounding_increment: number;
  enabled: boolean;
  is_base: boolean;
  exchange_rate_minor: number;
  rate_scale: number;
  rate_updated_at: string | null;
  manual_rate_override: boolean;
  created_at: string;
  updated_at: string;
};

type ProfileRoleRow = {
  id: string;
  profile_id: string;
  role: UserRole;
  granted_by: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type RolePermissionRow = {
  id: string;
  role: UserRole;
  permission: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type NotificationPreferenceRow = {
  id: string;
  profile_id: string;
  channel: NotificationChannel;
  transactional: boolean;
  order_updates: boolean;
  security_alerts: boolean;
  promotions: boolean;
  created_at: string;
  updated_at: string;
};

type UserSessionRow = {
  id: string;
  profile_id: string;
  user_agent: string | null;
  device_name: string;
  ip_hash: string | null;
  country_code: string | null;
  last_seen_at: string;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

type TableDefinition<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<ProfileRow, Partial<ProfileRow> & {id: string}>;
      locales: TableDefinition<
        LocaleRow,
        Partial<LocaleRow> & {code: string; name: string; native_name: string; intl_locale: string}
      >;
      currencies: TableDefinition<
        CurrencyRow,
        Partial<CurrencyRow> & {code: string; name: string; symbol: string}
      >;
      profile_roles: TableDefinition<
        ProfileRoleRow,
        Partial<ProfileRoleRow> & {profile_id: string; role: UserRole}
      >;
      role_permissions: TableDefinition<
        RolePermissionRow,
        Partial<RolePermissionRow> & {role: UserRole; permission: string}
      >;
      notification_preferences: TableDefinition<
        NotificationPreferenceRow,
        Partial<NotificationPreferenceRow> & {profile_id: string; channel: NotificationChannel}
      >;
      user_sessions: TableDefinition<
        UserSessionRow,
        Partial<UserSessionRow> & {id: string; profile_id: string}
      >;
    };
    Views: Record<never, never>;
    Functions: {
      app_can: {Args: {required_permission: string}; Returns: boolean};
      app_has_role: {Args: {required_role: UserRole}; Returns: boolean};
      touch_user_session: {
        Args: {
          p_device_name: string;
          p_user_agent?: string | null;
          p_ip_hash?: string | null;
          p_country_code?: string | null;
        };
        Returns: UserSessionRow;
      };
      revoke_user_session: {Args: {p_session_id: string}; Returns: undefined};
    };
    Enums: {
      user_role: UserRole;
      kyc_status: KycStatus;
      notification_channel: NotificationChannel;
    };
    CompositeTypes: Record<never, never>;
  };
};
