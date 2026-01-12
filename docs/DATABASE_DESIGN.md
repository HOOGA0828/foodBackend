# 資料庫設計文件

## 核心需求

根據您的需求，資料庫設計包含以下核心欄位：

1. **公司名字** - `brands.name`
2. **產品敘述** - `products.description`
3. **產品提供時間區間** - `products.available_start_date` 和 `products.available_end_date`
4. **資料庫上次更新時間** - `brands.updated_at` 和 `products.updated_at`（自動更新）

## 資料庫架構總覽

本資料庫設計採用正規化結構，包含以下主要資料表：

- **brands** - 品牌/公司表
- **categories** - 分類表（支援階層結構）
- **products** - 產品表
- **product_categories** - 產品-分類關聯表（多對多）

## 資料表詳細設計

### 1. brands（品牌/公司表）

**核心欄位：**
- `name` (VARCHAR(200), UNIQUE, NOT NULL) - **公司名字（主要欄位）**
- `updated_at` (TIMESTAMP WITH TIME ZONE) - **資料庫上次更新時間（自動更新）**

**其他欄位：**
- `id` (UUID, PRIMARY KEY) - 主鍵
- `name_en` (VARCHAR(200)) - 英文名稱（可選）
- `name_jp` (VARCHAR(200)) - 日文名稱（可選）
- `slug` (VARCHAR(100), UNIQUE) - URL 友善識別符
- `logo_url` (TEXT) - Logo URL
- `website_url` (TEXT) - 官方網站
- `description` (TEXT) - 公司描述
- `contact_email` (VARCHAR(255)) - 聯絡電子郵件
- `contact_phone` (VARCHAR(50)) - 聯絡電話
- `address` (TEXT) - 公司地址
- `is_active` (BOOLEAN, DEFAULT TRUE) - 是否啟用
- `created_at` (TIMESTAMP WITH TIME ZONE) - 建立時間

**索引：**
- `idx_brands_name` - 公司名字索引
- `idx_brands_slug` - slug 索引
- `idx_brands_is_active` - 啟用狀態索引

### 2. categories（分類表）

**主要欄位：**
- `name` (VARCHAR(100), NOT NULL) - 分類名稱
- `id` (UUID, PRIMARY KEY) - 主鍵
- `slug` (VARCHAR(100), UNIQUE) - URL 友善識別符
- `parent_id` (UUID) - 父分類 ID（支援階層結構）
- `description` (TEXT) - 分類描述
- `icon_url` (TEXT) - 分類圖示 URL
- `sort_order` (INTEGER, DEFAULT 0) - 排序順序
- `is_active` (BOOLEAN, DEFAULT TRUE) - 是否啟用
- `name_en` (VARCHAR(100)) - 英文名稱（可選）
- `name_jp` (VARCHAR(100)) - 日文名稱（可選）
- `created_at` (TIMESTAMP WITH TIME ZONE) - 建立時間
- `updated_at` (TIMESTAMP WITH TIME ZONE) - 更新時間（自動更新）

**索引：**
- `idx_categories_name` - 分類名稱索引
- `idx_categories_slug` - slug 索引
- `idx_categories_parent_id` - 父分類索引
- `idx_categories_is_active` - 啟用狀態索引

### 3. products（產品表）

**核心欄位：**
- `description` (TEXT) - **產品敘述（主要欄位）**
- `available_start_date` (TIMESTAMP WITH TIME ZONE) - **產品提供開始時間（主要欄位）**
- `available_end_date` (TIMESTAMP WITH TIME ZONE) - **產品提供結束時間（主要欄位）**
- `updated_at` (TIMESTAMP WITH TIME ZONE) - **資料庫上次更新時間（主要欄位，自動更新）**

**基本資訊：**
- `id` (UUID, PRIMARY KEY) - 主鍵
- `name` (VARCHAR(200), NOT NULL) - 產品名稱
- `name_en` (VARCHAR(200)) - 英文名稱（可選）
- `name_jp` (VARCHAR(200)) - 日文名稱（可選）
- `description_en` (TEXT) - 英文描述（可選）
- `description_jp` (TEXT) - 日文描述（可選）

**關聯資訊：**
- `brand_id` (UUID, NOT NULL, FK → brands.id) - 品牌外鍵
- `category_id` (UUID, FK → categories.id) - 主要分類外鍵

**價格資訊：**
- `price` (DECIMAL(10, 2)) - 價格（支援小數）
- `original_price` (DECIMAL(10, 2)) - 原價（特價商品用）
- `currency` (VARCHAR(3), DEFAULT 'TWD') - 貨幣代碼

**媒體資訊：**
- `image_urls` (TEXT[]) - 產品圖片 URL 陣列（支援多張圖片）
- `thumbnail_url` (TEXT) - 縮圖 URL

**狀態管理：**
- `status` (VARCHAR(50), DEFAULT 'available') - 狀態
  - `available` - 正常販售
  - `limited` - 期間限定
  - `sold_out` - 售完
  - `discontinued` - 已停產
- `is_limited_edition` (BOOLEAN, DEFAULT FALSE) - 是否為期間限定
- `is_region_limited` (BOOLEAN, DEFAULT FALSE) - 是否為地區限定
- `available_regions` (TEXT[]) - 可購買地區陣列

**產品詳細資訊：**
- `specifications` (JSONB, DEFAULT '{}') - 產品規格（JSON 格式）
  - 範例：`{"weight": "50g", "dimensions": "10cm x 5cm x 2cm"}`
- `tags` (TEXT[]) - 產品標籤陣列

**資料來源相關：**
- `source_url` (TEXT) - 來源 URL
- `source_identifier` (VARCHAR(255)) - 來源系統的唯一識別符
- `scraped_at` (TIMESTAMP WITH TIME ZONE) - 最後爬取時間
- `last_verified_at` (TIMESTAMP WITH TIME ZONE) - 最後驗證時間

**發布資訊：**
- `release_date` (TIMESTAMP WITH TIME ZONE) - 產品發布日期

**擴充資料：**
- `metadata` (JSONB, DEFAULT '{}') - 額外動態資訊
  - 範例：`{"nutrition": {...}, "allergens": [...], "shelf_life": "30 days"}`

**時間戳記：**
- `created_at` (TIMESTAMP WITH TIME ZONE) - 建立時間

**索引：**
- `idx_products_brand_id` - 品牌外鍵索引
- `idx_products_category_id` - 分類外鍵索引
- `idx_products_status` - 狀態索引
- `idx_products_name` - 產品名稱索引
- `idx_products_name_trgm` - 產品名稱全文搜索索引（GIN）
- `idx_products_available_start` - 提供開始時間索引
- `idx_products_available_end` - 提供結束時間索引
- `idx_products_available_period` - 時間區間複合索引
- `idx_products_release_date` - 發布日期索引
- `idx_products_updated_at` - **更新時間索引**（便於查詢最近更新的產品）
- `idx_products_metadata_gin` - 元資料 JSONB 索引（GIN）
- `idx_products_tags_gin` - 標籤陣列索引（GIN）
- `idx_products_source_identifier` - 來源識別符索引
- `idx_products_brand_status` - 品牌-狀態複合索引
- `idx_products_status_available_start` - 狀態-提供開始時間複合索引

**資料驗證約束：**
- `check_price_positive` - 確保價格 >= 0
- `check_original_price_positive` - 確保原價 >= 0
- `check_available_period_valid` - 確保 `available_start_date <= available_end_date`

### 4. product_categories（產品-分類關聯表）

**欄位：**
- `product_id` (UUID, FK → products.id) - 產品外鍵
- `category_id` (UUID, FK → categories.id) - 分類外鍵
- `is_primary` (BOOLEAN, DEFAULT FALSE) - 是否為主要分類
- `created_at` (TIMESTAMP WITH TIME ZONE) - 建立時間
- PRIMARY KEY (`product_id`, `category_id`) - 複合主鍵

**索引：**
- `idx_product_categories_product_id` - 產品外鍵索引
- `idx_product_categories_category_id` - 分類外鍵索引

## 自動更新機制

所有表的 `updated_at` 欄位都會透過觸發器自動更新：

```sql
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

當任何欄位更新時，`updated_at` 會自動更新為當前時間，無需手動維護。

## 常用查詢範例

### 1. 查詢特定公司的所有產品
```sql
SELECT p.*, b.name as company_name
FROM products p
JOIN brands b ON p.brand_id = b.id
WHERE b.name = '範例食品公司';
```

### 2. 查詢提供時間區間內的產品
```sql
SELECT * FROM products
WHERE available_start_date <= NOW()
  AND available_end_date >= NOW();
```

### 3. 查詢最近更新的產品（根據資料庫上次更新時間）
```sql
SELECT * FROM products
ORDER BY updated_at DESC
LIMIT 10;
```

### 4. 查詢特定產品的完整資訊（包含公司名字和產品敘述）
```sql
SELECT 
    p.name as product_name,
    p.description as product_description,
    p.available_start_date,
    p.available_end_date,
    p.updated_at as last_updated,
    b.name as company_name,
    c.name as category_name
FROM products p
JOIN brands b ON p.brand_id = b.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.id = 'product-uuid';
```

### 5. 使用 Prisma 查詢（TypeScript）
```typescript
// 查詢包含所有核心欄位的產品
const products = await prisma.product.findMany({
  include: {
    brand: {
      select: {
        name: true, // 公司名字
        updatedAt: true, // 資料庫上次更新時間
      }
    }
  },
  where: {
    availableStartDate: {
      lte: new Date() // 提供開始時間 <= 現在
    },
    availableEndDate: {
      gte: new Date() // 提供結束時間 >= 現在
    }
  },
  orderBy: {
    updatedAt: 'desc' // 按資料庫上次更新時間排序
  }
});

// 每個產品都包含：
// - product.description（產品敘述）
// - product.availableStartDate（提供開始時間）
// - product.availableEndDate（提供結束時間）
// - product.updatedAt（資料庫上次更新時間）
// - product.brand.name（公司名字）
```

## 設計特點

### 1. 核心需求完整支援
✅ **公司名字** - `brands.name`（唯一，必填）  
✅ **產品敘述** - `products.description`（文字欄位，支援長描述）  
✅ **產品提供時間區間** - `products.available_start_date` 和 `products.available_end_date`（支援時區）  
✅ **資料庫上次更新時間** - `brands.updated_at` 和 `products.updated_at`（自動更新，有索引）

### 2. 擴展性
- 支援多語言名稱（name, name_en, name_jp）
- 使用 JSONB 欄位儲存動態資訊（specifications, metadata）
- 支援標籤系統（tags 陣列）
- 支援階層式分類（parent_id）

### 3. 效能優化
- 完整的索引策略（單欄索引、複合索引、GIN 索引）
- 全文搜索支援（pg_trgm）
- 時間區間查詢優化

### 4. 資料完整性
- 外鍵約束確保關聯完整性
- 檢查約束確保資料合理性（價格、時間區間）
- 唯一約束防止重複資料

### 5. 維護便利性
- 自動時間戳記更新
- 清晰的欄位命名和註解
- 標準化的命名慣例（snake_case）

## 遷移指南

如果您已經有舊的資料庫結構，需要執行以下遷移：

### 主要變更：
1. **Brand 表**：`name_jp`/`name_zh` → `name`（主要欄位）+ `name_en`/`name_jp`（可選）
2. **Category 表**：`name_jp`/`name_zh` → `name`（主要欄位）+ `name_en`/`name_jp`（可選）
3. **Product 表**：
   - `name_jp`/`name_zh` → `name`（主要欄位）
   - `description_jp`/`description_zh` → `description`（主要欄位）
   - `limited_period_start`/`limited_period_end` → `available_start_date`/`available_end_date`
   - `price_jpy`/`original_price_jpy` → `price`/`original_price`（DECIMAL）
   - 新增 `specifications` (JSONB) 和 `tags` (TEXT[])
   - 移除 `translation_status` 和 `translation_updated_at`

### 使用 Prisma 遷移：
```bash
# 生成 Prisma Client
npm run prisma:generate

# 建立遷移（如果使用 migrate）
npm run prisma:migrate

# 或直接推送（開發環境）
npm run prisma:push
```

## 下一步

1. 執行 SQL Schema：在 Supabase Dashboard 執行 `supabase/schema.sql`
2. 生成 Prisma Client：`npm run prisma:generate`
3. 測試連線：`npm run test:connection`
4. 測試新增資料：`npm run test:insert`

## 注意事項

- 所有時間欄位使用 `TIMESTAMP WITH TIME ZONE` 以確保時區正確性
- 價格使用 `DECIMAL(10, 2)` 以確保精度
- JSONB 欄位已建立 GIN 索引以支援快速查詢
- 陣列欄位（tags, image_urls）已建立適當的索引
- 外鍵設定為 `ON DELETE CASCADE` 以確保資料一致性
