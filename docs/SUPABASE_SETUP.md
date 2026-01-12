# Supabase 初始化指引

本文件將引導您完成 Supabase 專案的初始化設定。

## 步驟 1: 建立 Supabase 專案

1. 前往 [Supabase Dashboard](https://app.supabase.com/)
2. 點擊「New Project」建立新專案
3. 填寫專案資訊：
   - **Project Name**: `japan-food-tracker` (或您喜歡的名稱)
   - **Database Password**: 設定一個強密碼（請妥善保存，稍後會在 `.env` 中使用）
   - **Region**: 選擇 `Tokyo (ap-northeast-1)` (離日本最近，延遲較低)
   - **Pricing Plan**: 選擇適合的方案（免費方案足夠開發階段使用）

4. 等待專案建立完成（約需 1-2 分鐘）

## 步驟 2: 取得連線資訊

### 2.1 取得 Database URL

**重要**: 如果您的 Supabase 專案顯示 "Not IPv4 compatible" 訊息，請使用 **Session Pooler** 連線（見下方說明）。

1. 在 Supabase Dashboard 中，點擊左側選單的 **Settings** (⚙️)
2. 選擇 **Database**
3. 向下滾動找到 **Connection string**
4. 選擇 **URI** 標籤

#### 情況 A: 使用直接連線（如果沒有 IPv4 問題）

5. 複製連線字串，格式類似：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
6. 將 `[YOUR-PASSWORD]` 替換為您在步驟 1 設定的資料庫密碼

#### 情況 B: 使用 Session Pooler（推薦，支援 IPv4）

如果看到 "Not IPv4 compatible" 訊息，請使用 Session Pooler：

5. 在 **Connection string** 區塊中，找到 **Connection pooling** 選項
6. 選擇 **Session mode**（推薦）或 **Transaction mode**
7. 複製 Session Pooler 的連線字串，格式類似：
   ```
   # Session mode (推薦)
   postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres?pgbouncer=true
   
   # 或 Transaction mode
   postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].pooler.supabase.com:5432/postgres?pgbouncer=true
   ```
8. 將 `[YOUR-PASSWORD]` 替換為您在步驟 1 設定的資料庫密碼

**注意**: Session Pooler 的網址格式是 `[PROJECT-REF].pooler.supabase.com`（不是 `db.[PROJECT-REF].supabase.co`），且連接埠通常是 `6543`（Session mode）或 `5432`（Transaction mode）。

### 2.2 取得 API Keys

1. 在 **Settings** 中選擇 **API**
2. 複製以下資訊：
   - **Project URL**: `https://[PROJECT-REF].supabase.co`
   - **anon/public key**: 用於客戶端存取
   - **service_role key**: 用於服務端，具有完整權限（**請勿在客戶端使用！**）

## 步驟 3: 執行 SQL Schema

### 方法 A: 使用 Supabase SQL Editor（推薦）

1. 在 Supabase Dashboard 中，點擊左側選單的 **SQL Editor**
2. 點擊 **New Query**
3. 複製 `supabase/schema.sql` 檔案的完整內容
4. 貼上到 SQL Editor
5. 點擊 **Run** 或按下 `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
6. 確認執行成功（應該會看到 "Success. No rows returned" 訊息）

### 方法 B: 使用 psql 命令列工具

如果您已經安裝 PostgreSQL 客戶端工具：

```bash
# 使用您的連線資訊
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f supabase/schema.sql
```

### 驗證 Schema 建立成功

在 Supabase Dashboard 中：
1. 點擊左側選單的 **Table Editor**
2. 確認可以看到以下資料表：
   - `brands`
   - `categories`
   - `products`
   - `product_categories`
3. 檢查 `brands` 表，應該可以看到預先插入的品牌資料（Lawson, 7-11, 全家等）

## 步驟 4: 設定環境變數

1. 在專案根目錄建立 `.env` 檔案（可以複製 `.env.example`）
2. 填入您在步驟 2 取得的資訊：

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"
SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

**重要**: 確保 `.env` 已加入 `.gitignore`，不要將敏感資訊提交到 Git！

## 步驟 5: 初始化 Prisma

### 5.1 安裝依賴

```bash
npm install
```

### 5.2 生成 Prisma Client

```bash
npm run prisma:generate
```

這個命令會根據 `prisma/schema.prisma` 生成 Prisma Client。

### 5.3 同步 Schema（選用）

如果您的 Supabase 資料庫 Schema 已經建立，但 Prisma Schema 需要更新：

```bash
# 從資料庫拉取現有 Schema 並更新 prisma/schema.prisma
npm run prisma:pull
```

**注意**: 這會覆蓋現有的 `prisma/schema.prisma`，建議先備份。

### 5.4 推送 Prisma Schema 到資料庫（選用）

如果您想要從 Prisma Schema 直接建立資料庫結構：

```bash
# 將 Prisma Schema 推送到資料庫（開發環境用）
npm run prisma:push
```

**注意**: `prisma:push` 不會建立遷移記錄，適合開發階段。生產環境應使用 `prisma:migrate`。

### 5.5 使用 Prisma Studio 查看資料（可選）

```bash
npm run prisma:studio
```

這會開啟一個網頁介面 (http://localhost:5555)，讓您可視化管理資料庫。

## 步驟 6: 驗證連線

建立一個簡單的測試腳本來驗證連線：

```typescript
// src/test-connection.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    const brands = await prisma.brand.findMany();
    console.log('✅ 資料庫連線成功！');
    console.log(`找到 ${brands.length} 個品牌:`, brands.map(b => b.nameZh || b.nameJp));
  } catch (error) {
    console.error('❌ 資料庫連線失敗:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
```

執行測試：

```bash
tsx src/test-connection.ts
```

## 步驟 7: 設定 Row Level Security (RLS)（選用）

如果您需要使用 Supabase 的認證功能，可以啟用 RLS：

1. 在 Supabase Dashboard 中，進入 **Authentication** > **Policies**
2. 或直接在 SQL Editor 中執行：

```sql
-- 啟用 RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 範例：允許所有人讀取
CREATE POLICY "Anyone can view brands" ON brands FOR SELECT USING (true);
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view products" ON products FOR SELECT USING (true);

-- 範例：只有認證使用者可以寫入
CREATE POLICY "Authenticated users can insert brands" 
  ON brands FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
```

**注意**: 根據您的安全需求調整 RLS 政策。

## 疑難排解

### 問題 1: 連線被拒絕

- 確認 `DATABASE_URL` 中的密碼是否正確
- 確認專案區域是否正確
- 檢查 Supabase Dashboard 中的專案狀態是否為 "Active"

### 問題 2: Prisma 找不到資料表

- 確認 SQL Schema 已成功執行
- 確認 `DATABASE_URL` 指向正確的資料庫
- 執行 `npm run prisma:pull` 重新同步 Schema

### 問題 3: 權限錯誤

- 確認使用 `service_role` key（而非 `anon` key）進行服務端操作
- 檢查 RLS 政策是否過於嚴格

## 下一步

完成初始化後，您可以：
1. 開始開發 API 端點
2. 設定爬蟲服務
3. 建立前端應用

如有任何問題，請參考 [Supabase 官方文檔](https://supabase.com/docs) 或 Prisma 文檔。
