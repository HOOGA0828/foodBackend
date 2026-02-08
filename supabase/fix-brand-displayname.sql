-- 修正現有產品的 brand_info.displayName
-- 從 brands 表取得正確的 displayName 來更新產品的 metadata

UPDATE products p
SET metadata = jsonb_set(
  p.metadata,
  '{brand_info,displayName}',
  to_jsonb(b.name)
)
FROM brands b
WHERE p.brand_id = b.id
  AND p.metadata->'brand_info'->>'displayName' != b.name;

-- 驗證更新結果
SELECT 
  p.name,
  b.name as brand_name,
  p.metadata->'brand_info'->>'displayName' as display_name_in_metadata
FROM products p
JOIN brands b ON p.brand_id = b.id
WHERE b.slug = 'seven-eleven';
