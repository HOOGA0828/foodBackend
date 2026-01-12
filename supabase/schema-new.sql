-- ============================================
-- 新專案資料庫 Schema - 日本餐飲/超商新品追蹤系統
-- 使用 Supabase (PostgreSQL)
-- 核心功能：公司名字、產品敘述、產品提供時間區間、資料庫上次更新時間
-- ============================================

-- 啟用必要的擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- 用於全文搜索

-- ============================================
-- 1. 品牌/公司表 (brands)
-- ============================================
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL UNIQUE, -- 公司名字（主要欄位）
    name_en VARCHAR(200), -- 英文名稱
    name_jp VARCHAR(200), -- 日文名稱
    slug VARCHAR(100) NOT NULL UNIQUE, -- URL slug
    description TEXT, -- 公司描述
    category VARCHAR(50) DEFAULT 'convenience_store', -- 品牌類別
    website TEXT, -- 官方網站
    logo_url TEXT, -- Logo URL
    contact_email VARCHAR(255), -- 聯絡電子郵件
    contact_phone VARCHAR(50), -- 聯絡電話
    address TEXT, -- 公司地址
    is_active BOOLEAN DEFAULT TRUE, -- 是否啟用爬蟲
    crawl_config JSONB DEFAULT '{}'::jsonb, -- 爬蟲配置 (JSONB)
    last_crawled_at TIMESTAMP WITH TIME ZONE, -- 最後爬取時間
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- 資料庫上次更新時間（自動更新）
);

-- 品牌表索引
CREATE INDEX idx_brands_name ON brands(name);
CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_brands_is_active ON brands(is_active);
CREATE INDEX idx_brands_category ON brands(category);
CREATE INDEX idx_brands_last_crawled ON brands(last_crawled_at);
CREATE INDEX idx_brands_crawl_config_gin ON brands USING GIN (crawl_config);

-- ============================================
-- 2. 分類表 (categories)
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL, -- 分類名稱
    name_en VARCHAR(100), -- 英文名稱
    name_jp VARCHAR(100), -- 日文名稱
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
-- 3. 產品表 (products) - 核心表
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(300) NOT NULL, -- 產品名稱
    name_en VARCHAR(300), -- 英文名稱
    name_jp VARCHAR(300), -- 日文名稱
    description TEXT, -- 產品敘述（主要欄位）
    description_en TEXT, -- 英文描述
    description_jp TEXT, -- 日文描述

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
    video_urls TEXT[], -- 影片 URL 陣列

    -- 狀態管理
    status VARCHAR(50) NOT NULL DEFAULT 'available', -- available, limited, sold_out, discontinued
    is_limited_edition BOOLEAN DEFAULT FALSE, -- 是否為期間限定
    is_region_limited BOOLEAN DEFAULT FALSE, -- 是否為地區限定
    available_regions TEXT[], -- 可購買地區陣列

    -- 產品分類標籤
    tags TEXT[], -- 產品標籤陣列
    subcategories TEXT[], -- 次分類標籤（飲料類、季節限定等）

    -- 產品規格和營養資訊
    specifications JSONB DEFAULT '{}'::jsonb, -- 產品規格 (尺寸、重量、份量等)
    nutrition_info JSONB DEFAULT '{}'::jsonb, -- 營養資訊
    allergens TEXT[], -- 過敏原陣列

    -- 爬蟲和資料來源
    source_url TEXT, -- 來源 URL
    source_identifier VARCHAR(255), -- 來源系統唯一識別符
    crawled_from VARCHAR(100), -- 爬取來源品牌
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 最後爬取時間
    last_verified_at TIMESTAMP WITH TIME ZONE, -- 最後驗證時間

    -- 發布和更新資訊
    release_date TIMESTAMP WITH TIME ZONE, -- 產品發布日期
    is_new_product BOOLEAN DEFAULT FALSE, -- 是否為新品

    -- 擴充資料
    metadata JSONB DEFAULT '{}'::jsonb, -- 額外動態資訊
    crawl_metadata JSONB DEFAULT '{}'::jsonb, -- 爬蟲相關元資料

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
CREATE INDEX idx_products_updated_at ON products(updated_at); -- 更新時間索引
CREATE INDEX idx_products_is_new ON products(is_new_product);
CREATE INDEX idx_products_source_identifier ON products(source_identifier);

-- GIN 索引（全文搜索和陣列搜索）
CREATE INDEX idx_products_tags_gin ON products USING GIN (tags); -- 標籤搜索
CREATE INDEX idx_products_subcategories_gin ON products USING GIN (subcategories); -- 次分類搜索
CREATE INDEX idx_products_allergens_gin ON products USING GIN (allergens); -- 過敏原搜索
CREATE INDEX idx_products_metadata_gin ON products USING GIN (metadata);
CREATE INDEX idx_products_crawl_metadata_gin ON products USING GIN (crawl_metadata);

-- 複合索引
CREATE INDEX idx_products_brand_status ON products(brand_id, status);
CREATE INDEX idx_products_brand_available ON products(brand_id, available_start_date DESC);

-- ============================================
-- 4. 產品-分類多對多關聯表 (product_categories)
-- ============================================
CREATE TABLE IF NOT EXISTS product_categories (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE, -- 是否為主要分類
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (product_id, category_id)
);

CREATE INDEX idx_product_categories_product_id ON product_categories(product_id);
CREATE INDEX idx_product_categories_category_id ON product_categories(category_id);

-- ============================================
-- 5. 爬蟲執行記錄表 (crawler_runs)
-- ============================================
CREATE TABLE IF NOT EXISTS crawler_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID, -- 關聯品牌（可選，全域爬蟲用）
    brand_name VARCHAR(200) NOT NULL, -- 品牌名稱
    status VARCHAR(50) DEFAULT 'running', -- running, completed, failed, cancelled
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER, -- 執行時間（毫秒）
    products_found INTEGER DEFAULT 0, -- 發現的產品數量
    products_updated INTEGER DEFAULT 0, -- 更新的產品數量
    products_new INTEGER DEFAULT 0, -- 新增的產品數量
    error_message TEXT, -- 錯誤訊息
    metadata JSONB DEFAULT '{}'::jsonb, -- 執行元資料
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_crawler_runs_brand_id ON crawler_runs(brand_id);
CREATE INDEX idx_crawler_runs_status ON crawler_runs(status);
CREATE INDEX idx_crawler_runs_started_at ON crawler_runs(started_at);
CREATE INDEX idx_crawler_runs_completed_at ON crawler_runs(completed_at);

-- ============================================
-- 6. 產品變更記錄表 (product_changes) - 可選，用於追蹤產品變更歷史
-- ============================================
CREATE TABLE IF NOT EXISTS product_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL, -- 不設外鍵約束，避免刪除產品時的問題
    change_type VARCHAR(50) NOT NULL, -- created, updated, discontinued
    field_name VARCHAR(100), -- 變更的欄位名稱
    old_value TEXT, -- 舊值
    new_value TEXT, -- 新值
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by VARCHAR(100), -- 變更來源 (crawler, manual, api)
    metadata JSONB DEFAULT '{}'::jsonb,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_changes_product_id ON product_changes(product_id);
CREATE INDEX idx_product_changes_change_type ON product_changes(change_type);
CREATE INDEX idx_product_changes_changed_at ON product_changes(changed_at);

-- ============================================
-- 7. 更新時間戳記自動更新函數
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

CREATE TRIGGER update_crawler_runs_updated_at BEFORE UPDATE ON crawler_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. 資料驗證約束
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
-- 9. 初始化資料
-- ============================================

-- 插入預設分類
INSERT INTO categories (name, name_en, name_jp, slug, description, sort_order) VALUES
    ('食品', 'Food', '食品', 'food', '各種食品分類', 1),
    ('飲料', 'Beverages', '飲料', 'beverages', '各種飲料分類', 2),
    ('甜點', 'Desserts', 'スイーツ', 'desserts', '甜點分類', 3),
    ('零食', 'Snacks', 'スナック', 'snacks', '零食分類', 4),
    ('便當', 'Bento', 'お弁当', 'bento', '便當分類', 5),
    ('飯糰', 'Onigiri', 'おにぎり', 'onigiri', '飯糰分類', 6),
    ('三明治', 'Sandwiches', 'サンドイッチ', 'sandwiches', '三明治分類', 7),
    ('冰品', 'Ice Cream', 'アイスクリーム', 'ice-cream', '冰淇淋和冷凍甜點分類', 8)
ON CONFLICT (slug) DO NOTHING;

-- 插入支援的品牌（從 config/brands.ts 匯入）
INSERT INTO brands (name, name_en, name_jp, slug, category, website, description, is_active, crawl_config) VALUES
    ('7-Eleven', '7-Eleven', 'セブン-イレブン', '7-eleven', 'convenience_store', 'https://www.sej.co.jp/', '日本最大的便利商店連鎖品牌', TRUE, '{
        "url": "https://www.sej.co.jp/products/a/thisweek/area/kinki/",
        "pageType": "product_list",
        "selectors": {
            "newProductSelector": ".new-product-list",
            "productLinkSelector": ".product-item a[href], .new-product-item a[href]",
            "productTitleSelector": ".product-name, .item-title, h3, h4",
            "productImageSelector": ".product-image img, .item-image img",
            "newBadgeSelector": ".new-badge, .badge-new"
        },
        "deepCrawling": {"enabled": true, "maxProducts": 20, "detailPageWaitFor": 2000}
    }'),
    ('FamilyMart', 'FamilyMart', 'ファミリーマート', 'familymart', 'convenience_store', 'https://www.family.co.jp/', '日本大型便利商店品牌', TRUE, '{
        "url": "https://www.family.co.jp/goods.html",
        "pageType": "product_list",
        "selectors": {
            "newProductSelector": ".new-goods-list",
            "productLinkSelector": ".goods-item a[href], .product-link[href]",
            "productTitleSelector": ".goods-name, .product-title",
            "productImageSelector": ".goods-image img, .product-image img",
            "newBadgeSelector": ".new-icon, .badge-new"
        },
        "deepCrawling": {"enabled": true, "maxProducts": 20, "detailPageWaitFor": 2000}
    }'),
    ('Lawson', 'Lawson', 'ローソン', 'lawson', 'convenience_store', 'https://www.lawson.co.jp/', '日本知名便利商店品牌', TRUE, '{
        "url": "https://www.lawson.co.jp/index.html",
        "pageType": "homepage_banner",
        "selectors": {
            "newProductSelector": ".new-item-container",
            "productLinkSelector": ".item-link[href], .product-card a[href]",
            "productTitleSelector": ".item-title, .product-name",
            "productImageSelector": ".item-image img, .product-image img",
            "newBadgeSelector": ".new-label, .badge-new"
        },
        "deepCrawling": {"enabled": true, "maxProducts": 20, "detailPageWaitFor": 2000}
    }'),
    ('SushiRO', 'SushiRO', 'スシロー', 'sushiro', 'restaurant', 'https://www.akindo-sushiro.co.jp/', '迴轉壽司連鎖品牌', TRUE, '{
        "url": "https://www.akindo-sushiro.co.jp/campaign/",
        "pageType": "homepage_banner",
        "selectors": {
            "newProductSelector": ".menu-new-items",
            "productLinkSelector": ".menu-item a[href], .product-link[href]",
            "productTitleSelector": ".menu-title, .item-name",
            "productImageSelector": ".menu-image img, .item-image img",
            "newBadgeSelector": ".new-badge, .seasonal-badge"
        },
        "deepCrawling": {"enabled": true, "maxProducts": 15, "detailPageWaitFor": 2000}
    }'),
    ('McDonald''s', 'McDonald''s', 'マクドナルド', 'mcdonalds', 'fast_food', 'https://www.mcdonalds.co.jp/', '知名速食連鎖品牌', TRUE, '{
        "url": "https://www.mcdonalds.co.jp/",
        "pageType": "homepage_banner",
        "selectors": {
            "newProductSelector": ".seasonal-menu",
            "productLinkSelector": ".beverage-link[href], .menu-item a[href]",
            "productTitleSelector": ".beverage-name, .menu-title",
            "productImageSelector": ".beverage-image img, .menu-image img",
            "newBadgeSelector": ".seasonal-badge, .new-badge"
        },
        "deepCrawling": {"enabled": true, "maxProducts": 15, "detailPageWaitFor": 2000}
    }'),
    ('Yoshinoya', 'Yoshinoya', '吉野家', 'yoshinoya', 'restaurant', 'https://www.yoshinoya.com/', '牛肉飯專門店連鎖品牌', TRUE, '{
        "url": "https://www.yoshinoya.com/",
        "pageType": "homepage_banner",
        "selectors": {
            "newProductSelector": ".seasonal-menu",
            "productLinkSelector": ".beverage-link[href], .menu-item a[href]",
            "productTitleSelector": ".beverage-name, .menu-title",
            "productImageSelector": ".beverage-image img, .menu-image img",
            "newBadgeSelector": ".seasonal-badge, .new-badge"
        },
        "deepCrawling": {"enabled": true, "maxProducts": 15, "detailPageWaitFor": 2000}
    }'),
    ('Kura Sushi', 'Kura Sushi', 'くら寿司', 'kura-sushi', 'restaurant', 'https://www.kurasushi.co.jp/', '高級迴轉壽司品牌', TRUE, '{
        "url": "https://www.kurasushi.co.jp/",
        "pageType": "homepage_banner",
        "selectors": {
            "newProductSelector": ".seasonal-menu",
            "productLinkSelector": ".beverage-link[href], .menu-item a[href]",
            "productTitleSelector": ".beverage-name, .menu-title",
            "productImageSelector": ".beverage-image img, .menu-image img",
            "newBadgeSelector": ".seasonal-badge, .new-badge"
        },
        "deepCrawling": {"enabled": true, "maxProducts": 15, "detailPageWaitFor": 2000}
    }'),
    ('Starbucks', 'Starbucks', 'スターバックス', 'starbucks', 'restaurant', 'https://www.starbucks.co.jp/', '咖啡連鎖品牌', TRUE, '{
        "url": "https://www.starbucks.co.jp/",
        "pageType": "homepage_banner",
        "selectors": {
            "newProductSelector": ".seasonal-menu",
            "productLinkSelector": ".beverage-link[href], .menu-item a[href]",
            "productTitleSelector": ".beverage-name, .menu-title",
            "productImageSelector": ".beverage-image img, .menu-image img",
            "newBadgeSelector": ".seasonal-badge, .new-badge"
        },
        "deepCrawling": {"enabled": true, "maxProducts": 15, "detailPageWaitFor": 2000}
    }')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 10. Row Level Security (RLS) 設定建議
-- ============================================
-- 如需啟用 RLS，請在 Supabase Dashboard 中設定：
-- ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE crawler_runs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE product_changes ENABLE ROW LEVEL SECURITY;

-- 範例：允許所有人讀取，但只有認證使用者可以寫入
-- CREATE POLICY "Anyone can view brands" ON brands FOR SELECT USING (true);
-- CREATE POLICY "Authenticated users can insert brands" ON brands FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 完成資料庫初始化
SELECT 'New database schema created successfully!' AS result;