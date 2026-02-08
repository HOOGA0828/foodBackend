-- 1. 為 products 表啟用 RLS 並允許匿名讀取
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to products"
ON products
FOR SELECT
TO anon
USING (true);

-- 2. 為 brands 表啟用 RLS 並允許匿名讀取
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to brands"
ON brands
FOR SELECT
TO anon
USING (true);
