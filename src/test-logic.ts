
interface ProductInfo {
    originalName: string;
    translatedName: string;
    sourceUrl: string;
    [key: string]: any;
}

function removeDuplicateProducts(products: ProductInfo[]): ProductInfo[] {
    const seen = new Set<string>();
    return products.filter(product => {
        // 優先使用原始名稱，其次是翻譯名稱，結合來源URL作為去重鍵
        const nameKey = product.originalName || product.translatedName;
        const key = `${nameKey}-${product.sourceUrl}`;

        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

console.log("Testing removeDuplicateProducts...");

const testData = [
    { originalName: "A", translatedName: "TransA", sourceUrl: "http://a.com", id: 1 },
    { originalName: "B", translatedName: "TransB", sourceUrl: "http://b.com", id: 2 },
    { originalName: "A", translatedName: "TransA", sourceUrl: "http://a.com", id: 3 }, // Duplicate of 1
    { originalName: "", translatedName: "TransA", sourceUrl: "http://a.com", id: 4 }, // Fallback to transName. Duplicate of 1? 
    // "A-http://a.com" vs "TransA-http://a.com". These are different keys! 
    // This is expected behavior if original name is missing in one but present in another.

    { originalName: "C", translatedName: "TransC", sourceUrl: "http://c.com", id: 5 },
    { originalName: "C", translatedName: "TransC", sourceUrl: "http://c.com", id: 6 }, // Duplicate of 5
];

const result = removeDuplicateProducts(testData);

console.log("Input length:", testData.length);
console.log("Output length:", result.length);

if (result.length === 4) { // 1, 2, 4, 5. (3 is dup of 1. 6 is dup of 5)
    console.log("✅ Deduplication test passed.");
} else {
    console.error("❌ Deduplication test failed.");
    result.forEach(r => console.log(r));
}
