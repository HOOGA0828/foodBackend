# 新專案設定指引

本文件將引導您在新 Supabase 專案中設定日本餐飲/超商新品追蹤系統。

## 📋 準備工作

### 1. 建立新的 Supabase 專案

1. 前往 [Supabase Dashboard](https://app.supabase.com/)
2. 點擊「New Project」建立新專案
3. 填寫專案資訊：
   - **Project Name**: `japan-food-tracker-new` (或您喜歡的名稱)
   - **Database Password**: 設定一個強密碼（請妥善保存，稍後會在 `.env` 中使用）
   - **Region**: 選擇 `Tokyo (ap-northeast-1)` (離日本最近，延遲較低)
   - **Pricing Plan**: 選擇適合的方案（免費方案足夠開發階段使用）

4. 等待專案建立完成（約需 1-2 分鐘）

### 2. 取得連線資訊

#### 方法 1: 使用 Supabase Dashboard（推薦）

1. 在 Supabase Dashboard 中，點擊左側選單的 **Settings** (⚙️)
2. 選擇 **Database**
3. 向下滾動找到 **Connection string**
4. 選擇 **URI** 標籤

#### 情況 A: 使用直接連線（如果沒有 IPv4 問題）
5. 複製連線字串，格式類似：
   ```bash
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
6. 將 `[YOUR-PASSWORD]` 替換為您在步驟 1 設定的資料庫密碼

#### 情況 B: 使用 Session Pooler（推薦，支援 IPv4）
如果看到 "Not IPv4 compatible" 訊息，請使用 Session Pooler：
5. 在 **Connection string** 區塊中，找到 **Connection pooling** 選項
6. 選擇 **Session mode**（推薦）或 **Transaction mode**
7. 複製 Session Pooler 的連線字串，格式類似：
   ```bash
   # Session mode (推薦)
   postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres?pgbouncer=true

   # 或 Transaction mode
   postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].pooler.supabase.com:5432/postgres?pgbouncer=true
   ```
8. 將 `[YOUR-PASSWORD]` 替換為您在步驟 1 設定的資料庫密碼

### 3. 取得 API Keys

1. 在 **Settings** 中選擇 **API**
2. 複製以下資訊：
   - **Project URL**: `https://[PROJECT-REF].supabase.co`
   - **anon/public key**: 用於客戶端存取
   - **service_role key**: 用於服務端，具有完整權限（**請勿在客戶端使用！**）

## 🗄️ 資料庫設定

### 1. 執行 Schema

1. 在 Supabase Dashboard 中，點擊左側選單的 **SQL Editor**
2. 點擊 **New Query**
3. 複製 `supabase/schema-new.sql` 檔案的完整內容
4. 貼上到 SQL Editor
5. 點擊 **Run** 或按下 `Ctrl+Enter`
6. 確認執行成功（應該會看到 "Success. No rows returned" 訊息）

### 2. 驗證 Schema 建立成功

在 Supabase Dashboard 中：
1. 點擊左側選單的 **Table Editor**
2. 確認可以看到以下資料表：
   - `brands` - 品牌/公司表
   - `categories` - 分類表
   - `products` - 產品表（核心）
   - `product_categories` - 產品-分類關聯表
   - `crawler_runs` - 爬蟲執行記錄表
   - `product_changes` - 產品變更記錄表

3. 檢查 `brands` 表，應該可以看到預先插入的品牌資料（7-Eleven, FamilyMart, Lawson 等）
4. 檢查 `categories` 表，應該可以看到預設的分類資料（食品、飲料、甜點等）

## 🔧 環境變數設定

### 1. 建立 .env 檔案

在專案根目錄建立 `.env` 檔案（可以複製 `env.example.txt`）：

```bash
# 複製範例檔案
cp env.example.txt .env
```

### 2. 填入 Supabase 連線資訊

編輯 `.env` 檔案，填入您從 Supabase Dashboard 取得的資訊：

```env
# ============================================
# Supabase 資料庫連線設定
# ============================================
# 從 Supabase Dashboard > Settings > Database 取得
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT_REF.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase Project URL (用於 REST API 和 Auth)
# 從 Supabase Dashboard > Settings > API 取得
SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"

# Supabase Anon/Public Key (用於客戶端)
# 從 Supabase Dashboard > Settings > API > Project API keys 取得
SUPABASE_ANON_KEY="your-anon-key-here"

# Supabase Service Role Key (用於服務端，具有完整權限，請勿在客戶端使用)
# 從 Supabase Dashboard > Settings > API > Project API keys > service_role 取得
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# ============================================
# 應用程式設定
# ============================================
NODE_ENV="development"
PORT=3000
API_PREFIX="/api/v1"

# ============================================
# 爬蟲設定
# ============================================
SCRAPER_USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
SCRAPER_DELAY_MS=1000
SCRAPER_TIMEOUT_MS=30000

# ============================================
# OpenAI API 設定 (爬蟲系統必需)
# ============================================
OPENAI_API_KEY="your-openai-api-key-here"
```

### 3. 變數說明

| 變數名稱 | 說明 | 取得方式 |
|---------|------|----------|
| `DATABASE_URL` | PostgreSQL 連線字串 | Settings > Database > Connection string |
| `SUPABASE_URL` | Supabase 專案 URL | Settings > API > Project URL |
| `SUPABASE_ANON_KEY` | 公開 API Key | Settings > API > Project API keys > anon |
| `SUPABASE_SERVICE_ROLE_KEY` | 服務端 API Key | Settings > API > Project API keys > service_role |

**重要提醒：**
- 確保 `.env` 已加入 `.gitignore`，不要將敏感資訊提交到 Git！
- `SUPABASE_SERVICE_ROLE_KEY` 具有完整權限，請勿在客戶端使用
- 建議使用 Session Pooler 的連線字串（支援 IPv4）

## 📦 安裝與初始化

### 1. 安裝依賴

```bash
npm install
```

### 2. 生成 Prisma Client

```bash
# 使用新的 schema
cp prisma/schema-new.prisma prisma/schema.prisma
npm run prisma:generate
```

### 3. 驗證連線

建立測試腳本 `src/test-new-connection.ts`：

```typescript
// src/test-new-connection.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 正在測試新資料庫連線...\n');

    // 測試基本連線
    await prisma.$connect();
    console.log('✅ Prisma 連線成功！\n');

    // 測試查詢 brands 表
    const brands = await prisma.brand.findMany({
      take: 5,
      orderBy: { createdAt: 'asc' },
    });
    console.log(`✅ 成功查詢 brands 表，找到 ${brands.length} 個品牌：`);
    brands.forEach((brand) => {
      console.log(`   - ${brand.name} (${brand.category}) - ${brand.isActive ? '啟用' : '停用'}`);
    });
    console.log('');

    // 測試查詢 categories 表
    const categories = await prisma.category.findMany({
      take: 5,
      orderBy: { sortOrder: 'asc' },
    });
    console.log(`✅ 成功查詢 categories 表，找到 ${categories.length} 個分類：`);
    categories.forEach((category) => {
      console.log(`   - ${category.name} (${category.slug})`);
    });
    console.log('');

    // 測試查詢 products 表
    const productCount = await prisma.product.count();
    console.log(`✅ 成功查詢 products 表，目前有 ${productCount} 個產品\n`);

    // 測試核心功能 - 查詢包含時間區間的產品
    const currentProducts = await prisma.product.findMany({
      where: {
        availableStartDate: {
          lte: new Date() // 提供開始時間 <= 現在
        },
        availableEndDate: {
          gte: new Date() // 提供結束時間 >= 現在
        }
      },
      include: {
        brand: {
          select: {
            name: true, // 公司名字
            updatedAt: true, // 資料庫上次更新時間
          }
        }
      },
      take: 3
    });

    console.log(`✅ 成功測試核心查詢功能，找到 ${currentProducts.length} 個目前可用的產品：`);
    currentProducts.forEach((product) => {
      console.log(`   - ${product.name}`);
      console.log(`     公司: ${product.brand.name}`);
      console.log(`     敘述: ${product.description?.substring(0, 50)}...`);
      console.log(`     提供期間: ${product.availableStartDate?.toLocaleDateString()} ~ ${product.availableEndDate?.toLocaleDateString()}`);
      console.log(`     最後更新: ${product.updatedAt?.toLocaleString()}`);
      console.log('');
    });

    console.log('🎉 所有測試通過！新資料庫設定正確。');
  } catch (error) {
    console.error('❌ 資料庫連線測試失敗：');
    if (error instanceof Error) {
      console.error('錯誤訊息:', error.message);
      console.error('\n錯誤堆疊:', error.stack);
    } else {
      console.error('未知錯誤:', error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n📴 已關閉資料庫連線');
  }
}

testConnection();
```

執行測試：

```bash
tsx src/test-new-connection.ts
```

## 🚀 開始使用

### 1. 啟動開發伺服器

```bash
npm run dev
```

### 2. 測試 API 端點

```bash
# 測試品牌列表
curl http://localhost:3000/api/v1/brands

# 測試產品列表
curl http://localhost:3000/api/v1/products

# 測試分類列表
curl http://localhost:3000/api/v1/categories
```

### 3. 開始爬蟲測試

```bash
# 測試單一品牌爬蟲
npm run scraper:test -- --brand=7-eleven

# 測試所有啟用的品牌
npm run scraper:crawl
```

## 📊 資料庫特色

### 核心功能實現

✅ **公司名字** - `brands.name`（必填、唯一）  
✅ **產品敘述** - `products.description`（主要欄位）  
✅ **產品提供時間區間** - `products.available_start_date` 和 `products.available_end_date`（含索引）  
✅ **資料庫上次更新時間** - `brands.updated_at` 和 `products.updated_at`（自動更新）

### 新增功能

- **多語言支援**：支援中英日三語
- **進階分類**：標籤系統、次分類、過敏原標記
- **營養資訊**：完整的營養成分和規格資料
- **爬蟲追蹤**：爬蟲執行記錄和產品變更歷史
- **媒體支援**：圖片、影片 URL 陣列
- **狀態管理**：複雜的產品狀態和地區限制
- **全文搜索**：產品名稱和標籤的全文搜索

### 效能優化

- 完整的索引策略
- GIN 索引用於陣列和 JSON 搜索
- 複合索引優化常用查詢
- 時間區間索引支援快速範圍查詢

## 🔒 安全設定

### Row Level Security (RLS)

如果需要設定 RLS，請在 Supabase Dashboard 中執行：

```sql
-- 啟用 RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawler_runs ENABLE ROW LEVEL SECURITY;

-- 設定政策（範例）
CREATE POLICY "Anyone can view brands" ON brands FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert brands" ON brands FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### 環境變數安全

- 確保 `.env` 檔案不會被提交到 Git
- 使用強密碼
- 定期輪換 API Keys
- 限制 `service_role` key 的使用範圍

## 🐛 疑難排解

### 連線問題

**問題：** `Connection refused` 或 `timeout`
**解決：**
1. 檢查 `DATABASE_URL` 是否正確
2. 確認防火牆設定
3. 檢查網路連線
4. 嘗試使用不同的連線模式（Session vs Transaction）

**問題：** `Authentication failed`
**解決：**
1. 檢查密碼是否正確
2. 確認專案狀態為 Active
3. 檢查是否有 IP 白名單限制

### Schema 問題

**問題：** `Table doesn't exist`
**解決：**
1. 重新執行 `supabase/schema-new.sql`
2. 檢查 SQL 執行結果
3. 確認在正確的資料庫中執行

**問題：** Prisma 錯誤
**解決：**
```bash
# 重新生成 Client
npm run prisma:generate

# 重新同步 schema（小心使用，可能會覆蓋變更）
npm run prisma:pull
```

## 📞 下一步

1. ✅ 完成新專案設定
2. 🔄 測試爬蟲功能
3. 📱 開發 API 端點
4. 🎨 建立前端介面
5. 📈 設定監控和日誌

如有任何問題，請參考：
- [Supabase 官方文檔](https://supabase.com/docs)
- [Prisma 文檔](https://www.prisma.io/docs)
- 本專案的 `docs/` 目錄