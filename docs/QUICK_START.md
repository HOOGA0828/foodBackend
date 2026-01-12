# 快速入門指南

本指南將幫助您在 5 分鐘內完成後端基礎架構的設定。

## 📋 前置檢查清單

- [ ] Node.js 20+ 已安裝
- [ ] npm 或 yarn 已安裝
- [ ] Supabase 帳號（[免費註冊](https://app.supabase.com/)）

## 🚀 快速設定步驟

### 步驟 1: 安裝依賴（約 1 分鐘）

```bash
npm install
```

### 步驟 2: 建立 Supabase 專案（約 2 分鐘）

1. 前往 [Supabase Dashboard](https://app.supabase.com/)
2. 點擊 "New Project"
3. 填寫專案資訊：
   - **Name**: `japan-food-tracker`
   - **Database Password**: 設定強密碼（**請記住這個密碼！**）
   - **Region**: `Tokyo (ap-northeast-1)`
4. 等待專案建立完成

### 步驟 3: 取得連線資訊（約 1 分鐘）

在 Supabase Dashboard：

1. **Settings** → **Database** → 複製 `Connection string` (URI 格式)
2. **Settings** → **API** → 複製：
   - Project URL
   - `service_role` key（**不是 anon key！**）

### 步驟 4: 執行 SQL Schema（約 1 分鐘）

1. 在 Supabase Dashboard → **SQL Editor**
2. 點擊 "New Query"
3. 開啟專案中的 `supabase/schema.sql`
4. 複製全部內容並貼到 SQL Editor
5. 點擊 "Run" 執行

**驗證**: 進入 **Table Editor**，應該可以看到 `brands`, `categories`, `products`, `product_categories` 四張表

### 步驟 5: 設定環境變數（約 1 分鐘）

1. 在專案根目錄建立 `.env` 檔案：
   ```bash
   cp env.example.txt .env
   ```

2. 編輯 `.env`，填入以下資訊：
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"
   SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

   ⚠️ **重要**: 將 `YOUR_PASSWORD` 替換為您在步驟 2 設定的資料庫密碼！

### 步驟 6: 初始化 Prisma（約 30 秒）

```bash
# 生成 Prisma Client
npm run prisma:generate
```

### 步驟 7: 測試連線（約 30 秒）

```bash
# 執行連線測試腳本
tsx src/test-connection.ts
```

如果看到以下訊息，表示設定成功：
```
✅ Prisma 連線成功！
✅ 成功查詢 brands 表，找到 X 個品牌
🎉 所有測試通過！資料庫設定正確。
```

## ✅ 完成！

現在您已經完成了後端基礎架構的設定。接下來可以：

1. **查看資料庫**: `npm run prisma:studio`
2. **開始開發 API**: 建立 Express 路由和控制器
3. **設定爬蟲**: 開始收集產品資料

**注意**: 產品的中文名稱和描述欄位（`name_zh`, `description_zh`）已保留在資料庫中，您可以手動輸入或未來再整合翻譯服務。

## 🆘 常見問題

### Q: 執行 SQL Schema 時出現錯誤

**A**: 檢查是否有重複的擴展或表。可以嘗試先刪除現有表，或修改 SQL 腳本使用 `IF NOT EXISTS`。

### Q: Prisma 無法連線資料庫

**A**: 檢查以下項目：
- `DATABASE_URL` 中的密碼是否正確
- 專案是否仍在運行中（Supabase Dashboard 狀態）
- 網路連線是否正常

### Q: 找不到 Prisma Client

**A**: 執行 `npm run prisma:generate` 重新生成。


## 📚 進一步閱讀

- [Supabase 完整初始化指引](./SUPABASE_SETUP.md)
- [專案 README](../README.md)
- [Supabase 官方文檔](https://supabase.com/docs)
- [Prisma 文檔](https://www.prisma.io/docs)

## 💡 下一步建議

1. 建立 Express.js 基本伺服器結構
2. 實作產品 CRUD API
3. 建立爬蟲服務架構
4. 設定錯誤處理和日誌系統
5. （可選）未來可整合翻譯服務自動翻譯產品資訊

如有任何問題，請參考詳細文件或查看專案 README。
