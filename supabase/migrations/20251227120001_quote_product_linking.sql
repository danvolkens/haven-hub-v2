-- Add product linking columns to quotes table
-- Allows linking quotes to Shopify products for pin destination URLs

-- Add product_id foreign key (links to products table)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- Add product_link for manual URL override
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS product_link TEXT;

-- Create index for product lookups
CREATE INDEX IF NOT EXISTS idx_quotes_product ON quotes(product_id) WHERE product_id IS NOT NULL;

-- Update RLS policies to allow updating product links
-- (RLS already allows UPDATE for user_id = auth.uid(), so no changes needed)

COMMENT ON COLUMN quotes.product_id IS 'Links to a product for automatic URL generation in pins';
COMMENT ON COLUMN quotes.product_link IS 'Manual product URL override (takes precedence over product_id)';
