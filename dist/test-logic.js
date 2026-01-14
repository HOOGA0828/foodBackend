"use strict";
function removeDuplicateProducts(products) {
    const seen = new Set();
    return products.filter(product => {
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
    { originalName: "A", translatedName: "TransA", sourceUrl: "http://a.com", id: 3 },
    { originalName: "", translatedName: "TransA", sourceUrl: "http://a.com", id: 4 },
    { originalName: "C", translatedName: "TransC", sourceUrl: "http://c.com", id: 5 },
    { originalName: "C", translatedName: "TransC", sourceUrl: "http://c.com", id: 6 },
];
const result = removeDuplicateProducts(testData);
console.log("Input length:", testData.length);
console.log("Output length:", result.length);
if (result.length === 4) {
    console.log("✅ Deduplication test passed.");
}
else {
    console.error("❌ Deduplication test failed.");
    result.forEach(r => console.log(r));
}
//# sourceMappingURL=test-logic.js.map