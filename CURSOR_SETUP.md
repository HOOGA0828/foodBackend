# 如何在 Cursor 中打開專案

## 方法 1: 使用命令面板（推薦）

1. 按 `Ctrl+Shift+P` (Windows) 或 `Cmd+Shift+P` (Mac) 打開命令面板
2. 輸入 `File: Open Folder` 或 `檔案: 開啟資料夾`
3. 選擇 `d:\project\newFood\backend` 資料夾
4. 點擊「選擇資料夾」

## 方法 2: 使用選單

1. 點擊 Cursor 頂部選單：**File** → **Open Folder...**
2. 導航到 `d:\project\newFood\backend`
3. 選擇資料夾並打開

## 方法 3: 從終端打開

在您的 PowerShell 終端中執行：

```powershell
code . --folder-uri file:///d:/project/newFood/backend
```

或者如果您已經在專案目錄中：

```powershell
code .
```

## 驗證是否正確打開

打開後，您應該在左側檔案瀏覽器中看到以下結構：

```
backend/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── QUICK_START.md
│   └── SUPABASE_SETUP.md
├── prisma/
│   └── schema.prisma
├── src/
│   └── test-connection.ts
├── supabase/
│   └── schema.sql
├── env.example.txt
├── package.json
├── README.md
└── tsconfig.json
```

## 如果還是看不到

1. **檢查左側邊欄是否隱藏**：
   - 按 `Ctrl+B` 切換側邊欄顯示/隱藏

2. **檢查檔案瀏覽器圖示**：
   - 點擊左側最上方的「檔案」圖示（或按 `Ctrl+Shift+E`）

3. **重新載入視窗**：
   - 按 `Ctrl+Shift+P` → 輸入 `Developer: Reload Window`
