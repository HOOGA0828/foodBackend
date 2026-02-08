-- 刪除 7-Eleven 的測試資料
-- 在執行爬蟲前先清除舊資料，確保新資料包含正確的圖片

-- 1. 找到 7-Eleven 品牌 ID
DO $$
DECLARE
    brand_id_var UUID;
BEGIN
    -- 取得 7-Eleven 品牌 ID
    SELECT id INTO brand_id_var 
    FROM brands 
    WHERE slug = 'seven-eleven';
    
    IF brand_id_var IS NOT NULL THEN
        -- 刪除該品牌的所有產品
        DELETE FROM products 
        WHERE brand_id = brand_id_var;
        
        RAISE NOTICE '已刪除 7-Eleven 的所有產品';
    ELSE
        RAISE NOTICE '找不到 7-Eleven 品牌';
    END IF;
END $$;

-- 驗證刪除結果
SELECT 
    b.name as brand_name,
    COUNT(p.id) as product_count
FROM brands b
LEFT JOIN products p ON p.brand_id = b.id
WHERE b.slug = 'seven-eleven'
GROUP BY b.id, b.name;
