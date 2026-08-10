ALTER EXTENSION pg_trgm SET SCHEMA extensions;

CREATE INDEX IF NOT EXISTS categories_created_by_idx ON categories(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS categories_updated_by_idx ON categories(updated_by) WHERE updated_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_created_by_idx ON products(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_updated_by_idx ON products(updated_by) WHERE updated_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS product_variant_costs_currency_idx ON product_variant_costs(currency_code);
CREATE INDEX IF NOT EXISTS product_variants_denomination_currency_idx ON product_variants(denomination_currency_code) WHERE denomination_currency_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS recently_viewed_products_product_idx ON recently_viewed_products(product_id);
CREATE INDEX IF NOT EXISTS service_quote_requests_currency_idx ON service_quote_requests(currency_code) WHERE currency_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS service_quote_requests_product_idx ON service_quote_requests(product_id);
CREATE INDEX IF NOT EXISTS service_quote_requests_variant_idx ON service_quote_requests(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS smm_product_configs_currency_idx ON smm_product_configs(currency_code);

DROP POLICY IF EXISTS product_types_public_read ON product_types;
DROP POLICY IF EXISTS product_types_staff_read ON product_types;
DROP POLICY IF EXISTS product_types_manage ON product_types;
CREATE POLICY product_types_anon_read ON product_types FOR SELECT TO anon USING (enabled);
CREATE POLICY product_types_authenticated_read ON product_types FOR SELECT TO authenticated
  USING (enabled OR (SELECT private.app_can('catalog.read_draft')) OR (SELECT private.app_can('catalog.manage')));
CREATE POLICY product_types_insert ON product_types FOR INSERT TO authenticated WITH CHECK ((SELECT private.app_can('catalog.manage')));
CREATE POLICY product_types_update ON product_types FOR UPDATE TO authenticated USING ((SELECT private.app_can('catalog.manage'))) WITH CHECK ((SELECT private.app_can('catalog.manage')));
CREATE POLICY product_types_delete ON product_types FOR DELETE TO authenticated USING ((SELECT private.app_can('catalog.manage')));

DROP POLICY IF EXISTS categories_public_read ON categories;
DROP POLICY IF EXISTS categories_staff_read ON categories;
DROP POLICY IF EXISTS categories_manage ON categories;
CREATE POLICY categories_anon_read ON categories FOR SELECT TO anon USING (active AND deleted_at IS NULL);
CREATE POLICY categories_authenticated_read ON categories FOR SELECT TO authenticated
  USING ((active AND deleted_at IS NULL) OR (SELECT private.app_can('catalog.read_draft')) OR (SELECT private.app_can('catalog.manage')));
CREATE POLICY categories_insert ON categories FOR INSERT TO authenticated WITH CHECK ((SELECT private.app_can('catalog.manage')));
CREATE POLICY categories_update ON categories FOR UPDATE TO authenticated USING ((SELECT private.app_can('catalog.manage'))) WITH CHECK ((SELECT private.app_can('catalog.manage')));
CREATE POLICY categories_delete ON categories FOR DELETE TO authenticated USING ((SELECT private.app_can('catalog.manage')));

DROP POLICY IF EXISTS category_closure_public_read ON category_closure;
DROP POLICY IF EXISTS category_closure_staff_read ON category_closure;
DROP POLICY IF EXISTS category_closure_manage ON category_closure;
CREATE POLICY category_closure_anon_read ON category_closure FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM categories ancestor JOIN categories descendant ON descendant.id = category_closure.descendant_id
    WHERE ancestor.id = category_closure.ancestor_id AND ancestor.active AND ancestor.deleted_at IS NULL AND descendant.active AND descendant.deleted_at IS NULL)
);
CREATE POLICY category_closure_authenticated_read ON category_closure FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM categories ancestor JOIN categories descendant ON descendant.id = category_closure.descendant_id
    WHERE ancestor.id = category_closure.ancestor_id AND ancestor.active AND ancestor.deleted_at IS NULL AND descendant.active AND descendant.deleted_at IS NULL)
  OR (SELECT private.app_can('catalog.read_draft')) OR (SELECT private.app_can('catalog.manage'))
);

DROP POLICY IF EXISTS products_public_read ON products;
DROP POLICY IF EXISTS products_staff_read ON products;
DROP POLICY IF EXISTS products_manage ON products;
CREATE POLICY products_anon_read ON products FOR SELECT TO anon USING (status IN ('active', 'out_of_stock', 'coming_soon') AND published_at <= now() AND deleted_at IS NULL);
CREATE POLICY products_authenticated_read ON products FOR SELECT TO authenticated USING (
  (status IN ('active', 'out_of_stock', 'coming_soon') AND published_at <= now() AND deleted_at IS NULL)
  OR (SELECT private.app_can('catalog.read_draft')) OR (SELECT private.app_can('catalog.manage'))
);
CREATE POLICY products_insert ON products FOR INSERT TO authenticated WITH CHECK ((SELECT private.app_can('catalog.manage')));
CREATE POLICY products_update ON products FOR UPDATE TO authenticated USING ((SELECT private.app_can('catalog.manage'))) WITH CHECK ((SELECT private.app_can('catalog.manage')));
CREATE POLICY products_delete ON products FOR DELETE TO authenticated USING ((SELECT private.app_can('catalog.manage')));

DROP POLICY IF EXISTS variants_public_read ON product_variants;
DROP POLICY IF EXISTS variants_staff_read ON product_variants;
DROP POLICY IF EXISTS variants_manage ON product_variants;
CREATE POLICY variants_anon_read ON product_variants FOR SELECT TO anon USING (active AND deleted_at IS NULL AND EXISTS (
  SELECT 1 FROM products WHERE products.id = product_variants.product_id AND products.status IN ('active', 'out_of_stock', 'coming_soon') AND products.published_at <= now() AND products.deleted_at IS NULL));
CREATE POLICY variants_authenticated_read ON product_variants FOR SELECT TO authenticated USING (
  (active AND deleted_at IS NULL AND EXISTS (SELECT 1 FROM products WHERE products.id = product_variants.product_id AND products.status IN ('active', 'out_of_stock', 'coming_soon') AND products.published_at <= now() AND products.deleted_at IS NULL))
  OR (SELECT private.app_can('catalog.read_draft')) OR (SELECT private.app_can('catalog.manage')));
CREATE POLICY variants_insert ON product_variants FOR INSERT TO authenticated WITH CHECK ((SELECT private.app_can('catalog.manage')));
CREATE POLICY variants_update ON product_variants FOR UPDATE TO authenticated USING ((SELECT private.app_can('catalog.manage'))) WITH CHECK ((SELECT private.app_can('catalog.manage')));
CREATE POLICY variants_delete ON product_variants FOR DELETE TO authenticated USING ((SELECT private.app_can('catalog.manage')));

DROP POLICY IF EXISTS variant_costs_staff_read ON product_variant_costs;
DROP POLICY IF EXISTS variant_costs_manage ON product_variant_costs;
CREATE POLICY variant_costs_read ON product_variant_costs FOR SELECT TO authenticated USING ((SELECT private.app_can('catalog.manage')));
CREATE POLICY variant_costs_insert ON product_variant_costs FOR INSERT TO authenticated WITH CHECK ((SELECT private.app_can('catalog.manage')));
CREATE POLICY variant_costs_update ON product_variant_costs FOR UPDATE TO authenticated USING ((SELECT private.app_can('catalog.manage'))) WITH CHECK ((SELECT private.app_can('catalog.manage')));
CREATE POLICY variant_costs_delete ON product_variant_costs FOR DELETE TO authenticated USING ((SELECT private.app_can('catalog.manage')));

DROP POLICY IF EXISTS product_media_public_read ON product_media;
DROP POLICY IF EXISTS product_media_staff_read ON product_media;
DROP POLICY IF EXISTS product_media_manage ON product_media;
CREATE POLICY product_media_anon_read ON product_media FOR SELECT TO anon USING (deleted_at IS NULL AND EXISTS (SELECT 1 FROM products WHERE products.id = product_media.product_id AND products.status IN ('active', 'out_of_stock', 'coming_soon') AND products.published_at <= now() AND products.deleted_at IS NULL));
CREATE POLICY product_media_authenticated_read ON product_media FOR SELECT TO authenticated USING ((deleted_at IS NULL AND EXISTS (SELECT 1 FROM products WHERE products.id = product_media.product_id AND products.status IN ('active', 'out_of_stock', 'coming_soon') AND products.published_at <= now() AND products.deleted_at IS NULL)) OR (SELECT private.app_can('catalog.read_draft')) OR (SELECT private.app_can('catalog.manage')));
CREATE POLICY product_media_insert ON product_media FOR INSERT TO authenticated WITH CHECK ((SELECT private.app_can('catalog.manage')));
CREATE POLICY product_media_update ON product_media FOR UPDATE TO authenticated USING ((SELECT private.app_can('catalog.manage'))) WITH CHECK ((SELECT private.app_can('catalog.manage')));
CREATE POLICY product_media_delete ON product_media FOR DELETE TO authenticated USING ((SELECT private.app_can('catalog.manage')));

DROP POLICY IF EXISTS product_relations_public_read ON product_relations;
DROP POLICY IF EXISTS product_relations_staff_read ON product_relations;
DROP POLICY IF EXISTS product_relations_manage ON product_relations;
CREATE POLICY product_relations_anon_read ON product_relations FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM products source JOIN products related ON related.id = product_relations.related_product_id WHERE source.id = product_relations.product_id AND source.status IN ('active', 'out_of_stock', 'coming_soon') AND source.published_at <= now() AND source.deleted_at IS NULL AND related.status IN ('active', 'out_of_stock', 'coming_soon') AND related.published_at <= now() AND related.deleted_at IS NULL));
CREATE POLICY product_relations_authenticated_read ON product_relations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM products source JOIN products related ON related.id = product_relations.related_product_id WHERE source.id = product_relations.product_id AND source.status IN ('active', 'out_of_stock', 'coming_soon') AND source.published_at <= now() AND source.deleted_at IS NULL AND related.status IN ('active', 'out_of_stock', 'coming_soon') AND related.published_at <= now() AND related.deleted_at IS NULL) OR (SELECT private.app_can('catalog.read_draft')) OR (SELECT private.app_can('catalog.manage')));
CREATE POLICY product_relations_insert ON product_relations FOR INSERT TO authenticated WITH CHECK ((SELECT private.app_can('catalog.manage')));
CREATE POLICY product_relations_update ON product_relations FOR UPDATE TO authenticated USING ((SELECT private.app_can('catalog.manage'))) WITH CHECK ((SELECT private.app_can('catalog.manage')));
CREATE POLICY product_relations_delete ON product_relations FOR DELETE TO authenticated USING ((SELECT private.app_can('catalog.manage')));

DROP POLICY IF EXISTS smm_configs_public_read ON smm_product_configs;
DROP POLICY IF EXISTS smm_configs_staff_read ON smm_product_configs;
DROP POLICY IF EXISTS smm_configs_manage ON smm_product_configs;
CREATE POLICY smm_configs_anon_read ON smm_product_configs FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM product_variants variant JOIN products product ON product.id = variant.product_id WHERE variant.id = smm_product_configs.variant_id AND variant.active AND variant.deleted_at IS NULL AND product.status IN ('active', 'out_of_stock', 'coming_soon') AND product.published_at <= now() AND product.deleted_at IS NULL));
CREATE POLICY smm_configs_authenticated_read ON smm_product_configs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM product_variants variant JOIN products product ON product.id = variant.product_id WHERE variant.id = smm_product_configs.variant_id AND variant.active AND variant.deleted_at IS NULL AND product.status IN ('active', 'out_of_stock', 'coming_soon') AND product.published_at <= now() AND product.deleted_at IS NULL) OR (SELECT private.app_can('catalog.read_draft')) OR (SELECT private.app_can('catalog.manage')));
CREATE POLICY smm_configs_insert ON smm_product_configs FOR INSERT TO authenticated WITH CHECK ((SELECT private.app_can('catalog.manage')));
CREATE POLICY smm_configs_update ON smm_product_configs FOR UPDATE TO authenticated USING ((SELECT private.app_can('catalog.manage'))) WITH CHECK ((SELECT private.app_can('catalog.manage')));
CREATE POLICY smm_configs_delete ON smm_product_configs FOR DELETE TO authenticated USING ((SELECT private.app_can('catalog.manage')));

DROP POLICY IF EXISTS service_configs_public_read ON service_product_configs;
DROP POLICY IF EXISTS service_configs_staff_read ON service_product_configs;
DROP POLICY IF EXISTS service_configs_manage ON service_product_configs;
CREATE POLICY service_configs_anon_read ON service_product_configs FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM products WHERE products.id = service_product_configs.product_id AND products.status IN ('active', 'out_of_stock', 'coming_soon') AND products.published_at <= now() AND products.deleted_at IS NULL));
CREATE POLICY service_configs_authenticated_read ON service_product_configs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM products WHERE products.id = service_product_configs.product_id AND products.status IN ('active', 'out_of_stock', 'coming_soon') AND products.published_at <= now() AND products.deleted_at IS NULL) OR (SELECT private.app_can('catalog.read_draft')) OR (SELECT private.app_can('catalog.manage')));
CREATE POLICY service_configs_insert ON service_product_configs FOR INSERT TO authenticated WITH CHECK ((SELECT private.app_can('catalog.manage')));
CREATE POLICY service_configs_update ON service_product_configs FOR UPDATE TO authenticated USING ((SELECT private.app_can('catalog.manage'))) WITH CHECK ((SELECT private.app_can('catalog.manage')));
CREATE POLICY service_configs_delete ON service_product_configs FOR DELETE TO authenticated USING ((SELECT private.app_can('catalog.manage')));

DROP POLICY IF EXISTS service_quotes_owner_read ON service_quote_requests;
DROP POLICY IF EXISTS service_quotes_owner_insert ON service_quote_requests;
DROP POLICY IF EXISTS service_quotes_owner_cancel ON service_quote_requests;
DROP POLICY IF EXISTS service_quotes_staff_manage ON service_quote_requests;
CREATE POLICY service_quotes_read ON service_quote_requests FOR SELECT TO authenticated USING (profile_id = (SELECT auth.uid()) OR (SELECT private.app_can('catalog.manage')) OR (SELECT private.app_can('support.manage')));
CREATE POLICY service_quotes_insert ON service_quote_requests FOR INSERT TO authenticated WITH CHECK (profile_id = (SELECT auth.uid()) OR (SELECT private.app_can('catalog.manage')) OR (SELECT private.app_can('support.manage')));
CREATE POLICY service_quotes_update ON service_quote_requests FOR UPDATE TO authenticated
  USING ((profile_id = (SELECT auth.uid()) AND status = 'submitted') OR (SELECT private.app_can('catalog.manage')) OR (SELECT private.app_can('support.manage')))
  WITH CHECK ((profile_id = (SELECT auth.uid()) AND status = 'cancelled') OR (SELECT private.app_can('catalog.manage')) OR (SELECT private.app_can('support.manage')));
CREATE POLICY service_quotes_delete ON service_quote_requests FOR DELETE TO authenticated USING ((SELECT private.app_can('catalog.manage')) OR (SELECT private.app_can('support.manage')));

DROP POLICY IF EXISTS catalog_media_staff_insert ON storage.objects;
DROP POLICY IF EXISTS catalog_media_staff_update ON storage.objects;
DROP POLICY IF EXISTS catalog_media_staff_delete ON storage.objects;
CREATE POLICY catalog_media_staff_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'catalog-media' AND (SELECT private.app_can('catalog.manage')));
CREATE POLICY catalog_media_staff_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'catalog-media' AND (SELECT private.app_can('catalog.manage'))) WITH CHECK (bucket_id = 'catalog-media' AND (SELECT private.app_can('catalog.manage')));
CREATE POLICY catalog_media_staff_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'catalog-media' AND (SELECT private.app_can('catalog.manage')));

