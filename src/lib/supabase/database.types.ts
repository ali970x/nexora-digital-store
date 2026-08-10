export type Json = string | number | boolean | null | {[key: string]: Json | undefined} | Json[];

export type UserRole =
  'customer' | 'reseller' | 'affiliate' | 'support' | 'fulfiller' | 'finance' | 'admin' | 'owner';
export type KycStatus = 'not_required' | 'not_started' | 'pending' | 'approved' | 'rejected';
export type NotificationChannel = 'email' | 'whatsapp' | 'telegram' | 'push' | 'in_app';
export type ProductStatus = 'draft' | 'active' | 'out_of_stock' | 'coming_soon' | 'archived';
export type FulfillmentMode = 'auto' | 'manual' | 'auto_then_manual';
export type CatalogMediaKind = 'image' | 'video' | 'logo';
export type QuoteRequestStatus =
  'submitted' | 'reviewing' | 'quoted' | 'accepted' | 'declined' | 'cancelled';
export type WalletAccountType =
  | 'customer'
  | 'platform_cash'
  | 'platform_revenue'
  | 'platform_liability'
  | 'supplier'
  | 'affiliate'
  | 'customer_hold';
export type WalletTransactionType =
  | 'top_up'
  | 'purchase'
  | 'refund'
  | 'admin_adjustment'
  | 'affiliate_commission'
  | 'cashback'
  | 'hold'
  | 'release'
  | 'topup'
  | 'commission'
  | 'bonus'
  | 'payout'
  | 'fee'
  | 'chargeback';

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

export type WalletRow = {
  id: string;
  owner_id: string | null;
  account_type: WalletAccountType;
  currency_code: string;
  cached_balance: number;
  locked: boolean;
  label: string | null;
  frozen_at: string | null;
  frozen_by: string | null;
  freeze_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type WalletTransactionRow = {
  id: string;
  debit_wallet_id: string;
  credit_wallet_id: string;
  type: WalletTransactionType;
  status: 'posted' | 'reversed';
  amount: number;
  currency_code: string;
  idempotency_scope: string;
  idempotency_key: string;
  reference_type: string;
  reference_id: string | null;
  reason: string | null;
  metadata: Json;
  reversal_of_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type WalletReconciliationRow = {
  id: string;
  wallet_id: string;
  derived_balance: number;
  cached_balance: number;
  difference: number;
  status: 'matched' | 'mismatch';
  checked_at: string;
  created_at: string;
  updated_at: string;
};

export type AdminAlertRow = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  alert_type: string;
  title: Json;
  message: Json;
  resource_type: string;
  resource_id: string | null;
  fingerprint: string;
  status: 'open' | 'acknowledged' | 'resolved';
  metadata: Json;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductTypeRow = {
  id: string;
  code: string;
  name: Json;
  description: Json;
  icon_name: string | null;
  enabled: boolean;
  sort_order: number;
  capabilities: Json;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: string;
  parent_id: string | null;
  slug: string;
  name: Json;
  description: Json;
  icon_name: string | null;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  seo: Json;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  id: string;
  category_id: string;
  product_type_code: string;
  slug: string;
  name: Json;
  short_description: Json;
  description: Json;
  badges: Json;
  status: ProductStatus;
  fulfillment_mode: FulfillmentMode;
  warranty_text: Json;
  delivery_estimate: Json;
  input_schema: Json;
  seo: Json;
  featured: boolean;
  sort_order: number;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  search_text: string;
  search_vector: unknown;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductVariantRow = {
  id: string;
  product_id: string;
  sku: string;
  name: Json;
  price_amount: number;
  currency_code: string;
  stock_quantity: number;
  unlimited_stock: boolean;
  region_code: string | null;
  duration_days: number | null;
  denomination_amount: number | null;
  denomination_currency_code: string | null;
  account_type: string | null;
  attributes: Json;
  active: boolean;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductMediaRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  kind: CatalogMediaKind;
  url: string | null;
  storage_path: string | null;
  alt_text: Json;
  blur_data_url: string | null;
  sort_order: number;
  is_primary: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SmmProductConfigRow = {
  id: string;
  variant_id: string;
  min_quantity: number;
  max_quantity: number;
  quantity_step: number;
  price_per_1000_amount: number;
  currency_code: string;
  drip_feed_enabled: boolean;
  max_drip_runs: number | null;
  min_drip_interval_minutes: number | null;
  created_at: string;
  updated_at: string;
};

export type ServiceProductConfigRow = {
  id: string;
  product_id: string;
  requirement_schema: Json;
  milestone_templates: Json;
  included_revisions: number;
  custom_quote_required: boolean;
  created_at: string;
  updated_at: string;
};

export type ServiceQuoteRequestRow = {
  id: string;
  profile_id: string;
  product_id: string;
  variant_id: string | null;
  requirements: Json;
  budget_min_amount: number | null;
  budget_max_amount: number | null;
  currency_code: string | null;
  desired_due_at: string | null;
  status: QuoteRequestStatus;
  assigned_to: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CatalogSearchRow = {
  id: string;
  slug: string;
  name: Json;
  short_description: Json;
  badges: Json;
  status: ProductStatus;
  product_type_code: string;
  category_slug: string;
  price_amount: number;
  currency_code: string;
  primary_media_url: string | null;
  search_rank: number;
  total_count: number;
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
      wallets: TableDefinition<
        WalletRow,
        Partial<WalletRow> & {account_type: WalletAccountType; currency_code: string}
      >;
      wallet_transactions: TableDefinition<
        WalletTransactionRow,
        Partial<WalletTransactionRow> & {
          debit_wallet_id: string;
          credit_wallet_id: string;
          type: WalletTransactionType;
          amount: number;
          currency_code: string;
          idempotency_scope: string;
          idempotency_key: string;
          reference_type: string;
        }
      >;
      wallet_reconciliations: TableDefinition<
        WalletReconciliationRow,
        Partial<WalletReconciliationRow> & {
          wallet_id: string;
          derived_balance: number;
          cached_balance: number;
          difference: number;
          status: 'matched' | 'mismatch';
        }
      >;
      admin_alerts: TableDefinition<
        AdminAlertRow,
        Partial<AdminAlertRow> & {
          severity: 'info' | 'warning' | 'critical';
          alert_type: string;
          title: Json;
          message: Json;
          resource_type: string;
          fingerprint: string;
        }
      >;
      product_types: TableDefinition<
        ProductTypeRow,
        Partial<ProductTypeRow> & {code: string; name: Json}
      >;
      categories: TableDefinition<CategoryRow, Partial<CategoryRow> & {slug: string; name: Json}>;
      category_closure: TableDefinition<
        {
          id: string;
          ancestor_id: string;
          descendant_id: string;
          depth: number;
          created_at: string;
          updated_at: string;
        },
        {
          ancestor_id: string;
          descendant_id: string;
          depth: number;
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      products: TableDefinition<
        ProductRow,
        Partial<ProductRow> & {
          category_id: string;
          product_type_code: string;
          slug: string;
          name: Json;
        }
      >;
      product_variants: TableDefinition<
        ProductVariantRow,
        Partial<ProductVariantRow> & {
          product_id: string;
          sku: string;
          name: Json;
          price_amount: number;
          currency_code: string;
        }
      >;
      product_variant_costs: TableDefinition<
        {
          id: string;
          variant_id: string;
          cost_amount: number;
          currency_code: string;
          source: string;
          created_at: string;
          updated_at: string;
        },
        {
          variant_id: string;
          cost_amount: number;
          currency_code: string;
          source?: string;
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      product_media: TableDefinition<
        ProductMediaRow,
        Partial<ProductMediaRow> & {product_id: string; alt_text: Json}
      >;
      product_relations: TableDefinition<
        {
          id: string;
          product_id: string;
          related_product_id: string;
          relation_type: string;
          score: number;
          sort_order: number;
          created_at: string;
          updated_at: string;
        },
        {
          product_id: string;
          related_product_id: string;
          relation_type?: string;
          score?: number;
          sort_order?: number;
          id?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      smm_product_configs: TableDefinition<
        SmmProductConfigRow,
        Partial<SmmProductConfigRow> & {
          variant_id: string;
          min_quantity: number;
          max_quantity: number;
          price_per_1000_amount: number;
          currency_code: string;
        }
      >;
      service_product_configs: TableDefinition<
        ServiceProductConfigRow,
        Partial<ServiceProductConfigRow> & {product_id: string}
      >;
      service_quote_requests: TableDefinition<
        ServiceQuoteRequestRow,
        Partial<ServiceQuoteRequestRow> & {
          profile_id: string;
          product_id: string;
          requirements: Json;
        }
      >;
      recently_viewed_products: TableDefinition<
        {
          id: string;
          profile_id: string;
          product_id: string;
          viewed_at: string;
          created_at: string;
          updated_at: string;
        },
        {
          profile_id: string;
          product_id: string;
          id?: string;
          viewed_at?: string;
          created_at?: string;
          updated_at?: string;
        }
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
      search_catalog: {
        Args: {
          p_locale?: string;
          p_query?: string | null;
          p_category_slug?: string | null;
          p_product_type?: string | null;
          p_region?: string | null;
          p_min_price?: number | null;
          p_max_price?: number | null;
          p_sort?: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: CatalogSearchRow[];
      };
      wallet_credit: {
        Args: {
          p_owner_id: string;
          p_currency_code: string;
          p_amount: number;
          p_type: WalletTransactionType;
          p_idempotency_key: string;
          p_reference_type: string;
          p_reference_id?: string | null;
          p_reason?: string | null;
          p_metadata?: Json;
        };
        Returns: WalletTransactionRow;
      };
      wallet_debit: {
        Args: {
          p_owner_id: string;
          p_currency_code: string;
          p_amount: number;
          p_type: WalletTransactionType;
          p_idempotency_key: string;
          p_reference_type: string;
          p_reference_id?: string | null;
          p_reason?: string | null;
          p_metadata?: Json;
        };
        Returns: WalletTransactionRow;
      };
      wallet_hold: {
        Args: {
          p_owner_id: string;
          p_currency_code: string;
          p_amount: number;
          p_idempotency_key: string;
          p_reference_type: string;
          p_reference_id?: string | null;
          p_metadata?: Json;
        };
        Returns: WalletTransactionRow;
      };
      wallet_release: {
        Args: {
          p_owner_id: string;
          p_currency_code: string;
          p_amount: number;
          p_idempotency_key: string;
          p_reference_type: string;
          p_reference_id?: string | null;
          p_metadata?: Json;
        };
        Returns: WalletTransactionRow;
      };
      wallet_admin_adjust: {
        Args: {
          p_owner_id: string;
          p_currency_code: string;
          p_signed_amount: number;
          p_idempotency_key: string;
          p_reason: string;
        };
        Returns: WalletTransactionRow;
      };
      wallet_set_frozen: {
        Args: {p_wallet_id: string; p_frozen: boolean; p_reason: string; p_request_id: string};
        Returns: WalletRow;
      };
      run_wallet_reconciliation: {Args: Record<never, never>; Returns: number};
    };
    Enums: {
      user_role: UserRole;
      kyc_status: KycStatus;
      notification_channel: NotificationChannel;
      product_status: ProductStatus;
      fulfillment_mode: FulfillmentMode;
      catalog_media_kind: CatalogMediaKind;
      quote_request_status: QuoteRequestStatus;
      wallet_account_type: WalletAccountType;
      wallet_transaction_type: WalletTransactionType;
      wallet_transaction_status: 'posted' | 'reversed';
    };
    CompositeTypes: Record<never, never>;
  };
};
