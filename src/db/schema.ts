import {sql} from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  customType,
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
export const productStatus = pgEnum('product_status', [
  'draft',
  'active',
  'out_of_stock',
  'coming_soon',
  'archived'
]);
export const fulfillmentMode = pgEnum('fulfillment_mode', ['auto', 'manual', 'auto_then_manual']);
export const catalogMediaKind = pgEnum('catalog_media_kind', ['image', 'video', 'logo']);
export const quoteRequestStatus = pgEnum('quote_request_status', [
  'submitted',
  'reviewing',
  'quoted',
  'accepted',
  'declined',
  'cancelled'
]);

const tsvector = customType<{data: string}>({dataType: () => 'tsvector'});

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

export const productTypes = pgTable(
  'product_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    name: jsonb('name').$type<Record<string, string>>().notNull(),
    description: jsonb('description').$type<Record<string, string>>().notNull().default({}),
    iconName: text('icon_name'),
    enabled: boolean('enabled').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    capabilities: jsonb('capabilities').$type<Record<string, boolean>>().notNull().default({}),
    ...timestamps
  },
  (table) => [
    uniqueIndex('product_types_code_uidx').on(table.code),
    index('product_types_enabled_sort_idx').on(table.enabled, table.sortOrder),
    check('product_types_code_ck', sql`${table.code} ~ '^[a-z][a-z0-9_]{1,47}$'`)
  ]
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id'),
    slug: text('slug').notNull(),
    name: jsonb('name').$type<Record<string, string>>().notNull(),
    description: jsonb('description').$type<Record<string, string>>().notNull().default({}),
    iconName: text('icon_name'),
    imageUrl: text('image_url'),
    sortOrder: integer('sort_order').notNull().default(0),
    active: boolean('active').notNull().default(true),
    seo: jsonb('seo').$type<Record<string, unknown>>().notNull().default({}),
    createdBy: uuid('created_by').references(() => profiles.id, {onDelete: 'set null'}),
    updatedBy: uuid('updated_by').references(() => profiles.id, {onDelete: 'set null'}),
    deletedAt: timestamp('deleted_at', {withTimezone: true, mode: 'date'}),
    ...timestamps
  },
  (table) => [
    foreignKey({
      name: 'categories_parent_id_fkey',
      columns: [table.parentId],
      foreignColumns: [table.id]
    }).onDelete('restrict'),
    uniqueIndex('categories_slug_active_uidx')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    index('categories_parent_sort_idx').on(table.parentId, table.sortOrder),
    index('categories_active_sort_idx').on(table.active, table.sortOrder),
    check(
      'categories_not_self_parent_ck',
      sql`${table.parentId} is null or ${table.parentId} <> ${table.id}`
    )
  ]
);

export const categoryClosure = pgTable(
  'category_closure',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ancestorId: uuid('ancestor_id')
      .notNull()
      .references(() => categories.id, {onDelete: 'cascade'}),
    descendantId: uuid('descendant_id')
      .notNull()
      .references(() => categories.id, {onDelete: 'cascade'}),
    depth: integer('depth').notNull(),
    ...timestamps
  },
  (table) => [
    uniqueIndex('category_closure_pair_uidx').on(table.ancestorId, table.descendantId),
    index('category_closure_descendant_depth_idx').on(table.descendantId, table.depth),
    index('category_closure_ancestor_depth_idx').on(table.ancestorId, table.depth),
    check('category_closure_depth_ck', sql`${table.depth} >= 0`)
  ]
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, {onDelete: 'restrict'}),
    productTypeCode: text('product_type_code')
      .notNull()
      .references(() => productTypes.code, {onUpdate: 'cascade'}),
    slug: text('slug').notNull(),
    name: jsonb('name').$type<Record<string, string>>().notNull(),
    shortDescription: jsonb('short_description')
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    description: jsonb('description').$type<Record<string, string>>().notNull().default({}),
    badges: jsonb('badges').$type<Array<Record<string, string>>>().notNull().default([]),
    status: productStatus('status').notNull().default('draft'),
    fulfillmentMode: fulfillmentMode('fulfillment_mode').notNull().default('manual'),
    warrantyText: jsonb('warranty_text').$type<Record<string, string>>().notNull().default({}),
    deliveryEstimate: jsonb('delivery_estimate')
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    inputSchema: jsonb('input_schema')
      .$type<Array<Record<string, unknown>>>()
      .notNull()
      .default([]),
    seo: jsonb('seo').$type<Record<string, unknown>>().notNull().default({}),
    featured: boolean('featured').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    publishedAt: timestamp('published_at', {withTimezone: true, mode: 'date'}),
    createdBy: uuid('created_by').references(() => profiles.id, {onDelete: 'set null'}),
    updatedBy: uuid('updated_by').references(() => profiles.id, {onDelete: 'set null'}),
    searchText: text('search_text').notNull().default(''),
    searchVector: tsvector('search_vector')
      .notNull()
      .default(sql`''::tsvector`),
    deletedAt: timestamp('deleted_at', {withTimezone: true, mode: 'date'}),
    ...timestamps
  },
  (table) => [
    uniqueIndex('products_slug_active_uidx')
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    index('products_category_status_sort_idx').on(table.categoryId, table.status, table.sortOrder),
    index('products_type_status_idx').on(table.productTypeCode, table.status),
    index('products_published_idx').on(table.publishedAt, table.id)
  ]
);

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, {onDelete: 'cascade'}),
    sku: text('sku').notNull(),
    name: jsonb('name').$type<Record<string, string>>().notNull(),
    priceAmount: bigint('price_amount', {mode: 'number'}).notNull(),
    currencyCode: text('currency_code')
      .notNull()
      .references(() => currencies.code, {onUpdate: 'cascade'}),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    unlimitedStock: boolean('unlimited_stock').notNull().default(false),
    regionCode: text('region_code'),
    durationDays: integer('duration_days'),
    denominationAmount: bigint('denomination_amount', {mode: 'number'}),
    denominationCurrencyCode: text('denomination_currency_code').references(() => currencies.code, {
      onUpdate: 'cascade'
    }),
    accountType: text('account_type'),
    attributes: jsonb('attributes').$type<Record<string, unknown>>().notNull().default({}),
    active: boolean('active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    deletedAt: timestamp('deleted_at', {withTimezone: true, mode: 'date'}),
    ...timestamps
  },
  (table) => [
    uniqueIndex('product_variants_sku_active_uidx')
      .on(table.sku)
      .where(sql`${table.deletedAt} is null`),
    index('product_variants_product_active_sort_idx').on(
      table.productId,
      table.active,
      table.sortOrder
    ),
    index('product_variants_region_idx').on(table.regionCode),
    index('product_variants_price_idx').on(table.currencyCode, table.priceAmount),
    check('product_variants_price_ck', sql`${table.priceAmount} >= 0`),
    check('product_variants_stock_ck', sql`${table.stockQuantity} >= 0`)
  ]
);

export const productVariantCosts = pgTable(
  'product_variant_costs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, {onDelete: 'cascade'}),
    costAmount: bigint('cost_amount', {mode: 'number'}).notNull(),
    currencyCode: text('currency_code')
      .notNull()
      .references(() => currencies.code, {onUpdate: 'cascade'}),
    source: text('source').notNull().default('manual'),
    ...timestamps
  },
  (table) => [
    uniqueIndex('product_variant_costs_variant_uidx').on(table.variantId),
    check('product_variant_costs_amount_ck', sql`${table.costAmount} >= 0`)
  ]
);

export const productMedia = pgTable(
  'product_media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, {onDelete: 'cascade'}),
    variantId: uuid('variant_id').references(() => productVariants.id, {onDelete: 'cascade'}),
    kind: catalogMediaKind('kind').notNull().default('image'),
    url: text('url'),
    storagePath: text('storage_path'),
    altText: jsonb('alt_text').$type<Record<string, string>>().notNull().default({}),
    blurDataUrl: text('blur_data_url'),
    sortOrder: integer('sort_order').notNull().default(0),
    isPrimary: boolean('is_primary').notNull().default(false),
    deletedAt: timestamp('deleted_at', {withTimezone: true, mode: 'date'}),
    ...timestamps
  },
  (table) => [
    index('product_media_product_sort_idx').on(table.productId, table.sortOrder),
    index('product_media_variant_idx').on(table.variantId),
    check('product_media_source_ck', sql`num_nonnulls(${table.url}, ${table.storagePath}) = 1`)
  ]
);

export const productRelations = pgTable(
  'product_relations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, {onDelete: 'cascade'}),
    relatedProductId: uuid('related_product_id')
      .notNull()
      .references(() => products.id, {onDelete: 'cascade'}),
    relationType: text('relation_type').notNull().default('related'),
    score: integer('score').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps
  },
  (table) => [
    uniqueIndex('product_relations_pair_uidx').on(
      table.productId,
      table.relatedProductId,
      table.relationType
    ),
    index('product_relations_related_idx').on(table.relatedProductId),
    check('product_relations_not_self_ck', sql`${table.productId} <> ${table.relatedProductId}`)
  ]
);

export const smmProductConfigs = pgTable(
  'smm_product_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, {onDelete: 'cascade'}),
    minQuantity: integer('min_quantity').notNull(),
    maxQuantity: integer('max_quantity').notNull(),
    quantityStep: integer('quantity_step').notNull().default(1),
    pricePer1000Amount: bigint('price_per_1000_amount', {mode: 'number'}).notNull(),
    currencyCode: text('currency_code')
      .notNull()
      .references(() => currencies.code, {onUpdate: 'cascade'}),
    dripFeedEnabled: boolean('drip_feed_enabled').notNull().default(false),
    maxDripRuns: integer('max_drip_runs'),
    minDripIntervalMinutes: integer('min_drip_interval_minutes'),
    ...timestamps
  },
  (table) => [
    uniqueIndex('smm_product_configs_variant_uidx').on(table.variantId),
    check(
      'smm_configs_quantity_ck',
      sql`${table.minQuantity} > 0 and ${table.maxQuantity} >= ${table.minQuantity}`
    )
  ]
);

export const serviceProductConfigs = pgTable(
  'service_product_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, {onDelete: 'cascade'}),
    requirementSchema: jsonb('requirement_schema')
      .$type<Array<Record<string, unknown>>>()
      .notNull()
      .default([]),
    milestoneTemplates: jsonb('milestone_templates')
      .$type<Array<Record<string, unknown>>>()
      .notNull()
      .default([]),
    includedRevisions: integer('included_revisions').notNull().default(0),
    customQuoteRequired: boolean('custom_quote_required').notNull().default(true),
    ...timestamps
  },
  (table) => [
    uniqueIndex('service_product_configs_product_uidx').on(table.productId),
    check('service_configs_revisions_ck', sql`${table.includedRevisions} >= 0`)
  ]
);

export const serviceQuoteRequests = pgTable(
  'service_quote_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, {onDelete: 'restrict'}),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, {onDelete: 'restrict'}),
    variantId: uuid('variant_id').references(() => productVariants.id, {onDelete: 'set null'}),
    requirements: jsonb('requirements').$type<Record<string, unknown>>().notNull(),
    budgetMinAmount: bigint('budget_min_amount', {mode: 'number'}),
    budgetMaxAmount: bigint('budget_max_amount', {mode: 'number'}),
    currencyCode: text('currency_code').references(() => currencies.code, {onUpdate: 'cascade'}),
    desiredDueAt: timestamp('desired_due_at', {withTimezone: true, mode: 'date'}),
    status: quoteRequestStatus('status').notNull().default('submitted'),
    assignedTo: uuid('assigned_to').references(() => profiles.id, {onDelete: 'set null'}),
    deletedAt: timestamp('deleted_at', {withTimezone: true, mode: 'date'}),
    ...timestamps
  },
  (table) => [
    index('service_quote_requests_profile_created_idx').on(table.profileId, table.createdAt),
    index('service_quote_requests_queue_idx').on(table.status, table.createdAt),
    index('service_quote_requests_assignee_idx').on(table.assignedTo, table.status)
  ]
);

export const recentlyViewedProducts = pgTable(
  'recently_viewed_products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, {onDelete: 'cascade'}),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, {onDelete: 'cascade'}),
    viewedAt: timestamp('viewed_at', {withTimezone: true, mode: 'date'}).notNull().defaultNow(),
    ...timestamps
  },
  (table) => [
    uniqueIndex('recently_viewed_products_profile_product_uidx').on(
      table.profileId,
      table.productId
    ),
    index('recently_viewed_products_profile_viewed_idx').on(table.profileId, table.viewedAt)
  ]
);
