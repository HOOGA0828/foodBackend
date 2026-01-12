-- ============================================
-- 完全重建資料庫腳本 - 警告：會刪除所有資料！
-- 使用前請確保已經備份重要資料
-- ============================================

-- 警告訊息
DO $$ 
BEGIN
    RAISE NOTICE '⚠️  警告：此腳本將刪除所有現有資料！';
    RAISE NOTICE '請確認您已備份所有重要資料！';
END $$;

-- ============================================
-- 1. 刪除所有現有表（按順序，考慮外鍵約束）
-- ============================================

DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS brands CASCADE;

-- ============================================
-- 2. 刪除現有函數和觸發器
-- ============================================

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================
-- 3. 執行完整的 schema.sql 內容
-- （這裡使用完整的 schema 建立語句）
-- ============================================

-- 啟用必要的擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- 4. 品牌/公司表 (brands)
-- ============================================
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL UNIQUE, -- 公司名字（主要欄位）
    name_en VARCHAR(200), -- 英文名稱（可選）
    name_jp VARCHAR(200), -- 日文名稱（可選）
    slug VARCHAR(100) NOT NULL UNIQUE, -- URL-friendly 識別符
    logo_url TEXT, -- 品牌 Logo URL
    website_url TEXT, -- 品牌官方網站
    description TEXT, -- 公司描述
    contact_email VARCHAR(255), -- 聯絡電子郵件
    contact_phone VARCHAR(50), -- 聯絡電話
    address TEXT, -- 公司地址
    is_active BOOLEAN DEFAULT TRUE, -- 是否啟用
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- 資料庫上次更新時間（自動更新）
);

-- 品牌表索引
CREATE INDEX idx_brands_name ON brands(name);
CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_brands_is_active ON brands(is_active);

-- ============================================
-- 5. 分類表 (categories)
-- ============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL, -- 分類名稱
    name_en VARCHAR(100), -- 英文名稱（可選）
    name_jp VARCHAR(100), -- 日文名稱（可選）
    slug VARCHAR(100) NOT NULL UNIQUE, -- URL-friendly 識別符
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL, -- 支援階層式分類
    description TEXT, -- 分類描述
    icon_url TEXT, -- 分類圖示 URL
    sort_order INTEGER DEFAULT 0, -- 排序順序
    is_active BOOLEAN DEFAULT TRUE, -- 是否啟用
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 分類表索引
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_is_active ON categories(is_active);

-- ============================================
-- 6. 產品表 (products)
-- ============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 基本資訊
    name VARCHAR(200) NOT NULL, -- 產品名稱
    name_en VARCHAR(200), -- 英文名稱（可選）
    name_jp VARCHAR(200), -- 日文名稱（可選）
    description TEXT, -- 產品敘述（主要欄位）
    description_en TEXT, -- 英文描述（可選）
    description_jp TEXT, -- 日文描述（可選）
    
    -- 關聯資訊
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    -- 產品提供時間區間（主要欄位）
    available_start_date TIMESTAMP WITH TIME ZONE, -- 提供開始時間
    available_end_date TIMESTAMP WITH TIME ZONE, -- 提供結束時間
    
    -- 價格資訊
    price DECIMAL(10, 2), -- 價格（支援小數）
    original_price DECIMAL(10, 2), -- 原價（特價商品用）
    currency VARCHAR(3) DEFAULT 'TWD', -- 貨幣代碼
    
    -- 媒體資訊
    image_urls TEXT[], -- 產品圖片 URL 陣列（支援多張圖片）
    thumbnail_url TEXT, -- 縮圖 URL
    
    -- 狀態管理
    status VARCHAR(50) NOT NULL DEFAULT 'available', -- 狀態: available, limited, sold_out, discontinued
    is_limited_edition BOOLEAN DEFAULT FALSE, -- 是否為期間限定
    is_region_limited BOOLEAN DEFAULT FALSE, -- 是否為地區限定
    available_regions TEXT[], -- 可購買地區陣列
    
    -- 產品詳細資訊
    specifications JSONB DEFAULT '{}'::jsonb, -- 產品規格（JSON格式，儲存尺寸、重量、規格等）
    tags TEXT[], -- 產品標籤陣列
    
    -- 爬蟲/資料來源相關
    source_url TEXT, -- 來源 URL
    source_identifier VARCHAR(255), -- 來源系統的唯一識別符
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 最後爬取時間
    last_verified_at TIMESTAMP WITH TIME ZONE, -- 最後驗證時間
    
    -- 發布資訊
    release_date TIMESTAMP WITH TIME ZONE, -- 產品發布日期
    
    -- 擴充資料（JSONB）- 儲存額外動態資訊
    metadata JSONB DEFAULT '{}'::jsonb, -- 存儲額外資訊:
                                        -- - 營養成分 (nutrition)
                                        -- - 過敏原 (allergens)
                                        -- - 保存期限 (shelf_life)
                                        -- - 尺寸/重量 (dimensions, weight)
                                        -- - 其他動態欄位
    
    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- 資料庫上次更新時間（主要欄位，自動更新）
);

-- 產品表索引
CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops); -- 全文搜索
CREATE INDEX idx_products_available_start ON products(available_start_date);
CREATE INDEX idx_products_available_end ON products(available_end_date);
CREATE INDEX idx_products_available_period ON products(available_start_date, available_end_date); -- 時間區間索引
CREATE INDEX idx_products_release_date ON products(release_date);
CREATE INDEX idx_products_scraped_at ON products(scraped_at);
CREATE INDEX idx_products_source_identifier ON products(source_identifier);
CREATE INDEX idx_products_updated_at ON products(updated_at); -- 更新時間索引，便於查詢最近更新的產品
CREATE INDEX idx_products_metadata_gin ON products USING GIN (metadata); -- JSONB 索引
CREATE INDEX idx_products_tags_gin ON products USING GIN (tags); -- 標籤搜索（GIN 索引）

-- 複合索引（常用查詢優化）
CREATE INDEX idx_products_brand_status ON products(brand_id, status);
CREATE INDEX idx_products_status_available_start ON products(status, available_start_date DESC);

-- ============================================
-- 7. 產品-分類多對多關聯表 (product_categories)
-- ============================================
CREATE TABLE product_categories (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE, -- 是否為主要分類
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (product_id, category_id)
);

CREATE INDEX idx_product_categories_product_id ON product_categories(product_id);
CREATE INDEX idx_product_categories_category_id ON product_categories(category_id);

-- ============================================
-- 8. 更新時間戳記自動更新函數
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為所有表添加 updated_at 自動更新觸發器
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. 資料驗證約束
-- ============================================

-- 確保價格為正數
ALTER TABLE products ADD CONSTRAINT check_price_positive 
    CHECK (price IS NULL OR price >= 0);

ALTER TABLE products ADD CONSTRAINT check_original_price_positive 
    CHECK (original_price IS NULL OR original_price >= 0);

-- 確保時間區間合理性（開始時間 <= 結束時間）
ALTER TABLE products ADD CONSTRAINT check_available_period_valid 
    CHECK (available_start_date IS NULL OR available_end_date IS NULL OR available_start_date <= available_end_date);

-- ============================================
-- 10. 初始化資料
-- ============================================

-- 插入範例品牌/公司
INSERT INTO brands (name, slug, description, is_active) VALUES
    ('範例食品公司', 'example-food-company', '一家專注於優質食品的公司', TRUE),
    ('健康生活企業', 'healthy-life-enterprise', '提供健康生活解決方案的企業', TRUE);

-- 插入常見分類
INSERT INTO categories (name, slug, description, sort_order) VALUES
    ('食品', 'food', '各種食品分類', 1),
    ('飲料', 'beverages', '各種飲料分類', 2),
    ('生鮮', 'fresh', '生鮮食品分類', 3),
    ('零食', 'snacks', '零食分類', 4),
    ('甜點', 'desserts', '甜點分類', 5);

-- 完成重建
SELECT 'Database reset and rebuilt successfully!' AS result;
