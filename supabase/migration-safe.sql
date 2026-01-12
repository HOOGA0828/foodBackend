-- ============================================
-- 安全遷移腳本 - 適用於已有資料庫的情況
-- 此腳本會：
-- 1. 檢查並新增缺少的欄位
-- 2. 保留現有資料
-- 3. 建立缺少的索引和約束
-- ============================================

-- 啟用必要的擴展（如果尚未啟用）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- 1. 遷移 brands 表
-- ============================================

-- 如果表不存在，建立新表
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL UNIQUE,
    name_en VARCHAR(200),
    name_jp VARCHAR(200),
    slug VARCHAR(100) NOT NULL UNIQUE,
    logo_url TEXT,
    website_url TEXT,
    description TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 如果表已存在，新增缺少的欄位
DO $$ 
BEGIN
    -- 檢查並新增 name 欄位（主要欄位）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='name') THEN
        -- 如果舊欄位存在，先遷移資料
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='name_jp') THEN
            ALTER TABLE brands ADD COLUMN name VARCHAR(200);
            UPDATE brands SET name = COALESCE(name_zh, name_jp) WHERE name IS NULL;
            ALTER TABLE brands ALTER COLUMN name SET NOT NULL;
            ALTER TABLE brands ADD CONSTRAINT brands_name_unique UNIQUE (name);
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='brands' AND column_name='name_zh') THEN
            ALTER TABLE brands ADD COLUMN name VARCHAR(200);
            UPDATE brands SET name = name_zh WHERE name IS NULL;
            ALTER TABLE brands ALTER COLUMN name SET NOT NULL;
            ALTER TABLE brands ADD CONSTRAINT brands_name_unique UNIQUE (name);
        ELSE
            ALTER TABLE brands ADD COLUMN name VARCHAR(200) NOT NULL;
            ALTER TABLE brands ADD CONSTRAINT brands_name_unique UNIQUE (name);
        END IF;
    END IF;

    -- 新增其他缺少的欄位
    ALTER TABLE brands ADD COLUMN IF NOT EXISTS name_en VARCHAR(200);
    ALTER TABLE brands ADD COLUMN IF NOT EXISTS name_jp VARCHAR(200);
    ALTER TABLE brands ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE brands ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
    ALTER TABLE brands ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
    ALTER TABLE brands ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE brands ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
END $$;

-- 建立缺少的索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_is_active ON brands(is_active);

-- ============================================
-- 2. 遷移 categories 表
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    name_jp VARCHAR(100),
    slug VARCHAR(100) NOT NULL UNIQUE,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    icon_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
    -- 檢查並新增 name 欄位（主要欄位）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='name') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='name_jp') THEN
            ALTER TABLE categories ADD COLUMN name VARCHAR(100);
            UPDATE categories SET name = COALESCE(name_zh, name_jp) WHERE name IS NULL;
            ALTER TABLE categories ALTER COLUMN name SET NOT NULL;
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='name_zh') THEN
            ALTER TABLE categories ADD COLUMN name VARCHAR(100);
            UPDATE categories SET name = name_zh WHERE name IS NULL;
            ALTER TABLE categories ALTER COLUMN name SET NOT NULL;
        ELSE
            ALTER TABLE categories ADD COLUMN name VARCHAR(100) NOT NULL;
        END IF;
    END IF;

    ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_en VARCHAR(100);
    ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_jp VARCHAR(100);
    ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon_url TEXT;
    ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
END $$;

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- ============================================
-- 3. 遷移 products 表（最複雜的部分）
-- ============================================

-- 先建立表結構（如果不存在）
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    name_jp VARCHAR(200),
    description TEXT,
    description_en TEXT,
    description_jp TEXT,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    available_start_date TIMESTAMP WITH TIME ZONE,
    available_end_date TIMESTAMP WITH TIME ZONE,
    price DECIMAL(10, 2),
    original_price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'TWD',
    image_urls TEXT[],
    thumbnail_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    is_limited_edition BOOLEAN DEFAULT FALSE,
    is_region_limited BOOLEAN DEFAULT FALSE,
    available_regions TEXT[],
    specifications JSONB DEFAULT '{}'::jsonb,
    tags TEXT[],
    source_url TEXT,
    source_identifier VARCHAR(255),
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_verified_at TIMESTAMP WITH TIME ZONE,
    release_date TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN
    -- 遷移 name 欄位
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='name') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='name_jp') THEN
            ALTER TABLE products ADD COLUMN name VARCHAR(200);
            UPDATE products SET name = COALESCE(name_zh, name_jp) WHERE name IS NULL;
            ALTER TABLE products ALTER COLUMN name SET NOT NULL;
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='name_zh') THEN
            ALTER TABLE products ADD COLUMN name VARCHAR(200);
            UPDATE products SET name = name_zh WHERE name IS NULL;
            ALTER TABLE products ALTER COLUMN name SET NOT NULL;
        ELSE
            ALTER TABLE products ADD COLUMN name VARCHAR(200) NOT NULL;
        END IF;
    END IF;

    -- 遷移 description 欄位
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='description') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='description_jp') THEN
            ALTER TABLE products ADD COLUMN description TEXT;
            UPDATE products SET description = COALESCE(description_zh, description_jp) WHERE description IS NULL;
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='description_zh') THEN
            ALTER TABLE products ADD COLUMN description TEXT;
            UPDATE products SET description = description_zh WHERE description IS NULL;
        ELSE
            ALTER TABLE products ADD COLUMN description TEXT;
        END IF;
    END IF;

    -- 遷移時間區間欄位
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='available_start_date') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='limited_period_start') THEN
            ALTER TABLE products ADD COLUMN available_start_date TIMESTAMP WITH TIME ZONE;
            UPDATE products SET available_start_date = limited_period_start::TIMESTAMP WITH TIME ZONE;
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='display_start_date') THEN
            ALTER TABLE products ADD COLUMN available_start_date TIMESTAMP WITH TIME ZONE;
            UPDATE products SET available_start_date = display_start_date::TIMESTAMP WITH TIME ZONE;
        ELSE
            ALTER TABLE products ADD COLUMN available_start_date TIMESTAMP WITH TIME ZONE;
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='available_end_date') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='limited_period_end') THEN
            ALTER TABLE products ADD COLUMN available_end_date TIMESTAMP WITH TIME ZONE;
            UPDATE products SET available_end_date = limited_period_end::TIMESTAMP WITH TIME ZONE;
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='display_end_date') THEN
            ALTER TABLE products ADD COLUMN available_end_date TIMESTAMP WITH TIME ZONE;
            UPDATE products SET available_end_date = display_end_date::TIMESTAMP WITH TIME ZONE;
        ELSE
            ALTER TABLE products ADD COLUMN available_end_date TIMESTAMP WITH TIME ZONE;
        END IF;
    END IF;

    -- 遷移價格欄位（從 INTEGER 轉 DECIMAL）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='price') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='price_jpy') THEN
            ALTER TABLE products ADD COLUMN price DECIMAL(10, 2);
            UPDATE products SET price = price_jpy::DECIMAL(10, 2) WHERE price_jpy IS NOT NULL;
        ELSE
            ALTER TABLE products ADD COLUMN price DECIMAL(10, 2);
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='original_price') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='original_price_jpy') THEN
            ALTER TABLE products ADD COLUMN original_price DECIMAL(10, 2);
            UPDATE products SET original_price = original_price_jpy::DECIMAL(10, 2) WHERE original_price_jpy IS NOT NULL;
        ELSE
            ALTER TABLE products ADD COLUMN original_price DECIMAL(10, 2);
        END IF;
    END IF;

    -- 更新貨幣預設值
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='currency') THEN
        UPDATE products SET currency = 'TWD' WHERE currency IS NULL;
    ELSE
        ALTER TABLE products ADD COLUMN currency VARCHAR(3) DEFAULT 'TWD';
    END IF;

    -- 新增其他缺少的欄位
    ALTER TABLE products ADD COLUMN IF NOT EXISTS name_en VARCHAR(200);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS name_jp VARCHAR(200);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS description_en TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS description_jp TEXT;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[];
    ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
END $$;

-- 建立所有索引
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_available_start ON products(available_start_date);
CREATE INDEX IF NOT EXISTS idx_products_available_end ON products(available_end_date);
CREATE INDEX IF NOT EXISTS idx_products_available_period ON products(available_start_date, available_end_date);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);

-- 全文搜索索引（可能需要刪除舊的）
DROP INDEX IF EXISTS idx_products_name_jp_trgm;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_release_date ON products(release_date);
CREATE INDEX IF NOT EXISTS idx_products_scraped_at ON products(scraped_at);
CREATE INDEX IF NOT EXISTS idx_products_source_identifier ON products(source_identifier);
CREATE INDEX IF NOT EXISTS idx_products_metadata_gin ON products USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_products_tags_gin ON products USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_products_brand_status ON products(brand_id, status);
CREATE INDEX IF NOT EXISTS idx_products_status_available_start ON products(status, available_start_date DESC);

-- ============================================
-- 4. 遷移 product_categories 表
-- ============================================

CREATE TABLE IF NOT EXISTS product_categories (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (product_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON product_categories(category_id);

-- ============================================
-- 5. 建立或更新觸發器函數和觸發器
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. 新增或更新資料驗證約束
-- ============================================

-- 刪除舊約束（如果存在）
ALTER TABLE products DROP CONSTRAINT IF EXISTS check_price_positive;
ALTER TABLE products DROP CONSTRAINT IF EXISTS check_original_price_positive;
ALTER TABLE products DROP CONSTRAINT IF EXISTS check_available_period_valid;

-- 新增約束
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_price_positive'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT check_price_positive 
            CHECK (price IS NULL OR price >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_original_price_positive'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT check_original_price_positive 
            CHECK (original_price IS NULL OR original_price >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_available_period_valid'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT check_available_period_valid 
            CHECK (available_start_date IS NULL OR available_end_date IS NULL OR available_start_date <= available_end_date);
    END IF;
END $$;

-- 完成遷移
SELECT 'Migration completed successfully!' AS result;
