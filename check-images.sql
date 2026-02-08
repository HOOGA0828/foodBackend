-- 查詢 7-Eleven 產品的圖片網址
SELECT 
  name, 
  name_jp,
  image_urls,
  available_start_date
FROM products 
WHERE brand_id = (SELECT id FROM brands WHERE slug = 'seven-eleven')
ORDER BY available_start_date DESC
LIMIT 5;
