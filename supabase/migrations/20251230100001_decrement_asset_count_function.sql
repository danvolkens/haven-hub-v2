-- Function to decrement a quote's assets_generated count
CREATE OR REPLACE FUNCTION decrement_quote_asset_count(p_quote_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE quotes
  SET assets_generated = GREATEST(0, assets_generated - 1)
  WHERE id = p_quote_id;
END;
$$;

-- Function to decrement quote asset counts for multiple assets
CREATE OR REPLACE FUNCTION decrement_quote_asset_counts(p_asset_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Decrement count for each unique quote_id
  UPDATE quotes q
  SET assets_generated = GREATEST(0, q.assets_generated - asset_counts.cnt)
  FROM (
    SELECT quote_id, COUNT(*) as cnt
    FROM assets
    WHERE id = ANY(p_asset_ids)
    GROUP BY quote_id
  ) asset_counts
  WHERE q.id = asset_counts.quote_id;
END;
$$;
