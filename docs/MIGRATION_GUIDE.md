# 資料庫遷移指南

本指南說明如何在不同情況下更新 Supabase 資料庫的 schema。

## ⚠️ 重要提醒

**在執行任何遷移之前，請務必備份您的資料庫！**

您可以在 Supabase Dashboard 的 Settings > Database > Backups 中建立備份。

## 情況分析

### 情況 1: 全新資料庫（尚未建立任何表）

✅ **可以直接執行** `supabase/schema.sql`

在 Supabase SQL Editor 中：
1. 複製 `supabase/schema.sql` 的完整內容
2. 貼上到 SQL Editor
3. 執行

### 情況 2: 已有資料庫，但結構已改變（需要保留資料）

✅ **使用** `supabase/migration-safe.sql`

這個腳本會：
- 保留現有資料
- 新增缺少的欄位
- 從舊欄位遷移資料到新欄位（如果有）
- 建立缺少的索引和約束

**執行步驟：**
1. 在 Supabase SQL Editor 中開啟新查詢
2. 複製 `supabase/migration-safe.sql` 的完整內容
3. 貼上並執行
4. 檢查執行結果，確認沒有錯誤

### 情況 3: 完全重新開始（可以刪除所有資料）

⚠️ **使用** `supabase/reset-database.sql` **（會刪除所有資料！）**

這個腳本會：
- 刪除所有現有表和資料
- 完全重建資料庫結構
- 插入範例資料

**執行步驟：**
1. ⚠️ **確認您已備份所有重要資料！**
2. 在 Supabase SQL Editor 中開啟新查詢
3. 複製 `supabase/reset-database.sql` 的完整內容
4. 貼上並執行
5. 確認執行成功

## 在 Supabase SQL Editor 中執行

### 方法 1: 直接在 SQL Editor 執行

1. 登入 [Supabase Dashboard](https://app.supabase.com/)
2. 選擇您的專案
3. 點擊左側選單的 **SQL Editor**
4. 點擊 **New Query**
5. 選擇對應的 SQL 檔案並複製內容：
   - 全新資料庫 → `supabase/schema.sql`
   - 遷移現有資料庫 → `supabase/migration-safe.sql`
   - 重新開始 → `supabase/reset-database.sql`
6. 貼上到編輯器
7. 點擊 **Run** 或按下 `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
8. 查看執行結果

### 方法 2: 使用 Supabase CLI（如果已安裝）

```bash
# 遷移現有資料庫（保留資料）
supabase db execute --file supabase/migration-safe.sql

# 或使用 psql 直接連線
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f supabase/migration-safe.sql
```

## 遷移腳本說明

### migration-safe.sql（安全遷移）

這個腳本會自動處理：
- ✅ 從 `name_jp`/`name_zh` 遷移到 `name`
- ✅ 從 `description_jp`/`description_zh` 遷移到 `description`
- ✅ 從 `limited_period_start/end` 或 `display_start_date/end_date` 遷移到 `available_start_date/end_date`
- ✅ 從 `price_jpy`/`original_price_jpy` (INTEGER) 遷移到 `price`/`original_price` (DECIMAL)
- ✅ 新增缺少的欄位（如 `specifications`, `tags`）
- ✅ 建立缺少的索引
- ✅ 更新觸發器

### reset-database.sql（完全重建）

這個腳本會：
- ⚠️ 刪除所有現有資料
- 完全重建資料庫結構
- 插入範例資料

## 執行後驗證

無論使用哪種方法，執行後都應該驗證：

1. **檢查表是否存在：**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('brands', 'categories', 'products', 'product_categories');
```

2. **檢查核心欄位是否存在：**
```sql
-- 檢查 brands 表的 name 欄位
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'brands' AND column_name = 'name';

-- 檢查 products 表的核心欄位
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name IN ('description', 'available_start_date', 'available_end_date', 'updated_at');
```

3. **檢查索引是否存在：**
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('brands', 'products')
  AND indexname LIKE 'idx_%';
```

4. **檢查觸發器是否存在：**
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE 'update_%_updated_at';
```

5. **使用 Prisma 驗證：**
```bash
# 生成 Prisma Client
npm run prisma:generate

# 測試連線
npm run test:connection
```

## 常見問題

### Q: 執行時出現「relation already exists」錯誤

**A:** 這表示表已存在。請使用 `migration-safe.sql` 而不是 `schema.sql`。

### Q: 執行時出現「column already exists」錯誤

**A:** 這通常是因為欄位已存在。`migration-safe.sql` 會自動處理這個問題（使用 `ADD COLUMN IF NOT EXISTS`），但如果您手動執行部分語句，可能會遇到此錯誤。建議使用完整的遷移腳本。

### Q: 執行後，舊資料消失了？

**A:** 如果您使用了 `reset-database.sql`，這是正常的（它會刪除所有資料）。如果使用了 `migration-safe.sql`，資料應該被保留。請檢查備份並恢復。

### Q: 如何從舊結構遷移到新結構？

**A:** 使用 `migration-safe.sql`。它會自動處理大部分遷移，包括：
- 欄位名稱變更
- 資料類型轉換（如 INTEGER → DECIMAL）
- 資料合併（如 `name_zh` 和 `name_jp` → `name`）

### Q: 遷移後 Prisma Client 報錯

**A:** 執行以下步驟：
```bash
# 1. 重新生成 Prisma Client
npm run prisma:generate

# 2. 如果還有問題，重新同步 schema
npm run prisma:pull
```

## 最佳實踐

1. **總是先備份** - 在執行任何遷移之前備份資料庫
2. **先在測試環境測試** - 如果有測試環境，先在測試環境執行
3. **檢查執行結果** - 執行後檢查是否有錯誤訊息
4. **驗證資料完整性** - 遷移後檢查資料是否正確
5. **使用版本控制** - 將 SQL 腳本加入 Git，記錄所有變更

## 下一步

遷移完成後：
1. 執行 `npm run prisma:generate` 生成 Prisma Client
2. 執行 `npm run test:connection` 測試連線
3. 執行 `npm run test:insert` 測試新增資料
4. 開始使用新的資料庫結構進行開發
