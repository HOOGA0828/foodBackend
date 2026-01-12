# 資料庫架構設計文件

## 資料庫 Schema 總覽

本專案使用正規化的資料庫設計，確保資料一致性和易於維護。

## 實體關係圖 (ERD)

```
┌─────────────┐         ┌──────────────┐
│   brands    │◄───────┤│   products   │
│             │   1:N   ││              │
│ - id (PK)   │         ││ - id (PK)    │
│ - name_jp   │         ││ - name_jp    │
│ - name_zh   │         ││ - name_zh    │
│ - slug      │         ││ - brand_id   │
└─────────────┘         ││ - category_id│
                        ││ - price_jpy  │
┌─────────────┐         ││ - status     │
│ categories  │◄───────┤│ - metadata   │
│             │   N:M   ││   (JSONB)    │
│ - id (PK)   │         └──────────────┘
│ - name_jp   │              ▲
│ - name_zh   │              │
│ - parent_id │              │
└─────────────┘              │
      ▲                      │
      │ 1:N (階層)           │
      │                      │
      └──────────────────────┘
              │
              │ N:M
              ▼
    ┌──────────────────────┐
    │ product_categories   │
    │                      │
    │ - product_id (FK)    │
    │ - category_id (FK)   │
    │ - is_primary         │
    └──────────────────────┘
```

## 資料表詳細說明

### 1. brands（品牌表）

**用途**: 儲存品牌基本資訊

**主要欄位**:
- `id`: UUID 主鍵
- `name_jp`: 日文品牌名稱（必填，唯一）
- `name_zh`: 中文品牌名稱（可選）
- `slug`: URL 友善的識別符（唯一，用於 API 路由）
- `is_active`: 是否啟用追蹤

**設計考量**:
- 使用 `slug` 而非 `id` 作為對外識別符，提升 API 可讀性
- 支援多語言名稱，便於未來擴展其他語言
- `is_active` 允許暫時停用某些品牌的追蹤

**預設資料**:
- Lawson (ローソン)
- 7-Eleven (セブン-イレブン)
- FamilyMart (ファミリーマート)
- McDonald's (マクドナルド)
- Sukiya (すき家)
- Yoshinoya (吉野家)

### 2. categories（分類表）

**用途**: 產品分類，支援階層式結構

**主要欄位**:
- `id`: UUID 主鍵
- `name_jp`: 日文分類名稱
- `name_zh`: 中文分類名稱
- `slug`: URL 友善識別符
- `parent_id`: 父分類 ID（支援階層結構）
- `sort_order`: 排序順序

**設計考量**:
- 支援階層式分類（例如：飲料 > 咖啡 > 拿鐵）
- 自關聯設計允許無限層級
- `sort_order` 用於控制顯示順序

**預設資料**:
- 便當（お弁当）
- 飯糰（おにぎり）
- 三明治（サンドイッチ）
- 甜點（スイーツ）
- 飲料（ドリンク）
- 冰淇淋（アイス）
- 零食（スナック）
- 即食食品（インスタント）

### 3. products（產品表）

**用途**: 核心產品資料表

**關鍵欄位分組**:

#### 基本資訊
- `name_jp`: 日文產品名稱（必填）
- `name_zh`: 中文名稱（可選，可手動輸入或未來整合翻譯服務）
- `description_jp`: 日文描述
- `description_zh`: 中文描述（可選，可手動輸入或未來整合翻譯服務）

#### 關聯
- `brand_id`: 品牌外鍵（必填）
- `category_id`: 主要分類外鍵（可選，用於快速查詢）

#### 價格
- `price_jpy`: 日圓價格（整數，避免浮點精度問題）
- `original_price_jpy`: 原價（特價商品用）
- `currency`: 貨幣代碼（預設 JPY）

#### 媒體
- `image_urls`: 圖片 URL 陣列（支援多張圖片）
- `thumbnail_url`: 縮圖 URL（優化載入速度）

#### 狀態管理
- `status`: 產品狀態
  - `available`: 正常販售
  - `limited`: 期間限定
  - `region_limited`: 地區限定
  - `sold_out`: 售完
  - `discontinued`: 已停產
- `is_limited_edition`: 是否為期間限定
- `is_region_limited`: 是否為地區限定
- `limited_period_start/end`: 限定期間
- `available_regions`: 可購買地區陣列

#### 爬蟲相關
- `source_url`: 原始爬取 URL
- `source_identifier`: 來源系統唯一識別符（用於去重）
- `scraped_at`: 最後爬取時間
- `last_verified_at`: 最後驗證時間

#### 發布資訊
- `release_date`: 產品發布日期
- `display_start_date`: 展示開始日期
- `display_end_date`: 展示結束日期

#### 擴充資料（JSONB）
`metadata` 欄位用於儲存動態資訊，結構範例：
```json
{
  "nutrition": {
    "calories": 450,
    "protein": 15.2,
    "fat": 12.5,
    "carbohydrates": 65.0
  },
  "allergens": ["小麥", "乳製品", "大豆"],
  "shelf_life": "3天",
  "dimensions": {
    "weight": "250g",
    "size": "12cm x 8cm x 4cm"
  },
  "storage": "需冷藏"
}
```

#### 翻譯狀態（保留欄位，供未來使用）
- `translation_status`: 翻譯狀態（pending, processing, completed, failed）
- `translation_updated_at`: 最後翻譯時間

**設計考量**:
- 使用整數儲存價格，避免浮點數精度問題
- `source_identifier` 建立唯一索引，防止重複爬取
- JSONB 欄位提供彈性，可儲存不同品牌的額外資訊
- 完整的時間戳記追蹤，便於維護和審計
- 狀態欄位支援複雜的業務邏輯

### 4. product_categories（產品-分類關聯表）

**用途**: 實現產品與分類的多對多關係

**主要欄位**:
- `product_id`: 產品 ID（外鍵）
- `category_id`: 分類 ID（外鍵）
- `is_primary`: 是否為主要分類

**設計考量**:
- 允許一個產品屬於多個分類（例如：既是「甜點」又是「期間限定」）
- `is_primary` 標記主要分類，用於預設顯示
- 與 `products.category_id` 配合使用：`category_id` 為主要分類，`product_categories` 為附加分類

## 索引策略

### 單欄索引
- `brands.slug`: 用於品牌查詢
- `categories.slug`: 用於分類查詢
- `products.brand_id`: 用於品牌相關產品查詢
- `products.status`: 用於狀態篩選
- `products.release_date`: 用於時間排序
- `products.source_identifier`: 唯一索引，防止重複爬取

### 複合索引
- `(brand_id, status)`: 優化「某品牌的所有可用產品」查詢
- `(status, release_date DESC)`: 優化「按狀態和發布時間排序」查詢

### 全文搜索索引
- `products.name_jp`: 使用 `pg_trgm` 擴展，支援模糊搜索

### JSONB 索引
- `products.metadata`: GIN 索引，支援 JSONB 欄位的快速查詢

## 觸發器

### 自動更新時間戳記
所有表的 `updated_at` 欄位會透過觸發器自動更新，無需手動維護。

## 正規化設計

本設計符合第三正規化（3NF）：
- ✅ 所有非主鍵欄位都直接依賴於主鍵
- ✅ 沒有部分相依性
- ✅ 沒有遞移相依性
- ✅ 冗餘資料最小化

## 擴展性考量

### 未來可擴展的設計
1. **多語言支援**: 可擴展 `brands` 和 `categories` 表，新增 `name_en`, `name_ko` 等欄位
2. **價格歷史**: 可建立 `price_history` 表追蹤價格變動
3. **使用者收藏**: 可建立 `user_favorites` 表
4. **評論系統**: 可建立 `reviews` 表
5. **標籤系統**: 可建立 `tags` 和 `product_tags` 表
6. **庫存追蹤**: 可在 `products` 表新增 `stock_status` 欄位

### 效能優化建議
- 大型資料集時考慮分區表（partitioning）
- 圖片 URL 可考慮使用 CDN
- 熱點資料可使用 Redis 快取
- 全文搜索可考慮使用 Elasticsearch 或 PostgreSQL Full-Text Search

## 資料維護建議

### 定期清理
- 定期清理已停產且超過 1 年的產品（保留 metadata）
- 清理過期的爬蟲日誌

### 資料驗證
- 建立檢查約束確保價格為正數
- 確保日期範圍合理性（`limited_period_start < limited_period_end`）
- 驗證 `source_url` 格式

### 備份策略
- 每日自動備份資料庫
- 保留至少 30 天的備份
- 重要資料變更前先備份

## 安全性考量

### Row Level Security (RLS)
- 建議啟用 RLS 並設定適當的政策
- 公開讀取，認證後寫入的預設策略

### 敏感資料
- API Key 和密碼不應儲存在資料庫
- 使用環境變數管理敏感資訊
