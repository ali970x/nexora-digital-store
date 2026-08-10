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
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions, pg_temp AS $$
  WITH candidates AS (
    SELECT product.id, product.slug, product.name, product.short_description, product.badges,
      product.status, product.product_type_code, category.slug AS category_slug,
      price.price_amount, price.currency_code,
      media.url AS primary_media_url, product.created_at,
      CASE
        WHEN nullif(trim(p_query), '') IS NULL THEN 0::real
        ELSE greatest(
          ts_rank(product.search_vector, websearch_to_tsquery('simple', trim(p_query))),
          extensions.word_similarity(lower(trim(p_query)), lower(product.search_text)),
          extensions.similarity(lower(trim(p_query)), lower(coalesce(product.name ->> p_locale, product.name ->> 'en', '')))
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
      AND product.published_at <= now()
      AND (nullif(trim(p_query), '') IS NULL OR
        product.search_vector @@ websearch_to_tsquery('simple', trim(p_query)) OR
        extensions.word_similarity(lower(trim(p_query)), lower(product.search_text)) >=
          CASE WHEN char_length(trim(p_query)) <= 4 THEN 0.25 ELSE 0.42 END OR
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
  SELECT candidates.id, candidates.slug, candidates.name, candidates.short_description,
    candidates.badges, candidates.status, candidates.product_type_code, candidates.category_slug,
    candidates.price_amount, candidates.currency_code, candidates.primary_media_url,
    candidates.search_rank, count(*) OVER() AS total_count
  FROM candidates
  ORDER BY
    CASE WHEN p_sort = 'price_asc' THEN price_amount END ASC,
    CASE WHEN p_sort = 'price_desc' THEN price_amount END DESC,
    CASE WHEN p_sort = 'newest' THEN created_at END DESC,
    CASE WHEN p_sort = 'relevance' THEN search_rank END DESC,
    id
  LIMIT least(greatest(p_limit, 1), 60)
  OFFSET greatest(p_offset, 0);
$$;
