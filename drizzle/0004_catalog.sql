CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$ BEGIN
  CREATE TYPE product_status AS ENUM ('draft', 'active', 'out_of_stock', 'coming_soon', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE fulfillment_mode AS ENUM ('auto', 'manual', 'auto_then_manual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE catalog_media_kind AS ENUM ('image', 'video', 'logo');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE quote_request_status AS ENUM ('submitted', 'reviewing', 'quoted', 'accepted', 'declined', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name jsonb NOT NULL,
  description jsonb NOT NULL DEFAULT '{}'::jsonb,
  icon_name text,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_types_code_ck CHECK (code ~ '^[a-z][a-z0-9_]{1,47}$'),
  CONSTRAINT product_types_name_ck CHECK (jsonb_typeof(name) = 'object'),
  CONSTRAINT product_types_capabilities_ck CHECK (jsonb_typeof(capabilities) = 'object')
);
CREATE UNIQUE INDEX product_types_code_uidx ON product_types(code);
CREATE INDEX product_types_enabled_sort_idx ON product_types(enabled, sort_order);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES categories(id) ON DELETE RESTRICT,
  slug text NOT NULL,
  name jsonb NOT NULL,
  description jsonb NOT NULL DEFAULT '{}'::jsonb,
  icon_name text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_slug_ck CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT categories_name_ck CHECK (jsonb_typeof(name) = 'object'),
  CONSTRAINT categories_description_ck CHECK (jsonb_typeof(description) = 'object'),
  CONSTRAINT categories_seo_ck CHECK (jsonb_typeof(seo) = 'object'),
  CONSTRAINT categories_not_self_parent_ck CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE UNIQUE INDEX categories_slug_active_uidx ON categories(slug) WHERE deleted_at IS NULL;
CREATE INDEX categories_parent_sort_idx ON categories(parent_id, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX categories_active_sort_idx ON categories(active, sort_order) WHERE deleted_at IS NULL;

CREATE TABLE category_closure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ancestor_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  descendant_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  depth integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT category_closure_depth_ck CHECK (depth >= 0)
);
CREATE UNIQUE INDEX category_closure_pair_uidx ON category_closure(ancestor_id, descendant_id);
CREATE INDEX category_closure_descendant_depth_idx ON category_closure(descendant_id, depth);
CREATE INDEX category_closure_ancestor_depth_idx ON category_closure(ancestor_id, depth);

CREATE OR REPLACE FUNCTION maintain_category_closure()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM categories WHERE id = NEW.parent_id AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'catalog_parent_not_found';
    END IF;
    INSERT INTO category_closure (ancestor_id, descendant_id, depth)
    VALUES (NEW.id, NEW.id, 0);
    IF NEW.parent_id IS NOT NULL THEN
      INSERT INTO category_closure (ancestor_id, descendant_id, depth)
      SELECT ancestor_id, NEW.id, depth + 1
      FROM category_closure WHERE descendant_id = NEW.parent_id;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.parent_id IS NOT DISTINCT FROM OLD.parent_id THEN RETURN NEW; END IF;
  IF NEW.parent_id = NEW.id OR EXISTS (
    SELECT 1 FROM category_closure
    WHERE ancestor_id = NEW.id AND descendant_id = NEW.parent_id
  ) THEN
    RAISE EXCEPTION 'catalog_category_cycle';
  END IF;

  DELETE FROM category_closure links
  USING category_closure subtree
  WHERE subtree.ancestor_id = NEW.id
    AND links.descendant_id = subtree.descendant_id
    AND links.ancestor_id NOT IN (
      SELECT descendant_id FROM category_closure WHERE ancestor_id = NEW.id
    );

  IF NEW.parent_id IS NOT NULL THEN
    INSERT INTO category_closure (ancestor_id, descendant_id, depth)
    SELECT parent_path.ancestor_id, subtree.descendant_id,
      parent_path.depth + subtree.depth + 1
    FROM category_closure parent_path
    CROSS JOIN category_closure subtree
    WHERE parent_path.descendant_id = NEW.parent_id
      AND subtree.ancestor_id = NEW.id
    ON CONFLICT (ancestor_id, descendant_id) DO UPDATE SET
      depth = EXCLUDED.depth,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION maintain_category_closure() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER categories_closure_insert AFTER INSERT ON categories
  FOR EACH ROW EXECUTE FUNCTION maintain_category_closure();
CREATE TRIGGER categories_closure_update AFTER UPDATE OF parent_id ON categories
  FOR EACH ROW EXECUTE FUNCTION maintain_category_closure();

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  product_type_code text NOT NULL REFERENCES product_types(code) ON UPDATE CASCADE,
  slug text NOT NULL,
  name jsonb NOT NULL,
  short_description jsonb NOT NULL DEFAULT '{}'::jsonb,
  description jsonb NOT NULL DEFAULT '{}'::jsonb,
  badges jsonb NOT NULL DEFAULT '[]'::jsonb,
  status product_status NOT NULL DEFAULT 'draft',
  fulfillment_mode fulfillment_mode NOT NULL DEFAULT 'manual',
  warranty_text jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivery_estimate jsonb NOT NULL DEFAULT '{}'::jsonb,
  input_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  search_text text NOT NULL DEFAULT '',
  search_vector tsvector NOT NULL DEFAULT ''::tsvector,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_slug_ck CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT products_name_ck CHECK (jsonb_typeof(name) = 'object'),
  CONSTRAINT products_short_description_ck CHECK (jsonb_typeof(short_description) = 'object'),
  CONSTRAINT products_description_ck CHECK (jsonb_typeof(description) = 'object'),
  CONSTRAINT products_badges_ck CHECK (jsonb_typeof(badges) = 'array'),
  CONSTRAINT products_input_schema_ck CHECK (jsonb_typeof(input_schema) = 'array'),
  CONSTRAINT products_seo_ck CHECK (jsonb_typeof(seo) = 'object'),
  CONSTRAINT products_publish_ck CHECK (status = 'draft' OR published_at IS NOT NULL)
);
CREATE UNIQUE INDEX products_slug_active_uidx ON products(slug) WHERE deleted_at IS NULL;
CREATE INDEX products_category_status_sort_idx ON products(category_id, status, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX products_type_status_idx ON products(product_type_code, status) WHERE deleted_at IS NULL;
CREATE INDEX products_featured_idx ON products(featured, sort_order) WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX products_published_idx ON products(published_at DESC, id) WHERE deleted_at IS NULL;
CREATE INDEX products_search_vector_idx ON products USING gin(search_vector);
CREATE INDEX products_search_trgm_idx ON products USING gin(search_text gin_trgm_ops);
CREATE INDEX products_input_schema_idx ON products USING gin(input_schema jsonb_path_ops);

CREATE OR REPLACE FUNCTION refresh_product_search()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.search_text := concat_ws(' ',
    NEW.name ->> 'en', NEW.name ->> 'ar',
    NEW.short_description ->> 'en', NEW.short_description ->> 'ar',
    NEW.description ->> 'en', NEW.description ->> 'ar',
    NEW.slug, NEW.product_type_code
  );
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.name ->> 'en', '') || ' ' || coalesce(NEW.name ->> 'ar', '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.short_description ->> 'en', '') || ' ' || coalesce(NEW.short_description ->> 'ar', '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.description ->> 'en', '') || ' ' || coalesce(NEW.description ->> 'ar', '')), 'C');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION refresh_product_search() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER products_refresh_search BEFORE INSERT OR UPDATE OF name, short_description, description, slug, product_type_code
  ON products FOR EACH ROW EXECUTE FUNCTION refresh_product_search();

CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku text NOT NULL,
  name jsonb NOT NULL,
  price_amount bigint NOT NULL,
  currency_code text NOT NULL REFERENCES currencies(code) ON UPDATE CASCADE,
  stock_quantity integer NOT NULL DEFAULT 0,
  unlimited_stock boolean NOT NULL DEFAULT false,
  region_code text,
  duration_days integer,
  denomination_amount bigint,
  denomination_currency_code text REFERENCES currencies(code) ON UPDATE CASCADE,
  account_type text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_variants_sku_ck CHECK (sku ~ '^[A-Z0-9][A-Z0-9._-]{2,63}$'),
  CONSTRAINT product_variants_name_ck CHECK (jsonb_typeof(name) = 'object'),
  CONSTRAINT product_variants_price_ck CHECK (price_amount >= 0),
  CONSTRAINT product_variants_stock_ck CHECK (stock_quantity >= 0),
  CONSTRAINT product_variants_region_ck CHECK (region_code IS NULL OR region_code ~ '^[A-Z0-9-]{2,16}$'),
  CONSTRAINT product_variants_duration_ck CHECK (duration_days IS NULL OR duration_days > 0),
  CONSTRAINT product_variants_denomination_ck CHECK (
    (denomination_amount IS NULL AND denomination_currency_code IS NULL) OR
    (denomination_amount > 0 AND denomination_currency_code IS NOT NULL)
  ),
  CONSTRAINT product_variants_attributes_ck CHECK (jsonb_typeof(attributes) = 'object')
);
CREATE UNIQUE INDEX product_variants_sku_active_uidx ON product_variants(sku) WHERE deleted_at IS NULL;
CREATE INDEX product_variants_product_active_sort_idx ON product_variants(product_id, active, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX product_variants_region_idx ON product_variants(region_code) WHERE deleted_at IS NULL AND active;
CREATE INDEX product_variants_price_idx ON product_variants(currency_code, price_amount) WHERE deleted_at IS NULL AND active;
CREATE INDEX product_variants_attributes_idx ON product_variants USING gin(attributes jsonb_path_ops);

CREATE TABLE product_variant_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  cost_amount bigint NOT NULL,
  currency_code text NOT NULL REFERENCES currencies(code) ON UPDATE CASCADE,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_variant_costs_amount_ck CHECK (cost_amount >= 0)
);
CREATE UNIQUE INDEX product_variant_costs_variant_uidx ON product_variant_costs(variant_id);

CREATE TABLE product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  kind catalog_media_kind NOT NULL DEFAULT 'image',
  url text,
  storage_path text,
  alt_text jsonb NOT NULL DEFAULT '{}'::jsonb,
  blur_data_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_media_source_ck CHECK (num_nonnulls(url, storage_path) = 1),
  CONSTRAINT product_media_alt_ck CHECK (jsonb_typeof(alt_text) = 'object')
);
CREATE INDEX product_media_product_sort_idx ON product_media(product_id, sort_order) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX product_media_primary_uidx ON product_media(product_id) WHERE is_primary AND deleted_at IS NULL;
CREATE INDEX product_media_variant_idx ON product_media(variant_id) WHERE variant_id IS NOT NULL;

CREATE TABLE product_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  relation_type text NOT NULL DEFAULT 'related',
  score integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_relations_not_self_ck CHECK (product_id <> related_product_id),
  CONSTRAINT product_relations_type_ck CHECK (relation_type IN ('related', 'upsell', 'cross_sell', 'also_bought'))
);
CREATE UNIQUE INDEX product_relations_pair_uidx ON product_relations(product_id, related_product_id, relation_type);
CREATE INDEX product_relations_related_idx ON product_relations(related_product_id);

CREATE TABLE smm_product_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  min_quantity integer NOT NULL,
  max_quantity integer NOT NULL,
  quantity_step integer NOT NULL DEFAULT 1,
  price_per_1000_amount bigint NOT NULL,
  currency_code text NOT NULL REFERENCES currencies(code) ON UPDATE CASCADE,
  drip_feed_enabled boolean NOT NULL DEFAULT false,
  max_drip_runs integer,
  min_drip_interval_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT smm_configs_quantity_ck CHECK (min_quantity > 0 AND max_quantity >= min_quantity AND quantity_step > 0),
  CONSTRAINT smm_configs_alignment_ck CHECK ((max_quantity - min_quantity) % quantity_step = 0),
  CONSTRAINT smm_configs_price_ck CHECK (price_per_1000_amount >= 0),
  CONSTRAINT smm_configs_drip_ck CHECK (
    (NOT drip_feed_enabled AND max_drip_runs IS NULL AND min_drip_interval_minutes IS NULL) OR
    (drip_feed_enabled AND max_drip_runs > 0 AND min_drip_interval_minutes > 0)
  )
);
CREATE UNIQUE INDEX smm_product_configs_variant_uidx ON smm_product_configs(variant_id);

CREATE TABLE service_product_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  requirement_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  milestone_templates jsonb NOT NULL DEFAULT '[]'::jsonb,
  included_revisions integer NOT NULL DEFAULT 0,
  custom_quote_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_configs_requirements_ck CHECK (jsonb_typeof(requirement_schema) = 'array'),
  CONSTRAINT service_configs_milestones_ck CHECK (jsonb_typeof(milestone_templates) = 'array'),
  CONSTRAINT service_configs_revisions_ck CHECK (included_revisions >= 0)
);
CREATE UNIQUE INDEX service_product_configs_product_uidx ON service_product_configs(product_id);

CREATE TABLE service_quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  requirements jsonb NOT NULL,
  budget_min_amount bigint,
  budget_max_amount bigint,
  currency_code text REFERENCES currencies(code) ON UPDATE CASCADE,
  desired_due_at timestamptz,
  status quote_request_status NOT NULL DEFAULT 'submitted',
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_quotes_requirements_ck CHECK (jsonb_typeof(requirements) = 'object'),
  CONSTRAINT service_quotes_budget_ck CHECK (
    (budget_min_amount IS NULL AND budget_max_amount IS NULL AND currency_code IS NULL) OR
    (budget_min_amount >= 0 AND budget_max_amount >= budget_min_amount AND currency_code IS NOT NULL)
  )
);
CREATE INDEX service_quote_requests_profile_created_idx ON service_quote_requests(profile_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX service_quote_requests_queue_idx ON service_quote_requests(status, created_at) WHERE deleted_at IS NULL;
CREATE INDEX service_quote_requests_assignee_idx ON service_quote_requests(assigned_to, status) WHERE assigned_to IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE recently_viewed_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX recently_viewed_products_profile_product_uidx ON recently_viewed_products(profile_id, product_id);
CREATE INDEX recently_viewed_products_profile_viewed_idx ON recently_viewed_products(profile_id, viewed_at DESC);

CREATE TRIGGER product_types_updated_at BEFORE UPDATE ON product_types FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER product_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER product_variant_costs_updated_at BEFORE UPDATE ON product_variant_costs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER product_media_updated_at BEFORE UPDATE ON product_media FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER product_relations_updated_at BEFORE UPDATE ON product_relations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER smm_product_configs_updated_at BEFORE UPDATE ON smm_product_configs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER service_product_configs_updated_at BEFORE UPDATE ON service_product_configs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER service_quote_requests_updated_at BEFORE UPDATE ON service_quote_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER recently_viewed_products_updated_at BEFORE UPDATE ON recently_viewed_products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION catalog_audit_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE row_id uuid;
BEGIN
  row_id := COALESCE(NEW.id, OLD.id);
  INSERT INTO audit_logs(actor_id, actor_type, action, resource_type, resource_id, before, after)
  VALUES (
    auth.uid(),
    CASE WHEN auth.uid() IS NULL THEN 'service' ELSE 'user' END,
    lower(TG_OP),
    TG_TABLE_NAME,
    row_id,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION catalog_audit_change() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER categories_audit AFTER INSERT OR UPDATE OR DELETE ON categories FOR EACH ROW EXECUTE FUNCTION catalog_audit_change();
CREATE TRIGGER products_audit AFTER INSERT OR UPDATE OR DELETE ON products FOR EACH ROW EXECUTE FUNCTION catalog_audit_change();
CREATE TRIGGER product_variants_audit AFTER INSERT OR UPDATE OR DELETE ON product_variants FOR EACH ROW EXECUTE FUNCTION catalog_audit_change();

INSERT INTO product_types(code, name, description, icon_name, sort_order, capabilities) VALUES
  ('topup', '{"en":"Game top-ups","ar":"شحن الألعاب"}', '{"en":"Player-ID based game credit","ar":"أرصدة ألعاب مرتبطة بمعرّف اللاعب"}', 'Gamepad2', 10, '{"player_id":true}'),
  ('subscription', '{"en":"Subscriptions","ar":"الاشتراكات"}', '{"en":"Private and shared digital subscriptions","ar":"اشتراكات رقمية خاصة ومشتركة"}', 'PlaySquare', 20, '{"duration":true,"account_type":true}'),
  ('giftcard', '{"en":"Gift cards","ar":"بطاقات الهدايا"}', '{"en":"Region and denomination based digital codes","ar":"رموز رقمية حسب المنطقة والفئة"}', 'Gift', 30, '{"region":true,"denomination":true}'),
  ('smm', '{"en":"Social growth","ar":"خدمات التواصل"}', '{"en":"Quantity based social media services","ar":"خدمات تواصل اجتماعي حسب الكمية"}', 'TrendingUp', 40, '{"quantity":true,"target_url":true,"drip_feed":true}'),
  ('service', '{"en":"Digital services","ar":"الخدمات الرقمية"}', '{"en":"Custom creative and technical work","ar":"أعمال إبداعية وتقنية مخصصة"}', 'Sparkles', 50, '{"requirements":true,"milestones":true,"quotes":true}')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name, sort_order = EXCLUDED.sort_order, capabilities = EXCLUDED.capabilities;

INSERT INTO role_permissions(role, permission, description) VALUES
  ('admin', 'catalog.manage', 'Create, edit, publish, archive, import, and export catalog data'),
  ('owner', 'catalog.manage', 'Create, edit, publish, archive, import, and export catalog data'),
  ('support', 'catalog.read_draft', 'Read draft catalog data for customer support'),
  ('admin', 'catalog.read_draft', 'Read draft catalog data'),
  ('owner', 'catalog.read_draft', 'Read draft catalog data')
ON CONFLICT DO NOTHING;

ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_closure ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE smm_product_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_product_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE recently_viewed_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_types_public_read ON product_types FOR SELECT TO anon, authenticated
  USING (enabled);
CREATE POLICY product_types_staff_read ON product_types FOR SELECT TO authenticated
  USING (private.app_can('catalog.read_draft') OR private.app_can('catalog.manage'));
CREATE POLICY product_types_manage ON product_types FOR ALL TO authenticated
  USING (private.app_can('catalog.manage')) WITH CHECK (private.app_can('catalog.manage'));

CREATE POLICY categories_public_read ON categories FOR SELECT TO anon, authenticated
  USING (active AND deleted_at IS NULL);
CREATE POLICY categories_staff_read ON categories FOR SELECT TO authenticated
  USING (private.app_can('catalog.read_draft') OR private.app_can('catalog.manage'));
CREATE POLICY categories_manage ON categories FOR ALL TO authenticated
  USING (private.app_can('catalog.manage')) WITH CHECK (private.app_can('catalog.manage'));

CREATE POLICY category_closure_public_read ON category_closure FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM categories ancestor JOIN categories descendant ON descendant.id = category_closure.descendant_id
    WHERE ancestor.id = category_closure.ancestor_id
      AND ancestor.active AND ancestor.deleted_at IS NULL
      AND descendant.active AND descendant.deleted_at IS NULL
  ));
CREATE POLICY category_closure_staff_read ON category_closure FOR SELECT TO authenticated
  USING (private.app_can('catalog.read_draft') OR private.app_can('catalog.manage'));
CREATE POLICY category_closure_manage ON category_closure FOR ALL TO authenticated
  USING (private.app_can('catalog.manage')) WITH CHECK (private.app_can('catalog.manage'));

CREATE POLICY products_public_read ON products FOR SELECT TO anon, authenticated
  USING (status IN ('active', 'out_of_stock', 'coming_soon') AND published_at <= now() AND deleted_at IS NULL);
CREATE POLICY products_staff_read ON products FOR SELECT TO authenticated
  USING (private.app_can('catalog.read_draft') OR private.app_can('catalog.manage'));
CREATE POLICY products_manage ON products FOR ALL TO authenticated
  USING (private.app_can('catalog.manage')) WITH CHECK (private.app_can('catalog.manage'));

CREATE POLICY variants_public_read ON product_variants FOR SELECT TO anon, authenticated
  USING ((active AND deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM products WHERE products.id = product_variants.product_id
      AND products.status IN ('active', 'out_of_stock', 'coming_soon')
      AND products.published_at <= now() AND products.deleted_at IS NULL
  )));
CREATE POLICY variants_staff_read ON product_variants FOR SELECT TO authenticated
  USING (private.app_can('catalog.read_draft') OR private.app_can('catalog.manage'));
CREATE POLICY variants_manage ON product_variants FOR ALL TO authenticated
  USING (private.app_can('catalog.manage')) WITH CHECK (private.app_can('catalog.manage'));

CREATE POLICY variant_costs_staff_read ON product_variant_costs FOR SELECT TO authenticated
  USING (private.app_can('catalog.manage'));
CREATE POLICY variant_costs_manage ON product_variant_costs FOR ALL TO authenticated
  USING (private.app_can('catalog.manage')) WITH CHECK (private.app_can('catalog.manage'));

CREATE POLICY product_media_public_read ON product_media FOR SELECT TO anon, authenticated
  USING ((deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM products WHERE products.id = product_media.product_id
      AND products.status IN ('active', 'out_of_stock', 'coming_soon')
      AND products.published_at <= now() AND products.deleted_at IS NULL
  )));
CREATE POLICY product_media_staff_read ON product_media FOR SELECT TO authenticated
  USING (private.app_can('catalog.read_draft') OR private.app_can('catalog.manage'));
CREATE POLICY product_media_manage ON product_media FOR ALL TO authenticated
  USING (private.app_can('catalog.manage')) WITH CHECK (private.app_can('catalog.manage'));

CREATE POLICY product_relations_public_read ON product_relations FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM products source JOIN products related ON related.id = product_relations.related_product_id
    WHERE source.id = product_relations.product_id
      AND source.status IN ('active', 'out_of_stock', 'coming_soon') AND source.deleted_at IS NULL
      AND related.status IN ('active', 'out_of_stock', 'coming_soon') AND related.deleted_at IS NULL
  ));
CREATE POLICY product_relations_staff_read ON product_relations FOR SELECT TO authenticated
  USING (private.app_can('catalog.read_draft') OR private.app_can('catalog.manage'));
CREATE POLICY product_relations_manage ON product_relations FOR ALL TO authenticated
  USING (private.app_can('catalog.manage')) WITH CHECK (private.app_can('catalog.manage'));

CREATE POLICY smm_configs_public_read ON smm_product_configs FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM product_variants variant JOIN products product ON product.id = variant.product_id
    WHERE variant.id = smm_product_configs.variant_id AND variant.active AND variant.deleted_at IS NULL
      AND product.status IN ('active', 'out_of_stock', 'coming_soon') AND product.deleted_at IS NULL
  ));
CREATE POLICY smm_configs_staff_read ON smm_product_configs FOR SELECT TO authenticated
  USING (private.app_can('catalog.read_draft') OR private.app_can('catalog.manage'));
CREATE POLICY smm_configs_manage ON smm_product_configs FOR ALL TO authenticated
  USING (private.app_can('catalog.manage')) WITH CHECK (private.app_can('catalog.manage'));

CREATE POLICY service_configs_public_read ON service_product_configs FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM products WHERE products.id = service_product_configs.product_id
      AND products.status IN ('active', 'out_of_stock', 'coming_soon') AND products.deleted_at IS NULL
  ));
CREATE POLICY service_configs_staff_read ON service_product_configs FOR SELECT TO authenticated
  USING (private.app_can('catalog.read_draft') OR private.app_can('catalog.manage'));
CREATE POLICY service_configs_manage ON service_product_configs FOR ALL TO authenticated
  USING (private.app_can('catalog.manage')) WITH CHECK (private.app_can('catalog.manage'));

CREATE POLICY service_quotes_owner_read ON service_quote_requests FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()) OR private.app_can('catalog.manage') OR private.app_can('support.manage'));
CREATE POLICY service_quotes_owner_insert ON service_quote_requests FOR INSERT TO authenticated
  WITH CHECK (profile_id = (SELECT auth.uid()));
CREATE POLICY service_quotes_owner_cancel ON service_quote_requests FOR UPDATE TO authenticated
  USING (profile_id = (SELECT auth.uid()) AND status = 'submitted')
  WITH CHECK (profile_id = (SELECT auth.uid()) AND status = 'cancelled');
CREATE POLICY service_quotes_staff_manage ON service_quote_requests FOR ALL TO authenticated
  USING (private.app_can('catalog.manage') OR private.app_can('support.manage'))
  WITH CHECK (private.app_can('catalog.manage') OR private.app_can('support.manage'));

CREATE POLICY recently_viewed_owner_read ON recently_viewed_products FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));
CREATE POLICY recently_viewed_owner_insert ON recently_viewed_products FOR INSERT TO authenticated
  WITH CHECK (profile_id = (SELECT auth.uid()));
CREATE POLICY recently_viewed_owner_update ON recently_viewed_products FOR UPDATE TO authenticated
  USING (profile_id = (SELECT auth.uid())) WITH CHECK (profile_id = (SELECT auth.uid()));
CREATE POLICY recently_viewed_owner_delete ON recently_viewed_products FOR DELETE TO authenticated
  USING (profile_id = (SELECT auth.uid()));

GRANT SELECT ON product_types, categories, category_closure, products, product_variants,
  product_media, product_relations, smm_product_configs, service_product_configs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON product_types, categories, products, product_variants,
  product_media, product_relations, smm_product_configs, service_product_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON product_variant_costs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON service_quote_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON recently_viewed_products TO authenticated;
GRANT ALL ON product_types, categories, category_closure, products, product_variants,
  product_variant_costs, product_media, product_relations, smm_product_configs,
  service_product_configs, service_quote_requests, recently_viewed_products TO service_role;

CREATE OR REPLACE FUNCTION search_catalog(
  p_locale text DEFAULT 'en',
  p_query text DEFAULT NULL,
  p_category_slug text DEFAULT NULL,
  p_product_type text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_min_price bigint DEFAULT NULL,
  p_max_price bigint DEFAULT NULL,
  p_sort text DEFAULT 'relevance',
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
) RETURNS TABLE (
  id uuid, slug text, name jsonb, short_description jsonb, badges jsonb,
  status product_status, product_type_code text, category_slug text,
  price_amount bigint, currency_code text, primary_media_url text,
  search_rank real, total_count bigint
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, pg_temp AS $$
  WITH candidates AS (
    SELECT product.id, product.slug, product.name, product.short_description, product.badges,
      product.status, product.product_type_code, category.slug AS category_slug,
      price.price_amount, price.currency_code,
      media.url AS primary_media_url,
      CASE
        WHEN nullif(trim(p_query), '') IS NULL THEN 0::real
        ELSE greatest(
          ts_rank(product.search_vector, websearch_to_tsquery('simple', trim(p_query))),
          word_similarity(lower(trim(p_query)), lower(product.search_text))
        )::real
      END AS search_rank
    FROM products product
    JOIN categories category ON category.id = product.category_id
    JOIN LATERAL (
      SELECT variant.price_amount, variant.currency_code
      FROM product_variants variant
      WHERE variant.product_id = product.id AND variant.active AND variant.deleted_at IS NULL
      ORDER BY variant.price_amount, variant.id LIMIT 1
    ) price ON true
    LEFT JOIN LATERAL (
      SELECT coalesce(product_media.url, '/icons/icon-512.png') AS url
      FROM product_media
      WHERE product_media.product_id = product.id AND product_media.deleted_at IS NULL
      ORDER BY product_media.is_primary DESC, product_media.sort_order, product_media.id LIMIT 1
    ) media ON true
    WHERE product.deleted_at IS NULL
      AND product.status IN ('active', 'out_of_stock', 'coming_soon')
      AND (nullif(trim(p_query), '') IS NULL OR
        product.search_vector @@ websearch_to_tsquery('simple', trim(p_query)) OR
        lower(trim(p_query)) <% lower(product.search_text) OR
        product.search_text ILIKE '%' || trim(p_query) || '%')
      AND (p_product_type IS NULL OR product.product_type_code = p_product_type)
      AND (p_region IS NULL OR EXISTS (
        SELECT 1 FROM product_variants region_variant
        WHERE region_variant.product_id = product.id AND region_variant.active
          AND region_variant.deleted_at IS NULL AND region_variant.region_code = p_region
      ))
      AND (p_min_price IS NULL OR price.price_amount >= p_min_price)
      AND (p_max_price IS NULL OR price.price_amount <= p_max_price)
      AND (p_category_slug IS NULL OR EXISTS (
        SELECT 1 FROM categories selected
        JOIN category_closure closure ON closure.ancestor_id = selected.id
        WHERE selected.slug = p_category_slug AND closure.descendant_id = product.category_id
      ))
  )
  SELECT candidates.*, count(*) OVER() AS total_count
  FROM candidates
  ORDER BY
    CASE WHEN p_sort = 'price_asc' THEN price_amount END ASC,
    CASE WHEN p_sort = 'price_desc' THEN price_amount END DESC,
    CASE WHEN p_sort = 'newest' THEN id END DESC,
    CASE WHEN p_sort = 'relevance' THEN search_rank END DESC,
    id
  LIMIT least(greatest(p_limit, 1), 60)
  OFFSET greatest(p_offset, 0);
$$;
REVOKE ALL ON FUNCTION search_catalog(text, text, text, text, text, bigint, bigint, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_catalog(text, text, text, text, text, bigint, bigint, text, integer, integer) TO anon, authenticated, service_role;

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('catalog-media', 'catalog-media', true, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS catalog_media_public_read ON storage.objects;
DROP POLICY IF EXISTS catalog_media_staff_insert ON storage.objects;
DROP POLICY IF EXISTS catalog_media_staff_update ON storage.objects;
DROP POLICY IF EXISTS catalog_media_staff_delete ON storage.objects;
CREATE POLICY catalog_media_public_read ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'catalog-media');
CREATE POLICY catalog_media_staff_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'catalog-media' AND private.app_can('catalog.manage'));
CREATE POLICY catalog_media_staff_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'catalog-media' AND private.app_can('catalog.manage'))
  WITH CHECK (bucket_id = 'catalog-media' AND private.app_can('catalog.manage'));
CREATE POLICY catalog_media_staff_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'catalog-media' AND private.app_can('catalog.manage'));
