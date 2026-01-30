-- Add is_expired column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE;

-- Add last_active_at column to track when the product was last seen in a scrape
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update index to include is_expired for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_is_expired ON products(is_expired);
