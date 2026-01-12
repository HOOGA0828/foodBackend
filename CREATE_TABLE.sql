-- 創建日本餐飲新品爬取資料表
-- 請在 Supabase SQL Editor 中執行此腳本

-- 創建主資料表
CREATE TABLE IF NOT EXISTS product_scrapes (
  id SERIAL PRIMARY KEY,
  brand_name TEXT NOT NULL,
  brand_display_name TEXT NOT NULL,
  brand_category TEXT NOT NULL,
  products_count INTEGER NOT NULL DEFAULT 0,
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_product_scrapes_brand_name ON product_scrapes(brand_name);
CREATE INDEX IF NOT EXISTS idx_product_scrapes_brand_category ON product_scrapes(brand_category);
CREATE INDEX IF NOT EXISTS idx_product_scrapes_scraped_at ON product_scrapes(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_scrapes_status ON product_scrapes(status);
CREATE INDEX IF NOT EXISTS idx_product_scrapes_created_at ON product_scrapes(created_at DESC);

-- 創建複合索引，避免重複資料
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_scrapes_unique
ON product_scrapes(brand_name, DATE(scraped_at));

-- 創建更新時間觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_scrapes_updated_at
    BEFORE UPDATE ON product_scrapes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 創建一些實用的視圖
CREATE OR REPLACE VIEW latest_product_scrapes AS
SELECT DISTINCT ON (brand_name)
    id,
    brand_name,
    brand_display_name,
    brand_category,
    products_count,
    scraped_at,
    status,
    execution_time_ms
FROM product_scrapes
ORDER BY brand_name, scraped_at DESC;

-- 創建統計視圖
CREATE OR REPLACE VIEW product_scrapes_stats AS
SELECT
    brand_name,
    brand_display_name,
    brand_category,
    COUNT(*) as total_scrapes,
    MAX(scraped_at) as last_scraped,
    AVG(products_count) as avg_products_count,
    AVG(execution_time_ms) as avg_execution_time_ms
FROM product_scrapes
GROUP BY brand_name, brand_display_name, brand_category
ORDER BY last_scraped DESC;

-- 設定資料表權限（如果需要）
-- GRANT ALL ON product_scrapes TO authenticated;
-- GRANT ALL ON product_scrapes TO service_role;

COMMENT ON TABLE product_scrapes IS '日本餐飲新品爬取記錄';
COMMENT ON COLUMN product_scrapes.brand_name IS '品牌代碼';
COMMENT ON COLUMN product_scrapes.brand_display_name IS '品牌顯示名稱';
COMMENT ON COLUMN product_scrapes.brand_category IS '品牌分類';
COMMENT ON COLUMN product_scrapes.products_count IS '產品數量';
COMMENT ON COLUMN product_scrapes.products IS '產品詳細資訊JSON';
COMMENT ON COLUMN product_scrapes.scraped_at IS '爬取時間';
COMMENT ON COLUMN product_scrapes.status IS '爬取狀態';
COMMENT ON COLUMN product_scrapes.execution_time_ms IS '執行時間(毫秒)';