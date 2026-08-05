import {sql} from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', {withTimezone: true, mode: 'date'}).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', {withTimezone: true, mode: 'date'}).notNull().defaultNow()
};

export const accountType = pgEnum('wallet_account_type', [
  'customer',
  'platform_cash',
  'platform_revenue',
  'platform_liability',
  'supplier',
  'affiliate'
]);
export const walletTransactionType = pgEnum('wallet_transaction_type', [
  'top_up',
  'purchase',
  'refund',
  'admin_adjustment',
  'affiliate_commission',
  'cashback',
  'hold',
  'release'
]);
export const transactionStatus = pgEnum('wallet_transaction_status', ['posted', 'reversed']);
export const userRole = pgEnum('user_role', [
  'customer',
  'reseller',
  'affiliate',
  'support',
  'fulfiller',
  'finance',
  'admin',
  'owner'
]);
export const kycStatus = pgEnum('kyc_status', [
  'not_required',
  'not_started',
  'pending',
  'approved',
  'rejected'
]);
export const notificationChannel = pgEnum('notification_channel', [
  'email',
  'whatsapp',
  'telegram',
  'push',
  'in_app'
]);

export const locales = pgTable(
  'locales',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    nativeName: text('native_name').notNull(),
    direction: text('direction').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    isDefault: boolean('is_default').notNull().default(false),
    fallbackCode: text('fallback_code'),
    intlLocale: text('intl_locale').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps
  },
  (table) => [
    uniqueIndex('locales_code_uidx').on(table.code),
    check('locales_code_ck', sql`${table.code} ~ '^[a-z]{2}(-[A-Z]{2})?$'`),
    check('locales_direction_ck', sql`${table.direction} in ('ltr', 'rtl')`)
  ]
);

export const currencies = pgTable(
  'currencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    symbol: text('symbol').notNull(),
    minorUnit: integer('minor_unit').notNull().default(2),
    roundingIncrement: bigint('rounding_increment', {mode: 'number'}).notNull().default(1),
    enabled: boolean('enabled').notNull().default(true),
    isBase: boolean('is_base').notNull().default(false),
    exchangeRateMinor: bigint('exchange_rate_minor', {mode: 'number'}).notNull().default(1000000),
    rateScale: integer('rate_scale').notNull().default(6),
    rateUpdatedAt: timestamp('rate_updated_at', {withTimezone: true, mode: 'date'}),
    manualRateOverride: boolean('manual_rate_override').notNull().default(false),
    ...timestamps
  },
  (table) => [
    uniqueIndex('currencies_code_uidx').on(table.code),
    check('currencies_code_ck', sql`${table.code} ~ '^[A-Z]{3}$'`),
    check('currencies_minor_unit_ck', sql`${table.minorUnit} between 0 and 3`),
    check('currencies_rounding_ck', sql`${table.roundingIncrement} > 0`)
  ]
);

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    displayName: text('display_name'),
    phone: text('phone'),
    phoneVerified: boolean('phone_verified').notNull().default(false),
    localeCode: text('locale_code').notNull().default('en'),
    currencyCode: text('currency_code').notNull().default('USD'),
    timezone: text('timezone').notNull().default('UTC'),
    countryCode: text('country_code'),
    avatarPath: text('avatar_path'),
    marketingConsent: boolean('marketing_consent').notNull().default(false),
    marketingConsentAt: timestamp('marketing_consent_at', {withTimezone: true, mode: 'date'}),
    referredBy: uuid('referred_by'),
    kycStatus: kycStatus('kyc_status').notNull().default('not_required'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    deletedAt: timestamp('deleted_at', {withTimezone: true, mode: 'date'}),
    ...timestamps
  },
  (table) => [
    index('profiles_phone_idx').on(table.phone),
    index('profiles_deleted_at_idx').on(table.deletedAt),
    index('profiles_referred_by_idx').on(table.referredBy),
    foreignKey({
      name: 'profiles_referred_by_fk',
      columns: [table.referredBy],
      foreignColumns: [table.id]
    }).onDelete('set null')
  ]
);

export const profileRoles = pgTable(
  'profile_roles',
  {
    id: uuid('id').notNull().defaultRandom(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, {onDelete: 'cascade'}),
    role: userRole('role').notNull(),
    grantedBy: uuid('granted_by').references(() => profiles.id, {onDelete: 'set null'}),
    expiresAt: timestamp('expires_at', {withTimezone: true, mode: 'date'}),
    ...timestamps
  },
  (table) => [
    primaryKey({name: 'profile_roles_pk', columns: [table.profileId, table.role]}),
    uniqueIndex('profile_roles_id_uidx').on(table.id),
    index('profile_roles_role_idx').on(table.role, table.profileId)
  ]
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').notNull().defaultRandom(),
    role: userRole('role').notNull(),
    permission: text('permission').notNull(),
    description: text('description'),
    ...timestamps
  },
  (table) => [
    primaryKey({name: 'role_permissions_pk', columns: [table.role, table.permission]}),
    uniqueIndex('role_permissions_id_uidx').on(table.id),
    index('role_permissions_permission_idx').on(table.permission, table.role)
  ]
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, {onDelete: 'cascade'}),
    channel: notificationChannel('channel').notNull(),
    transactional: boolean('transactional').notNull().default(true),
    orderUpdates: boolean('order_updates').notNull().default(true),
    securityAlerts: boolean('security_alerts').notNull().default(true),
    promotions: boolean('promotions').notNull().default(false),
    ...timestamps
  },
  (table) => [
    uniqueIndex('notification_preferences_profile_channel_uidx').on(table.profileId, table.channel),
    index('notification_preferences_profile_idx').on(table.profileId)
  ]
);

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, {onDelete: 'cascade'}),
    userAgent: text('user_agent'),
    deviceName: text('device_name').notNull().default('unknown'),
    ipHash: text('ip_hash'),
    countryCode: text('country_code'),
    lastSeenAt: timestamp('last_seen_at', {withTimezone: true, mode: 'date'})
      .notNull()
      .defaultNow(),
    revokedAt: timestamp('revoked_at', {withTimezone: true, mode: 'date'}),
    ...timestamps
  },
  (table) => [
    index('user_sessions_profile_active_idx').on(table.profileId, table.revokedAt),
    index('user_sessions_last_seen_idx').on(table.lastSeenAt)
  ]
);

export const wallets = pgTable(
  'wallets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id'),
    accountType: accountType('account_type').notNull(),
    currencyCode: text('currency_code').notNull(),
    cachedBalance: bigint('cached_balance', {mode: 'number'}).notNull().default(0),
    locked: boolean('locked').notNull().default(false),
    label: text('label'),
    ...timestamps
  },
  (table) => [
    uniqueIndex('wallets_owner_currency_uidx').on(table.ownerId, table.currencyCode),
    index('wallets_account_type_idx').on(table.accountType),
    check(
      'wallets_owner_ck',
      sql`${table.ownerId} is not null or ${table.accountType} <> 'customer'`
    )
  ]
);

export const walletTransactions = pgTable(
  'wallet_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    debitWalletId: uuid('debit_wallet_id')
      .notNull()
      .references(() => wallets.id),
    creditWalletId: uuid('credit_wallet_id')
      .notNull()
      .references(() => wallets.id),
    type: walletTransactionType('type').notNull(),
    status: transactionStatus('status').notNull().default('posted'),
    amount: bigint('amount', {mode: 'number'}).notNull(),
    currencyCode: text('currency_code').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    referenceType: text('reference_type').notNull(),
    referenceId: uuid('reference_id'),
    reason: text('reason'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    reversalOfId: uuid('reversal_of_id'),
    createdBy: uuid('created_by'),
    ...timestamps
  },
  (table) => [
    uniqueIndex('wallet_transactions_idempotency_uidx').on(table.idempotencyKey),
    uniqueIndex('wallet_transactions_reversal_uidx').on(table.reversalOfId),
    index('wallet_transactions_debit_created_idx').on(table.debitWalletId, table.createdAt),
    index('wallet_transactions_credit_created_idx').on(table.creditWalletId, table.createdAt),
    index('wallet_transactions_reference_idx').on(table.referenceType, table.referenceId),
    check('wallet_transactions_amount_ck', sql`${table.amount} > 0`),
    check(
      'wallet_transactions_distinct_accounts_ck',
      sql`${table.debitWalletId} <> ${table.creditWalletId}`
    ),
    check(
      'wallet_transactions_adjustment_reason_ck',
      sql`${table.type} <> 'admin_adjustment' or ${table.reason} is not null`
    )
  ]
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: text('scope').notNull(),
    key: text('key').notNull(),
    actorId: uuid('actor_id'),
    requestHash: text('request_hash').notNull(),
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body').$type<Record<string, unknown>>(),
    lockedUntil: timestamp('locked_until', {withTimezone: true, mode: 'date'}),
    expiresAt: timestamp('expires_at', {withTimezone: true, mode: 'date'}).notNull(),
    ...timestamps
  },
  (table) => [
    uniqueIndex('idempotency_keys_scope_key_uidx').on(table.scope, table.key),
    index('idempotency_keys_expires_at_idx').on(table.expiresAt)
  ]
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id'),
    actorType: text('actor_type').notNull(),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: uuid('resource_id'),
    before: jsonb('before').$type<Record<string, unknown>>(),
    after: jsonb('after').$type<Record<string, unknown>>(),
    reason: text('reason'),
    requestId: text('request_id'),
    ipHash: text('ip_hash'),
    userAgentHash: text('user_agent_hash'),
    createdAt: timestamp('created_at', {withTimezone: true, mode: 'date'}).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', {withTimezone: true, mode: 'date'}).notNull().defaultNow()
  },
  (table) => [
    index('audit_logs_resource_idx').on(table.resourceType, table.resourceId, table.createdAt),
    index('audit_logs_actor_idx').on(table.actorId, table.createdAt)
  ]
);
