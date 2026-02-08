-- 檢查 7-Eleven 產品的圖片資料
-- 欄位名稱是 image_urls (複數且有底線)

SELECT 
    id,
    name,
    name_jp,
    image_urls,  -- 這是圖片欄位
    price,
    created_at
FROM products
WHERE brand_id = (
    SELECT id FROM brands WHERE slug = 'seven-eleven'
)
ORDER BY created_at DESC
LIMIT 10;

-- 如果 image_urls 是空的，表示圖片沒有正確儲存
-- 應該會看到類似這樣的資料：
-- image_urls: ["https://www.sej.co.jp/library/img/products/a/item/041268/1.jpg"]
