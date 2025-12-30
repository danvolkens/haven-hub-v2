-- Recalculate assets_generated counts based on actual approved assets
UPDATE quotes q
SET assets_generated = COALESCE(asset_counts.cnt, 0)
FROM (
  SELECT a.quote_id, COUNT(*) as cnt
  FROM assets a
  JOIN approval_items ai ON ai.reference_id = a.id AND ai.type = 'asset'
  WHERE ai.status = 'approved'
  GROUP BY a.quote_id
) asset_counts
WHERE q.id = asset_counts.quote_id;

-- Set to 0 for quotes with no approved assets
UPDATE quotes q
SET assets_generated = 0
WHERE NOT EXISTS (
  SELECT 1 FROM assets a
  JOIN approval_items ai ON ai.reference_id = a.id AND ai.type = 'asset'
  WHERE a.quote_id = q.id AND ai.status = 'approved'
);
